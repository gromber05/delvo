from typing import Dict

from fastapi import APIRouter

from .service import assistant_reindex

router = APIRouter()


@router.post("/reindex")
def reindex_endpoint() -> Dict[str, int]:
    return assistant_reindex()
