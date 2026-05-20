from fastapi import APIRouter

from app.api.v1.endpoints.assistant import router as assistant_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.google_calendar import router as google_calendar_router
from app.api.v1.endpoints.planner import router as planner_router

router = APIRouter(prefix="/v1")
router.include_router(assistant_router)
router.include_router(auth_router)
router.include_router(google_calendar_router)
router.include_router(planner_router)
