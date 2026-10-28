"""
Điều phối (khóa, model) Gemini theo hạn mức: model có RPD LỚN dành cho các chức năng chạy nhiều (Vision, hỏi đáp, gia sư);
model RPD nhỏ chỉ đỡ khi model lớn đã hết lượt trong ngày, hoặc dành cho việc khác.

- Hạn mức mỗi model = (RPM, RPD). Giá trị MẶC ĐỊNH CHỈ LÀ GIẢ ĐỊNH (Google không công bố qua API và hay đổi, nhất là bản preview).
  Đặt số thật từ trang "Rate limit" của AI Studio bằng biến GEMINI_MODEL_LIMITS="model:rpm:rpd,model:rpm:rpd".
  Khi gặp lỗi 429, số `quotaValue` trong thông báo lỗi của Google được học lại tự động cho model đó.
- Mỗi cặp (khóa, model) có bộ đếm cửa sổ 60 s (RPM) và bộ đếm trong ngày (RPD, đặt lại nửa đêm giờ Thái Bình Dương).
  Chạm 90% RPD thì cặp đó nhường chỗ (còn dư địa cho lượt bất ngờ); lỗi "PerDay" từ Google thì cặp đó nghỉ tới nửa đêm Thái Bình Dương.
- Bộ đếm nằm trong bộ nhớ: máy chủ khởi động lại thì đếm lại từ 0 (lỗi 429 vẫn là lưới an toàn cuối).
"""

import datetime
import os
import re
import threading
import time
from collections import deque
from typing import Deque, Dict, Iterator, List, Optional, Set, Tuple

# (RPM, RPD). Số của bản 2.5 lấy từ bảng công bố của Google (có thể đã cũ); các model 3.x chưa có số công bố → UNKNOWN_LIMITS.
DEFAULT_LIMITS: Dict[str, Tuple[int, int]] = {
    "gemini-2.5-flash-lite": (15, 1000),
    "gemini-2.5-flash": (10, 250),
}
UNKNOWN_LIMITS: Tuple[int, int] = (10, 250)
RPD_SAFETY = 0.9  # chạm 90% RPD thì nhường
LATENCY_DEFAULT_S = 3.0
LATENCY_HALF_LIFE_S = 120.0

HEAVY_FEATURES = ("vision", "qa", "tutor")


