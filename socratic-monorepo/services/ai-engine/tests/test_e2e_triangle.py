"""Vòng tam giác đầy đủ: đỉnh 1 (console + hub) chuẩn bị → đỉnh 2 (bảng) giao bài, chữa → đỉnh 3 (học sinh) nộp, nhận gói
→ chỉ số về đỉnh 1 và báo cáo phụ huynh. Chỉ OCR và chấm từng bước AI được giả lập."""
from conftest import ASG_SAMPLE, class_with_students, console_login, live_board, tiny_pdf
from test_asg_photo import _confirm, _upload, fakes  # noqa: F401

HUB = "/api/v1/hub"


def test_full_triangle_loop(client, fakes):
    # Đỉnh 1: giáo viên đăng ký console, tạo lớp có học sinh, tải đề PDF, AI/giáo viên tách câu.
    h = console_login(client)
    cid, hub_class, students = class_with_students(client, h)
    lan, minh = students
    up = client.post(f"{HUB}/assignments/upload", data={"title": "Phương trình", "subject": "MATH", "kind": "exercise"},
                     files={"file": ("de.pdf", tiny_pdf(), "application/pdf")}, headers=h)
    assert up.status_code == 200, up.text
    aid = up.json()["id"]
    assert client.put(f"{HUB}/assignments/{aid}", json={"body": ASG_SAMPLE, "baseVersion": 0}, headers=h).status_code == 200

    # Đỉnh 2: bảng ghép tiết, mở đề (ghi nhận tài nguyên của tiết), giao bài qua QR.
    pid, board = live_board(client, h, cid)
    assert aid in [a["id"] for a in client.get(f"{HUB}/board/assignments", headers=board).json()["assignments"]]
    assert client.post(f"{HUB}/board/resources/{aid}/open", headers=board).status_code == 200
    run = client.post(f"{HUB}/board/runs", json={"assignmentId": aid}, headers=board).json()
    env = {"students": students}

    # Đỉnh 3: học sinh quét mã, thấy đề không có đáp án, làm trắc nghiệm, gõ đáp số, chụp vở.
    seen = client.get(f"{HUB}/runs/by-code/{run['code']}", headers=lan["headers"]).json()
    assert seen["phase"] == "in_class" and all("answer" not in q for q in seen["body"]["questions"])
    ans = lambda who, rid, **b: client.post(f"{HUB}/runs/{run['runId']}/answers", json={"version": 1, "requestId": rid, **b}, headers=who["headers"]).json()
    assert ans(lan, "a1", questionId="q1", choice=1)["score"] == 1
    assert ans(lan, "a2", questionId="q2", text="12")["score"] == 1
    photo = _upload(client, env, run, qid="q3").json()
    assert _confirm(client, env, run, photo["photoId"], ["x + 3 = 5", "x = 2"]).json()["status"] == "graded"
    open_photo = _upload(client, env, run, qid="q4", student=1, request_id="m4").json()
    assert _confirm(client, env, run, open_photo["photoId"], ["vì cộng hai vế với số đối"], student=1).json()["status"] == "pending_teacher"

    # Giáo viên thấy tên trên lưới, duyệt câu mở; bảng chỉ thấy bài ẩn danh và chiếu bài được chọn.
    grid = client.get(f"{HUB}/runs/{run['runId']}/submissions", headers=h).json()["submissions"]
    assert {r["name"] for r in grid} == {"Lan", "Minh"}
    assert client.post(f"{HUB}/submissions/{open_photo['photoId']}/review", json={"score": 1}, headers=h).json()["status"] == "teacher_confirmed"
    anon = client.get(f"{HUB}/board/runs/{run['runId']}/submissions", headers=board).json()["submissions"]
    assert anon and all("studentId" not in r and "name" not in r for r in anon)
    assert client.post(f"{HUB}/runs/{run['runId']}/show", json={"submissionId": photo["photoId"]}, headers=h).status_code == 200

    # Hết tiết: lượt giao thành bài về nhà, Minh làm tiếp ở nhà; học sinh nhận gói cuối tiết.
    assert client.post(f"/api/v1/console/periods/{pid}/end", headers=h).status_code == 200
    assert client.get(f"{HUB}/runs/by-code/{run['code']}", headers=minh["headers"]).json()["phase"] == "homework"
    assert ans(minh, "m1", questionId="q1", choice=0)["score"] == 0
    assert {r["phase"] for r in client.get(f"{HUB}/runs/{run['runId']}/submissions", headers=h).json()["submissions"]} == {"in_class", "homework"}
    periods = client.get(f"{HUB}/me/periods", headers=lan["headers"]).json()["periods"]
    assert [p["periodId"] for p in periods] == [pid]
    assert periods[0]["runs"][0]["runId"] == run["runId"] and periods[0]["runs"][0]["score10"] is not None
    assert [r["assignmentId"] for r in periods[0]["resources"]] == [aid]

    # Về đỉnh 1: tổng kết tiết, chỉ số học sinh (sự kiện học tập → BKT), báo cáo phụ huynh.
    summary = client.get(f"{HUB}/console/periods/{pid}/summary", headers=h).json()
    assert summary["pending"] == 0 and [r["runId"] for r in summary["runs"]] == [run["runId"]]
    m = client.get(f"{HUB}/classes/{hub_class}/students/{lan['id']}/metrics", headers=h).json()
    assert m["done"] >= 3 and "math-phuong-trinh" in m["mastery"]
    token = client.post(f"{HUB}/students/{lan['id']}/parent-link", headers=h).json()["parentToken"]
    report = client.get(f"{HUB}/parent/{token}/report").json()
    assert report["student"] == {"name": "Lan", "className": "10A3"}
    week = report["thisWeek"]
    assert week["assignments"]["runs"] == 1 and week["assignments"]["correct"] == week["assignments"]["total"] >= 3
    assert "Bài tập" in week["comment"]
