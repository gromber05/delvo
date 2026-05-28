"""Endpoints de autenticacion, perfil y gestion de cuenta."""

from __future__ import annotations

import secrets
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
    delete_user,
    disconnect_google,
    get_user_by_email,
    get_user_by_google_email,
    get_user_by_id,
    get_user_password_hash,
    update_google_tokens,
    update_push_token,
    update_user_password,
    update_user_profile,
)


router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    """Datos necesarios para crear una cuenta con email y contraseña."""

    name: str | None = Field(default=None, max_length=120)
    email: str = Field(..., min_length=5, max_length=190)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Credenciales de acceso por email y contraseña."""

    email: str = Field(..., min_length=5, max_length=190)
    password: str = Field(..., min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    profile_photo_base64: str | None = None


class AuthResponse(BaseModel):
    """Tokens de sesion y usuario seguro devueltos tras autenticar."""

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
    """Dependencia local que exige token Bearer y devuelve el uid validado."""
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
    """Registra un usuario nuevo y devuelve tokens de sesion iniciales."""
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
    """Autentica credenciales y emite un par access/refresh token."""
    email = _normalize_email(payload.email)
    user = get_user_by_email(email)

    if not user or not verify_password(payload.password, str(user["password_hash"])):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    safe_user = _build_safe_user(user)
    uid = safe_user["id"]
    access_token = create_access_token(subject=email, user_id=uid)
    refresh_token = create_refresh_token(subject=email, user_id=uid)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=safe_user)


class GoogleLoginRequest(BaseModel):
    google_access_token: str = Field(..., min_length=1)
    google_refresh_token: str | None = None
    google_token_expiry: str | None = None
    google_email: str = Field(..., min_length=3)
    google_name: str | None = None


@router.post("/google-login", response_model=AuthResponse)
def google_login(payload: GoogleLoginRequest) -> AuthResponse:
    """Autentica o crea usuario a partir de credenciales de Google."""
    google_email = payload.google_email.strip().lower()

    user = get_user_by_google_email(google_email)
    if not user:
        user = get_user_by_email(google_email)

    if not user:
        random_hash = hash_password(secrets.token_hex(32))
        name = (payload.google_name or "").strip() or None
        user = create_user(name=name, email=google_email, password_hash=random_hash)

    uid = int(user["id"])

    update_google_tokens(
        user_id=uid,
        google_access_token=payload.google_access_token,
        google_refresh_token=payload.google_refresh_token,
        google_token_expiry=payload.google_token_expiry,
        google_email=google_email,
    )

    user = get_user_by_id(uid) or user
    access_token = create_access_token(subject=google_email, user_id=uid)
    refresh_token = create_refresh_token(subject=google_email, user_id=uid)
    return AuthResponse(access_token=access_token, refresh_token=refresh_token, user=_build_safe_user(user))


@router.get("/me")
def me(user_id: int = Depends(get_authenticated_user_id)) -> dict[str, Any]:
    """Devuelve el perfil publico del usuario autenticado."""
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
    """Actualiza nombre y foto del perfil autenticado."""
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
    """Guarda tokens de Google Calendar asociados al usuario autenticado."""
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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/me/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    """Cambia la contraseña despues de validar la actual."""
    current_hash = get_user_password_hash(user_id)
    if not current_hash:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not verify_password(payload.current_password, current_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    ok = update_user_password(user_id=user_id, password_hash=hash_password(payload.new_password))
    if not ok:
        raise HTTPException(status_code=500, detail="Error al actualizar la contraseña")
    return {"ok": True}


@router.delete("/me")
def delete_account(user_id: int = Depends(get_authenticated_user_id)) -> dict[str, Any]:
    """Elimina la cuenta y sus datos asociados por cascada."""
    ok = delete_user(user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"ok": True}


@router.delete("/me/google-calendar")
def disconnect_google_calendar(user_id: int = Depends(get_authenticated_user_id)) -> dict[str, Any]:
    """Desvincula credenciales y metadata de Google Calendar."""
    ok = disconnect_google(user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"ok": True}


@router.get("/me/export")
def export_my_data(user_id: int = Depends(get_authenticated_user_id)) -> dict[str, Any]:
    """Exporta datos personales principales en una respuesta JSON serializable."""
    import datetime

    from app.db.postgresql.event_repository import list_events
    from app.db.postgresql.meeting_repository import list_meetings
    from app.db.postgresql.notes_repository import list_notes
    from app.db.postgresql.task_repository import list_tasks

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    def serialize(obj: Any) -> Any:
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        if isinstance(obj, dict):
            return {k: serialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [serialize(i) for i in obj]
        return obj

    return {
        "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
        "user": _build_safe_user(user),
        "tasks": serialize(list_tasks(user_id=user_id)),
        "events": serialize(list_events(user_id=user_id)),
        "meetings": serialize(list_meetings(user_id=user_id)),
        "notes": serialize(list_notes(user_id=user_id)),
    }


class PushTokenRequest(BaseModel):
    token: str = Field(..., min_length=1)


@router.post("/me/push-token")
def register_push_token(
    payload: PushTokenRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    """Registra el token Expo usado para notificaciones push."""
    update_push_token(user_id=user_id, token=payload.token)
    return {"ok": True}
