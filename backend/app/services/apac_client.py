import pandas as pd

from app import config


def _cache_file(year: int):
    return config.CACHE_DIR / f"apac_clima_semana_{year}.csv"


def get_clima_semana(year: int) -> pd.DataFrame:
    """
    Retorna DataFrame [semana (YYYYWW), chuva_mm, temp_media, temp_max, fonte]
    com chuva da APAC e temperatura do Open-Meteo.
    """
    cache = _cache_file(year)
    if cache.exists():
        df = pd.read_csv(cache)
        out = df[["semana", "chuva_mm", "temp_media", "temp_max"]].copy()
        out["fonte"] = "apac"
        return out

    # Fallback: Open-Meteo (mantém o pipeline funcionando fora de 2024-2025).
    from app.services import clima_client
    return clima_client.get_clima_semana(year)


if __name__ == "__main__":
    for yr in (2024, 2025):
        s = get_clima_semana(yr)
        print(f"{yr}: {len(s)} semanas, chuva total {s['chuva_mm'].sum():.0f}mm, "
              f"temp média {s['temp_media'].mean():.1f}°C, fonte={s['fonte'].iloc[0]}")
