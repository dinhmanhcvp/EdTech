"""Hồi quy cho các lỗi tìm ra ở vòng review cuối của hub (C1, I1–I7)."""
import asyncio
import copy
import json
import threading

import pytest

import lesson_llm
from conftest import make_package, open_session
from hub.seed import DEMO_PLAN

AN = "s-an000001"
FORMULA = "\\vec{U} = \\vec{U}_R + \\vec{U}_L + \\vec{U}_C"
REPLY = {"text": "Em thử nghĩ lại nhé?"}


@pytest.fixture(autouse=True)
def _fake_llm(monkeypatch):
    REPLY["text"] = "Em thử nghĩ lại nhé?"
    monkeypatch.setattr(lesson_llm, "_call_llm", lambda system, user: REPLY["text"])


def _done(r):
    assert r.status_code == 200, r.text
    block = [b for b in r.text.strip().split("\n\n") if b.startswith("event: done")][0]
    return json.loads(block.split("data: ", 1)[1])


def _turn(client, lesson, qid, message, rid, kind="ANSWER", student=AN, headers=None):
    body = {"lesson_id": lesson["lesson_id"], "scene_id": qid.split(":")[0], "question_id": qid, "kind": kind,
            "message": message, "request_id": rid}
    return client.post(f"/api/v1/student/lesson/{student}/turn", json=body, headers=headers or {})


