"""Giới hạn tần suất từng khóa, cách ly khi hết hạn mức ngày, danh sách model Gemini và cách tắt suy nghĩ."""
import urllib.error

import pytest
from fastapi.testclient import TestClient

from llm import gemini_rest
from llm.key_pool import KeyPoolManager, classify_error_cooldown
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_per_key_rpm_window(monkeypatch):
    monkeypatch.setenv("GEMINI_RPM_PER_KEY", "3")
    pool = KeyPoolManager(read_env=False)
    t = 1000.0
    assert [pool.try_reserve("gemini", "k1", now=t + i) for i in range(4)] == [True, True, True, False]
    assert pool.try_reserve("gemini", "k2", now=t + 5)  # khóa khác không bị ảnh hưởng
    assert pool.usage_last_minute("gemini", "k1", now=t + 5) == 3
    # sau 60 s lượt đầu rơi khỏi cửa sổ trượt
    assert pool.try_reserve("gemini", "k1", now=t + 61)


def test_seconds_until_slot(monkeypatch):
    monkeypatch.setenv("GEMINI_RPM_PER_KEY", "2")
    pool = KeyPoolManager(read_env=False)
    assert pool.seconds_until_slot("gemini", ["a", "b"], now=0) == 0
    for k in ("a", "b"):
        pool.try_reserve("gemini", k, now=10)
        pool.try_reserve("gemini", k, now=20)
    wait = pool.seconds_until_slot("gemini", ["a", "b"], now=30)
    assert 39.9 < wait <= 40.1  # lượt cũ nhất (t = 10) rơi khỏi cửa sổ lúc t = 70
    assert pool.seconds_until_slot("gemini", ["a", "b", "c"], now=30) == 0  # còn khóa c trống


def test_limit_zero_means_unlimited(monkeypatch):
    monkeypatch.setenv("GEMINI_RPM_PER_KEY", "0")
    pool = KeyPoolManager(read_env=False)
    assert all(pool.try_reserve("gemini", "k", now=i) for i in range(200))


def test_daily_quota_cooldown_is_long():
    err = urllib.error.HTTPError("u", 429, "Too Many Requests Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel", None, None)
    reason, cooldown = classify_error_cooldown(err)
    assert reason == "quota_exhausted" and cooldown >= 3600
    minute = urllib.error.HTTPError("u", 429, "Too Many Requests", None, None)
    assert classify_error_cooldown(minute)[0] == "rate_limit"
    assert classify_error_cooldown(minute)[1] < 120


def test_thinking_config_by_model_family():
    assert gemini_rest.thinking_config("gemini-3-flash-preview") == {"thinkingLevel": "minimal"}
    assert gemini_rest.thinking_config("gemini-3.6-flash") == {"thinkingLevel": "minimal"}
    assert gemini_rest.thinking_config("gemini-2.5-flash") == {"thinkingBudget": 0}
    assert gemini_rest.thinking_config("gemini-2.5-flash-lite") is None


def test_default_models_avoid_the_slow_ones(monkeypatch):
    monkeypatch.delenv("GEMINI_VISION_MODELS", raising=False)
    models = gemini_rest.vision_models()
    assert models[0] == "gemini-3-flash-preview"
    assert not any("lite-latest" in m for m in models)
    monkeypatch.setenv("GEMINI_VISION_MODELS", "a, b")
    assert gemini_rest.vision_models() == ["a", "b"]


def test_400_about_thinking_retries_without_it(monkeypatch):
    seen = []

    def fake_post(model, key, payload, timeout):
        seen.append("thinkingConfig" in payload["generationConfig"])
        if len(seen) == 1:
            raise urllib.error.HTTPError("u", 400, "Bad Request Thinking level not supported", None, None)
        return {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}

    monkeypatch.setattr(gemini_rest, "_post", fake_post)
    assert gemini_rest.generate("gemini-3.7-flash", "k", [{"text": "hi"}], 5) == "ok"
    assert seen == [True, False]


def test_tests_never_touch_the_real_env_file(client):
    import os
    real = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    before = open(real, "rb").read() if os.path.exists(real) else None
    client.post("/api/v1/canvas/settings/keys", json={"gemini_api_keys": "AIzaFakeOne, AIzaFakeTwo", "replace": True})
    after = open(real, "rb").read() if os.path.exists(real) else None
    assert before == after
