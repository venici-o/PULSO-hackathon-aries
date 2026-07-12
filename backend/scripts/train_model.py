#!/usr/bin/env python3
"""
Treina modelo XGBoost para priorização operacional.
"""
import json
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import config


def main():
    print("[train_model] Lendo dataset de treino...")
    df = pd.read_csv(config.TRAINING_DATA_FILE)

    feature_cols = [
        "tendencia_epidemiologica",
        "condicoes_climaticas",
        "focos_identificados",
        "vulnerabilidade_territorial",
        "historico",
        "vizinhos_semana_passada",
        "semana_ano",
        "ds_encoded",
    ]

    X = df[feature_cols]
    y = df["target_prioridade"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"   Treino: {len(X_train)} | Teste: {len(X_test)}")
    print(f"   Features: {feature_cols}")

    model = xgb.XGBRegressor(**config.XGB_PARAMS)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred, squared=False)

    print(f"\n📊 Métricas no conjunto de teste:")
    print(f"   MAE:  {mae:.2f}")
    print(f"   RMSE: {rmse:.2f}")

    print(f"\n📈 Feature Importances:")
    importances = model.get_booster().get_score(importance_type="gain")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"   {feat}: {imp:.1f}")

    config.MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(config.MODEL_FILE))

    # Salvar metadados
    meta = {
        "features": feature_cols,
        "mae": float(mae),
        "rmse": float(rmse),
        "params": config.XGB_PARAMS,
        "n_train": len(X_train),
        "n_test": len(X_test),
    }
    meta_file = config.MODELS_DIR / "model_meta.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\n✅ Modelo salvo em: {config.MODEL_FILE}")
    print(f"✅ Metadados: {meta_file}")


if __name__ == "__main__":
    main()