def _hub_lesson(client, h, sid):
    r = client.get(f"/api/v1/student/lesson/{AN}?session_id={sid}", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def _qid(lesson, needle):
    return next(q["id"] for s in lesson["scenes"] for q in s["questions"] if needle in q["prompt"])


# ---------------------------------------------------------------- C1: luồng Mode 2 cũ không được hỏng
def test_legacy_lesson_still_works_after_hub_package(client, closed_session):
    r = client.get("/api/v1/student/lesson/student_default?class_id=12A1")
    assert r.status_code == 200
    lesson = r.json()
    assert not lesson["lesson_id"].startswith("hub:")
    assert _done(_turn(client, lesson, "b-rlc:q1", FORMULA, "legacy-1", student="student_default"))["status"] == "VERIFIED_CORRECT"


def test_hub_and_legacy_lessons_do_not_overwrite_each_other(client, closed_session, student_headers):
    h = student_headers(client)
    hub = _hub_lesson(client, h, closed_session["sessionId"])
    assert hub["lesson_id"].startswith("hub:")
    assert client.get(f"/api/v1/student/lesson/{AN}?class_id=12A1").status_code == 200
    assert _done(_turn(client, hub, _qid(hub, "U_R = 60 V"), "U = 100", "hub-1", headers=h))["status"] == "VERIFIED_CORRECT"


def test_record_turn_ignores_student_outside_session_class(client, closed_session):
    from hub.db import connect
    from hub.learning import record_turn
    record_turn("s-kha00006", closed_session["sessionId"], "b-rlc", "b-rlc:q1", "ANSWER", "VERIFIED_CORRECT", "x", "r-x")
    with connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM learning_events").fetchone()[0] == 0


# ---------------------------------------------------------------- I1: lọc lộ đáp án theo đúng câu đang hỏi
@pytest.mark.parametrize("needle,leak", [("U_R = 60 V", "Kết quả là U = 100 đấy."), ("U bằng bao nhiêu", "Em chọn B. 50 V là đúng.")])
def test_leak_filter_checks_current_question_key(client, closed_session, student_headers, needle, leak):
    h = student_headers(client)
    lesson = _hub_lesson(client, h, closed_session["sessionId"])
    REPLY["text"] = leak
    result = _done(_turn(client, lesson, _qid(lesson, needle), "", "leak-1", kind="HINT", headers=h))
    assert result["source"] == "FALLBACK" and result["tutor_text"] != leak


# ---------------------------------------------------------------- I2: lựa chọn là số
def test_grade_choice_numeric_options():
    from hub.grading import choice_key, grade_choice
    key = choice_key(1, ["2", "4", "6", "8"])
    assert grade_choice("4", key) is True
    assert grade_choice("2", key) is False
    assert grade_choice("B", key) is True


# ---------------------------------------------------------------- I3: đáp án phải chấm được; khóa công thức chỉ theo câu công thức
def test_plan_rejects_ungradable_answer(client, teacher_headers):
    body = copy.deepcopy(DEMO_PLAN)
    body["sections"][0]["items"][1]["answer"] = "x = 2; y = 3"
    assert client.post("/api/v1/hub/plans", json={"body": body}, headers=teacher_headers(client)).status_code == 422


def test_scene_formula_unlocks_on_its_formula_question_only(client, closed_session, student_headers):
    h = student_headers(client)
    lesson = _hub_lesson(client, h, closed_session["sessionId"])
    assert _done(_turn(client, lesson, "b-rlc:q1", FORMULA, "f-1", headers=h))["status"] == "VERIFIED_CORRECT"
    scene = next(s for s in _hub_lesson(client, h, closed_session["sessionId"])["scenes"] if s["id"] == "b-rlc")
    assert scene["latex"] == FORMULA  # bài tập của giáo án chưa làm không giữ khóa công thức của cảnh


# ---------------------------------------------------------------- I4: gói phải khớp giáo án của tiết
@pytest.mark.parametrize("over", [
    {"planVersion": 7},
    {"planId": "plan-khac"},
    {"sections": [{"boardSnapshotId": "b-rlc", "planSectionId": "sec-rlc", "kcIds": ["physics-la"]}]},
    {"sections": [{"boardSnapshotId": "b-rlc", "planSectionId": "sec-khong-co", "kcIds": []}]},
])
def test_package_must_match_session_plan(client, teacher_headers, over):
    sid, board = open_session(client, teacher_headers)
    r = client.post(f"/api/v1/hub/sessions/{sid}/package", json={"requestId": "r", "package": make_package(sid, **over)}, headers=board)
    assert r.status_code == 422


# ---------------------------------------------------------------- I5: khóa PIN không vượt được
def test_lockout_holds_under_concurrent_attempts(hub_db):
    from hub import auth
    outcomes, barrier = [], threading.Barrier(10)

    def attempt():
        barrier.wait()
        try:
            outcomes.append(auth.login_teacher("gv-demo", "0000"))
        except auth.LockedOut:
            outcomes.append("locked")

    threads = [threading.Thread(target=attempt) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert outcomes.count(None) == 5 and outcomes.count("locked") == 5


def test_lock_lasts_60s_after_fifth_failure(hub_db, monkeypatch):
    from hub import auth, clock
    t = {"now": 1000.0}
    monkeypatch.setattr(clock, "now", lambda: t["now"])
    auth.login_teacher("gv-demo", "0000")
    t["now"] = 1050.0
    for _ in range(4):
        auth.login_teacher("gv-demo", "0000")
    t["now"] = 1070.0
    with pytest.raises(auth.LockedOut):
        auth.login_teacher("gv-demo", "2468")
    t["now"] = 1111.0
    assert auth.login_teacher("gv-demo", "2468") is not None


def test_hub_auth_rate_limit_ignores_byok_header():
    from deploy_guard import RateLimitMiddleware

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    mw = RateLimitMiddleware(app, limit=1, prefixes=("/api/v1/hub/auth",))
    mw.enabled = True
    scope = {"type": "http", "method": "POST", "path": "/api/v1/hub/auth/teacher", "client": ("1.2.3.4", 1),
             "headers": [(b"x-gemini-api-key", b"k")]}

    async def call():
        sent = []

        async def send(msg):
            sent.append(msg)

        await mw(scope, None, send)
        return sent[0]["status"]

    assert asyncio.run(call()) == 200 and asyncio.run(call()) == 429


# ---------------------------------------------------------------- I6: làm lại câu đã giải không thổi phồng mastery
def test_repeat_correct_does_not_inflate_mastery(client, closed_session, student_headers):
    from hub.db import connect
    from hub.grading import PRIOR, bkt_update
    h = student_headers(client)
    lesson = _hub_lesson(client, h, closed_session["sessionId"])
    qid = _qid(lesson, "U_R = 60 V")
    for rid in ("a", "b", "c"):
        _done(_turn(client, lesson, qid, "U = 100", rid, headers=h))
    with connect() as conn:
        p = conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id='physics-cong-vector-rlc'", (AN,)).fetchone()[0]
    assert p == pytest.approx(bkt_update(PRIOR, True))


# ---------------------------------------------------------------- I7: import main không được ghi vào DB thật
def test_hub_seed_runs_at_startup_not_at_import():
    import inspect

    import main
    assert "_startup_hub" in [getattr(h, "__name__", "") for h in main.app.router.on_startup]
    assert "\ninit_hub_db()" not in inspect.getsource(main)
