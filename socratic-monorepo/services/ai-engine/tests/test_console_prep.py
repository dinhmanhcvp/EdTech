"""Chuẩn bị tiết trên trang quản lý: gắn tài nguyên, mô phỏng định mở và giáo án; bảng nhận khi ghép (giáo án không có đáp án)."""
import sqlite3

from conftest import ASG_SAMPLE, console_class, console_login
from hub.seed import DEMO_PLAN
from routers.console import sim_catalog
from store.console_db import ConsoleDB


def _resource(client, h):
    r = client.post("/api/v1/hub/assignments", json={"title": "Bài tập 1", "subject": "MATH", "kind": "exercise"}, headers=h)
    assert r.status_code == 200, r.text
    aid = r.json()["id"]
    body = {k: ASG_SAMPLE[k] for k in ("title", "subject", "kind", "questions")}
    assert client.put(f"/api/v1/hub/assignments/{aid}", json={"body": body, "baseVersion": r.json()["version"]}, headers=h).status_code == 200
    return aid


def _plan(client, h):
    r = client.post("/api/v1/hub/plans", json={"body": DEMO_PLAN}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_sim_catalog_lists_curriculum_presets(client):
    h = console_login(client)
    sims = client.get("/api/v1/console/sim-catalog", headers=h).json()["sims"]
    assert len(sims) > 100 and {"id", "engine", "title"} <= set(sims[0])
    assert client.get("/api/v1/console/sim-catalog").status_code == 401


def test_period_keeps_prep_and_board_receives_it_without_answers(client):
    h = console_login(client)
    cid = console_class(client, h)
    aid, plan_id, sim = _resource(client, h), _plan(client, h), sim_catalog()[0]["id"]
    body = {"title": "Tiết 5", "class_id": cid, "resource_ids": [aid, aid], "sims": [sim], "plan_id": plan_id}
    p = client.post("/api/v1/console/periods", json=body, headers=h).json()
    assert (p["resource_ids"], p["sims"], p["plan_id"]) == ([aid], [sim], plan_id)
    assert client.get(f"/api/v1/console/periods/{p['id']}", headers=h).json()["plan_id"] == plan_id

    code = client.post(f"/api/v1/console/periods/{p['id']}/start", headers=h).json()["pairCode"]
    prep = client.post("/api/v1/board/pair", json={"code": code}).json()["prep"]
    assert prep["resources"] == [{"id": aid, "title": ASG_SAMPLE["title"], "kind": "exercise", "pageCount": 0}]
    assert prep["sims"][0]["id"] == sim and prep["sims"][0]["title"]
    items = [i for s in prep["plan"]["body"]["sections"] for i in s["items"]]
    assert items and not any("answer" in i or "correct" in i for i in items)


def test_prep_rejects_unknown_sim_and_other_teachers_items(client):
    lan, nam = console_login(client, "co_lan"), console_login(client, "thay_nam")
    aid, plan_id = _resource(client, lan), _plan(client, lan)
    post = lambda **kw: client.post("/api/v1/console/periods", json={"title": "T", **kw}, headers=nam)
    assert post(sims=["KHONG_CO_MA_NAY"]).status_code == 422
    assert post(resource_ids=[aid]).status_code == 422
    assert post(plan_id=plan_id).status_code == 422
    assert post(resource_ids=[aid]).json()["detail"].startswith("Tài nguyên")


def test_deleted_resource_is_skipped_on_board(client):
    h = console_login(client)
    aid = _resource(client, h)
    p = client.post("/api/v1/console/periods", json={"title": "T", "resource_ids": [aid]}, headers=h).json()
    assert client.delete(f"/api/v1/hub/assignments/{aid}", headers=h).status_code == 200
    code = client.post(f"/api/v1/console/periods/{p['id']}/start", headers=h).json()["pairCode"]
    assert client.post("/api/v1/board/pair", json={"code": code}).json()["prep"]["resources"] == []


def test_old_database_gets_prep_column(tmp_path):
    path = str(tmp_path / "old.db")
    con = sqlite3.connect(path)
    con.executescript("""
    CREATE TABLE periods (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, class_id TEXT, lesson_id TEXT, title TEXT NOT NULL,
      goals TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', prompts_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'planned', room_id TEXT, board_token_hash TEXT, board_json TEXT, submissions_json TEXT,
      created_at REAL NOT NULL, started_at REAL, ended_at REAL);
    INSERT INTO periods(id, teacher_id, title, created_at) VALUES ('p1', 't1', 'Cũ', 0);
    """)
    con.commit()
    con.close()
    store = ConsoleDB(path)
    row = store._one("SELECT * FROM periods WHERE id='p1'")
    assert store._period(row)["resource_ids"] == [] and store._period(row)["plan_id"] is None
