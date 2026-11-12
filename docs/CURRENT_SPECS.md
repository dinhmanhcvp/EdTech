# Đặc tả hiện trạng Socratic Vision Board

Ngày rà soát: **26/10/2026**. Phiên bản ứng dụng khai báo: **2.0.0**. Nhánh: `main`; commit nền: `45612a4`.

Tài liệu mô tả trạng thái **working tree cục bộ**, bao gồm cả các thay đổi và tệp chưa commit. Không đồng nhất nội dung này với bản đang chạy trên Internet. Mục đích là làm cơ sở kỹ thuật cho báo cáo project Edtech và bàn giao phát triển tiếp theo.

## 1. Cơ sở và phạm vi rà soát

- Kiểm kê 377 tệp văn bản thuộc mã nguồn, cấu hình, tài liệu, prototype và công cụ quảng bá, trước khi thêm tài liệu này; loại thư viện cài sẵn, Git internals, build/cache, đầu ra render, tệp khóa dependency và tệp `.env`.
- Đối chiếu trực tiếp các entry point, component, router, model, hợp đồng dữ liệu và cấu hình triển khai của `socratic-monorepo/`.
- Tham khảo `.ai/HANDOFF.md`; không có `.ai/ARCHITECTURE.md` tại thời điểm rà soát.
- Kiểm kê luồng video, slide, hồ sơ và prototype để xác định vai trò; không dùng nội dung quảng bá hoặc tài liệu nghiên cứu làm bằng chứng rằng một tính năng đã hoạt động.
- Chạy lại Vitest, pytest và TypeScript; chưa thực hiện kiểm thử trình duyệt trên bảng tương tác thật, benchmark phần cứng, kiểm chứng dịch vụ cloud hoặc production build trong lần rà soát này.

Các nhãn trạng thái:

| Nhãn | Ý nghĩa |
|---|---|
| Đã tích hợp | Có đường gọi từ giao diện hoặc API hiện tại; chưa đồng nghĩa đã kiểm thử triển khai thực tế |
| Module độc lập | Có implementation/test, chưa nối vào luồng sử dụng chính |
| Demo hoặc scaffold | Có dữ liệu dựng sẵn, mô phỏng hoặc phần khung chưa hoàn thiện |
| Chưa triển khai | Chưa tìm thấy implementation trong phạm vi mã nguồn đã kiểm kê |

## 2. Sản phẩm và người dùng

**Socratic Vision Board** là nền tảng hỗ trợ dạy và học STEM: giáo viên viết/khoanh nét trên bảng số, chuyển nội dung thành mô phỏng tương tác; học sinh khám phá mô hình và luyện giải theo từng bước có câu hỏi gợi mở. **AXIOMA** là tên xuất hiện trong bộ slide dự thi, không phải một ứng dụng độc lập trong monorepo.

Đối tượng được thể hiện trong code và dữ liệu: giáo viên, học sinh THPT; giao diện theo dõi cho giáo viên và phụ huynh. Có hai mức nội dung `THPT_STANDARD` và `OLYMPIAD_ADVANCED`; đây là lựa chọn nội dung/tham số, chưa phải hệ thống chứng nhận năng lực hoặc bao phủ toàn bộ chương trình.

## 3. Cấu trúc dự án

