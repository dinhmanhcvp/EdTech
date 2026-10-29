import json

import pytest

URL = "/api/v1/hub/plans/plan-demo-rlc/sections/sec-rlc/suggestions"
GOOD_POLL = {"type": "poll", "question": "U_R = 6 V, U_L = 8 V. U = ?", "options": ["14 V", "10 V"], "correct": 1}
RAW = {"suggestions": [
    {"type": "add_question", "rationale": "Nhiều em cộng độ lớn", "item": GOOD_POLL},
    {"type": "reorder", "rationale": "Thiếu id", "order": ["it-rlc-f1"]},
    {"type": "add_example", "rationale": "Sai loại", "item": GOOD_POLL},
    {"type": "add_note", "rationale": "Nhắc lớp", "note": "Nhắc vẽ giản đồ trước khi tính."},
]}


@pytest.fixture
def llm(monkeypatch):
    import hub.suggest as sg
    calls = {"user": None, "reply": (json.dumps(RAW, ensure_ascii=False), "gemini", "gemini-test")}

    def fake(system, user, *a, **k):
        calls["user"] = user
        if isinstance(calls["reply"], Exception):
            raise calls["reply"]
        return calls["reply"]

    monkeypatch.setattr(sg, "_llm_json", fake)
    return calls


def _suggest(client, h):
    r = client.post(URL, json={"classId": "12a1"}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def test_suggest_validates_and_drops_bad_items(client, teacher_headers, llm):
    data = _suggest(client, teacher_headers(client))
    assert data["source"] == "gemini"
    assert [s["type"] for s in data["suggestions"]] == ["add_question", "add_note"]
    assert all(s["id"].startswith("sg-") for s in data["suggestions"])
    assert data["suggestions"][0]["item"]["id"].startswith("it-")


def test_suggest_prompt_has_no_answer_keys(client, teacher_headers, llm):
    _suggest(client, teacher_headers(client))
    assert "U = 100" not in llm["user"] and '"correct"' not in llm["user"]


@pytest.mark.parametrize("reply", [None, ("không phải json", "gemini", "m"), RuntimeError("boom")])
def test_suggest_offline(client, teacher_headers, llm, reply):
    llm["reply"] = reply
    data = _suggest(client, teacher_headers(client))
    assert data["suggestions"] == [] and data["source"] == "offline" and data["note"] == "AI chưa sẵn sàng."


def test_apply_creates_new_version_with_reason(client, teacher_headers, llm):
    from hub.db import connect
    h = teacher_headers(client)
    sg = _suggest(client, h)["suggestions"][0]
    r = client.post(f"/api/v1/hub/plans/plan-demo-rlc/suggestions/{sg['id']}/apply", headers=h)
    assert r.status_code == 200 and r.json()["version"] == 2
    items = r.json()["body"]["sections"][0]["items"]
    assert items[-1]["id"] == sg["item"]["id"] and items[-1]["correct"] == 1
    with connect() as conn:
        assert conn.execute("SELECT reason FROM teaching_plan_versions WHERE plan_id='plan-demo-rlc' AND version=2").fetchone()[0] == f"suggestion:{sg['id']}"
    assert client.post(f"/api/v1/hub/plans/plan-demo-rlc/suggestions/{sg['id']}/apply", headers=h).status_code == 404


def test_apply_add_note_appends_board_context(client, teacher_headers, llm):
    h = teacher_headers(client)
    note = _suggest(client, h)["suggestions"][1]
    body = client.post(f"/api/v1/hub/plans/plan-demo-rlc/suggestions/{note['id']}/apply", headers=h).json()["body"]
    assert body["boardContext"].endswith("[Cộng vector trong mạch RLC] Nhắc vẽ giản đồ trước khi tính.")


def test_apply_expired_404(client, teacher_headers, llm, monkeypatch):
    import time
    from hub import clock
    h = teacher_headers(client)
    sg = _suggest(client, h)["suggestions"][0]
    base = time.time()
    monkeypatch.setattr(clock, "now", lambda: base + 3601)
    assert client.post(f"/api/v1/hub/plans/plan-demo-rlc/suggestions/{sg['id']}/apply", headers=h).status_code == 404


def test_reorder_suggestion_applies(client, teacher_headers, llm):
    order = ["it-rlc-q1", "it-rlc-f1", "it-rlc-p1", "it-rlc-s1"]
    llm["reply"] = (json.dumps({"suggestions": [{"type": "reorder", "rationale": "Hỏi trước", "order": order}]}), "openrouter", "m")
    h = teacher_headers(client)
    sg = _suggest(client, h)["suggestions"][0]
    body = client.post(f"/api/v1/hub/plans/plan-demo-rlc/suggestions/{sg['id']}/apply", headers=h).json()["body"]
    assert [i["id"] for i in body["sections"][0]["items"]] == order
