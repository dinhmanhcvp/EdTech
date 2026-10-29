import json

import pytest

AN = "s-an000001"
MON_W45 = 1793554200.0  # 2026-11-02 00:30 giờ VN (thứ Hai, tuần 2026-W45)
DAY = 86400


@pytest.fixture
def clock_at(monkeypatch):
    from hub import clock
    state = {"t": MON_W45}
    monkeypatch.setattr(clock, "now", lambda: state["t"])
    return lambda t: state.update(t=t)


@pytest.fixture
def llm(monkeypatch):
    import hub.reports as rp
    box = {"reply": None}
    monkeypatch.setattr(rp, "_llm_json", lambda *a, **k: box["reply"])
    return box


def _token(client, h, student=AN):
    students = client.get("/api/v1/hub/classes/12a1/students", headers=h).json()["students"]
    return next(s for s in students if s["id"] == student)["parentToken"]


def _turn(sid, status, request_id, scene="b-rlc"):
    from hub.learning import record_turn
    record_turn(AN, sid, scene, f"{scene}:q1", "ANSWER", status, "x", request_id)


def test_week_of_uses_vietnam_time():
    from hub.reports import week_bounds, week_of
    assert week_of(1793554200.0) == "2026-W45" and week_of(1793550600.0) == "2026-W44"
    start, end = week_bounds("2026-W45")
    assert start == pytest.approx(MON_W45 - 1800) and end - start == 7 * DAY


def test_parent_view_lazily_closes_last_week(client, closed_session, clock_at, llm):
    from hub.db import connect
    h, sid = closed_session["teacherHeaders"], closed_session["sessionId"]
    clock_at(MON_W45 - 2 * DAY); _turn(sid, "VERIFIED_CORRECT", "r1")
    clock_at(MON_W45 + 3600)
    r = client.get(f"/api/v1/hub/parent/{_token(client, h)}/report")
    assert r.status_code == 200
    data = r.json()
    assert data["student"] == {"name": "Nguyễn Văn An", "className": "12A1"}
    assert data["lastWeek"]["week"] == "2026-W44" and data["lastWeek"]["activeDays"] == 1
    assert data["thisWeek"]["week"] == "2026-W45" and data["thisWeek"]["activeDays"] == 0
    client.get(f"/api/v1/hub/parent/{_token(client, h)}/report")
    with connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM parent_reports WHERE student_id=?", (AN,)).fetchone()[0] == 1


def test_no_last_week_before_first_activity(client, closed_session, clock_at, llm):
    h = closed_session["teacherHeaders"]
    assert client.get(f"/api/v1/hub/parent/{_token(client, h)}/report").json()["lastWeek"] is None


def test_parent_report_template_without_ai(client, closed_session, clock_at, llm):
    h, sid = closed_session["teacherHeaders"], closed_session["sessionId"]
    clock_at(MON_W45 - 3 * DAY); _turn(sid, "VERIFIED_INCORRECT", "r1")
    clock_at(MON_W45 - 2 * DAY); _turn(sid, "VERIFIED_INCORRECT", "r2")
    clock_at(MON_W45 + 60)
    last = client.get(f"/api/v1/hub/parent/{_token(client, h)}/report").json()["lastWeek"]
    assert last["source"] == "template" and "2 ngày" in last["comment"]
    assert last["needsHelp"] == ["Cộng vector RLC"] and 1 <= len(last["tips"]) <= 3


def test_parent_report_uses_ai_comment_when_available(client, closed_session, clock_at, llm):
    h, sid = closed_session["teacherHeaders"], closed_session["sessionId"]
    clock_at(MON_W45 - 2 * DAY); _turn(sid, "VERIFIED_CORRECT", "r1")
    clock_at(MON_W45 + 60)
    llm["reply"] = (json.dumps({"comment": "Con đã chăm chỉ hơn."}, ensure_ascii=False), "gemini", "m")
    last = client.get(f"/api/v1/hub/parent/{_token(client, h)}/report").json()["lastWeek"]
    assert last["source"] == "ai" and last["comment"] == "Con đã chăm chỉ hơn."


def test_parent_report_has_no_peer_comparison(client, closed_session, clock_at, llm):
    h = closed_session["teacherHeaders"]
    text = client.get(f"/api/v1/hub/parent/{_token(client, h)}/report").text
    for other in ("s-bao00002", "s-chau0003", "rank", "classAverage"):
        assert other not in text


def test_revoked_parent_link_404(client, closed_session, llm):
    h = closed_session["teacherHeaders"]
    old = _token(client, h)
    client.post(f"/api/v1/hub/students/{AN}/parent-link", headers=h)
    assert client.get(f"/api/v1/hub/parent/{old}/report").status_code == 404
    assert client.get("/api/v1/hub/parent/khong-co/report").status_code == 404


def test_teacher_report_now(client, closed_session, clock_at, llm, teacher_headers):
    h = closed_session["teacherHeaders"]
    r = client.post(f"/api/v1/hub/students/{AN}/reports", headers=h)
    assert r.status_code == 200 and r.json()["week"] == "2026-W45"
    assert client.post("/api/v1/hub/students/s-zzz/reports", headers=h).status_code == 404


def test_parent_headers(client, closed_session, llm):
    r = client.get(f"/api/v1/hub/parent/{_token(client, closed_session['teacherHeaders'])}/report")
    assert r.headers["referrer-policy"] == "no-referrer" and r.headers["x-robots-tag"] == "noindex"
