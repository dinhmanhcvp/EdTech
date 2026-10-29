"""Bài tập trong tiết — Task 7: ảnh vở, OCR, xác nhận, chấm tự luận."""
import io

import pytest
from PIL import Image

from conftest import class_with_students, open_board_run

OCR = {"lines": [{"text": "x + 3 = 5", "latex": "x + 3 = 5", "confidence": 0.9, "y0": 0.1, "y1": 0.2},
                 {"text": "x = 2", "latex": "x = 2", "confidence": 0.6, "y0": 0.3, "y1": 0.4}],
       "uncertain": [{"line": 1, "token": "2", "alternatives": ["Z"], "x": 0.5, "y": 0.35}]}


def _jpeg(w=600, h=400, orientation=None):
    im = Image.new("RGB", (w, h), (240, 240, 240))
    buf = io.BytesIO()
    if orientation:
        exif = Image.Exif(); exif[0x0112] = orientation
        im.save(buf, "JPEG", exif=exif.tobytes())
    else:
        im.save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def fakes(monkeypatch):
    import hub.assignments.grader as gr
    import hub.assignments.jobs as jobs
    import hub.assignments.ocr as ocr
    box = {"ocr": OCR, "graded": []}
    monkeypatch.setattr(ocr, "recognize_image", lambda jpeg: box["ocr"])
    monkeypatch.setattr(jobs, "spawn", lambda fn: fn())

    def fake_grade(question, lines, subject):
        box["graded"].append(lines)
        return {"status": "GRADED", "first_error": None, "summary": "Đúng", "steps": [{"index": i, "latex": l, "status": "ok"} for i, l in enumerate(lines)]}

    monkeypatch.setattr(gr, "grade_lines", fake_grade)
    return box


def _upload(client, env, run, qid="q3", student=0, request_id="p1", data=None):
    return client.post(f"/api/v1/hub/runs/{run['runId']}/photos", data={"questionId": qid, "version": "1", "requestId": request_id},
                       files={"photo": ("vo.jpg", data or _jpeg(), "image/jpeg")}, headers=env["students"][student]["headers"])


def _confirm(client, env, run, photo_id, lines, resolved=(0,), photo_only=False, student=0):
    return client.post(f"/api/v1/hub/runs/{run['runId']}/photos/{photo_id}/confirm",
                       json={"lines": list(lines), "resolved": list(resolved), "photoOnly": photo_only}, headers=env["students"][student]["headers"])


def test_photo_ocr_returns_lines_and_uncertain(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    r = _upload(client, asg_env, run)
    assert r.status_code == 200, r.text
    assert [l["latex"] for l in r.json()["lines"]] == ["x + 3 = 5", "x = 2"] and r.json()["uncertain"][0]["token"] == "2"
    again = _upload(client, asg_env, run)
    assert again.json()["photoId"] == r.json()["photoId"]


def test_confirm_rejects_unresolved_uncertain(client, asg_env, fakes):
    from hub.db import connect
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    r = _confirm(client, asg_env, run, pid, ["x + 3 = 5", "x = 2"], resolved=())
    assert r.status_code == 422 and r.json()["detail"] == "uncertain_unresolved"
    with connect() as conn:
        assert conn.execute("SELECT status FROM submissions WHERE id=?", (pid,)).fetchone()[0] == "draft"


def test_essay_correct_final_line_graded(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    r = _confirm(client, asg_env, run, pid, ["x + 3 = 5", "x = 2"])
    assert r.status_code == 200 and r.json()["status"] == "graded" and r.json()["score"] == 1


def test_essay_wrong_final_line_graded_zero(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    assert _confirm(client, asg_env, run, pid, ["x + 3 = 5", "x = 8"]).json()["score"] == 0


def test_essay_unreadable_final_pending_teacher(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    r = _confirm(client, asg_env, run, pid, ["x + 3 = 5", "vậy x bằng hai"])
    assert r.json()["status"] == "pending_teacher" and r.json()["score"] is None


def test_open_always_pending(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run, qid="q4").json()["photoId"]
    assert _confirm(client, asg_env, run, pid, ["Vì cân bằng hai vế"]).json()["status"] == "pending_teacher"


def test_photo_only_pending(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    assert _confirm(client, asg_env, run, pid, [], resolved=(), photo_only=True).json()["status"] == "pending_teacher"


def test_photo_respects_exif_orientation(client, asg_env, fakes):
    from hub.assignments import files, submissions
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run, data=_jpeg(600, 400, orientation=6)).json()["photoId"]
    im = Image.open(io.BytesIO(files.read("submissions", submissions.get(pid)["photo_path"])))
    assert im.size[1] > im.size[0]


def test_steps_filled_by_background_grade(client, asg_env, fakes):
    from hub.assignments import submissions
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    _confirm(client, asg_env, run, pid, ["x + 3 = 5", "x = 2"])
    assert fakes["graded"] == [["x + 3 = 5", "x = 2"]]
    assert submissions.get(pid)["grade"]["summary"] == "Đúng"


def test_no_ai_ocr_returns_empty_lines(client, asg_env, fakes):
    fakes["ocr"] = None
    run = open_board_run(client, asg_env)
    r = _upload(client, asg_env, run)
    assert r.json()["lines"] == [] and r.json()["uncertain"] == []
    assert _confirm(client, asg_env, run, r.json()["photoId"], ["x = 2"], resolved=()).json()["status"] == "graded"


def test_photo_too_large_413(client, asg_env, fakes, monkeypatch):
    import hub.assignments.submissions as sm
    monkeypatch.setattr(sm, "MAX_PHOTO_BYTES", 100)
    run = open_board_run(client, asg_env)
    assert _upload(client, asg_env, run).status_code == 413


def test_photo_on_choice_question_wrong_mode(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    assert _upload(client, asg_env, run, qid="q1").status_code == 422


def test_submission_photo_only_owner_teacher_board(client, asg_env, fakes):
    run = open_board_run(client, asg_env)
    pid = _upload(client, asg_env, run).json()["photoId"]
    url = f"/api/v1/hub/files/submission/{pid}"
    assert client.get(url, headers=asg_env["students"][0]["headers"]).status_code == 200
    assert client.get(url, headers=asg_env["h"]).status_code == 200
    assert client.get(url, headers=asg_env["board"]).status_code == 200
    assert client.get(url, headers=asg_env["students"][1]["headers"]).status_code == 404
    _, _, others = class_with_students(client, asg_env["h"], "10A4", ("Nam",))
    assert client.get(url, headers=others[0]["headers"]).status_code == 404
