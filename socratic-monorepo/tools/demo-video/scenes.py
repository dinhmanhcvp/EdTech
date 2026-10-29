"""Kịch bản thao tác cho từng cảnh quay (kịch bản bản 3, 29/10/2026). Mỗi cảnh: hàm nhận (page, rec, ctx) và tự thao tác như người dùng."""
from __future__ import annotations

import json
import os
from typing import Callable, Dict

from recorder import Recorder

import ink

BOARD = "http://localhost:3001"
STUDENT = "http://localhost:3002"
CONSOLE = "http://localhost:3003"

HIDE_DEV = "nextjs-portal{display:none!important}"


def open_board(page, url: str = BOARD):
    page.goto(url, wait_until="networkidle")
    page.add_style_tag(content=HIDE_DEV)
    page.wait_for_timeout(1200)


AI_PATHS = ("compile-lasso", "recognize-ink", "grade-steps", "lesson-notes", "ask-board", "grade-solution", "evaluate-step")
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai-cache")


def ai_cache(page, scene_id: str):
    """Câu trả lời AI thật được lưu theo cảnh và thứ tự gọi; lần ghi sau phát lại đúng câu trả lời đó (không chờ, không đổi kết quả).
    Xóa ai-cache/<cảnh>/ để lấy câu trả lời mới."""
    folder = os.path.join(CACHE_DIR, scene_id)
    os.makedirs(folder, exist_ok=True)
    counter: Dict[str, int] = {}

    def handle(route, request):
        name = next((p for p in AI_PATHS if p in request.url), None)
        if not name or request.method != "POST":
            return route.continue_()
        n = counter.get(name, 0)
        counter[name] = n + 1
        path = os.path.join(folder, f"{name}-{n}.json")
        if os.path.exists(path):
            saved = json.load(open(path, encoding="utf-8"))
            return route.fulfill(status=saved["status"], headers={"content-type": saved["type"], "access-control-allow-origin": "*"}, body=saved["body"])
        resp = route.fetch(timeout=90000)
        body = resp.text()
        if resp.ok:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"status": resp.status, "type": resp.headers.get("content-type", "application/json"), "body": body}, f, ensure_ascii=False)
        route.fulfill(response=resp, body=body)

    page.route("**/api/v1/**", handle)


def seed_cache(scene_id: str, items):
    """Dùng lại câu trả lời AI đã lưu của cảnh khác cho phần chuẩn bị: [(cảnh nguồn, tệp nguồn, tên đích)]."""
    import shutil

    folder = os.path.join(CACHE_DIR, scene_id)
    os.makedirs(folder, exist_ok=True)
    for src_scene, src, dst in items:
        s, d = os.path.join(CACHE_DIR, src_scene, src + ".json"), os.path.join(folder, dst + ".json")
        if os.path.exists(s) and not os.path.exists(d):
            shutil.copyfile(s, d)


def tap(page, test_id: str, settle: float = 0.6):
    page.get_by_test_id(test_id).click()
    page.wait_for_timeout(int(settle * 1000))


