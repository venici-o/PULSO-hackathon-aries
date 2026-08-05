import time
from typing import Optional

import pandas as pd
import requests
from epiweeks import Week

from app import config


def _epiweek_cod(date) -> int:
    """Data -> código YYYYWW da semana epidemiológica (regra CDC / SE brasileira)."""
    w = Week.fromdate(date, system="cdc")
    return w.year * 100 + w.week


def _cache_file(year: int):
    return config.CACHE_DIR / f"clima_openmeteo_{year}.csv"


def get_clima_semana(year: int) -> pd.DataFrame:
    """
    Retorna DataFrame [semana (YYYYWW), chuva_mm, temp_media, temp_max, fonte]
    agregado por semana epidemiológica. Usa cache em disco; busca na rede só
    quando o cache não existe.
    """
    cache = _cache_file(year)
    if cache.exists():
        df = pd.read_csv(cache)
        df["fonte"] = "openmeteo_cache"
        return df

    try:
        resp = requests.get(config.OPENMETEO_ARCHIVE_URL, params={
            "latitude": config.RECIFE_LAT, "longitude": config.RECIFE_LON,
            "start_date": f"{year}-01-01", "end_date": f"{year}-12-31",
            "daily": "precipitation_sum,temperature_2m_mean,temperature_2m_max",
            "timezone": "America/Recife",
        }, timeout=60)
        resp.raise_for_status()
        d = resp.json()["daily"]
    except Exception as e:
        print(f"[clima] Falha ao buscar Open-Meteo {year}: {e}")
        return pd.DataFrame(columns=["semana", "chuva_mm", "temp_media", "temp_max", "fonte"])

    daily = pd.DataFrame({
        "data": pd.to_datetime(d["time"]),
        "chuva_mm": d["precipitation_sum"],
        "temp_media": d["temperature_2m_mean"],
        "temp_max": d["temperature_2m_max"],
    })
    daily["chuva_mm"] = pd.to_numeric(daily["chuva_mm"], errors="coerce").fillna(0.0)
    daily["temp_media"] = pd.to_numeric(daily["temp_media"], errors="coerce")
    daily["temp_max"] = pd.to_numeric(daily["temp_max"], errors="coerce")
    daily["semana"] = daily["data"].apply(lambda dt: _epiweek_cod(dt.date()))
    sem = daily.groupby("semana").agg(
        chuva_mm=("chuva_mm", "sum"),
        temp_media=("temp_media", "mean"),
        temp_max=("temp_max", "mean"),
    ).reset_index()

    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    sem.to_csv(cache, index=False)
    sem["fonte"] = "openmeteo"
    return sem


if __name__ == "__main__":
    for yr in (2024, 2025):
        s = get_clima_semana(yr)
        print(f"{yr}: {len(s)} semanas, chuva total {s['chuva_mm'].sum():.0f}mm, "
              f"temp média {s['temp_media'].mean():.1f}°C, fonte={s['fonte'].iloc[0]}")
