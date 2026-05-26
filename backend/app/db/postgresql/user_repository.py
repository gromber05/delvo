from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor



def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, name, email, password_hash, profile_photo_base64, created_at, updated_at
            FROM users
            WHERE email = %s
            LIMIT 1
            """,
            (email,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, name, email, profile_photo_base64,
                   google_email, role, created_at, updated_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def update_user_role(*, user_id: int, role: str) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE users SET role = %s WHERE id = %s",
            (role, user_id),
        )
        affected = cursor.rowcount
        connection.commit()
        return affected > 0


def get_all_users() -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
        )
        return [dict(r) for r in cursor.fetchall()]


def get_user_by_google_email(google_email: str) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, name, email, profile_photo_base64,
                   google_email, role, created_at, updated_at
            FROM users
            WHERE google_email = %s
            LIMIT 1
            """,
            (google_email,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_user(*, name: str | None, email: str, password_hash: str) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (name, email, password_hash),
        )
        inserted = cursor.fetchone()
        user_id = int(inserted[0])
        connection.commit()

    user = get_user_by_id(user_id=user_id)
    return user or {"id": user_id, "name": name or "", "email": email}


def update_user_profile(
    *,
    user_id: int,
    name: str | None,
    profile_photo_base64: str | None,
) -> dict[str, Any] | None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE users
            SET name = %s,
                profile_photo_base64 = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (name, profile_photo_base64, user_id),
        )
        affected = cursor.rowcount
        connection.commit()

    if affected == 0:
        return None
    return get_user_by_id(user_id=user_id)


def get_user_google_tokens(user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT google_access_token, google_refresh_token,
                   google_token_expiry, google_email
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_password_hash(user_id: int) -> str | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT password_hash FROM users WHERE id = %s LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        return str(row["password_hash"]) if row else None


def update_user_password(*, user_id: int, password_hash: str) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (password_hash, user_id),
        )
        affected = cursor.rowcount
        connection.commit()
        return affected > 0


def update_push_token(*, user_id: int, token: str | None) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE users SET expo_push_token = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (token, user_id),
        )
        connection.commit()


def update_gcal_watch(*, user_id: int, channel_id: str | None, expiry: str | None) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE users SET gcal_channel_id = %s, gcal_watch_expiry = %s WHERE id = %s",
            (channel_id, expiry, user_id),
        )
        connection.commit()


def get_user_by_channel_id(channel_id: str) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT id, name, email, google_email, expo_push_token FROM users WHERE gcal_channel_id = %s LIMIT 1",
            (channel_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_users_with_google() -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT id, gcal_channel_id, gcal_watch_expiry FROM users WHERE google_access_token IS NOT NULL"
        )
        rows = cursor.fetchall() or []
        return [dict(r) for r in rows]


def delete_user(*, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        affected = cursor.rowcount
        connection.commit()
        return affected > 0


def disconnect_google(*, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE users
            SET google_access_token = NULL,
                google_refresh_token = NULL,
                google_token_expiry = NULL,
                google_email = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (user_id,),
        )
        affected = cursor.rowcount
        connection.commit()
        return affected > 0


def update_google_tokens(
    *,
    user_id: int,
    google_access_token: str,
    google_refresh_token: str | None,
    google_token_expiry: str | None,
    google_email: str | None,
) -> dict[str, Any] | None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE users
            SET google_access_token = %s,
                google_refresh_token = %s,
                google_token_expiry = %s,
                google_email = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (google_access_token, google_refresh_token, google_token_expiry, google_email, user_id),
        )
        affected = cursor.rowcount
        connection.commit()

    if affected == 0:
        return None
    return get_user_by_id(user_id=user_id)