def probe(page, ctx, name: str):
    """Ảnh kiểm tra + danh sách nút đang hiện (để dò và soát cảnh)."""
    page.screenshot(path=f"{ctx['shots']}/{name}.png")
    rows = []
    for e in page.query_selector_all("button, input, a"):
        if e.is_visible():
            bb = e.bounding_box() or {}
            rows.append(f"{e.get_attribute('data-testid')} {e.inner_text()[:40]!r} {[round(v) for v in bb.values()]}")
    with open(f"{ctx['shots']}/{name}.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(rows))


def drag(page, a, b, ms: int = 900, steps: int = 40):
    page.mouse.move(*a)
    page.mouse.down()
    for i in range(1, steps + 1):
        page.mouse.move(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps)
        page.wait_for_timeout(ms // steps)
    page.mouse.up()


def scene_06_07(page, rec, ctx):
    """06: vẽ lập phương sáu nét → Chọn → khoanh → Vẽ hình. 07: xoay ~40°, Khai triển, Cắt ngang kéo thanh cắt."""
    open_board(page)
    rec.start()
    rec.hold(1.2)
    ink.draw(page, ink.cube(820, 380, 260), speed=800, pause=0.25)
    rec.hold(0.8)
    probe(page, ctx, "06-drawn")
    tap(page, "tool-lasso", 0.4)
    ink.draw(page, [ink.ellipse(1010, 450, 300, 260)], speed=1100)
    rec.hold(1.0)
    tap(page, "ai-fab-draw", 1.6)
    probe(page, ctx, "06-figure")
    # 07: xoay tự do
    tap(page, "ai-fab-draw-view", 0.7)
    tap(page, "ai-fab-draw-orbit", 0.6)
    drag(page, (900, 450), (940, 446), ms=1100)
    rec.hold(1.0)
    probe(page, ctx, "06-rotated")
    tap(page, "ai-fab", 0.7)
    tap(page, "ai-fab-draw", 0.8)
    probe(page, ctx, "06-reopen")
    tap(page, "ai-fab-draw-net", 2.2)
    page.screenshot(path=ctx["shots"] + "/06-net.png")
    tap(page, "ai-fab-draw-net", 1.2)
    tap(page, "ai-fab-draw-slice", 1.2)
    # thanh cắt chạy lên rồi xuống: thiết diện, diện tích, chu vi đổi theo
    for label in ("Lên", "Lên", "Xuống", "Xuống", "Xuống"):
        page.get_by_role("button", name=label).first.click()
        page.wait_for_timeout(650)
    page.screenshot(path=ctx["shots"] + "/06-slice.png")
    rec.hold(2.0)
    rec.stop()


def wait_until(page, predicate_js: str, timeout_s: float = 40) -> bool:
    try:
        page.wait_for_function(predicate_js, timeout=int(timeout_s * 1000))
        return True
    except Exception:
        return False


def scene_08(page, rec, ctx):
    """Viết "con lắc đơn" → khoanh → Trực quan (bỏ đoạn chờ AI đọc chữ) → kéo góc lệch lên khoảng 45°."""
    ai_cache(page, "08")
    open_board(page)
    rec.start()
    rec.hold(1.0)
    ink.draw(page, ink.text("con lắc đơn", 420, 640, 78), speed=650, pause=0.12)
    rec.hold(0.8)
    tap(page, "tool-lasso", 0.4)
    ink.draw(page, [ink.ellipse(645, 680, 290, 110)], speed=1100)
    rec.hold(0.9)
    page.get_by_test_id("top-toolbar-btn-visualize").click()
    rec.cut_begin()
    ok = wait_until(page, "() => !!document.querySelector('[data-testid=holo-touch-resize-handle]')", 45)
    page.wait_for_timeout(600)
    rec.cut_end(keep=0.8)
    print("sim found:", ok)
    page.keyboard.press("Escape")
    rec.hold(1.5)
    probe(page, ctx, "08-sim")
    print("theta0:", wait_until(page, "() => !!document.querySelector('[data-testid=slider-theta0]')", 10))
    # kéo góc lệch θ₀ lên khoảng 45° (thanh tính bằng rad thì 0,79): đẩy núm từng chút như tay kéo
    sl = page.get_by_test_id("slider-theta0")
    lo, hi, val = sl.evaluate("e => [Number(e.min), Number(e.max), Number(e.value)]")
    target = 45.0 if hi > 7 else 0.785
    bb = sl.bounding_box()
    y = bb["y"] + bb["height"] / 2
    x = bb["x"] + bb["width"] * (val - lo) / (hi - lo)
    page.mouse.move(x, y)
    page.mouse.down()
    direction = 1 if target > val else -1
    for _ in range(160):  # kéo dần như tay, đọc số đo thật của thanh, dừng khi tới khoảng 45°
        x += direction * 1.5
        page.mouse.move(x, y)
        page.wait_for_timeout(25)
        now = float(sl.evaluate("e => e.value"))
        if (now - target) * direction >= -0.02 * (hi - lo):
            break
    page.mouse.up()
    rec.hold(3.0)
    probe(page, ctx, "08-45")
    rec.stop()


def scene_11(page, rec, ctx):
    """Thầy viết vội một tích phân → khoanh → Chuyển LaTeX: nét tay thành công thức in ngay tại chỗ."""
    ai_cache(page, "11")
    open_board(page)
    rec.start()
    rec.hold(1.0)
    ink.draw(page, ink.integral(760, 330, 230), speed=1100, pause=0.1)
    rec.hold(0.7)
    tap(page, "tool-lasso", 0.4)
    ink.draw(page, [ink.ellipse(950, 445, 300, 175)], speed=1200)
    rec.hold(0.8)
    page.get_by_test_id("tool-convert-ink").click()
    rec.cut_begin()
    ok = wait_until(page, "() => [...document.querySelectorAll('input, textarea')].some(e => /\\\\int/.test(e.value))", 45)
    page.wait_for_timeout(500)
    rec.cut_end(keep=0.6)
    print("formula:", ok)
    probe(page, ctx, "11-read")
    rec.hold(1.2)
    page.get_by_role("button", name="Thay nét viết bằng công thức").click()
    rec.hold(3.0)
    probe(page, ctx, "11-done")
    rec.stop()


def student_work(x: float, y: float, h: float = 62, gap: float = 1.75):
    """Ba dòng bài làm có lỗi chuyển vế sai dấu ở dòng 2 (kịch bản UI-13A)."""
    lines = ["2x - 4 = 6", "2x = 6 - 4", "x = 1"]
    out = []
    for i, ln in enumerate(lines):
        out += ink.text(ln, x, y + i * h * gap, h)
    return out


def scene_13a(page, rec, ctx):
    """Bài làm ẩn danh trên bảng → khoanh → Chấm bài: dòng sai đầu tiên bôi đỏ, cửa sổ giải thích."""
    ai_cache(page, "13A-bang")
    open_board(page)
    rec.start()
    rec.hold(1.0)
    ink.draw(page, student_work(760, 300), speed=900, pause=0.1)
    rec.hold(0.7)
    tap(page, "tool-lasso", 0.4)
    ink.draw(page, [ink.ellipse(905, 420, 260, 210)], speed=1200)
    rec.hold(0.8)
    page.get_by_test_id("ai-fab-grade").click()
    rec.cut_begin()
    ok = wait_until(page, "() => document.body.innerText.includes('VI\\u1ebeT L\\u1ea0I CHO \\u0110\\u00daNG') || document.body.innerText.includes('Vi\\u1ebft l\\u1ea1i cho \\u0111\\u00fang')", 70)
    page.wait_for_timeout(600)
    rec.cut_end(keep=0.6)
    print("graded:", ok)
    rec.hold(3.5)
    probe(page, ctx, "13A-graded")
    rec.stop()


def scene_13b(page, rec, ctx):
    """Hết tiết: Vi bài giảng → AI viết lời giảng → Gửi cho học sinh → Đã gửi."""
    seed_cache("13B", [("11", "recognize-ink-0", "recognize-ink-0"), ("08", "recognize-ink-0", "recognize-ink-1")])
    ai_cache(page, "13B")
    open_board(page)
    # nội dung của tiết (không ghi): tích phân thành công thức, lập phương thành hình, con lắc đơn
    ink.draw(page, ink.integral(330, 150, 170), speed=1800, pause=0.01)
    tap(page, "tool-lasso", 0.2)
    ink.draw(page, [ink.ellipse(470, 240, 230, 140)], speed=1800)
    page.get_by_test_id("tool-convert-ink").click()
    wait_until(page, "() => [...document.querySelectorAll('input, textarea')].some(e => /\\\\int/.test(e.value))", 30)
    page.get_by_role("button", name="Thay nét viết bằng công thức").click()
    page.wait_for_timeout(500)
    tap(page, "tool-pen", 0.2)
    ink.draw(page, ink.cube(380, 470, 170), speed=1800, pause=0.01)
    tap(page, "tool-lasso", 0.2)
    ink.draw(page, [ink.ellipse(505, 520, 200, 175)], speed=1800)
    tap(page, "ai-fab-draw", 1.0)
    page.keyboard.press("Escape")
    tap(page, "tool-pen", 0.2)
    ink.draw(page, ink.text("con lắc đơn", 1000, 700, 60), speed=1800, pause=0.01)
    tap(page, "tool-lasso", 0.2)
    ink.draw(page, [ink.ellipse(1170, 730, 230, 90)], speed=1800)
    page.get_by_test_id("top-toolbar-btn-visualize").click()
    wait_until(page, "() => !!document.querySelector('[data-testid=slider-theta0]')", 30)
    page.get_by_test_id("holo-ctx-close-btn").click()
    page.keyboard.press("Escape")
    page.wait_for_timeout(1000)
    rec.start()
    rec.hold(1.0)
    tap(page, "micro-lesson-open", 1.2)
    probe(page, ctx, "13B-open")
    rec.hold(1.2)
    page.get_by_role("button", name="AI viết lời giảng").click()
    rec.cut_begin()
    wait_until(page, "() => document.body.innerText.includes('Ý cần nhớ')", 90)
    page.wait_for_timeout(500)
    rec.cut_end(keep=0.8)
    probe(page, ctx, "13B-notes")
    rec.hold(2.5)
    page.get_by_role("button", name="Gửi cho học sinh").click()
    page.wait_for_timeout(2500)
    probe(page, ctx, "13B-sent")
    rec.hold(1.5)
    rec.stop()


PHONE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}


def open_pendulum(page, cache_scene: str):
    """Chuẩn bị (không ghi): viết "con lắc đơn", khoanh, Trực quan; câu trả lời AI lấy từ cảnh 08."""
    seed_cache(cache_scene, [("08", "recognize-ink-0", "recognize-ink-0")])
    ai_cache(page, cache_scene)
    open_board(page)
    ink.draw(page, ink.text("con lắc đơn", 420, 640, 78), speed=1800, pause=0.02)
    tap(page, "tool-lasso", 0.2)
    ink.draw(page, [ink.ellipse(645, 680, 290, 110)], speed=1800)
    page.get_by_test_id("top-toolbar-btn-visualize").click()
    wait_until(page, "() => !!document.querySelector('[data-testid=slider-theta0]')", 30)
    page.keyboard.press("Escape")
    page.wait_for_timeout(800)


def phone_join(browser, room: str, name: str, rec_start=None):
    ctx = browser.new_context(**PHONE)
    ph = ctx.new_page()
    ph.goto(f"{BOARD}/join/{room}", wait_until="networkidle")
    ph.add_style_tag(content=HIDE_DEV)
    r = None
    if rec_start:
        r = Recorder(ph)
        r.start()
        r.hold(1.0)
        ph.get_by_test_id("join-name").press_sequentially(name, delay=160)
        r.hold(0.4)
    else:
        ph.get_by_test_id("join-name").fill(name)
    ph.get_by_test_id("join-submit").click()
    return ph, r


def scene_13(page, rec, ctx):
    """Lớp học: học sinh quét mã vào lớp, kéo thanh trượt (bảng đổi theo), nộp bài vẽ tay, thầy chiếu ẩn danh."""
    open_pendulum(page, "13")
    rec.start()
    rec.hold(0.8)
    tap(page, "btn-classroom", 0.8)
    tap(page, "classroom-create", 0.3)
    wait_until(page, "() => /\\w{4,}/.test(document.querySelector('[data-testid=classroom-code]')?.innerText || '')", 15)
    room = page.get_by_test_id("classroom-code").inner_text().strip()
    rec.hold(1.0)
    phones, phone_rec = [], None
    for i, name in enumerate(("Lan", "Minh", "An")):
        ph, r = phone_join(ctx["browser"], room, name, rec_start=(i == 0))
        phones.append(ph)
        phone_rec = phone_rec or r
        page.wait_for_timeout(700)
    rec.hold(1.0)
    # giao quyền cho Lan, em kéo θ₀ trên điện thoại → mô phỏng trên bảng đổi theo
    page.locator("[data-testid^=classroom-delegate-]").first.click()
    page.wait_for_timeout(700)
    tap(page, "classroom-close", 0.8)
    ph = phones[0]
    sl = ph.get_by_test_id("slider-theta0")
    sl.scroll_into_view_if_needed()
    ph.wait_for_timeout(600)
    bb = sl.bounding_box()
    y = bb["y"] + bb["height"] / 2
    lo, hi, val = sl.evaluate("e => [Number(e.min), Number(e.max), Number(e.value)]")
    x = bb["x"] + bb["width"] * (val - lo) / (hi - lo)
    ph.mouse.move(x, y)
    ph.mouse.down()
    for i in range(1, 31):
        ph.mouse.move(x + 1.6 * i, y)
        ph.wait_for_timeout(35)
    ph.mouse.up()
    rec.hold(2.5)
    # thu bài vẽ tay → Lan nộp → Bài 1 → Chiếu
    page.get_by_test_id("holo-ctx-close-btn").click()
    page.wait_for_timeout(400)
    tap(page, "btn-classroom", 0.8)
    page.get_by_test_id("submissions-prompt").press_sequentially("Giải phương trình 2x − 4 = 6", delay=45)
    page.wait_for_timeout(400)
    tap(page, "submissions-start", 1.0)
    pad = ph.get_by_test_id("submit-canvas")
    pad.scroll_into_view_if_needed()
    ph.wait_for_timeout(600)
    cb = pad.bounding_box()
    ink.draw(ph, student_work(cb["x"] + 24, cb["y"] + 22, h=min(30, cb["height"] / 7), gap=1.7), speed=500, pause=0.08)
    ph.wait_for_timeout(500)
    ph.get_by_test_id("submit-send").click()
    wait_until(page, "() => !!document.querySelector('[data-testid=submission-card]')", 15)
    phone_rec.hold(2.0)
    phone_rec.stop()
    rec.hold(1.5)
    tap(page, "submission-show", 1.5)
    rec.hold(2.5)
    rec.stop()
    ctx["finish"](rec, "13", SCENES["13"]["title"], "board", page.viewport_size)
    ctx["finish"](phone_rec, "13-phone", "Điện thoại học sinh: vào lớp, kéo thanh trượt, vẽ bài, Nộp", "phone", PHONE["viewport"])
    # 13A nối tiếp: bài vừa chiếu đã được chọn sẵn → Chấm bài → bôi đỏ dòng sai, giải thích
    rec2 = Recorder(page)
    rec2.start()
    rec2.hold(1.2)
    page.get_by_test_id("ai-fab-grade").click()
    rec2.cut_begin()
    ok = wait_until(page, "() => document.body.innerText.includes('VIẾT LẠI CHO ĐÚNG') || document.body.innerText.includes('Viết lại cho đúng')", 70)
    page.wait_for_timeout(600)
    rec2.cut_end(keep=0.6)
    print("graded:", ok)
    rec2.hold(4.0)
    probe(page, ctx, "13A-cont")
    rec2.stop()
    ctx["finish"](rec2, "13A", "Bài 1 chiếu trên bảng → Chấm bài: bôi đỏ dòng sai, giải thích", "board", page.viewport_size)
    for p_ in phones:
        p_.close()
        p_.context.close()
    return True


LAPTOP = {"width": 1600, "height": 1000}


def scene_12(page, rec, ctx):
    """(a) Trang quản lý: tiết mới, chọn lớp, nạp bài soạn, Bắt đầu → mã ghép. (b) Bảng: Ghép tiết, nhập mã → nhận bài, tên lớp → Lớp học: QR to, đếm học sinh."""
    import demo_data

    st = demo_data.ensure()
    lap_ctx = ctx["browser"].new_context(viewport=LAPTOP)
    lap_ctx.add_init_script(f"localStorage.setItem('console_token', {json.dumps(st['token'])}); localStorage.setItem('board_url', '{BOARD}');")
    lap = lap_ctx.new_page()
    lap.goto(CONSOLE, wait_until="networkidle")
    lap.add_style_tag(content=HIDE_DEV)
    lap.wait_for_timeout(800)
    rec_a = Recorder(lap)
    rec_a.start()
    rec_a.hold(1.0)
    lap.get_by_test_id("period-title").press_sequentially("Phương trình bậc nhất – tiết 3", delay=55)
    lap.wait_for_timeout(400)
    lap.get_by_test_id("period-class").select_option(label=lap.locator("[data-testid=period-class] option", has_text=demo_data.CLASS_NAME).first.inner_text())
    lap.wait_for_timeout(500)
    lap.get_by_test_id("period-create").click()
    lap.wait_for_url("**/periods/**", timeout=15000)
    lap.wait_for_load_state("networkidle")
    lap.add_style_tag(content=HIDE_DEV)
    lap.wait_for_timeout(900)
    lap.get_by_test_id("prep-lesson").select_option(st["lessonId"])
    lap.wait_for_timeout(700)
    lap.get_by_test_id("prep-start").click()
    wait_until(lap, "() => /[A-Z0-9]{6}/.test(document.querySelector('[data-testid=pair-code]')?.innerText || '')", 15)
    code = lap.get_by_test_id("pair-code").inner_text().strip().replace(" ", "")
    rec_a.hold(2.5)
    probe(lap, ctx, "12a")
    rec_a.stop()
    ctx["finish"](rec_a, "12a", "Trang quản lý: tiết mới, chọn lớp, nạp bài, Bắt đầu → mã ghép", "laptop", LAPTOP)

    open_board(page)
    rec.start()
    rec.hold(1.0)
    tap(page, "pair-open", 0.8)
    page.get_by_test_id("pair-code-input").press_sequentially(code, delay=220)
    page.wait_for_timeout(500)
    tap(page, "pair-submit", 2.5)
    probe(page, ctx, "12b-paired")
    rec.hold(1.5)
    tap(page, "btn-classroom", 1.0)
    probe(page, ctx, "12b-class")
    page.get_by_test_id("classroom-qr").first.click()
    rec.hold(1.5)
    room = page.get_by_test_id("classroom-code").first.inner_text().strip()
    phones = []
    for name in ("Lan Anh", "Minh", "An", "Bảo"):
        ph, _ = phone_join(ctx["browser"], room, name)
        phones.append(ph)
        page.wait_for_timeout(900)
    rec.hold(1.0)
    page.get_by_test_id("classroom-qr-big").first.click()
    rec.hold(2.5)
    probe(page, ctx, "12b-qr")
    rec.stop()
    ctx["finish"](rec, "12b", "Bảng: Ghép tiết bằng mã → nhận bài và lớp → mã QR vào lớp", "board", page.viewport_size)
    for p_ in phones:
        p_.close()
        p_.context.close()
    lap.close()
    lap_ctx.close()
    return True


def open_student(page, path: str = "/"):
    page.goto(STUDENT + path, wait_until="networkidle")
    page.add_style_tag(content=HIDE_DEV)
    page.wait_for_timeout(1000)


TABLET = {"width": 1180, "height": 820}


def scene_14(page, rec, ctx):
    """Máy tính bảng. 14a: Mã học sinh → Vào lớp → Lớp của em → tiết vừa học. 14b: bài thầy gửi từ bảng → chạm sang Gia sư."""
    import demo_data

    st = json.load(open(demo_data.STATE, encoding="utf-8"))
    demo_data.ensure_activity(st)
    lan = st["students"][0]
    open_student(page, "/?tab=MY_CLASS")
    rec.start()
    rec.hold(1.2)
    page.get_by_test_id("login-code").press_sequentially(lan["loginCode"], delay=200)
    page.wait_for_timeout(400)
    page.get_by_test_id("login-submit").click()
    page.wait_for_timeout(1800)
    rec.hold(1.5)
    page.get_by_test_id("htab-periods").click()
    page.wait_for_timeout(1500)
    rec.hold(2.5)
    probe(page, ctx, "14a")
    rec.stop()
    ctx["finish"](rec, "14a", "Máy tính bảng: Mã học sinh → Vào lớp → Lớp của em → tiết vừa học", "tablet", TABLET)
    page.goto(STUDENT + "/?tab=AFTER_SCHOOL_TUTOR", wait_until="networkidle")
    page.add_style_tag(content=HIDE_DEV)
    page.wait_for_timeout(800)
    center(page.get_by_test_id("mode-board-lesson")).click()
    page.wait_for_timeout(2500)
    rec2 = Recorder(page)
    rec2.start()
    rec2.hold(3.0)
    center(page.get_by_test_id("mode-socratic-solver")).click()
    page.wait_for_timeout(1200)
    rec2.hold(2.5)
    probe(page, ctx, "14b")
    rec2.stop()
    ctx["finish"](rec2, "14b", "Máy tính bảng: bài thầy gửi từ bảng → chạm sang Gia sư sau giờ học", "tablet", TABLET)
    return True


def scene_26(page, rec, ctx):
    """Điện thoại phụ huynh: báo cáo tuần của con (link bí mật /parent/<token>), vuốt xuống cuối trang."""
    import demo_data

    st = json.load(open(demo_data.STATE, encoding="utf-8"))
    demo_data.ensure_activity(st)
    open_student(page, "/parent/" + st["parentToken"])
    rec.start()
    rec.hold(3.0)
    for _ in range(8):
        page.mouse.wheel(0, 60)
        page.wait_for_timeout(140)
    rec.hold(2.5)
    probe(page, ctx, "26")
    rec.stop()


def center(loc):
    """Cuộn phần tử vào giữa màn hình (thanh tiêu đề dính ở đầu trang điện thoại không che mất)."""
    loc.first.evaluate("e => e.scrollIntoView({block: 'center'})")
    loc.page.wait_for_timeout(350)
    return loc.first


DEMO_DB = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "services", "ai-engine", ".data", "demo", "student_context.sqlite3"))


