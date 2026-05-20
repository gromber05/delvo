from fastapi import APIRouter

from .chat_endpoint import router as chat_router
from .reindex_endpoint import router as reindex_router

router = APIRouter(prefix="/assistant", tags=["assistant"])
router.include_router(chat_router)
router.include_router(reindex_router)
