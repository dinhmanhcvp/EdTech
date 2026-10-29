"""Ghi các cảnh demo: python record.py [mã cảnh ...]  (bỏ trống = tất cả).

Cần chạy sẵn 4 tiến trình (8000, 3001, 3002, 3003). Video ra apps/teacher-board/public/demo/<mã>.webm + ảnh khung đầu .jpg,
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
VIEWPORTS = {"board": {"width": 1920, "height": 1080}, "laptop": {"width": 1600, "height": 1000},
             "tablet": {"width": 1180, "height": 820}, "phone": {"width": 430, "height": 932}}


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
            context = browser.new_context(viewport=vp, device_scale_factor=1, is_mobile=sc["device"] == "phone", has_touch=sc["device"] in ("phone", "tablet"))
            page = context.new_page()
            rec = Recorder(page)
            print(f"[{sid}] {sc['title']}", flush=True)

            def finish(r, out_id, title, device, size):
                out = os.path.join(OUT, f"{out_id}.webm")
                dur = r.save(out)
                print(f"[{out_id}] {dur:.1f}s -> {out}", flush=True)
                manifest["scenes"] = [s for s in manifest["scenes"] if s["id"] != out_id] + [
                    {"id": out_id, "title": title, "device": device, "file": f"/demo/{out_id}.webm", "poster": f"/demo/{out_id}.jpg",
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
