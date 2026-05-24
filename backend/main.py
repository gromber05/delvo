from contextlib import asynccontextmanager
import asyncio
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.api.api_router import api_router
from app.db.postgresql.init_db import init_db

logger = logging.getLogger(__name__)

_RENEW_INTERVAL_SECONDS = 6 * 24 * 3600  # 6 days
_RENEW_THRESHOLD_HOURS = 24              # renew if expiry is within 24 h


def _renew_all_watches() -> None:
    from app.db.postgresql.user_repository import get_all_users_with_google, update_gcal_watch
    from app.services import google_calendar_service as gcal

    users = get_all_users_with_google()
    now = datetime.now(timezone.utc)

    for user in users:
        uid = int(user["id"])
        expiry_raw: str | None = user.get("gcal_watch_expiry")

        if expiry_raw:
            try:
                expiry_dt = datetime.fromisoformat(expiry_raw)
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                if expiry_dt - now > timedelta(hours=_RENEW_THRESHOLD_HOURS):
                    continue
            except ValueError:
                pass

        try:
            channel_id = str(uuid.uuid4())
            result = gcal.register_watch(uid, channel_id)
            expiry_ms = result.get("expiration")
            expiry_iso = (
                datetime.fromtimestamp(int(expiry_ms) / 1000, tz=timezone.utc).isoformat()
                if expiry_ms else None
            )
            update_gcal_watch(user_id=uid, channel_id=channel_id, expiry=expiry_iso)
            logger.info("GCal watch renovado para usuario %s, expira %s", uid, expiry_iso)
        except Exception:
            logger.exception("Error renovando GCal watch para usuario %s", uid)


async def _gcal_watch_renewal_loop() -> None:
    await asyncio.sleep(30)
    while True:
        try:
            await asyncio.get_event_loop().run_in_executor(None, _renew_all_watches)
        except Exception:
            logger.exception("Error en el loop de renovación de GCal watches")
        await asyncio.sleep(_RENEW_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import google.auth._helpers as _helpers
    _helpers.utcnow = lambda: datetime.now(timezone.utc)
    init_db()
    renewal_task = asyncio.create_task(_gcal_watch_renewal_loop())
    yield
    renewal_task.cancel()
    try:
        await renewal_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Delvo Backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.include_router(api_router)

security = HTTPBasic()
DOCS_USER = os.getenv("DOCS_USER")
DOCS_PASS = os.getenv("DOCS_PASS")


def check_docs_auth(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    ok_user = secrets.compare_digest(credentials.username, DOCS_USER)
    ok_pass = secrets.compare_digest(credentials.password, DOCS_PASS)
    if not (ok_user and ok_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(
    "/openapi.json",
    include_in_schema=False,
    dependencies=[Depends(check_docs_auth)],
)
def openapi_json() -> JSONResponse:
    return JSONResponse(app.openapi())


@app.get("/docs", include_in_schema=False, dependencies=[Depends(check_docs_auth)])
def docs():
    return get_swagger_ui_html(openapi_url="/openapi.json", title="API Docs")
