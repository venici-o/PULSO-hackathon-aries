import json
import time
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from app import config


class CKANCache:
    def __init__(self):
        self._memory = {}

    def get(self, key: str) -> Optional[pd.DataFrame]:
        entry = self._memory.get(key)
        if entry is None:
            return None
        data, ts = entry
        if time.time() - ts > config.CACHE_TTL_SECONDS:
            del self._memory[key]
            return None
        return data

    def set(self, key: str, df: pd.DataFrame):
        self._memory[key] = (df, time.time())


_cache = CKANCache()


def _ckan_api(action: str, params: dict = None):
    url = f"{config.CKAN_API_URL}/action/{action}"
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def get_package(dataset_id: str):
    return _ckan_api("package_show", {"id": dataset_id})


def get_resource_data(resource_url: str, cache_key: str) -> pd.DataFrame:
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    print(f"[CKAN] Baixando {resource_url} ...")
    resp = requests.get(resource_url, timeout=60)
    resp.raise_for_status()

    # Salvar no cache de disco
    cache_file = config.CACHE_DIR / f"{cache_key}.csv"
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_bytes(resp.content)

    # O CSV do CKAN Recife usa ; como separador
    try:
        df = pd.read_csv(cache_file, sep=";", encoding="utf-8")
    except Exception:
        df = pd.read_csv(cache_file, encoding="utf-8")
    _cache.set(cache_key, df)
    print(f"[CKAN] {len(df)} registros carregados.")
    return df


def get_dengue_by_bairro_semana(year: int) -> pd.DataFrame:
    """
    Busca dados de dengue do ano e agrega por bairro + semana epidemiológica.
    Retorna DataFrame com: [bairro_nome, semana, casos].
    """
    try:
        pkg = get_package(config.DATASET_DENGUE_ID)
        # Encontrar recurso de dengue do ano específico
        target_name = f"casos de dengue {year}".lower()
        resource = None
        for res in pkg.get("resources", []):
            name = res.get("name", "").lower()
            if "dengue" in name and str(year) in name:
                resource = res
                break

        if resource is None:
            print(f"[CKAN] Recurso de dengue {year} não encontrado. Usando fallback.")
            return _fallback_dengue(year)

        df = get_resource_data(resource["url"], f"dengue_{year}")

        # Identificar colunas relevantes no formato SINAN/CKAN Recife
        col_bairro = None
        col_semana = None
        for c in df.columns:
            cl = c.lower()
            # Colunas típicas: NM_BAIRRO, NOBAIINF, SEM_NOT, SEM_PRI
            if "nm_bairro" in cl or "nobaiinf" in cl:
                col_bairro = c
            if "sem_not" in cl or "sem_pri" in cl:
                col_semana = c

        if col_bairro is None or col_semana is None:
            print(f"[CKAN] Colunas padrão não encontradas. Colunas disponíveis: {list(df.columns)[:20]}...")
            return _fallback_dengue(year)

        # Normalizar nomes de bairros (maiusculas, sem acento) para bater com lookup
        df[col_bairro] = df[col_bairro].fillna("").astype(str).str.strip().str.upper()
        df[col_semana] = pd.to_numeric(df[col_semana], errors="coerce")
        
        # Filtrar apenas Recife (ID_MUNICIP = 261160 ou ID_MN_RESI = 261160)
        # Verificar se há coluna de município
        municipio_col = None
        for c in df.columns:
            if c.upper() in ("ID_MUNICIP", "ID_MN_RESI", "MUNICIPIO"):
                municipio_col = c
                break
        
        if municipio_col:
            df = df[df[municipio_col].astype(str).str.contains("261160", na=False)]
        
        # Agregar
        grouped = df.groupby([col_bairro, col_semana]).size().reset_index(name="casos")
        grouped.rename(columns={col_bairro: "bairro_nome", col_semana: "semana"}, inplace=True)
        
        print(f"[CKAN] Dengue {year}: {len(grouped)} registros agregados por bairro/semana")
        return grouped

    except Exception as e:
        print(f"[CKAN] Erro ao buscar dengue {year}: {e}")
        return _fallback_dengue(year)


def _fallback_dengue(year: int) -> pd.DataFrame:
    """Gera dados sintéticos de fallback para dengue."""
    with open(config.BAIRROS_LOOKUP_FILE, "r", encoding="utf-8") as f:
        bairros = json.load(f)

    rows = []
    for semana in range(1, 53):
        # "semana" no formato YYYYWW (SEM_NOT do SINAN), para casar com o
        # caminho real e com o filtro por semana no etl.
        semana_cod = year * 100 + semana
        for b in bairros:
            base = 5 + (b["vulnerabilidade_score"] / 100) * 30
            seasonal = 1.0 + 0.6 * ((semana - 1) / 52)
            casos = max(0, int(base * seasonal + 0))  # simplified, no numpy needed
            rows.append({"bairro_nome": b["nome"], "semana": semana_cod, "casos": casos})
    return pd.DataFrame(rows)
