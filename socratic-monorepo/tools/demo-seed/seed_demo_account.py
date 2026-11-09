"""Nạp tài khoản giáo viên mẫu đầy đủ vào máy chủ AI đang chạy (qua API thật, chạy lại nhiều lần không nhân đôi):
lớp có học sinh, kệ tài nguyên có trang PDF thật, bài soạn viết tay, giáo án, tiết sắp dạy đã chuẩn bị, tiết đã dạy có bài làm của học sinh.

    python tools/demo-seed/seed_demo_account.py [--api http://127.0.0.1:8000]

Kết quả ghi ra tools/demo-seed/ACCOUNT.md (tài khoản, mã vào app của từng học sinh, link phụ huynh).
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "demo-video"))  # ink.py: nét viết tay giả lập

import ink  # noqa: E402
from content import CLASSES, LESSONS, PLANNED, PLANS, QUESTION_SETS, SLIDES, TAUGHT, TEACHER, UNREVIEWED  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

API = "http://127.0.0.1:8000"
STUDENT_APP = "http://localhost:3002"
CONSOLE_APP = "http://localhost:3003"
BOARD_APP = "http://localhost:3001"


class ApiError(RuntimeError):
    def __init__(self, status: int, detail: str):
        super().__init__(f"{status} {detail}")
        self.status = status


def call(method: str, path: str, body=None, token: str = "", headers=None):
    h = {"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {}), **(headers or {})}
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(), headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read()[:300].decode("utf-8", "replace"))


def upload_pdf(token: str, title: str, subject: str, kind: str, pdf: bytes) -> dict:
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in (("title", title), ("subject", subject), ("kind", kind)):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="tai-lieu.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode() + pdf + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(API + "/api/v1/hub/assignments/upload", method="POST", data=b"".join(parts),
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read()[:300].decode("utf-8", "replace"))


# ------------------------------------------------------------------ vẽ trang PDF (phông có đủ tiếng Việt)
def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = (["arialbd.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"] if bold else ["arial.ttf", "segoeui.ttf", "DejaVuSans.ttf"])
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    raise SystemExit("Không tìm thấy phông Arial/Segoe UI/DejaVu để vẽ chữ tiếng Việt lên PDF.")


HUE = {"PHYSICS": (230, 126, 34), "CHEMISTRY": (39, 160, 110), "MATH": (47, 99, 200), "BIOLOGY": (118, 160, 48)}


def _wrap(d: ImageDraw.ImageDraw, text: str, font, width: int):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if d.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur] if cur else lines


def _diagram(d: ImageDraw.ImageDraw, kind: str, box, c):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    ink_c = (60, 56, 52)
    d.rounded_rectangle(box, 18, fill=(255, 255, 255), outline=(220, 214, 200), width=2)
    pts = lambda f, n=60: [(x0 + 30 + (w - 60) * i / n, f(i / n)) for i in range(n + 1)]
    if kind in ("projectile", "axes"):
        d.line([(x0 + 40, y1 - 40), (x1 - 30, y1 - 40)], fill=ink_c, width=3)
        d.line([(x0 + 40, y1 - 40), (x0 + 40, y0 + 30)], fill=ink_c, width=3)
        curve = pts(lambda t: y0 + 50 + (h - 100) * t * t)
        d.line(curve, fill=c, width=5)
        bx, by = curve[34]
        d.ellipse((bx - 11, by - 11, bx + 11, by + 11), fill=c)
        d.line([(x0 + 60, y0 + 50), (x0 + 170, y0 + 50)], fill=ink_c, width=4)
        d.polygon([(x0 + 170, y0 + 40), (x0 + 192, y0 + 50), (x0 + 170, y0 + 60)], fill=ink_c)
    elif kind == "vectors":
        for k, (dx, dy) in enumerate([(160, -60), (110, 70), (-70, -90)]):
            sx, sy = x0 + w // 2 - 20 + k * 20, y0 + h // 2
            d.line([(sx, sy), (sx + dx, sy + dy)], fill=c if k < 2 else ink_c, width=6)
            d.ellipse((sx + dx - 9, sy + dy - 9, sx + dx + 9, sy + dy + 9), fill=c if k < 2 else ink_c)
    elif kind == "equilibrium":
        d.line([(x0 + 40, y1 - 40), (x1 - 30, y1 - 40)], fill=ink_c, width=3)
        d.line([(x0 + 40, y1 - 40), (x0 + 40, y0 + 30)], fill=ink_c, width=3)
        d.line(pts(lambda t: y0 + 60 + (h - 140) * (1 - (1 - t) ** 3) * 0.55), fill=c, width=5)
        d.line(pts(lambda t: y1 - 60 - (h - 140) * (1 - (1 - t) ** 3) * 0.6), fill=ink_c, width=5)
        d.line([(x0 + w * 0.55, y0 + 30), (x0 + w * 0.55, y1 - 40)], fill=(190, 184, 170), width=2)
    elif kind == "cubic":
        d.line([(x0 + 30, y0 + h // 2), (x1 - 30, y0 + h // 2)], fill=ink_c, width=3)
        d.line([(x0 + w // 2, y0 + 25), (x0 + w // 2, y1 - 25)], fill=ink_c, width=3)
        d.line([(x0 + w // 2 + (i - 30) * (w - 80) / 66, y0 + h // 2 - ((i - 30) / 30) ** 3 * (h * 0.32) + ((i - 30) / 30) * (h * 0.36)) for i in range(61)], fill=c, width=5)
    elif kind == "leaf":
        d.ellipse((x0 + w * 0.2, y0 + h * 0.25, x0 + w * 0.8, y0 + h * 0.8), fill=(150, 200, 90), outline=(80, 130, 40), width=4)
        d.line([(x0 + w * 0.2, y0 + h * 0.52), (x0 + w * 0.8, y0 + h * 0.52)], fill=(80, 130, 40), width=4)
        d.ellipse((x0 + w * 0.78, y0 + 25, x0 + w * 0.78 + 70, y0 + 95), fill=(250, 200, 60))
        d.line([(x0 + w * 0.78, y0 + 100), (x0 + w * 0.62, y0 + h * 0.33)], fill=(250, 170, 40), width=5)


def slide_page(title: str, bullets, kind: str, subject: str, n: int, total: int) -> Image.Image:
    c = HUE[subject]
    im = Image.new("RGB", (1280, 720), (250, 247, 240))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1280, 16), fill=c)
    d.text((70, 60), title, font=_font(54, True), fill=(40, 36, 30))
    y = 190
    for b in bullets:
        for i, line in enumerate(_wrap(d, b, _font(34), 640)):
            d.text((90 if i == 0 else 110, y), ("•  " if i == 0 else "") + line, font=_font(34), fill=(60, 56, 50))
            y += 52
        y += 22
    _diagram(d, kind, (780, 180, 1210, 560), c)
    d.text((70, 670), f"{n}/{total}", font=_font(24), fill=(150, 144, 130))
    return im


def question_pages(title: str, subject: str, kind_label: str, questions) -> tuple[list[Image.Image], list[int]]:
    """Mỗi trang A4 chứa tối đa 3 câu; trả về (trang, chỉ số trang của từng câu)."""
    c = HUE[subject]
    pages, where, i = [], [], 0
    while i < len(questions):
        im = Image.new("RGB", (1131, 1600), (255, 255, 255))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 1131, 14), fill=c)
        d.text((80, 60), title, font=_font(44, True), fill=(30, 30, 30))
        d.text((80, 122), f"{kind_label} · Họ và tên: ______________________   Lớp: ________", font=_font(26), fill=(110, 110, 110))
        y = 220
        for q in questions[i:i + 3]:
            where.append(len(pages))
            d.text((80, y), f"{q['label']}.", font=_font(34, True), fill=(30, 30, 30))
            for line in _wrap(d, q["text"].replace("$", ""), _font(34), 880):
                d.text((190, y), line, font=_font(34), fill=(30, 30, 30))
                y += 50
            for k, o in enumerate(q.get("options") or []):
                d.text((200, y + 6), f"{'ABCD'[k]}. {o}", font=_font(32), fill=(60, 60, 60))
                y += 48
            y += 120 if q["type"] != "choice" else 60
            if q["type"] == "open":
                y += 80
        pages.append(im)
        i += 3
    return pages, where


def to_pdf(pages: list[Image.Image]) -> bytes:
    buf = io.BytesIO()
    pages[0].save(buf, "PDF", save_all=True, append_images=pages[1:], resolution=120)
    return buf.getvalue()


# ------------------------------------------------------------------ nạp dữ liệu
def say(msg: str):
    print(msg, flush=True)


def seed() -> dict:
    try:
        call("POST", "/api/v1/console/register", TEACHER)
        say(f"+ tạo tài khoản {TEACHER['username']}")
    except ApiError as e:
        if e.status not in (409, 422):
            raise
    token = call("POST", "/api/v1/console/login", {"username": TEACHER["username"], "password": TEACHER["password"]})["token"]

    # lớp + học sinh
    existing = {c["name"]: c for c in call("GET", "/api/v1/console/classes", token=token)["classes"]}
    classes = {}
    for spec in CLASSES:
        cls = existing.get(spec["name"]) or call("POST", "/api/v1/console/classes", {k: spec[k] for k in ("name", "grade", "subject", "size", "notes")}, token=token)
        hub_class = call("POST", f"/api/v1/hub/console/classes/{cls['id']}/link", token=token)["hubClassId"]
        roster = call("GET", f"/api/v1/hub/classes/{hub_class}/students", token=token)["students"]
        if not roster:
            roster = call("POST", f"/api/v1/hub/classes/{hub_class}/students", {"names": spec["students"]}, token=token)["students"]
            say(f"+ lớp {spec['name']}: {len(roster)} học sinh")
        for s in roster:
            if not s.get("parentToken"):
                s["parentToken"] = call("POST", f"/api/v1/hub/students/{s['id']}/parent-link", token=token)["parentToken"]
        classes[spec["key"]] = {"id": cls["id"], "hub": hub_class, "name": spec["name"], "subject": spec["subject"], "students": roster}

    # tài nguyên
    have = {a["title"]: a["id"] for a in call("GET", "/api/v1/hub/assignments", token=token)["assignments"]}
    res = dict(have)
    for title, (subject, key, slides) in SLIDES.items():
        if title in have:
            continue
        pages = [slide_page(t, b, k, subject, i + 1, len(slides)) for i, (t, b, k) in enumerate(slides)]
        res[title] = upload_pdf(token, title, subject, "slides", to_pdf(pages))["id"]
        say(f"+ slide: {title}")
    for title, (subject, kind, key, questions) in QUESTION_SETS.items():
        if title in have:
            continue
        pages, where = question_pages(title, subject, "Bài tập" if kind == "exercise" else "Đề kiểm tra", questions)
        aid = upload_pdf(token, title, subject, kind, to_pdf(pages))["id"]
        body = {"title": title, "subject": subject, "kind": kind, "questions": [{**q, "page": where[i]} for i, q in enumerate(questions)]}
        call("PUT", f"/api/v1/hub/assignments/{aid}", {"body": body, "baseVersion": 0}, token=token)
        res[title] = aid
        say(f"+ {'bài tập' if kind == 'exercise' else 'đề'}: {title} ({len(questions)} câu)")
    title, subject, kind, key, lines = UNREVIEWED
    if title not in have:
        pages, _ = question_pages(title, subject, "Đề kiểm tra", [{"label": f"Bài {i + 1}", "text": t.split(". ", 1)[1], "type": "essay"} for i, t in enumerate(lines)])
        res[title] = upload_pdf(token, title, subject, kind, to_pdf(pages))["id"]
        say(f"+ đề chưa duyệt câu: {title}")

    # bài soạn viết tay
    lessons = {l["title"]: l["id"] for l in call("GET", "/api/v1/console/lessons", token=token)["lessons"]}
    for title, folder, lines in LESSONS:
        if title in lessons:
            continue
        pages = []
        for p in range(2):
            strokes = ink.text(lines[0] if p == 0 else f"{lines[0]} (tiếp)", 330, 120, 56)
            for j, line in enumerate(lines[1:]):
                strokes += ink.text(line, 330, 260 + 130 * (j + p), 56)
            pages.append([{"id": f"demo-{p}-{i}", "points": [{"x": round(x - 210, 1), "y": round(y - 12, 1)} for x, y in s], "color": "#18181B", "width": 3} for i, s in enumerate(strokes)])
        lessons[title] = call("POST", "/api/v1/console/lessons", {"title": title, "folder": folder, "pages": pages}, token=token)["id"]
        say(f"+ bài soạn: {title}")

    # giáo án
    plans = {p["title"]: p["id"] for p in call("GET", "/api/v1/hub/plans", token=token)["plans"]}
    for title, spec in PLANS.items():
        if title in plans:
            continue
        plans[title] = call("POST", "/api/v1/hub/plans", {"body": {"title": title, **spec}}, token=token)["id"]
        say(f"+ giáo án: {title}")

    # tiết sắp dạy
    catalog = {s["id"] for s in call("GET", "/api/v1/console/sim-catalog", token=token)["sims"]}
    periods = {p["title"]: p for p in call("GET", "/api/v1/console/periods", token=token)["periods"]}
    for spec in PLANNED:
        if spec["title"] in periods:
            continue
        missing = [s for s in spec["sims"] if s not in catalog]
        assert not missing, f"mô phỏng không có trong danh mục: {missing}"
        call("POST", "/api/v1/console/periods", {
            "title": spec["title"], "class_id": classes[spec["class"]]["id"], "lesson_id": lessons[spec["lesson"]], "goals": spec["goals"], "notes": spec["notes"],
            "prompts": spec["prompts"], "resource_ids": [res[t] for t in spec["resources"]], "sims": spec["sims"], "plan_id": plans[spec["plan"]]}, token=token)
        say(f"+ tiết sắp dạy: {spec['title']}")

    # tiết đã dạy có bài làm của học sinh
    for k, spec in enumerate(TAUGHT):
        if spec["title"] in periods:
            continue
        taught(token, spec, classes[spec["class"]], lessons[spec["lesson"]], res[spec["resource"]], k)
        say(f"+ tiết đã dạy có bài làm: {spec['title']}")
    return {"token": token, "classes": classes}


def taught(token: str, spec: dict, cls: dict, lesson_id: str, assignment_id: str, k: int):
    period = call("POST", "/api/v1/console/periods", {"title": spec["title"], "class_id": cls["id"], "lesson_id": lesson_id, "goals": "Tiết đã dạy: có bài tập và kết quả của học sinh."}, token=token)
    code = call("POST", f"/api/v1/console/periods/{period['id']}/start", token=token)["pairCode"]
    board = call("POST", "/api/v1/board/pair", {"code": code})["boardToken"]
    run = call("POST", "/api/v1/hub/board/runs", {"assignmentId": assignment_id}, headers={"X-Board-Token": board})
    questions = call("GET", f"/api/v1/hub/assignments/{assignment_id}", token=token)
    # tự luận cần ảnh chụp bài và câu mở không chấm, nên chỉ nộp trắc nghiệm và trả lời ngắn
    version, qs = questions["version"], [q for q in questions["body"]["questions"] if q["type"] in ("choice", "short")]
    try:
        answer_all(cls, run["runId"], version, qs, k)
    finally:  # lỗi giữa chừng cũng không để tiết kẹt ở trạng thái đang dạy
        if spec["close_run"]:  # đóng + hạn đã qua: học sinh học lại với gia sư ngay (đóng thường chỉ mở hạn nộp 3 ngày)
            call("POST", f"/api/v1/hub/runs/{run['runId']}/close", token=token)
            call("PUT", f"/api/v1/hub/runs/{run['runId']}", {"dueAt": time.time() - 60}, token=token)
        call("POST", f"/api/v1/console/periods/{period['id']}/end", token=token)


def answer_all(cls: dict, run_id: str, version: int, qs: list, k: int):
    n = len(cls["students"])
    # em đầu làm tốt nhất, em cuối yếu nhất (sai liên tiếp để hiện "cần hỗ trợ"); hai em cuối chưa nộp ở tiết đầu
    for i, s in enumerate(cls["students"][: n - (2 if k == 0 else 0)]):
        st = call("POST", "/api/v1/hub/auth/student", {"loginCode": s["loginCode"]})["token"]
        strength = 1 - i / max(1, n - 1)
        for j, q in enumerate(qs):
            right = ((j * 7 + i * 3) % 10) / 10 < 0.15 + 0.85 * strength
            if q["type"] == "choice":
                ans = int(q["answer"])
                body = {"choice": ans if right else (ans + 1) % len(q["options"])}
            else:
                body = {"text": q["answer"] if right else "0"}
            call("POST", f"/api/v1/hub/runs/{run_id}/answers", {"questionId": q["id"], "version": version, "requestId": f"seed-{run_id}-{s['id']}-{q['id']}", **body}, token=st)


def write_account(state: dict):
    lines = [
        "# Tài khoản mẫu để demo (tạo bởi `tools/demo-seed/seed_demo_account.py`)",
        "",
        f"- Trang quản lý: {CONSOLE_APP}  ·  Bảng: {BOARD_APP}  ·  App học sinh: {STUDENT_APP}  ·  Máy chủ AI: {API}",
        f"- Đăng nhập: `{TEACHER['username']}` / `{TEACHER['password']}`  ({TEACHER['display_name']})",
        "",
        "## Lớp, mã vào app học sinh và link phụ huynh",
    ]
    for c in state["classes"].values():
        lines += ["", f"### {c['name']} ({c['subject']})", "", "| Học sinh | Mã vào app | Link phụ huynh |", "|---|---|---|"]
        for s in c["students"]:
            lines.append(f"| {s['name']} | `{s['loginCode']}` | {STUDENT_APP}/parent/{s['parentToken']} |")
    lines += ["", "## Luồng thử đẩy qua lớp học", "",
              "1. Trang quản lý → **Tiết học** → mở một tiết chưa dạy (ví dụ *Tiết 25 – Chuyển động ném ngang*): bài soạn, tài nguyên, mô phỏng và giáo án đã gắn sẵn.",
              "2. Bấm **Bắt đầu tiết** để lấy mã ghép; trên bảng bấm **Ghép tiết**, nhập mã. Nút **Chuẩn bị của tiết** hiện ra.",
              "3. Giao bài bằng mã QR, vào app học sinh bằng mã ở bảng trên và nộp bài; xem lưới bài làm ở trang quản lý.",
              "4. **Kết thúc tiết**; học sinh xem lại ở tab *Lớp của em*.",
              "5. Tiết *(đã dạy)* của mỗi lớp đã có bài làm sẵn để xem **chỉ số lớp** (Lớp → biểu đồ), **báo cáo phụ huynh** và tab *Lớp của em*."]
    with open(os.path.join(HERE, "ACCOUNT.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=API)
    API = ap.parse_args().api.rstrip("/")
    state = seed()
    write_account(state)
    say(f"Xong. Xem tools/demo-seed/ACCOUNT.md (đăng nhập {TEACHER['username']} / {TEACHER['password']}).")
