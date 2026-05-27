from __future__ import annotations

from unittest.mock import patch, MagicMock

import pytest

from app.core.security import create_access_token, hash_password

BASE = "/api/v1/assistant"


def _token(uid: int = 1, email: str = "test@delvo.io") -> str:
    return create_access_token(subject=email, user_id=uid)


def _headers(uid: int = 1) -> dict:
    return {"Authorization": f"Bearer {_token(uid)}"}


def _mock_user(uid: int = 1) -> dict:
    return {
        "id": uid, "name": "Test", "email": "test@delvo.io",
        "password_hash": hash_password("pw"), "role": "user",
        "google_email": None, "profile_photo_base64": None,
        "created_at": None, "updated_at": None,
    }


def _mock_chat_response():
    from app.api.v1.endpoints.assistant.schemas import ChatResponse
    return ChatResponse(
        intent="general",
        data={},
        message="Hola, soy Stella. ¿En qué puedo ayudarte?",
        context_used=[],
    )


class TestChatEndpoint:

    def test_chat_without_auth_returns_response(self, client):
        """El chat funciona sin autenticación (usuario anónimo)."""
        with patch("app.api.v1.endpoints.assistant.chat_endpoint.assistant_chat",
                   return_value=_mock_chat_response()):
            resp = client.post(f"{BASE}/chat", json={"message": "Hola"})
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_chat_returns_intent(self, client):
        with patch("app.api.v1.endpoints.assistant.chat_endpoint.assistant_chat",
                   return_value=_mock_chat_response()):
            resp = client.post(f"{BASE}/chat", json={"message": "Hola"})
        assert resp.json()["intent"] == "general"

    def test_chat_empty_message_returns_422(self, client):
        resp = client.post(f"{BASE}/chat", json={"message": ""})
        assert resp.status_code == 422

    def test_chat_missing_message_returns_422(self, client):
        resp = client.post(f"{BASE}/chat", json={})
        assert resp.status_code == 422

    def test_chat_authenticated_saves_conversation(self, client):
        """Con autenticación el endpoint debe devolver conversation_id."""
        mock_response = _mock_chat_response()
        mock_conv = {"id": 7, "user_id": 1, "title": "Hola"}

        with (
            patch("app.api.v1.endpoints.assistant.chat_endpoint.assistant_chat",
                  return_value=mock_response),
            # El token real se decodifica con la clave de test; solo hay que
            # mockear get_user_by_id en el módulo dependencies donde está importado
            patch("app.api.v1.endpoints.assistant.dependencies.get_user_by_id",
                  return_value=_mock_user()),
            patch("app.api.v1.endpoints.assistant.chat_endpoint.get_conversation",
                  return_value=None),
            patch("app.api.v1.endpoints.assistant.chat_endpoint.create_conversation",
                  return_value=mock_conv),
            patch("app.api.v1.endpoints.assistant.chat_endpoint.add_message",
                  return_value=None),
            patch("app.api.v1.endpoints.assistant.chat_endpoint.touch_conversation",
                  return_value=None),
        ):
            resp = client.post(
                f"{BASE}/chat",
                json={"message": "Hola"},
                headers=_headers(),
            )
        assert resp.status_code == 200
        assert resp.json()["conversation_id"] == 7

    def test_chat_with_history(self, client):
        """El endpoint acepta historial previo de mensajes."""
        with patch("app.api.v1.endpoints.assistant.chat_endpoint.assistant_chat",
                   return_value=_mock_chat_response()):
            resp = client.post(f"{BASE}/chat", json={
                "message": "¿Qué tareas tengo?",
                "history": [
                    {"role": "user", "content": "Hola"},
                    {"role": "assistant", "content": "¡Hola! ¿En qué te ayudo?"},
                ],
            })
        assert resp.status_code == 200

    def test_chat_with_use_rag_false(self, client):
        """Se puede desactivar el RAG."""
        with patch("app.api.v1.endpoints.assistant.chat_endpoint.assistant_chat",
                   return_value=_mock_chat_response()):
            resp = client.post(f"{BASE}/chat", json={
                "message": "Hola",
                "use_rag": False,
            })
        assert resp.status_code == 200
