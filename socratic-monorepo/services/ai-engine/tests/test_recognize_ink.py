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
    monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEYS", raising=False)
    ri.global_key_pool.clear_runtime_keys()
    resp = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "no_key"


def test_endpoint_rejects_missing_image(client):
    assert client.post("/api/v1/canvas/recognize-ink", json={}).status_code == 400


def test_endpoint_returns_normalized_result_with_mock_model(client, monkeypatch):
    monkeypatch.setenv("VISION_PROVIDER", "auto")  # đường Gemini trực tiếp chỉ bật khi yêu cầu
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
    monkeypatch.setattr(ri, "recognize_with_openrouter", lambda *a, **k: None)
    monkeypatch.setattr(ri, "recognize_with_local_onnx", lambda *a, **k: None)
    resp = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()}, headers={"x-gemini-api-key": "k"})
    assert resp.status_code == 503


def test_vision_runs_before_local_even_with_allow_local_onnx(client, monkeypatch):
    """Phân tầng: có khóa Cloud thì Vision trả lời trước; mô hình cục bộ chỉ là dự phòng."""
    monkeypatch.setenv("VISION_PROVIDER", "auto")
    order = []

    def fake_vision(image_bytes, hint, api_key):
        order.append("vision")
        return ri.parse_recognition('{"lines":[{"text":"con lắc kép","latex":"\\text{con lắc kép}","confidence":0.9}]}')

    def fake_local(*a, **k):
        order.append("local")
        return {"lines": [{"text": "x", "latex": "x", "confidence": 0.9}], "text": "x", "latex": "x", "confidence": 0.9, "engine": "local_onnx"}

    monkeypatch.setattr(ri, "recognize_with_gemini", fake_vision)
    monkeypatch.setattr(ri, "recognize_with_local_onnx", fake_local)
    r = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64(), "allow_local_onnx": True}, headers={"x-gemini-api-key": "k"})
    assert r.status_code == 200 and r.json()["engine"] == "gemini"
    assert order == ["vision"]


def test_local_is_fallback_when_vision_fails(client, monkeypatch):
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: None)
    monkeypatch.setattr(ri, "recognize_with_openrouter", lambda *a, **k: None)
    monkeypatch.setattr(
        ri, "recognize_with_local_onnx",
        lambda *a, **k: {"lines": [{"text": "y=x", "latex": "y=x", "confidence": 0.9}], "text": "y=x", "latex": "y=x", "confidence": 0.9, "engine": "local_onnx"},
    )
    r = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()}, headers={"x-gemini-api-key": "k"})
    assert r.status_code == 200 and r.json()["engine"] == "local_onnx"


def test_prepare_image_is_small_grayscale_jpeg():
    from PIL import Image
    import io as _io

    big = Image.new("RGB", (2000, 1000), "white")
    buf = _io.BytesIO()
    big.save(buf, "PNG")
    out = ri.prepare_image(buf.getvalue())
    im = Image.open(_io.BytesIO(out))
    assert im.format == "JPEG" and max(im.size) <= 720 and len(out) < len(buf.getvalue())


def test_result_cache_returns_instantly_for_same_image(monkeypatch):
    calls = {"n": 0}

    def fake_call(image_bytes, hint, api_key, key_offset=0):
        calls["n"] += 1
        return ri.parse_recognition('{"lines":[{"text":"a","latex":"a","confidence":0.9}]}')

    monkeypatch.setattr(ri, "_call_gemini", fake_call)
    ri._cache.clear()
    img = base64.b64decode(_png_b64().split(",")[-1]) if "," in _png_b64()[:64] else base64.b64decode(_png_b64())
    r1 = ri.recognize_with_gemini(img, "", "k")
    r2 = ri.recognize_with_gemini(img, "", "k")
    assert r1["latex"] == "a" and r2.get("cached") is True and calls["n"] == 1


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


