from contextlib import asynccontextmanager
import os
import secrets

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.api.api_router import api_router
from app.db.postgresql.planner_repository import ensure_planner_tables
from app.db.postgresql.user_repository import ensure_users_table


@asynccontextmanager
async def lifespan(app: FastAPI):
    import google.auth._helpers as _helpers
    from datetime import datetime, timezone as _tz
    _helpers.utcnow = lambda: datetime.now(_tz.utc)
    ensure_users_table()
    ensure_planner_tables()
    yield


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
