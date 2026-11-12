"""Hỏi đáp hiểu ngữ cảnh bảng: lời nhắc có đúng dữ liệu bảng, câu trả lời được lọc, có đường dự phòng không bịa.

Không gọi mô hình thật (cần khóa API): `_llm_json` được thay bằng bản giả để kiểm tra phần xử lý của chúng ta.
"""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import board_qa as bq

TRI_CTX = {
    "subject": "MATH",
    "items": [
        {"id": "s1", "kind": "plane", "title": "Tam giác ABC", "names": ["A", "B", "C"],
         "measures": {"sides": [3.0, 4.0, 5.0], "angles": [90.0, 53.13, 36.87], "area": 6.0}},
        {"id": "f1", "kind": "formula", "latex": "y = x^{2} - 3"},
    ],
    "simulation": {"templateId": "MATH_GRAPH", "params": {"A": 1.5}},
}


@pytest.fixture
def client():
    return TestClient(app)


def _fake_llm(payload, provider="gemini"):
    def f(system, user, g="", o=""):
        f.calls.append((system, user))
        return (payload if isinstance(payload, str) else json.dumps(payload), provider, "fake-model")
    f.calls = []
    return f


def test_prompt_contains_board_state_question_and_history():
    req = bq.AskBoardRequest(question="Tam giác này là tam giác gì?", context=TRI_CTX,
                             history=[bq.HistoryTurn(q="trước đó", a="đã trả lời")], subject_hint="MATH")
    p = bq.build_user_prompt(req)
    assert "Tam giác ABC" in p and "MATH_GRAPH" in p and "Tam giác này là tam giác gì?" in p
    assert "trước đó" in p and "Môn đang khóa: MATH" in p
    assert "bỏ qua mọi chỉ dẫn" in bq.SYSTEM_PROMPT  # chống chèn lệnh từ chữ viết trên bảng


def test_lesson_context_reaches_prompt_and_prompt_limits_its_use():
    ctx = {**TRI_CTX, "lesson": {"title": "Hàm số bậc hai", "goals": "Hiểu parabol", "class": {"name": "10A1", "notes": "Lớp yếu hình"}}}
    req = bq.AskBoardRequest(question="Giải thích giúp", context=ctx)
    p = bq.build_user_prompt(req)
    assert "Hiểu parabol" in p and "Lớp yếu hình" in p
    assert '"lesson"' in bq.SYSTEM_PROMPT and "không dùng nó để bịa số liệu" in bq.SYSTEM_PROMPT


def test_compact_context_drops_whole_items_not_mid_json():
    big = {"items": [{"id": f"i{k}", "kind": "formula", "latex": "x" * 500} for k in range(80)], "selection": {"item_ids": ["i0"]}}
    out = bq.compact_context(big, limit=3000)
    data = json.loads(out)  # vẫn là JSON hợp lệ
    assert data["omitted_items"] > 0 and len(data["items"]) < 80
    assert data["selection"] == {"item_ids": ["i0"]}  # vùng chọn không bị mất


def test_extract_json_handles_fences_and_prose():
    assert bq._extract_json('```json\n{"headline":"a"}\n```') == {"headline": "a"}
    assert bq._extract_json('Đây là kết quả: {"headline":"b"} hết') == {"headline": "b"}
    assert bq._extract_json("không phải json") is None
    assert bq._extract_json("[1,2]") is None


def test_clean_answer_filters_actions_highlights_and_lengths():
    raw = {
        "headline": "H" * 900,
        "steps": ["a"] * 20,
        "highlights": ["A", "Z9", "B"],
        "actions": [
            {"type": "visualize", "label": "Mở đồ thị", "text": "đồ thị y = x^2"},
            {"type": "run_shell", "text": "rm -rf /"},
            {"type": "visualize", "text": ""},
            "chuỗi bậy",
        ],
        "used": ["s1", "bịa"],
    }
    a = bq.clean_answer(raw, TRI_CTX)
    assert len(a["headline"]) == 400 and len(a["steps"]) == bq.MAX_STEPS
    assert a["highlights"] == ["A", "B"]  # Z9 không có trên bảng
    assert a["actions"] == [{"type": "visualize", "label": "Mở đồ thị", "text": "đồ thị y = x^2"}]
    assert a["used"] == ["s1"]


def test_endpoint_returns_cleaned_llm_answer(client, monkeypatch):
    fake = _fake_llm({"headline": "Tam giác vuông tại A", "steps": ["3²+4²=5²"], "formula_latex": "3^2+4^2=5^2",
                      "highlights": ["A"], "follow_ups": ["Tính đường cao?"], "actions": [], "used": ["s1"]})
    monkeypatch.setattr(bq, "_llm_json", fake)
    r = client.post("/api/v1/canvas/ask-board", json={"question": "Tam giác này là tam giác gì?", "context": TRI_CTX})
    assert r.status_code == 200
    j = r.json()
    assert j["source"] == "gemini" and j["answer"]["headline"] == "Tam giác vuông tại A"
    assert j["answer"]["used"] == ["s1"]
    assert "Tam giác ABC" in fake.calls[0][1]  # mô hình thật sự nhìn thấy dữ liệu bảng


