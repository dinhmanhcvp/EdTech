"""Bài tập trong tiết — Task 9: gói đỉnh 3, chỉ số lượt giao, Socratic ?run_id=, báo cáo phụ huynh."""
import json

import lesson_llm
import pytest

from conftest import class_with_students, open_board_run
from test_asg_photo import _confirm, _upload, fakes  # noqa: F401


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    monkeypatch.setattr(lesson_llm, "_call_llm", lambda system, user: "Em thử lại nhé?")


def _answer(client, env, run, student=0, **body):
    payload = {"version": 1, "requestId": body.pop("requestId", "r1"), **body}
    return client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json=payload, headers=env["students"][student]["headers"]).json()


def _past_due(client, env, run, monkeypatch):
    """Đóng lượt giao và đưa đồng hồ qua hạn nộp: bài học Socratic theo lượt giao chỉ chấm đúng/sai sau hạn."""
    import time
    from hub import clock
    client.post(f"/api/v1/hub/board/runs/{run['runId']}/close", headers=env["board"])
    base = time.time()
    monkeypatch.setattr(clock, "now", lambda: base + 259201)


def _corrected_essay(client, env, run):
    pid = _upload(client, env, run).json()["photoId"]
    _confirm(client, env, run, pid, ["x + 3 = 5", "x = 8"])
    stroke = {"p": [[0.1, 0.2], [0.3, 0.4]], "c": "#e11d48", "w": 3}
    client.put(f"/api/v1/hub/board/submissions/{pid}/correction", json={"strokes": [stroke]}, headers=env["board"])
    return pid


