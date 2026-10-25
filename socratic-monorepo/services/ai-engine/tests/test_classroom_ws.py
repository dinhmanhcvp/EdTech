"""Kiểm thử phòng học BYOD: lõi RoomManager (thuần) + giao thức WebSocket thật qua TestClient."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from main import app
from routers import classroom_ws as cw
from routers.classroom_ws import RoomManager


def targets(out, kind):
    return [m for t, m in out if t == kind]


# ------------------------------------------------------------------ lõi thuần
def test_create_room_ids_are_readable_and_unique():
    m = RoomManager()
    ids = {m.create()[0] for _ in range(50)}
    assert len(ids) == 50
    assert all(len(i) == 6 and not set(i) & set("O0I1") for i in ids)


def test_student_join_and_roster():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    sid, out = m.student_join(room, "  Nguyễn <b>Văn</b> A\x00 ")
    name = room.students[sid]
    assert name.startswith("Nguyễn") and "<" not in name and ">" not in name and chr(0) not in name
    teacher_msg = targets(out, "teacher")[0]
    assert teacher_msg["count"] == 1 and teacher_msg["students"][0]["id"] == sid
    assert "students" not in targets(out, "students")[0]  # học sinh không thấy tên bạn khác


def test_slider_reaches_students_and_is_validated():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    out = m.on_teacher(room, {"type": "SLIDER", "key": "v0", "value": 35.5})
    assert targets(out, "students") == [{"type": "SYNC", "key": "v0", "value": 35.5, "by": "teacher"}]
    assert room.params == {"v0": 35.5}
    for bad in ({"key": "1bad", "value": 1}, {"key": "v0", "value": float("inf")}, {"key": "v0", "value": "9"}, {"key": "v0", "value": True}, {"key": "a" * 40, "value": 1}):
        out = m.on_teacher(room, {"type": "SLIDER", **bad})
        assert targets(out, "teacher")[0]["code"] == "bad_param", bad


def test_only_delegated_student_can_interact():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    a, _ = m.student_join(room, "A")
    b, _ = m.student_join(room, "B")
    deny = m.on_student(room, a, {"type": "INTERACT", "key": "alpha", "value": 60})
    assert deny[0][1]["code"] == "not_in_control" and "alpha" not in room.params
    grant = m.on_teacher(room, {"type": "DELEGATE", "studentId": a})
    assert grant[0][0] == "all" and grant[0][1]["studentId"] == a and grant[0][1]["name"] == "A"
    ok = m.on_student(room, a, {"type": "INTERACT", "key": "alpha", "value": 60})
    assert ok[0][0] == "everyone_but" and room.params["alpha"] == 60
    assert m.on_student(room, b, {"type": "INTERACT", "key": "alpha", "value": 10})[0][1]["code"] == "not_in_control"
    # thu hồi quyền
    m.on_teacher(room, {"type": "DELEGATE", "studentId": None})
    assert room.control is None
    # giao cho người không tồn tại
    assert targets(m.on_teacher(room, {"type": "DELEGATE", "studentId": "SXXXXXX"}), "teacher")[0]["code"] == "unknown_student"


def test_control_is_revoked_when_the_delegate_leaves():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    a, _ = m.student_join(room, "A")
    m.on_teacher(room, {"type": "DELEGATE", "studentId": a})
    out = m.student_leave(room, a)
    assert room.control is None
    assert out[0][1] == {"type": "CONTROL", "studentId": None, "name": None}


def test_poll_flow_percentages_and_revote():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    s1, _ = m.student_join(room, "A")
    s2, _ = m.student_join(room, "B")
    s3, _ = m.student_join(room, "C")
    assert targets(m.on_teacher(room, {"type": "POLL_START", "question": "Góc nào xa nhất?", "options": ["30°", "45°", "60°", "45°"]}), "all")[0]["options"] == ["30°", "45°", "60°"]
    assert m.on_student(room, s1, {"type": "VOTE", "choice": "99°"})[0][1]["code"] == "bad_choice"
    m.on_student(room, s1, {"type": "VOTE", "choice": "45°"})
    m.on_student(room, s2, {"type": "VOTE", "choice": "45°"})
    out = m.on_student(room, s3, {"type": "VOTE", "choice": "60°"})
    live = targets(out, "teacher")[0]
    assert live["counts"] == {"30°": 0, "45°": 2, "60°": 1} and live["percents"]["45°"] == 67 and live["final"] is False
    m.on_student(room, s3, {"type": "VOTE", "choice": "45°"})  # đổi ý, vẫn mỗi người một phiếu
    assert m.poll_result(room, False)["counts"]["45°"] == 3
    end = m.on_teacher(room, {"type": "POLL_END"})
    assert [t for t, _ in end] == ["all", "all"] and end[1][1]["final"] is True
    assert m.on_student(room, s1, {"type": "VOTE", "choice": "30°"})[0][1]["code"] == "no_open_poll"


def test_bad_poll_and_blueprint_rejected():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    assert targets(m.on_teacher(room, {"type": "POLL_START", "question": "", "options": ["a", "b"]}), "teacher")[0]["code"] == "bad_poll"
    assert targets(m.on_teacher(room, {"type": "POLL_START", "question": "q", "options": ["chỉ một"]}), "teacher")[0]["code"] == "bad_poll"
    assert targets(m.on_teacher(room, {"type": "BLUEPRINT", "blueprint": "x"}), "teacher")[0]["code"] == "bad_blueprint"
    assert targets(m.on_teacher(room, {"type": "BLUEPRINT", "blueprint": {"pad": "x" * 70_000}}), "teacher")[0]["code"] == "bad_blueprint"


def test_new_blueprint_resets_params_and_control_and_late_joiner_gets_snapshot():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    a, _ = m.student_join(room, "A")
    m.on_teacher(room, {"type": "DELEGATE", "studentId": a})
    m.on_teacher(room, {"type": "SLIDER", "key": "v0", "value": 20})
    m.on_teacher(room, {"type": "BLUEPRINT", "blueprint": {"templateId": "PHYS_PROJECTILE"}})
    assert room.params == {} and room.control is None
    m.on_teacher(room, {"type": "SLIDER", "key": "v0", "value": 33})
    late, _ = m.student_join(room, "Muộn")
    snap = m.snapshot(room, you=late)
    assert snap["blueprint"]["templateId"] == "PHYS_PROJECTILE" and snap["params"] == {"v0": 33} and snap["youId"] == late


def test_room_capacity_and_ttl_cleanup():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    for i in range(cw.MAX_STUDENTS):
        assert m.student_join(room, f"HS{i}")[0]
    sid, out = m.student_join(room, "dư")
    assert sid is None and out[0][1]["code"] == "room_full"
    room.last_active -= cw.ROOM_TTL_S + 5
    m.create()
    assert rid not in m.rooms


# ------------------------------------------------------------------ WebSocket thật
@pytest.fixture
def client():
    cw.manager.rooms.clear()
    cw.hub.teacher.clear()
    cw.hub.students.clear()
    return TestClient(app)


def _make_room(client):
    j = client.post("/api/v1/rooms").json()
    return j["roomId"], j["teacherToken"]


def test_ws_end_to_end_slider_delegate_poll(client):
    rid, tok = _make_room(client)
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={tok}") as t:
        st = t.receive_json()
        assert st["type"] == "STATE" and st["role"] == "teacher"
        assert t.receive_json()["type"] == "ROSTER"  # roster sau khi vào
        with client.websocket_connect(f"/ws/rooms/{rid}?name=Lan") as s:
            snap = s.receive_json()
            assert snap["type"] == "STATE" and snap["youId"].startswith("S")
            sid = snap["youId"]
            assert s.receive_json() == {"type": "ROSTER", "count": 1, "control": None}
            roster = t.receive_json()
            assert roster["type"] == "ROSTER" and roster["students"][0]["name"] == "Lan"

            t.send_json({"type": "SLIDER", "key": "v0", "value": 35.5})
            assert s.receive_json() == {"type": "SYNC", "key": "v0", "value": 35.5, "by": "teacher"}

            s.send_json({"type": "INTERACT", "key": "alpha", "value": 60})
            assert s.receive_json()["code"] == "not_in_control"

            t.send_json({"type": "DELEGATE", "studentId": sid})
            assert s.receive_json()["type"] == "CONTROL" and t.receive_json()["studentId"] == sid
            s.send_json({"type": "INTERACT", "key": "alpha", "value": 60})
            sync = t.receive_json()
            assert sync["type"] == "SYNC" and sync["key"] == "alpha" and sync["value"] == 60 and sync["byName"] == "Lan"

            t.send_json({"type": "POLL_START", "question": "Chọn", "options": ["A", "B"]})
            assert s.receive_json()["type"] == "POLL" and t.receive_json()["type"] == "POLL"
            assert t.receive_json()["type"] == "POLL_RESULT"
            s.send_json({"type": "VOTE", "choice": "B"})
            assert s.receive_json() == {"type": "VOTE_ACK", "choice": "B"}
            assert t.receive_json()["percents"] == {"A": 0, "B": 100}


def test_ws_teacher_needs_valid_token_and_unknown_room_rejected(client):
    rid, tok = _make_room(client)
    with pytest.raises(WebSocketDisconnect) as e:
        with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token=sai"):
            pass
    assert e.value.code == 4401
    with pytest.raises(WebSocketDisconnect) as e2:
        with client.websocket_connect("/ws/rooms/ZZZZZZ?name=x"):
            pass
    assert e2.value.code == 4404
    assert client.get("/api/v1/rooms/ZZZZZZ").status_code == 404
    assert client.get(f"/api/v1/rooms/{rid}").json()["students"] == 0


def test_ws_student_cannot_impersonate_teacher_messages(client):
    rid, tok = _make_room(client)
    with client.websocket_connect(f"/ws/rooms/{rid}?name=Gian") as s:
        s.receive_json()
        s.receive_json()
        s.send_json({"type": "SLIDER", "key": "v0", "value": 99})  # lệnh của giáo viên
        assert s.receive_json()["code"] == "unknown_type"
        assert cw.manager.get(rid).params == {}
        s.send_text("không phải json")
        assert s.receive_json()["code"] == "bad_json"


def test_ws_late_joiner_gets_current_blueprint_and_teacher_status(client):
    rid, tok = _make_room(client)
    with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={tok}") as t:
        t.receive_json()
        t.receive_json()
        t.send_json({"type": "BLUEPRINT", "blueprint": {"templateId": "PHYS_PROJECTILE"}})
        with client.websocket_connect(f"/ws/rooms/{rid}?name=Muộn") as s:
            snap = s.receive_json()
            assert snap["blueprint"] == {"templateId": "PHYS_PROJECTILE"} and snap["teacherOnline"] is True
            s.receive_json()
        # học sinh thấy giáo viên rời
    with client.websocket_connect(f"/ws/rooms/{rid}?name=Sau") as s2:
        assert s2.receive_json()["teacherOnline"] is False


def test_ws_close_notifies_students_and_removes_room(client):
    rid, tok = _make_room(client)
    with client.websocket_connect(f"/ws/rooms/{rid}?name=Hà") as s:
        s.receive_json()
        s.receive_json()
        with client.websocket_connect(f"/ws/rooms/{rid}?role=teacher&token={tok}") as t:
            t.receive_json()
            t.receive_json()
            assert s.receive_json() == {"type": "TEACHER_STATUS", "online": True}
            s.receive_json()  # roster tới học sinh
            t.send_json({"type": "CLOSE"})
            assert s.receive_json() == {"type": "CLOSED"}
    assert client.get(f"/api/v1/rooms/{rid}").status_code == 404
