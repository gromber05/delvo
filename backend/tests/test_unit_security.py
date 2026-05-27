from __future__ import annotations

import time
from datetime import timedelta

import jwt
import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)

class TestPasswordHashing:
    def test_hash_returns_string(self):
        h = hash_password("contraseña_segura123")
        assert isinstance(h, str)

    def test_hash_is_not_plaintext(self):
        pwd = "mi_clave_secreta"
        h = hash_password(pwd)
        assert pwd not in h

    def test_verify_correct_password(self):
        pwd = "Correcto123!"
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True

    def test_verify_wrong_password(self):
        h = hash_password("Correcto123!")
        assert verify_password("Incorrecto456", h) is False

    def test_verify_empty_password_against_hash(self):
        h = hash_password("algo")
        assert verify_password("", h) is False

    def test_two_hashes_of_same_password_differ(self):
        pwd = "misma_clave"
        h1 = hash_password(pwd)
        h2 = hash_password(pwd)
        assert h1 != h2

    def test_verify_both_salts_work(self):
        pwd = "misma_clave"
        h1 = hash_password(pwd)
        h2 = hash_password(pwd)
        assert verify_password(pwd, h1) is True
        assert verify_password(pwd, h2) is True

    def test_hash_unicode_password(self):
        pwd = "contraseña_ñoña_🔑"
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True

    def test_hash_long_password(self):
        pwd = "a" * 128
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True


class TestAccessToken:
    def test_create_returns_string(self):
        token = create_access_token(subject="user@test.io", user_id=1)
        assert isinstance(token, str)

    def test_decode_contains_sub(self):
        token = create_access_token(subject="user@test.io", user_id=42)
        payload = decode_access_token(token)
        assert payload["sub"] == "user@test.io"

    def test_decode_contains_uid(self):
        token = create_access_token(subject="user@test.io", user_id=42)
        payload = decode_access_token(token)
        assert payload["uid"] == 42

    def test_decode_contains_exp(self):
        token = create_access_token(subject="user@test.io", user_id=1)
        payload = decode_access_token(token)
        assert "exp" in payload

    def test_decode_contains_iat(self):
        token = create_access_token(subject="user@test.io", user_id=1)
        payload = decode_access_token(token)
        assert "iat" in payload

    def test_custom_expiry_minutes(self):
        """Un token con 1 minuto de expiración debe decodificarse correctamente."""
        token = create_access_token(subject="u@t.io", user_id=1, expires_minutes=1)
        payload = decode_access_token(token)
        assert payload["uid"] == 1

    def test_expired_token_raises(self):
        token = create_access_token(subject="u@t.io", user_id=1, expires_minutes=-1)
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_access_token(token)

    def test_invalid_token_raises(self):
        with pytest.raises(jwt.InvalidTokenError):
            decode_access_token("esto.no.es.un.token")

    def test_wrong_secret_raises(self, monkeypatch):
        token = create_access_token(subject="u@t.io", user_id=1)
        monkeypatch.setenv("JWT_SECRET_KEY", "otra-clave-secreta")
        with pytest.raises(jwt.InvalidSignatureError):
            decode_access_token(token)

    def test_tampered_token_raises(self):
        token = create_access_token(subject="u@t.io", user_id=1)
        tampered = token[:-4] + "XXXX"
        with pytest.raises(jwt.InvalidTokenError):
            decode_access_token(tampered)

class TestRefreshToken:
    def test_create_returns_string(self):
        token = create_refresh_token(subject="user@test.io", user_id=1)
        assert isinstance(token, str)

    def test_decode_typ_is_refresh(self):
        token = create_refresh_token(subject="user@test.io", user_id=7)
        payload = decode_refresh_token(token)
        assert payload["typ"] == "refresh"

    def test_decode_contains_uid(self):
        token = create_refresh_token(subject="user@test.io", user_id=7)
        payload = decode_refresh_token(token)
        assert payload["uid"] == 7

    def test_decode_contains_sub(self):
        token = create_refresh_token(subject="alice@test.io", user_id=2)
        payload = decode_refresh_token(token)
        assert payload["sub"] == "alice@test.io"

    def test_access_token_rejected_as_refresh(self):
        """Un access token no debe pasar como refresh token."""
        access = create_access_token(subject="u@t.io", user_id=1)
        with pytest.raises(jwt.InvalidTokenError):
            decode_refresh_token(access)

    def test_expired_refresh_token_raises(self, monkeypatch):
        """Un refresh token con expiración negativa debe levantar excepción."""
        monkeypatch.setenv("JWT_REFRESH_EXPIRE_DAYS", "-1")
        token = create_refresh_token(subject="u@t.io", user_id=1)
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_refresh_token(token)

    def test_invalid_refresh_token_raises(self):
        with pytest.raises(jwt.InvalidTokenError):
            decode_refresh_token("no.es.valido")
