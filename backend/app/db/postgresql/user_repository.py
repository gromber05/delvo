from __future__ import annotations
from typing import Any
from app.db.models import User, _to_dict, get_session

def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(User)
            .filter(User.email == email)
            .first()
        )
        if not row:
            return None
        d = _to_dict(row)
        return {k: d[k] for k in ("id", "name", "email", "password_hash", "profile_photo_base64", "created_at", "updated_at") if k in d}

def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(User)
            .filter(User.id == user_id)
            .first()
        )
        if not row:
            return None
        d = _to_dict(row)
        return {k: d[k] for k in ("id", "name", "email", "profile_photo_base64", "google_email", "role", "created_at", "updated_at") if k in d}

def update_user_role(*, user_id: int, role: str) -> bool:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return False
        row.role = role
    return True

def get_all_users() -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(User)
            .order_by(User.created_at.desc())
            .all()
        )
        return [{k: _to_dict(r)[k] for k in ("id", "name", "email", "role", "created_at")} for r in rows]

def get_user_by_google_email(google_email: str) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(User)
            .filter(User.google_email == google_email)
            .first()
        )
        if not row:
            return None
        d = _to_dict(row)
        return {k: d[k] for k in ("id", "name", "email", "profile_photo_base64", "google_email", "role", "created_at", "updated_at") if k in d}

def create_user(*, name: str | None, email: str, password_hash: str) -> dict[str, Any]:
    with get_session() as session:
        user = User(name=name, email=email, password_hash=password_hash)
        session.add(user)
        session.flush()
        user_id = user.id

    result = get_user_by_id(user_id=user_id)
    return result or {"id": user_id, "name": name or "", "email": email}

def update_user_profile(
    *,
    user_id: int,
    name: str | None,
    profile_photo_base64: str | None,
) -> dict[str, Any] | None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return None
        row.name = name
        row.profile_photo_base64 = profile_photo_base64

    return get_user_by_id(user_id=user_id)

def get_user_google_tokens(user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return None
        return {
            "google_access_token": row.google_access_token,
            "google_refresh_token": row.google_refresh_token,
            "google_token_expiry": row.google_token_expiry,
            "google_email": row.google_email,
        }


def get_user_password_hash(user_id: int) -> str | None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        return str(row.password_hash) if row and row.password_hash else None

def update_user_password(*, user_id: int, password_hash: str) -> bool:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return False
        row.password_hash = password_hash
    return True

def get_push_token(user_id: int) -> str | None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        return str(row.expo_push_token) if row and row.expo_push_token else None

def update_push_token(*, user_id: int, token: str | None) -> None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if row:
            row.expo_push_token = token

def update_gcal_watch(*, user_id: int, channel_id: str | None, expiry: str | None) -> None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if row:
            row.gcal_channel_id = channel_id
            row.gcal_watch_expiry = expiry

def get_user_by_channel_id(channel_id: str) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(User)
            .filter(User.gcal_channel_id == channel_id)
            .first()
        )
        if not row:
            return None
        return {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "google_email": row.google_email,
            "expo_push_token": row.expo_push_token,
        }

def get_all_users_with_google() -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(User)
            .filter(User.google_access_token.isnot(None))
            .all()
        )
        return [
            {
                "id": r.id,
                "gcal_channel_id": r.gcal_channel_id,
                "gcal_watch_expiry": r.gcal_watch_expiry,
            }
            for r in rows
        ]

def delete_user(*, user_id: int) -> bool:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return False
        session.delete(row)
    return True

def disconnect_google(*, user_id: int) -> bool:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return False
        row.google_access_token = None
        row.google_refresh_token = None
        row.google_token_expiry = None
        row.google_email = None
    return True

def update_google_tokens(
    *,
    user_id: int,
    google_access_token: str,
    google_refresh_token: str | None,
    google_token_expiry: str | None,
    google_email: str | None,
) -> dict[str, Any] | None:
    with get_session() as session:
        row = session.query(User).filter(User.id == user_id).first()
        if not row:
            return None
        row.google_access_token = google_access_token
        row.google_refresh_token = google_refresh_token
        row.google_token_expiry = google_token_expiry
        row.google_email = google_email

    return get_user_by_id(user_id=user_id)