def reset_tutor(student: str = "student_default"):
    """Chỉ DB demo của buổi ghi (.data/demo): xóa tiến độ gia sư để cảnh bắt đầu từ bước 1."""
    import sqlite3

    con = sqlite3.connect(DEMO_DB)
    for table in ("tutor_progress", "tutor_attempts"):
        try:
            con.execute(f"DELETE FROM {table} WHERE student=?", (student,))
        except sqlite3.OperationalError:
            pass
    con.commit()
    con.close()


def tutor_send(page, text: str, rec=None, wait_s: float = 60):
    """Gõ từng ký tự vào ô bước giải rồi Enter; bỏ đoạn chờ máy xác thực khỏi video."""
    box = center(page.get_by_test_id("tutor-step-input"))
    box.click()
    box.fill("")
    box.press_sequentially(text, delay=70)
    page.wait_for_timeout(400)
    box.press("Enter")
    if rec:
        rec.cut_begin()
    page.wait_for_timeout(500)
    wait_until(page, "() => !document.querySelector('[data-testid=tutor-step-input]')?.disabled", wait_s)
    page.wait_for_timeout(600)
    if rec:
        rec.cut_end(keep=0.7)


def scene_15(page, rec, ctx):
    """Điện thoại: Gia sư sau giờ học → bài Hóa → nhập bước sai → câu hỏi gợi mở; rồi gõ "cho đáp án" → Hàng rào Socratic (cảnh 16)."""
    ai_cache(page, "15")
    reset_tutor()
    open_student(page, "/?tab=AFTER_SCHOOL_TUTOR")
    center(page.get_by_test_id("mode-socratic-solver")).click()
    page.wait_for_timeout(800)
    center(page.get_by_text("Ném xiên trong Trọng trường")).click()
    page.wait_for_timeout(1500)
    center(page.get_by_test_id("tutor-step-input"))
    page.wait_for_timeout(600)
    rec.start()
    rec.hold(1.0)
    # bước sai: thành phần ngang dùng sin thay cho cos (máy chấm bác được bước này)
    tutor_send(page, "vx = v0*sin(alpha)", rec)
    rec.hold(1.2)
    for _ in range(5):
        page.mouse.wheel(0, 60)
        page.wait_for_timeout(120)
    rec.hold(3.0)
    probe(page, ctx, "15-wrong")
    rec.stop()
    ctx["finish"](rec, "15", SCENES["15"]["title"], "phone", PHONE["viewport"])
    center(page.get_by_text("Cân bằng Oxi hóa Sắt")).click()
    page.wait_for_timeout(1200)
    center(page.get_by_test_id("tutor-step-input"))
    rec2 = Recorder(page)
    rec2.start()
    rec2.hold(0.8)
    tutor_send(page, "cho đáp án", rec2)
    rec2.hold(2.0)
    for _ in range(6):  # cuộn chậm xuống công cụ trực quan vừa mở
        page.mouse.wheel(0, 70)
        page.wait_for_timeout(120)
    rec2.hold(2.5)
    probe(page, ctx, "16-guard")
    rec2.stop()
    ctx["finish"](rec2, "16", "Điện thoại: xin đáp án → Hàng rào Socratic, mở công cụ trực quan", "phone", PHONE["viewport"])
    return True