def test_me_assignments_lists_runs_with_my_status(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q1", choice=1)
    mine = client.get("/api/v1/hub/me/assignments", headers=asg_env["students"][0]["headers"]).json()["assignments"]
    assert len(mine) == 1 and mine[0]["runId"] == run["runId"] and mine[0]["phase"] == "in_class" and mine[0]["score10"] == 10.0
    qs = {q["questionId"]: q for q in mine[0]["questions"]}
    assert qs["q1"]["status"] == "graded" and qs["q2"]["status"] is None and qs["q1"]["label"] == "Câu 1"


def test_corrections_visible_and_class_examples_anonymous(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _corrected_essay(client, asg_env, run)
    owner = client.get("/api/v1/hub/me/assignments", headers=asg_env["students"][0]["headers"]).json()["assignments"][0]
    assert owner["corrections"] == [{"submissionId": pid, "questionId": "q3"}]
    other = client.get("/api/v1/hub/me/assignments", headers=asg_env["students"][1]["headers"]).json()["assignments"][0]
    assert other["classExamples"] == [{"submissionId": pid, "questionId": "q3", "label": "Bài 1"}]
    ex = client.get(f"/api/v1/hub/me/examples/{pid}", headers=asg_env["students"][1]["headers"])
    assert ex.status_code == 200 and ex.json()["correction"]["strokes"] and asg_env["students"][0]["id"] not in ex.text
    assert client.get(f"/api/v1/hub/files/submission/{pid}", headers=asg_env["students"][1]["headers"]).status_code == 200
    _, _, outsiders = class_with_students(client, asg_env["h"], "10A4", ("Nam",))
    assert client.get(f"/api/v1/hub/me/examples/{pid}", headers=outsiders[0]["headers"]).status_code == 404


def test_me_submission_owner_only(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _corrected_essay(client, asg_env, run)
    mine = client.get(f"/api/v1/hub/me/submissions/{pid}", headers=asg_env["students"][0]["headers"])
    assert mine.status_code == 200 and mine.json()["confirmed"] == ["x + 3 = 5", "x = 8"] and mine.json()["photo"].endswith(pid)
    assert client.get(f"/api/v1/hub/me/submissions/{pid}", headers=asg_env["students"][1]["headers"]).status_code == 404


def test_run_metrics_rates_and_wrong_answers(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q2", text="13")
    _answer(client, asg_env, run, questionId="q2", text="12", requestId="r2")
    _answer(client, asg_env, run, student=1, questionId="q2", text=" 13 ")
    pid = _upload(client, asg_env, run, qid="q4").json()["photoId"]
    _confirm(client, asg_env, run, pid, ["Vì cân bằng"])
    m = client.get(f"/api/v1/hub/runs/{run['runId']}/metrics", headers=asg_env["h"]).json()
    q2 = next(q for q in m["questions"] if q["questionId"] == "q2")
    assert q2["submittedRate"] == 1.0 and q2["correctRate"] == 0.5 and q2["firstTryRate"] == 0.0
    assert q2["wrongAnswers"] == [{"answer": "13", "count": 2}]
    q4 = next(q for q in m["questions"] if q["questionId"] == "q4")
    assert q4["pending"] == 1
    lan = next(s for s in m["students"] if s["name"] == "Lan")
    assert lan["pending"] == 1 and lan["score10"] == 10.0


def test_run_lesson_has_wrong_questions_without_keys(client, asg_env, fakes, monkeypatch):
    run = open_board_run(client, asg_env)
    st = asg_env["students"][0]
    _answer(client, asg_env, run, questionId="q1", choice=0)
    _answer(client, asg_env, run, questionId="q2", text="12", requestId="r2")
    _past_due(client, asg_env, run, monkeypatch)
    r = client.get(f"/api/v1/student/lesson/{st['id']}?run_id={run['runId']}", headers=st["headers"])
    assert r.status_code == 200, r.text
    lesson = r.json()
    assert lesson["lesson_id"].startswith("hub:run:")
    assert [s["id"] for s in lesson["scenes"]] == ["q1", "q3"]  # q2 đã đúng, q4 không có đáp án
    assert lesson["scenes"][0]["questions"][0]["kind"] == "PREDICT" and "B. 2" in lesson["scenes"][0]["questions"][0]["prompt"]
    assert "x = 2" not in r.text and "choice:" not in r.text
    assert client.get(f"/api/v1/student/lesson/{st['id']}?run_id={run['runId']}").status_code == 401


def test_run_lesson_turn_records_event(client, asg_env, fakes, monkeypatch):
    from hub.db import connect
    run = open_board_run(client, asg_env)
    st = asg_env["students"][0]
    _past_due(client, asg_env, run, monkeypatch)
    lesson = client.get(f"/api/v1/student/lesson/{st['id']}?run_id={run['runId']}", headers=st["headers"]).json()
    q3 = next(s for s in lesson["scenes"] if s["id"] == "q3")["questions"][0]
    body = {"lesson_id": lesson["lesson_id"], "scene_id": "q3", "question_id": q3["id"], "kind": "ANSWER", "message": "x = 2", "request_id": "t1"}
    r = client.post(f"/api/v1/student/lesson/{st['id']}/turn", json=body, headers=st["headers"])
    assert r.status_code == 200 and "VERIFIED_CORRECT" in r.text
    with connect() as conn:
        rows = conn.execute("SELECT session_id, item_id, kind, kc_id FROM learning_events WHERE student_id=?", (st["id"],)).fetchall()
    assert [tuple(x) for x in rows] == [(run["runId"], f"{run['runId']}:q3", "correct", "math-phuong-trinh")]
    assert client.post(f"/api/v1/student/lesson/{st['id']}/turn", json={**body, "request_id": "t2"}).status_code == 401


def test_student_total_includes_run_questions(client, asg_env, fakes):
    open_board_run(client, asg_env)
    m = client.get(f"/api/v1/hub/classes/{asg_env['hubClass']}/students/{asg_env['students'][0]['id']}/metrics", headers=asg_env["h"]).json()
    assert m["total"] == 4


def test_parent_report_has_assignment_line(client, asg_env, fakes):
    from hub import reports
    from hub.clock import now
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q1", choice=1)
    _answer(client, asg_env, run, questionId="q2", text="13", requestId="r2")
    report = reports.build_report(asg_env["students"][0]["id"], reports.week_of(now()), use_ai=False)
    assert report["assignments"] == {"correct": 1, "total": 2, "runs": 1, "onTime": 1}
    assert "Bài tập: 1/2 câu đúng" in report["comment"]
    assert json.dumps(report)
