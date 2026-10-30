"""Ghi các cảnh demo: python record.py [mã cảnh ...]  (bỏ trống = tất cả).

Cần chạy sẵn 4 tiến trình (8000, 3001, 3002, 3003). Video ra apps/teacher-board/public/demo/<mã>.mp4 + ảnh khung đầu .jpg,
danh sách ở public/demo/scenes.json để trang /demo trên bảng phát bằng phím ẩn.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import urllib.request

from playwright.sync_api import sync_playwright

from recorder import Recorder
from scenes import SCENES

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "apps", "teacher-board", "public", "demo"))
# (khung nhìn, mật độ điểm ảnh, CSS zoom). Bảng: khung bảng (1498×843 px) được cắt ra và phóng về 1920×1080 khi mã hóa.
# Laptop, máy tính bảng: zoom chính trang để nội dung to ra, bớt khoảng trắng hai bên mà vẫn nét gốc.
DEVICES = {"board": ({"width": 1920, "height": 1080}, 1, 1.0), "laptop": ({"width": 1600, "height": 1000}, 1, 1.3333),
           "tablet": ({"width": 1180, "height": 820}, 2, 1.25), "phone": ({"width": 390, "height": 844}, 2, 1.0)}
VIEWPORTS = {k: v[0] for k, v in DEVICES.items()}
BOARD_OUT = (1920, 1080)
# khung nổi có thể nằm ngoài mép bảng mà phải thấy trong video (thẻ giải thích khi chấm bài)
BOARD_EXTRA = ["[data-testid=step-explain-window]"]


def zoom_page(context, zoom: float):
    if zoom != 1.0:
        context.add_init_script(f"document.addEventListener('DOMContentLoaded', () => {{ document.documentElement.style.zoom = '{zoom}'; }});")


def board_crop(page):
    """Khung bảng (px CSS) ∪ các khung nổi ngoài mép đang hiện, nới về tỉ lệ 16:9, không vượt khung nhìn."""
    r = page.evaluate("""(extra) => {
      const c = [...document.querySelectorAll('canvas')].map(e => e.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (!c) return null;
      let x0 = c.left, y0 = c.top, x1 = c.right, y1 = c.bottom;
      for (const sel of extra) for (const e of document.querySelectorAll(sel)) {
        const b = e.getBoundingClientRect();
        if (b.width && b.height) { x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
      }
      return [x0, y0, x1, y1, innerWidth, innerHeight];
    }""", BOARD_EXTRA)
    if not r:
        return None
    x0, y0, x1, y1, vw, vh = r
    w, h = x1 - x0, y1 - y0
    if w / h > 16 / 9:
        h = w * 9 / 16
    else:
        w = h * 16 / 9
    w, h = min(w, vw), min(h, vh)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x = min(max(0, cx - w / 2), vw - w)
    y = min(max(0, cy - h / 2), vh - h)
    return (x, y, w, h)


def load_manifest():
    path = os.path.join(OUT, "scenes.json")
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {"scenes": []}


def save_manifest(m):
    m["scenes"].sort(key=lambda s: s["id"])
    with open(os.path.join(OUT, "scenes.json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


def main(ids):
    os.makedirs(OUT, exist_ok=True)
    shots = os.environ.get("DEMO_SHOTS") or tempfile.mkdtemp(prefix="demo-shots-")
    os.makedirs(shots, exist_ok=True)
    manifest = load_manifest()
    ctx = {"shots": shots, "state": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for sid in ids or list(SCENES):
            sc = SCENES[sid]
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=5)
            except Exception:
                sys.exit("Máy chủ AI (8000) không trả lời: khởi động lại rồi ghi tiếp từ cảnh " + sid)
            vp = VIEWPORTS[sc["device"]]
            # điện thoại/máy tính bảng: không bật chế độ thu phóng trang của trình duyệt di động (lệch tọa độ chạm), chỉ ×2 điểm ảnh cho nét
            context = browser.new_context(viewport=vp, device_scale_factor=DEVICES[sc["device"]][1], has_touch=sc["device"] in ("phone", "tablet"))
            zoom_page(context, DEVICES[sc["device"]][2])
            page = context.new_page()
            rec = Recorder(page)
            print(f"[{sid}] {sc['title']}", flush=True)

            def finish(r, out_id, title, device, size):
                out = os.path.join(OUT, f"{out_id}.mp4")
                if device == "board":  # chỉ giữ khung bảng, bỏ lề trắng quanh bảng
                    dur = r.save(out, crop=board_crop(r.page), out_size=BOARD_OUT)
                else:
                    dur = r.save(out)
                print(f"[{out_id}] {dur:.1f}s -> {out}", flush=True)
                manifest["scenes"] = [s for s in manifest["scenes"] if s["id"] != out_id] + [
                    {"id": out_id, "title": title, "device": device, "file": f"/demo/{out_id}.mp4", "poster": f"/demo/{out_id}.jpg",
                     "duration": round(dur, 1), "width": size["width"], "height": size["height"]}]
                save_manifest(manifest)

            handled = sc["run"](page, rec, {**ctx, "browser": browser, "finish": finish})
            if not handled:
                finish(rec, sid, sc["title"], sc["device"], vp)
            page.close()
            context.close()
        browser.close()
    print("ảnh kiểm tra:", shots)


if __name__ == "__main__":
    main(sys.argv[1:])
