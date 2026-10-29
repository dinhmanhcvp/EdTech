"""DỮ LIỆU MẪU cho các cảnh quay có số liệu thống kê/báo cáo (người dùng yêu cầu dùng tạm số liệu mẫu cho video).
Chỉ dùng khi ghi cảnh: chặn đúng lời gọi API tương ứng và trả về dữ liệu dưới đây; giao diện là giao diện thật, không đổi mã ứng dụng."""
import json

PARENT_REPORT = {
    "student": {"name": "Hoàng Lan Anh", "className": "12A1"},
    "lastWeek": {
        "week": "2026-W43", "lessons": ["Phương trình bậc nhất"], "activeDays": 3, "minutes": 65, "done": 14,
        "improved": [], "needsHelp": ["Quy tắc chuyển vế"], "tips": [], "comment": "", "source": "template",
        "vsLastWeek": {"minutesDelta": 0, "activeDaysDelta": 0}, "assignments": {"correct": 5, "total": 8, "runs": 2, "onTime": 2},
    },
    "thisWeek": {
        "week": "2026-W44",
        "lessons": ["Phương trình bậc nhất", "Tích phân cơ bản", "Dao động con lắc đơn"],
        "activeDays": 4, "minutes": 95, "done": 23,
        "improved": ["Quy tắc chuyển vế", "Phương trình bậc nhất"],
        "needsHelp": ["Tích phân cơ bản"],
        "tips": ["Khen con vì đã học đều đặn 4 buổi trong tuần.",
                 "Hỏi con giải thích lại vì sao chuyển vế phải đổi dấu.",
                 "Nhắc con mở lại bài Tích phân trước tiết sau."],
        "comment": "Tuần này con học 4 ngày, khoảng 95 phút, làm 23 câu. Con tiến bộ rõ ở quy tắc chuyển vế; phần tích phân cần luyện thêm. Bài tập: 9/11 câu đúng; nộp đúng hạn 3/3 lượt.",
        "source": "template", "vsLastWeek": {"minutesDelta": 30, "activeDaysDelta": 1},
        "assignments": {"correct": 9, "total": 11, "runs": 3, "onTime": 3},
    },
}


def use_sample_parent_report(page):
    page.route("**/api/v1/hub/parent/*/report", lambda route: route.fulfill(
        status=200, content_type="application/json", body=json.dumps(PARENT_REPORT, ensure_ascii=False)))


# ---------------------------------------------------------------- lưới bài làm trong tiết (trang quản lý, UI-B3)
CLASS_12A1 = ["Hoàng Lan Anh", "Nguyễn Minh", "Lê An", "Trần Bảo", "Phạm Hà", "Đỗ Kha",
              "Vũ Thảo", "Bùi Nam", "Đặng Linh", "Ngô Huy", "Phan Mai", "Lý Tâm"]
QUESTIONS = [("q1", "Câu 1", "choice"), ("q2", "Câu 2", "typed"), ("q3", "Câu 3", "choice"), ("q4", "Câu 4", "photo")]


def _all_rows():
    import random

    rng = random.Random(12)
    rows = []
    for si, name in enumerate(CLASS_12A1):
        sid = f"s-mau{si:02d}"
        for qid, label, mode in QUESTIONS:
            if si == 11 and qid == "q4":
                continue  # một em chưa nộp câu 4
            if mode == "photo":
                ok = rng.random() < 0.55
                status = "pending_teacher" if si in (2, 6, 9) else "graded"
                lines = ["2x - 4 = 6", "2x = 6 + 4" if ok else "2x = 6 - 4", "x = 5" if ok else "x = 1"]
                rows.append({"studentId": sid, "name": name, "questionId": qid, "mode": "photo", "status": status,
                             "score": None if status == "pending_teacher" else (1 if ok else 0), "attempt": 1, "phase": "in_class",
                             "answer": None, "confirmed": lines, "ocr": None, "grade": {"summary": "Lập luận đúng hướng"}, "hasPhoto": True})
            else:
                ok = rng.random() < (0.8 if si != 5 else 0.0)
                wrong = {"q1": "-5", "q2": "4", "q3": "-4"}[qid]
                right = {"q1": "5", "q2": "3", "q3": "+4"}[qid]
                rows.append({"studentId": sid, "name": name, "questionId": qid, "mode": mode, "status": "graded", "score": 1 if ok else 0,
                             "attempt": 1 if ok or rng.random() < 0.5 else 2, "phase": "in_class", "answer": right if ok else wrong,
                             "confirmed": None, "ocr": None, "grade": None, "hasPhoto": False})
    order = list(range(len(rows)))
    rng.shuffle(order)
    out = [rows[i] for i in order]
    for k, r in enumerate(out):
        r["submissionId"] = f"sub-mau-{k:03d}"
    return out


