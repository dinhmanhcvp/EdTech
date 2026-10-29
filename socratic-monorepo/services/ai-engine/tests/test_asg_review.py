"""Bài tập trong tiết — Task 8: duyệt, chọn bài ẩn danh trên bảng, chiếu, phần chữa."""
from conftest import console_login, open_board_run
from test_asg_photo import _confirm, _upload, fakes  # noqa: F401  (fixture dùng chung)


def _answer(client, env, run, student=0, **body):
    payload = {"version": 1, "requestId": body.pop("requestId", "r1"), **body}
    return client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json=payload, headers=env["students"][student]["headers"]).json()


def _essay(client, env, run, lines, student=0, rid="p1"):
    pid = _upload(client, env, run, student=student, request_id=rid).json()["photoId"]
    return _confirm(client, env, run, pid, lines, student=student).json()


def _events(sub_id):
    from hub.db import connect
    with connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM learning_events WHERE request_id=?", (f"sub:{sub_id}",))]


def test_review_confirms_and_counts(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run, qid="q4").json()["photoId"]
    _confirm(client, asg_env, run, pid, ["Vì cân bằng hai vế"])
    assert _events(pid) == []
    r = client.post(f"/api/v1/hub/submissions/{pid}/review", json={"score": 0.75}, headers=asg_env["h"])
    assert r.status_code == 200 and r.json()["status"] == "teacher_confirmed" and r.json()["score"] == 0.75
    assert [e["kind"] for e in _events(pid)] == ["correct"]


def test_review_overrides_graded_score_and_recomputes_mastery(client, asg_env, fakes):
    from hub.db import connect
    from hub.grading import PRIOR, bkt_update
    run = open_board_run(client, asg_env)
    sub = _essay(client, asg_env, run, ["x + 3 = 5", "x = 2"])
    assert sub["status"] == "graded" and sub["score"] == 1
    r = client.post(f"/api/v1/hub/submissions/{sub['photoId']}/review", json={"score": 0}, headers=asg_env["h"])
    assert r.json()["score"] == 0
    assert [e["kind"] for e in _events(sub["photoId"])] == ["incorrect"]
    with connect() as conn:
        p = conn.execute("SELECT p_known FROM mastery WHERE kc_id='math-phuong-trinh'").fetchone()[0]
    assert abs(p - bkt_update(PRIOR, False)) < 1e-9


def test_review_other_teacher_404(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    sub = _essay(client, asg_env, run, ["x = 2"])
    other = console_login(client, "gv-khac")
    assert client.post(f"/api/v1/hub/submissions/{sub['photoId']}/review", json={"score": 1}, headers=other).status_code == 404
    assert client.post(f"/api/v1/hub/submissions/{sub['photoId']}/review", json={"score": 1}, headers=asg_env["h"]).status_code == 200


def test_teacher_submissions_grid_has_names(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q1", choice=1)
    rows = client.get(f"/api/v1/hub/runs/{run['runId']}/submissions", headers=asg_env["h"]).json()["submissions"]
    assert rows[0]["studentId"] == asg_env["students"][0]["id"] and rows[0]["name"] == "Lan" and rows[0]["questionId"] == "q1"


def test_board_list_is_anonymous_and_filterable(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    _essay(client, asg_env, run, ["x = 8"], student=0)
    _essay(client, asg_env, run, ["x = 2"], student=1, rid="p2")
    r = client.get(f"/api/v1/hub/board/runs/{run['runId']}/submissions?questionId=q3", headers=asg_env["board"])
    assert r.status_code == 200
    items = r.json()["submissions"]
    assert [i["label"] for i in items] == ["Bài 1", "Bài 2"]
    text = r.text
    assert all(s["id"] not in text for s in asg_env["students"]) and "Lan" not in text and "Minh" not in text
    graded = client.get(f"/api/v1/hub/board/runs/{run['runId']}/submissions?status=graded", headers=asg_env["board"]).json()["submissions"]
    assert len(graded) == 2


def test_board_progress(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    _answer(client, asg_env, run, questionId="q1", choice=1)
    _answer(client, asg_env, run, student=1, questionId="q1", choice=0)
    q1 = next(q for q in client.get(f"/api/v1/hub/board/runs/{run['runId']}/progress", headers=asg_env["board"]).json()["questions"]
              if q["questionId"] == "q1")
    assert q1 == {"questionId": "q1", "submitted": 2, "correctRate": 0.5}


def test_show_publishes_to_board_channel(client, asg_env, fakes):
    from hub.events import bus
    run = open_board_run(client, asg_env)
    sub = _essay(client, asg_env, run, ["x = 8"])
    q = bus.subscribe(f"cboard:{asg_env['pid']}")
    assert client.post(f"/api/v1/hub/runs/{run['runId']}/show", json={"submissionId": sub["photoId"]}, headers=asg_env["h"]).status_code == 200
    assert q.get_nowait() == {"type": "show_submission", "runId": run["runId"], "submissionId": sub["photoId"], "label": "Bài 1"}


def test_board_submission_detail_anonymous(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    sub = _essay(client, asg_env, run, ["x + 3 = 5", "x = 2"])
    r = client.get(f"/api/v1/hub/board/submissions/{sub['photoId']}", headers=asg_env["board"])
    assert r.status_code == 200
    data = r.json()
    assert data["label"] == "Bài 1" and data["confirmed"] == ["x + 3 = 5", "x = 2"] and data["grade"]["summary"] == "Đúng"
    assert asg_env["students"][0]["id"] not in r.text and "Lan" not in r.text


def test_correction_saved_and_limited(client, asg_env, fakes):
    from hub.assignments import submissions
    run = open_board_run(client, asg_env)
    sub = _essay(client, asg_env, run, ["x = 8"])
    stroke = {"p": [[0.1, 0.2], [0.3, 0.4]], "c": "#e11d48", "w": 3}
    url = f"/api/v1/hub/board/submissions/{sub['photoId']}/correction"
    assert client.put(url, json={"strokes": [stroke]}, headers=asg_env["board"]).status_code == 200
    assert submissions.get(sub["photoId"])["correction"]["strokes"] == [stroke]
    assert client.put(url, json={"strokes": [stroke] * 201}, headers=asg_env["board"]).status_code == 422
    assert client.put(url, json={"strokes": [{"p": [[1.5, 0]], "c": "#000000", "w": 2}]}, headers=asg_env["board"]).status_code == 422


def test_board_stream_requires_live_board(client):
    assert client.get("/api/v1/hub/board/stream").status_code == 401
