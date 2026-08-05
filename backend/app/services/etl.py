import json
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app import config
from app.services import ckan_client, inmet_client


def _clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def build_features(semana_id: Optional[str] = None) -> pd.DataFrame:
    """
    Orquestra ETL: busca dados de dengue, clima, cruza com lookups,
    normaliza componentes (0-100), adiciona features extras.
    Retorna DataFrame com 94 linhas (um por bairro) e todas as features.
    """
    # Carregar lookup
    with open(config.BAIRROS_LOOKUP_FILE, "r", encoding="utf-8") as f:
        bairros = json.load(f)

    # Determinar ano/semana a partir do semana_id ou usar semana atual simulada
    if semana_id:
        parts = semana_id.split("-W")
        ano = int(parts[0]) if len(parts) > 0 else 2025
        semana = int(parts[1]) if len(parts) > 1 else 1
    else:
        ano = 2025
        semana = 1

    semana_ant = semana - 1 if semana > 1 else 52
    ano_ant = ano if semana > 1 else ano - 1

    # A semana epidemiológica do SINAN (SEM_NOT) é codificada como YYYYWW
    # (ex.: 202505 = semana 5 de 2025). O agregado de ckan_client preserva
    # esse código na coluna "semana", então filtramos pelo código, não por 1-52.
    semana_cod = ano * 100 + semana
    semana_ant_cod = ano_ant * 100 + semana_ant

    # Reprodutibilidade: o ranking mostrado ao usuário não pode variar entre
    # requisições idênticas.
    np.random.seed(semana_cod)

    # --- 1. Dados epidemiológicos ---
    try:
        df_dengue = ckan_client.get_dengue_by_bairro_semana(ano)
        df_dengue_ant = ckan_client.get_dengue_by_bairro_semana(ano_ant)
    except Exception:
        df_dengue = pd.DataFrame()
        df_dengue_ant = pd.DataFrame()

    # --- 2. Dados climáticos ---
    try:
        df_clima = inmet_client.get_chuva_semana_recife(ano)
    except Exception:
        df_clima = pd.DataFrame()

    chuva_atual = 0
    chuva_media = 95
    if not df_clima.empty and semana in df_clima["semana"].values:
        chuva_atual = float(df_clima[df_clima["semana"] == semana]["chuva_mm"].values[0])
        chuva_media = df_clima["chuva_mm"].mean()

    # --- 3. Montar features por bairro ---
    rows = []
    for b in bairros:
        nome = b["nome"]
        ds = b["ds"]

        # Casos atual e anterior
        casos_atual = 0
        casos_atual_encontrado = False
        casos_anterior = 0
        casos_anterior_encontrado = False
        if not df_dengue.empty:
            # "encontrado" = bairro existe nos dados reais (qualquer semana);
            # a contagem da semana pedida pode ser 0 (zero real != dado ausente).
            bairro_rows = df_dengue[df_dengue["bairro_nome"].str.lower() == nome.lower()]
            if not bairro_rows.empty:
                casos_atual = int(bairro_rows[bairro_rows["semana"] == semana_cod]["casos"].sum())
                casos_atual_encontrado = True
        if not df_dengue_ant.empty:
            bairro_rows_ant = df_dengue_ant[df_dengue_ant["bairro_nome"].str.lower() == nome.lower()]
            if not bairro_rows_ant.empty:
                casos_anterior = int(bairro_rows_ant[bairro_rows_ant["semana"] == semana_ant_cod]["casos"].sum())
                casos_anterior_encontrado = True

        # Fallback só quando não há dado real (zero real != dado ausente)
        if not casos_atual_encontrado:
            base = 5 + (b["vulnerabilidade_score"] / 100) * 20
            casos_atual = max(1, int(base + np.random.normal(0, 2)))
        if not casos_anterior_encontrado:
            casos_anterior = max(1, int(casos_atual * 0.8)) if casos_atual > 0 else 1

        # Normalizações
        # Tendência semana-a-semana. Com contagem semanal, casos_anterior pode
        # ser 0 (zero real): 0->N é tendência de alta; 0->0 é neutro.
        if casos_anterior > 0:
            tendencia = _clamp(((casos_atual / casos_anterior) - 1) * 100 + 50)
        elif casos_atual > 0:
            tendencia = 100.0
        else:
            tendencia = 50.0
        clima = _clamp((chuva_atual / chuva_media) * 50) if chuva_media > 0 else 50

        # Focos (lookup fixo + variação)
        base_focos = 15 + (b["vulnerabilidade_score"] / 100) * 25
        focos_atual = max(1, int(base_focos + np.random.normal(0, 3)))
        focos_media = 18
        focos = _clamp((focos_atual / focos_media) * 50)

        # Vulnerabilidade e histórico do lookup
        vulnerabilidade = b["vulnerabilidade_score"]
        historico = b["historico_score"]

        # Feature espacial (vizinhos)
        vizinhos = 50.0  # neutro
        if not df_dengue.empty:
            # Média de tendência do DS na semana atual (proxy)
            subset_ds = df_dengue[df_dengue["bairro_nome"].isin([bb["nome"] for bb in bairros if bb["ds"] == ds])]
            if not subset_ds.empty:
                # Não temos tendência no df_dengue, então usamos média de casos
                media_casos_ds = subset_ds["casos"].mean()
                vizinhos = _clamp((media_casos_ds / 20) * 50)

        rows.append({
            "bairro_id": b["id"],
            "bairro_nome": nome,
            "ds": ds,
            "rpa": b["rpa"],
            "tendencia_epidemiologica": tendencia,
            "condicoes_climaticas": clima,
            "focos_identificados": focos,
            "vulnerabilidade_territorial": vulnerabilidade,
            "historico": historico,
            "vizinhos_semana_passada": vizinhos,
            "semana_ano": semana,
            "ds_encoded": int("".join(filter(str.isdigit, ds))) if any(c.isdigit() for c in ds) else 0,
            # Metadados para frontend
            "casos_semana_atual": casos_atual,
            "casos_semana_anterior": casos_anterior,
            "chuva_mm": chuva_atual,
            "focos_atuais": focos_atual,
        })

    return pd.DataFrame(rows)