| Đường dẫn tính từ gốc repository | Vai trò hiện tại |
|---|---|
| `socratic-monorepo/apps/teacher-board/` | Next.js: bảng tương tác, workspace Socratic, analytics; tuyến tham gia lớp `/join/[roomId]`, slide `/pitch` |
| `socratic-monorepo/apps/student-app/` | Next.js: Socratic Companion, Smart Notes, Teacher Heatmap, Parent Pulse |
| `socratic-monorepo/packages/types/` | TypeScript contracts, schema, dữ liệu thí điểm dùng chung |
| `socratic-monorepo/packages/ui/` | Thành phần giao diện chia sẻ |
| `socratic-monorepo/services/ai-engine/` | FastAPI: biên dịch vùng khoanh, OCR, chấm bước, ghi chú, heatmap, phòng học WebSocket |
| `socratic-monorepo/services/api-gateway/` | Express/Socket.IO, Redis adapter; luồng gateway riêng, một phần còn scaffold |
| `socratic-monorepo/e2e/` | Kiểm thử tích hợp component bằng Vitest/jsdom; có mock API |
| `socratic-vision-prototypes/`, các file HTML ở gốc | Prototype/showcase; không phải entry point của ứng dụng Next.js |
| `socratic-video/` | Dựng video bằng Remotion; luồng quảng bá riêng |
| `AXIOMA-slide-y-tuong-sang-tao/`, `slide-du-thi/`, `Ho-so-*`, `Goi-gui-nhom-IT-Hust/` | Tài sản và hồ sơ trình bày/nộp thi |
| `docs/` | Mẫu báo cáo, tài liệu và đặc tả hiện trạng này |

## 4. Kiến trúc và công nghệ thực tế

### 4.1 Luồng ứng dụng chính

```text
Teacher Board :3001
  ├─ Canvas / nhận dạng nét / định tuyến / mô phỏng cục bộ
  ├─ HTTP /api/v1/* → Next rewrite → FastAPI :8000
  └─ WebSocket trực tiếp → FastAPI /ws/rooms/{room_id}
                                      ↑
                         /join/[roomId] trên thiết bị học sinh

Student App :3002 → API Companion / Notes / Heatmap
                   (nhiều đường gọi mặc định hoặc fallback là 127.0.0.1:8000)
```

WebSocket BYOD đang dùng **FastAPI**, không đi qua Socket.IO gateway. Chức năng Companion trong Student App và trang học sinh BYOD trong Teacher Board là hai luồng riêng.

### 4.2 Stack khai báo trong repository

- Frontend: Next.js `^14.1.0`, React 18, TypeScript, Tailwind CSS, KaTeX, Lucide; Teacher Board có thư viện QR code.
- Mô phỏng: React, SVG, Canvas 2D, phép chiếu hình học và các model toán học tự viết. Không tìm thấy dependency Three.js, mathjs hoặc SmilesDrawer trong manifest frontend hiện tại; không mô tả chúng như stack đã tích hợp.
- Backend: Python/FastAPI, Pydantic, SymPy, NumPy, Matplotlib, Pillow và `google-generativeai`. `requirements.txt` chưa pin phiên bản.
- Công cụ workspace: npm workspaces, Turbo, Vitest, React Testing Library/jsdom; backend có pytest tests.
- Docker Compose khai báo PostgreSQL 15, Redis 7, ChromaDB, gateway và AI engine. Chưa có Dockerfile cho hai service được tham chiếu; chưa đủ cơ sở mô tả toàn bộ Compose chạy hoàn chỉnh.
- Chưa tìm thấy lớp persistence PostgreSQL được nối vào ứng dụng chính. Phòng học, notes và heatmap dùng bộ nhớ tiến trình.

Nguồn: các `package.json`, `requirements.txt`, `docker-compose.yml`, `main.py`, `next.config.js`, `useClassroom.ts`.

## 5. Đặc tả chức năng hiện có

### 5.1 Bảng tương tác và nét viết

**Trạng thái: đã tích hợp.**

- Viết/vẽ trên Canvas, chọn vùng lasso, nhận dạng hình và thao tác với nét.
- Nhận dạng công thức từ nét vector cục bộ; sửa kết quả qua hộp thoại, phương án OCR thay thế và chỉnh LaTeX trước khi vẽ mô hình.
- Nhận dạng khối hình học/phác thảo STEM bằng cấu trúc nét; định tuyến từ nội dung gõ hoặc kết quả nhận dạng.
- Thứ tự ưu tiên trong `handleVisualize`: định tuyến cục bộ → nhận dạng khối/phác thảo → gọi backend nếu chưa xử lý được.
- Lưu nét mẫu bằng localStorage và endpoint Next.js `user-ink`; ghi file phụ thuộc môi trường có quyền ghi.
- Khóa ngữ cảnh môn học để hỗ trợ định tuyến.

