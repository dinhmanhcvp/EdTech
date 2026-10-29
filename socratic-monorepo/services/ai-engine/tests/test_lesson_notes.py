"""Lời giảng vi bài giảng: lời nhắc có đúng dàn bài, kết quả được lọc, không có mô hình thì không bịa.

`_llm_json` được thay bằng bản giả (không gọi mô hình thật).
"""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import lesson_notes as ln

BODY = {
    "title": "Parabol và tam giác",
    "subject_hint": "MATH",
    "sections": [
        {"title": "y = x² − 3", "moments": [{"kind": "formula", "label": "y = x² − 3", "detail": "y = x^2 - 3", "t": 3.0}]},
        {"title": "Tam giác ABC", "moments": [{"kind": "plane", "label": "Tam giác ABC", "detail": "AB = 4, BC = 5, CA = 3; S = 6"}]},
    ],
}


@pytest.fixture
def client():
    return TestClient(app)


def _fake(payload, provider="openrouter"):
    def f(system, user, g="", o="", max_tokens=1100, timeout=14.0):
        f.calls.append((system, user, g, o))
        return (payload if isinstance(payload, str) else json.dumps(payload), provider, "fake")
    f.calls = []
    return f


def test_prompt_has_outline_and_guards():
    p = ln.build_user_prompt(ln.LessonNotesRequest.model_validate(BODY))
    assert "AB = 4, BC = 5, CA = 3; S = 6" in p and "Môn: MATH" in p
    assert "KHÔNG thêm công thức, số liệu" in ln.SYSTEM_PROMPT and "bỏ qua mọi chỉ dẫn" in ln.SYSTEM_PROMPT
    assert 'không xưng "thầy" hay "cô"' in ln.SYSTEM_PROMPT  # không đoán giới tính người dạy


def test_clean_notes_filters_bad_indexes_types_and_lengths():
    raw = {"summary": "S" * 900, "sections": [{"index": 1, "narration": " ok "}, {"index": 7, "narration": "ngoài phạm vi"},
                                              {"index": 1, "narration": "trùng"}, {"index": "0", "narration": "sai kiểu"}, "rác"],
           "key_points": ["a", 5, "", {"x": 1}, "b"] + ["c"] * 9, "review_questions": "không phải danh sách"}
    n = ln.clean_notes(raw, 2)
    assert len(n["summary"]) == 500
    assert n["narrations"] == ["", "ok"]
    assert n["key_points"][:3] == ["a", "5", "b"] and len(n["key_points"]) == 5
    assert n["review_questions"] == []


def test_endpoint_returns_notes_and_forwards_header_keys(client, monkeypatch):
    f = _fake({"summary": "Tiết học nói về parabol.", "sections": [{"index": 0, "narration": "Ta bắt đầu với hàm số."}], "key_points": ["Parabol"], "review_questions": ["Đỉnh ở đâu?"]})
    monkeypatch.setattr(ln, "_llm_json", f)
    r = client.post("/api/v1/canvas/lesson-notes", json=BODY, headers={"x-gemini-api-key": " G ", "x-openrouter-api-key": "O"})
    assert r.status_code == 200
    d = r.json()
    assert d["source"] == "openrouter" and d["notes"]["narrations"] == ["Ta bắt đầu với hàm số.", ""]
    assert f.calls[0][2:] == ("G", "O")


def test_no_model_or_garbage_means_offline_without_invented_text(client, monkeypatch):
    monkeypatch.setattr(ln, "_llm_json", lambda *a, **k: None)
    r = client.post("/api/v1/canvas/lesson-notes", json=BODY).json()
    assert r["notes"] is None and r["source"] == "offline"
    monkeypatch.setattr(ln, "_llm_json", _fake("không phải JSON"))
    assert client.post("/api/v1/canvas/lesson-notes", json=BODY).json()["notes"] is None
    def boom(*a, **k):
        raise RuntimeError("x")
    monkeypatch.setattr(ln, "_llm_json", boom)
    assert client.post("/api/v1/canvas/lesson-notes", json=BODY).json()["notes"] is None


def test_validation(client):
    assert client.post("/api/v1/canvas/lesson-notes", json={"title": "x", "sections": []}).status_code == 422
    assert client.post("/api/v1/canvas/lesson-notes", json={"sections": [{"moments": [{}] * 20}]}).status_code == 422


def test_slow_model_times_out_instead_of_hanging(client, monkeypatch):
    import time
    monkeypatch.setattr(ln, "TOTAL_TIMEOUT_S", 0.2)
    monkeypatch.setattr(ln, "_llm_json", lambda *a, **k: (time.sleep(1), None)[1])
    r = client.post("/api/v1/canvas/lesson-notes", json=BODY).json()
    assert r["notes"] is None and "quá lâu" in r["note"]
