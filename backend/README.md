# PULSO Backend

Backend Python (FastAPI + XGBoost) para priorização operacional da Vigilância em Saúde de Recife.

## Stack

- **FastAPI** — API REST
- **XGBoost** — Modelo ML de priorização (94 bairros)
- **Pandas / GeoPandas** — ETL e GIS (spatial join ZEIS)
- **Requests** — Consumo de APIs externas (CKAN Recife, INMET)

## Como rodar

### 1. Setup inicial

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Download e processamento de dados

```bash
python scripts/download_references.py   # Baixa CSVs e GeoJSON do CKAN
python scripts/build_bairros_lookup.py  # GIS: ZEIS × 94 bairros
python scripts/generate_synthetic_data.py  # 9.776 registros sintéticos
python scripts/train_model.py          # Treina XGBoost
```

### 3. Rodar API

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do backend |
| GET | `/bairros` | Lista dos 94 bairros com DS, RPA, ZEIS |
| POST | `/prioridade` | Ranking dos 94 bairros por score ML |
| GET | `/prioridade/{bairro_id}` | Detalhe de um bairro |
| POST | `/prioridade/explicacao` | Decomposição XGBoost por feature |

## Variáveis de ambiente

```bash
CKAN_BASE_URL=https://dados.recife.pe.gov.br
CACHE_TTL=3600
```

## Fontes de dados

- **Dengue**: [Portal de Dados Abertos do Recife](https://dados.recife.pe.gov.br/dataset/casos-de-dengue-zika-e-chikungunya)
- **Distritos Sanitários**: [dados.recife.pe.gov.br/dataset/distritos-sanitarios](https://dados.recife.pe.gov.br/dataset/distritos-sanitarios)
- **Zoneamento (ZEIS)**: [dados.recife.pe.gov.br/dataset/zoneamento](https://dados.recife.pe.gov.br/dataset/zoneamento)
- **Clima (INMET)**: [bdmep.inmet.gov.br](https://bdmep.inmet.gov.br/)

## Notas

- O modelo é treinado inicialmente com **dados sintéticos** (fórmula atual + ruído).
- Os labels reais devem ser fornecidos pela **SEVS** para recalibrar via `/retrain`.
- Fallback: se CKAN/INMET estiverem fora, usa cache local + flag `stale_data`.
