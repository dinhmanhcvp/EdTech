"""Đồ thị /api/v1/plot: cùng yêu cầu thì dùng lại kết quả đã dựng (cache) và cho phép trình duyệt giữ lại."""
from graph_engine import generate_neon_graph


def test_plot_lap_lai_dung_cache(client):
    generate_neon_graph.cache_clear()
    first = client.get("/api/v1/plot", params={"equation": "A*sin(x)", "a": 1.5})
    again = client.get("/api/v1/plot", params={"equation": "A*sin(x)", "a": 1.5})
    assert first.status_code == 200 and first.content == again.content
    info = generate_neon_graph.cache_info()
    assert info.misses == 1 and info.hits == 1
    assert "max-age=3600" in first.headers["cache-control"]


def test_tham_so_khac_khong_dung_chung_cache(client):
    generate_neon_graph.cache_clear()
    client.get("/api/v1/plot", params={"equation": "A*sin(x)", "a": 1.0})
    client.get("/api/v1/plot", params={"equation": "A*sin(x)", "a": 2.0})
    assert generate_neon_graph.cache_info().misses == 2
