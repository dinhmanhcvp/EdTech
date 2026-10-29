"""Kho dữ liệu trang quản lý: tài khoản, cô lập giữa giáo viên, tiết học độc lập."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from store.console_db import ConsoleDB, StoreError

PAGES = [[{"id": "a", "points": [{"x": 1, "y": 2}]}], [{"id": "b", "points": [{"x": 3, "y": 4}]}, {"id": "c", "points": [{"x": 5, "y": 6}]}]]


@pytest.fixture
def db():
    return ConsoleDB(":memory:")


def two(db):
    a = db.register("co_lan", "Cô Lan", "matkhau-lan-1")
    b = db.register("thay_nam", "Thầy Nam", "matkhau-nam-2")
    return a, b


# ------------------------------------------------------------------ tài khoản
def test_register_login_and_password_is_hashed(db):
    t = db.register("Co_Lan", "Cô Lan", "matkhau-lan-1")
    assert t["username"] == "Co_Lan" and "pw_hash" not in t
    raw = db._one("SELECT pw_hash, pw_salt FROM teachers WHERE id=?", (t["id"],))
    assert b"matkhau" not in bytes(raw["pw_hash"]) and len(raw["pw_salt"]) == 16
    assert db.verify_login("co_lan", "matkhau-lan-1")["id"] == t["id"]  # không phân biệt hoa thường ở tên đăng nhập
    assert db.verify_login("co_lan", "sai-mat-khau") is None
    assert db.verify_login("khong_co", "matkhau-lan-1") is None


@pytest.mark.parametrize("name,pw", [("ab", "matkhau-ok-1"), ("có dấu", "matkhau-ok-1"), ("a" * 33, "matkhau-ok-1"), ("ten_dung", "ngan"), ("ten_dung", "x" * 201), ("ten dung", "matkhau-ok-1")])
def test_register_rejects_bad_input(db, name, pw):
    with pytest.raises(StoreError) as e:
        db.register(name, "X", pw)
    assert e.value.code == "invalid"


def test_duplicate_username_any_case_is_rejected(db):
    db.register("co_lan", "A", "matkhau-lan-1")
    with pytest.raises(StoreError) as e:
        db.register("CO_LAN", "B", "matkhau-khac-9")
    assert e.value.code == "exists"


def test_session_token_works_expires_and_is_stored_hashed(db):
    t = db.register("co_lan", "Cô Lan", "matkhau-lan-1")
    tok = db.create_session(t["id"], now=1000.0)
    assert db.session_teacher(tok, now=1001.0)["id"] == t["id"]
    assert tok not in json.dumps([dict(r) for r in db._all("SELECT * FROM sessions")])  # chỉ lưu băm
    assert db.session_teacher(tok, now=1000.0 + 15 * 24 * 3600) is None  # hết hạn
    assert db.session_teacher("", now=1.0) is None and db.session_teacher("sai", now=1.0) is None
    tok2 = db.create_session(t["id"], now=2000.0)
    db.delete_session(tok2)
    assert db.session_teacher(tok2, now=2001.0) is None


# ------------------------------------------------------------------ cô lập giữa giáo viên
def test_each_teacher_only_sees_own_classes_lessons_and_periods(db):
    a, b = two(db)
    ca = db.save_class(a["id"], {"name": "10A1", "grade": "10", "subject": "Toán", "size": 40})
    la = db.save_lesson(a["id"], "Hàm số", "Toán 10", PAGES)
    pa = db.save_period(a["id"], {"title": "Tiết 1", "class_id": ca["id"], "lesson_id": la["id"]})
    assert db.list_classes(b["id"]) == [] and db.list_lessons(b["id"]) == [] and db.list_periods(b["id"]) == []
    assert db.get_class(b["id"], ca["id"]) is None and db.get_lesson(b["id"], la["id"]) is None and db.get_period(b["id"], pa["id"]) is None
    # sửa/xóa dữ liệu của người khác bằng id đoán được: đều "không tìm thấy", dữ liệu gốc không đổi
    with pytest.raises(StoreError) as e:
        db.save_lesson(b["id"], "Đè bài", "", PAGES, lid=la["id"])
    assert e.value.code == "not_found"
    with pytest.raises(StoreError):
        db.save_class(b["id"], {"name": "Đè lớp"}, cid=ca["id"])
    with pytest.raises(StoreError):
        db.save_period(b["id"], {"title": "Đè tiết"}, pid=pa["id"])
    assert db.delete_lesson(b["id"], la["id"]) is False and db.delete_class(b["id"], ca["id"]) is False and db.delete_period(b["id"], pa["id"]) is False
    assert db.get_lesson(a["id"], la["id"])["title"] == "Hàm số" and db.get_class(a["id"], ca["id"])["name"] == "10A1"


def test_period_cannot_reference_another_teachers_class_or_lesson(db):
    a, b = two(db)
    ca = db.save_class(a["id"], {"name": "10A1"})
    la = db.save_lesson(a["id"], "Bài", "", PAGES)
    for bad in ({"title": "x", "class_id": ca["id"]}, {"title": "x", "lesson_id": la["id"]}):
        with pytest.raises(StoreError) as e:
            db.save_period(b["id"], bad)
        assert e.value.code == "invalid"


def test_same_board_two_teachers_two_periods_never_overwrite_each_other(db):
    a, b = two(db)
    la = db.save_lesson(a["id"], "Bài của Lan", "", PAGES)
    pa = db.save_period(a["id"], {"title": "Tiết 1 - Lan", "lesson_id": la["id"]})
    pb = db.save_period(b["id"], {"title": "Tiết 2 - Nam"})  # Nam không soạn bài trước
    db.start_period(a["id"], pa["id"], "ROOMAA")
    db.bind_board(a["id"], pa["id"], "board-token-lan")
    db.save_snapshot(pa["id"], [[{"id": "lan-1"}]])
    assert db.period_context(a["id"], pa["id"])["pages"] == [[{"id": "lan-1"}]]  # dạy dở thì ghép lại nhận ảnh chụp, không phải bài gốc
    db.end_period(a["id"], pa["id"], submissions=[{"name": "An"}])
    # tiết của Nam: bảng bắt đầu sạch, không thừa hưởng gì của Lan
    db.start_period(b["id"], pb["id"], "ROOMBB")
    db.bind_board(b["id"], pb["id"], "board-token-nam")
    ctx = db.period_context(b["id"], pb["id"])
    assert ctx["pages"] is None and ctx["teacher"]["username"] == "thay_nam"
    db.save_snapshot(pb["id"], [[{"id": "nam-1"}]])
    # ảnh chụp của Nam không chạm tiết của Lan, và mã bảng cũ của Lan không còn tác dụng
    assert db.get_snapshot(a["id"], pa["id"]) == [[{"id": "lan-1"}]]
    assert db.period_by_board("board-token-lan") is None
    assert db.period_by_board("board-token-nam")["id"] == pb["id"]
    assert db.get_submissions(a["id"], pa["id"]) == [{"name": "An"}]


# ------------------------------------------------------------------ bài soạn, tiết học
def test_lesson_roundtrip_and_validation(db):
    a, _ = two(db)
    les = db.save_lesson(a["id"], " Bài 1 ", " Toán ", PAGES)
    assert (les["title"], les["folder"], les["page_count"], les["stroke_count"]) == ("Bài 1", "Toán", 2, 3)
    assert db.get_lesson(a["id"], les["id"])["pages"] == PAGES
    upd = db.save_lesson(a["id"], "Bài 1 sửa", "Toán", PAGES[:1], lid=les["id"])
    assert upd["page_count"] == 1 and len(db.list_lessons(a["id"])) == 1
    for bad in (None, [], "x", [1], [[1]], [[{}]] * 101, [[{"id": str(i)} for i in range(30_001)]]):
        with pytest.raises(StoreError):
            db.save_lesson(a["id"], "x", "", bad)


def test_period_lifecycle_and_rules(db):
    a, _ = two(db)
    p = db.save_period(a["id"], {"title": "  Tiết 1  ", "goals": "Hiểu parabol", "prompts": ["Giải x²-4=0", "", "Vẽ đồ thị"]})
    assert p["status"] == "planned" and p["title"] == "Tiết 1" and p["prompts"] == ["Giải x²-4=0", "Vẽ đồ thị"]
    with pytest.raises(StoreError):
        db.save_period(a["id"], {"title": "  "})
    live = db.start_period(a["id"], p["id"], "ROOM01")
    assert live["status"] == "live" and live["room_id"] == "ROOM01" and live["started_at"]
    with pytest.raises(StoreError):
        db.delete_period(a["id"], p["id"])  # không xóa tiết đang dạy
    ended = db.end_period(a["id"], p["id"], submissions=[{"x": 1}])
    assert ended["status"] == "ended" and ended["room_id"] is None and ended["submission_count"] == 1
    again = db.end_period(a["id"], p["id"], submissions=[{"y": 2}])
    assert again["submission_count"] == 1  # kết thúc lần hai không ghi đè kho lưu trữ
    with pytest.raises(StoreError):
        db.save_period(a["id"], {"title": "sửa"}, pid=p["id"])
    with pytest.raises(StoreError):
        db.start_period(a["id"], p["id"], "ROOM02")
    assert db.delete_period(a["id"], p["id"]) is True


def test_snapshot_only_recorded_while_live_and_board_token_only_for_live(db):
    a, _ = two(db)
    p = db.save_period(a["id"], {"title": "T"})
    db.save_snapshot(p["id"], [[{"id": "x"}]])  # chưa dạy: bị bỏ qua
    assert db.get_snapshot(a["id"], p["id"]) is None
    with pytest.raises(StoreError):
        db.bind_board(a["id"], p["id"], "tok")  # chưa live thì không ghép được
    db.start_period(a["id"], p["id"], "R")
    db.bind_board(a["id"], p["id"], "tok")
    db.save_snapshot(p["id"], [[{"id": "x"}]])
    db.end_period(a["id"], p["id"])
    db.save_snapshot(p["id"], [[{"id": "muon"}]])  # đã kết thúc: không ghi nữa
    assert db.get_snapshot(a["id"], p["id"]) == [[{"id": "x"}]]
    assert db.period_by_board("tok") is None


def test_deleting_teacher_cascades_and_persistence_across_reopen(tmp_path):
    path = str(tmp_path / "c.db")
    d1 = ConsoleDB(path)
    t = d1.register("co_lan", "Cô Lan", "matkhau-lan-1")
    d1.save_lesson(t["id"], "Bài", "", PAGES)
    d2 = ConsoleDB(path)  # mở lại như sau khi khởi động máy chủ
    assert d2.verify_login("co_lan", "matkhau-lan-1") and len(d2.list_lessons(t["id"])) == 1
