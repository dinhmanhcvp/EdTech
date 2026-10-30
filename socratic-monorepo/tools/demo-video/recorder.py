"""Ghi màn hình trang thật, cắt các đoạn chờ AI, mã hóa mp4 H.264.

Hai cách lấy khung:
- screencast CDP theo thời gian thật (mặc định): khung cuối được giữ tới khung kế tiếp nên thời gian thật được giữ đúng;
- ghi từng khung (begin_manual/add_frame/end_manual) cho nét vẽ tay: mỗi khung là một ảnh chụp sau khi bút đi đúng 1/30 giây,
  nên nét chảy đều 30 khung/giây trên mọi máy (screencast chỉ được 13–20 khung/giây khi vẽ, nét hiện thành từng cục).
"""
from __future__ import annotations

import base64
import glob
import os
import subprocess
import tempfile
import time
from typing import List, Optional, Tuple

Frame = Tuple[float, bytes]


def h264_ffmpeg() -> str:
    """ffmpeg có libx264 (gói imageio-ffmpeg): mp4 H.264 phát được trên mọi trình duyệt, kể cả iPhone."""
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def ffmpeg_path() -> str:
    hits = glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "ms-playwright", "ffmpeg-*", "ffmpeg-win64.exe"))
    if not hits:
        raise RuntimeError("Không thấy ffmpeg của Playwright: chạy `python -m playwright install ffmpeg`.")
    return sorted(hits)[-1]


def build_timeline(t0: float, t1: float, frames: List[Frame], cuts: List[Tuple[float, float]],
                   inserts: List[Tuple[float, List[Tuple[float, bytes]]]]):
    """Thời điểm trong video của từng khung: thời gian thật − các đoạn cắt + các đoạn ghi từng khung chèn vào.
    inserts: [(thời điểm thật bắt đầu, [(thời lượng khung, ảnh), ...])]; đoạn thật tương ứng phải nằm trong `cuts`."""
    cuts = sorted(cuts)
    inserts = sorted(inserts, key=lambda x: x[0])

    def shift(t: float) -> float:
        removed = sum(max(0.0, min(t, b) - a) for a, b in cuts if a < t)
        added = sum(sum(d for d, _ in fr) for a, fr in inserts if a < t)
        return t - t0 - removed + added

    def in_cut(t: float) -> bool:
        return any(a <= t < b for a, b in cuts)

    timeline = [(shift(t), data) for t, data in frames if not in_cut(t)]
    # khung cuối của một đoạn cắt: ảnh kết quả xuất hiện ngay sau điểm cắt
    for a, b in cuts:
        last_in = [d for t, d in frames if a <= t < b]
        if last_in and not any(abs(a - ia) < 1e-9 for ia, _ in inserts):
            timeline.append((shift(a) + 1e-3, last_in[-1]))
    for a, fr in inserts:
        at = shift(a)
        for d, data in fr:
            timeline.append((at, data))
            at += d
    timeline.sort(key=lambda x: x[0])
    return timeline, shift(t1)


