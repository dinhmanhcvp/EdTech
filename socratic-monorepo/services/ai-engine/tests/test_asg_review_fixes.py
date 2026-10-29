"""Hồi quy cho các lỗi tìm ra ở vòng review cuối của backend bài tập."""
import io
import json
import time

import pytest
from PIL import Image

import lesson_llm
from conftest import ASG_SAMPLE, open_board_run
from test_asg_photo import _confirm, _upload, fakes  # noqa: F401


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    monkeypatch.setattr(lesson_llm, "_call_llm", lambda system, user: "Em thử lại nhé?")


def _answer(client, env, run, student=0, **body):
    payload = {"version": 1, "requestId": body.pop("requestId", "r1"), **body}
    return client.post(f"/api/v1/hub/runs/{run['runId']}/answers", json=payload, headers=env["students"][student]["headers"])


# ---------------------------------------------------------------- I1: chép lại đề không được chấm "chắc chắn đúng"
def test_restated_problem_is_not_certainly_correct(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    r = _confirm(client, asg_env, run, pid, ["x + 3 = 5"])
    assert r.json()["status"] == "pending_teacher"


def test_solved_form_still_graded():
    from hub.assignments.grader import grade_final, grade_short
    assert grade_final(["x + 3 = 5", "x = 2"], "x = 2") is True
    assert grade_final(["x = 8"], "x = 2") is False
    assert grade_final(["2x = 4"], "x = 2") is None
    assert grade_short("12", "12") is True and grade_short("13", "12") is False
    assert grade_short("3*4", "12") is None  # chép lại phép tính không phải đáp số


# ---------------------------------------------------------------- I2: lời chấm AI không lộ đáp án khi bài còn mở
def test_student_grade_is_redacted_while_run_open(client, asg_env, fakes, monkeypatch):
    import hub.assignments.grader as gr

    def fake_grade(question, lines, subject):
        return {"status": "GRADED", "first_error": 0, "summary": "Đáp án đúng là x = 2", "final_correct": False,
                "steps": [{"index": 0, "latex": lines[0], "status": "error", "fix": "x = 2", "corrected": "x = 2", "explain": "Sai dấu"}]}

    monkeypatch.setattr(gr, "grade_lines", fake_grade)
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    _confirm(client, asg_env, run, pid, ["x = 8"])
    mine = client.get(f"/api/v1/hub/me/submissions/{pid}", headers=asg_env["students"][0]["headers"])
    grade = mine.json()["grade"]
    assert grade["first_error"] == 0 and "x = 2" not in json.dumps(grade) and "Đáp án đúng" not in mine.text
    board = client.get(f"/api/v1/hub/board/submissions/{pid}", headers=asg_env["board"])
    assert "x = 2" in board.text  # bảng và giáo viên vẫn thấy đủ để chữa


# ---------------------------------------------------------------- I3: gia sư không kiểm đáp án khi bài còn đang làm
def test_run_lesson_blocked_in_class(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    st = asg_env["students"][0]
    r = client.get(f"/api/v1/student/lesson/{st['id']}?run_id={run['runId']}", headers=st["headers"])
    assert r.status_code == 409 and r.json()["detail"] == "run_in_class"


def test_run_lesson_does_not_verify_during_homework(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    client.post(f"/api/v1/hub/board/runs/{run['runId']}/close", headers=asg_env["board"])
    st = asg_env["students"][0]
    lesson = client.get(f"/api/v1/student/lesson/{st['id']}?run_id={run['runId']}", headers=st["headers"]).json()
    q2 = next(s for s in lesson["scenes"] if s["id"] == "q2")["questions"][0]
    body = {"lesson_id": lesson["lesson_id"], "scene_id": "q2", "question_id": q2["id"], "kind": "ANSWER", "message": "12", "request_id": "t1"}
    r = client.post(f"/api/v1/student/lesson/{st['id']}/turn", json=body, headers=st["headers"])
    assert '"status": "UNVERIFIED"' in r.text and "VERIFIED_CORRECT" not in r.text


# ---------------------------------------------------------------- I4: dòng bài tập trong báo cáo phụ huynh có nghĩa
def test_parent_report_counts_skipped_runs_and_survives_ai_comment(client, asg_env, fakes, monkeypatch):
    import hub.reports as rp
    from hub.clock import now
    first = open_board_run(client, asg_env)
    _answer(client, asg_env, first, questionId="q1", choice=1)
    client.post(f"/api/v1/hub/board/runs/{first['runId']}/close", headers=asg_env["board"])  # cùng tiết chỉ có một lượt mở cho mỗi đề
    open_board_run(client, asg_env)  # lượt giao em không làm
    sid = asg_env["students"][0]["id"]
    report = rp.build_report(sid, rp.week_of(now()), use_ai=False)
    assert report["assignments"]["runs"] == 2 and report["assignments"]["onTime"] == 1
    monkeypatch.setattr(rp, "_llm_json", lambda *a, **k: (json.dumps({"comment": "Con học tốt."}), "gemini", "m"))
    with_ai = rp.build_report(sid, rp.week_of(now()), use_ai=True)
    assert with_ai["source"] == "ai" and "Bài tập: 1/1 câu đúng" in with_ai["comment"]


# ---------------------------------------------------------------- nộp trùng requestId cùng lúc không thành lỗi 500
def test_concurrent_same_request_id_returns_same_result(client, asg_env, fakes, monkeypatch):
    import hub.assignments.submissions as sm
    from hub.assignments import runs
    run = runs.get(open_board_run(client, asg_env)["runId"])
    sid = asg_env["students"][0]["id"]
    first = sm.answer(run, sid, "q1", 1, "same", choice=1)
    monkeypatch.setattr(sm, "_by_request", lambda student_id, request_id: None)  # như hai yêu cầu cùng qua bước kiểm tra
    assert sm.answer(run, sid, "q1", 1, "same", choice=1) == first


def test_request_id_reused_in_another_run_conflicts(client, asg_env, fakes):
    a = open_board_run(client, asg_env)
    assert _answer(client, asg_env, a, questionId="q1", choice=1, requestId="x").status_code == 200
    client.post(f"/api/v1/hub/board/runs/{a['runId']}/close", headers=asg_env["board"])  # cùng tiết chỉ có một lượt mở cho mỗi đề
    b = open_board_run(client, asg_env)
    assert _answer(client, asg_env, b, questionId="q1", choice=1, requestId="x").status_code == 409


# ---------------------------------------------------------------- PDF render tuần tự, ảnh quá nhiều điểm ảnh bị từ chối
def test_pdf_render_is_serialised(monkeypatch):
    from hub.assignments import pages
    entered = []

    class Probe:
        def __enter__(self):
            entered.append(1)

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(pages, "_PDF_LOCK", Probe())
    buf = io.BytesIO()
    Image.new("RGB", (100, 140), "white").save(buf, "PDF")
    pages.render(buf.getvalue(), "application/pdf")
    assert entered == [1]


def test_decompression_bomb_rejected(client, asg_env, fakes):
    from hub.assignments import pages
    buf = io.BytesIO()
    Image.new("1", (9000, 9000)).save(buf, "PNG")
    with pytest.raises(ValueError, match="image_too_large"):
        pages.shrink_photo(buf.getvalue())
    run = open_board_run(client, asg_env)
    r = client.post(f"/api/v1/hub/runs/{run['runId']}/photos", data={"questionId": "q3", "version": "1", "requestId": "big"},
                    files={"photo": ("vo.png", buf.getvalue(), "image/png")}, headers=asg_env["students"][0]["headers"])
    assert r.status_code == 413


# ---------------------------------------------------------------- ô tự khai: đáp án có khoảng trắng
def test_quick_key_handles_spaced_equations():
    from hub.assignments.schema import quick_key
    qs = quick_key("1B 2: x + 1 = 5 3: tự luận")
    assert [q["type"] for q in qs] == ["choice", "essay", "open"] and qs[1]["answer"] == "x + 1 = 5"
    assert [q["id"] for q in quick_key("1A\n2= 3 + 4\n3C")] == ["q1", "q2", "q3"]
    assert time.time() > 0 and ASG_SAMPLE