HIDE_DIRECTOR_JS = """() => {
  const btn = document.querySelector('[data-testid^=director-]');
  let box = btn;
  while (box && box.parentElement && !/DIRECTOR/i.test(box.innerText.slice(0, 40))) box = box.parentElement;
  if (box) box.style.display = 'none';
  document.querySelectorAll('[data-testid^=director-]').forEach(e => e.style.display = 'none');
}"""


FAKE_MIC = """
(() => {
  const LINE = %s;
  class FakeRecognition {
    constructor() { this.lang = 'vi-VN'; this.continuous = true; this.interimResults = true; this._t = null; }
    start() {
      const words = LINE.split(' ');
      let i = 0;
      const tick = () => {
        i += 1;
        const text = words.slice(0, i).join(' ');
        const results = [[{transcript: text, confidence: 0.92}]];
        results[0].isFinal = i === words.length;
        this.onresult && this.onresult({results, resultIndex: 0});
        if (i < words.length) this._t = setTimeout(tick, 260 + Math.random() * 160);
        else { this.onend && this.onend(); }
      };
      this._t = setTimeout(tick, 700);
    }
    stop() { clearTimeout(this._t); this.onend && this.onend(); }
    abort() { this.stop(); }
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
})();
"""
SPOKEN_18 = "Dạ, vì số Oxi hai bên phải bằng nhau."


