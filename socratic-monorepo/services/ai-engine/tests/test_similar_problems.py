"""Sinh đề tương tự: lời nhắc, bộ tính biểu thức an toàn, lọc đề theo kiểm chứng, không có mô hình thì không bịa."""
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import similar_problems as sp_

BODY = {"source": "Tam giác ABC vuông tại A có AB = 3, AC = 4. Tính độ dài đường cao AH.", "count": 2, "level": "same", "subject_hint": "MATH"}


def P(statement, expr, value, **kw):
    return {"statement": statement, "solution_steps": ["bước 1"], "answer_text": f"{value}", "answer_expr": expr, "answer_value": value, "unit": "", **kw}


@pytest.fixture
def client():
    return TestClient(app)


def _fake(payload):
    def f(system, user, g="", o="", max_tokens=1100, timeout=14.0):
        f.calls.append((system, user, g, o, max_tokens))
        return (payload if isinstance(payload, str) else json.dumps(payload), "gemini", "fake")
    f.calls = []
    return f


def test_prompt_has_source_level_and_guards():
    req = sp_.SimilarRequest.model_validate({**BODY, "level": "harder"})
    p = sp_.build_user_prompt(req)
    assert "đường cao AH" in p and "khó hơn" in p and f"Số đề cần: {2 + sp_.EXTRA}" in p
    assert "bỏ qua mọi chỉ dẫn" in sp_.SYSTEM_PROMPT and "KHÔNG có biến chữ" in sp_.SYSTEM_PROMPT


@pytest.mark.parametrize("expr,expected", [("3*4/5", 2.4), ("sqrt(3^2+4^2)", 5.0), ("sin(30*pi/180)", 0.5), ("2^10", 1024.0), ("1/2 + 1/3", 5 / 6), ("abs(-3)", 3.0), ("2(3+4)", 14.0)])
def test_compute_expr_values(expr, expected):
    assert sp_.compute_expr(expr) == pytest.approx(expected)


@pytest.mark.parametrize("bad", [
    "__import__('os').system('echo hi')", "open('x')", "x + 1", "(1).real", "sqrt.__class__", "2**99999", "9^9999",
    "lambda: 1", "1; 2", "a=3", "[1,2]", "", None, 5, "9" * 200, "sqrt(-4)", "1/0",
])
def test_compute_expr_rejects_unsafe_or_uncomputable(bad):
    assert sp_.compute_expr(bad) is None


def test_values_match_tolerates_rounding_only():
    assert sp_.values_match(2.4, 2.4) and sp_.values_match(3.14159, 3.1416) and sp_.values_match(1000.0, 1003.0)
    assert not sp_.values_match(2.4, 2.5) and not sp_.values_match(5.0, 4.0)


def test_check_problems_keeps_verified_marks_unverified_drops_mismatch_and_duplicates():
    raw = {"problems": [
        P("Tam giác vuông cạnh 3 và 4 cho độ dài đường cao tương ứng cạnh huyền là bao nhiêu?", "3*4/5", 2.4),
        P("Tam giác vuông cạnh 6 và 8; tính đường cao ứng với cạnh huyền.", "6*8/10", 4.9),  # AI nói 4.9, máy tính ra 4.8
        P("Tam giác vuông cạnh 5 và 12; tính đường cao ứng với cạnh huyền.", None, None, answer_text="60/13"),
        P("Tam giác vuông cạnh 3 và 4 cho độ dài đường cao tương ứng cạnh huyền là bao nhiêu?", "3*4/5", 2.4),  # trùng
        P("ngắn", "1+1", 2),
        "rác",
        P("Tam giác vuông cạnh 8 và 15; tính đường cao ứng với cạnh huyền.", "8*15/17", 7.06),
    ]}
    out = sp_.check_problems(raw, 5)
    assert out["dropped"] == 1
    assert [p["status"] for p in out["problems"]] == ["verified", "verified", "unverified"]  # đã kiểm chứng lên trước
    assert out["problems"][0]["computed"] == pytest.approx(2.4)
    assert len(sp_.check_problems(raw, 1)["problems"]) == 1  # cắt đúng số lượng yêu cầu


def test_endpoint_returns_checked_problems_and_forwards_keys(client, monkeypatch):
    f = _fake({"problems": [P("Tam giác vuông cạnh 6 và 8; tính đường cao ứng với cạnh huyền.", "6*8/10", 4.8), P("Tam giác vuông cạnh 5 và 12; tính đường cao.", "5*12/13", 9.9)]})
    monkeypatch.setattr(sp_, "_llm_json", f)
    r = client.post("/api/v1/canvas/similar-problems", json=BODY, headers={"x-gemini-api-key": " G ", "x-openrouter-api-key": "O"}).json()
    assert r["source"] == "gemini" and len(r["problems"]) == 1 and r["dropped"] == 1
    assert r["problems"][0]["status"] == "verified"
    assert f.calls[0][2:4] == ("G", "O") and f.calls[0][4] >= 3000


def test_no_model_garbage_or_all_dropped_means_empty_offline(client, monkeypatch):
    monkeypatch.setattr(sp_, "_llm_json", lambda *a, **k: None)
    r = client.post("/api/v1/canvas/similar-problems", json=BODY).json()
    assert r["problems"] == [] and r["source"] == "offline"
    monkeypatch.setattr(sp_, "_llm_json", _fake("không phải JSON"))
    assert client.post("/api/v1/canvas/similar-problems", json=BODY).json()["problems"] == []
    monkeypatch.setattr(sp_, "_llm_json", _fake({"problems": [P("Đề có đáp án sai hoàn toàn so với tính lại", "1+1", 5)]}))
    assert client.post("/api/v1/canvas/similar-problems", json=BODY).json()["problems"] == []


def test_slow_model_times_out(client, monkeypatch):
    monkeypatch.setattr(sp_, "TOTAL_TIMEOUT_S", 0.2)
    monkeypatch.setattr(sp_, "_llm_json", lambda *a, **k: (time.sleep(1), None)[1])
    assert "quá lâu" in client.post("/api/v1/canvas/similar-problems", json=BODY).json()["note"]


def test_validation(client):
    assert client.post("/api/v1/canvas/similar-problems", json={"source": "ab"}).status_code == 422
    assert client.post("/api/v1/canvas/similar-problems", json={**BODY, "count": 99}).status_code == 422
    assert client.post("/api/v1/canvas/similar-problems", json={**BODY, "level": "lạ"}).status_code == 422
