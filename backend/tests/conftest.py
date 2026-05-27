from __future__ import annotations

import os
import pytest

# Asegurar variables de entorno antes de importar la app
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRE_MINUTES", "60")
os.environ.setdefault("JWT_REFRESH_EXPIRE_DAYS", "30")
os.environ.setdefault("DOCS_USER", "admin")
os.environ.setdefault("DOCS_PASS", "password")


@pytest.fixture(scope="session", autouse=True)
def patch_init_db():
    """
    Parchea init_db a nivel de sesión para que no intente conectarse
    a PostgreSQL durante los tests.
    """
    from unittest.mock import patch
    with patch("app.db.postgresql.init_db.init_db", return_value=None):
        yield


@pytest.fixture(scope="session")
def app():
    """Instancia de la aplicación FastAPI lista para tests."""
    from main import app as _app
    return _app


@pytest.fixture(scope="session")
def client(app, patch_init_db):
    """
    TestClient de Starlette (síncrono) sobre la app FastAPI.
    Scope=session para reutilizar el cliente entre todos los tests.
    """
    from starlette.testclient import TestClient
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

def make_access_token(user_id: int = 1, email: str = "test@delvo.io") -> str:
    """Genera un JWT de acceso válido para usar en cabeceras Authorization."""
    from app.core.security import create_access_token
    return create_access_token(subject=email, user_id=user_id)


def auth_headers(user_id: int = 1, email: str = "test@delvo.io") -> dict:
    return {"Authorization": f"Bearer {make_access_token(user_id, email)}"}
