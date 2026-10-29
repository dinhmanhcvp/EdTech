import asyncio
import json


def test_publish_reaches_only_subscribers_of_channel():
    from hub.events import Bus
    bus = Bus()
    qa, qb = bus.subscribe("a"), bus.subscribe("b")
    assert bus.publish("a", {"type": "x"}) == 1
    assert qa.get_nowait() == {"type": "x"} and qb.empty()
    bus.unsubscribe("a", qa)
    assert bus.publish("a", {"type": "y"}) == 0


def _collect(agen, limit=10):
    async def run():
        out = []
        async for chunk in agen:
            out.append(chunk)
            if len(out) >= limit:
                break
        return out
    return asyncio.run(run())


def test_sse_iter_emits_first_then_events_and_stops():
    from hub.events import Bus, sse_iter
    bus = Bus()
    q = bus.subscribe("c")
    bus.publish("c", {"type": "x"})
    bus.publish("c", {"type": "paired"})
    bus.publish("c", {"type": "after"})
    out = _collect(sse_iter(q, first={"type": "hello"}, until=lambda e: e["type"] == "paired", poll_s=0.01))
    assert [json.loads(c[len("data: "):])["type"] for c in out] == ["hello", "x", "paired"]
    assert all(c.startswith("data: ") and c.endswith("\n\n") for c in out)


def test_sse_iter_stops_on_first_event_when_until_matches():
    from hub.events import Bus, sse_iter
    q = Bus().subscribe("d")
    out = _collect(sse_iter(q, first={"type": "paired"}, until=lambda e: e["type"] == "paired", poll_s=0.01))
    assert len(out) == 1


def test_sse_iter_heartbeat():
    from hub.events import Bus, sse_iter
    q = Bus().subscribe("e")
    out = _collect(sse_iter(q, heartbeat_s=0.05, poll_s=0.01), limit=1)
    assert out == [": ping\n\n"]


def test_sse_response_headers():
    import starlette.middleware.gzip as gz
    from hub.events import sse_response
    r = sse_response("c")
    assert r.media_type == "text/event-stream"
    assert r.headers["cache-control"] == "no-cache"
    assert "text/event-stream" in gz.DEFAULT_EXCLUDED_CONTENT_TYPES
