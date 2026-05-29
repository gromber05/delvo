"""Utilidades de seguridad para contraseñas y tokens JWT."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Calcula un hash seguro para almacenar una contraseña."""
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    """Comprueba una contraseña en claro contra su hash almacenado."""
    return password_hash.verify(password, password_hash_value)


def create_access_token(*, subject: str, user_id: int, expires_minutes: int | None = None) -> str:
    """Emite un JWT de acceso corto con subject y uid del usuario."""
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expiry_minutes = expires_minutes or int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

    payload: dict[str, Any] = {
        "sub": subject,
        "uid": user_id,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodifica y valida un JWT de acceso; propaga errores de PyJWT."""
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    return dict(payload)


def create_refresh_token(*, subject: str, user_id: int) -> str:
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expires_days = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "30"))
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
    payload: dict[str, Any] = {
        "sub": subject,
        "uid": user_id,
        "typ": "refresh",
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_refresh_token(token: str) -> dict[str, Any]:
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    if payload.get("typ") != "refresh":
        raise jwt.InvalidTokenError("Not a refresh token")
    return dict(payload)
