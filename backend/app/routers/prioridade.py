from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import etl, model as model_svc

router = APIRouter(prefix="/prioridade", tags=["prioridade"])


class PrioridadeRequest(BaseModel):
    semana_id: Optional[str] = None  # ex: "2025-W30"
    top_n: int = 8
    capacidade: int = 3


class RetrainRequest(BaseModel):
    pass  # Futuro: receber CSV de labels reais


@router.post("")
def calcular_prioridade(req: PrioridadeRequest):
    df_features = etl.build_features(req.semana_id)
    scores = model_svc.predict_scores(df_features)
    df_features["score"] = scores
    df_features["classificacao"] = df_features["score"].apply(model_svc.classificar_prioridade)

    # Ordenar
    df_sorted = df_features.sort_values("score", ascending=False).reset_index(drop=True)
    df_sorted["rank"] = df_sorted.index + 1

    # Top N
    top_n = min(req.top_n, len(df_sorted))
    top_df = df_sorted.head(top_n)

    # Cobertura (primeiros N = capacidade)
    capacidade = min(req.capacidade, len(df_sorted))
    cobertos = df_sorted.head(capacidade)
    restante = df_sorted.iloc[capacidade:]
    soma_total = df_sorted["score"].sum()
    soma_coberta = cobertos["score"].sum()
    percentual = round((soma_coberta / soma_total * 100), 1) if soma_total > 0 else 0

    def row_to_dict(r):
        return {
            "rank": int(r["rank"]),
            "bairro_id": r["bairro_id"],
            "bairro_nome": r["bairro_nome"],
            "ds": r["ds"],
            "rpa": r["rpa"],
            "score": float(r["score"]),
            "classificacao": r["classificacao"],
            "componentes": {
                "tendencia_epidemiologica": round(float(r["tendencia_epidemiologica"]), 1),
                "condicoes_climaticas": round(float(r["condicoes_climaticas"]), 1),
                "focos_identificados": round(float(r["focos_identificados"]), 1),
                "vulnerabilidade_territorial": round(float(r["vulnerabilidade_territorial"]), 1),
                "historico": round(float(r["historico"]), 1),
            },
            "metadados": {
                "casos_semana_atual": int(r["casos_semana_atual"]),
                "casos_semana_anterior": int(r["casos_semana_anterior"]),
                "chuva_mm": round(float(r["chuva_mm"]), 1),
                "focos_atuais": int(r["focos_atuais"]),
            },
        }

    return {
        "semana_id": req.semana_id or "atual",
        "total_bairros": len(df_sorted),
        "top_n": top_n,
        "capacidade": capacidade,
        "cobertura_percentual": percentual,
        "top_prioridades": [row_to_dict(r) for _, r in top_df.iterrows()],
        "todos": [row_to_dict(r) for _, r in df_sorted.iterrows()],
        "cobertos": [row_to_dict(r) for _, r in cobertos.iterrows()],
        "restante": [row_to_dict(r) for _, r in restante.iterrows()],
    }


@router.get("/{bairro_id}")
def detalhe_bairro(bairro_id: str, semana_id: Optional[str] = None):
    df_features = etl.build_features(semana_id)
    row = df_features[df_features["bairro_id"] == bairro_id]
    if row.empty:
        return {"error": "Bairro não encontrado"}

    r = row.iloc[0]
    score = float(model_svc.predict_scores(row)[0])
    return {
        "bairro_id": bairro_id,
        "bairro_nome": r["bairro_nome"],
        "ds": r["ds"],
        "rpa": r["rpa"],
        "score": score,
        "classificacao": model_svc.classificar_prioridade(score),
        "componentes": {
            "tendencia_epidemiologica": round(float(r["tendencia_epidemiologica"]), 1),
            "condicoes_climaticas": round(float(r["condicoes_climaticas"]), 1),
            "focos_identificados": round(float(r["focos_identificados"]), 1),
            "vulnerabilidade_territorial": round(float(r["vulnerabilidade_territorial"]), 1),
            "historico": round(float(r["historico"]), 1),
        },
        "metadados": {
            "casos_semana_atual": int(r["casos_semana_atual"]),
            "casos_semana_anterior": int(r["casos_semana_anterior"]),
            "chuva_mm": round(float(r["chuva_mm"]), 1),
            "focos_atuais": int(r["focos_atuais"]),
        },
    }


@router.post("/explicacao")
def explicacao(bairro_id: str, semana_id: Optional[str] = None):
    df_features = etl.build_features(semana_id)
    return model_svc.explain_prediction(bairro_id, df_features)
