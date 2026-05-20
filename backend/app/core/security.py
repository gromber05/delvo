from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return password_hash.verify(password, password_hash_value)


def create_access_token(*, subject: str, user_id: int, expires_minutes: int | None = None) -> str:
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
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    return dict(payload)