def test_local_math_onnx_cleaner_and_offline_recognition(client, monkeypatch):
    from ocr_engine import LocalMathONNXEngine, LOCAL_MATH_ONNX
    import json

    lines, joined = LocalMathONNXEngine.clean_mfr_latex(
        r"\begin{matrix} \boldsymbol { y } = x ^ { 2 } \! - \! 3 \\ x + y = 5 \end{matrix}"
    )
    assert lines == ["y = x^2 - 3", "x + y = 5"]
    assert joined == r"y = x^2 - 3 \\ x + y = 5"

    # Kiểm tra nhận diện offline thực tế bằng mô hình Pix2Text-MFR-1.5 ONNX không cần GEMINI_API_KEY
    if LOCAL_MATH_ONNX and LOCAL_MATH_ONNX.available:
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        # Vẽ công thức đơn giản "1 + 1 = 2" hoặc lấy nét từ fixture
        strokes = [
            {"points": [{"x": 20, "y": 20}, {"x": 20, "y": 80}]},  # 1
            {"points": [{"x": 55, "y": 50}, {"x": 95, "y": 50}]},  # + ngang
            {"points": [{"x": 75, "y": 30}, {"x": 75, "y": 70}]},  # + dọc
            {"points": [{"x": 130, "y": 20}, {"x": 130, "y": 80}]},  # 1
            {"points": [{"x": 165, "y": 42}, {"x": 205, "y": 42}]},  # = trên
            {"points": [{"x": 165, "y": 58}, {"x": 205, "y": 58}]},  # = dưới
        ]
        resp = client.post(
            "/api/v1/canvas/recognize-ink",
            json={
                "image_base64": _png_b64(),
                "raw_strokes_json": json.dumps(strokes),
                "prefer_offline": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["engine"] == "local_onnx"
        assert data["confidence"] >= 0.75
        assert len(data["lines"]) >= 1


def test_vision_provider_openrouter_ignores_gemini_keys(client, monkeypatch):
    """VISION_PROVIDER=openrouter: khóa Gemini bị bỏ qua, Vision chỉ đi qua OpenRouter."""
    monkeypatch.setenv("VISION_PROVIDER", "openrouter")
    called = []
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: called.append("gemini"))
    monkeypatch.setattr(
        ri, "recognize_with_openrouter",
        lambda image_bytes, hint, key="": called.append(("openrouter", key)) or ri.parse_recognition('{"lines":[{"text":"x^2","latex":"x^{2}","confidence":0.9}]}'),
    )
    r = client.post(
        "/api/v1/canvas/recognize-ink",
        json={"image_base64": _png_b64()},
        headers={"x-gemini-api-key": "g-key", "x-openrouter-api-key": "or-key"},
    )
    assert r.status_code == 200 and r.json()["engine"] == "openrouter"
    assert called == [("openrouter", "or-key")]


def test_openrouter_default_models_are_current():
    from llm.key_pool import DEFAULT_OPENROUTER_VISION_MODELS as M
    assert M[0] == "google/gemini-2.5-flash" and "openrouter/free" not in M
    assert any(m.endswith(":free") for m in M[-1:])  # miễn phí chỉ là dự phòng cuối


def test_default_vision_tries_gemini_pool_first(client, monkeypatch):
    """Mặc định (auto): bể khóa Gemini trước; Gemini lỗi mới sang OpenRouter."""
    monkeypatch.delenv("VISION_PROVIDER", raising=False)
    order = []
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: order.append("gemini") or ri.parse_recognition('{"lines":[{"text":"x","latex":"x","confidence":0.9}]}'))
    monkeypatch.setattr(ri, "recognize_with_openrouter", lambda *a, **k: order.append("openrouter"))
    r = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()}, headers={"x-gemini-api-key": "g", "x-openrouter-api-key": "o"})
    assert r.status_code == 200 and r.json()["engine"] == "gemini"
    assert order == ["gemini"]


def test_gemini_failure_falls_back_to_openrouter(client, monkeypatch):
    monkeypatch.delenv("VISION_PROVIDER", raising=False)
    monkeypatch.setattr(ri, "recognize_with_gemini", lambda *a, **k: None)
    monkeypatch.setattr(ri, "recognize_with_openrouter", lambda *a, **k: ri.parse_recognition('{"lines":[{"text":"y","latex":"y","confidence":0.9}]}'))
    r = client.post("/api/v1/canvas/recognize-ink", json={"image_base64": _png_b64()}, headers={"x-gemini-api-key": "g", "x-openrouter-api-key": "o"})
    assert r.status_code == 200 and r.json()["engine"] == "openrouter"