def scene_17(page, rec, ctx):
    """Điện thoại: bài Fe + O2 → Fe2O3 (cân đĩa lệch, gợi ý BCNN) → bấm 4Fe + 3O2 → 2Fe2O3 trên bàn phím hóa học → đúng. Cảnh 18: chốt chặn bảo vệ bằng lời."""
    ai_cache(page, "17")
    # micro giả (máy ghi hình không có micro): trả về đúng câu thoại của HS-A từng từ, phần chấm vẫn là của ứng dụng
    page.add_init_script(FAKE_MIC % json.dumps(SPOKEN_18))
    open_student(page, "/?tab=COMPANION&problem=CHEMISTRY_BALANCE")
    page.evaluate(HIDE_DIRECTOR_JS)
    center(page.get_by_test_id("numpad-input"))
    page.wait_for_timeout(600)
    probe(page, ctx, "17-start")
    rec.start()
    rec.hold(1.5)
    for key in ["4", "Fe", "+", "3", "O₂", "→", "2", "Fe₂O₃"]:
        page.get_by_test_id("key-" + key).click()
        page.wait_for_timeout(420)
    rec.hold(0.8)
    page.get_by_test_id("numpad-submit").click()
    rec.cut_begin()
    page.wait_for_timeout(4000)
    rec.cut_end(keep=1.0)
    rec.hold(2.5)
    probe(page, ctx, "17-done")
    rec.stop()
    ctx["finish"](rec, "17", SCENES["17"]["title"], "phone", PHONE["viewport"])
    # 18: chốt chặn bảo vệ bằng lời
    center(page.get_by_test_id("mic-voice-defense-btn"))
    page.wait_for_timeout(500)
    rec2 = Recorder(page)
    rec2.start()
    rec2.hold(1.2)
    page.get_by_test_id("mic-voice-defense-btn").click()
    # dừng khi lời nói đã hiện đủ (kịch bản không có màn kết luận; câu thoại này bộ chấm thật đánh giá "đúng một phần")
    wait_until(page, "() => (document.querySelector('[data-testid=concept-input-fallback]')?.value || '').endsWith('nhau.')", 15)
    rec2.hold(3.0)
    probe(page, ctx, "18-spoken")
    rec2.stop()
    ctx["finish"](rec2, "18", "Điện thoại: bảo vệ bằng giọng nói (Concept Check Gate)", "phone", PHONE["viewport"])
    return True