Nguồn: `SmartboardCanvas.tsx`, `InkConvertPanel.tsx`, `OcrReviewModal.tsx`, `localRouter.ts`, `inkRecognizer.ts`, `sketchSolid.ts`, `sketchGestures.ts` trong Teacher Board.

### 5.2 Magic Lasso và OCR backend

**Trạng thái: đã tích hợp, có dependency tùy chọn và fallback.**

- `POST /api/v1/canvas/compile-lasso` nhận JSON hoặc multipart: ảnh, nội dung gợi ý, nét vector và khóa môn học.
- Backend có đường gọi Vision Gemini, nhánh OpenAI tùy dependency/key, và fallback OCR/heuristic. Không thể khẳng định các provider đều dùng được chỉ từ code hoặc danh sách model.
- `POST /api/v1/canvas/recognize-ink` là endpoint nhận dạng riêng cho luồng chuyển chữ viết thành công thức.
- `exportIsolatedWebp()` thực tế xuất **PNG**, nền trắng/nét đen, kích thước tối thiểu 512×256. Không có bảo đảm mọi ảnh dưới 8 KB; tên hàm cũ không phản ánh định dạng hiện tại.
- SVG tương tác trả về có thể được tạo bằng hàm sinh SVG theo chủ đề. Không đồng nhất nhãn “AI visual” với dịch vụ AI tạo ảnh hoặc sinh mô hình tùy ý.

Nguồn: `routers/visualize.py`, `routers/recognize_ink.py`, `ocr_engine.py`, `utils/isolatedExporter.ts`, `AIGeneratedVisualEngine.tsx`.

### 5.3 Danh mục mô phỏng STEM

**Trạng thái: có engine/render routing trong Teacher Board.** Các model là mô hình giáo dục với giả định và giới hạn riêng, chưa được kiểm chứng như phần mềm mô phỏng chuyên ngành.

| Nhóm | Nội dung và template tiêu biểu đã đối chiếu |
|---|---|
| Toán và hình học cơ bản | Hàm số/lượng giác, nhiều đồ thị và giao điểm (`MATH_GRAPH`), khối đa diện 3D (`GEO_SOLID`) |
| Toán mở rộng | Quy hoạch tuyến tính (`MATH_LINEAR_PROGRAMMING`), dãy truy hồi/cobweb (`MATH_COBWEB_CHAOS`), boxplot (`MATH_STAT_BOXPLOT`), bảng biến thiên (`MATH_VARIATION_TABLE`) |
| Vật lý | Ném xiên, con lắc, mặt phẳng nghiêng/ma sát, thấu kính, RLC/Fresnel, giao thoa sóng; mô hình p–V (`PHYS_GAS_STATE_PV`), con lắc kép, Coriolis, nhiễu xạ Fraunhofer N khe |
| Hóa học | Phòng phản ứng/cân bằng nguyên tử, phân tử, chuẩn độ; VSEPR (`CHEM_MOLECULE_3D`), Le Chatelier, pin Daniell/Nernst |
| Sinh học | Quang hợp, tim, ADN; Punnett, Hardy–Weinberg, khí khổng, thẩm thấu, operon Lac |

**10 engine nâng cao** được đăng ký trong `ADVANCED_ENGINES`:

| Template ID | Nội dung |
|---|---|
| `MATH_3D_OXYZ` | Mặt cầu, mặt phẳng và giao tuyến trong Oxyz |
| `MATH_INTEGRAL_3D_REVOLVE` | Tích phân/thể tích khối tròn xoay |
| `MATH_DYNAMIC_GEOMETRY` | Tâm tam giác, đối cực và nghịch đảo |
| `CHEM_SN2_MECHANISM` | Tiến trình SN2 và nghịch đảo Walden |
| `CHEM_CRYSTAL_LATTICE` | Ô mạng SC/BCC/FCC, mặt Miller |
| `CHEM_CFT_COMPLEX_3D` | Tách mức trường tinh thể bát diện |
| `CHEM_ORGANIC_SKELETAL` | Cấu dạng Cyclohexane |
| `BIO_CELL_RESPIRATION` | Chuỗi truyền electron và ATP Synthase |
| `BIO_LOTKA_VOLTERRA` | Động thái quần thể hai loài |
| `BIO_CELL_SIGNALING` | GPCR và apoptosis |

