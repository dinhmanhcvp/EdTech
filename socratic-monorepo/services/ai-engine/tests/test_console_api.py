"""Trang quản lý giáo viên qua HTTP + WebSocket: đăng nhập, cô lập, tiết học, ghép bảng, console điều khiển lớp, ẩn tên khỏi bảng chiếu."""
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import console as cs

PAGES = [[{"id": "a", "points": [{"x": 1, "y": 2}], "color": "#111", "width": 3}]]
STROKE = {"p": [[10, 10], [50, 60]], "c": "#112233", "w": 3}


@pytest.fixture
def client():
    cs._PAIR.clear()
    return TestClient(app)


def signup(client, username, name=None, pw="matkhau-123"):
    r = client.post("/api/v1/console/register", json={"username": username, "password": pw, "display_name": name or username})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ------------------------------------------------------------------ tài khoản
def test_register_login_me_logout(client):
    h = signup(client, "co_lan", "Cô Lan")
    assert client.get("/api/v1/console/me", headers=h).json()["teacher"]["display_name"] == "Cô Lan"
    assert client.post("/api/v1/console/login", json={"username": "CO_LAN", "password": "matkhau-123"}).status_code == 200
    assert client.post("/api/v1/console/login", json={"username": "co_lan", "password": "sai-roi-nha"}).status_code == 401
    assert client.post("/api/v1/console/logout", headers=h).status_code == 200
    assert client.get("/api/v1/console/me", headers=h).status_code == 401  # mã đăng nhập đã hủy


def test_register_validation_duplicate_and_invite_code(client, monkeypatch):
    assert client.post("/api/v1/console/register", json={"username": "ab", "password": "matkhau-123"}).status_code == 422
    signup(client, "co_lan")
    assert client.post("/api/v1/console/register", json={"username": "Co_Lan", "password": "matkhau-123"}).status_code == 409
    monkeypatch.setenv("CONSOLE_INVITE_CODE", "TRUONG-2026")
    assert client.post("/api/v1/console/register", json={"username": "thay_nam", "password": "matkhau-123"}).status_code == 403
    assert client.post("/api/v1/console/register", json={"username": "thay_nam", "password": "matkhau-123", "invite_code": "TRUONG-2026"}).status_code == 200


