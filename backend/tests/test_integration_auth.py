"""
Tests de integración de los endpoints de autenticación (/api/v1/auth/*).

Los repositorios psycopg3 se parchean completamente → no se necesita BD.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest

from app.core.security import create_access_token, hash_password

BASE = "/api/v1/auth"

def _mock_user(uid: int = 1, email: str = "test@delvo.io", role: str = "user") -> dict:
    return {
        "id": uid,
        "name": "Test User",
        "email": email,
        "password_hash": hash_password("password123"),
        "role": role,
        "google_email": None,
        "profile_photo_base64": None,
        "created_at": None,
        "updated_at": None,
    }


class TestRegister:
    def test_register_success(self, client):
        user = _mock_user()
        with (
            patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=None),
            patch("app.api.v1.endpoints.auth.create_user", return_value=user),
        ):
            resp = client.post(f"{BASE}/register", json={
                "email": "test@delvo.io",
                "password": "password123",
            })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "test@delvo.io"

    def test_register_duplicate_email_returns_409(self, client):
        with patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=_mock_user()):
            resp = client.post(f"{BASE}/register", json={
                "email": "test@delvo.io",
                "password": "password123",
            })
        assert resp.status_code == 409

    def test_register_short_password_returns_422(self, client):
        resp = client.post(f"{BASE}/register", json={
            "email": "new@delvo.io",
            "password": "short",
        })
        assert resp.status_code == 422

    def test_register_missing_email_returns_422(self, client):
        resp = client.post(f"{BASE}/register", json={"password": "password123"})
        assert resp.status_code == 422

    def test_register_with_name(self, client):
        user = _mock_user()
        user["name"] = "María García"
        with (
            patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=None),
            patch("app.api.v1.endpoints.auth.create_user", return_value=user),
        ):
            resp = client.post(f"{BASE}/register", json={
                "name": "María García",
                "email": "maria@delvo.io",
                "password": "password123",
            })
        assert resp.status_code == 201

class TestLogin:
    def test_login_success(self, client):
        user = _mock_user()
        with patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=user):
            resp = client.post(f"{BASE}/login", json={
                "email": "test@delvo.io",
                "password": "password123",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        user = _mock_user()
        with patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=user):
            resp = client.post(f"{BASE}/login", json={
                "email": "test@delvo.io",
                "password": "wrong_password",
            })
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        with patch("app.api.v1.endpoints.auth.get_user_by_email", return_value=None):
            resp = client.post(f"{BASE}/login", json={
                "email": "noexiste@delvo.io",
                "password": "password123",
            })
        assert resp.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        resp = client.post(f"{BASE}/login", json={"email": "u@t.io"})
        assert resp.status_code == 422

class TestGetMe:

    def test_me_returns_user_data(self, client):
        user = _mock_user()
        token = create_access_token(subject=user["email"], user_id=1)
        with patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user):
            resp = client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "test@delvo.io"

    def test_me_without_token_returns_401(self, client):
        resp = client.get(f"{BASE}/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        resp = client.get(f"{BASE}/me", headers={"Authorization": "Bearer token.invalido.aqui"})
        assert resp.status_code == 401

    def test_me_user_not_found_returns_401(self, client):
        token = create_access_token(subject="ghost@delvo.io", user_id=999)
        with patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=None):
            resp = client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401

class TestRefreshToken:
    def test_refresh_success(self, client):
        from app.core.security import create_refresh_token
        user = _mock_user()
        token = create_refresh_token(subject=user["email"], user_id=1)
        with patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user):
            resp = client.post(f"{BASE}/refresh", json={"refresh_token": token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_invalid_token_returns_401(self, client):
        resp = client.post(f"{BASE}/refresh", json={"refresh_token": "token.invalido"})
        assert resp.status_code == 401

    def test_refresh_access_token_as_refresh_returns_401(self, client):
        access = create_access_token(subject="u@t.io", user_id=1)
        resp = client.post(f"{BASE}/refresh", json={"refresh_token": access})
        assert resp.status_code == 401

class TestDeleteAccount:
    def test_delete_account_success(self, client):
        user = _mock_user()
        token = create_access_token(subject=user["email"], user_id=1)
        with (
            patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user),
            patch("app.api.v1.endpoints.auth.delete_user", return_value=True),
        ):
            resp = client.delete(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_delete_account_without_auth_returns_401(self, client):
        resp = client.delete(f"{BASE}/me")
        assert resp.status_code == 401

class TestChangePassword:

    def test_change_password_success(self, client):
        user = _mock_user()
        token = create_access_token(subject=user["email"], user_id=1)
        current_hash = hash_password("password123")
        with (
            patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user),
            patch("app.api.v1.endpoints.auth.get_user_password_hash", return_value=current_hash),
            patch("app.api.v1.endpoints.auth.update_user_password", return_value=True),
        ):
            resp = client.post(
                f"{BASE}/me/change-password",
                json={"current_password": "password123", "new_password": "nueva_clave_123"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_change_password_wrong_current_returns_400(self, client):
        user = _mock_user()
        token = create_access_token(subject=user["email"], user_id=1)
        current_hash = hash_password("password123")
        with (
            patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user),
            patch("app.api.v1.endpoints.auth.get_user_password_hash", return_value=current_hash),
        ):
            resp = client.post(
                f"{BASE}/me/change-password",
                json={"current_password": "clave_incorrecta", "new_password": "nueva_clave_123"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 400

    def test_change_password_too_short_returns_422(self, client):
        user = _mock_user()
        token = create_access_token(subject=user["email"], user_id=1)
        with patch("app.api.v1.endpoints.auth.get_user_by_id", return_value=user):
            resp = client.post(
                f"{BASE}/me/change-password",
                json={"current_password": "password123", "new_password": "corta"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 422