class Recorder:
    def __init__(self, page, quality: int = 92):
        self.page = page
        self.cdp = page.context.new_cdp_session(page)
        self.frames: List[Frame] = []
        self.cuts: List[Tuple[float, float]] = []
        self.inserts: List[Tuple[float, List[Tuple[float, bytes]]]] = []
        self._cut_from: Optional[float] = None
        self._manual: Optional[Tuple[float, List[Tuple[float, bytes]]]] = None
        self.quality = quality
        self.started = False
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
        self.dpr = dpr
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": self.quality, "maxWidth": int(vp["width"] * dpr),
                                               "maxHeight": int(vp["height"] * dpr), "everyNthFrame": 1})
        self.t0 = time.monotonic()
        self.started = True

    def stop(self):
        self.page.wait_for_timeout(300)
        self.cdp.send("Page.stopScreencast")
        self.t1 = time.monotonic()
        self.started = False

    def cut_begin(self):
        """Bắt đầu đoạn chờ (AI đang đọc/chấm): đoạn này bị bỏ khỏi video, chỉ giữ lại `keep` giây đầu."""
        self._cut_from = time.monotonic()

    def cut_end(self, keep: float = 0.6):
        if self._cut_from is not None:
            self.cuts.append((self._cut_from + keep, time.monotonic()))
            self._cut_from = None

    def begin_manual(self):
        """Bắt đầu ghi từng khung (nét vẽ tay): thời gian thật của đoạn này bị thay bằng các khung chụp tay."""
        self._manual = (time.monotonic(), [])

    def add_frame(self, duration: float):
        """Chụp khung hiện tại, hiện trong `duration` giây của video."""
        self._manual[1].append((duration, self.page.screenshot(type="jpeg", quality=self.quality, scale="css")))  # cùng cỡ với khung screencast

    def extend_last(self, duration: float):
        """Giữ khung vừa chụp thêm `duration` giây (nhấc bút, nghỉ giữa các nét) mà không chụp lại."""
        if self._manual and self._manual[1]:
            d, data = self._manual[1][-1]
            self._manual[1][-1] = (d + duration, data)

    def end_manual(self):
        a, fr = self._manual
        self._manual = None
        self.cuts.append((a, time.monotonic()))
        if fr:
            self.inserts.append((a, fr))

    def hold(self, seconds: float):
        """Giữ khung hình đứng yên (screencast không gửi khung mới khi không đổi)."""
        self.page.wait_for_timeout(int(seconds * 1000))

    def save(self, out_path: str, fps: int = 30, crop=None, out_size=None) -> float:
        """Ghép khung theo thời gian video, mã hóa mp4; trả về thời lượng (giây).
        crop = (x, y, w, h) theo px CSS: chỉ giữ vùng đó (VD khung bảng), phóng về out_size = (rộng, cao) px.
        Cắt theo tỉ lệ khung nhìn nên đúng với mọi cỡ khung đầu vào."""
        if not self.frames and not self.inserts:
            raise RuntimeError("Không có khung hình nào.")
        timeline, duration = build_timeline(self.t0, self.t1, self.frames, self.cuts, self.inserts)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        # ghi chuỗi JPEG (mỗi khung đầu ra một ảnh) ra tệp tạm rồi đọc bằng image2pipe
        idx, n = 0, int(duration * fps)
        current = timeline[0][1]
        with tempfile.NamedTemporaryFile(suffix=".mjpeg", delete=False) as tmp:
            for k in range(n):
                t = k / fps
                while idx < len(timeline) and timeline[idx][0] <= t + 1e-9:
                    current = timeline[idx][1]
                    idx += 1
                tmp.write(current)
        vf = "pad=ceil(iw/2)*2:ceil(ih/2)*2"
        if crop:
            vp = self.page.viewport_size
            fx, fy, fw, fh = crop[0] / vp["width"], crop[1] / vp["height"], crop[2] / vp["width"], crop[3] / vp["height"]
            ow, oh = out_size
            vf = f"crop=iw*{fw:.5f}:ih*{fh:.5f}:iw*{fx:.5f}:ih*{fy:.5f},scale={ow}:{oh}:flags=lanczos"
        try:
            res = subprocess.run(
                [h264_ffmpeg(), "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", str(fps), "-i", tmp.name,
                 "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-vf", vf,
                 "-movflags", "+faststart", out_path], capture_output=True, text=True)
        finally:
            os.unlink(tmp.name)
        if res.returncode != 0:
            raise RuntimeError("ffmpeg lỗi khi ghi " + out_path + ": " + res.stderr[-500:])
        # ảnh khung đầu lấy từ chính video (đã cắt khung)
        poster = os.path.splitext(out_path)[0] + ".jpg"
        subprocess.run([h264_ffmpeg(), "-loglevel", "error", "-y", "-i", out_path, "-frames:v", "1", "-q:v", "3", poster], check=True)
        return n / fps


def self_check():
    # cắt 1 giây ở giữa
    tl, dur = build_timeline(0.0, 3.0, [(0.5, b"a"), (1.5, b"x"), (2.5, b"b")], [(1.0, 2.0)], [])
    assert dur == 2.0 and [d for _, d in tl] == [b"a", b"x", b"b"] and tl[-1][0] == 1.5
    # đoạn ghi từng khung 1–2 s thật được thay bằng 3 khung × 1/30 s; khung thật sau đó lùi theo
    tl, dur = build_timeline(0.0, 3.0, [(0.5, b"a"), (1.5, b"x"), (2.5, b"b")], [(1.0, 2.0)],
                             [(1.0, [(1 / 30, b"m1"), (1 / 30, b"m2"), (1 / 30, b"m3")])])
    assert [d for _, d in tl] == [b"a", b"m1", b"m2", b"m3", b"b"], tl
    assert abs(dur - 2.1) < 1e-9 and abs(dict((d, t) for t, d in tl)[b"b"] - 1.6) < 1e-9


if __name__ == "__main__":
    self_check()
    print("ok", h264_ffmpeg())