SCENES: Dict[str, dict] = {
    "17": {"title": "Điện thoại: cân đĩa lệch → tự cân bằng Fe + O2", "device": "phone", "run": scene_17},
    "15": {"title": "Điện thoại: bước sai → gia sư hỏi lại", "device": "phone", "run": scene_15},
    "14": {"title": "Máy tính bảng: Lớp của em và bài thầy gửi", "device": "tablet", "run": scene_14},
    "26": {"title": "Điện thoại phụ huynh: báo cáo tuần của con", "device": "phone", "run": scene_26},
    "12": {"title": "Trang quản lý mở tiết, bảng ghép tiết, QR vào lớp", "device": "board", "run": scene_12},
    "13": {"title": "Lớp học: quét mã, kéo thanh trượt đồng bộ, nộp bài vẽ tay, chiếu ẩn danh", "device": "board", "run": scene_13},
    "13B": {"title": "Vi bài giảng: AI viết lời giảng → Gửi cho học sinh", "device": "board", "run": scene_13b},
    "13A-bang": {"title": "Bài làm viết trên bảng → khoanh → Chấm bài (bản dự phòng của 13A)", "device": "board", "run": scene_13a},
    "11": {"title": "Tích phân viết vội → khoanh → Chuyển công thức", "device": "board", "run": scene_11},
    "08": {"title": "Viết “con lắc đơn” → khoanh → Trực quan → kéo góc lệch", "device": "board", "run": scene_08},
    "06-07": {"title": "Vẽ lập phương → hình chuẩn → xoay, khai triển, cắt ngang", "device": "board", "run": scene_06_07},
}
