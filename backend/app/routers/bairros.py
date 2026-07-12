import json
from pathlib import Path

from fastapi import APIRouter

from app import config

router = APIRouter(prefix="/bairros", tags=["bairros"])


@router.get("")
def listar_bairros():
    with open(config.BAIRROS_LOOKUP_FILE, "r", encoding="utf-8") as f:
        bairros = json.load(f)
    return {
        "total": len(bairros),
        "bairros": bairros,
    }
