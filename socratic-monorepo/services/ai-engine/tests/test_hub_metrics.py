import itertools

import pytest

AN, BAO = "s-an000001", "s-bao00002"
_req = itertools.count()


@pytest.fixture
def at(monkeypatch):
    """at(t): đặt đồng hồ hub = mốc t giây (tương đối)."""
    import time
    from hub import clock
    base = time.time()
    state = {"t": 0.0}
    monkeypatch.setattr(clock, "now", lambda: base + state["t"])
    return lambda t: state.update(t=t)


def turn(sid, student, question, status="VERIFIED_CORRECT", kind="ANSWER", message="x", scene="b-rlc"):
    from hub.learning import record_turn
    record_turn(student, sid, scene, question, kind, status, message, f"r{next(_req)}")


def _student(client, h, student=AN):
    r = client.get(f"/api/v1/hub/classes/12a1/students/{student}/metrics", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def test_student_metrics_after_attempts(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-rlc:q1")
    at(10); turn(sid, AN, "b-rlc:q4", "VERIFIED_INCORRECT", message="U = 50")
    at(20); turn(sid, AN, "b-rlc:q5", "NONE", kind="HINT", message="")
    m = _student(client, h)
    assert m["done"] == 2 and m["firstTryRate"] == 0.5 and m["hintsPerItem"] == 0.5
    assert m["total"] >= 5 and m["lastActive"] is not None
    assert set(m["mastery"]) == {"physics-cong-vector-rlc"}


def test_minutes_cap_gap_at_300s(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-rlc:q1")
    at(1000); turn(sid, AN, "b-rlc:q4")
    assert _student(client, h)["minutes"] == 5.0
    at(0); turn(sid, BAO, "b-rlc:q1")
    at(60); turn(sid, BAO, "b-rlc:q4")
    assert _student(client, h, BAO)["minutes"] == 1.0


def test_needs_support_three_wrong_in_a_row(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-fr:q1", "VERIFIED_INCORRECT", scene="b-fr")
    at(1); turn(sid, AN, "b-fr:q2", "VERIFIED_INCORRECT", scene="b-fr")
    assert _student(client, h)["needsSupport"] is False
    at(2); turn(sid, AN, "b-fr:q3", "VERIFIED_INCORRECT", scene="b-fr")
    m = _student(client, h)
    assert m["needsSupport"] is True and "three_wrong_in_a_row" in m["supportReasons"]


def test_needs_support_low_mastery_requires_three_attempts(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-rlc:q1", "VERIFIED_INCORRECT")
    at(1); turn(sid, AN, "b-rlc:q1", "VERIFIED_INCORRECT")
    assert not [r for r in _student(client, h)["supportReasons"] if r.startswith("low_mastery")]
    at(2); turn(sid, AN, "b-rlc:q4", "VERIFIED_CORRECT")
    at(3); turn(sid, AN, "b-rlc:q5", "VERIFIED_INCORRECT")  # mastery ~0.37 sau 4 lượt; 3 lượt cuối không đều sai
    reasons = _student(client, h)["supportReasons"]
    assert "low_mastery:physics-cong-vector-rlc" in reasons and "three_wrong_in_a_row" not in reasons


def test_section_metrics_wrong_answers_anonymous_and_merged(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-rlc:q4", "VERIFIED_INCORRECT", message="U=50")
    at(1); turn(sid, BAO, "b-rlc:q4", "VERIFIED_INCORRECT", message="U = 50")
    at(2); turn(sid, BAO, "b-rlc:q1", "VERIFIED_CORRECT")
    r = client.get("/api/v1/hub/plans/plan-demo-rlc/sections/sec-rlc/metrics?classId=12a1", headers=h)
    assert r.status_code == 200
    m = r.json()
    assert m["wrongAnswers"] == [{"answer": "U=50", "count": 2}]
    assert m["attemptedRate"] == 0.4 and m["firstTryRate"] == pytest.approx(1 / 3)
    assert m["weakestKc"] == "physics-cong-vector-rlc"
    assert AN not in str(m["wrongAnswers"]) and BAO not in str(m["wrongAnswers"])


def test_class_heatmap_uses_real_students(client, closed_session, at):
    sid, h = closed_session["sessionId"], closed_session["teacherHeaders"]
    at(0); turn(sid, AN, "b-rlc:q1")
    m = client.get("/api/v1/hub/classes/12a1/metrics", headers=h).json()
    assert set(m["heatmap"]) == {"s-an000001", "s-bao00002", "s-chau0003", "s-dung0004", "s-ha000005"}
    assert m["heatmap"][AN]["physics-cong-vector-rlc"] > 0.3 and m["heatmap"][BAO] == {}
    assert {k["id"] for k in m["kcs"]} >= {"physics-cong-vector-rlc", "physics-cong-luc-ma-sat"}
    assert 0 < m["progress"] < 1 and len(m["students"]) == 5


def test_mastery_at_replays_to_current(client, closed_session, at):
    from hub.db import connect
    from hub.metrics import mastery_at
    sid = closed_session["sessionId"]
    at(0); turn(sid, AN, "b-rlc:q1", "VERIFIED_INCORRECT")
    at(5); turn(sid, AN, "b-rlc:q4")
    with connect() as conn:
        stored = conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id='physics-cong-vector-rlc'", (AN,)).fetchone()[0]
    import time
    from hub import clock
    assert mastery_at(AN, "physics-cong-vector-rlc", clock.now()) == pytest.approx(stored)
    assert mastery_at(AN, "physics-cong-vector-rlc", clock.now() - 10) == pytest.approx(0.3)


def test_metrics_ownership_and_roles(client, closed_session, student_headers):
    h = closed_session["teacherHeaders"]
    assert client.get("/api/v1/hub/classes/12a1/students/s-kha00006/metrics", headers=h).status_code == 404
    assert client.get("/api/v1/hub/classes/12a1/metrics", headers=student_headers(client)).status_code == 403
    assert client.get("/api/v1/hub/stream/teacher", headers=student_headers(client)).status_code == 403
