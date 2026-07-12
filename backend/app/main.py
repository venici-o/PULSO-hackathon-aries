import json
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from app import config
from app.services import model as model_svc
from app.services import etl


# Carregar GeoJSON dos bairros do ESIG (polígonos reais) em memória no startup
GEOJSON_BAIRROS = None
geojson_file = config.DATA_DIR / "bairros_esig.geojson"
if geojson_file.exists():
    with open(geojson_file, "r", encoding="utf-8") as f:
        GEOJSON_BAIRROS = json.load(f)
    features = GEOJSON_BAIRROS.get('features', [])
    print(f"   📍 GeoJSON bairros ESIG carregado: {len(features)} bairros com polígonos reais")
else:
    print("   ⚠️  GeoJSON bairros_esig não encontrado para mapa.")

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# Startup
print("🚀 [PULSO Backend] Iniciando...")
if not config.BAIRROS_LOOKUP_FILE.exists():
    print("   ⚠️  bairros_lookup.json não encontrado.")
if not config.TRAINING_DATA_FILE.exists():
    print("   ⚠️  training_data.csv não encontrado.")
if not config.MODEL_FILE.exists():
    print("   ⚠️  modelo não encontrado. Treinando automaticamente...")
    if config.TRAINING_DATA_FILE.exists():
        model_svc._train_from_synthetic()
    else:
        print("   ❌ Não foi possível treinar — falta training_data.csv")
else:
    model_svc.load_model()
print("✅ [PULSO Backend] Pronto!")

def _to_float(val):
    return float(val) if val is not None else 0.0

def _to_int(val):
    return int(val) if val is not None else 0

@app.route("/health")
def health():
    model_ok = config.MODEL_FILE.exists()
    lookup_ok = config.BAIRROS_LOOKUP_FILE.exists()
    return jsonify({
        "status": "ok" if (model_ok and lookup_ok) else "degraded",
        "modelo_carregado": model_ok,
        "bairros_lookup": lookup_ok,
    })

@app.route("/bairros")
def listar_bairros():
    with open(config.BAIRROS_LOOKUP_FILE, "r", encoding="utf-8") as f:
        bairros = json.load(f)
    return jsonify({"total": len(bairros), "bairros": bairros})

@app.route("/prioridade", methods=["POST"])
def calcular_prioridade():
    req = request.get_json(silent=True) or {}
    semana_id = req.get("semana_id")
    top_n = req.get("top_n", 8)
    capacidade = req.get("capacidade", 3)

    df_features = etl.build_features(semana_id)
    scores = model_svc.predict_scores(df_features)
    df_features = df_features.copy()
    df_features["score"] = scores
    df_features["classificacao"] = df_features["score"].apply(model_svc.classificar_prioridade)

    df_sorted = df_features.sort_values("score", ascending=False).reset_index(drop=True)
    df_sorted["rank"] = df_sorted.index + 1

    top_n = min(int(top_n), len(df_sorted))
    capacidade = min(int(capacidade), len(df_sorted))
    top_df = df_sorted.head(top_n)
    cobertos = df_sorted.head(capacidade)
    restante = df_sorted.iloc[capacidade:]
    soma_total = float(df_sorted["score"].sum())
    soma_coberta = float(cobertos["score"].sum())
    percentual = round((soma_coberta / soma_total * 100), 1) if soma_total > 0 else 0.0

    def row_to_dict(r):
        return {
            "rank": _to_int(r["rank"]),
            "bairro_id": r["bairro_id"],
            "bairro_nome": r["bairro_nome"],
            "ds": r["ds"],
            "rpa": r["rpa"],
            "score": _to_float(r["score"]),
            "classificacao": r["classificacao"],
            "componentes": {
                "tendencia_epidemiologica": _to_float(r["tendencia_epidemiologica"]),
                "condicoes_climaticas": _to_float(r["condicoes_climaticas"]),
                "focos_identificados": _to_float(r["focos_identificados"]),
                "vulnerabilidade_territorial": _to_float(r["vulnerabilidade_territorial"]),
                "historico": _to_float(r["historico"]),
            },
            "metadados": {
                "casos_semana_atual": _to_int(r["casos_semana_atual"]),
                "casos_semana_anterior": _to_int(r["casos_semana_anterior"]),
                "chuva_mm": _to_float(r["chuva_mm"]),
                "focos_atuais": _to_int(r["focos_atuais"]),
            },
        }

    return jsonify({
        "semana_id": semana_id or "atual",
        "total_bairros": len(df_sorted),
        "top_n": top_n,
        "capacidade": capacidade,
        "cobertura_percentual": float(percentual),
        "top_prioridades": [row_to_dict(r) for _, r in top_df.iterrows()],
        "todos": [row_to_dict(r) for _, r in df_sorted.iterrows()],
        "cobertos": [row_to_dict(r) for _, r in cobertos.iterrows()],
        "restante": [row_to_dict(r) for _, r in restante.iterrows()],
    })

