"""Kịch bản thao tác cho từng cảnh quay (kịch bản bản 3, 29/10/2026). Mỗi cảnh: hàm nhận (page, rec, ctx) và tự thao tác như người dùng."""
from __future__ import annotations

import json
import os
from typing import Callable, Dict

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


SCENES: Dict[str, dict] = {
    "08": {"title": "Viết “con lắc đơn” → khoanh → Trực quan → kéo góc lệch", "device": "board", "run": scene_08},
    "06-07": {"title": "Vẽ lập phương → hình chuẩn → xoay, khai triển, cắt ngang", "device": "board", "run": scene_06_07},
}