Nguồn: `SimulationWidget.tsx`, `engines/*.tsx`, `advancedStemModels.ts`, `stemModels.ts`, `physicsModels.ts`, `chemModels.ts`, `bioModels.ts`, `mathModels.ts`, `localRouter.ts`.

### 5.4 Hologram HUD và phản hồi

**Trạng thái: đã tích hợp, cần phân biệt lớp vỏ giao diện với nội dung engine.**

- Có chế độ `HOLOGRAM`/`DOCK`, lớp ngoài trong suốt, kéo bằng Pointer Events/Pointer Capture, scale 50–200% và HUD tự mờ sau 2 giây.
- `SimulationWidget` đánh giá gợi mở Socratic theo template/tham số; Web Audio phát âm tổng hợp tương ứng.
- Có `proRenderer.ts` cho DPR, hiệu ứng cầu/ánh sáng và spring-damper; sự tồn tại utility không chứng minh tất cả engine đang sử dụng toàn bộ hiệu ứng.
- Một số engine có bảng điều khiển/nền và state riêng. Không khẳng định mọi nội dung đều không nền hoặc mọi tham số nội bộ đều được đồng bộ BYOD.
- Với ba template Sinh nâng cao, điều kiện fallback `BioSystemEngine` hiện chưa loại trừ `AdvancedEngine`; cần kiểm tra hiển thị kép khi rà soát giao diện.

### 5.5 Lớp học BYOD

**Trạng thái: đã tích hợp.**

- Giáo viên tạo phòng và nhận `roomId` sáu ký tự cùng `teacherToken`.
- Học sinh vào `/join/[roomId]`, nhập tên; nhận blueprint/tham số và tham gia bình chọn.
- Giáo viên gửi mô hình, thay đổi tham số, giao/thu quyền điều khiển và mở/đóng poll.
- Học sinh chỉ thay đổi tham số khi được giao quyền; server kiểm tra token cho vai trò giáo viên.
- Giới hạn code: 300 phòng, 120 học sinh/phòng, TTL không hoạt động 6 giờ, thông điệp tối đa 70.000 ký tự. Đây là giới hạn cấu hình, chưa phải kết quả load test.
- Hook client thử nối lại tối đa 6 lần với thời gian chờ tăng dần. Phòng học mất khi tiến trình khởi động lại, chưa có persistence hoặc chia sẻ phòng giữa nhiều worker.

Nguồn: `routers/classroom_ws.py`, `hooks/useClassroom.ts`, `utils/classroomState.ts`, `ClassroomPanel.tsx`, `app/join/[roomId]/page.tsx`.

### 5.6 Socratic Companion và kiểm tra hiểu bài

**Trạng thái: đã tích hợp ở mức bài học/mẫu có cấu trúc; một số nhánh vẫn là demo.**