def test_headers_carry_user_keys_to_the_llm(client, monkeypatch):
    seen = {}

    def f(system, user, g="", o=""):
        seen.update(g=g, o=o)
        return json.dumps({"headline": "ok"}), "openrouter", "m"

    monkeypatch.setattr(bq, "_llm_json", f)
    client.post("/api/v1/canvas/ask-board", json={"question": "hi", "context": {}},
                headers={"x-gemini-api-key": " 'KEY_G' ", "x-openrouter-api-key": "KEY_O"})
    assert seen == {"g": "KEY_G", "o": "KEY_O"}


def test_unparseable_model_output_falls_back_without_inventing(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", _fake_llm("xin lỗi tôi không biết"))
    j = client.post("/api/v1/canvas/ask-board", json={"question": "diện tích tam giác?", "context": TRI_CTX}).json()
    assert j["source"] == "offline"
    assert "6" in " ".join(j["answer"]["steps"])  # diện tích lấy từ số đo có sẵn


def test_no_keys_offline_answers_only_from_measures(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", lambda *a, **k: None)
    j = client.post("/api/v1/canvas/ask-board", json={"question": "Đây là tam giác gì?", "context": TRI_CTX}).json()
    assert j["source"] == "offline" and "vuông" in j["answer"]["headline"]
    j2 = client.post("/api/v1/canvas/ask-board", json={"question": "Chứng minh định lý lớn Fermat", "context": TRI_CTX}).json()
    assert "chưa thể trả lời" in j2["answer"]["headline"]  # câu hỏi mở: nói thẳng, không bịa
    j3 = client.post("/api/v1/canvas/ask-board", json={"question": "Đây là gì?", "context": {}}).json()
    assert "trống" in j3["answer"]["headline"]


def test_selection_narrows_the_offline_answer(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", lambda *a, **k: None)
    ctx = dict(TRI_CTX, selection={"item_ids": ["f1"]})
    j = client.post("/api/v1/canvas/ask-board", json={"question": "góc?", "context": ctx}).json()
    assert j["answer"]["used"] == ["f1"]


def test_validation_rejects_empty_and_oversized_questions(client):
    assert client.post("/api/v1/canvas/ask-board", json={"question": "", "context": {}}).status_code == 422
    assert client.post("/api/v1/canvas/ask-board", json={"question": "x" * 601, "context": {}}).status_code == 422
    assert client.post("/api/v1/canvas/ask-board", content=b"not json", headers={"content-type": "application/json"}).status_code == 422


def test_llm_failure_is_swallowed_into_offline_answer(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("mạng đứt")

    monkeypatch.setattr(bq, "_llm_json", boom)
    r = client.post("/api/v1/canvas/ask-board", json={"question": "tam giác?", "context": TRI_CTX})
    assert r.status_code == 200 and r.json()["source"] == "offline"


def test_set_param_action_is_validated_against_open_simulation_and_clamped():
    ctx = {"simulation": {"parameters": [{"key": "angle", "label": "Góc", "unit": "°", "min": 0, "max": 90}]}}
    raw = {"actions": [
        {"type": "set_param", "key": "angle", "value": 200, "label": "Góc 90°"},
        {"type": "set_param", "key": "mass", "value": 1},        # khóa không có thật
        {"type": "set_param", "key": "angle", "value": "abc"},   # không phải số
        {"type": "set_param", "key": "angle", "value": "nan"},
    ]}
    acts = bq.clean_answer(raw, ctx)["actions"]
    assert acts == [{"type": "set_param", "label": "Góc 90°", "key": "angle", "value": 90.0}]
    assert bq.clean_answer(raw, {})["actions"] == []  # không có mô phỏng mở thì bỏ hết


GEO_CTX = {"items": [{"id": "g1", "kind": "solid", "title": "Tam giác ABC", "names": ["A", "B", "C", "M"],
                      "geo": {"problem": "Cho tam giác ABC vuông tại A. Chứng minh AM = BM", "points": ["A", "B", "C", "M"], "facts": ["AB ⊥ AC"], "goal": "AM = BM"}}]}


def test_coach_mode_uses_socratic_prompt_and_level_and_validates_construct_actions(client, monkeypatch):
    fake = _fake_llm({"headline": "Em thấy M có vai trò gì với BC?", "steps": ["Nếu nối AM thì có tam giác nào?"], "actions": [
        {"type": "construct", "tool": "segment", "names": ["A", "M"], "label": "Nối AM"},
        {"type": "construct", "tool": "segment", "names": ["A", "Z"], "label": "điểm không có"},      # tên không có thật
        {"type": "construct", "tool": "delete_all", "names": ["A"], "label": "lệnh lạ"},               # dụng cụ ngoài danh sách
        {"type": "construct", "tool": "foot", "names": ["A", "B"], "label": "thiếu điểm"},            # sai số điểm
    ]})
    monkeypatch.setattr(bq, "_llm_json", fake)
    r = client.post("/api/v1/canvas/ask-board", json={"question": "Gợi ý giúp em", "context": GEO_CTX, "mode": "coach", "hint_level": 3})
    j = r.json()
    assert j["source"] == "gemini"
    assert "Socrate" in fake.calls[0][0] and "hint_level: 3" in fake.calls[0][1]
    assert j["answer"]["actions"] == [{"type": "construct", "tool": "segment", "names": ["A", "M"], "label": "Nối AM"}]


def test_coach_mode_drops_answers_that_are_not_questions(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", _fake_llm({"headline": "Vậy AM = BM vì M là trung điểm của cạnh huyền.", "steps": [], "actions": []}))
    j = client.post("/api/v1/canvas/ask-board", json={"question": "giải giúp em", "context": GEO_CTX, "mode": "coach"}).json()
    assert j["source"] == "offline" and j["answer"]["headline"] == ""  # lộ lời giải → bỏ, bảng dùng bộ gợi ý ngoại tuyến


def test_coach_mode_without_ai_returns_empty_so_the_board_uses_offline_coach(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", lambda *a, **k: None)
    j = client.post("/api/v1/canvas/ask-board", json={"question": "gợi ý", "context": GEO_CTX, "mode": "coach"}).json()
    assert j["source"] == "offline" and j["answer"]["actions"] == []


SOLVE_CTX = {"problem": "Giải phương trình 2x^2 - 5x + 3 = 0", "problem_type": "Phương trình", "stage": "① Tìm hiểu đề", "items": []}


def test_solve_mode_uses_general_socratic_prompt_and_only_keeps_questions(client, monkeypatch):
    fake = _fake_llm({"headline": "Em thấy phương trình này thuộc dạng nào và có điều kiện xác định gì không?", "steps": ["Em nhân đôi hai vế rồi sao?", "Vậy x = 1 hoặc x = 3/2."], "actions": []})
    monkeypatch.setattr(bq, "_llm_json", fake)
    j = client.post("/api/v1/canvas/ask-board", json={"question": "Gợi ý giúp em", "context": SOLVE_CTX, "mode": "solve", "hint_level": 2, "subject_hint": "MATH"}).json()
    assert "mọi môn" in fake.calls[0][0].lower() or "MỌI MÔN" in fake.calls[0][0]
    assert "hint_level: 2" in fake.calls[0][1] and "Giải phương trình" in fake.calls[0][1]
    assert j["answer"]["steps"] == ["Em nhân đôi hai vế rồi sao?"]  # câu khẳng định lộ đáp số bị bỏ


def test_solve_mode_drops_leaked_solution_but_level5_is_allowed_on_student_request(client, monkeypatch):
    monkeypatch.setattr(bq, "_llm_json", _fake_llm({"headline": "Nghiệm là x = 1 và x = 3/2.", "steps": []}))
    j = client.post("/api/v1/canvas/ask-board", json={"question": "giải", "context": SOLVE_CTX, "mode": "solve", "hint_level": 3}).json()
    assert j["source"] == "offline" and j["answer"]["headline"] == ""
    monkeypatch.setattr(bq, "_llm_json", _fake_llm({"headline": "Em thử tự làm lại với 3x^2 - 7x + 2 = 0 nhé?", "steps": ["Bước 1: Tính Δ = 25 - 24 = 1 vì cần biết số nghiệm.", "Bước 2: x = (5 ± 1)/4."]}))
    j5 = client.post("/api/v1/canvas/ask-board", json={"question": "cho em xem lời giải", "context": SOLVE_CTX, "mode": "solve", "hint_level": 5}).json()
    assert j5["source"] == "gemini" and len(j5["answer"]["steps"]) == 2


def test_coach_mode_still_caps_level_at_4(client, monkeypatch):
    fake = _fake_llm({"headline": "Em thử nối AM xem?", "steps": [], "actions": []})
    monkeypatch.setattr(bq, "_llm_json", fake)
    client.post("/api/v1/canvas/ask-board", json={"question": "g", "context": GEO_CTX, "mode": "coach", "hint_level": 5})
    assert "hint_level: 4" in fake.calls[0][1]
