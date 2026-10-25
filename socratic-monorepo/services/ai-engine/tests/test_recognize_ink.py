"""Kiểm thử đường nhận dạng chữ viết tay: phân tích câu trả lời mô hình + hành vi endpoint (mô hình được giả lập).

LƯU Ý trung thực: không gọi Gemini thật trong bài kiểm thử (cần khóa API); chỉ kiểm tra phần xử lý của chúng ta.
"""
import base64
import io
import os
import sys

import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import recognize_ink as ri


def _png_b64() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (32, 16), "white").save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@pytest.fixture
def client():
    return TestClient(app)


def test_parse_clean_json():
    raw = '{"lines":[{"text":"y = x^2 - 3","latex":"y = x^{2} - 3","confidence":0.93}],"alternatives":["y = x^2 + 3"]}'
    r = ri.parse_recognition(raw)
    assert r["latex"] == "y = x^{2} - 3"
    assert r["text"] == "y = x^2 - 3"
    assert r["confidence"] == pytest.approx(0.93)
    assert r["alternatives"] == ["y = x^2 + 3"]


def test_parse_strips_markdown_fence_and_dollars():
    raw = 'Đây là kết quả:\n```json\n{"lines":[{"text":"a/b","latex":"$\\\\frac{a}{b}$","confidence":1.4}]}\n```'
    r = ri.parse_recognition(raw)
    assert r["latex"] == "\\frac{a}{b}"
    assert r["confidence"] == 1.0  # bị chặn trong [0, 1]


def test_parse_multiline_joins_with_newline_marker():
    raw = '{"lines":[{"text":"x+y=5","latex":"x+y=5","confidence":0.9},{"text":"x-y=1","latex":"x-y=1","confidence":0.7}]}'
    r = ri.parse_recognition(raw)
    assert r["text"] == "x+y=5\nx-y=1"
    assert r["latex"] == "x+y=5 \\\\ x-y=1"
    assert r["confidence"] == pytest.approx(0.8)


def test_parse_garbage_returns_none():
    assert ri.parse_recognition("") is None
    assert ri.parse_recognition("không có json ở đây") is None
    assert ri.parse_recognition("{lỗi json}") is None


def test_parse_empty_lines_is_valid_empty_result():
    r = ri.parse_recognition('{"lines":[],"alternatives":[]}')
    assert r["lines"] == [] and r["latex"] == ""


def test_endpoint_without_key_is_503_so_client_falls_back(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    resp = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "no_key"


def test_endpoint_rejects_missing_image(client):
    assert client.post("/api/v1/canvas/recognize-ink", json={}).status_code == 400


def test_endpoint_returns_normalized_result_with_mock_model(client, monkeypatch):
    seen = {}

    def fake(image_bytes, hint, api_key):
        seen.update(n=len(image_bytes), hint=hint, key=api_key)
        return ri.parse_recognition('{"lines":[{"text":"E = mc^2","latex":"E = mc^{2}","confidence":0.88}]}')

    monkeypatch.setattr(ri, "recognize_with_gemini", fake)
    resp = client.post(
        "/api/v1/canvas/recognize-ink",
        json={"image_base64": _png_b64(), "hint": "vật lí"},
        headers={"x-gemini-api-key": "test-key"},
    )
    assert resp.status_code == 200
    j = resp.json()
    assert j["engine"] == "gemini" and j["latex"] == "E = mc^{2}"
    assert seen["hint"] == "vật lí" and seen["key"] == "test-key" and seen["n"] > 0


def test_endpoint_model_failure_is_503(client, monkeypatch):
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: None)
    resp = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()}, headers={"x-gemini-api-key": "k"})
    assert resp.status_code == 503


# ---------------------------------------------------------------- prompt biên dịch cho Gemini Vision
def test_vision_prompt_has_disambiguation_and_subject_lock():
    from routers.visualize import build_vision_prompt

    base = build_vision_prompt("v0 = 20 m/s")
    assert "Cross-subject disambiguation" in base and "LOCKED" not in base
    assert "Teacher Hint / Context: v0 = 20 m/s" in base
    locked = build_vision_prompt(None, "biology")
    assert "LOCKED the subject to Sinh học" in locked
    assert "Teacher Hint / Context: None" in locked


def test_vision_prompt_only_uses_registry_template_ids():
    import re
    from routers.visualize import build_vision_prompt, OFFLINE_TEMPLATE_REGISTRY

    ids = set(re.findall(r"\b(?:MATH|PHYS|CHEM|BIO)_[A-Z0-9_]+\b", build_vision_prompt("x", "MATH")))
    assert ids, "prompt phải liệt kê template"
    assert ids <= set(OFFLINE_TEMPLATE_REGISTRY), f"template không có trong Registry: {ids - set(OFFLINE_TEMPLATE_REGISTRY)}"
