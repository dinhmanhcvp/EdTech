"""Tài nguyên trên bảng (slide/bài tập/đề) và gói theo tiết console."""
import copy

from conftest import ASG_SAMPLE, class_with_students, console_login, live_board, open_board_run, tiny_pdf


def _upload(client, h, kind="slides", title="Bài giảng"):
    r = client.post("/api/v1/hub/assignments/upload", data={"title": title, "subject": "MATH", "kind": kind},
                    files={"file": ("bg.pdf", tiny_pdf(2), "application/pdf")}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _stroke(x=0.2):
    return {"p": [[x, 0.1], [x + 0.1, 0.2]], "c": "#2563eb", "w": 3}


def test_slides_need_no_questions_and_are_listed_on_board(client, asg_env):
    sid = _upload(client, asg_env["h"])
    got = client.get(f"/api/v1/hub/assignments/{sid}", headers=asg_env["h"]).json()
    assert got["kind"] == "slides" and got["version"] == 1 and got["body"]["questions"] == []
    listed = {a["id"]: a for a in client.get("/api/v1/hub/board/assignments", headers=asg_env["board"]).json()["assignments"]}
    assert listed[sid]["kind"] == "slides" and listed[sid]["pageCount"] == 2


def test_exercise_still_needs_questions(client, asg_env):
    body = copy.deepcopy(ASG_SAMPLE); body["questions"] = []
    r = client.put(f"/api/v1/hub/assignments/{asg_env['aid']}", json={"body": body, "baseVersion": 1}, headers=asg_env["h"])
    assert r.status_code == 422


def test_delete_unused_only(client, asg_env):
    sid = _upload(client, asg_env["h"])
    assert client.delete(f"/api/v1/hub/assignments/{sid}", headers=asg_env["h"]).status_code == 200
    assert client.get(f"/api/v1/hub/assignments/{sid}", headers=asg_env["h"]).status_code == 404
    open_board_run(client, asg_env)
    r = client.delete(f"/api/v1/hub/assignments/{asg_env['aid']}", headers=asg_env["h"])
    assert r.status_code == 409 and r.json()["detail"] == "in_use"


def test_board_open_records_use_and_student_sees_pages(client, asg_env):
    sid = _upload(client, asg_env["h"])
    st = asg_env["students"][0]["headers"]
    assert client.get(f"/api/v1/hub/files/page/{sid}/1", headers=st).status_code == 404
    assert client.post(f"/api/v1/hub/board/resources/{sid}/open", headers=asg_env["board"]).status_code == 200
    assert client.get(f"/api/v1/hub/files/page/{sid}/1", headers=st).status_code == 404  # chỉ thấy sau khi hết tiết
    client.post(f"/api/v1/console/periods/{asg_env['pid']}/end", headers=asg_env["h"])
    assert client.get(f"/api/v1/hub/files/page/{sid}/1", headers=st).status_code == 200
    _, _, outsiders = class_with_students(client, asg_env["h"], "10A4", ("Nam",))
    assert client.get(f"/api/v1/hub/files/page/{sid}/1", headers=outsiders[0]["headers"]).status_code == 404


def test_annotations_per_period_and_limits(client, asg_env):
    sid = _upload(client, asg_env["h"])
    url = f"/api/v1/hub/board/resources/{sid}/pages/0/annotations"
    assert client.get(url, headers=asg_env["board"]).json() == {"strokes": []}
    assert client.put(url, json={"strokes": [_stroke()]}, headers=asg_env["board"]).status_code == 200
    assert client.get(url, headers=asg_env["board"]).json()["strokes"] == [_stroke()]
    assert client.put(url, json={"strokes": [_stroke()] * 501}, headers=asg_env["board"]).status_code == 422
    assert client.put(url, json={"strokes": [{"p": [[2, 0]], "c": "#000000", "w": 1}]}, headers=asg_env["board"]).status_code == 422
    # tiết khác của cùng giáo viên: nét viết riêng
    _, board2 = live_board(client, asg_env["h"], asg_env["cid"])
    assert client.get(url, headers=board2).json() == {"strokes": []}


def test_other_teachers_board_cannot_touch_resource(client, asg_env):
    sid = _upload(client, asg_env["h"])
    other = console_login(client, "gv-khac")
    _, board = live_board(client, other, None)
    assert client.post(f"/api/v1/hub/board/resources/{sid}/open", headers=board).status_code == 404
    assert client.put(f"/api/v1/hub/board/resources/{sid}/pages/0/annotations", json={"strokes": []}, headers=board).status_code == 404


def test_me_resources_lists_used_in_my_class(client, asg_env):
    sid = _upload(client, asg_env["h"], title="Hàm số bậc nhất")
    client.post(f"/api/v1/hub/board/resources/{sid}/open", headers=asg_env["board"])
    assert client.get("/api/v1/hub/me/resources", headers=asg_env["students"][0]["headers"]).json()["resources"] == []
    client.post(f"/api/v1/console/periods/{asg_env['pid']}/end", headers=asg_env["h"])
    mine = client.get("/api/v1/hub/me/resources", headers=asg_env["students"][0]["headers"]).json()["resources"]
    assert [(r["assignmentId"], r["title"], r["kind"], len(r["pages"])) for r in mine] == [(sid, "Hàm số bậc nhất", "slides", 2)]
    assert mine[0]["periodTitle"] == "Tiết thử"


def test_me_periods_package(client, asg_env):
    sid = _upload(client, asg_env["h"])
    client.post(f"/api/v1/hub/board/resources/{sid}/open", headers=asg_env["board"])
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json={"questionId": "q1", "version": 1, "requestId": "r1", "choice": 1},
                headers=asg_env["students"][0]["headers"])
    st = asg_env["students"][0]["headers"]
    assert client.get("/api/v1/hub/me/periods", headers=st).json()["periods"] == []  # tiết chưa kết thúc
    client.post(f"/api/v1/console/periods/{asg_env['pid']}/end", headers=asg_env["h"])
    periods = client.get("/api/v1/hub/me/periods", headers=st).json()["periods"]
    assert len(periods) == 1
    p = periods[0]
    assert p["periodId"] == asg_env["pid"] and p["title"] == "Tiết thử" and p["endedAt"]
    assert [r["runId"] for r in p["runs"]] == [run["runId"]] and p["runs"][0]["phase"] == "homework"
    assert [r["assignmentId"] for r in p["resources"]] == [sid]


def test_console_period_summary(client, asg_env):
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json={"questionId": "q2", "version": 1, "requestId": "r1", "text": "mười hai"},
                headers=asg_env["students"][0]["headers"])
    r = client.get(f"/api/v1/hub/console/periods/{asg_env['pid']}/summary", headers=asg_env["h"])
    assert r.status_code == 200, r.text
    s = r.json()
    assert [x["runId"] for x in s["runs"]] == [run["runId"]] and s["pending"] == 1
    assert s["runs"][0]["metrics"]["questions"][1]["pending"] == 1
    assert client.get(f"/api/v1/hub/console/periods/{asg_env['pid']}/summary", headers=console_login(client, "gv-khac")).status_code == 404


def test_handout_twice_in_a_period_reuses_the_open_run(client, asg_env):
    first = open_board_run(client, asg_env)
    again = open_board_run(client, asg_env)
    assert (again["runId"], again["code"]) == (first["runId"], first["code"])
    client.post(f"/api/v1/hub/board/runs/{first['runId']}/close", headers=asg_env["board"])
    assert open_board_run(client, asg_env)["runId"] != first["runId"]
