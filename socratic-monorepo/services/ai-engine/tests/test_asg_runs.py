"""Bài tập trong tiết — Task 5 (+4): lượt giao, QR, trong tiết / về nhà / hết hạn, quyền xem trang đề."""
import time

from conftest import class_with_students, console_login, live_board, open_board_run


def _shift(monkeypatch, seconds):
    from hub import clock
    base = time.time()
    monkeypatch.setattr(clock, "now", lambda: base + seconds)


def test_board_opens_run_with_qr_url(client, asg_env):
    run = open_board_run(client, asg_env)
    assert len(run["code"]) == 8 and run["url"].endswith("/a/" + run["code"]) and run["classHasStudents"] is True


def test_board_run_without_class_409(client, asg_env):
    _, board = live_board(client, asg_env["h"], None)
    r = client.post("/api/v1/hub/board/runs", json={"assignmentId": asg_env["aid"]}, headers=board)
    assert r.status_code == 409 and r.json()["detail"] == "period_has_no_class"


def test_board_lists_and_reads_assignment_public(client, asg_env):
    listed = client.get("/api/v1/hub/board/assignments", headers=asg_env["board"]).json()["assignments"]
    assert asg_env["aid"] in [a["id"] for a in listed]
    r = client.get(f"/api/v1/hub/board/assignments/{asg_env['aid']}", headers=asg_env["board"])
    assert r.status_code == 200 and '"answer"' not in r.text and len(r.json()["pages"]) == 1


def test_board_cannot_read_other_teachers_assignment(client, asg_env):
    other = console_login(client, "gv-khac")
    _, board = live_board(client, other, None)
    assert client.get(f"/api/v1/hub/board/assignments/{asg_env['aid']}", headers=board).status_code == 404


def test_student_by_code_public_only(client, asg_env):
    run = open_board_run(client, asg_env)
    r = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=asg_env["students"][0]["headers"])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["phase"] == "in_class" and data["version"] == 1 and '"answer"' not in r.text
    assert [q["id"] for q in data["body"]["questions"]] == ["q1", "q2", "q3", "q4"] and len(data["pages"]) == 1


def test_other_class_student_403(client, asg_env):
    run = open_board_run(client, asg_env)
    _, _, others = class_with_students(client, asg_env["h"], "10A4", ("Nam",))
    r = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=others[0]["headers"])
    assert r.status_code == 403 and r.json()["detail"] == "not_in_class"


def test_close_then_homework_then_closed(client, asg_env, monkeypatch):
    run = open_board_run(client, asg_env)
    assert client.post(f"/api/v1/hub/board/runs/{run['runId']}/close", headers=asg_env["board"]).status_code == 200
    st = asg_env["students"][0]["headers"]
    assert client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=st).json()["phase"] == "homework"
    _shift(monkeypatch, 259201)
    r = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=st)
    assert r.status_code == 410 and r.json()["detail"] == "run_closed"


def test_period_end_turns_run_into_homework(client, asg_env):
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/console/periods/{asg_env['pid']}/end", headers=asg_env["h"])
    r = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=asg_env["students"][0]["headers"])
    assert r.status_code == 200 and r.json()["phase"] == "homework"
    assert r.json()["dueAt"] - time.time() > 259000


def test_teacher_runs_due_date_and_list(client, asg_env):
    h = asg_env["h"]
    r = client.post("/api/v1/hub/runs", json={"assignmentId": asg_env["aid"], "classId": asg_env["hubClass"]}, headers=h)
    assert r.status_code == 200
    rid = r.json()["runId"]
    client.post(f"/api/v1/hub/runs/{rid}/close", headers=h)
    due = time.time() + 86400
    assert client.put(f"/api/v1/hub/runs/{rid}", json={"dueAt": due}, headers=h).json()["dueAt"] == due
    assert rid in [x["runId"] for x in client.get(f"/api/v1/hub/runs?classId={asg_env['hubClass']}", headers=h).json()["runs"]]


def test_board_adds_question_bumps_version(client, asg_env):
    q = {"type": "short", "label": "Câu 5", "text": "Tính $2+2$", "answer": "4", "kcs": []}
    r = client.post(f"/api/v1/hub/board/assignments/{asg_env['aid']}/questions", json={"question": q}, headers=asg_env["board"])
    assert r.status_code == 200 and r.json()["version"] == 2
    run = open_board_run(client, asg_env)
    body = client.get(f"/api/v1/hub/runs/by-code/{run['code']}", headers=asg_env["students"][0]["headers"]).json()["body"]
    assert len(body["questions"]) == 5


def test_page_visible_to_owner_board_and_class_student(client, asg_env):
    url = f"/api/v1/hub/files/page/{asg_env['aid']}/0"
    assert client.get(url, headers=asg_env["h"]).headers["content-type"] == "image/jpeg"
    assert client.get(url, headers=asg_env["board"]).status_code == 200
    st = asg_env["students"][0]["headers"]
    assert client.get(url, headers=st).status_code == 404  # chưa giao bài cho lớp
    open_board_run(client, asg_env)
    assert client.get(url, headers=st).status_code == 200


def test_page_hidden_from_other_class_student_404(client, asg_env):
    open_board_run(client, asg_env)
    _, _, others = class_with_students(client, asg_env["h"], "10A4", ("Nam",))
    assert client.get(f"/api/v1/hub/files/page/{asg_env['aid']}/0", headers=others[0]["headers"]).status_code == 404


def test_page_hidden_after_run_fully_closed_for_student(client, asg_env, monkeypatch):
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/hub/board/runs/{run['runId']}/close", headers=asg_env["board"])
    _shift(monkeypatch, 259201)
    assert client.get(f"/api/v1/hub/files/page/{asg_env['aid']}/0", headers=asg_env["students"][0]["headers"]).status_code == 404
