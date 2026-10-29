"""Điều phối (khóa, model) theo RPD: model RPD lớn cho Vision/hỏi đáp/gia sư, model RPD nhỏ nhường lại hoặc đỡ khi hết."""
import urllib.error

from llm.model_router import ModelRouter, parse_env_limits


def _router(monkeypatch, limits="big:10:1000,mid:10:250,small:10:20"):
    monkeypatch.setenv("GEMINI_MODEL_LIMITS", limits)
    monkeypatch.delenv("GEMINI_RPM_PER_KEY", raising=False)
    return ModelRouter()


def test_parse_env_limits():
    assert parse_env_limits("a:5:100, b:10:250;bad:x:y") == {"a": (5, 100), "b": (10, 250)}


def test_heavy_features_prefer_large_rpd_and_other_features_the_small_ones(monkeypatch):
    r = _router(monkeypatch)
    models = ["small", "mid", "big"]
    for f in ("vision", "qa", "tutor"):
        assert r.order(f, models) == ["big", "mid", "small"]
    assert r.order("other", models) == ["small", "mid", "big"]


def test_plan_uses_big_model_first_and_balances_keys_by_usage(monkeypatch):
    r = _router(monkeypatch)
    got = []
    for _ in range(6):
        k, m = next(r.plan("vision", ["k1", "k2", "k3"], ["small", "big"]))
        got.append((k, m))
    assert {m for _, m in got} == {"big"}
    assert sorted(k for k, _ in got) == ["k1", "k1", "k2", "k2", "k3", "k3"]  # chia đều RPD giữa các khóa


def test_rpd_small_model_hands_over_when_exhausted(monkeypatch):
    r = _router(monkeypatch, "big:100:10,small:100:1000")  # model "big" chỉ 10 lượt/ngày thật ra là nhỏ
    # RPD lớn nhất là "small": vision dùng nó trước
    assert next(r.plan("vision", ["k"], ["big", "small"]))[1] == "small"
    # hết 90% RPD của "small" thì nhường sang "big"
    for _ in range(899):
        r.try_reserve("k", "small")
    assert next(r.plan("vision", ["k"], ["big", "small"]))[1] == "big"


def test_ninety_percent_cap(monkeypatch):
    r = _router(monkeypatch, "m:1000:20")
    ok = [r.try_reserve("k", "m", now=100.0 + i) for i in range(25)]
    assert ok.count(True) == 18  # 90% của 20


def test_rpm_window(monkeypatch):
    r = _router(monkeypatch, "m:3:1000")
    assert [r.try_reserve("k", "m", now=10 + i) for i in range(4)] == [True, True, True, False]
    assert r.try_reserve("k", "m", now=75)  # lượt cũ nhất rơi khỏi cửa sổ 60 s


def test_daily_quota_error_parks_the_pair_until_midnight_pacific(monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL_LIMITS", raising=False)  # số đặt tay luôn thắng số học được
    r = ModelRouter()
    body = '{"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaValue":"50"}]}]}}'
    err = urllib.error.HTTPError("u", 429, "Too Many Requests " + body, None, None)
    r.note_error("k1", "big", err, now=1_000_000.0)
    assert not r.try_reserve("k1", "big", now=1_000_100.0)
    assert r.try_reserve("k2", "big", now=1_000_100.0)  # khóa khác (dự án khác) vẫn dùng được
    assert r.try_reserve("k1", "mid", now=1_000_100.0)  # model khác trên cùng khóa vẫn dùng được
    assert r.limits("big")[1] == 50  # học hạn mức thật từ quotaValue
    # sau tối đa 24 giờ thì dùng lại được
    assert r.try_reserve("k1", "big", now=1_000_000.0 + 25 * 3600)


def test_per_minute_error_does_not_park_but_learns(monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL_LIMITS", raising=False)
    r = ModelRouter()
    err = urllib.error.HTTPError("u", 429, 'Too Many Requests "quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaValue":"7"', None, None)
    r.note_error("k", "gemini-3-flash-preview", err, now=5.0)
    assert r.try_reserve("k", "gemini-3-flash-preview", now=6.0)
    assert r.limits("gemini-3-flash-preview")[0] == 7


def test_rpm_cap_env_applies_to_every_model(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL_LIMITS", "m:50:1000")
    monkeypatch.setenv("GEMINI_RPM_PER_KEY", "8")
    assert ModelRouter().limits("m")[0] == 50  # số đặt tay thắng
    monkeypatch.delenv("GEMINI_MODEL_LIMITS")
    assert ModelRouter().limits("gemini-2.5-flash-lite")[0] == 8


def test_skip_keys_and_status(monkeypatch):
    r = _router(monkeypatch)
    plan = list(r.plan("vision", ["bad", "good"], ["big"], skip={"bad"}))
    assert plan == [("good", "big")]
    st = r.status(["good"], ["big", "small"])
    assert st[0]["used_today"] == 1 and st[0]["capacity_today"] == 1000 and st[1]["used_today"] == 0


def test_equal_rpd_prefers_the_faster_model_and_penalises_failures(monkeypatch):
    r = _router(monkeypatch, "a:10:250,b:10:250,c:10:250")
    r.note_latency("a", 1.2)
    r.note_latency("b", 4.0)
    r.note_latency("c", 0.9, ok=False)  # hết giờ/lỗi bị phạt ≥ 20 s
    assert r.order("vision", ["c", "b", "a"]) == ["a", "b", "c"]
    # RPD vẫn là tiêu chí chính: model chậm hơn nhưng RPD lớn hơn đứng trước
    monkeypatch.setenv("GEMINI_MODEL_LIMITS", "a:10:250,b:10:1000,c:10:250")
    assert r.order("vision", ["a", "b", "c"])[0] == "b"


def test_status_counts_keys_that_only_arrive_in_requests(monkeypatch):
    r = _router(monkeypatch)
    r.try_reserve("header-key-1", "big")
    r.try_reserve("header-key-2", "big")
    st = r.status([], ["big"])
    assert st[0]["used_today"] == 2 and st[0]["capacity_today"] == 2000


def test_latency_penalty_decays_so_a_slow_moment_is_forgotten(monkeypatch):
    r = _router(monkeypatch, "a:10:250,b:10:250")
    import time as _t
    r.note_latency("a", 1.0, ok=False)  # một lần nghẽn
    assert r.order("vision", ["a", "b"])[0] == "b"
    assert r.latency("a", now=_t.time() + 600) < 3.7  # sau 10 phút gần như hết phạt


def test_model_not_available_for_a_key_is_parked_for_a_day(monkeypatch):
    r = _router(monkeypatch)
    err = urllib.error.HTTPError("u", 404, "Not Found This model models/x is no longer available to new users", None, None)
    r.note_failure("k", "big", err, 0.4, )
    assert not r.try_reserve("k", "big")
    assert r.try_reserve("other", "big")
    assert r.latency("big") == 3.0  # 404 không phạt độ trễ (không phải lỗi của model với mọi khóa)


def test_gemini_25_flash_defaults_to_20_rpd_and_is_used_last(monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL_LIMITS", raising=False)
    r = ModelRouter()
    assert r.limits("gemini-2.5-flash")[1] == 20
    models = ["gemini-2.5-flash", "gemini-3.1-flash-lite"]
    assert r.order("vision", models)[-1] == "gemini-2.5-flash"
    # 90% của 20 = 18 lượt mỗi khóa rồi nhường
    assert [r.try_reserve("k", "gemini-2.5-flash", now=1000.0 + 61 * i) for i in range(20)].count(True) == 18
