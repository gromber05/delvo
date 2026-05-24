from __future__ import annotations

from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.db.postgresql.user_repository import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_google_tokens,
    update_push_token,
    update_user_profile,
)


router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str = Field(..., min_length=5, max_length=190)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=190)
    password: str = Field(..., min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    profile_photo_base64: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class SaveGoogleTokensRequest(BaseModel):
    google_access_token: str = Field(..., min_length=1)
    google_refresh_token: str | None = None
    google_token_expiry: str | None = None
    google_email: str | None = None


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _build_safe_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(user["id"]),
        "name": str(user.get("name") or ""),
        "email": str(user["email"]),
        "role": str(user.get("role") or "user"),
        "profile_photo_base64": user.get("profile_photo_base64"),
        "google_email": user.get("google_email"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


def get_authenticated_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Token de acceso requerido")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido") from None

    raw_uid = payload.get("uid")
    if not isinstance(raw_uid, int):
        raise HTTPException(status_code=401, detail="Token invalido")

    if get_user_by_id(raw_uid) is None:
        raise HTTPException(status_code=401, detail="Token invalido")

    return raw_uid


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> AuthResponse:
    email = _normalize_email(payload.email)
    name = (payload.name or "").strip()

    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Este email ya está registrado")

    user = create_user(
        name=name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    uid = int(user["id"])
    access_token = create_access_token(subject=email, user_id=uid)
    refresh_token = create_refresh_token(subject=email, user_id=uid)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=_build_safe_user(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    email = _normalize_email(payload.email)
    user = get_user_by_email(email)

    if not user or not verify_password(payload.password, str(user["password_hash"])):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    safe_user = _build_safe_user(user)
    uid = safe_user["id"]
    access_token = create_access_token(subject=email, user_id=uid)
    refresh_token = create_refresh_token(subject=email, user_id=uid)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=safe_user)


@router.get("/me")
def me(user_id: int = Depends(get_authenticated_user_id)) -> dict[str, Any]:
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Token invalido")
    return {"user": _build_safe_user(user)}


@router.post("/refresh")
def refresh(payload: RefreshRequest) -> dict[str, Any]:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        data = decode_refresh_token(payload.refresh_token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token de refresco inválido o expirado") from None

    uid = data.get("uid")
    sub = data.get("sub")
    if not isinstance(uid, int) or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Token de refresco inválido")

    user = get_user_by_id(uid)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    new_access = create_access_token(subject=sub, user_id=uid)
    new_refresh = create_refresh_token(subject=sub, user_id=uid)
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.put("/me")
def update_me(
    payload: UpdateProfileRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    next_name = payload.name.strip() if isinstance(payload.name, str) else None
    updated = update_user_profile(
        user_id=user_id,
        name=next_name,
        profile_photo_base64=payload.profile_photo_base64,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"user": _build_safe_user(updated)}


@router.put("/me/google-calendar")
def save_google_calendar_tokens(
    payload: SaveGoogleTokensRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    updated = update_google_tokens(
        user_id=user_id,
        google_access_token=payload.google_access_token,
        google_refresh_token=payload.google_refresh_token,
        google_token_expiry=payload.google_token_expiry,
        google_email=payload.google_email,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"ok": True, "google_email": payload.google_email}


class PushTokenRequest(BaseModel):
    token: str = Field(..., min_length=1)


@router.post("/me/push-token")
def register_push_token(
    payload: PushTokenRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    update_push_token(user_id=user_id, token=payload.token)
    return {"ok": True}
