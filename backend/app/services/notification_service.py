from __future__ import annotations

import json
import urllib.request as _urllib
import urllib.error
from typing import Any


_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(
    *,
    token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    """
    Send a push notification via Expo Push API.
    Fire-and-forget — does not raise on failure.
    """
    if not token or not token.startswith("ExponentPushToken["):
        return

    payload = json.dumps({
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
    }).encode()

    req = _urllib.Request(
        _EXPO_PUSH_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        },
        method="POST",
    )
    try:
        with _urllib.urlopen(req, timeout=5):
            pass
    except Exception:
        pass


def send_push_to_many(
    notifications: list[dict[str, Any]],
) -> None:
    """
    Batch send notifications. Each item: {token, title, body, data?}.
    Uses Expo's batch endpoint (up to 100 per call).
    """
    valid = [
        {
            "to": n["token"],
            "title": n["title"],
            "body": n["body"],
            "sound": "default",
            "data": n.get("data", {}),
        }
        for n in notifications
        if n.get("token", "").startswith("ExponentPushToken[")
    ]
    if not valid:
        return

    payload = json.dumps(valid).encode()
    req = _urllib.Request(
        _EXPO_PUSH_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        },
        method="POST",
    )
    try:
        with _urllib.urlopen(req, timeout=10):
            pass
    except Exception:
        pass
