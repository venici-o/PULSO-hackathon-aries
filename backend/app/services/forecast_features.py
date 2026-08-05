import json
import unicodedata
from typing import List

import numpy as np
import pandas as pd
from epiweeks import Week

from app import config
from app.services import clima_client

HORIZONTES = [1, 2, 3, 4]

FEATURES: List[str] = [
    "casos", "casos_lag1", "casos_lag2", "casos_lag3", "roll4_mean", "trend",
    "chuva_mm", "chuva_lag2", "chuva_lag4", "chuva_roll4",
    "temp_media", "temp_max", "temp_roll4",
    "sin_woy", "cos_woy",
    "vuln", "hist", "vizinhos_ds",
]


def _norm(s) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", str(s).strip().upper())
                   if unicodedata.category(c) != "Mn")


def semana_seq(anos: List[int]) -> List[int]:
    seq, w = [], Week(min(anos), 1, system="cdc")
    while w.year <= max(anos):
        seq.append(w.year * 100 + w.week)
        w += 1
    return seq


def _aggregate_sinan(year: int) -> pd.DataFrame:
    """Lê o cache do SINAN e agrega casos por bairro (normalizado) e semana."""
    path = config.CACHE_DIR / f"dengue_{year}.csv"
    df = pd.read_csv(path, sep=";", encoding="utf-8", low_memory=False)
    df = df[df["ID_MUNICIP"].astype(str).str.contains("261160", na=False)]
    df["bairro_norm"] = df["NM_BAIRRO"].apply(_norm)
    df["semana"] = pd.to_numeric(df["SEM_NOT"], errors="coerce")
    g = df.groupby(["bairro_norm", "semana"]).size().reset_index(name="casos")
    return g.dropna(subset=["semana"]).astype({"semana": int})


def build_panel(anos: List[int]) -> pd.DataFrame:
    lookup = json.load(open(config.BAIRROS_LOOKUP_FILE, encoding="utf-8"))
    bairros = pd.DataFrame([{
        "bairro_id": b["id"], "bairro": b["nome"], "bairro_norm": _norm(b["nome"]),
        "ds": b["ds"], "rpa": b["rpa"], "vuln": b["vulnerabilidade_score"],
        "hist": b["historico_score"],
    } for b in lookup])

    casos = pd.concat([_aggregate_sinan(y) for y in anos], ignore_index=True)
    casos = casos.groupby(["bairro_norm", "semana"], as_index=False)["casos"].sum()

    clima = pd.concat([clima_client.get_clima_semana(y) for y in anos], ignore_index=True)
    clima = clima.groupby("semana", as_index=False).agg(
        chuva_mm=("chuva_mm", "sum"),
        temp_media=("temp_media", "mean"),
        temp_max=("temp_max", "mean"),
    )

    weeks = semana_seq(anos)
    grid = bairros.assign(_k=1).merge(
        pd.DataFrame({"semana": weeks, "_k": 1}), on="_k").drop(columns="_k")
    panel = grid.merge(casos, on=["bairro_norm", "semana"], how="left")
    panel["casos"] = panel["casos"].fillna(0).astype(int)
    panel = panel.merge(clima, on="semana", how="left")
    for c in ("chuva_mm", "temp_media", "temp_max"):
        panel[c] = panel[c].fillna(panel[c].median() if c != "chuva_mm" else 0.0)
    return panel.sort_values(["bairro", "semana"]).reset_index(drop=True)


def add_features(panel: pd.DataFrame) -> pd.DataFrame:
    """Adiciona as colunas em FEATURES ao painel. Todas usam dados <= semana t."""
    df = panel.sort_values(["bairro", "semana"]).reset_index(drop=True)
    g = df.groupby("bairro", group_keys=False)

    df["casos_lag1"] = g["casos"].shift(1)
    df["casos_lag2"] = g["casos"].shift(2)
    df["casos_lag3"] = g["casos"].shift(3)
    df["roll4_mean"] = g["casos"].transform(lambda s: s.shift(1).rolling(4).mean())
    df["trend"] = df["casos"] - df["casos_lag1"]

    df["chuva_lag2"] = g["chuva_mm"].shift(2)
    df["chuva_lag4"] = g["chuva_mm"].shift(4)
    df["chuva_roll4"] = g["chuva_mm"].transform(lambda s: s.shift(1).rolling(4).sum())
    df["temp_roll4"] = g["temp_media"].transform(lambda s: s.shift(1).rolling(4).mean())

    woy = df["semana"] % 100
    df["sin_woy"] = np.sin(2 * np.pi * woy / 52)
    df["cos_woy"] = np.cos(2 * np.pi * woy / 52)

    # sinal espacial: média de casos dos OUTROS bairros do mesmo DS na semana t
    ds_sum = df.groupby(["ds", "semana"])["casos"].transform("sum")
    ds_cnt = df.groupby(["ds", "semana"])["casos"].transform("count")
    df["vizinhos_ds"] = (ds_sum - df["casos"]) / (ds_cnt - 1).clip(lower=1)
    return df


def add_targets(df: pd.DataFrame, horizontes: List[int] = None) -> pd.DataFrame:
    """Adiciona colunas y_h{h} = casos em t+h (por bairro). Só para treino."""
    horizontes = horizontes or HORIZONTES
    g = df.groupby("bairro", group_keys=False)
    for h in horizontes:
        df[f"y_h{h}"] = g["casos"].shift(-h)
    return df