- Student App có Locked Stepper, Math Numpad chặn paste, bài học dựng sẵn và Visual Debugger theo chủ đề.
- Pipeline backend: guard đầu vào → kiểm tra đại số bằng SymPy/cân bằng nguyên tử → lookup mẫu câu hỏi → fallback gợi mở → lọc đầu ra.
- `chroma_semantic_cache.py` đang dùng **regex và mức khớp từ khóa**, với bốn nhóm mẫu; giá trị similarity không phải cosine similarity đo từ embedding.
- Có wrapper ChromaDB ở `cache/chroma_cache.py`, nhưng router Companion không gọi wrapper này; chưa coi ChromaDB là backend cache của luồng đang chạy.
- `llm/provider_adapter.py` thử lần lượt Gemini pool (nhiều model trên mỗi khóa) rồi OpenRouter pool; chỉ khi cả hai không có khóa/đều lỗi mới trả câu hỏi heuristic với nhãn `LLM_FALLBACK`. Nhãn `LLM_GEMINI_POOL`/`LLM_OPENROUTER_POOL` mới chứng tỏ đã gọi LLM thật. Chưa có kiểm thử gọi mạng thật, chỉ test với `google.generativeai` giả. Không có nhánh Ollama.
- Có widget cân hóa học, đa giác lực, tiếp tuyến cực trị, áp suất thẩm thấu và các widget/workbench bổ sung. Không giới hạn mô tả toàn bộ file ở “chỉ 4 widget”.
- Concept gate phía Student App dùng Web Speech Recognition nếu trình duyệt hỗ trợ, kiểm tra từ khóa; có chế độ nhập chữ, sắp xếp quan hệ nhân quả và Đúng/Sai.
- Fallback không có Speech Recognition hiện tự mô phỏng transcript và cho qua sau timeout; không được dùng nó như bằng chứng xác thực hiểu bài bằng giọng nói.
- API `verify-voice-gate` kiểm tra transcript theo độ phủ từ khóa 60%; logic điểm của API và UI chưa thống nhất hoàn toàn. Chưa có Whisper/STT backend trong luồng này.
- `expected_answer`, chỉ số bước và nhiều dữ liệu chấm bài do client gửi; chưa có kho đề/đáp án và quyền chấm được quản lý hoàn toàn phía server.

Nguồn: `SocraticCompanionSession.tsx`, `ConceptCheckGate.tsx`, `VisualDebugWidgets.tsx`, `socraticProblems.ts`, `routers/companion.py`, `symbolic/*`, `cache/*`, `llm/provider_adapter.py`.

### 5.7 Smart Notes và dashboard

**Trạng thái: đã tích hợp API/UI, có dữ liệu mẫu và lưu trữ tạm.**

- Xuất ghi chú gồm công thức, template, tham số, câu hỏi Socratic và key insights; đọc ghi chú mới nhất/danh sách.
- Backend giữ tối đa 50 notes trong bộ nhớ; client có localStorage fallback.
- Heatmap nhận sự kiện `friction`/`passed`, có Teacher Heatmap, Parent Pulse và Class Telemetry UI.
- Heatmap backend khởi tạo năm hồ sơ mẫu nhưng trường `active_students` ghi cố định 40; không dùng con số này làm sĩ số đo thực tế.
- Analytics/pilot panel có dữ liệu JSON tĩnh; chưa phải hệ thống learning analytics đầy đủ với tài khoản, phân quyền, lịch sử bền vững và truy vết theo từng trường/lớp.

Nguồn: `routers/classroom.py`, `SmartNotesViewer.tsx`, `TeacherHeatmap.tsx`, `ParentPulse.tsx`, `ClassTelemetryMode.tsx`, `PilotImpactPanel.tsx`.

### 5.8 Ghi và tua lại bài giảng

**Trạng thái: module độc lập.**

`utils/vectorJournal.ts` có recorder/player, sự kiện nét viết/mô phỏng/thay đổi tham số/transform, JSON import/export, phát và seek theo thời gian; có unit tests. Tìm kiếm tham chiếu hiện chỉ thấy module và test, chưa có integration vào `SmartboardCanvas` hoặc Dock.

Chưa mô tả “giáo viên đã có nút ghi/tua lại bài giảng”. Mốc dung lượng dưới 2,5 MB/45 phút trong comment là mục tiêu, chưa được đo trên một tiết học thực.

### 5.9 Offline, triển khai và gateway

