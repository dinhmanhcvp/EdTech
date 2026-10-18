# Socratic Vision Board v2.0.0 (Enterprise Monorepo)

**Nền tảng EdTech AI Đa phương thức: Smartboard Interactive Canvas & Mobile AI Companion**  
*Kiến trúc: Hybrid Edge-First & Deterministic Engine Architecture*  
*Giải thưởng / Bình chọn: Ngày hội nhà giáo sáng tạo 2026 — Sản phẩm tiêu biểu ứng dụng AI trong giáo dục*

---

## 🎯 3 Triết lý Cốt lõi (Core Philosophies)

1. **"On-Demand Magic Lasso"**:
   - Viết bảng tự nhiên 0 độ trễ (< 16ms) với Pure Ink Mode trên HTML5 Canvas.
   - Nhận diện hình học cơ bản ($1 Unistroke Recognizer: đường thẳng, mũi tên, hình tròn, tam giác) offline tại Client (< 2ms).
   - Chỉ kích hoạt AI khi giáo viên chủ động khoanh vùng. Lọc nét bằng thuật toán **Point-in-Polygon** ($\ge 70\%$ điểm tọa độ nằm trong vùng khoanh).
   - **Isolated Off-Screen Render**: Vẽ riêng nét chọn lên canvas ẩn, nền trắng, nét đen chuẩn hóa, nén thành `image/webp` siêu nhẹ **< 8KB**.
   - Zero-Keyboard Recovery: Menu Bubble **Tap & Swap** (Top 3 phương án) và nút **Undo-to-Ink**.

2. **"AI as a Compiler, Client as a Render Engine"**:
   - **Tuyệt đối không gọi API sinh ảnh hay video** (Chi phí API tạo ảnh/video = **$0.00**).
   - AI chỉ đóng vai trò Compiler: nhận ảnh < 8KB và dịch nét chữ thành cấu trúc dữ liệu `SimulationBlueprint` JSON.
   - Trình duyệt tự dựng mô phỏng toán học/vật lý/hóa học/sinh học ở tốc độ **60 FPS** mượt mà thông qua 4 Engine nội bộ:
     - **Math Plot Engine** (mathjs + Canvas 2D/3D): Đồ thị hàm số, tiếp tuyến động, diện tích tích phân $\int_a^b f(x)dx$.
     - **Physics Kinematic & Vector Engine** (Canvas Physics): Ném xiên, con lắc đơn, lò xo, vector lực/vận tốc ($\vec{v}, \vec{P}, \vec{N}$) co giãn thời gian thực.
     - **Chemistry Procedural Lab** (SmilesDrawer + Particle System): Phân tử 3D xoay 360°, ống nghiệm bọt khí bay lên ($H_2, CO_2$), hạt kết tủa lắng đáy, đổi màu dung dịch theo nhiệt độ.
     - **Bio-System 3D & Shader Engine** (Procedural WebGL): Tim đập theo nhịp BPM, khí khổng lá cây (tế bào hạt đậu đóng/mở theo áp suất trương nước).

3. **"Intentional Cognitive Friction" (Gia sư 1:1 ép học sinh tự tư duy)**:
   - **Kiến trúc chấm bài 3 tầng**:
     - *Tầng 1 — Symbolic Algebra Verifier (SymPy / mathjs)*: Kiểm tra tương đương đại số hoặc cân bằng hóa học trong **< 10ms (0 API Call)**.
     - *Tầng 2 — Semantic Cache (ChromaDB)*: Tra cứu trong kho vector cục bộ (> 0.90 tương đồng), lấy ngay khung câu hỏi gợi mở **(0 API Call)**. Giảm **80% - 90%** chi phí LLM.
     - *Tầng 3 — Socratic LLM/SLM*: Chỉ gọi khi học sinh hỏi câu tự do mới, kiên quyết **không bao giờ nói thẳng đáp án**.
   - **Locked Stepper UI**: Chia bài thành 3–5 bước, bước sau bị khóa mờ (`🔒 Glassmorphism`). Vô hiệu hóa Copy/Paste; nhập liệu qua Contextual Math Numpad.
   - **Visual Debugging**: Bắt lỗi bằng widget tương tác (như chiếc Cân đĩa nghiêng khi lệch số nguyên tử Oxi) để học sinh tự kéo sửa.
   - **Reverse-Questioning Gate**: Chốt chặn giọng nói (Web Speech API / Whisper) kiểm tra hiểu bản chất trước khi cộng điểm thưởng Eureka x2 (Grit Economy).

---

## 📂 Cấu trúc Thư mục Monorepo

```text
socratic-vision-board/
├── apps/
│   ├── teacher-board/                 # Next.js 14 (Smartboard 75" UI - Features 1, 2, 3, 4, 5)
│   │   └── src/
│   │       ├── components/canvas/     # Freehand Ink, MagicLasso, FloatingToolbar, SocraticCue
│   │       ├── engines/               # 4 Client-side Deterministic Engines (Zero API rendering)
│   │       │   ├── MathPlotEngine.tsx
│   │       │   ├── PhysicsSandboxEngine.tsx
│   │       │   ├── ChemistryLabEngine.tsx
│   │       │   └── BioSystemEngine.tsx
│   │       └── utils/                 # lassoGeometry.ts, isolatedExporter.ts, shapeRecognizer.ts
│   └── student-app/                   # Next.js 14 (Student Mobile App & Dashboards - Feature 6)
│       └── src/
│           ├── components/companion/  # LockedStepper, MathNumpad, VisualDebugWidgets, VoiceGate
│           └── components/dashboards/ # TeacherHeatmap, ParentPulse
├── packages/
│   ├── types/                         # Shared TypeScript Interfaces & Data Contracts (SimulationBlueprint)
│   └── ui/                            # Shared Design System (Glassmorphism, MacroSliders, SocraticCue)
├── services/
│   ├── api-gateway/                   # Node.js / Express + Socket.io + Redis Adapter (Sync & Proxy)
│   └── ai-engine/                     # Python 3.9+ FastAPI
│       ├── routers/                   # visualize.py (Lasso OCR), companion.py (Socratic Chat)
│       ├── symbolic/                  # sympy_verifier.py, chem_balancer.py (Deterministic Checkers)
│       ├── cache/                     # chroma_semantic_cache.py (ChromaDB Vector Cache)
│       └── llm/                       # provider_adapter.py (Gemini Flash / Ollama Local)
└── docker-compose.yml                 # Orchestrates Postgres, Redis, ChromaDB, API Gateway, AI Engine
```

