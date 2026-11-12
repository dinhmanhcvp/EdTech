"""/ping: điểm cuối siêu nhẹ cho giữ-thức và làm ấm sớm (không đụng bể khóa AI)."""


def test_ping_get_and_head(client):
    assert client.get("/ping").json() == {"ok": True}
    assert client.head("/ping").status_code == 200


def test_ping_nhe_hon_health(client):
    assert len(client.get("/ping").content) < 40 < len(client.get("/health").content)
