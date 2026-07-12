import time
from typing import Optional

import numpy as np
import pandas as pd
import requests

from app import config


class INMETCache:
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


_cache = INMETCache()

# Código da estação de Recife (INMET)
# A001 = Recife (Morro da Conceição) ou A002 = Recife/Curado
ESTACAO_RECIFE = "A001"


def get_chuva_semana_recife(ano: int) -> pd.DataFrame:
    """
    Busca dados de chuva da estação de Recife no BDMEP/INMET.
    Retorna DataFrame com: [semana, chuva_mm].
    """
    cache_key = f"inmet_chuva_{ano}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        # BDMEP tem API REST para dados diários
        # Endpoint: /webservices/{estacao}/{ano}
        url = f"{config.INMET_BDMEP_URL}/{ESTACAO_RECIFE}/{ano}"
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()

        # O formato pode ser JSON ou CSV dependendo da configuração
        data = resp.json()
        df = pd.DataFrame(data)

        # Identificar coluna de precipitação
        precip_col = None
        for c in df.columns:
            if any(k in c.lower() for k in ("precip", "chuva", "pluv")):
                precip_col = c
                break
        if precip_col is None:
            precip_col = df.columns[-1]  # fallback

        df["data"] = pd.to_datetime(df.iloc[:, 0], errors="coerce")
        df[precip_col] = pd.to_numeric(df[precip_col], errors="coerce").fillna(0)
        df["semana"] = df["data"].dt.isocalendar().week

        grouped = df.groupby("semana")[precip_col].sum().reset_index()
        grouped.rename(columns={precip_col: "chuva_mm"}, inplace=True)

        _cache.set(cache_key, grouped)
        return grouped

    except Exception as e:
        print(f"[INMET] Erro ao buscar chuva {ano}: {e}")
        return _fallback_chuva(ano)


def _fallback_chuva(ano: int) -> pd.DataFrame:
    """Gera dados sintéticos de chuva para Recife."""
    rows = []
    for semana in range(1, 53):
        # Sazonalidade Recife: chuvoso jan-jun, seco jul-dez
        if semana <= 26:
            chuva = 120 + np.random.normal(0, 30)
        else:
            chuva = 50 + np.random.normal(0, 15)
        chuva = max(0, chuva)
        rows.append({"semana": semana, "chuva_mm": round(chuva, 1)})
    return pd.DataFrame(rows)
