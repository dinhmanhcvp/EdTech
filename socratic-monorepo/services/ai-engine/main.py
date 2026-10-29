"""
SOCRATIC VISION BOARD AI ENGINE - FastAPI Backend v2.0.0
Architecture: Hybrid Edge-First & Deterministic Engine Architecture
"""
import os
# Auto-load .env file if present
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    try:
        with open(_env_path, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    # biến môi trường thật (Render, shell) luôn thắng tệp .env; .env chỉ điền chỗ còn thiếu
                    os.environ.setdefault(_k.strip(), _v.strip().strip("'\""))
    except Exception as _e:
        print(f"[main] .env load warning: {_e}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from deploy_guard import RateLimitMiddleware, is_production, warm_up
from llm import gemini_rest
from llm.model_router import model_router
from routers.visualize import router as visualize_router
from routers.companion import router as companion_router
from routers.classroom import router as classroom_router
from routers.recognize_ink import router as recognize_ink_router
from routers.board_qa import router as board_qa_router
from routers.grade_steps import router as grade_steps_router
from routers.lesson_notes import router as lesson_notes_router
from routers.similar_problems import router as similar_problems_router
from routers.console import router as console_router
from routers.classroom_ws import router as classroom_ws_router
from routers.classroom_ws import _public_size
from routers.visualize import RAPIDOCR_ENGINE, LOCAL_MATH_ONNX
from cache.chroma_cache import CHROMADB_AVAILABLE
from routers.student_context import router as student_context_router
from student_context import store_ready
from routers.online_tutor import router as online_tutor_router
from hub.db import init_db as init_hub_db
from routers.hub_auth import router as hub_auth_router
from routers.hub_roster import router as hub_roster_router
from routers.hub_plans import router as hub_plans_router
from routers.hub_sessions import router as hub_sessions_router
from routers.hub_student import router as hub_student_router
from routers.hub_metrics import router as hub_metrics_router
from routers.hub_parent import router as hub_parent_router
from routers.hub_assignments import router as hub_assignments_router
from routers.hub_runs import router as hub_runs_router
from routers.hub_files import router as hub_files_router
from routers.lesson import router as lesson_router
from llm.key_pool import global_key_pool

app = FastAPI(
    title="Socratic Vision Board - Deterministic & Socratic AI Engine",
    version="2.0.0",
    description="Edge-first AI compiler that translates teacher lasso & student friction into deterministic 60FPS blueprints."
)

# Enable CORS for Smartboard canvas & Student App. In a real classroom the
# browser runs on another device, so origins must be configurable instead of
# relying on localhost-only defaults.
_cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
# Thứ tự: thêm sau = bao ngoài. Giới hạn tần suất nằm trong CORS (để 429 vẫn có tiêu đề CORS), nén gzip nằm giữa.
app.add_middleware(
    RateLimitMiddleware,
    prefixes=("/api/v1/canvas/recognize-ink", "/api/v1/canvas/compile-lasso", "/api/v1/canvas/ask-board", "/api/v1/canvas/grade-steps", "/api/v1/canvas/lesson-notes", "/api/v1/canvas/similar-problems", "/api/v1/console/login", "/api/v1/console/register", "/api/v1/board/pair", "/api/v1/hub/auth"),
)
app.add_middleware(GZipMiddleware, minimum_size=1200)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Địa chỉ xem trước của Vercel (https://<du-an>-git-<nhanh>-<nhom>.vercel.app) đổi theo từng lần deploy: đặt CORS_ORIGIN_REGEX
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup_warm() -> None:
    if is_production():
        warm_up()

# Mount Domain Routers
app.include_router(visualize_router)
app.include_router(companion_router)
app.include_router(classroom_router)
app.include_router(recognize_ink_router)
app.include_router(board_qa_router)
app.include_router(grade_steps_router)
app.include_router(lesson_notes_router)
app.include_router(similar_problems_router)
app.include_router(console_router)
app.include_router(classroom_ws_router)
app.include_router(student_context_router)
app.include_router(online_tutor_router)
app.include_router(lesson_router)

# Trục tam giác (portal giáo viên · bảng · Socratic app): xem docs/superpowers/specs/2026-10-29-tam-giac-he-thong-design.md
@app.on_event("startup")
def _startup_hub() -> None:
    # khi khởi động, không phải lúc import: pytest import main mà không được seed vào DB thật (bảng hub vẫn tự tạo khi cần)
    init_hub_db()


app.include_router(hub_auth_router)
app.include_router(hub_roster_router)
app.include_router(hub_plans_router)
app.include_router(hub_sessions_router)
app.include_router(hub_student_router)
app.include_router(hub_metrics_router)
app.include_router(hub_parent_router)
app.include_router(hub_assignments_router)
app.include_router(hub_runs_router)
app.include_router(hub_files_router)

from fastapi.responses import Response, JSONResponse
from graph_engine import generate_neon_graph

@app.get("/api/v1/plot")
def plot_equation(equation: str = "A * sin(x)", a: float = 1.0, b: float = 0.0, c: float = 0.0, d: float = 0.0, format: str = "svg"):
    """
    Renders dynamic Matplotlib dark-neon SVG via SymPy + NumPy.
    """
    svg_data = generate_neon_graph(equation, param_a=a, param_b=b, param_c=c, param_d=d)
    if format == "json":
        return JSONResponse({"equation": equation, "param_a": a, "param_b": b, "param_c": c, "param_d": d, "svg": svg_data})
    return Response(content=svg_data, media_type="image/svg+xml")



@app.get("/health")
def health_check():
    room_stats = _public_size()
    pool_status = global_key_pool.get_status()
    gemini_configured = bool(pool_status["any_configured"] or os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "version": "2.0.0",
        "architecture": "Deterministic 60FPS & Hybrid Edge-First",
        "engines_active": [
            "MathPlotEngine",
            "PhysicsSandboxEngine",
            "ChemistryLabEngine",
            "BioSystemEngine",
            "AdvancedStemEngines"
        ],
        "runtime": {
            "student_context_store": store_ready(),
            "rapidocr": RAPIDOCR_ENGINE is not None,
            "latex_onnx": bool(LOCAL_MATH_ONNX and LOCAL_MATH_ONNX.available),
            "chromadb": CHROMADB_AVAILABLE,
            "gemini_configured": gemini_configured,
            # hạn mức từng model (RPM/RPD đang dùng, đã dùng hôm nay trên tất cả khóa): để biết model nào sắp hết lượt
            "model_quota": model_router.status(global_key_pool._collect_env_gemini_keys(), list(dict.fromkeys(gemini_rest.vision_models() + gemini_rest.text_models()))),
            "vision_provider": (os.getenv("VISION_PROVIDER", "auto") or "auto").strip().lower(),
            "key_pool": {
                "gemini_total": pool_status["gemini"]["total"],
                "gemini_active": pool_status["gemini"]["active"],
                "openrouter_total": pool_status["openrouter"]["total"],
                "openrouter_active": pool_status["openrouter"]["active"],
                "total_active": pool_status["total_active_keys"],
            },
            "classroom_rooms": room_stats["rooms"],
            "classroom_students": room_stats["students"],
        },
        "endpoints": [
            "/api/v1/canvas/compile-lasso",
            "/api/v1/companion/evaluate-step",
            "/api/v1/companion/verify-voice-gate",
            "/api/v1/plot",
            "/health"
        ],
        "verification_tiers": {
            "tier1_symbolic": "SymPy + ChemBalancer (<10ms, 0 API Call)",
            "tier2_cache": "ChromaDB Semantic Cache (>0.90 similarity, 0 API Call)",
            "tier3_llm": "Socratic Scaffolding (Zero answer leak)"
        }
    }

@app.get("/health/ready")
def readiness_check():
    ready = store_ready()
    return {"ready": ready, "checks": {"student_context_store": ready}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
