#!/usr/bin/env python3
"""
Script de setup: baixa dados de referência territorial do Portal de Dados Abertos do Recife.
"""
import json
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config


def ckan_package_show(dataset_id: str):
    url = f"{config.CKAN_API_URL}/action/package_show"
    resp = requests.get(url, params={"id": dataset_id}, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def download_resource(resource_url: str, dest: Path):
    print(f"Baixando {resource_url} ...")
    resp = requests.get(resource_url, timeout=60)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.content)
    print(f"  -> salvo em {dest}")


def main():
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Baixar dados dos Distritos Sanitários
    print("\n[1] Distritos Sanitários")
    pkg = ckan_package_show(config.DATASET_DISTRITOS_ID)
    for res in pkg.get("resources", []):
        fmt = res.get("format", "").upper()
        if fmt in ("CSV", "GEOJSON"):
            dest = config.DATA_DIR / f"distritos_sanitarios_{res['id'][:8]}.{fmt.lower()}"
            download_resource(res["url"], dest)

    # 2. Baixar tabelas auxiliares do dataset de Dengue
    print("\n[2] Dataset Dengue — tabelas auxiliares")
    pkg = ckan_package_show(config.DATASET_DENGUE_ID)
    for res in pkg.get("resources", []):
        name = res.get("name", "").lower()
        fmt = res.get("format", "").upper()
        # Baixar tabelas de bairros, distritos, agressões e metadados
        if any(k in name for k in ("bairro", "distrito", "agravo", "metadado")) and fmt in ("CSV", "JSON"):
            dest = config.DATA_DIR / f"dengue_{name.replace(' ', '_')}.{fmt.lower()}"
            download_resource(res["url"], dest)

    # 3. Baixar Zoneamento (GeoJSON)
    print("\n[3] Zoneamento — Plano Diretor")
    try:
        pkg = ckan_package_show(config.DATASET_ZONEAMENTO_ID)
        for res in pkg.get("resources", []):
            if res.get("format", "").upper() == "GEOJSON":
                dest = config.DATA_DIR / f"zoneamento_{res['id'][:8]}.geojson"
                download_resource(res["url"], dest)
    except Exception as e:
        print(f"  Aviso: não foi possível baixar zoneamento via CKAN API: {e}")
        print("  Você pode baixar manualmente em: https://dados.recife.pe.gov.br/dataset/zoneamento")

    print("\n✅ Download de referências concluído.")


if __name__ == "__main__":
    main()