@app.route("/prioridade/<bairro_id>")
def detalhe_bairro(bairro_id):
    semana_id = request.args.get("semana_id")
    df_features = etl.build_features(semana_id)
    row = df_features[df_features["bairro_id"] == bairro_id]
    if row.empty:
        return jsonify({"error": "Bairro não encontrado"}), 404

    r = row.iloc[0]
    score = _to_float(model_svc.predict_scores(row)[0])
    return jsonify({
        "bairro_id": bairro_id,
        "bairro_nome": r["bairro_nome"],
        "ds": r["ds"],
        "rpa": r["rpa"],
        "score": score,
        "classificacao": model_svc.classificar_prioridade(score),
        "componentes": {
            "tendencia_epidemiologica": _to_float(r["tendencia_epidemiologica"]),
            "condicoes_climaticas": _to_float(r["condicoes_climaticas"]),
            "focos_identificados": _to_float(r["focos_identificados"]),
            "vulnerabilidade_territorial": _to_float(r["vulnerabilidade_territorial"]),
            "historico": _to_float(r["historico"]),
        },
        "metadados": {
            "casos_semana_atual": _to_int(r["casos_semana_atual"]),
            "casos_semana_anterior": _to_int(r["casos_semana_anterior"]),
            "chuva_mm": _to_float(r["chuva_mm"]),
            "focos_atuais": _to_int(r["focos_atuais"]),
        },
    })

@app.route("/prioridade/explicacao", methods=["POST"])
def explicacao():
    req = request.get_json(silent=True) or {}
    bairro_id = req.get("bairro_id")
    semana_id = req.get("semana_id")
    df_features = etl.build_features(semana_id)
    result = model_svc.explain_prediction(bairro_id, df_features)
    # Converter contribuições para float nativo
    if "contribuicoes" in result:
        for c in result["contribuicoes"]:
            c["contribuicao"] = _to_float(c["contribuicao"])
            c["contribuicao_percentual"] = _to_float(c["contribuicao_percentual"])
    if "base_value" in result:
        result["base_value"] = _to_float(result["base_value"])
    if "predicao_final" in result:
        result["predicao_final"] = _to_float(result["predicao_final"])
    return jsonify(result)

@app.route("/mapa")
def mapa_prioridade():
    """Retorna GeoJSON dos bairros (ZEIS como polígonos, non-ZEIS como pontos) com scores."""
    if GEOJSON_BAIRROS is None:
        return jsonify({"error": "GeoJSON não disponível"}), 503
    
    semana_id = request.args.get("semana_id")
    df_features = etl.build_features(semana_id)
    scores = model_svc.predict_scores(df_features)
    df_features = df_features.copy()
    df_features["score"] = scores
    df_features["classificacao"] = df_features["score"].apply(model_svc.classificar_prioridade)
    
    # Criar lookup bairro -> score (case-insensitive)
    bairro_scores = {}
    for _, row in df_features.iterrows():
        bairro_scores[row["bairro_nome"].upper().strip()] = {
            "score": _to_float(row["score"]),
            "classificacao": row["classificacao"],
            "ds": row["ds"],
        }
    
    # Clonar GeoJSON e adicionar propriedades
    import copy
    geojson = copy.deepcopy(GEOJSON_BAIRROS)
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        # ESIG GeoJSON usa EBAIRRNOME como nome do bairro
        bairro_nome = (props.get("EBAIRRNOME") or props.get("bairro", "")).upper().strip()
        if bairro_nome in bairro_scores:
            info = bairro_scores[bairro_nome]
            props["score"] = info["score"]
            props["classificacao"] = info["classificacao"]["rotulo"]
            props["classificacao_chave"] = info["classificacao"]["chave"]
            props["ds"] = info["ds"]
            props["bairro"] = bairro_nome  # Manter UPPERCASE consistente com /prioridade
        else:
            props["score"] = 0
            props["classificacao"] = "Desconhecido"
            props["classificacao_chave"] = "baixo"
            props["ds"] = "?"
            props["bairro"] = bairro_nome
    
    return jsonify(geojson)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
