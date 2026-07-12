import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
MODELS_DIR = BASE_DIR / "app" / "models"
CACHE_DIR = DATA_DIR / "cache"

CKAN_BASE_URL = os.getenv("CKAN_BASE_URL", "https://dados.recife.pe.gov.br")
CKAN_API_URL = f"{CKAN_BASE_URL}/api/3"

INMET_BDMEP_URL = os.getenv("INMET_BDMEP_URL", "https://bdmep.inmet.gov.br/webservices")

# Resource IDs CKAN (encontrados na pesquisa)
DATASET_DENGUE_ID = "3c990c15-29ad-46e5-8fd2-1b83289bb9f5"
DATASET_DISTRITOS_ID = "09ae25d3-7330-4fff-af57-9e9191a4c2f6"
DATASET_ZONEAMENTO_ID = "zoneamento"  # dataset slug

# Arquivos de referência
BAIRROS_LOOKUP_FILE = DATA_DIR / "bairros_lookup.json"
TRAINING_DATA_FILE = DATA_DIR / "training_data.csv"
MODEL_FILE = MODELS_DIR / "xgb_prioridade.json"

CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL", "3600"))

# Configurações do modelo
XGB_PARAMS = {
    "n_estimators": 100,
    "max_depth": 4,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "objective": "reg:squarederror",
    "random_state": 42,
}
