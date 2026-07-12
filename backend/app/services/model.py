import json
from pathlib import Path
from typing import List, Optional

import numpy as np
import pandas as pd
import xgboost as xgb

from app import config

_model: Optional[xgb.XGBRegressor] = None
_feature_cols = [
    "tendencia_epidemiologica",
    "condicoes_climaticas",
    "focos_identificados",
    "vulnerabilidade_territorial",
    "historico",
    "vizinhos_semana_passada",
    "semana_ano",
    "ds_encoded",
]


def load_model() -> xgb.XGBRegressor:
    global _model
    if _model is not None:
        return _model

    if config.MODEL_FILE.exists():
        print(f"[model] Carregando modelo de {config.MODEL_FILE}")
        _model = xgb.XGBRegressor()
        _model.load_model(str(config.MODEL_FILE))
    else:
        print("[model] Modelo não encontrado. Treinando com dados sintéticos...")
        _train_from_synthetic()
    return _model


def _train_from_synthetic():
    import pandas as pd
    from sklearn.model_selection import train_test_split

    df = pd.read_csv(config.TRAINING_DATA_FILE)
    X = df[_feature_cols]
    y = df["target_prioridade"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    global _model
    _model = xgb.XGBRegressor(**config.XGB_PARAMS)
    _model.fit(X_train, y_train)
    _model.save_model(str(config.MODEL_FILE))
    print("[model] Modelo treinado e salvo.")


def predict_scores(df_features: pd.DataFrame) -> np.ndarray:
    model = load_model()
    X = df_features[_feature_cols]
    preds = model.predict(X)
    # Clamp 0-100
    return np.clip(np.round(preds), 0, 100)


def explain_prediction(bairro_id: str, df_features: pd.DataFrame) -> dict:
    """
    Retorna decomposição da predição por feature usando pred_contribs do XGBoost.
    """
    model = load_model()
    row = df_features[df_features["bairro_id"] == bairro_id]
    if row.empty:
        return {"error": "Bairro não encontrado"}

    X = row[_feature_cols]
    # pred_contribs retorna [base_value, feat1_contrib, ..., featN_contrib]
    contribs = model.predict(X, pred_contribs=True)
    base_value = float(contribs[0][0])
    feature_contribs = contribs[0][1:].tolist()

    total = base_value + sum(feature_contribs)
    contributions = []
    for feat, val in zip(_feature_cols, feature_contribs):
        contributions.append({
            "feature": feat,
            "contribuicao": round(float(val), 2),
            "contribuicao_percentual": round((float(val) / total * 100) if total != 0 else 0, 1),
        })

    return {
        "bairro_id": bairro_id,
        "base_value": round(base_value, 2),
        "predicao_final": round(float(total), 1),
        "contribuicoes": contributions,
    }


def classificar_prioridade(score: float):
    if score >= 85:
        return {"rotulo": "Crítico", "chave": "critico"}
    if score >= 70:
        return {"rotulo": "Alto", "chave": "alto"}
    if score >= 50:
        return {"rotulo": "Moderado", "chave": "moderado"}
    return {"rotulo": "Baixo", "chave": "baixo"}