- Các model/render và một số nhận dạng chạy cục bộ sau khi trang đã tải. Chưa tìm thấy Service Worker, manifest PWA hoặc IndexedDB hoàn thiện để bảo đảm mở ứng dụng và dùng 100% tài nguyên khi mất mạng.
- `render.yaml` mô tả FastAPI; Teacher Board có cấu hình Vercel/rewrite, lấy backend từ `BACKEND_URL`; WebSocket nối thẳng backend.
- Student App chưa có cấu hình rewrite tương đương Teacher Board; nhiều API trỏ loopback nên cần cấu hình lại trước khi dùng trên điện thoại/host riêng.
- Gateway Express có healthcheck, namespace Socket.IO `/sandbox` và Redis adapter với fallback RAM. Endpoint proxy chỉ trả JSON mẫu; auth/CRUD/persistence chưa hoàn thiện. Không coi đây là đường production bắt buộc của BYOD hiện tại.
- Chưa có xác thực người dùng tổng thể. CORS mở; endpoint cài khóa Gemini và một số request có thể thay biến môi trường dùng chung. Đây là hạn chế triển khai hiện tại, khác với token quản trị phòng BYOD.

## 6. API và hợp đồng dữ liệu

Các tuyến dưới đây được khai báo trong FastAPI đang mount từ `main.py`, trừ `user-ink` thuộc Next.js:

| Method | Path | Mục đích |
|---|---|---|
| GET | `/health` | Thông tin health và phiên bản; các chuỗi mô tả SLA trong response không phải phép đo |
| GET | `/api/v1/plot` | Đồ thị Matplotlib SVG hoặc JSON có SVG |
| POST | `/api/v1/canvas/compile-lasso` | OCR/phân loại, trả blueprint và gợi mở |
| POST | `/api/v1/canvas/recognize-ink` | Nhận dạng chữ viết qua Vision |
| GET, POST | `/api/v1/canvas/settings/gemini-key` | Trạng thái/cài key của tiến trình |
| POST | `/api/v1/companion/evaluate-step` | Đánh giá bước và trả gợi mở/debugger |
| POST | `/api/v1/companion/verify-voice-gate` | Kiểm tra transcript và tính điểm |
| POST | `/api/v1/notes/export` | Tạo Smart Note |
| GET | `/api/v1/notes/latest`, `/api/v1/notes` | Đọc notes |
| POST | `/api/v1/heatmap/event` | Ghi sự kiện học tập |
| GET | `/api/v1/heatmap` | Trả heatmap có dữ liệu mẫu |
| POST | `/api/v1/classroom/reset` | Xóa notes và heatmap tạm |
| POST | `/api/v1/rooms` | Tạo phòng BYOD |
| GET | `/api/v1/rooms/{room_id}` | Thông tin phòng |
| WebSocket | `/ws/rooms/{room_id}` | Đồng bộ phòng, quyền điều khiển, poll |
| GET, POST, DELETE | `/api/v1/canvas/user-ink` | Đọc/ghi/xóa nét mẫu qua Next.js |

`SimulationBlueprint` phía frontend dùng **camelCase**: `engine`, `templateId`, `recognizedLatex`, `parameters[].defaultValue`, `expressions`, `meta`, `socraticQuestion`, `curriculumLevel`, tùy chọn `custom_interactive_svg`. Không dùng ví dụ `template_id/default` trong README cũ như contract frontend hiện hành.

Response compile-lasso bọc bên ngoài bằng `ocr_result`, `simulation_blueprint`, `socratic_cue`. `EngineType` hiện có `MATH | PHYSICS | CHEMISTRY | BIOLOGY | GEOMETRY`. `TemplateId` vẫn cho phép `string`; chưa phải tập enum đóng được runtime validate đầy đủ.

Nguồn: `packages/types/src/simulation.ts`, `routers/visualize.py`, `routers/companion.py`, các router classroom, `app/api/v1/canvas/user-ink/route.ts`.

## 7. Kiểm chứng ngày 26/10/2026

