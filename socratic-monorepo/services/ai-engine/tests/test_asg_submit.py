"""Bài tập trong tiết — Task 6: nộp trắc nghiệm và đáp số gõ, sự kiện học tập."""
import copy
import json

from conftest import ASG_SAMPLE, open_board_run


def _answer(client, env, run, student=0, **body):
    payload = {"version": 1, "requestId": body.pop("requestId", "r1"), **body}
    return client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json=payload, headers=env["students"][student]["headers"])


def _events(student_id):
    from hub.db import connect
    with connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM learning_events WHERE student_id=? ORDER BY created_at", (student_id,))]


def test_choice_correct_and_wrong(client, asg_env):
    run = open_board_run(client, asg_env)
    ok = _answer(client, asg_env, run, questionId="q1", choice=1)
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "graded" and ok.json()["score"] == 1 and ok.json()["attempt"] == 1
    bad = _answer(client, asg_env, run, student=1, questionId="q1", choice=0)
    assert bad.json()["score"] == 0


def test_short_correct_and_unparseable_pending(client, asg_env):
    run = open_board_run(client, asg_env)
    assert _answer(client, asg_env, run, questionId="q2", text="12").json()["status"] == "graded"
    r = _answer(client, asg_env, run, questionId="q2", text="mười hai", requestId="r2")
    assert r.json()["status"] == "pending_teacher" and r.json()["score"] is None and r.json()["attempt"] == 2


def test_wrong_mode_422(client, asg_env):
    run = open_board_run(client, asg_env)
    assert _answer(client, asg_env, run, questionId="q3", text="x = 2").status_code == 422
    assert _answer(client, asg_env, run, questionId="q1", text="1", requestId="r2").status_code == 422


def test_events_and_mastery_only_for_certain(client, asg_env):
    from hub.db import connect
    run = open_board_run(client, asg_env)
    sid = asg_env["students"][0]["id"]
    _answer(client, asg_env, run, questionId="q2", text="mười hai")
    assert _events(sid) == []
    _answer(client, asg_env, run, questionId="q1", choice=1, requestId="r2")
    ev = _events(sid)
    assert len(ev) == 1 and ev[0]["kind"] == "correct" and ev[0]["session_id"] == run["runId"]
    assert ev[0]["section_id"] == f"asg:{asg_env['aid']}" and ev[0]["item_id"] == f"{run['runId']}:q1"


def test_request_id_idempotent_and_conflict(client, asg_env):
    run = open_board_run(client, asg_env)
    a = _answer(client, asg_env, run, questionId="q1", choice=1, requestId="same")
    b = _answer(client, asg_env, run, questionId="q1", choice=1, requestId="same")
    assert a.json() == b.json()
    assert _answer(client, asg_env, run, questionId="q1", choice=2, requestId="same").status_code == 409
    assert len(_events(asg_env["students"][0]["id"])) == 1


def test_submission_grades_against_its_version(client, asg_env):
    v2 = copy.deepcopy(ASG_SAMPLE)
    v2["questions"][0]["answer"] = "2"
    assert client.put(f"/api/v1/hub/assignments/{asg_env['aid']}", json={"body": v2, "baseVersion": 1}, headers=asg_env["h"]).json()["version"] == 2
    run = open_board_run(client, asg_env)
    assert _answer(client, asg_env, run, questionId="q1", choice=1, version=1).json()["score"] == 1
    assert _answer(client, asg_env, run, questionId="q1", choice=1, version=2, requestId="r2").json()["score"] == 0
    assert _answer(client, asg_env, run, questionId="q1", choice=1, version=3, requestId="r3").status_code == 422


def test_teacher_and_board_notified(client, asg_env):
    from hub.events import bus
    run = open_board_run(client, asg_env)
    teacher_id = client.get("/api/v1/hub/me/teacher", headers=asg_env["h"]).json()["teacher"]["id"]
    qt, qb = bus.subscribe(f"teacher:{teacher_id}"), bus.subscribe(f"cboard:{asg_env['pid']}")
    _answer(client, asg_env, run, questionId="q1", choice=1)
    events = [qt.get_nowait() for _ in range(qt.qsize())]
    update = next(e for e in events if e["type"] == "submission_update")
    assert update == {"type": "submission_update", "runId": run["runId"], "studentId": asg_env["students"][0]["id"], "questionId": "q1", "status": "graded"}
    progress = qb.get_nowait()
    assert progress == {"type": "progress", "runId": run["runId"]} and "s-" not in json.dumps(progress)


def test_homework_phase_marked_and_closed_rejected(client, asg_env, monkeypatch):
    import time
    from hub import clock
    from hub.db import connect
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/hub/board/runs/{run['runId']}/close", headers=asg_env["board"])
    _answer(client, asg_env, run, questionId="q1", choice=1)
    with connect() as conn:
        assert conn.execute("SELECT phase FROM submissions").fetchone()[0] == "homework"
    base = time.time()
    monkeypatch.setattr(clock, "now", lambda: base + 259201)
    r = _answer(client, asg_env, run, questionId="q2", text="12", requestId="r2")
    assert r.status_code == 410 and r.json()["detail"] == "run_closed"


def test_by_code_reports_my_latest_status(client, asg_env):
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q1", choice=0)
    _answer(client, asg_env, run, questionId="q1", choice=1, requestId="r2")
    mine = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=asg_env["students"][0]["headers"]).json()["mine"]
    assert mine["q1"] == {"status": "graded", "score": 1, "attempt": 2}


def test_repeat_correct_does_not_inflate_mastery(client, asg_env):
    from hub.db import connect
    from hub.grading import PRIOR, bkt_update
    v2 = copy.deepcopy(ASG_SAMPLE)
    v2["questions"][1]["kcs"] = [{"id": "math-nhan", "label": "Phép nhân"}]
    client.put(f"/api/v1/hub/assignments/{asg_env['aid']}", json={"body": v2, "baseVersion": 1}, headers=asg_env["h"])
    run = open_board_run(client, asg_env)
    for rid in ("a", "b", "c"):
        _answer(client, asg_env, run, questionId="q2", text="12", requestId=rid, version=2)
    sid = asg_env["students"][0]["id"]
    assert len(_events(sid)) == 3
    with connect() as conn:
        p = conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id='math-nhan'", (sid,)).fetchone()[0]
    assert abs(p - bkt_update(PRIOR, True)) < 1e-9