def _next_pt_midnight(now: float) -> float:
    """Thời điểm (epoch) của nửa đêm tiếp theo giờ Thái Bình Dương (nơi Google đặt lại hạn mức ngày)."""
    try:
        from zoneinfo import ZoneInfo

        tz = ZoneInfo("America/Los_Angeles")
        dt = datetime.datetime.fromtimestamp(now, tz)
        nxt = (dt + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return nxt.timestamp()
    except Exception:
        # không có dữ liệu múi giờ (Windows thiếu tzdata): lấy UTC-8 cố định, sai lệch tối đa 1 giờ khi giờ mùa hè
        dt = datetime.datetime.fromtimestamp(now, datetime.timezone(datetime.timedelta(hours=-8)))
        nxt = (dt + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return nxt.timestamp()


def _pt_day(now: float) -> str:
    return str(int(_next_pt_midnight(now)))  # định danh "ngày" = mốc nửa đêm kế tiếp


def parse_env_limits(raw: str) -> Dict[str, Tuple[int, int]]:
    out: Dict[str, Tuple[int, int]] = {}
    for part in re.split(r"[,;\s]+", raw or ""):
        bits = part.split(":")
        if len(bits) == 3 and bits[0]:
            try:
                out[bits[0]] = (max(0, int(bits[1])), max(0, int(bits[2])))
            except ValueError:
                pass
    return out


class ModelRouter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._learned: Dict[str, Tuple[Optional[int], Optional[int]]] = {}
        self._win: Dict[Tuple[str, str], Deque[float]] = {}
        self._day: Dict[Tuple[str, str], Tuple[str, int]] = {}
        self._exhausted: Dict[Tuple[str, str], float] = {}
        self._latency: Dict[str, Tuple[float, float]] = {}  # model → (trung bình trượt giây, thời điểm ghi): phá thế hòa khi RPD bằng nhau

    # ---------------------------------------------------------------- hạn mức
    def limits(self, model: str) -> Tuple[int, int]:
        """(RPM, RPD) đang dùng: ưu tiên biến môi trường, rồi số đã học từ lỗi 429, rồi bảng mặc định."""
        env = parse_env_limits(os.getenv("GEMINI_MODEL_LIMITS", ""))
        if model in env:
            return env[model]
        rpm, rpd = DEFAULT_LIMITS.get(model, UNKNOWN_LIMITS)
        learned = self._learned.get(model)
        if learned:
            rpm = learned[0] or rpm
            rpd = learned[1] or rpd
        cap = os.getenv("GEMINI_RPM_PER_KEY")
        if cap and cap.isdigit() and int(cap) > 0:
            rpm = min(rpm, int(cap))
        return rpm, rpd

    def used_today(self, key: str, model: str, now: Optional[float] = None) -> int:
        t = time.time() if now is None else now
        with self._lock:
            day, n = self._day.get((key, model), ("", 0))
            return n if day == _pt_day(t) else 0

    def remaining_today(self, model: str, keys: List[str], now: Optional[float] = None) -> int:
        rpd = self.limits(model)[1]
        if rpd <= 0:
            return 10**9
        return sum(max(0, int(rpd * RPD_SAFETY) - self.used_today(k, model, now)) for k in keys)

    # ---------------------------------------------------------------- giữ lượt
    def try_reserve(self, key: str, model: str, now: Optional[float] = None) -> bool:
        t = time.time() if now is None else now
        rpm, rpd = self.limits(model)
        with self._lock:
            pair = (key, model)
            if self._exhausted.get(pair, 0.0) > t:
                return False
            day_id = _pt_day(t)
            day, n = self._day.get(pair, (day_id, 0))
            if day != day_id:
                n = 0
            if rpd > 0 and n >= int(rpd * RPD_SAFETY):
                return False
            dq = self._win.setdefault(pair, deque())
            while dq and t - dq[0] >= 60.0:
                dq.popleft()
            if rpm > 0 and len(dq) >= rpm:
                return False
            dq.append(t)
            self._day[pair] = (day_id, n + 1)
            return True

    def note_error(self, key: str, model: str, err: BaseException, now: Optional[float] = None) -> None:
        """Học hạn mức thật từ thông báo 429 của Google và cho cặp (khóa, model) nghỉ tới nửa đêm Thái Bình Dương nếu hết hạn mức NGÀY."""
        t = time.time() if now is None else now
        text = str(getattr(err, "reason", "") or "") + " " + str(err)
        compact = text.replace(" ", "").replace("_", "").lower()
        qv = re.search(r'"?quotaValue"?\s*[:=]\s*"?(\d+)', text)
        if getattr(err, "code", None) == 404 or "nolongeravailable" in compact:
            # model không có cho khóa này (VD khóa mới không còn 2.5-flash): đừng thử lại cho tới ngày mai
            with self._lock:
                self._exhausted[(key, model)] = t + 24 * 3600
        elif "perday" in compact:
            with self._lock:
                self._exhausted[(key, model)] = _next_pt_midnight(t)
                if qv:
                    cur = self._learned.get(model, (None, None))
                    self._learned[model] = (cur[0], int(qv.group(1)))
        elif "perminute" in compact and qv:
            with self._lock:
                cur = self._learned.get(model, (None, None))
                self._learned[model] = (int(qv.group(1)), cur[1])

    def note_latency(self, model: str, seconds: float, ok: bool = True) -> None:
        """Ghi thời gian một lần gọi. Lỗi/hết giờ tính phạt 20 s để model hay nghẽn tụt xuống khi RPD bằng nhau."""
        v = seconds if ok else max(seconds, 20.0)
        now = time.time()
        with self._lock:
            old = self._latency.get(model)
            cur = self._decayed(old, now) if old else None
            self._latency[model] = (v if cur is None else 0.7 * cur + 0.3 * v, now)

    @staticmethod
    def _decayed(entry: Tuple[float, float], now: float) -> float:
        """Điểm phạt/khen phai dần (nửa đời 120 s) về mức mặc định 3 s: model từng nghẽn một lúc được thử lại, không bị xếp cuối mãi."""
        v, t = entry
        return LATENCY_DEFAULT_S + (v - LATENCY_DEFAULT_S) * (0.5 ** (max(0.0, now - t) / LATENCY_HALF_LIFE_S))

    def latency(self, model: str, now: Optional[float] = None) -> float:
        e = self._latency.get(model)
        return LATENCY_DEFAULT_S if e is None else self._decayed(e, time.time() if now is None else now)

    def note_failure(self, key: str, model: str, err: BaseException, seconds: float) -> None:
        """Ghi một lần gọi lỗi: học hạn mức/cho nghỉ khi cần, và phạt độ trễ nếu là lỗi tạm thời (hết giờ, 5xx, 429 theo phút)."""
        self.note_error(key, model, err)
        code = getattr(err, "code", None)
        text = str(getattr(err, "reason", "") or "") + " " + str(err)
        permanent = code == 404 or "nolongeravailable" in text.replace(" ", "").lower() or code in (401, 403, 400)
        if not permanent:
            self.note_latency(model, seconds, ok=False)

    # ---------------------------------------------------------------- thứ tự
    def order(self, feature: str, models: List[str]) -> List[str]:
        """Chức năng chạy nhiều (Vision, hỏi đáp, gia sư): model RPD lớn trước. Chức năng khác: model RPD nhỏ trước (để dành model lớn)."""
        heavy = feature in HEAVY_FEATURES
        idx = {m: i for i, m in enumerate(models)}
        # RPD là tiêu chí chính; RPD bằng nhau thì model nhanh hơn (trung bình trượt) trước, rồi theo thứ tự cấu hình
        return sorted(models, key=lambda m: (-self.limits(m)[1] if heavy else self.limits(m)[1], round(self.latency(m), 1), idx[m]))

    def plan(self, feature: str, keys: List[str], models: List[str], skip: Optional[Set[str]] = None) -> Iterator[Tuple[str, str]]:
        """
        Lần lượt trả (khóa, model) tốt nhất còn lượt, đã giữ lượt: model theo `order`, trong mỗi model xoay qua các khóa
        (khóa dùng ít trong ngày nhất trước, để chia đều RPD giữa các khóa). `skip` = các khóa bỏ qua (VD khóa sai).
        """
        for model in self.order(feature, models):
            ordered = sorted(keys, key=lambda k: self.used_today(k, model))
            for key in ordered:
                if skip and key in skip:
                    continue
                if self.try_reserve(key, model):
                    yield key, model

    def status(self, keys: List[str], models: List[str]) -> List[Dict[str, object]]:
        out: List[Dict[str, object]] = []
        with self._lock:
            seen = {k for (k, _m) in self._day}  # cả khóa người dùng gửi kèm yêu cầu (không nằm trong .env)
        all_keys = list(dict.fromkeys(list(keys) + sorted(seen)))
        for m in models:
            rpm, rpd = self.limits(m)
            used = sum(self.used_today(k, m) for k in all_keys)
            out.append({"model": m, "rpm": rpm, "rpd": rpd, "used_today": used, "capacity_today": rpd * len(all_keys) if rpd else None, "avg_latency_s": round(self.latency(m), 2)})
        return out


model_router = ModelRouter()