| Kiểm tra | Kết quả chạy lại |
|---|---|
| Teacher Board: `vitest run` tại app | 29 file, **378/378 test passed** |
| Student App: `vitest run` tại app | 1 file, **14/14 test passed** |
| Toàn monorepo: `vitest run` | 31 file, **394/394 test passed**, gồm hai scenario ở `e2e/` |
| AI Engine: `python -m pytest tests/ -q` | **38/38 test passed**, bốn cảnh báo Pydantic `.dict()` deprecated |
| Teacher Board: `tsc --noEmit --incremental false` | Exit code 0 |
| Student App: `tsc --noEmit --incremental false` | Exit code 0 |

Các lần chạy app là tập con của lần chạy monorepo, không cộng dồn thành số test riêng. Tổng lần chạy bao phủ được ghi nhận: **394 test JS/React + 38 test Python**.

Vitest có cảnh báo về cách nạp cấu hình CommonJS/ESM. Hai scenario mang tên e2e đang chạy trên jsdom với API mock, không phải browser E2E nối máy chủ thật. Typecheck không thay thế `next build`; kiểm thử xanh không chứng minh FPS, độ trễ mạng, OCR với chữ viết thực hoặc chất lượng sư phạm ngoài thực địa.

Môi trường thực thi: Node bundled `C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`, chạy CLI Vitest/TypeScript đã cài trong `socratic-monorepo/node_modules/`; Python 3.12 cục bộ chạy pytest. Python bundled cho tài liệu không có pytest nên không dùng cho suite backend.

## 8. Số liệu thí điểm và các claim cần tách riêng

`packages/types/src/pilot2026.json` đang chứa bộ dữ liệu công bố cho slide/analytics: 4 tuần, 86 học sinh, 7 giáo viên, 64 tiết, 1.420 phiên; điểm hậu kiểm 7,74 so với 6,85; guard chặn 312/318 lượt (98,1%); tỷ lệ zero-token 81,4%.

Đây là **số liệu được lưu trong repository**, không phải số liệu được tái tạo hoặc xác minh độc lập trong lần rà soát này. Trước khi đưa vào báo cáo khoa học cần đối chiếu bài kiểm tra, log phiên, cách chia nhóm, phép tính thống kê và hồ sơ thí điểm gốc. Không suy ra tác động giáo dục chỉ từ JSON hoặc UI.

| Mô tả/claim trong tài liệu cũ | Cách ghi chính xác theo hiện trạng |
|---|---|
| Toàn bộ hệ thống dùng ChromaDB semantic cache | Luồng Companion đang dùng lookup regex/từ khóa; wrapper ChromaDB chưa được nối |
| Gia sư gọi Gemini/Ollama khi cache miss | Adapter hiện trả heuristic; Vision là luồng riêng có code gọi provider |
| Export WebP dưới 8 KB mọi lần | Hàm hiện xuất PNG; chưa có giới hạn dung lượng bắt buộc |
| Three.js/PBR, mathjs, SmilesDrawer đã tích hợp | Chưa thấy dependency tương ứng; model chủ yếu tự viết với SVG/Canvas |
| Offline PWA toàn phần | Có xử lý cục bộ; chưa hoàn thiện cache/PWA cho lần mở offline |
| Đã có ghi/tua lại bài giảng trên bảng | Có module recorder/player và tests; chưa nối UI và capture sự kiện |
| 60 FPS, <2 ms audio, <10 ms symbolic, 2,5 MB/45 phút | Mục tiêu hoặc chú thích; chưa có benchmark thực địa được chạy lại |
| Không bao giờ lộ đáp án, xác thực hiểu bài tuyệt đối | Có guard và tests theo bộ tình huống; còn fallback demo và dữ liệu chấm do client cung cấp |
| Tất cả Docker service đã sẵn sàng | Có Compose scaffold nhưng thiếu Dockerfile được tham chiếu |

## 9. Lệnh chạy và kiểm tra

Chạy từ `socratic-monorepo/`, với dependency đã cài phù hợp:

```powershell
# Mỗi server chạy trong một terminal riêng
npm run dev --workspace teacher-board   # http://localhost:3001
npm run dev --workspace student-app     # http://localhost:3002

# Kiểm thử toàn bộ JS/React, gồm scenario tích hợp component
npm test
```

