def test_init_db_seeds_demo_once(hub_db):
    from hub import db
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 8
        assert conn.execute("SELECT current_version FROM teaching_plans WHERE id='plan-demo-rlc'").fetchone()[0] == 1
    db.init_db()
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 8


def test_db_path_is_student_context_db(hub_db):
    import student_context
    from hub import db
    assert db.db_path() == hub_db == student_context.DB_PATH


def test_new_login_code_alphabet(hub_db):
    from hub import db
    with db.connect() as conn:
        code = db.new_login_code(conn)
    assert len(code) == 6 and set(code) <= set("23456789ABCDEFGHJKMNPQRSTUVWXYZ")


def test_no_demo_teacher_in_production_without_pin(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("HUB_DEMO_PIN", raising=False)
    from hub import db
    db.init_db()
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0] == 0