def _metrics(rows):
    n = len(CLASS_12A1)
    qs = []
    for qid, label, _ in QUESTIONS:
        rs = [r for r in rows if r["questionId"] == qid]
        graded = [r for r in rs if r["score"] is not None]
        wrong = {}
        for r in graded:
            if r["score"] == 0 and r["answer"]:
                wrong[r["answer"]] = wrong.get(r["answer"], 0) + 1
        qs.append({"questionId": qid, "label": label, "submittedRate": len(rs) / n,
                   "correctRate": (sum(r["score"] for r in graded) / len(graded)) if graded else None,
                   "firstTryRate": (sum(1 for r in graded if r["score"] == 1 and r["attempt"] == 1) / len(graded)) if graded else None,
                   "wrongAnswers": [{"answer": a, "count": c} for a, c in sorted(wrong.items(), key=lambda x: -x[1])],
                   "pending": sum(1 for r in rs if r["status"] == "pending_teacher")})
    students = []
    for si, name in enumerate(CLASS_12A1):
        mine = [r for r in rows if r["studentId"] == f"s-mau{si:02d}"]
        graded = [r for r in mine if r["score"] is not None]
        students.append({"studentId": f"s-mau{si:02d}", "name": name,
                         "score10": round(10 * sum(r["score"] for r in graded) / len(QUESTIONS), 1) if graded else None,
                         "pending": sum(1 for r in mine if r["status"] == "pending_teacher"), "done": len(mine)})
    return {"runId": "run-mau", "questions": qs, "students": students}


def use_sample_assignment_grid(page, period_id: str, start_count: int = 6, per_step: int = 3, step_s: float = 1.8):
    """Lưới bài làm mẫu đến dần theo thời gian (như học sinh đang nộp), tổng kết tiết và luồng sự kiện cho trang quản lý."""
    import time

    rows_all = _all_rows()
    t0 = [None]
    reviewed = {}

    def shown():
        if t0[0] is None:
            t0[0] = time.monotonic()
        k = min(len(rows_all), start_count + int((time.monotonic() - t0[0]) / step_s) * per_step)
        rows = [dict(r) for r in rows_all[:k]]
        for r in rows:
            if r["submissionId"] in reviewed:
                r["status"], r["score"] = "teacher_confirmed", reviewed[r["submissionId"]]
        return rows

    def summary(route):
        rows = shown()
        m = _metrics(rows)
        body = {"periodId": period_id, "pending": sum(1 for r in rows if r["status"] == "pending_teacher"), "resources": [],
                "needsSupport": [{"studentId": "s-mau05", "name": CLASS_12A1[5], "reasons": ["three_wrong_in_a_row"]}] if len(rows) > 20 else [],
                "runs": [{"runId": "run-mau", "code": "K7Q2M9XA", "url": "", "assignmentId": "asg-mau", "classId": "cc-mau", "periodId": period_id,
                          "openedAt": 0, "closedAt": None, "dueAt": None, "phase": "in_class",
                          "title": "Luyện tập phương trình bậc nhất", "metrics": m}]}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body, ensure_ascii=False))

    def submissions(route):
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"submissions": shown()}, ensure_ascii=False))

    def review(route):
        sub_id = route.request.url.rstrip("/").split("/")[-2]
        reviewed[sub_id] = json.loads(route.request.post_data or "{}").get("score", 1)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"submissionId": sub_id, "status": "teacher_confirmed"}))

    def stream(route):
        route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body='data: {"type": "submission_update"}\n\n')

    page.route("**/api/v1/hub/console/periods/*/summary", summary)
    page.route("**/api/v1/hub/runs/run-mau/submissions", submissions)
    page.route("**/api/v1/hub/submissions/*/review", review)
    page.route("**/api/v1/hub/runs/run-mau/show", lambda route: route.fulfill(status=200, content_type="application/json", body="{}"))
    page.route("**/api/v1/hub/stream/teacher", stream)