Tại `socratic-monorepo/services/ai-engine/`:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
python -m pytest tests/ -q
```

Tại từng thư mục app:

```powershell
npx.cmd tsc --noEmit --incremental false
npx.cmd vitest run
```

Giữ `--incremental false` để không ghi `tsconfig.tsbuildinfo`. Root script `test:py` hiện chỉ chạy `test_engine.py`; dùng `pytest tests/` để bao phủ đủ backend. `npm run build` và `npm run lint` có khai báo ở workspace root nhưng chưa được xác minh trong lần rà soát này; không có script lint trong hai manifest app đã đọc.

Biến cấu hình được đọc trong code: `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY` (Vision tùy chọn), `VISION_LLM_BUDGET_S`, `INK_RECOGNIZE_TIMEOUT_S`, `SOCRATIC_DEBUG_DUMP` (chỉ bật khi cần chẩn đoán). Không đưa giá trị khóa thật vào specs hoặc báo cáo.

## 10. Luồng quảng bá và tài sản ngoài ứng dụng

`socratic-video/` dùng Remotion 4/React 19, tách khỏi React 18 của ứng dụng. `src/Root.tsx` đăng ký `Launch`, `FlowCut`, `Demo2`, `Demo`, `Pitch`, 1920×1080. `Launch` và `FlowCut` khai báo 30 fps. `/pitch` nạp bộ slide AXIOMA bằng dynamic import tắt SSR.

Handoff mô tả bản video/slide đã render và FlowCut đã nộp; lần rà soát này chỉ đối chiếu cấu trúc/mã nguồn, không render lại hoặc xác minh việc nộp. Không sửa video, slide, poster, hồ sơ và tài liệu Word mẫu trong đợt cập nhật specs.

## 11. Các bước phát triển nên ưu tiên

1. Hoàn thiện cấu hình API Student App cho thiết bị thật; kiểm thử Teacher Board → FastAPI → thiết bị học sinh qua mạng.
2. Tách luồng demo khỏi đánh giá học tập thật, nhất là voice fallback, heatmap mẫu và dữ liệu kết quả dựng sẵn.
3. Đưa bài học/đáp án/điểm về quyền quản lý server, bổ sung xác thực và lưu trữ bền vững trước triển khai nhiều lớp.
4. Quyết định có tích hợp ChromaDB và LLM thật hay giữ rule-based; thống nhất tên nguồn kiểm chứng trong response với implementation.
5. Nối recorder/player vào sự kiện bảng và UI playback; sau đó đo dung lượng bài giảng thực tế.
6. Hoàn thiện PWA/cache nếu yêu cầu offline đầy đủ; kiểm thử trên OPS và bảng tương tác mục tiêu.
7. Kiểm tra nền của từng engine, điều kiện render Sinh nâng cao, đồng bộ state nội bộ và sự thống nhất tham số/đơn vị giữa model với Socratic trigger.
8. Bổ sung benchmark thực và minh chứng thí điểm trước khi chuyển các mục tiêu kỹ thuật hoặc số liệu JSON thành kết luận trong báo cáo.

## 12. Quy tắc sử dụng tài liệu cho báo cáo

- Dùng mục 2–6 để mô tả sản phẩm, kiến trúc và chức năng đã có; giữ nguyên các điều kiện và giới hạn.
- Dùng mục 7 làm bằng chứng kiểm thử phần mềm, không thay thế đánh giá sư phạm.
- Dùng mục 8 để phân biệt dữ liệu thí điểm lưu sẵn với kết quả đã được kiểm chứng bằng hồ sơ gốc.
- Đưa các mục chưa tích hợp ở mục 11 vào hướng phát triển, không viết như kết quả đã hoàn thành.
- README và handoff cũ vẫn chứa mục tiêu/mô tả lịch sử. Khi có khác biệt, đối chiếu implementation và kết quả kiểm thử mới trước khi cập nhật claim.
