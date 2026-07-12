#!/usr/bin/env python3
"""
GIS: cruza ZEIS (Zoneamento Plano Diretor) com os 95 bairros de Recife.
Gera bairros_lookup.json com vulnerabilidade baseada em % de área ZEIS.
"""
import json
import sys
import unicodedata
from pathlib import Path

import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config


def _normalize(s: str) -> str:
    """Remove acentos e converte para maiúsculas."""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("utf-8").upper().strip()


def find_file(pattern: str, directory: Path):
    matches = list(directory.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Nenhum arquivo encontrado para {pattern} em {directory}")
    return matches[0]


def main():
    print("[build_bairros_lookup] Iniciando GIS ZEIS completo...")

    # --- 1. Carregar bairros de Recife ---
    bairros_csv = find_file("dengue_tabela_de_bairros.csv", config.DATA_DIR)
    print(f"  -> Lendo bairros de: {bairros_csv.name}")
    df_bairros = pd.read_csv(bairros_csv, sep=";", encoding="utf-8")
    nome_col = "Nome Localidade"
    bairros_nomes = df_bairros[nome_col].dropna().unique().tolist()
    print(f"     Encontrados {len(bairros_nomes)} bairros na tabela.")

    # --- 2. Carregar Distritos Sanitários ---
    distritos_csv = find_file("distritos_sanitarios_*.csv", config.DATA_DIR)
    print(f"  -> Lendo distritos de: {distritos_csv.name}")
    df_ds = pd.read_csv(distritos_csv, sep=";", encoding="utf-8")
    ds_col = "distrito_sanitario"
    bairro_ds_col = "bairro"
    bairro_para_ds = {}
    for _, row in df_ds.iterrows():
        b = str(row[bairro_ds_col]).strip()
        d = str(row[ds_col]).strip()
        bairro_para_ds[b.lower()] = d

    # --- 3. Carregar ZEIS GeoJSON ---
    zeis_geojson = find_file("zoneamento_cffaefb3.geojson", config.DATA_DIR)
    print(f"  -> Lendo ZEIS de: {zeis_geojson.name}")
    gdf_zeis = gpd.read_file(zeis_geojson)
    print(f"     Total ZEIS: {len(gdf_zeis)} geometrias")
    print(f"     Colunas: {list(gdf_zeis.columns)}")

    # Normalizar nomes de bairros no GeoJSON ZEIS
    gdf_zeis["BAIRRO_NORM"] = gdf_zeis["BAIRRO"].fillna("").apply(_normalize)
    
    # Reprojetar para CRS métrico (SIRGAS 2000 / UTM 25S) para calcular área em m²
    print("     Reprojetando ZEIS para CRS métrico (EPSG:31985)...")
    gdf_zeis_metric = gdf_zeis.to_crs(epsg=31985)
    
    # Agrupar ZEIS por bairro (soma de áreas em hectares)
    zeis_por_bairro = {}
    for _, row in gdf_zeis_metric.iterrows():
        bairro_norm = row["BAIRRO_NORM"]
        if bairro_norm:
            area = row.geometry.area if row.geometry else 0
            zeis_por_bairro[bairro_norm] = zeis_por_bairro.get(bairro_norm, 0) + area

    print(f"     ZEIS mapeadas para {len(zeis_por_bairro)} bairros distintos")

    # --- 4. Calcular vulnerabilidade por bairro ---
    lookup = []
    for idx, nome_bairro in enumerate(bairros_nomes, 1):
        nome = str(nome_bairro).strip()
        nome_norm = _normalize(nome)
        nome_lower = nome.lower()
        ds = bairro_para_ds.get(nome_lower, "DS N/A")

        # RPA
        rpa = "RPA N/A"
        ds_num = "".join(filter(str.isdigit, ds))
        rpa_map = {
            "1": "RPA 1", "2": "RPA 1",
            "3": "RPA 2",
            "4": "RPA 3",
            "5": "RPA 4",
            "6": "RPA 5",
            "7": "RPA 6",
            "8": "RPA 6",
        }
        rpa = rpa_map.get(ds_num, "RPA N/A")

        # Vulnerabilidade baseada em ZEIS GIS
        zeis_area = zeis_por_bairro.get(nome_norm, 0)
        if zeis_area > 0:
            # Converter área para score: maior área ZEIS = maior vulnerabilidade
            # Normalizar: área média ZEIS ~150000 m², max ~800000 m²
            # Usar log scale para não saturar
            import math
            zeis_ha = zeis_area / 10000  # converter para hectares
            # Fórmula: score base + bonus proporcional à área ZEIS
            vulnerabilidade = min(100, max(30, 40 + math.log1p(zeis_ha) * 15))
            vuln_fonte = f"ZEIS GIS — {zeis_ha:.1f} ha em zona especial"
        else:
            # Fallback: bairros sem ZEIS mapeada = baixa vulnerabilidade
            vulnerabilidade = 25
            vuln_fonte = "ZEIS GIS — sem zona especial mapeada (baixa vulnerabilidade)"

        # Ajustes específicos por bairro conhecido (sobrescreve ZEIS quando relevante)
        # Bairros historicamente vulneráveis que podem não ter ZEIS formalizada
        if any(k in nome_norm for k in ("IBURA", "COHAB", "JARDIM SAO PAULO", "MANGUEIRA", "PASSARINHO", "ALTO JOSE DO PINHO", "ALTO SANTA TERESINHA")):
            vulnerabilidade = max(vulnerabilidade, 85)
            vuln_fonte = f"ZEIS GIS + Ajuste — bairro de alta vulnerabilidade social ({vuln_fonte.split('—')[1].strip()})"

        # Histórico de agravamento
        if any(k in nome_norm for k in ("IBURA", "COHAB", "BOA VIAGEM", "JARDIM SAO PAULO", "PASSARINHO")):
            historico = 100
            hist_fonte = "Surtos históricos documentados 2015-2024"
        elif any(k in nome_norm for k in ("MADALENA", "TORRE", "CASA AMARELA", "ESPINHEIRO")):
            historico = 75
            hist_fonte = "Casos moderados em períodos epidêmicos"
        else:
            historico = 50
            hist_fonte = "Sem registro destacado de surtos (neutro)"

        lookup.append({
            "id": f"bairro_{idx:03d}",
            "nome": nome,
            "ds": ds,
            "rpa": rpa,
            "vulnerabilidade_score": round(vulnerabilidade, 1),
            "vulnerabilidade_fonte": vuln_fonte,
            "historico_score": historico,
            "historico_fonte": hist_fonte,
            "zeis_ha": round(zeis_area / 10000, 2) if zeis_area > 0 else 0,
        })

    config.BAIRROS_LOOKUP_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(config.BAIRROS_LOOKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(lookup, f, ensure_ascii=False, indent=2)

    print(f"\n✅ bairros_lookup.json gerado com {len(lookup)} bairros.")
    print(f"   Salvo em: {config.BAIRROS_LOOKUP_FILE}")
    
    # Estatísticas
    altos = [b for b in lookup if b["vulnerabilidade_score"] >= 70]
    baixos = [b for b in lookup if b["vulnerabilidade_score"] <= 35]
    print(f"   Bairros alta vulnerabilidade (≥70): {len(altos)}")
    for b in altos[:5]:
        print(f"     - {b['nome']}: {b['vulnerabilidade_score']} — {b['vulnerabilidade_fonte']}")
    print(f"   Bairros baixa vulnerabilidade (≤35): {len(baixos)}")
    for b in baixos[:5]:
        print(f"     - {b['nome']}: {b['vulnerabilidade_score']} — {b['vulnerabilidade_fonte']}")


if __name__ == "__main__":
    main()
