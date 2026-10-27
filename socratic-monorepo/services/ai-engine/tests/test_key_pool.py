"""
Kiểm thử Bể Khóa Đa Tầng (Gemini Multi-Key Rotation + OpenRouter Failover)
--------------------------------------------------------------------------
Xác minh:
1. Gom và tách nhiều khóa API từ chuỗi (phân cách bởi dấu phẩy, khoảng trắng, xuống dòng).
2. Xoay vòng (Round-Robin) giữa các khóa đang khỏe mạnh.
3. Khi 1 khóa gặp Rate Limit (429) hoặc Quota Exceeded -> cách ly (cooldown) ngay và tự động chuyển sang khóa tiếp theo.
4. Dự phòng thông minh sang OpenRouter khi toàn bộ khóa Gemini bận hoặc hết hạn mức.
5. Endpoint /api/v1/canvas/settings/keys và /health báo cáo chính xác số lượng khóa active.
"""

import base64
import io
import json
import os
import sys
import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from llm.key_pool import (
    KeyPoolManager,
    _split_keys,
    mask_api_key,
    classify_error_cooldown,
    call_openrouter_vision,
    call_openrouter_text,
)


@pytest.fixture
def client():
    return TestClient(app)


def _png_b64() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (32, 16), "white").save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def test_split_and_mask_keys():
    raw = "key1, key2\nkey3;key4   key5"
    keys = _split_keys(raw)
    assert keys == ["key1", "key2", "key3", "key4", "key5"]
    assert mask_api_key("AIzaSy1234567890abcdef") == "AIzaSy...cdef"
    assert mask_api_key("short") == "sh***"


def test_key_pool_round_robin_and_rate_limit_cooldown():
    mgr = KeyPoolManager(read_env=False)
    mgr.add_runtime_keys(gemini_keys=["keyA", "keyB", "keyC"], replace=True)

    # 1. Round-robin xoay vòng
    k1 = mgr.get_ordered_keys("gemini")
    k2 = mgr.get_ordered_keys("gemini")
    k3 = mgr.get_ordered_keys("gemini")
    assert len(k1) == 3
    assert k1[0] == "keyA"
    assert k2[0] == "keyB"
    assert k3[0] == "keyC"

    # 2. Giả lập keyB gặp 429 Rate Limit
    reason, cd = mgr.mark_failure("gemini", "keyB", RuntimeError("429 Too Many Requests: quota exceeded"))
    assert reason == "quota_exhausted"
    assert cd > 0

    # KeyB phải bị loại khỏi danh sách available
    avail = mgr.get_ordered_keys("gemini")
    assert "keyB" not in avail
    assert set(avail) == {"keyA", "keyC"}

    # 3. Khi keyA thành công
    mgr.mark_success("gemini", "keyA")
    st = mgr.get_status()
    assert st["gemini"]["total"] == 3
    assert st["gemini"]["active"] == 2
    assert st["gemini"]["cooling_down"] == 1


def test_openrouter_vision_failover_mocked():
    mgr = KeyPoolManager(read_env=False)
    mgr.add_runtime_keys(openrouter_keys=["sk-or-test1", "sk-or-test2"], replace=True)

    class MockHTTPResponse:
        def __init__(self, body_dict):
            self.body_bytes = json.dumps(body_dict).encode("utf-8")
        def read(self):
            return self.body_bytes
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    calls = []
    def fake_opener(req, timeout=10.0):
        auth = req.headers.get("Authorization", "")
        calls.append(auth)
        # Giả lập phản hồi thành công từ OpenRouter Vision
        return MockHTTPResponse({
            "choices": [{
                "message": {
                    "content": '{"templateId":"MATH_FUNC_2D","recognizedLatex":"y = 2x + 1","confidence":0.95}'
                }
            }]
        })

    res = call_openrouter_vision(
        prompt="Classify this",
        image_bytes=b"fake_image_bytes",
        pool=mgr,
        opener=fake_opener,
    )
    assert res is not None
    raw_text, model_used = res
    assert "MATH_FUNC_2D" in raw_text
    assert "google/gemini" in model_used or "qwen" in model_used
    assert len(calls) == 1
    assert "sk-or-test1" in calls[0]


