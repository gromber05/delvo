from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.db.postgresql.user_repository import get_user_google_tokens, update_google_tokens
from app.db.postgresql.event_repository import create_event as db_create_event
from app.db.postgresql.connector import get_db_cursor

_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
_TOKEN_URI = "https://oauth2.googleapis.com/token"


def _build_credentials(user_id: int) -> Credentials:
    tokens = get_user_google_tokens(user_id)
    if not tokens or not tokens.get("google_access_token"):
        raise ValueError("El usuario no tiene Google Calendar vinculado")

    expiry: datetime | None = None
    if tokens.get("google_token_expiry"):
        raw = tokens["google_token_expiry"]
        
        try:
            expiry = datetime.fromisoformat(raw)
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
        except ValueError:
            expiry = None

    creds = Credentials(
        token=tokens["google_access_token"],
        refresh_token=tokens.get("google_refresh_token"),
        token_uri=_TOKEN_URI,
        client_id=_CLIENT_ID,
        client_secret=_CLIENT_SECRET,
        expiry=expiry,
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        update_google_tokens(
            user_id=user_id,
            google_access_token=creds.token or "",
            google_refresh_token=creds.refresh_token,
            google_token_expiry=(
                creds.expiry.replace(tzinfo=timezone.utc).isoformat()
                if creds.expiry and creds.expiry.tzinfo is None
                else creds.expiry.isoformat() if creds.expiry else None
            ),
            google_email=tokens.get("google_email"),
        )

    return creds


def list_events(
    user_id: int,
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 50,
) -> list[dict[str, Any]]:
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    params: dict[str, Any] = {
        "calendarId": "primary",
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if time_min:
        params["timeMin"] = time_min
    if time_max:
        params["timeMax"] = time_max
    result = service.events().list(**params).execute()
    return result.get("items", [])


def create_event(user_id: int, body: dict[str, Any]) -> dict[str, Any]:
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    return service.events().insert(calendarId="primary", body=body).execute()


def update_event(user_id: int, event_id: str, body: dict[str, Any]) -> dict[str, Any]:
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    return service.events().update(calendarId="primary", eventId=event_id, body=body).execute()


def patch_event(user_id: int, event_id: str, body: dict[str, Any]) -> dict[str, Any]:
    import logging
    logging.info("patch_event body: %s", body)
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    return service.events().patch(calendarId="primary", eventId=event_id, body=body).execute()


def delete_event(user_id: int, event_id: str) -> None:
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    service.events().delete(calendarId="primary", eventId=event_id).execute()


def _already_synced(user_id: int, gcal_id: str) -> bool:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT 1 FROM events WHERE user_id = %s AND gcal_event_id = %s LIMIT 1",
            (user_id, gcal_id),
        )
        return cursor.fetchone() is not None


def sync_events(user_id: int) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=30)).isoformat()
    time_max = (now + timedelta(days=180)).isoformat()

    items = list_events(user_id, time_min=time_min, time_max=time_max, max_results=250)

    imported = 0
    skipped = 0
    for item in items:
        gcal_id: str = item.get("id", "")
        if not gcal_id or _already_synced(user_id, gcal_id):
            skipped += 1
            continue

        title: str = item.get("summary") or "(sin título)"
        description: str | None = item.get("description")
        location: str | None = item.get("location")

        start = item.get("start", {})
        if start.get("dateTime"):
            dt = datetime.fromisoformat(start["dateTime"])
            event_date = dt.date().isoformat()
            event_time = dt.strftime("%H:%M:%S")
        else:
            event_date = start.get("date", now.date().isoformat())
            event_time = None

        db_create_event(
            user_id=user_id,
            title=title[:190],
            description=description,
            event_date=event_date,
            event_time=event_time,
            location=location,
            event_type="google_calendar",
            gcal_event_id=gcal_id,
        )
        imported += 1

    return {"imported": imported, "skipped": skipped}
