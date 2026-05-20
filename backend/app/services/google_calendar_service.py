from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.db.postgresql.user_repository import get_user_google_tokens, update_google_tokens

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
        # Accept both offset-aware and naive ISO strings
        try:
            expiry = datetime.fromisoformat(raw)
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
            google_token_expiry=creds.expiry.isoformat() if creds.expiry else None,
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


def delete_event(user_id: int, event_id: str) -> None:
    creds = _build_credentials(user_id)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