---

## 📋 Hợp đồng Dữ liệu Cốt lõi (Data Contracts)

### 1. `SimulationBlueprint` (POST `/api/v1/canvas/compile-lasso`)
```json
{
  "ocr_result": {
    "recognized_latex": "y = 2\\sin(3x + 0)",
    "subject": "MATH",
    "confidence": 0.96,
    "alternatives": ["y = 2\\sin(3x)", "y = z\\sin(3x)"]
  },
  "simulation_blueprint": {
    "engine": "MATH_2D_PLOT",
    "template_id": "TRIGONOMETRIC_WAVE",
    "expressions": ["A * sin(omega * x + phi)"],
    "smiles": null,
    "parameters": [
      { "key": "A", "label": "Biên độ (A)", "unit": "cm", "default": 2, "min": 0.5, "max": 5, "step": 0.5 },
      { "key": "omega", "label": "Tần số góc (ω)", "unit": "rad/s", "default": 3, "min": 1, "max": 10, "step": 1 },
      { "key": "phi", "label": "Pha ban đầu (φ)", "unit": "rad", "default": 0, "min": -3.14, "max": 3.14, "step": 0.1 }
    ],
    "visual_effects": {
      "show_vectors": false,
      "gas_bubbles": false,
      "precipitate_color": null
    }
  },
  "socratic_cue": {
    "question": "Nếu cô giữ nguyên biên độ A = 2 nhưng tăng tần số góc ω lên gấp đôi, đồ thị hình sin sẽ bị nén lại hay giãn ra theo trục hoành? Vì sao?",
    "target_parameter": "omega"
  }
}
```

### 2. `SocraticStepEvaluation` (POST `/api/v1/companion/evaluate-step`)
```json
{
  "verification_source": "SYMPY_DETERMINISTIC",
  "is_step_correct": false,
  "error_category": "STOICHIOMETRY_IMBALANCE",
  "step_status": "IN_PROGRESS",
  "socratic_feedback": "Gần đúng rồi! Em hãy nhìn lên chiếc cân bên dưới: Vế phải đang có 3 nguyên tử Oxi trong Fe2O3, trong khi vế trái mới có 2 nguyên tử Oxi.",
  "visual_debugger": {
    "widget_type": "CHEMICAL_BALANCE_SCALE",
    "payload": {
      "left_atoms": { "Fe": 1, "O": 2 },
      "right_atoms": { "Fe": 2, "O": 3 }
    }
  },
  "eureka_points_delta": 10
}
```

---

## ⚡ Chỉ tiêu Kỹ thuật & Cam kết Tối ưu (SLA Benchmarks)

| Chỉ số (Metric) | Mục tiêu Cam kết (Target SLA) | Giải pháp Kỹ thuật Đảm bảo |
|---|---|---|
| **Độ trễ viết bảng & nhận diện hình** | **< 16ms (60 FPS)** | HTML5 Canvas + $1 Unistroke Recognizer offline tại Client |
| **Số lần gọi API trung bình / tiết 45p** | **Chỉ 3 – 6 lần** | On-Demand Magic Lasso + Unified Single-Call Blueprint |
| **Dung lượng ảnh gửi lên Vision API** | **< 8KB / lần** | Point-in-Polygon Hit-Testing + Isolated Off-screen Binarized WebP |
| **Chi phí API tạo ảnh / video 3D** | **$0.00 (Bằng không)** | 100% dựng bằng 4 Client-Side Deterministic Engines (WebGL/Canvas) |
| **Độ trễ kéo thanh trượt Sandbox** | **0ms (Tức thì ở 60 FPS)** | Biến thanh trượt truyền thẳng vào vòng lặp render của Engine |
| **Tỷ lệ giảm tải LLM (Gia sư)** | **Giảm 80% – 90%** | Tầng lọc kép: SymPy (<10ms) + ChromaDB Semantic Cache (>0.90) |

---

## 🚀 Hướng dẫn Chạy Trực tiếp (Live Demo)

### 1. Trải nghiệm Master Interactive Showcase v2.0.0
Ứng dụng Master tích hợp toàn diện 4 Touchpoints và 6 Tính năng cốt lõi đang chạy trực tiếp tại:
```text
http://localhost:3000/index.html
```

### 2. Khởi chạy Python AI Engine (FastAPI + SymPy + Cache)
```bash
cd services/ai-engine
pip install -r requirements.txt
python main.py
# Server chạy tại http://localhost:8000 (Swagger docs tại /docs)
```

### 3. Khởi chạy toàn bộ hạ tầng qua Docker Compose
```bash
docker-compose up -d
# Khởi động PostgreSQL, Redis, ChromaDB, API Gateway và AI Engine
```
