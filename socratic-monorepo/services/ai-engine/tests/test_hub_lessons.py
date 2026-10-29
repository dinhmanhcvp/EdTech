import json

import pytest

import lesson_llm

STUDENT = "s-an000001"


@pytest.fixture(autouse=True)
def _no_real_llm(monkeypatch):
    monkeypatch.setattr(lesson_llm, "_call_llm", lambda system, user: "Em thử nghĩ lại nhé?")


def _lesson(client, headers, session_id, student=STUDENT):
    return client.get(f"/api/v1/student/lesson/{student}?session_id={session_id}", headers=headers)


def _find(lesson, scene_id, needle):
    scene = next(s for s in lesson["scenes"] if s["id"] == scene_id)
    return next(q for q in scene["questions"] if needle in q["prompt"])


def _turn(client, headers, lesson, question, message, request_id, kind="ANSWER"):
    body = {"lesson_id": lesson["lesson_id"], "scene_id": question["scene_id"], "question_id": question["id"],
            "kind": kind, "message": message, "request_id": request_id}
    r = client.post(f"/api/v1/student/lesson/{STUDENT}/turn", json=body, headers=headers)
    assert r.status_code == 200, r.text
    done = [b for b in r.text.strip().split("\n\n") if b.startswith("event: done")][0]
    return json.loads(done.split("data: ", 1)[1])


def _events(student=STUDENT):
    from hub.db import connect
    with connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM learning_events WHERE student_id=? ORDER BY created_at", (student,))]


def test_bkt_update_matches_online_tutor():
    from hub.grading import bkt_update
    p = 0.3
    post = p * 0.92 / (p * 0.92 + (1 - p) * 0.12)
    assert round(bkt_update(p, True), 6) == round(post + (1 - post) * 0.2, 6)
    assert bkt_update(p, False) < p


def test_grade_choice():
    from hub.grading import choice_key, grade_choice
    key = choice_key(1, ["70 V", "50 V", "10 V"])
    assert grade_choice("B", key) is True and grade_choice("b", key) is True and grade_choice("2", key) is True
    assert grade_choice("50 v", key) is True
    assert grade_choice("A", key) is False and grade_choice("70v", key) is False
    assert grade_choice("?", key) is None and grade_choice("D", key) is None


def test_session_lesson_has_plan_questions_without_keys(client, closed_session, student_headers):
    r = _lesson(client, student_headers(client), closed_session["sessionId"])
    assert r.status_code == 200
    lesson = r.json()
    problem = _find(lesson, "b-rlc", "U_R = 60 V")
    assert problem["kind"] == "COMPUTE"
    poll = _find(lesson, "b-rlc", "U bằng bao nhiêu")
    assert poll["kind"] == "PREDICT" and "B. 50 V" in poll["prompt"]
    assert "U = 100" not in r.text and "choice:" not in r.text


def test_session_lesson_requires_hub_token(client, closed_session):
    assert client.get(f"/api/v1/student/lesson/{STUDENT}?session_id={closed_session['sessionId']}").status_code == 401


def test_session_lesson_other_class_404(client, closed_session, student_headers):
    r = client.get(f"/api/v1/student/lesson/s-kha00006?session_id={closed_session['sessionId']}", headers=student_headers(client, "KHA234"))
    assert r.status_code == 404
    other = client.get(f"/api/v1/student/lesson/{STUDENT}?session_id={closed_session['sessionId']}", headers=student_headers(client, "KHA234"))
    assert other.status_code == 403


def test_turn_correct_records_event_mastery_and_notifies(client, closed_session, student_headers):
    from hub.db import connect
    from hub.events import bus
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    q = bus.subscribe("teacher:gv-demo")
    result = _turn(client, h, lesson, _find(lesson, "b-rlc", "U_R = 60 V"), "U = 100", "r-1")
    assert result["status"] == "VERIFIED_CORRECT"
    ev = _events()
    assert [(e["kind"], e["section_id"], e["kc_id"]) for e in ev] == [("correct", "sec-rlc", "physics-cong-vector-rlc")]
    with connect() as conn:
        assert conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id='physics-cong-vector-rlc'", (STUDENT,)).fetchone()[0] > 0.3
    assert q.get_nowait() == {"type": "metric_delta", "classId": "12a1", "studentId": STUDENT, "sectionId": "sec-rlc"}


def test_poll_choice_graded(client, closed_session, student_headers):
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    poll = _find(lesson, "b-rlc", "U bằng bao nhiêu")
    assert _turn(client, h, lesson, poll, "A", "r-a")["status"] == "VERIFIED_INCORRECT"
    assert _turn(client, h, lesson, poll, "B", "r-b")["status"] == "VERIFIED_CORRECT"
    assert [e["kind"] for e in _events()] == ["incorrect", "correct"]


def test_hint_records_hint_without_mastery_change(client, closed_session, student_headers):
    from hub.db import connect
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    _turn(client, h, lesson, _find(lesson, "b-rlc", "U_R = 60 V"), "", "r-h", kind="HINT")
    assert [e["kind"] for e in _events()] == ["hint"]
    with connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM mastery WHERE student_id=?", (STUDENT,)).fetchone()[0] == 0


def test_chat_records_nothing(client, closed_session, student_headers):
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    _turn(client, h, lesson, _find(lesson, "b-rlc", "U_R = 60 V"), "Em chưa hiểu đề", "r-c", kind="CHAT")
    assert _events() == []


def test_cached_turn_does_not_double_record(client, closed_session, student_headers):
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    question = _find(lesson, "b-rlc", "U_R = 60 V")
    _turn(client, h, lesson, question, "U = 50", "r-same")
    _turn(client, h, lesson, question, "U = 50", "r-same")
    assert [e["kind"] for e in _events()] == ["incorrect"]


def test_session_turn_requires_hub_token(client, closed_session, student_headers):
    h = student_headers(client)
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    question = _find(lesson, "b-rlc", "U_R = 60 V")
    body = {"lesson_id": lesson["lesson_id"], "scene_id": "b-rlc", "question_id": question["id"], "kind": "ANSWER", "message": "U = 100", "request_id": "r-x"}
    assert client.post(f"/api/v1/student/lesson/{STUDENT}/turn", json=body).status_code == 401
    assert _events() == []


def test_me_lessons_lists_closed_session(client, closed_session, student_headers):
    h = student_headers(client)
    listed = client.get("/api/v1/hub/me/lessons", headers=h).json()["lessons"]
    assert [l["sessionId"] for l in listed] == [closed_session["sessionId"]]
    assert listed[0]["total"] >= 3 and listed[0]["done"] == 0
    lesson = _lesson(client, h, closed_session["sessionId"]).json()
    _turn(client, h, lesson, _find(lesson, "b-rlc", "U_R = 60 V"), "U = 100", "r-1")
    assert client.get("/api/v1/hub/me/lessons", headers=h).json()["lessons"][0]["done"] == 1
    assert client.get("/api/v1/hub/me/lessons", headers=student_headers(client, "KHA234")).json()["lessons"] == []