def test_openrouter_text_call_mocked():
    mgr = KeyPoolManager(read_env=False)
    mgr.add_runtime_keys(openrouter_keys=["sk-or-text-key"], replace=True)

    class MockHTTPResponse:
        def __init__(self, text):
            self.body_bytes = json.dumps({"choices": [{"message": {"content": text}}]}).encode("utf-8")
        def read(self):
            return self.body_bytes
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    def fake_opener(req, timeout=8.0):
        return MockHTTPResponse("Em hãy xem lại định luật bảo toàn khối lượng nhé!")

    res = call_openrouter_text(
        system_prompt="Socratic Tutor",
        user_prompt="Bài này làm sao?",
        pool=mgr,
        opener=fake_opener,
    )
    assert res is not None
    text, model = res
    assert "bảo toàn khối lượng" in text


def test_settings_keys_endpoint_multi_key_and_health_integration(client, monkeypatch):
    from llm.key_pool import global_key_pool
    # Cấu hình cùng lúc nhiều khóa Gemini và OpenRouter
    resp = client.post(
        "/api/v1/canvas/settings/keys",
        json={
            "gemini_api_keys": "AIzaSyKeyA, AIzaSyKeyB, AIzaSyKeyC",
            "openrouter_api_keys": "sk-or-v1-primary, sk-or-v1-secondary",
            "replace": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["has_key"] is True
    assert data["pool"]["gemini"]["total"] >= 3
    assert data["pool"]["openrouter"]["total"] >= 2

    # Kiểm tra GET /settings/keys
    get_resp = client.get("/api/v1/canvas/settings/keys")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["has_key"] is True
    assert get_data["pool"]["gemini"]["total"] >= 3

    # Kiểm tra /health báo cáo chính xác key_pool
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    h_data = health_resp.json()
    assert h_data["runtime"]["gemini_configured"] is True
    assert h_data["runtime"]["key_pool"]["gemini_total"] >= 3
    assert h_data["runtime"]["key_pool"]["openrouter_total"] >= 2
    assert h_data["runtime"]["key_pool"]["total_active"] >= 5

    # Dọn dẹp trạng thái sau bài kiểm thử
    global_key_pool.clear_runtime_keys()


def test_recognize_ink_auto_fails_over_to_openrouter(client, monkeypatch):
    from routers import recognize_ink as ri

    # Giả lập Gemini bị lỗi toàn bộ (ví dụ: chạm 429 trên tất cả các key Gemini)
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: None)

    # Giả lập OpenRouter nhận được kết quả hợp lệ
    def fake_openrouter(image_bytes, hint, key=""):
        return {
            "lines": [{"text": "E = mc^2", "latex": "E = mc^{2}", "confidence": 0.95}],
            "text": "E = mc^2",
            "latex": "E = mc^{2}",
            "confidence": 0.95,
            "alternatives": [],
            "detected_intent": "VISUALIZE",
            "intent_confidence": 0.95,
            "intent_reason": "Công thức năng lượng",
            "model": "google/gemini-2.0-flash-exp:free",
            "engine": "openrouter",
        }

    monkeypatch.setattr(ri, "recognize_with_openrouter", fake_openrouter)

    resp = client.post(
        "/api/v1/canvas/recognize-ink",
        json={
            "image_base64": _png_b64(),
            "hint": "vật lí",
            "gemini_api_key": "gemini-rate-limited-key",
            "openrouter_api_key": "sk-or-v1-backup",
        },
    )
    assert resp.status_code == 200
    j = resp.json()
    # Tự động chuyển sang OpenRouter mà người dùng không gặp lỗi
    assert j["engine"] == "openrouter"
    assert j["latex"] == "E = mc^{2}"
