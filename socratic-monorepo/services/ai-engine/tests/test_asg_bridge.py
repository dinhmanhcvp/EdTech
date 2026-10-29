"""Bài tập trong tiết — Task 1: nối console (teammate) với hub."""
import pytest

from conftest import console_class, console_login, live_board


def test_console_session_reaches_hub_teacher_routes(client):
    h = console_login(client)
    r = client.get("/api/v1/hub/me/teacher", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["teacher"]["id"].startswith("ct-")


def test_console_session_token_with_dots_still_accepted(client, monkeypatch):
    from store import console_db
    counter = iter(range(1000))
    monkeypatch.setattr(console_db.secrets, "token_urlsafe", lambda n=32: f"v1.teacher.gv-demo.9999999999.fake{next(counter)}")
    h = console_login(client, "codau")
    assert client.get("/api/v1/hub/me/teacher", headers=h).status_code == 200


def test_link_class_creates_hub_class_once(client):
    h = console_login(client)
    cid = console_class(client, h)
    a = client.post(f"/api/v1/hub/console/classes/{cid}/link", headers=h)
    b = client.post(f"/api/v1/hub/console/classes/{cid}/link", headers=h)
    assert a.status_code == 200 and a.json() == b.json()
    hub_class = a.json()["hubClassId"]
    assert hub_class.startswith("cc-")
    r = client.get(f"/api/v1/hub/classes/{hub_class}/students", headers=h)
    assert r.status_code == 200 and r.json()["students"] == []


def test_link_other_teachers_class_404(client):
    owner = console_login(client, "gv-mot")
    cid = console_class(client, owner)
    assert client.post(f"/api/v1/hub/console/classes/{cid}/link", headers=owner).status_code == 200
    other = console_login(client, "gv-hai")
    assert client.post(f"/api/v1/hub/console/classes/{cid}/link", headers=other).status_code == 404


def test_board_context_from_board_token(client):
    from hub.assignments import bridge
    h = console_login(client)
    cid = console_class(client, h)
    pid, board = live_board(client, h, cid)
    ctx = bridge.board_context(board["X-Board-Token"])
    assert ctx["period"]["id"] == pid and ctx["hubTeacherId"].startswith("ct-") and ctx["hubClassId"].startswith("cc-")
    client.post(f"/api/v1/console/periods/{pid}/end", headers=h)
    with pytest.raises(KeyError):
        bridge.board_context(board["X-Board-Token"])


def test_board_context_without_class(client):
    from hub.assignments import bridge
    h = console_login(client)
    _, board = live_board(client, h, None)
    assert bridge.board_context(board["X-Board-Token"])["hubClassId"] is None


def test_hub_pin_login_impossible_for_console_teacher(client):
    from hub.auth import login_teacher
    h = console_login(client)
    tid = client.get("/api/v1/hub/me/teacher", headers=h).json()["teacher"]["id"]
    assert login_teacher(tid, "") is None and login_teacher(tid, "2468") is None
