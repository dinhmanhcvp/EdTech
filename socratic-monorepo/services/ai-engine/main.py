"""
SOCRATIC VISION BOARD AI ENGINE - FastAPI Backend v2.0.0
Architecture: Hybrid Edge-First & Deterministic Engine Architecture
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.visualize import router as visualize_router
from routers.companion import router as companion_router

app = FastAPI(
    title="Socratic Vision Board - Deterministic & Socratic AI Engine",
    version="2.0.0",
    description="Edge-first AI compiler that translates teacher lasso & student friction into deterministic 60FPS blueprints."
)

# Enable CORS for Smartboard canvas & Student App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Domain Routers
app.include_router(visualize_router)
app.include_router(companion_router)

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
    return {
        "status": "healthy",
        "version": "2.0.0",
        "architecture": "Deterministic 60FPS & Hybrid Edge-First",
        "engines_active": [
            "MathPlotEngine",
            "PhysicsSandboxEngine",
            "ChemistryLabEngine",
            "BioSystemEngine"
        ],
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