@pytest.mark.parametrize("path", ["/api/v1/console/classes", "/api/v1/console/lessons", "/api/v1/console/periods", "/api/v1/console/me"])
def test_endpoints_require_login(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer khong-co"}).status_code == 401


# ------------------------------------------------------------------ cô lập qua HTTP
def test_teachers_cannot_touch_each_others_data_over_http(client):
    a, b = signup(client, "co_lan"), signup(client, "thay_nam")
    cid = client.post("/api/v1/console/classes", json={"name": "10A1"}, headers=a).json()["id"]
    lid = client.post("/api/v1/console/lessons", json={"title": "Bài của Lan", "pages": PAGES}, headers=a).json()["id"]
    pid = client.post("/api/v1/console/periods", json={"title": "Tiết 1", "class_id": cid, "lesson_id": lid}, headers=a).json()["id"]
    for method, path in (("get", f"/lessons/{lid}"), ("get", f"/periods/{pid}"), ("get", f"/periods/{pid}/record"), ("delete", f"/lessons/{lid}"), ("delete", f"/classes/{cid}"), ("delete", f"/periods/{pid}"),
                         ("post", f"/periods/{pid}/start"), ("post", f"/periods/{pid}/end"), ("get", f"/periods/{pid}/live")):
        assert getattr(client, method)("/api/v1/console" + path, headers=b).status_code == 404, path
    assert client.put(f"/api/v1/console/lessons/{lid}", json={"title": "Đè", "pages": PAGES}, headers=b).status_code == 404
    assert client.get("/api/v1/console/lessons", headers=b).json()["lessons"] == []
    assert client.get(f"/api/v1/console/lessons/{lid}", headers=a).json()["title"] == "Bài của Lan"  # nguyên vẹn


def test_lesson_body_validation(client):
    h = signup(client, "co_lan")
    assert client.post("/api/v1/console/lessons", json={"title": "x", "pages": []}, headers=h).status_code == 422
    assert client.post("/api/v1/console/lessons", json={"title": "x", "pages": "rác"}, headers=h).status_code == 422
    assert client.post("/api/v1/console/lessons", json={"title": "x", "pages": PAGES}, headers=h).status_code == 200


# ------------------------------------------------------------------ vòng đời tiết + ghép bảng
def make_period(client, h, title="Tiết 1", **extra):
    return client.post("/api/v1/console/periods", json={"title": title, **extra}, headers=h).json()["id"]


def go_live(client, h, pid):
    r = client.post(f"/api/v1/console/periods/{pid}/start", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def pair(client, code, prev=""):
    return client.post("/api/v1/board/pair", json={"code": code, "previous_board_token": prev})


def test_period_start_pair_snapshot_end_flow(client):
    h = signup(client, "co_lan", "Cô Lan")
    lid = client.post("/api/v1/console/lessons", json={"title": "Hàm số", "pages": PAGES}, headers=h).json()["id"]
    cid = client.post("/api/v1/console/classes", json={"name": "10A1", "grade": "10", "subject": "Toán", "size": 40}, headers=h).json()["id"]
    pid = make_period(client, h, goals="Hiểu parabol", prompts=["Giải x²-4=0"], class_id=cid, lesson_id=lid)
    start = go_live(client, h, pid)
    assert start["period"]["status"] == "live" and len(start["pairCode"]) == 6
    r = pair(client, start["pairCode"].lower())  # không phân biệt hoa thường
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["pages"] == PAGES and b["class"]["name"] == "10A1" and b["teacher"]["display_name"] == "Cô Lan"
    assert b["period"]["goals"] == "Hiểu parabol" and b["period"]["prompts"] == ["Giải x²-4=0"] and b["roomId"] == start["roomId"]
    assert pair(client, start["pairCode"]).status_code == 404  # mã dùng một lần
    bh = {"X-Board-Token": b["boardToken"]}
    assert client.get("/api/v1/board/status", headers=bh).json()["periodId"] == pid
    new_pages = [[{"id": "z", "points": [{"x": 9, "y": 9}], "color": "#000", "width": 3}]]
    assert client.put("/api/v1/board/snapshot", json={"pages": new_pages}, headers=bh).status_code == 200
    # ghép lại giữa tiết (làm mới trang bảng): nhận ảnh chụp đang dạy dở, không phải bài gốc
    again = pair(client, client.post(f"/api/v1/console/periods/{pid}/start", headers=h).json()["pairCode"]).json()
    assert again["pages"] == new_pages and again["resumed"] is True
    assert client.post(f"/api/v1/console/periods/{pid}/end", headers=h).json()["status"] == "ended"
    assert client.put("/api/v1/board/snapshot", json={"pages": PAGES}, headers=bh).status_code == 410  # mã bảng hết hiệu lực
    rec = client.get(f"/api/v1/console/periods/{pid}/record", headers=h).json()
    assert rec["pages"] == new_pages and rec["period"]["status"] == "ended"
    assert client.post(f"/api/v1/console/periods/{pid}/start", headers=h).status_code == 422  # tiết đã kết thúc không mở lại


def test_board_resume_after_page_refresh_returns_latest_snapshot_without_new_code(client):
    h = signup(client, "co_lan")
    lid = client.post("/api/v1/console/lessons", json={"title": "Bài", "pages": PAGES}, headers=h).json()["id"]
    pid = make_period(client, h, lesson_id=lid)
    b = pair(client, go_live(client, h, pid)["pairCode"]).json()
    bh = {"X-Board-Token": b["boardToken"]}
    work = [[{"id": "w", "points": [{"x": 1, "y": 1}], "color": "#000", "width": 3}]]
    client.put("/api/v1/board/snapshot", json={"pages": work}, headers=bh)
    r = client.get("/api/v1/board/resume", headers=bh)
    assert r.status_code == 200
    d = r.json()
    assert d["pages"] == work and d["resumed"] is True and d["roomId"] == b["roomId"] and d["boardToken"] == b["boardToken"]
    assert client.get("/api/v1/board/resume", headers={"X-Board-Token": "sai"}).status_code == 410
    client.post(f"/api/v1/console/periods/{pid}/end", headers=h)
    assert client.get("/api/v1/board/resume", headers=bh).status_code == 410  # hết tiết thì không khôi phục được


def test_pair_code_expiry_wrong_code_and_ended_period(client, monkeypatch):
    h = signup(client, "co_lan")
    pid = make_period(client, h)
    code = go_live(client, h, pid)["pairCode"]
    assert pair(client, "XXXXXX").status_code == 404
    cs._PAIR[code]["exp"] = time.time() - 1
    assert pair(client, code).status_code == 404  # hết hạn
    code2 = go_live(client, h, pid)["pairCode"]
    client.post(f"/api/v1/console/periods/{pid}/end", headers=h)
    assert pair(client, code2).status_code == 404  # tiết đã kết thúc thì mã bị thu hồi


def test_one_valid_pair_code_per_period(client):
    h = signup(client, "co_lan")
    pid = make_period(client, h)
    c1 = go_live(client, h, pid)["pairCode"]
    c2 = go_live(client, h, pid)["pairCode"]
    assert pair(client, c1).status_code == 404 and pair(client, c2).status_code == 200


def test_same_board_next_teacher_starts_clean_and_previous_period_is_closed(client):
    lan, nam = signup(client, "co_lan", "Cô Lan"), signup(client, "thay_nam", "Thầy Nam")
    lid = client.post("/api/v1/console/lessons", json={"title": "Bài của Lan", "pages": PAGES}, headers=lan).json()["id"]
    p1 = make_period(client, lan, "Tiết 1 - Lan", lesson_id=lid)
    b1 = pair(client, go_live(client, lan, p1)["pairCode"]).json()
    h1 = {"X-Board-Token": b1["boardToken"]}
    lan_work = [[{"id": "lan-work", "points": [{"x": 1, "y": 1}], "color": "#000", "width": 3}]]
    client.put("/api/v1/board/snapshot", json={"pages": lan_work}, headers=h1)
    # Lan quên kết thúc; tiết sau Nam tới, ghép CÙNG bảng (bảng gửi kèm mã cũ của nó)
    p2 = make_period(client, nam, "Tiết 2 - Nam")
    b2 = pair(client, go_live(client, nam, p2)["pairCode"], prev=b1["boardToken"]).json()
    assert b2["pages"] is None and b2["teacher"]["display_name"] == "Thầy Nam"  # bắt đầu sạch, không thừa hưởng gì của Lan
    assert client.put("/api/v1/board/snapshot", json={"pages": lan_work}, headers=h1).status_code == 410  # mã bảng cũ vô hiệu
    assert client.get(f"/api/v1/console/periods/{p1}", headers=lan).json()["status"] == "ended"  # tiết của Lan được khép lại
    assert client.get(f"/api/v1/console/periods/{p1}/record", headers=lan).json()["pages"] == lan_work  # công việc của Lan được cất nguyên vẹn
    client.put("/api/v1/board/snapshot", json={"pages": [[{"id": "nam-work", "points": [{"x": 2, "y": 2}], "color": "#000", "width": 3}]]}, headers={"X-Board-Token": b2["boardToken"]})
    assert client.get(f"/api/v1/console/periods/{p1}/record", headers=lan).json()["pages"] == lan_work  # công việc của Nam không đè lên
    assert client.get(f"/api/v1/console/periods/{p2}/record", headers=nam).json()["pages"][0][0]["id"] == "nam-work"


def test_board_saves_lesson_into_the_teacher_who_is_teaching(client):
    lan, nam = signup(client, "co_lan"), signup(client, "thay_nam")
    p = make_period(client, lan)
    b = pair(client, go_live(client, lan, p)["pairCode"]).json()
    r = client.post("/api/v1/board/lessons", json={"title": "Từ bảng", "pages": PAGES}, headers={"X-Board-Token": b["boardToken"]})
    assert r.status_code == 200
    assert [x["title"] for x in client.get("/api/v1/console/lessons", headers=lan).json()["lessons"]] == ["Từ bảng"]
    assert client.get("/api/v1/console/lessons", headers=nam).json()["lessons"] == []
    assert client.post("/api/v1/board/lessons", json={"title": "x", "pages": PAGES}, headers={"X-Board-Token": "sai"}).status_code == 410


def test_cannot_delete_live_period_but_can_after_end(client):
    h = signup(client, "co_lan")
    pid = make_period(client, h)
    go_live(client, h, pid)
    assert client.delete(f"/api/v1/console/periods/{pid}", headers=h).status_code == 422
    client.post(f"/api/v1/console/periods/{pid}/end", headers=h)
    assert client.delete(f"/api/v1/console/periods/{pid}", headers=h).status_code == 200


# ------------------------------------------------------------------ WebSocket: console, bảng, học sinh
def _until(ws, kind, limit=25):
    for _ in range(limit):
        m = ws.receive_json()
        if m["type"] == kind:
            return m
    raise AssertionError(f"không nhận được {kind}")


def open_live(client, h):
    pid = make_period(client, h)
    start = go_live(client, h, pid)
    board = pair(client, start["pairCode"]).json()
    live = client.get(f"/api/v1/console/periods/{pid}/live", headers=h).json()
    return pid, board, live


def test_ws_console_sees_names_board_does_not_and_show_is_anonymous(client):
    h = signup(client, "co_lan")
    pid, board, live = open_live(client, h)
    rid = live["roomId"]
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={board['roomToken']}") as bd, client.websocket_connect(f"/ws/rooms/{rid}?role=console&token={live['token']}") as con:
        assert _until(bd, "STATE")["role"] == "teacher"
        assert _until(con, "STATE")["role"] == "console"
        with client.websocket_connect(f"/ws/rooms/{rid}?role=student&name=Nguyễn Văn An") as st:
            _until(st, "STATE")
            roster_console = _until(con, "ROSTER")
            while not roster_console.get("students"):
                roster_console = _until(con, "ROSTER")
            assert roster_console["students"][0]["name"] == "Nguyễn Văn An"  # trang quản lý thấy tên
            roster_board = _until(bd, "ROSTER")
            while roster_board["count"] != 1:
                roster_board = _until(bd, "ROSTER")
            assert roster_board["count"] == 1 and "students" not in roster_board  # bảng chiếu chỉ biết sĩ số
            con.send_json({"type": "COLLECT_START", "prompt": "Vẽ đồ thị"})
            assert _until(st, "COLLECT")["open"] is True
            st.send_json({"type": "SUBMIT", "strokes": [STROKE]})
            assert _until(st, "SUBMIT_ACK")["rev"] == 1
            sub = _until(con, "SUBMISSION")
            assert sub["name"] == "Nguyễn Văn An"
            con.send_json({"type": "SHOW", "studentId": sub["studentId"], "label": "Bài 1"})
            shown = _until(bd, "SHOW_SUBMISSION")
            assert shown["label"] == "Bài 1" and shown["strokes"][0]["c"] == "#112233"
            assert "name" not in shown and "Nguyễn" not in str(shown)  # không có tên học sinh trên bảng


def test_console_is_told_when_the_board_connects_and_leaves(client):
    h = signup(client, "co_lan")
    pid, board, live = open_live(client, h)
    rid = live["roomId"]
    with client.websocket_connect(f"/ws/rooms/{rid}?role=console&token={live['token']}") as con:
        assert _until(con, "STATE")["teacherOnline"] is False
        with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={board['roomToken']}") as bd:
            _until(bd, "STATE")
            assert _until(con, "TEACHER_STATUS")["online"] is True  # nút Chiếu mở khóa
        assert _until(con, "TEACHER_STATUS")["online"] is False


def test_ws_board_never_receives_submission_names_in_managed_room(client):
    h = signup(client, "co_lan")
    pid, board, live = open_live(client, h)
    rid = live["roomId"]
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={board['roomToken']}") as bd, client.websocket_connect(f"/ws/rooms/{rid}?role=console&token={live['token']}") as con:
        _until(bd, "STATE")
        _until(con, "STATE")
        with client.websocket_connect(f"/ws/rooms/{rid}?role=student&name=Trần Bình") as st:
            _until(st, "STATE")
            con.send_json({"type": "COLLECT_START", "prompt": ""})
            _until(st, "COLLECT")
            st.send_json({"type": "SUBMIT", "strokes": [STROKE]})
            _until(con, "SUBMISSION")
            con.send_json({"type": "COLLECT_END"})
            seen = []
            for _ in range(10):  # đọc hết những gì bảng đã nhận tới lúc này
                m = bd.receive_json()
                seen.append(m)
                if m["type"] == "COLLECT" and not m["open"]:
                    break
            assert all(m["type"] != "SUBMISSION" for m in seen)
            assert "Trần Bình" not in str(seen)


def test_ws_console_requires_token_and_managed_room_and_close_is_refused(client):
    h = signup(client, "co_lan")
    pid, board, live = open_live(client, h)
    rid = live["roomId"]
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/rooms/{rid}?role=console&token=sai"):
            pass
    legacy = client.post("/api/v1/rooms").json()  # phòng cũ (không thuộc tiết): console không vào được
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/rooms/{legacy['roomId']}?role=console&token={legacy['teacherToken']}"):
            pass
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={board['roomToken']}") as bd:
        _until(bd, "STATE")
        bd.send_json({"type": "CLOSE"})
        assert _until(bd, "ERROR")["code"] == "use_console"
        bd.send_json({"type": "PING"})  # phòng vẫn sống sau khi bị từ chối CLOSE
    assert client.get(f"/api/v1/console/periods/{pid}/live", headers=h).status_code == 200


def test_ending_period_notifies_everyone_archives_submissions_and_closes_room(client):
    h = signup(client, "co_lan")
    pid, board, live = open_live(client, h)
    rid = live["roomId"]
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={board['roomToken']}") as bd, client.websocket_connect(f"/ws/rooms/{rid}?role=console&token={live['token']}") as con:
        _until(bd, "STATE")
        _until(con, "STATE")
        with client.websocket_connect(f"/ws/rooms/{rid}?role=student&name=An") as st:
            _until(st, "STATE")
            con.send_json({"type": "COLLECT_START", "prompt": ""})
            _until(st, "COLLECT")
            st.send_json({"type": "SUBMIT", "strokes": [STROKE]})
            _until(con, "SUBMISSION")
            assert client.post(f"/api/v1/console/periods/{pid}/end", headers=h).json()["status"] == "ended"
            _until(st, "CLOSED")
            _until(bd, "CLOSED")
    rec = client.get(f"/api/v1/console/periods/{pid}/record", headers=h).json()
    assert [(s["name"], s["rev"]) for s in rec["submissions"]] == [("An", 1)]  # bài học sinh được lưu theo tiết
    assert client.get(f"/api/v1/console/periods/{pid}/live", headers=h).status_code == 404
