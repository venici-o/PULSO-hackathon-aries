#!/usr/bin/env python3
"""
Gera dataset sintético de treino: 104 semanas x 94 bairros = 9.776 registros.
Target calculado pela fórmula linear atual + ruído gaussiano.
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config

random.seed(42)
np.random.seed(42)

NUM_SEMANAS = 104  # 2 anos
PESOS = {
    "tendencia_epidemiologica": 0.35,
    "condicoes_climaticas": 0.25,
    "focos_identificados": 0.20,
    "vulnerabilidade_territorial": 0.15,
    "historico": 0.05,
}


def clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def gerar_tendencia(semana, bairro_base, bairro_lookup):
    """Simula casos de dengue com sazonalidade (pico jan-mar) e tendência."""
    # Sazonalidade: pico nas semanas 1-13 e 40-52 (aprox jan-mar e out-dez)
    semana_ano = (semana % 52) + 1
    seasonal = 1.0 + 0.8 * np.sin((semana_ano - 1) * 2 * np.pi / 52)  # pico ~semana 13
    if 40 <= semana_ano <= 52:
        seasonal += 0.5

    # Tendência de crescimento ao longo dos 2 anos
    trend = 1.0 + (semana / NUM_SEMANAS) * 0.3

    # Ruído
    noise = np.random.normal(1.0, 0.15)

    casos_atual = max(1, int(bairro_base * seasonal * trend * noise))
    casos_anterior = max(1, int(casos_atual * (0.7 + np.random.beta(2, 2))))

    # Normalização 0-100
    tendencia = clamp(((casos_atual / casos_anterior) - 1) * 100 + 50)
    return tendencia, casos_atual, casos_anterior


def gerar_clima(semana):
    """Simula chuva acumulada semanal com sazonalidade Recife (seco jul-dez, chuvoso jan-jun)."""
    semana_ano = (semana % 52) + 1
    # Recife: chuvoso jan-jun (semanas 1-26), seco jul-dez (27-52)
    if semana_ano <= 26:
        base_chuva = 120 + np.random.normal(0, 30)
    else:
        base_chuva = 60 + np.random.normal(0, 20)
    base_chuva = max(10, base_chuva)
    media_hist = 95
    clima = clamp((base_chuva / media_hist) * 50)
    return clima, base_chuva, media_hist


def gerar_focos(semana, bairro_lookup):
    """Focos de vetores: base do lookup + variação sazonal."""
    base_focos = 15 + (bairro_lookup["vulnerabilidade_score"] / 100) * 25
    seasonal = 1.0 + 0.4 * np.sin(((semana % 52) / 52) * 2 * np.pi)
    focos_atual = max(1, int(base_focos * seasonal + np.random.normal(0, 3)))
    focos_media = 18
    focos = clamp((focos_atual / focos_media) * 50)
    return focos, focos_atual, focos_media


def calcular_target(row):
    score = (
        row["tendencia_epidemiologica"] * PESOS["tendencia_epidemiologica"]
        + row["condicoes_climaticas"] * PESOS["condicoes_climaticas"]
        + row["focos_identificados"] * PESOS["focos_identificados"]
        + row["vulnerabilidade_territorial"] * PESOS["vulnerabilidade_territorial"]
        + row["historico"] * PESOS["historico"]
    )
    # Ruído gaussiano N(0, 5) para simular decisão humana imperfeita
    score += np.random.normal(0, 5)
    return clamp(score)


def main():
    with open(config.BAIRROS_LOOKUP_FILE, "r", encoding="utf-8") as f:
        bairros = json.load(f)

    print(f"Gerando {NUM_SEMANAS} semanas x {len(bairros)} bairros = {NUM_SEMANAS * len(bairros)} registros...")

    rows = []
    for semana in range(NUM_SEMANAS):
        semana_id = f"2024-W{((semana % 52) + 1):02d}" if semana < 52 else f"2025-W{((semana % 52) + 1):02d}"
        semana_ano = (semana % 52) + 1

        # Feature espacial: média de casos dos vizinhos na semana anterior
        # (simplificação: média dos bairros do mesmo DS na semana passada)
        # Calcularemos depois de ter todos os dados
        for b in bairros:
            tendencia, casos_atual, casos_anterior = gerar_tendencia(semana, 20 + b["vulnerabilidade_score"] / 5, b)
            clima, chuva, chuva_media = gerar_clima(semana)
            focos, focos_atual, focos_media = gerar_focos(semana, b)
            vulnerabilidade = b["vulnerabilidade_score"]
            historico = b["historico_score"]

            rows.append({
                "semana_id": semana_id,
                "semana_numero": semana,
                "semana_ano": semana_ano,
                "bairro_id": b["id"],
                "bairro_nome": b["nome"],
                "ds": b["ds"],
                "rpa": b["rpa"],
                "casos_semana_atual": casos_atual,
                "casos_semana_anterior": casos_anterior,
                "chuva_mm": chuva,
                "chuva_media_mm": chuva_media,
                "focos_atuais": focos_atual,
                "focos_media_area": focos_media,
                "tendencia_epidemiologica": tendencia,
                "condicoes_climaticas": clima,
                "focos_identificados": focos,
                "vulnerabilidade_territorial": vulnerabilidade,
                "historico": historico,
            })

    df = pd.DataFrame(rows)

    # Feature espacial: média de tendência dos bairros do mesmo DS na semana anterior
    df["vizinhos_semana_passada"] = 50.0  # default neutro
    for idx, row in df.iterrows():
        semana_ant = row["semana_numero"] - 1
        if semana_ant >= 0:
            ds = row["ds"]
            subset = df[(df["semana_numero"] == semana_ant) & (df["ds"] == ds)]
            if len(subset) > 0:
                df.at[idx, "vizinhos_semana_passada"] = subset["tendencia_epidemiologica"].mean()

    # Feature categórica: DS encoded (simples: número do DS)
    df["ds_encoded"] = df["ds"].str.extract(r'(\d+)').fillna(0).astype(int)

    # Target
    df["target_prioridade"] = df.apply(calcular_target, axis=1)

    # Salvar
    config.TRAINING_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(config.TRAINING_DATA_FILE, index=False)

    print(f"\n✅ Dataset sintético gerado: {config.TRAINING_DATA_FILE}")
    print(f"   Registros: {len(df)}")
    print(f"   Target médio: {df['target_prioridade'].mean():.1f}")
    print(f"   Target std: {df['target_prioridade'].std():.1f}")
    print(f"   Amostra (primeiras 3 linhas):")
    print(df.head(3).to_string(index=False))


if __name__ == "__main__":
    main()
