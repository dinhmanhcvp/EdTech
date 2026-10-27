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
                    os.environ[_k.strip()] = _v.strip().strip("'\"")
    except Exception as _e:
        print(f"[main] .env load warning: {_e}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.visualize import router as visualize_router
from routers.companion import router as companion_router
from routers.classroom import router as classroom_router
from routers.recognize_ink import router as recognize_ink_router
from routers.classroom_ws import router as classroom_ws_router
from routers.classroom_ws import _public_size
from routers.visualize import RAPIDOCR_ENGINE, LOCAL_MATH_ONNX
from cache.chroma_cache import CHROMADB_AVAILABLE
from routers.student_context import router as student_context_router
from student_context import store_ready

app = FastAPI(
    title="Socratic Vision Board - Deterministic & Socratic AI Engine",
    version="2.0.0",
    description="Edge-first AI compiler that translates teacher lasso & student friction into deterministic 60FPS blueprints."
)

# Enable CORS for Smartboard canvas & Student App. In a real classroom the
# browser runs on another device, so origins must be configurable instead of
# relying on localhost-only defaults.
_cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Domain Routers
app.include_router(visualize_router)
app.include_router(companion_router)
app.include_router(classroom_router)
app.include_router(recognize_ink_router)
app.include_router(classroom_ws_router)
app.include_router(student_context_router)

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
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
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
