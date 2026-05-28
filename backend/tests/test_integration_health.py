from __future__ import annotations
import pytest

class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self, client):
        response = client.get("/health")
        assert response.json()["status"] == "ok"

    def test_health_content_type_is_json(self, client):
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]

    def test_not_found_returns_404(self, client):
        response = client.get("/ruta/que/no/existe")
        assert response.status_code == 404

    def test_docs_without_auth_returns_401(self, client):
        response = client.get("/docs")
        assert response.status_code == 401

    def test_openapi_without_auth_returns_401(self, client):
        response = client.get("/openapi.json")
        assert response.status_code == 401

    def test_docs_with_correct_auth_returns_200(self, client):
        response = client.get("/docs", auth=("admin", "password"))
        assert response.status_code == 200

    def test_docs_with_wrong_auth_returns_401(self, client):
        response = client.get("/docs", auth=("admin", "wrong"))
        assert response.status_code == 401
