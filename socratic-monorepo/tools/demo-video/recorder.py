"""Ghi màn hình trang thật bằng CDP screencast (JPEG chất lượng cao), cắt các đoạn chờ AI, mã hóa VP8/webm bằng ffmpeg của Playwright.

Screencast chỉ gửi khung khi màn hình đổi: khi ghép video, khung cuối được giữ nguyên cho tới khung kế tiếp nên thời gian thật được giữ đúng.
"""
from __future__ import annotations

import base64
import glob
import os
import subprocess
import tempfile
import time
from typing import List, Optional, Tuple


def h264_ffmpeg() -> str:
    """ffmpeg có libx264 (gói imageio-ffmpeg): mp4 H.264 phát được trên mọi trình duyệt, kể cả iPhone."""
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def ffmpeg_path() -> str:
    hits = glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "ms-playwright", "ffmpeg-*", "ffmpeg-win64.exe"))
    if not hits:
        raise RuntimeError("Không thấy ffmpeg của Playwright: chạy `python -m playwright install ffmpeg`.")
    return sorted(hits)[-1]


class Recorder:
    def __init__(self, page, quality: int = 92):
        self.page = page
        self.cdp = page.context.new_cdp_session(page)
        self.frames: List[Tuple[float, bytes]] = []
        self.cuts: List[Tuple[float, float]] = []
        self._cut_from: Optional[float] = None
        self.quality = quality
        self.cdp.on("Page.screencastFrame", self._on_frame)

    def _on_frame(self, ev):
        self.frames.append((time.monotonic(), base64.b64decode(ev["data"])))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:
            pass

    def start(self):
        vp = self.page.viewport_size
        dpr = float(self.page.evaluate("window.devicePixelRatio") or 1)
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": self.quality, "maxWidth": int(vp["width"] * dpr),
                                               "maxHeight": int(vp["height"] * dpr), "everyNthFrame": 1})
        self.t0 = time.monotonic()

    def stop(self):
        self.page.wait_for_timeout(300)
        self.cdp.send("Page.stopScreencast")
        self.t1 = time.monotonic()

    def cut_begin(self):
        """Bắt đầu đoạn chờ (AI đang đọc/chấm): đoạn này bị bỏ khỏi video, chỉ giữ lại `keep` giây đầu."""
        self._cut_from = time.monotonic()

    def cut_end(self, keep: float = 0.6):
        if self._cut_from is not None:
            self.cuts.append((self._cut_from + keep, time.monotonic()))
            self._cut_from = None

    def hold(self, seconds: float):
        """Giữ khung hình đứng yên (screencast không gửi khung mới khi không đổi)."""
        self.page.wait_for_timeout(int(seconds * 1000))

    def save(self, out_path: str, fps: int = 30, bitrate: str = "12M") -> float:
        """Ghép khung theo thời gian thật trừ các đoạn cắt, trả về thời lượng video (giây)."""
        if not self.frames:
            raise RuntimeError("Không có khung hình nào.")
        cuts = sorted(self.cuts)

        def removed_before(t: float) -> float:
            return sum(max(0.0, min(t, b) - a) for a, b in cuts if a < t)

        def in_cut(t: float) -> bool:
            return any(a <= t < b for a, b in cuts)

        timeline = [(t - self.t0 - removed_before(t), data) for t, data in self.frames if not in_cut(t)]
        # khung cuối của một đoạn cắt: ảnh kết quả xuất hiện ngay sau điểm cắt
        for a, b in cuts:
            last_in = [d for t, d in self.frames if a <= t < b]
            if last_in:
                timeline.append((a - self.t0 - removed_before(a) + 1e-3, last_in[-1]))
        timeline.sort(key=lambda x: x[0])
        duration = self.t1 - self.t0 - removed_before(self.t1)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        # ffmpeg của Playwright không có giao thức pipe: ghi chuỗi JPEG (mỗi khung đầu ra một ảnh) ra tệp tạm rồi đọc bằng image2pipe
        idx, n = 0, int(duration * fps)
        current = timeline[0][1]
        with tempfile.NamedTemporaryFile(suffix=".mjpeg", delete=False) as tmp:
            for k in range(n):
                t = k / fps
                while idx < len(timeline) and timeline[idx][0] <= t:
                    current = timeline[idx][1]
                    idx += 1
                tmp.write(current)
        try:
            res = subprocess.run(
                [h264_ffmpeg(), "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", str(fps), "-i", tmp.name,
                 "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                 "-movflags", "+faststart", out_path], capture_output=True, text=True)
        finally:
            os.unlink(tmp.name)
        if res.returncode != 0:
            raise RuntimeError("ffmpeg lỗi khi ghi " + out_path + ": " + res.stderr[-500:])
        poster = os.path.splitext(out_path)[0] + ".jpg"
        with open(poster, "wb") as f:
            f.write(timeline[0][1])
        return n / fps


def self_check():
    """Kiểm thời gian ghép: 2 khung, cắt 1 giây ở giữa."""
    r = Recorder.__new__(Recorder)
    r.t0, r.t1 = 0.0, 3.0
    r.cuts = [(1.0, 2.0)]
    removed = lambda t: sum(max(0.0, min(t, b) - a) for a, b in r.cuts if a < t)
    assert removed(0.5) == 0 and removed(1.5) == 0.5 and removed(2.5) == 1.0
    assert r.t1 - r.t0 - removed(r.t1) == 2.0


if __name__ == "__main__":
    self_check()
    print("ok", ffmpeg_path())
