"""Bảo vệ bản triển khai công khai: giới hạn tần suất, khóa quản trị, khởi động nóng."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import deploy_guard
from deploy_guard import RateLimitMiddleware, admin_ok


def make_app(monkeypatch, env="production", limit=3):
    monkeypatch.setenv("APP_ENV", env)
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, limit=limit, window=60, prefixes=("/api/v1/canvas/recognize-ink",))

    @app.post("/api/v1/canvas/recognize-ink")
    def ink():
        return {"ok": True}

    @app.post("/api/v1/other")
    def other():
        return {"ok": True}

    @app.get("/api/v1/canvas/recognize-ink")
    def ink_get():
        return {"ok": True}

    return TestClient(app)


def test_rate_limit_blocks_after_limit_with_retry_after(monkeypatch):
    c = make_app(monkeypatch)
    for _ in range(3):
        assert c.post("/api/v1/canvas/recognize-ink").status_code == 200
    r = c.post("/api/v1/canvas/recognize-ink")
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) >= 1
    assert "Quá nhiều" in r.json()["detail"]


def test_only_listed_post_endpoints_are_limited(monkeypatch):
    c = make_app(monkeypatch)
    for _ in range(10):
        assert c.post("/api/v1/other").status_code == 200
        assert c.get("/api/v1/canvas/recognize-ink").status_code == 200


def test_requests_with_own_key_are_not_counted(monkeypatch):
    c = make_app(monkeypatch)
    for _ in range(10):
        assert c.post("/api/v1/canvas/recognize-ink", headers={"x-gemini-api-key": "AIzaOwnKey"}).status_code == 200


def test_each_ip_has_its_own_budget(monkeypatch):
    c = make_app(monkeypatch)
    for _ in range(3):
        c.post("/api/v1/canvas/recognize-ink", headers={"x-forwarded-for": "1.1.1.1"})
    assert c.post("/api/v1/canvas/recognize-ink", headers={"x-forwarded-for": "1.1.1.1"}).status_code == 429
    assert c.post("/api/v1/canvas/recognize-ink", headers={"x-forwarded-for": "2.2.2.2, 10.0.0.1"}).status_code == 200


def test_disabled_outside_production(monkeypatch):
    c = make_app(monkeypatch, env="local")
    for _ in range(10):
        assert c.post("/api/v1/canvas/recognize-ink").status_code == 200


def test_admin_token_guard(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    assert admin_ok({"x-admin-token": "anything"}) is False  # chưa đặt ADMIN_TOKEN → tắt hẳn
    monkeypatch.setenv("ADMIN_TOKEN", "s3cret-token")
    assert admin_ok({}) is False
    assert admin_ok({"x-admin-token": "wrong"}) is False
    assert admin_ok({"x-admin-token": "s3cret-token"}) is True
    monkeypatch.setenv("APP_ENV", "local")
    assert admin_ok({}) is True


def test_settings_endpoint_refuses_in_production_without_token(monkeypatch):
    from main import app

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    r = TestClient(app).post("/api/v1/canvas/settings/keys", json={"gemini_api_key": "AIzaSomeKey123456789012345"})
    assert r.status_code == 200
    assert r.json()["status"] == "disabled"


def test_warm_up_never_raises():
    deploy_guard.warm_up()
