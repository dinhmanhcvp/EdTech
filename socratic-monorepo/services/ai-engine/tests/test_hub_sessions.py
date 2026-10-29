import copy
import json

from hub.seed import DEMO_PLAN


def pair(client):
    r = client.post("/api/v1/hub/pairings", json={})
    assert r.status_code == 200
    return r.json()


def claim(client, headers, code, class_id="12a1", plan_id="plan-demo-rlc"):
    return client.post(f"/api/v1/hub/pairings/{code}/claim", json={"classId": class_id, "planId": plan_id}, headers=headers)


def board_token_for(client, teacher_headers):
    from hub.events import bus
    p = pair(client)
    q = bus.subscribe(f"pairing:{p['code']}")
    sid = claim(client, teacher_headers(client), p["code"]).json()["sessionId"]
    event = q.get_nowait()
    return sid, {"Authorization": f"Bearer {event['boardToken']}"}, event


def _shift(monkeypatch, seconds):
    import time
    from hub import clock
    base = time.time()
    monkeypatch.setattr(clock, "now", lambda: base + seconds)


def test_pairing_claim_creates_live_session(client, teacher_headers):
    from hub.db import connect
    sid, _, event = board_token_for(client, teacher_headers)
    assert event["type"] == "paired" and event["boardToken"]
    assert event["class"] == {"id": "12a1", "name": "12A1"} and event["plan"]["version"] == 1
    assert '"answer"' not in json.dumps(event) and '"correct"' not in json.dumps(event)
    with connect() as conn:
        assert conn.execute("SELECT status FROM class_sessions WHERE id=?", (sid,)).fetchone()[0] == "live"


def test_second_claim_is_gone(client, teacher_headers):
    p = pair(client)
    h = teacher_headers(client)
    assert claim(client, h, p["code"]).status_code == 200
    assert claim(client, h, p["code"]).status_code == 410


def test_expired_pairing_is_gone(client, teacher_headers, monkeypatch):
    p = pair(client)
    h = teacher_headers(client)
    _shift(monkeypatch, 121)
    assert claim(client, h, p["code"]).status_code == 410
    r = client.get(f"/api/v1/hub/stream/pairing/{p['code']}", headers={"Authorization": f"Board-Secret {p['boardSecret']}"})
    assert r.status_code == 410


def test_pairing_stream_wrong_secret(client):
    p = pair(client)
    r = client.get(f"/api/v1/hub/stream/pairing/{p['code']}", headers={"Authorization": "Board-Secret nope"})
    assert r.status_code == 401


def test_pairing_reuses_board_id(client):
    first = pair(client)
    again = client.post("/api/v1/hub/pairings", json={"boardId": first["boardId"]}).json()
    assert again["boardId"] == first["boardId"] and again["code"] != first["code"]


def test_pairing_stream_after_claim_replays_paired(client, teacher_headers):
    p = pair(client)
    assert claim(client, teacher_headers(client), p["code"]).status_code == 200
    with client.stream("GET", f"/api/v1/hub/stream/pairing/{p['code']}", headers={"Authorization": f"Board-Secret {p['boardSecret']}"}) as r:
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
        lines = [l for l in r.iter_lines() if l.startswith("data: ")]
    assert len(lines) == 1 and json.loads(lines[0][6:])["type"] == "paired"


def test_claim_other_teachers_class_404(client, teacher_headers):
    from hub.auth import hash_pin
    from hub.db import connect
    h, salt = hash_pin("1357")
    with connect() as conn:
        conn.execute("INSERT INTO teachers VALUES ('gv-khac','GV Khác',?,?)", (h, salt))
        conn.execute("INSERT INTO classes VALUES ('10a9','10A9','MATH','gv-khac')")
    p = pair(client)
    assert claim(client, teacher_headers(client), p["code"], class_id="10a9").status_code == 404
    assert claim(client, teacher_headers(client, "gv-khac", "1357"), p["code"], class_id="10a9").status_code == 404  # giáo án không phải của gv-khac


def test_board_token_reads_own_session_plan_only(client, teacher_headers):
    sid_a, board_a, _ = board_token_for(client, teacher_headers)
    sid_b, _, _ = board_token_for(client, teacher_headers)
    r = client.get(f"/api/v1/hub/sessions/{sid_a}/plan", headers=board_a)
    assert r.status_code == 200 and r.json()["version"] == 1 and '"answer"' not in r.text
    assert client.get(f"/api/v1/hub/sessions/{sid_b}/plan", headers=board_a).status_code == 403


def test_board_token_expires_after_12h_live(client, teacher_headers, monkeypatch):
    sid, board, _ = board_token_for(client, teacher_headers)
    _shift(monkeypatch, 43201)
    r = client.get(f"/api/v1/hub/sessions/{sid}/plan", headers=board)
    assert r.status_code == 401 and r.json()["detail"] == "board_session_closed"


def test_plan_save_notifies_live_board(client, teacher_headers):
    from hub.events import bus
    sid, board, _ = board_token_for(client, teacher_headers)
    q = bus.subscribe(f"board:{sid}")
    body = copy.deepcopy(DEMO_PLAN); body["title"] = "Đổi giữa tiết"
    assert client.put("/api/v1/hub/plans/plan-demo-rlc", json={"body": body, "baseVersion": 1}, headers=teacher_headers(client)).status_code == 200
    assert q.get_nowait() == {"type": "plan_updated", "version": 2}
    assert client.get(f"/api/v1/hub/sessions/{sid}/plan", headers=board).json()["body"]["title"] == "Đổi giữa tiết"


def test_board_stream_requires_board_token(client, teacher_headers):
    assert client.get("/api/v1/hub/stream/board", headers=teacher_headers(client)).status_code == 403
