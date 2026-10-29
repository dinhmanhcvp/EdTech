"""Thu bài làm vẽ tay qua BYOD: học sinh nộp nét vẽ, giáo viên nhận; chỉ nộp khi đang thu, bài được kiểm tra chặt."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from main import app
from routers import classroom_ws as cw
from routers.classroom_ws import RoomManager


def targets(out, kind):
    return [m for t, m in out if t == kind]


def stroke(n=3, c="#112233", w=3, y0=10):
    return {"p": [[10.04 + i, y0 + i * 2] for i in range(n)], "c": c, "w": w}


def setup():
    m = RoomManager()
    rid, _ = m.create()
    room = m.get(rid)
    return m, room


# ------------------------------------------------------------------ kiểm tra nét
def test_clean_strokes_normalizes_and_rounds():
    out = cw.clean_strokes([{"p": [[1.234, 2.678], [3, 4]], "c": "#abc", "w": 99}, {"p": [[5, 6]], "c": "đỏ", "w": "x"}])
    assert out[0] == {"p": [[1.2, 2.7], [3.0, 4.0]], "c": "#abc", "w": 12.0}
    assert out[1]["c"] == "#18181B" and out[1]["w"] == 3.0  # màu/độ dày lạ → mặc định, không từ chối cả bài


@pytest.mark.parametrize("bad", [
    None, [], "x", [{"p": []}], [{"p": [[1]]}], [{"p": [[1, 2, 3]]}], [{"p": [["a", 2]]}], [{"p": [[float("nan"), 2]]}],
    [{"p": [[-1, 2]]}], [{"p": [[1, 99999]]}], [{"p": [[True, 2]]}], ["rác"], [{"nop": 1}],
    [{"p": [[1, 2]]}] * (cw.MAX_SUB_STROKES + 1),
    [{"p": [[1, 2]] * (cw.MAX_SUB_STROKE_POINTS + 1)}],
    [{"p": [[1, 2]] * 1000}] * 6,  # tổng điểm quá giới hạn
])
def test_clean_strokes_rejects_malformed_or_oversized(bad):
    assert cw.clean_strokes(bad) is None


def test_max_allowed_submission_fits_in_one_websocket_message():
    # trường hợp xấu nhất: đủ số điểm tối đa, tọa độ dài nhất, mỗi nét vừa đủ — vẫn phải nhỏ hơn giới hạn một thông điệp
    pts = [[3999.9, 3999.9]] * 1000
    ok = cw.clean_strokes([{"p": pts, "c": "#112233", "w": 3}] * 3)
    assert ok is not None and len(json.dumps({"type": "SUBMIT", "strokes": ok})) < cw.MAX_MSG_CHARS


# ------------------------------------------------------------------ luồng thu bài
def test_cannot_submit_before_collecting_or_after_it_closes():
    m, room = setup()
    s, _ = m.student_join(room, "An")
    assert m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]})[0][1]["code"] == "no_open_collect"
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": "Giải phương trình"})
    assert targets(m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]}), "teacher")
    m.on_teacher(room, {"type": "COLLECT_END"})
    assert m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]})[0][1]["code"] == "no_open_collect"
    assert len(room.submissions) == 1  # bài đã nộp vẫn còn sau khi đóng


def test_submit_goes_only_to_teacher_with_name_and_ack_to_student():
    m, room = setup()
    s, _ = m.student_join(room, "Bình")
    other, _ = m.student_join(room, "Chi")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": "x"})
    out = m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]})
    to_teacher = targets(out, "teacher")[0]
    assert to_teacher["type"] == "SUBMISSION" and to_teacher["studentId"] == s and to_teacher["name"] == "Bình" and to_teacher["rev"] == 1
    assert [t for t, _ in out if t not in ("teacher", ("student", s))] == []  # không ai khác nhận được bài
    assert (("student", s), {"type": "SUBMIT_ACK", "rev": 1}) in out
    snap_student = m.snapshot(room, you=other)
    assert "submissions" not in snap_student and snap_student["collect"]["open"] is True


def test_resubmit_replaces_and_bumps_revision():
    m, room = setup()
    s, _ = m.student_join(room, "An")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": ""})
    m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke(2)]})
    out = m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke(5)]})
    assert targets(out, "teacher")[0]["rev"] == 2 and len(room.submissions) == 1
    assert len(room.submissions[s]["strokes"][0]["p"]) == 5


def test_bad_submission_is_rejected_without_losing_the_previous_one():
    m, room = setup()
    s, _ = m.student_join(room, "An")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": ""})
    m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]})
    assert m.on_student(room, s, {"type": "SUBMIT", "strokes": "rác"})[0][1]["code"] == "bad_submission"
    assert room.submissions[s]["rev"] == 1


def test_new_collection_round_clears_old_submissions_and_teacher_snapshot_has_them():
    m, room = setup()
    s, _ = m.student_join(room, "An")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": "Đợt 1"})
    m.on_student(room, s, {"type": "SUBMIT", "strokes": [stroke()]})
    snap = m.snapshot(room, teacher=True)
    assert len(snap["submissions"]) == 1 and snap["collect"]["prompt"] == "Đợt 1"
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": "Đợt 2"})
    assert room.submissions == {} and m.snapshot(room, teacher=True)["submissions"] == []


def test_rejoining_student_replaces_their_old_submission_instead_of_duplicating():
    m, room = setup()
    a1, _ = m.student_join(room, "An")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": ""})
    m.on_student(room, a1, {"type": "SUBMIT", "strokes": [stroke()]})
    m.student_leave(room, a1)  # rớt mạng
    a2, _ = m.student_join(room, "An")
    m.on_student(room, a2, {"type": "SUBMIT", "strokes": [stroke(4)]})
    assert list(room.submissions) == [a2]
    other, _ = m.student_join(room, "An")  # trùng tên nhưng đang kết nối: là người khác, giữ cả hai
    m.on_student(room, other, {"type": "SUBMIT", "strokes": [stroke()]})
    assert len(room.submissions) == 2


def test_prompt_is_trimmed_and_student_cannot_control_collection():
    m, room = setup()
    s, _ = m.student_join(room, "An")
    m.on_teacher(room, {"type": "COLLECT_START", "prompt": "x" * 500})
    assert len(room.collect["prompt"]) == 200
    assert m.on_student(room, s, {"type": "COLLECT_END"})[0][1]["code"] == "unknown_type"
    assert room.collect["open"] is True


# ------------------------------------------------------------------ WebSocket thật
@pytest.fixture
def client():
    return TestClient(app)


def _until(ws, kind):
    for _ in range(20):
        m = ws.receive_json()
        if m["type"] == kind:
            return m
    raise AssertionError(f"không nhận được {kind}")


def test_ws_end_to_end_collect_submit_and_teacher_reconnect_keeps_submissions(client):
    rid = client.post("/api/v1/rooms").json()
    with client.websocket_connect(f"/ws/rooms/{rid['roomId']}?role=teacher&token={rid['teacherToken']}") as t:
        _until(t, "STATE")
        with client.websocket_connect(f"/ws/rooms/{rid['roomId']}?role=student&name=Lan") as s:
            _until(s, "STATE")
            t.send_json({"type": "COLLECT_START", "prompt": "Vẽ đồ thị"})
            got = _until(s, "COLLECT")
            assert got["open"] is True and got["prompt"] == "Vẽ đồ thị"
            s.send_json({"type": "SUBMIT", "strokes": [stroke()]})
            assert _until(s, "SUBMIT_ACK")["rev"] == 1
            sub = _until(t, "SUBMISSION")
            assert sub["name"] == "Lan" and sub["strokes"][0]["c"] == "#112233"
    with client.websocket_connect(f"/ws/rooms/{rid['roomId']}?role=teacher&token={rid['teacherToken']}") as t2:
        snap = _until(t2, "STATE")
        assert len(snap["submissions"]) == 1  # nối lại không mất bài
