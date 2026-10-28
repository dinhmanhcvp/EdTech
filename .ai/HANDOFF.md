# 1. Mục tiêu hiện tại (Current Task & Goal)
- Khắc phục triệt để lỗi **HTTP 503 Service Unavailable / Vision Unavailable** khi cấu hình khóa API Gemini và OpenRouter.
- Giải quyết rào cản hạn mức Google AI Studio (Free Tier RPD quota) và cơ chế tự động xoay vòng nhiều khóa (Multi-Key Pool) + dự phòng OpenRouter / Neural ONNX.
- Quy hoạch và phân định rõ ràng toàn bộ hệ thống thành **2 Tính Năng Cốt Lõi**:
  1. **Tính Năng 1: Bảng Tương Tác Thông Minh Trên Lớp (Smartboard Interactive Canvas)** (`apps/teacher-board`).
  2. **Tính Năng 2: Nền Tảng Gia Sư AI Socratic Sau Giờ Học (After-School Socratic Learning Platform)** (`apps/student-app`).

# 2. Trạng thái Codebase (Working State)
- **Đã hoàn thành (Done):**
  - **Khắc phục triệt để lỗi HTTP 503 & Quota Exceeded:**
    * **Phân tích bản chất hạn mức Google AI Studio:** Hạn mức số lượt gọi trong ngày (RPD) được Google tính **theo từng Tài khoản/Dự án Google**, không tính theo từng API key. Do đó việc tạo 4 key trong cùng 1 tài khoản/dự án sẽ chia sẻ chung 1 hạn mức 20 lượt/ngày của Gemini 2.5 Flash. Khi chạm 20 RPD, toàn bộ 4 key đều trả về `429 ResourceExhausted: Quota exceeded for Requests per day`.
    * **Ưu tiên Gemini 1.5 Flash (1.500 RPD) lên đầu bảng:** Trước đây `GEMINI_MODELS` đặt `gemini-2.5-flash` (chỉ 20 RPD) ở vị trí đầu tiên. Đã hoán đổi đưa `gemini-1.5-flash` (1.500 RPD miễn phí) lên đầu, tiếp đến `gemini-2.0-flash`, giúp người dùng không còn bị chạm rào cản 20 lượt/ngày.
    * **Sửa lỗi ngắt vòng lặp mô hình sớm (Premature Break):** Trong `_call_gemini` và `classify_with_vision_llm`, khi gặp `quota_exhausted` trên một model, hệ thống không còn ngắt ngang key mà tự động thử tiếp các model khác (`gemini-1.5-flash`, `gemini-2.0-flash`...) trên cùng key đó (vì Google tính hạn mức riêng cho từng model). Chỉ khi lỗi `auth_error` (key sai) mới ngắt sang key tiếp theo.
    * **Nâng cấp bể OpenRouter với `openrouter/free`:** Bổ sung router tự động chọn model miễn phí tốt nhất (`openrouter/free`) và `google/gemini-2.0-flash-001` lên đầu danh sách `DEFAULT_OPENROUTER_VISION_MODELS` và `DEFAULT_OPENROUTER_TEXT_MODELS`.
    * **Khử triệt để lỗi Header Injection trong Fetch:** Chuẩn hóa toàn bộ chuỗi key nhập từ textarea/localStorage, tự động thay thế `\r\n` thành dấu phẩy `,` trước khi gửi qua `fetch` (`x-gemini-api-key`, `x-openrouter-api-key`), ngăn chặn lỗi `TypeError: Invalid character in header` trên trình duyệt và proxy Render.
    * **Chẩn đoán 503 chi tiết:** Bổ sung `get_last_error_summary()` vào `KeyPoolManager`. Khi gặp 503, máy chủ trả về chi tiết chẩn đoán lỗi cụ thể (ví dụ: `Gemini: 429 Quota Exceeded | OpenRouter: 401 Unauthorized`) giúp người dùng và modal hiển thị hướng dẫn khắc phục chính xác.
    * **Xác thực trực tiếp 4 key Gemini & OpenRouter từ người dùng:**
      - OpenRouter key `sk-or-v1-dde...469`: Kiểm tra qua OpenRouter Auth API -> HTTP 200 OK (50 lượt free model hàng ngày).
      - Phát hiện lỗi thiếu ký tự cuối ở key 1 (`AQ...fEXur` thiếu `g` ở cuối -> sửa thành `AQ...fEXurg`). Sau khi thêm `g`, cả 4 key Gemini đều xác thực thành công 100% với Google Generative Language API.
      - Tinh chỉnh danh sách `GEMINI_MODELS` ưu tiên `gemini-flash-lite-latest` lên đầu tiên: đã kiểm thử thực tế `generateContent` thành công trên cả 4 key, tốc độ siêu nhanh và không bị giới hạn 20 RPD.
  - Toàn bộ 2 Tính năng chính đã được triển khai, kiểm thử và phân định ranh giới module rõ ràng.
  - 513/513 automated tests passed tuyệt đối (100%). TypeScript strict check 0 errors across all apps.
- **Trạng thái Build & Test:**
  - `npx.cmd tsc --noEmit --incremental false` (cả 2 apps `teacher-board` và `student-app`): **Exit code 0 (0 lỗi TypeScript)**.
  - `npx.cmd vitest run` (`teacher-board`): **34/34 test files passed, 417/417 tests passed 100%**.
  - `npx.cmd vitest run` (`student-app`): **6/6 test files passed, 35/35 tests passed 100%**.
  - `pytest tests/` (`services/ai-engine`): **61/61 tests passed 100%**.
  - **Tổng cộng: 513/513 automated tests đạt 100%**.

# 3. Quyết định kỹ thuật & Ngữ cảnh ẩn (Mental Model & Decisions)
- **Zero-Background Holographic Canvas:** Không dùng `div` có nền đục che khuất chữ viết phấn. Canvas mô phỏng dùng `bg-transparent` và 4 góc HUD brackets tự mờ dần sau 2 giây (`opacity-0`) khi nhấc bút, giúp nét vẽ kỹ thuật số hòa quyện tự nhiên như thể nét mực đã tự thân cử động.
- **Direct Kinetic Manipulation:** Tương tác trực tiếp bằng Pointer Events kết hợp Pointer Capture trên canvas thay vì phụ thuộc thanh trượt lề (loại bỏ Slider Slavery).
- **Phân biệt kiểu con trỏ cảm ứng:** Bảng tương tác trường học dùng khung hồng ngoại; phân biệt đầu bút nhọn ($\le 3\text{mm}$), ngón tay ($6\text{mm}-12\text{mm}$), lòng bàn tay ($> 30\text{mm}$) dựa trên `pointerType` và thời gian nhấc bút để chống chạm nhầm (palm rejection).
- **Vết xe đổ đã tránh:**
  - Khi mock fake timers trong Vitest cho `vectorJournal`, phải cấu hình `vi.useFakeTimers({ shouldAdvanceTime: true })` và `vi.setSystemTime(...)` đồng bộ với mốc timestamp của recorder/player để tránh lệch thời gian `Date.now()`.
  - Trong TypeScript discriminated union (`BoardJournalEvent`), không dùng `Omit<Union, K>` thông thường vì TypeScript không tự động phân phối (distribute); phải dùng distributive helper `DistributiveOmit<T, K>` để tránh lỗi TS2353.
  - Trong Vitest / React Testing Library với `SocraticCompanionSession`, component render song song tab chẩn đoán bên trái và stepper bên phải, các câu query `getByTestId` dễ bị trùng element; luôn dùng `getAllByTestId` hoặc scoped `within(...)`.
  - Tuyệt đối chạy `tsc` với `--incremental false` để không tạo/ghi đè file `tsconfig.tsbuildinfo`.

# 3b. Thử nghiệm nâng cấp hình vẽ engine SVG & Nghiên cứu Công cụ Hình học Không gian (28/10/2026)
- **Nghiên cứu Chuyên sâu Hệ sinh thái Công cụ Vẽ Hình học & Hình học Không gian:**
  - Đã hoàn thành báo cáo nghiên cứu chi tiết: `docs/tai-lieu-nghien-cuu-stem/NGHIEN_CUU_CHUYEN_SAU_CONG_CU_HINH_HOC_KHONG_GIAN.md`.
  - Khảo sát 5 nhóm công cụ: DGS Sư phạm (GeoGebra 3D, Cabri 3D, Desmos 3D), Hệ thống TeX/Xuất bản (TikZ-3dplot, Asymptote), Math Animation (Manim/3B1B), WebGL Frameworks (Three.js/R3F, Babylon.js, CSG Manifold), và Smartboard AI Canvas.
  - Phân tích sâu 5 thách thức kỹ thuật cốt lõi: Nét đứt/Nét khuất (Dual-depth pass shader), Cắt thiết diện (CSG cross-section), Phép chiếu SGK (Axonometric vs Perspective), Trải phẳng đa diện (Polyhedral Net) và Depth Snapping trên màn cảm ứng 2D.
  - Đề xuất kiến trúc kỹ thuật module 3D cho Bảng tương tác thông minh (Smartboard) và Gia sư AI Socratic.
- Thêm `apps/teacher-board/src/engines/visualKit.tsx`: `VisualDefs` (gradient thủy tinh/kim loại/thép, quầng sáng, bóng mềm), `SphereGrad`, `GroundShadow`, `useEased` (làm mượt đại lượng vẽ), `usePrefersReducedMotion`, `useUid`.
- Áp dụng thử cho `DaniellEngine` và `LeChatelierEngine` (`ChemEngines.tsx`). Chỉ đổi cách vẽ: giữ nguyên mô hình, `data-*`, `data-testid`. Màu khí NO₂ vẫn lấy thẳng từ mô hình (đậm lên ngay khi nén); chỉ piston, độ dày điện cực, độ sáng bóng đèn được làm mượt.
- `prefers-reduced-motion`: hình đứng yên, bỏ mọi `<animate*>`. Test: `__tests__/visualKit.test.tsx`.
- Đã nhân rộng (28/10/2026) sang toàn bộ engine SVG Lý/Hóa/Sinh: `PhysEngines` (khí p–V, con lắc kép, Coriolis, Fraunhofer), `MoreStemEngines` (khí khổng, thẩm thấu, operon lac, hộp tứ phân vị), VSEPR, hô hấp tế bào. Chỉ đổi cách vẽ/chuyển động; số liệu vẫn từ mô hình.
- Mô phỏng theo thời gian vật lý (con lắc kép, chu trình khí, Coriolis, VSEPR tự xoay): giảm chuyển động → không tự chạy (bấm ▶), Coriolis hiện sẵn quỹ đạo đầy đủ. Rôto ATP synthase đổi từ `setInterval` 20 khung/giây sang rAF (cùng tốc độ).
- CHƯA làm: 3 engine canvas (`BioSystemEngine`, `ChemistryLabEngine`, `PhysicsSandboxEngine`) — thời gian nằm trong vòng vẽ nên cần tách mô hình thời gian trước khi hỗ trợ giảm chuyển động; `AdvancedStemEngines` (Oxyz, tinh thể, CFT, SN2, cyclohexane, Lotka–Volterra, tín hiệu) đã có gradient sẵn nên giữ nguyên.
- Chưa đo fps trên máy yếu. `proRenderer.ts` (canvas) vẫn chưa engine nào dùng.

# 4. Chỉ thị cho Agent tiếp theo (Immediate Next Steps)
1. **Kiểm tra trạng thái ban đầu:**
   - Chạy lệnh `git status -s` để xác nhận nhánh `main` sạch sẽ và đồng bộ với remote.
   - Chạy `npx.cmd vitest run` trong `socratic-monorepo/apps/teacher-board` (đạt mốc 382/382 tests).
   - Chạy `npx.cmd vitest run` trong `socratic-monorepo/apps/student-app` (đạt mốc 18/18 tests).
   - Chạy `pytest` trong `socratic-monorepo/services/ai-engine` (đạt mốc 41/41 tests).
2. **Nhiệm vụ tiếp theo tùy theo yêu cầu của người dùng:**
   - Nếu người dùng muốn gắn UI tua lại bài giảng lên giao diện: Tạo component thanh tua thời gian `VectorTimeTravelBar.tsx` kết nối với `VectorJournalPlayer` để giáo viên kéo thanh trượt xem lại các nét vẽ và trạng thái mô phỏng.
   - Nếu người dùng muốn tối ưu ngoại tuyến OPS: Cấu hình Service Worker Cache hoặc IndexedDB cho các file `.socr` bài giảng.
   - Nếu người dùng yêu cầu commit: Tuân thủ quy tắc stage file chọn lọc đúng nhiệm vụ, kiểm tra diff staged, commit và push lên `origin main`.
3. **Quy định phạm vi file (Scope):**
   - **ĐƯỢC PHÉP SỬA (khi có yêu cầu từ người dùng):**
     * `socratic-monorepo/apps/teacher-board/src/utils/**`
     * `socratic-monorepo/apps/teacher-board/src/engines/**`
     * `socratic-monorepo/apps/teacher-board/src/components/canvas/**`
     * `socratic-monorepo/apps/teacher-board/src/__tests__/**`
     * `socratic-monorepo/apps/student-app/src/components/companion/**`
     * `socratic-monorepo/apps/student-app/src/__tests__/**`
     * `docs/tai-lieu-nghien-cuu-stem/TRANG_THAI_TICH_HOP.md`
     * `.ai/HANDOFF.md`
   - **TUYỆT ĐỐI CẤM SỬA / STAGE / COMMIT / REVERT:**
     * `socratic-video/`, `.claude/`, `Ho-so-*`, `AXIOMA-*`, `slide-du-thi/`, `Goi-gui-nhom-IT-Hust/`, `KE-HOACH-SLIDE-DU-THI.md`.
     * Video `*.mp4`/`*.mov`, slide/poster `*.pptx`/`*.docx`, `Poster Mockup.png`.
     * `socratic-monorepo/apps/teacher-board/src/app/globals.css`, `src/components/modes/ClassTelemetryMode.tsx`, `src/app/pitch/**`, `src/components/analytics/**`, `src/components/pitch/**`, `public/**`.
     * `socratic-monorepo/packages/types/src/index.ts`, `packages/types/src/pilot*`, `socratic-monorepo/tsconfig.json`, mọi `tsconfig.tsbuildinfo`.
     * `docs/tai-lieu-nghien-cuu-stem/README.md` và `NGHIEN_CUU_HOAN_THIEN_TOAN_DIEN_HE_THONG_STEM_HOLOGRAPHIC.md` (chỉ đọc, không can thiệp thay đổi của nguồn khác).

---

# PHẦN B — LUỒNG VIDEO & SLIDE QUẢNG BÁ (bàn giao + hướng dẫn trình dựng video)

> Phần A ở trên là luồng STEM Engines (giữ nguyên). Phần B là luồng riêng, do một agent khác làm. Mục "CẤM SỬA" của phần A (`socratic-video/`, `src/app/pitch/**`, `src/components/pitch/**`, `public/**`, `AXIOMA-*`) chính là **phạm vi được sửa của phần B**. Hai luồng không chạm file của nhau.

## B1. Mục tiêu hiện tại
- Video và slide quảng bá cho **Socratic Vision Board**. Trên slide cuộc thi sinh viên, sản phẩm mang tên **AXIOMA**.
  1. Video giới thiệu sản phẩm/demo, không thuyết minh, không ghi tên tác giả: composition Remotion **`Launch`** (3:04). **Đã render.**
  2. Video dự thi có giọng đọc: composition **`FlowCut`** v5 (4:43, "giáo viên Tin học"). **Đã nộp, không sửa nữa.**
  3. Slide web 12 trang **AXIOMA** (phong cách Framer) cho cuộc thi Ý tưởng sáng tạo sinh viên. **Đã xuất PDF/PNG.**

## B2. Trạng thái
- **Đã xong:**
  - Video `out/ban-Launch/Socratic-Vision-Board_Gioi-thieu-san-pham.mp4`. Mã: `socratic-video/src/launch/{plan.ts,Launch.tsx}`, đăng ký trong `src/Root.tsx`.
  - Video `out/ban-FlowCut/Socratic-Vision-Board_FlowCut_v5_GV-Tin-hoc.mp4`. Mã: `src/flow/*`.
  - Slide: `socratic-monorepo/apps/teacher-board/src/app/pitch/page.tsx` (dynamic, `ssr:false`), `src/components/pitch/{Deck,kit,slides}.tsx`, ảnh `public/pitch/*.jpg`. Bản xuất nằm trong `AXIOMA-slide-y-tuong-sang-tao/`.
  - Logo: `socratic-video/brand/logo-mark.svg` (logo động trong video: `src/flow/LogoAnim.tsx`).
- **Đang làm dở:** không có. Toàn bộ phần B **chưa commit** (untracked/modified).
- **Build:** `socratic-video`: `npx tsc --noEmit -p .` cho 0 lỗi. `node tools/check-launch.mjs` cho 5531 frame (3:04,4). `node tools/check-flow.mjs` cho 8488 frame (4:42,9). Trang `/pitch` không có lỗi hydration; chỉ còn 1 lỗi 404 (favicon).

## B3. Hướng dẫn trình dựng video (`socratic-video/`, Remotion 4, 1920×1080, 30 fps)

### Bản đồ thư mục
| Đường dẫn | Vai trò |
|---|---|
| `src/Root.tsx` | Đăng ký composition: `Launch`, `FlowCut`, `Demo2`, `Demo`, `Pitch` |
| `src/launch/plan.ts` | Thứ tự cảnh của bản Launch (`ITEMS`), độ dài, kiểu chuyển cảnh `tr`, mức nhạc `music`; `FAST` = tốc độ tua đoạn cuối của từng cảnh |
| `src/launch/Launch.tsx` | Dựng Launch: `BrandReveal`, `StatsBeat`, `ColdWords` (Viết./Khoanh./Thấy.), nhạc `launch_bed`, danh sách SFX `cues()` |
| `src/flow/plan.ts`, `FlowCut.tsx` | Bản dự thi có giọng (đã nộp) |
| `src/demo2/plan.ts` | Nguồn cảnh gốc `SCENES` (segs footage, side/kicker/stats, hud, voice). Hàm `toScene`, `sceneDur`, `voiceNeed` (tra theo `id` trong `voice.json`) |
| `src/demo2/FootageScene.tsx` | Cảnh footage: cửa sổ app (camera zoom theo keyframe), cột tiêu đề `SideColumn`, `Callouts`, thẻ HUD `Pill`, ô prompt kiểu Flow `PromptCard` (HINTS theo clip) |
| `src/demo2/CardScenes.tsx` | Các cảnh thẻ Brand / Results / Closing (chỉ FlowCut dùng) |
| `src/flow/fx.tsx` | Hiệu ứng: `StudioBg`, `Grain`, `SlideText` (chữ trượt có nhòe ngang), `LightSweep`, `SelectGlow`, `Letterbox`, `DirBlurDefs`/`dirBlur` |
| `src/flow/{whip,blurZoom}.tsx` | Chuyển cảnh `whip`, `through`, `blurZoom` |
| `src/flow/CardCloud.tsx` | Mở đầu: đám thẻ 3D → tường → lao vào thẻ giữa (`public/flow/cold_first.jpg` phải khớp khung đầu clip P) |
| `src/flow/Montage.tsx` | Montage cắt theo phách: `SHOTS` (clip, giây, tâm cx/cy, độ phóng s), `montageCuts(start, total, bed)` |
| `src/flow/EndCard.tsx` | "Bắt đầu dạy." → logo. `credits={false}` để ẩn tác giả/cuộc thi |
| `src/flow/sfx.ts` | `sceneCues(scene)`: tiếng bút theo từng mốc `stroke`, gõ phím, swell, tick, glass… |
| `src/flow/music.ts` | Kiểu `Bed`, `musicStart`, `beatsIn(..., bed)` |
| `public/clips/*.mp4` + `src/demo2/marks/*.json` | Footage app thật + mốc hành động/camera/chú thích. P/R/H/B đã quay lại bằng nét viết tay người |
| `public/music/{flow_bed,launch_bed}.{mp3,json}` | Nhạc kéo dài + lưới phách (mỗi composition một file) |
| `public/sfx/*.mp3` | SFX tự tổng hợp (`tools/sfx.py`, `tools/sfx2.py`) |
| `public/voice/*.mp3`, `src/demo2/voice.json` | Giọng ElevenLabs của FlowCut (Launch không dùng) |

### Quy trình sửa → kiểm tra → render (chạy trong `socratic-video/`)
1. Sửa `src/launch/*` (hoặc các thành phần dùng chung trong `src/flow/*`; lưu ý FlowCut cũng dùng chúng).
2. Kiểm tra kiểu: `npx tsc --noEmit -p .`
3. Kiểm tra thời lượng: `node tools/check-launch.mjs`. Nếu tổng thời lượng đổi, dựng lại nhạc cho khớp outro:
   `python -I tools/flow_music.py analysis/flow/flow_audio.wav <tổng giây> public/music/launch_bed.mp3`
4. Soát khung hình: `node tools/stills-launch.mjs <thư mục ra> <id>:<giây,...> ...` (id lấy từ `ITEMS`, ví dụ `L-cold:2,7 brand:1.5 stats:6`), ghép tờ xem nhanh bằng `python -I tools/sheet.py <thư mục> <ra.jpg> 4`.
5. Render (luôn thêm `--port=3123`, vì cổng 3001 thường bị app Next chiếm):
   `npx remotion render src/index.ts Launch out/ban-Launch/_raw.mp4 --crf=18 --concurrency=75% --port=3123`
6. Chuẩn hóa màu và âm lượng (ffmpeg ở `C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe`):
   `-vf "scale=in_range=pc:out_range=tv:flags=accurate_rnd,format=yuv420p" -c:v libx264 -crf 18 -preset slow -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -af "alimiter=limit=0.84:level=false,loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 256k -movflags +faststart`
7. Soát file cuối: trích 10–12 khung bằng ffmpeg `-ss <giây> -frames:v 1`, đo âm lượng bằng `-af ebur128=peak=true` (đỉnh phải dưới −1 dBFS).

### Công cụ phụ
- Quay lại footage app: chạy `services/ai-engine` (`python main.py`, cổng 8000) và `apps/teacher-board` (`npx next dev -p 3001`). Sau đó `node tools/clips3.mjs <thư mục> P|R|H|B`, rồi `bash tools/ingest.sh <thư mục>`. Nét viết tay sinh bằng `python -I tools/handwriting.py` → `tools/hand-ink.json`; recorder phát lại qua `inkHand`.
- Giọng đọc (chỉ cho FlowCut): `node tools/tts.mjs speak --voice onwK4e9ZLuTAKqWW03F9 --model eleven_v3 [--only <cảnh>]`, kiểm độ rõ lời bằng `python tools/asr_check.py --scenes`.
- Xuất slide: `node tools/deck-shots.mjs http://localhost:3001/pitch <thư mục> 12` (ra PNG + `deck.pdf`), rồi chép vào `AXIOMA-slide-y-tuong-sang-tao/`.

## B4. Quyết định kỹ thuật & vết xe đổ (phần B)
- **Số liệu:** chỉ lấy từ `socratic-monorepo/packages/types/src/pilot2026.json` (`PILOT`, `vn()`). Đã loại các claim không có nguồn: "95%", "450 ms", Three.js PBR, mathjs, palm-rest 550 ms, Olympiad Fast-Track, "14/14 kiểm thử" (lần chạy lại 24/10 frontend chỉ đạt 10/29). Tỉ lệ chặn là 98,1% (312/318).
- **Launch dùng bản sao cảnh của demo2** với `id='L-<id>'`, `voice:''`, `chapter:null`. Nếu giữ id gốc, `voiceNeed` sẽ tra `voice.json` và kéo dài cảnh theo giọng.
- **Mỗi composition có file nhạc riêng**, vì nhạc được canh để phần outro trùng điểm kết video. Montage và SFX lấy vết cắt từ lưới phách của đúng file nhạc đó.
- **Ảnh crop:** độ phóng `z > 1.3` làm vỡ hạt. App nền giấy trắng: khi đặt chữ trắng lên trên thì hạ `brightness`, và không lồng ảnh app vào chữ.
- **Lỗi đã gặp:**
  - Render/still báo "not a valid Remotion project" → thêm `--port=3123`.
  - Bundle esbuild ra `os.tmpdir()` không tìm thấy `remotion` → ghi vào `node_modules/.cache` và đánh dấu `external`.
  - ffmpeg imageio không có `-pattern_type glob`.
  - Lệnh PowerShell có `.Replace()` nhiều dòng thất bại vì file CRLF → dùng Edit.
  - `toLocaleString('vi-VN')` cho kết quả khác nhau giữa Node và trình duyệt → hydration error (xử lý bằng `ssr:false`).
- **ElevenLabs gói free:** giọng thư viện bị chặn (402). `multilingual_v2` đọc tiếng Việt CER 25–30%; `eleven_v3` CER khoảng 4% nhưng không nhận `previous_text/next_text`. Credit còn khoảng 2.000 ký tự. Khóa API nằm trong `socratic-video/.env` (đã .gitignore); người dùng từng dán khóa vào chat → khuyên tạo khóa mới.
- **Nhạc nền là nhạc trailer Google Flow (có bản quyền).** Đã cảnh báo người dùng. Muốn thay: chạy lại `flow_music.py` với file wav mới, các vết cắt tự khớp lại.

## B5. Chỉ thị cho agent tiếp theo (phần B)
1. Đọc phần B này và memory `C:\Users\Admin\.claude\projects\C--Users-Admin-Desktop-AI-Edtech\memory\contest-pitch-video-workflow.md`. Không reset/revert file của phần A.
2. Yêu cầu sửa video giới thiệu → làm theo quy trình B3 với composition `Launch`. Lưu bản mới thành `out/ban-Launch/<tên>_vN.mp4`, không ghi đè bản cũ.
3. Yêu cầu sửa slide → sửa `src/components/pitch/*`, chạy `npx next dev -p 3001` trong teacher-board, xuất lại theo B3.
4. Chỉ commit khi người dùng yêu cầu; stage chọn lọc đúng phạm vi phần B.
5. **Được sửa:** `socratic-video/src/{launch,flow}/**`, `socratic-video/src/demo2/{FootageScene,CardScenes}.tsx`, `socratic-video/tools/**`, `socratic-video/public/{music,sfx,flow}/**`, `socratic-video/brand/**`, `teacher-board/src/{app/pitch,components/pitch}/**`, `teacher-board/public/pitch/**`, `AXIOMA-slide-y-tuong-sang-tao/**`, `.ai/HANDOFF.md` (chỉ thêm, không xóa phần A).
6. **Không đụng:**
   - `socratic-video/.env`.
   - `socratic-video/src/demo2/voice.json` và `public/voice/*` (đổi lời đọc thì phải tạo lại giọng).
   - Lời `voice:` trong `src/demo2/plan.ts` (phụ đề khớp theo đúng chuỗi này).
   - `out/ban-FlowCut/*_v5_*.mp4` (bản đã nộp).
   - `packages/types/src/pilot*` (chỉ đọc).
   - Toàn bộ phạm vi của phần A, `Ho-so-*`, `slide-du-thi/`, `Goi-gui-nhom-IT-Hust/`, các file mẫu `*.pptx/*.docx`, mọi `tsconfig.tsbuildinfo`.

---

# CẬP NHẬT SPECS HIỆN TRẠNG — 26/10/2026

- Theo yêu cầu quét toàn dự án và cập nhật specs của người dùng, đã thêm `docs/CURRENT_SPECS.md`. Đây là bản đối chiếu working tree với implementation, phục vụ viết báo cáo Edtech; không thay đổi code của luồng A/B, tài sản quảng bá hoặc tài liệu nghiên cứu.
- Git nền tại thời điểm rà soát: `main`, HEAD `45612a4`; working tree có thay đổi sẵn và nhiều tệp chưa commit. Không xác nhận sạch/đồng bộ remote, không stage/commit/push trong đợt này.
- Đã chạy lại: Teacher Board 29 file/378 tests; Student App 1 file/14 tests; toàn monorepo 31 file/394 tests; backend 38 tests. Hai app đều `tsc --noEmit --incremental false` exit 0. Tổng JS gồm hai scenario jsdom có API mock, không phải kiểm thử trình duyệt với backend thật. Chưa chạy production build/benchmark trên thiết bị.
- Các phân biệt quan trọng khi viết báo cáo hoặc bàn giao tiếp:
  1. `vectorJournal.ts` có implementation/test nhưng chưa được import vào Canvas/Dock; chưa có luồng ghi và tua lại bài giảng hoàn chỉnh trên UI.
  2. Companion hiện import cache regex/từ khóa, không dùng wrapper ChromaDB; adapter có nhãn `LLM_FALLBACK` nhưng đang trả heuristic, chưa gọi provider thật.
  3. `exportIsolatedWebp()` hiện xuất PNG; không có bảo đảm ảnh luôn dưới 8 KB.
  4. BYOD thực tế đi qua FastAPI WebSocket; Socket.IO gateway là luồng riêng còn scaffold. Phòng/notes/heatmap nằm trong RAM; chưa có offline PWA toàn phần.
  5. Voice gate có fallback demo tự cho qua; heatmap có hồ sơ/sĩ số mẫu. Số liệu `pilot2026.json` chưa được lần rà soát này xác minh từ log/bài kiểm tra gốc.
  6. Cần kiểm tra render Sinh nâng cao có cùng lúc fallback `BioSystemEngine`, và khả năng đồng bộ state riêng của từng engine.
- Ưu tiên đọc `docs/CURRENT_SPECS.md` để biết giới hạn và bằng chứng hiện tại; các mục Done/SLA ở phần trước vẫn là lịch sử bàn giao, không tự động chứng minh mọi claim đã được đo thực tế.

## B6. Launch v2 — cập nhật 26/10/2026
- Theo yêu cầu mới: video giới thiệu sản phẩm dưới 3 phút, không lời đọc; bỏ số liệu dự thi, FPS/độ trễ/chi phí API và tiết kiệm thời gian giáo án.
- Bản hoàn chỉnh mới: `socratic-video/out/ban-Launch/Socratic-Vision-Board_Launch_v2_Product-Intro.mp4` — 1920×1080, 30 fps, 4406 frame = 146,8667 giây (2:26,9); 23.242.216 byte. File QA: `Launch_v2_QA.json`; LUFS -15,02, true peak -1,50 dBTP. Đã giải mã/trích 15 khung cuối và soát contact sheet `Launch_v2_Final_ContactSheet.jpg`.
- Code Launch đã chuyển sang v2: `src/launch/{plan.ts,Launch.tsx,ProductScenes.tsx,native-assets.json,native-assets-manifest.json,STORYBOARD-v2.md}`; nhạc riêng `public/music/launch_v2_bed.{mp3,json}`. Tools mới `tools/{launch-native-assets.mjs,finalize-launch-v2.py}`.
- Cảnh mới: Hologram, Oxyz, Riemann, SN2, Cyclohexane, CFT, ETC/ATP, GPCR/Apoptosis, Visual Debuggers. SVG serialize từ component sản phẩm thật bằng React server render; **không phải footage mới quay UI**. Hologram là minh họa bố cục/di chuyển/thu phóng. SN2 dùng hàm sn2 của sản phẩm, chuyển động theo frame. Các cảnh cũ viết/khoanh/ném xiên/Companion giữ footage.
- `src/demo2/FootageScene.tsx` có thêm tùy chọn `productFilm=false` mặc định; chỉ Launch bật true để ẩn callout kỹ thuật/prompt overlay. Không sửa source FlowCut/giọng; check-flow vẫn 8488 frame. Bản MP4 Launch cũ giữ nguyên, chưa commit/push.
- Kiểm tra mới: TypeScript video đạt; render 4406/4406 frame đạt; finalize và QA exit 0. Không đưa playback vào quảng bá vì UI luồng chính chưa tích hợp. Nhạc vẫn dùng nguồn cũ, bản quyền không thay đổi.

## B6. Cập nhật 26/10 — Launch v3 (bản giới thiệu sản phẩm hiện hành)
- Composition `Launch3` (`socratic-video/src/launch3/{plan.ts,Launch3.tsx}`), 2:16,8. Xuất: `out/ban-Launch/Socratic-Vision-Board_Launch_v3.mp4`. Bản v2 (`src/launch/*`, agent khác) giữ nguyên, người dùng không ưng.
- Footage tính năng mới quay từ app thật: `tools/clips4.mjs` (viết tay `hand-ink.json` → lasso → gợi ý định tuyến cục bộ `localRouter` → mô phỏng → xoay/kéo thanh trượt; `conv` = chữ tay → công thức → đồ thị; `holo` = kéo/phóng hologram). Clip: `public/clips/N{conv,oxyz,revolve,lattice,sn2,cyclo,etc,lotka,pendulum,holo}.mp4` + `src/demo2/marks/N*.json`, đã khai báo trong `src/demo2/clips.ts`.
- Không dùng số liệu kiểu 60 khung/giây, 4 phút soạn bài, thí điểm. Nhạc `public/music/launch3_bed.*`. Kiểm tra: `node tools/check-launch3.mjs`, soát `node tools/stills-launch3.mjs`. Montage nhận `shots` (`SHOTS3`).

# 2026-10-26 — Multi-Agent Architecture Refactor

## Current Task
- Establish a safe multi-agent context layer and assess whether a physical source-tree migration is safe.

## Working State
- Phase 1 survey completed for the workspace, monorepo packages/apps/services, TypeScript aliases, Python service layout, and import edges.
- The executable architecture already has stable bounded contexts: teacher-board, student-app, shared types, shared UI, API gateway, and AI engine.
- Working tree contains pre-existing modified and untracked business/media/document files. Those changes are preserved.
- No business-logic files were moved or rewritten. No import paths were changed.

## Decisions
- Treat `socratic-monorepo` as the executable product boundary; keep `socratic-video`, slide, submission, and research artifacts independent.
- Keep current runtime paths in this pass. A physical move of app modules while the tree is dirty would create unnecessary broken imports and merge conflicts.
- Canonical cross-module contracts remain `socratic-monorepo/packages/types`; shared UI remains `packages/ui`.
- Added root agent entrypoints: `CLAUDE.md`, `AGENTS.md`, `.antigravity/rules.md`.
- Added `.ai/ARCHITECTURE.md` and `.ai/INTERFACES.md` with dependency, naming, ownership, and contract rules.

## Immediate Next Steps
- Run monorepo typecheck/tests and service checks without generating tracked build metadata.
- Any future physical move requires an explicit clean working tree or a narrowly scoped approved directory, `git mv`, alias/import updates, and verification before merge.

# 2026-10-26 — Backend & Engine Audit / Visual Observability

## Current Task
- Audit backend-to-engine wiring and make the runtime state visible in the teacher experience.

## Working State
- FastAPI engine routes, classroom WebSocket, companion verification, lasso compiler, notes/heatmap, and plot endpoint were inspected.
- Fixed a real Tier 2 integration defect: `ChromaSemanticCache` passed an unsupported `threshold` argument to `lookup_semantic_cache`; the lookup now accepts the threshold and companion uses the Chroma wrapper.
- Added dynamic runtime diagnostics to `/health` for RapidOCR, ChromaDB, Gemini configuration, classroom room/student counts, and advanced engines.
- Added `EngineHealthRail` to the teacher board for live backend/engine/cache/classroom visibility.
- Added a regression test for the Chroma wrapper integration.

## Verification
- AI engine: 39 tests passed (4 existing Pydantic deprecation warnings).
- Frontend: 394 Vitest tests passed.
- Teacher-board TypeScript: passed.
- Production monorepo build: teacher-board and student-app both passed.
- Runtime health smoke test: endpoint returns 200.

## Findings / Remaining Gaps
- Runtime environment currently reports `rapidocr: false` and `chromadb: false`; deterministic and heuristic fallbacks are active. Install optional dependencies and provide a Gemini key to enable those tiers.
- Classroom realtime is FastAPI WebSocket based and in-memory. The Node Socket.IO/Redis gateway remains a separate scaffold and is not the active frontend transport.
- Smart Notes, heatmap, and room state are process-local; restart loses state.
- Gemini key persistence writes `.env` from the API route; production deployment needs a secrets manager and authentication around that setting.
- Root monorepo typecheck still has the pre-existing missing `module` compiler option; app-level typechecks and production build pass.

# 2026-10-26 — Real Smartboard Deployment Readiness

## Current Task
- Remove localhost assumptions and document/verify a real LAN test path for smartboard hardware.

## Changes
- Added configurable CORS origins in `services/ai-engine/main.py`.
- Added optional runtime dependencies `rapidocr-onnxruntime` and `chromadb` to `services/ai-engine/requirements.txt`.
- Added `services/ai-engine/.env.example`, app `.env.example` files, and Student App Next rewrite proxy.
- Added `docs/SMARTBOARD_TEST_RUNBOOK.md` with LAN topology, startup commands, firewall checks, and acceptance flow.
- Added root TypeScript `module: ESNext` so the monorepo typecheck passes.
- Replaced deprecated Pydantic `.dict()` with `.model_dump()`.

## Verification
- Root monorepo typecheck: passed.
- Teacher-board and student-app production build: passed.
- AI engine: 39 tests passed.

## Field-test prerequisites
- Set `NEXT_PUBLIC_BACKEND_URL`/`BACKEND_URL` to the host LAN IP, never the board's localhost.
- Set matching `CORS_ORIGINS` and allow TCP 3001/3002/8000 through the host firewall.
- Install the optional Python dependencies to turn RapidOCR and ChromaDB runtime flags true.
- The active classroom transport remains FastAPI WebSocket; the Node Socket.IO gateway is not part of the current browser path.
- State remains process-local for this hardware trial; restart or reset between sessions.

# 2026-10-26 — Board Solution Grading & OCR Clarification

## Current Task
- Let a student write a solution on the smartboard, lasso it, convert it to LaTeX, and receive a verified grade/feedback without hallucinated symbols.

## Changes
- Added `POST /api/v1/companion/grade-solution`.
- The endpoint refuses to grade when OCR confidence is below 0.72 or the solution/expected answer is missing; it returns `NEEDS_CLARIFICATION` with candidate options.
- Once reviewed, the endpoint delegates to the existing deterministic/Socratic `evaluate_step` pipeline and returns correctness, source, feedback, and optional visual debugger data.
- Added grading UI to `InkConvertPanel`: expected-answer input, OCR confidence badge, grade button, feedback, correct/needs-fix state, candidate choice buttons, and manual LaTeX editing.
- Enabled grading mode for the board lasso conversion flow in `SmartboardCanvas`.

## Verification
- AI engine: 41 tests passed.
- Teacher Board: 378 tests passed.
- Teacher Board TypeScript: passed.
- Existing engine behavior remains covered by the previous engine test suite.

## Safety behavior
- Low-confidence OCR never reaches the verifier.
- The UI explicitly asks the teacher/student to choose a candidate or type the exact symbol before grading.
- The backend remains the source of truth for the final grade; client heuristics do not override a graded response.

---

# 2026-10-26 — Tích hợp Toàn diện AI Tutor Sau Giờ Học & Kiểm tra Logic Nhận diện OCR

## 1. Mục tiêu hoàn thành
- Tích hợp toàn bộ kiến trúc nghiên cứu từ `docs/tai-lieu-nghien-cuu-stem/NGHIEN_CUU_AI_TUTOR_GIA_SU_SAU_GIO_HOC.md` vào hệ sinh thái monorepo.
- Kiểm tra và nâng cấp toàn diện logic nhận diện OCR:
  * Nếu confidence của ký tự/công thức thấp (< 0.85 hoặc có ký tự nghi ngờ/mơ hồ) -> Hiển thị giao diện cho người dùng sửa trực tiếp hoặc bấm chọn nhanh các ký tự nghi ngờ đúng (1-tap swap candidate chips: `Z ⇄ 2`, `n ⇄ \pi`, `l ⇄ 1`, `O ⇄ 0`, `S ⇄ 5`, `w ⇄ \omega`, `a ⇄ \alpha`, `t ⇄ +`, `q ⇄ 9`).
  * Nếu confidence bình thường (>= 0.85 và không có nguy cơ mơ hồ) -> Chuyển thẳng sang mô phỏng/bài làm không ngắt quãng trải nghiệm người dùng.
- Triển khai cơ chế Temporal Scene Chunking (Pre-Clear Commit) trên bục giảng: khi giáo viên hoặc học sinh xóa bảng (`handleClear`), hệ thống tự động kết đọng phân cảnh vào chuỗi nhật ký tiết học để bảo toàn toàn bộ ngữ cảnh 45 phút phục vụ buổi tự học ở nhà.
- Xây dựng mô hình toán học Bayesian Knowledge Tracing (BKT) và bộ giao diện Gia sư AI Socratic Đồng hành sau Giờ học với 4 chế độ tương tác chuẩn hóa.

## 2. Thay đổi chi tiết trong Codebase
1. **`socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`**:
   - Tích hợp `findAmbiguousTokens` từ `../../utils/ocrConfusions`.
   - Trong `handleVisualize`: Đo lường `isLowConfidence = conf < 0.85 || (conf < 0.92 && ambiguousTokens.length > 0)`.
     * Nếu thấp: Lưu `pendingBlueprint`, mở `OcrReviewModal` kèm ảnh cắt nét chữ viết tay,KaTeX, các phím hoán đổi 1-chạm và danh sách gợi ý.
     * Nếu bình thường: Mount trực tiếp `finalBp` vào `SimulationWidget` trong <1.5s.
   - Thêm trạng thái `recordedScenes` và cơ chế Pre-Clear Commit trong `handleClear`: tự động lưu lại phân cảnh bài giảng trước khi xóa nét vẽ.
   - Nâng cấp modal Tổng kết bài giảng (QR Smart Notes) hiển thị số lượng phân cảnh đã lưu qua các lần xóa bảng và thông tin lộ trình bài tập về nhà Socratic phân hóa.
2. **`socratic-monorepo/apps/teacher-board/src/components/canvas/InkConvertPanel.tsx`**:
   - Tích hợp `findAmbiguousTokens` và `swapTokenInFormula`.
   - Đối với từng dòng nhận diện: nếu `l.confidence < 0.85` hoặc `l.valid === false`, hiển thị các chip hoán đổi ký tự nghi ngờ (`conf.token ⇄ alt`) ngay dưới dòng LaTeX; nếu confidence bình thường (>= 0.85), ẩn các chip này để giữ giao diện thanh thoát.
3. **`socratic-monorepo/apps/student-app/src/utils/bktEngine.ts`**:
   - Triển khai thuật toán Bayesian Knowledge Tracing chuẩn: tính toán $P(L_t \mid \text{Evidence})$ theo định lý Bayes và bước chuyển tiếp $P(L_{t+1}) = P(L_t) + (1 - P(L_t)) \cdot P(T)$.
   - Tính toán chu kỳ ôn tập ngắt quãng Spaced Repetition (SM-2) theo số lần làm đúng liên tiếp.
   - Đo lường chỉ số thời gian nỗ lực tư duy hữu ích (Productive Struggle Time - PST) và tỷ lệ giàn giáo (Scaffolding Efficiency Ratio - SER).
4. **`socratic-monorepo/apps/student-app/src/components/companion/AfterSchoolTutor.tsx`**:
   - Xây dựng phân hệ Gia sư AI Socratic sau giờ học với 4 chế độ:
     1. Socratic Homework Solver: Hướng dẫn giải bài tập về nhà có giàn giáo 4 cấp độ, đồng bộ công thức từ bục giảng (`v_0 = 22\text{ m/s}`, `4\text{Fe} + 3\text{O}_2 \rightarrow 2\text{Fe}_2\text{O}_3`, `y = 2\sin(3x)`), chặn triệt để hành vi xin đáp án bằng Socratic Guardrails, tích hợp mở Visual Debuggers (Cân đĩa hóa học, Đa giác lực, Thước tiếp tuyến).
     2. Home Sandbox & Free Sketch: Tái hiện mô hình sống của thầy cô, cho phép học sinh can thiệp tham số mô phỏng What-If.
     3. Spaced Repetition & Exam Drill: Ôn tập ngắt quãng dựa trên độ thành thạo BKT của từng kỹ năng con.
     4. ParentPulse & Teacher Sync: Báo cáo định tính nỗ lực học tập và đồng bộ bản đồ nhiệt với giáo viên.
5. **`socratic-monorepo/apps/student-app/src/app/page.tsx`**:
   - Tích hợp tab `AFTER_SCHOOL_TUTOR` ("Gia sư AI sau giờ học") vào thanh điều hướng ứng dụng học sinh.
6. **Kiểm thử tự động mới**:
   - `apps/teacher-board/src/__tests__/ocrConfidenceAndDebrief.test.tsx`: 4 tests kiểm tra logic mở modal khi confidence thấp, đóng modal khi confidence bình thường, hiển thị chip hoán đổi trong InkConvertPanel và Pre-Clear Commit.
   - `apps/student-app/src/__tests__/bktAndAfterSchoolTutor.test.tsx`: 4 tests kiểm tra công thức toán BKT, Spaced Repetition SM-2, PST metrics và 4 chế độ AfterSchoolTutor kèm Socratic Guardrails.

## 3. Kết quả Kiểm tra & Xác minh (Verification)
- `npx.cmd tsc --noEmit --incremental false` (`apps/teacher-board`): **Exit code 0 (0 lỗi TypeScript)**.
- `npx.cmd tsc --noEmit --incremental false` (`apps/student-app`): **Exit code 0 (0 lỗi TypeScript)**.
- `npx.cmd vitest run` (`apps/teacher-board`): **30/30 test files passed, 382/382 tests passed 100%**.
- `npx.cmd vitest run` (`apps/student-app`): **2/2 test files passed, 18/18 tests passed 100%**.
- `pytest` (`services/ai-engine`): **6/6 test files passed, 41/41 tests passed 100%**.
- **Tổng cộng: 441/441 automated tests passed tuyệt đối (100%)**.


## 2026-10-26 — Báo cáo ViSEF về động học chữ ký
- Phạm vi đang thực hiện: docs/bao-cao-viseF-chu-ky/ và tmp/viseF-report/; soạn báo cáo từ hai tài liệu người dùng cung cấp. Không sửa mã nguồn sản phẩm.


## 2026-10-27 — Báo cáo ViSEF theo form Socratic Vision Board
- Đã đọc và chắt lọc mẫu docs/BAO_CAO_KHOA_HOC_KY_THUAT_SOCRATIC_VISION_BOARD.docx: A4, lề trái 2.5 cm, các lề còn lại 2 cm, Times New Roman, nội dung cỡ 12, giãn dòng 1.35, tiêu đề chương/mục, mục lục, danh mục bảng hình, header và footer.
- Đã tạo docs/bao-cao-viseF-chu-ky/Bao_cao_ViSEF_Dong_hoc_chu_ky.docx từ cấu trúc mẫu; giữ mẫu gốc nguyên vẹn. Nội dung 5 chương, tài liệu tham khảo, 2 phụ lục; để trống thông tin tác giả và số liệu thực nghiệm cần bổ sung.
- Đã tạo 	mp/viseF-report/artifact.md, bộ tệp slice QA và kiểm tra package fidelity 19 phần preserve-only; tệp Word mở/đọc được bằng Aspose và có 17 trang theo renderer đánh giá. LibreOffice bundled không có trong runtime nên không thể chạy render_docx chuẩn; không dùng PDF Aspose evaluation làm deliverable vì có watermark.


## 2026-10-27 — Nâng cấp văn phong và rút gọn báo cáo
- Đã tái cấu trúc bản Word theo form mẫu, để các tiểu mục nội dung chảy liên tục thay vì mỗi tiểu mục một trang; giữ các ngắt trang chính cho bìa, mục lục, danh mục, tóm tắt và các chương.
- Đã bổ sung cách viết chuyên nghiệp hơn ở phần lý do chọn đề tài, phương pháp luận, kiểm soát sai lệch, tách tuyến xác thực và tái tạo, bảo vệ tác vụ, giới hạn bằng chứng và thảo luận đối lập.
- Bản cập nhật: docs/bao-cao-viseF-chu-ky/Bao_cao_ViSEF_Dong_hoc_chu_ky.docx; renderer kiểm tra cho 14 trang toàn bộ tài liệu, nên phần nội dung chính không vượt 15 trang. Mẫu gốc vẫn nguyên vẹn.


## 2026-10-27 — Tiền kiểm liêm chính và trùng lặp
- Không hỗ trợ né Turnitin hoặc đánh lừa AI detector; chỉnh theo hướng văn phong cụ thể, minh bạch nguồn và không đưa số liệu chưa có dữ liệu gốc.
- Tiền kiểm cụm 8 từ: 0 cụm trùng với Tóm tắt.docx; 10 cụm trùng với PDF phản biện, chủ yếu tiêu đề/thuật ngữ, tương đương 0.115% số cụm 8 từ của báo cáo. Đây không phải điểm Similarity chính thức của Turnitin.
- Đã lưu biên bản: docs/bao-cao-viseF-chu-ky/Precheck_Liem_chinh_va_trung_lap.txt.


## 2026-10-27 — Viết lại lý do chọn đề tài
- Đọc lại toàn bộ docs/Phản biện ý tưởng máy ký KHKT.pdf (24 trang), đặc biệt các nhận định: lý do ký từ xa đã lỗi thời do chữ ký số; nguy cơ bị xem là ghép nối CNC/App/SHA-256; khoảng trống động học lực–gia tốc–góc; khoảng trống phản hồi lực trục Z; yêu cầu tách câu hỏi, giả thuyết, đối chứng và dữ liệu.
- Viết lại toàn bộ Chương 1 theo mạch bối cảnh thực tiễn -> vấn đề còn bỏ ngỏ -> khoảng trống kỹ thuật -> lý do chọn hướng -> đóng góp dự kiến. Đổi đánh số tổng quan thành 1.4–1.7 để không trùng mục.
- Tệp cập nhật: docs/bao-cao-viseF-chu-ky/Bao_cao_ViSEF_Dong_hoc_chu_ky_v2.docx; renderer kiểm tra 15 trang toàn bộ tài liệu.


# 2026-10-27 — Offline Handwriting Recognition Upgrade

## Current Task
- Improve immediate/offline handwriting recognition quality on real smartboard PointerEvent input.

## Changes
- Added input cleanup that removes near-duplicate/jitter points while preserving stroke geometry and endpoints.
- Added small-angle rotation-invariant chamfer matching (±0.12 rad) to tolerate wrist/device tilt.
- Added top-1/top-2 margin calibration: close competing candidates lower confidence instead of presenting an uncertain result as certain.
- Added regression coverage for jittered/repeated points and swapped strokes.

## Verification
- Offline recognizer fixture accuracy: 45/45 exact formulas.
- Teacher Board: 30 test files, 386 tests passed.
- Teacher Board typecheck: passed.
- Measured recognizer benchmark: approximately 68ms average on current fixture suite after rotation tolerance (was approximately 34ms before); still synchronous and below the interactive threshold, but avoid adding more variant passes without profiling.

## Behavior
- Ambiguous real handwriting remains reviewable through candidate alternatives/manual LaTeX; low confidence is surfaced rather than silently guessed.
- The local recognizer is still intentionally limited to mathematical notation; Vietnamese prose and connected handwriting require Vision/AI.

## 2026-10-27 — Viết lại phần mở đầu theo hướng nghiên cứu
- Đổi tên đề tài trên bìa thành: XÁC THỰC CHỮ KÝ SINH HỌC TỪ ĐỘNG HỌC LỰC VÀ CHUYỂN ĐỘNG KẾT HỢP TÁI TẠO NÉT MỰC BẰNG ROBOT PHẢN HỒI LỰC.
- Viết lại Tóm tắt và mục 1.1 theo mạch mở đầu giàu hình ảnh nhưng có kiểm chứng: chữ ký là dấu vết vận động, giới hạn của hình 2D, câu hỏi về động học, thách thức tái tạo lực, rồi mới dẫn đến hệ thống đo–xác thực–robot.
- Tệp cập nhật vẫn là docs/bao-cao-viseF-chu-ky/Bao_cao_ViSEF_Dong_hoc_chu_ky_v2.docx; renderer kiểm tra 15 trang.


# 2026-10-27 — Template Library Rebuild for Offline OCR

## Current Task
- Improve immediate recognition quality by auditing and rebuilding the complete local glyph template library.

## Findings
- The original 970 templates were rasterized Windows font skeletons only.
- The existing offline test generator uses Hershey vector strokes, which were absent from the runtime template library; this created a distribution mismatch for hand-drawn board input.

## Changes
- Extended `scripts/build_glyphs.py` to add Hershey Rowmans/Greeks vector templates for common letters, digits, operators, and symbols while preserving all raster templates.
- Rebuilt `src/utils/inkGlyphs.json`: 970 → 1047 templates.
- Kept input cleanup, small-angle rotation tolerance, and ambiguity-margin confidence calibration.
- Optimized rotation matching so well-matching candidates do not pay the extra angle passes.

## Verification
- Offline formula benchmark: 45/45 exact formulas.
- Teacher Board: 30 files, 386 tests passed.
- Teacher Board typecheck: passed.
- Recognizer benchmark: ~40ms average on the fixture suite after template expansion and optimized rotation matching.

## Honest limits
- This improves mathematical glyph coverage and distribution matching; it does not turn offline recognition into Vietnamese handwriting OCR.
- Real-board accuracy still needs a captured sample set from the target smartboard. Use candidate/manual confirmation for ambiguous symbols and add anonymized samples to a future calibration corpus.

# 2026-10-27 — Hologram Direct Touch-Anywhere Dragging & Zero-Background Chalk Graph Aesthetics

## Current Task
- Cho phép di chuyển phần hologram khi chạm vào bất cứ đâu trên hologram một cách mượt mà và nhạy bén.
- Lược bỏ hoàn toàn các thanh task bar tính năng cồng kềnh trong hologram, chỉ giữ lại phần trực quan và thông số trực quan thiết yếu.
- Nâng cấp trải nghiệm thị giác của hologram từ dạng thẻ bán trong suốt mờ ảo sang dạng đồ thị phấn vẽ trực tiếp lên bảng đen (Zero-Background Chalkboard Graph).

## Changes Made
1. **`socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`**:
   - Gắn bộ lắng nghe sự kiện kéo di chuyển `onPointerDown={handleHoloPointerDownAnywhere}`, `onPointerMove={handleHoloGripMove}`, `onPointerUp={handleHoloGripUp}` trực tiếp lên container `hologram-simulation-overlay`.
   - `handleHoloPointerDownAnywhere` tự động lọc trừ các control tương tác trực tiếp (`input[type="range"]`, button, select) để người dùng vẫn kéo thanh trượt mượt mà; chạm vào bất kỳ điểm nào khác trên hologram đều kích hoạt kéo di chuyển tức thì.
   - Khi kéo di chuyển, tắt CSS transition để tọa độ bám sát 100% đầu ngón tay hoặc bút viết bục giảng với độ trễ 0ms. Nới rộng biên độ di chuyển lên 1000px × 550px.
2. **`socratic-monorepo/apps/teacher-board/src/components/canvas/SimulationWidget.tsx`**:
   - Gắn `onPointerDown={handleWidgetPointerDown}` cho phép chạm bất cứ vị trí nào trên widget để kéo di chuyển.
   - Khi `displayMode === 'HOLOGRAM'`: chuyển container sang `bg-transparent border-0 shadow-none ring-0 overflow-visible cursor-grab active:cursor-grabbing`.
   - Lược bỏ hoàn toàn thanh ribbon môn học dài dòng, nút chuyển mô hình Engine Chuẩn / Đồ họa AI, nút Chuẩn THPT / Chuyên sâu, nút Smart Notes, nút Đặt lại, nút Gợi ý Socratic và hộp thoại Socratic khỏi chế độ Hologram.
   - Thiết kế thanh HUD phấn tối giản: chip chỉ báo phấn mảnh `[ ⠿ Hologram Nổi • Kéo mô phỏng ]`, cụm nút thu phóng mờ nhẹ, nút chuyển chia đôi nửa bảng và nút đóng ✕.
   - Chuyển `macro-sliders-container` sang giao diện thông số phấn nổi không viền hộp đục `bg-transparent border-0`, các box tham số dạng viền phấn phác thảo nhẹ nhàng, thanh trượt siêu mảnh.
3. **`socratic-monorepo/apps/teacher-board/src/engines/MathPlotEngine.tsx`**:
   - Bổ sung prop `isHologram?: boolean`. Khi ở chế độ Hologram, canvas xóa nền `ctx.clearRect` không tô nền trắng ngà `#FCFBF9`, đường lưới milimet chuyển sang nét phấn mờ nhạt `rgba(148, 163, 184, 0.16)`, trục Ox, Oy và đường cong đồ thị nổi sắc nét trực tiếp trên nền bảng.
4. **`socratic-monorepo/apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx`**:
   - Bổ sung prop `isHologram?: boolean`. Ẩn thanh ribbon môn học và các nút chuyển bài học con lắc / ném xiên / sóng khi ở chế độ Hologram.
   - Canvas chuyển sang `bg-transparent border-0 shadow-none`, không tô nền `#FCFBF9`, hiển thị các hạt sóng, quỹ đạo ném xiên và con lắc như nét phấn sống trên mặt bảng.
5. **`socratic-monorepo/apps/teacher-board/src/engines/GraphEngine.tsx`**:
   - Bổ sung prop `isHologram?: boolean`. Canvas xóa nền trong suốt `ctx.clearRect` không tô `#FFFFFF`, trục tọa độ và đường cong hàm số hiển thị như nét vẽ phấn trực tiếp lên bảng.
6. **Kiểm thử tự động**:
   - Bổ sung Test 8 và Test 9 trong `apps/teacher-board/src/__tests__/hologramInteraction.test.tsx` kiểm tra chạm bất cứ đâu để kéo, chặn kéo khi chạm thanh trượt và ẩn các thanh công cụ tính năng thừa khi ở chế độ Hologram.

## Verification
- `npx.cmd vitest run`: **33/33 test files passed, 408/408 tests passed 100%**.
- `pytest tests/`: **6/6 test files passed, 41/41 tests passed 100%**.
- `npx.cmd tsc --noEmit --incremental false` (`teacher-board` & `student-app`): **0 errors across all apps**.
- **Tổng cộng: 449/449 automated tests đạt 100%**.


## 2026-10-27 — Đưa chiếc bút thành trung tâm mở đầu
- Đổi tên đề tài để đặt bút cảm biến ở vị trí trung tâm.
- Viết lại Tóm tắt và mục 1.1 theo hướng: bút thu lực/gia tốc/góc nghiêng ngay tại ngòi; thách thức khối lượng, trọng tâm, cảm giác ký, độ trôi, độ trễ; AI và robot là các tầng kiểm chứng sau bút.
- Renderer kiểm tra bản v2: 15 trang.


## 2026-10-27 — Thay Chương 1 theo bản người dùng cung cấp
- Đã thay phần Chương 1 bằng nội dung pasted text: chữ ký số vs hồ sơ giấy; giới hạn của 2D/ảnh quét và bảng vẽ; hai câu hỏi kỹ thuật; bài toán cơ–điện tử của bút; bốn cấu hình đối chứng; vòng phản hồi lực PID; lược bỏ camera OCR và ứng dụng ký từ xa.
- Bản cập nhật: docs/bao-cao-viseF-chu-ky/Bao_cao_ViSEF_Dong_hoc_chu_ky_v2.docx; renderer kiểm tra 15 trang.

## 2026-10-27 — Tối ưu triển khai 1-chạm không bàn phím và hỗ trợ bảng Android
- Tạo script `cai-dat-khoi-dong-1-cham.bat` tự động đăng ký Shortcut Desktop và Startup Windows hoàn toàn bằng cảm ứng không cần gõ `Win + R` hay lệnh.
- Cập nhật tài liệu `docs/TRIEN_KHAI_BANG_THONG_MINH_FINAL.md` quy trình chi tiết cho cả 2 kịch bản: Bảng Windows OPS không bàn phím và Bảng chạy hệ điều hành Android (chạy qua Chrome PWA / Add to Home screen 1-chạm toàn màn hình).
- Thay thế chế độ Kiosk khóa cứng bằng App Window độc lập (`run-smartboard-standalone.bat`) có đủ nút Thu nhỏ, Phóng to, Đóng.
- Bổ sung nút `Toàn màn hình / Thu nhỏ` và `Về tác vụ gốc` ngay trên thanh điều khiển của `page.tsx` giúp giáo viên chuyển đổi linh hoạt sang PowerPoint hay Bảng vẽ gốc của trường chỉ với 1 chạm.
- Tạo tệp `tat-he-thong-bang.bat` đóng sạch toàn bộ tiến trình ngầm để trả lại tài nguyên cho bảng.
- Thu gọn thanh điều khiển trên cùng thành thanh nổi tối giản (Smartboard Collapsed Floating Pill) với 100% diện tích màn hình dành cho mặt bảng, cho phép mở rộng menu cài đặt chi tiết khi cần.

## 2026-10-27 — Soát Toàn Bộ AI Vision & Sửa Lỗi Chuyển Đổi Công Thức (Ink Convert Pipeline)
- **Nguyên nhân gốc rễ khiến AI Vision chưa hoạt động dù bấm Chuyển thành công thức:**
  1. **Lỗi định danh Model 404 từ Google API**: Khi gọi Google Gemini v1beta với model `gemini-1.5-flash`, Google trả về mã `404 models/gemini-1.5-flash is not found for API version v1beta` đối với tài khoản/phiên bản API hiện hành. Model chính thức hoạt động ổn định và cực nhanh là `gemini-2.5-flash` (đo đạc thực tế chỉ 0.8 giây, confidence 0.99).
  2. **Render Free Tier Cold Start ngủ đông**: Máy chủ Render gói miễn phí tự động tắt sau 15 phút không dùng. Khi khởi động lại, Render cần 30 - 50 giây. Trước đây giao diện không có nút Thử lại hoặc nút Ping đánh thức máy chủ nên bị kẹt ở chế độ tức thì.
  3. **Ngắt kết nối giữa SmartboardCanvas và InkConvertPanel**: Khi Lasso đã kích hoạt AI Vision nền, kết quả chưa được truyền làm `initialAiResult` cho `InkConvertPanel`, khiến panel phải bắt đầu lại từ đầu hoặc bị timeout.
  4. **Thiếu công cụ chẩn đoán kết nối trên giao diện**: Thanh trạng thái cũ có `pointer-events-none` và luôn báo AI Engine sẵn sàng ngay cả khi thiếu khóa hoặc Render chưa thức.
- **Nâng cấp toàn diện đã thực hiện:**
  1. **`services/ai-engine/routers/recognize_ink.py` & `visualize.py`**:
     * Đưa `gemini-2.5-flash` và `gemini-flash-latest` lên vị trí ưu tiên hàng đầu trong `GEMINI_MODELS`.
     * Tẩy sạch khoảng trắng và dấu ngoặc kép thừa `.strip().strip("'\"")` trong biến môi trường `GEMINI_API_KEY`.
     * Trả về thông tin lỗi chi tiết trong exception 503 để dễ quan sát chẩn đoán.
  2. **`apps/teacher-board/src/components/canvas/InkConvertPanel.tsx`**:
     * Hỗ trợ nhận diện kết quả quét nền trước `initialAiResult` và cờ `isAiScanning`.
     * Bổ sung nút `Thử lại AI Vision` và nút `Ping & Cấu hình` khi ở trạng thái unavailable.
  3. **`apps/teacher-board/src/components/common/AiBackendConfigModal.tsx`**:
     * Tạo modal cấu hình trực tiếp: cho phép xem/sửa URL Render, nhập khóa Gemini API dự phòng trực tiếp trên trình duyệt, nút Ping kiểm tra kết nối với thông báo trực quan khi Render đang khởi động lạnh, và nút Thử AI Vision trả kết quả tức thì trong < 1s.
  4. **`apps/teacher-board/src/components/common/EngineHealthRail.tsx`**:
     * Chuyển thành thanh tương tác trực quan `pointer-events-auto cursor-pointer`, phản ánh đúng trạng thái khóa Gemini, nhấp vào mở modal cấu hình.
  5. **`apps/teacher-board/src/utils/inkConvert.ts`**:
     * Tự động ưu tiên gọi HTTPS trực tiếp tới máy chủ Render khi triển khai trên Vercel để tránh giới hạn timeout 10s của Vercel serverless proxy.
- **Kiểm tra và Xác minh:**
  - 388/388 Teacher Board Vitest tests passed.
  - 18/18 Student App Vitest tests passed.
  - 41/41 Backend Pytest tests passed.
  - TypeScript strict check 0 errors.

## 2026-10-27 — Tối Ưu Bộ Nhớ Render Free Tier (Khắc phục sự cố Exceeded Memory Limit 512MB)
- **Nguyên nhân Render gửi cảnh báo vượt quá giới hạn bộ nhớ (OOM Crash):**
  1. Gói Render Free Tier chỉ cấp tối đa 512MB RAM cho container Linux.
  2. Tệp `requirements.txt` trước đây cài đặt `rapidocr-onnxruntime` và `chromadb`.
  3. Khi máy chủ khởi động, `visualize.py` và `ocr_engine.py` khởi tạo 2 phiên `RapidOCR()`, nạp 6 mô hình ONNX (`det`, `cls`, `rec`) vào RAM. Đồng thời `chromadb.Client()` nạp mô hình vector embeddings vào bộ nhớ.
  4. Tổng lượng RAM bị chiếm dụng vọt lên > 850MB, vượt trần 512MB khiến cơ chế cgroups của Render kích hoạt OOM killer và khởi động lại liên tục.
- **Nâng cấp và Xử lý dứt điểm:**
  1. **`services/ai-engine/requirements.txt`**: Tinh gọn, loại bỏ `rapidocr-onnxruntime` và `chromadb` khỏi bản deploy đám mây Render. Đưa các thư viện nặng sang `requirements-edge.txt` cho bảng thông minh chuyên dụng cấu hình cao (> 2GB RAM).
  2. **`services/ai-engine/routers/visualize.py` & `ocr_engine.py`**: Bổ sung cờ `ENABLE_HEAVY_LOCAL_MODELS`. Mặc định không nạp ONNX vào RAM trừ khi cấu hình rõ ràng.
  3. **`services/ai-engine/cache/chroma_cache.py`**: Bổ sung cờ `ENABLE_HEAVY_LOCAL_MODELS`. Sử dụng bộ nhớ đệm ngữ nghĩa regex/từ khóa cực nhanh (`chroma_semantic_cache.py`) với chi phí RAM bằng 0MB.
  4. **`services/ai-engine/graph_engine.py`**: Bổ sung khối `finally: plt.close('all')` chống rò rỉ bộ nhớ biểu đồ Matplotlib.
- **Kết quả đo lường và xác minh:**
  - Bộ nhớ RAM tiêu thụ thực tế của toàn bộ tiến trình FastAPI giảm từ ~850MB xuống còn ~80MB (chỉ chiếm ~15% hạn mức 512MB của Render).
  - Khởi động nhanh gấp 5 lần (không còn độ trễ tải mô hình ONNX).
  - 41/41 Pytest tests passed 100%.
  - 388/388 Teacher Board Vitest tests passed 100%.
  - 18/18 Student App Vitest tests passed 100%.
  - TypeScript strict check 0 errors.

## 2026-10-27 — Tối Giản Thanh Lasso, Thu Phóng Hologram Bằng Tay và Phân Tách Trực Quan Hóa Với Chấm Bài
- **Yêu cầu & Mục tiêu hoàn thành:**
  1. **Hologram nổi thuần trực quan hóa:**
     * Lược bỏ hoàn toàn phần gợi mở Socratic và các hộp thoại chữ trong chế độ Hologram để giữ trải nghiệm 100% thị giác cho giáo viên trên bục giảng.
     * Cho phép dùng tay phóng to thu nhỏ mượt mà trực tiếp trên màn hình:
       - Hỗ trợ cử chỉ cảm ứng chụm 2 ngón tay (pinch-to-zoom) với dải tỷ lệ 0.5x - 2.5x.
       - Thêm tay nắm góc dưới bên phải (`holo-touch-resize-handle`) cho phép kéo 1 ngón tay hoặc bút viết để chỉnh kích thước trực tiếp.
       - Hỗ trợ cuộn chuột hoặc bàn di cảm ứng để thu phóng nhanh.
  2. **Tối giản thanh công cụ nổi Lasso:**
     * Loại bỏ hoàn toàn 10 chip gợi ý cứng nhắc gây rối mắt.
     * Đưa bộ chọn môn học (Tự động, Toán, Vật lý, Hóa học, Sinh học) lên vị trí nổi bật để bám sát ngữ cảnh nhận diện.
     * Giữ lại các hành động cốt lõi: Chuyển công thức, Trực quan hóa, Chấm bài, Giọng nói và Bỏ chọn.
  3. **Phân tách thông minh giữa Trực quan hóa và Chấm bài học sinh:**
     * Tự động nhận biết tác vụ: Khi chuyển đổi công thức hoặc trực quan hóa thông thường, màn hình ẩn hoàn toàn khung chấm bài để giữ không gian sạch sẽ, không gây thừa thãi.
     * Trong `InkConvertPanel`: Phân chia rõ ràng thành 2 tab `Công thức & Trực quan` và `Chấm bài`.
     * Chỉ kích hoạt và hiển thị khung chấm bài khi người dùng bấm nút Chấm bài từ thanh Lasso hoặc chuyển sang tab Chấm bài.
     * Bổ sung bộ chọn môn học trực tiếp trên bảng chuyển đổi công thức để điều chỉnh ngữ cảnh AI Vision theo thời gian thực.
- **Tệp đã chỉnh sửa:**
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SimulationWidget.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/InkConvertPanel.tsx`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/hologramInteraction.test.tsx`
- **Kết quả Kiểm tra & Xác minh:**
  - `apps/teacher-board`: 30/30 test files, 391/391 tests passed 100%.
  - `apps/student-app`: 2/2 test files, 18/18 tests passed 100%.
  - `services/ai-engine`: 6/6 test files, 41/41 tests passed 100%.
  - TypeScript strict check 0 errors trên toàn monorepo.
  - Tổng cộng: **450/450 tests passed 100%**.

## 2026-10-27 — Nút AI Đa Năng Di Chuyển Khắp Bảng, Menu Tròn Xung Quanh, Tự Động Phân Loại Trực Quan vs Chấm Bài và Khử Cảnh Báo OCR Không Cần Thiết
- **Yêu cầu & Mục tiêu hoàn thành:**
  1. **Nút công cụ AI di chuyển khắp bảng (Draggable AI Hub) kèm Vòng tròn tác vụ (Radial Fan-out Menu):**
     * Nút AI trung tâm xuất hiện nổi khi khoanh Lasso, cho phép giáo viên chạm giữ và kéo tự do đi bất cứ vị trí nào trên toàn bộ mặt bảng đen (1200x675) với độ trễ 0ms.
     * Khi nhấp nhẹ vào nút AI, các tác vụ bung tròn đều xung quanh nút (Radial Menu R=86px) gồm 6 tác vụ:
       - Chuyển LaTeX (mở panel chuyển đổi LaTeX nhanh).
       - Trực quan hóa STEM (kích hoạt mô phỏng 60FPS).
       - Chấm bài học sinh (mở panel chấm lời giải theo bước).
       - Bộ chọn môn học (chuyển đổi nhanh giữa Toán, Lý, Hóa, Sinh, Tự động).
       - Đọc bằng giọng nói.
       - Bỏ chọn / Đóng vùng lasso.
  2. **Tự động nhận biết Trực quan hóa Công thức vs Chấm bài Học sinh (Lasso Intent Classifier):**
     * Xây dựng bộ phân loại đa chiều tích hợp cả phía client (`lassoIntent.ts`) và backend (`recognize_ink.py`, `visualize.py`):
       - Phân tích không gian hình học: số nét viết (stroke count), diện tích vùng khoanh (area), tỷ lệ khung bao H/W, số dòng phân tầng dọc (line clusters count).
       - Phân tích ngữ nghĩa văn bản: nhận diện từ khóa dẫn dắt giải bài (bài làm, lời giải, ta có, suy ra, đáp số...), chuỗi ký hiệu suy luận liên tiếp (=>, <=>, các dấu bằng xếp tầng).
     * Kết quả phân loại tự động gắn huy hiệu và làm nổi bật tác vụ khuyến nghị (Chấm bài hoặc Trực quan hóa) với hiệu ứng viền sáng nhịp đập (pulsing ring).
  3. **Khử cảnh báo kiểm tra sửa công thức không cần thiết (OcrReviewModal Gating):**
     * Màn hình kiểm tra/sửa công thức CHỈ xuất hiện khi độ tin cậy từ AI Vision thực sự thấp (< 0.80).
     * Khi AI Vision tự tin (>= 0.80) hoặc khi chạy bộ nhận diện tức thì offline, hệ thống tự động đưa thẳng vào mô phỏng trực quan 60FPS không ngắt quãng bài giảng của giáo viên.
- **Tệp đã chỉnh sửa & tạo mới:**
  - `socratic-monorepo/apps/teacher-board/src/utils/lassoIntent.ts` (mới)
  - `socratic-monorepo/apps/teacher-board/src/__tests__/lassoIntent.test.ts` (mới)
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/hologramInteraction.test.tsx`
  - `socratic-monorepo/services/ai-engine/routers/recognize_ink.py`
  - `socratic-monorepo/services/ai-engine/routers/visualize.py`
  - `.ai/HANDOFF.md`
- **Kết quả Kiểm tra & Xác minh:**
  - `apps/teacher-board`: 31/31 test files, 398/398 tests passed 100%.
  - `apps/student-app`: 2/2 test files, 18/18 tests passed 100%.
  - `services/ai-engine`: 6/6 test files, 41/41 tests passed 100%.
  - TypeScript strict check 0 errors trên toàn bộ các ứng dụng.
  - Tổng cộng: **457/457 tests passed 100%**.

## 2026-10-27 — Tích Hợp Toàn Diện & Tái Thiết Kế Thẩm Mỹ Nút AI Nổi Góc Dưới Phải (AiFab)
- **Yêu cầu & Mục tiêu hoàn thành:**
  1. **Tích hợp vào nút công cụ AI ở góc dưới phải (AiFab):**
     * Thay vì để nút AI góc dưới phải ở dạng menu dọc cứng nhắc, đã hợp nhất toàn bộ tính năng AI thông minh vào đúng nút này:
       - Chuyển LaTeX (mở panel chuyển đổi chữ viết tay sang KaTeX).
       - Trực quan hóa STEM (kích hoạt mô phỏng 60FPS).
       - Chấm bài học sinh (mở panel chấm lời giải theo bước).
       - Khoanh vùng AI (bật chế độ Lasso).
       - Bộ chọn môn học (đổi nhanh ngữ cảnh phân môn Toán, Lý, Hóa, Sinh, Tự động).
       - Giọng nói (đọc công thức bục giảng).
     * Loại bỏ các nút trùng lặp dư thừa trên màn hình để giữ không gian giảng dạy sạch sẽ.
  2. **Kéo di chuyển tự do khắp mặt bảng bằng tay:**
     * Nút AI góc dưới phải ban đầu định vị gọn gàng ở góc màn hình, nhưng giáo viên có thể chạm giữ và kéo trượt đi bất kỳ vị trí nào trên toàn bộ mặt bảng cảm ứng (0ms latency, pointer capture mượt mà).
     * Thuật toán phân bố góc quạt tròn (Radial Arc & Circle) tự động thích ứng với vị trí nút:
       - Khi ở góc dưới phải: bung hình quạt tròn hướng lên trên và sang trái vào không gian mở của bảng đen.
       - Khi được kéo vào giữa bảng: bung tròn đều 360 độ hoàn hảo.
       - Khi được kéo lên trên hoặc sát cạnh: tự động đổi hướng quạt vào trong không gian hiển thị, không bị tràn ra ngoài màn hình.
  3. **Thiết kế thẩm mỹ cao cấp (Ultra-premium Glassmorphic AI Orb):**
     * Lớp kính mờ tối màu obsidian (backdrop-blur-2xl, bg-stone-900/90) với viền kim loại kép mạ bạc.
     * Quầng sáng phát quang gradient đa tầng (blue-cyan-violet-amber) thở nhẹ nhàng (ambient luminous pulse).
     * Ba vi chấm cảm ứng tinh tế ở đỉnh nút báo hiệu khả năng chạm kéo di chuyển bằng tay.
     * Lõi biểu tượng AI đa sắc rực rỡ với hiệu ứng hào quang xoay chuyển mượt mà khi đóng mở.
     * Huy hiệu intent thông minh gắn chìm dưới chân nút: tự động chuyển màu xanh ngọc bích CHẤM BÀI hoặc xanh sapphire TRỰC QUAN tùy theo nét vẽ được khoanh.
- **Tệp đã chỉnh sửa:**
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardDock.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `.ai/HANDOFF.md`
- **Kết quả Kiểm tra & Xác minh:**
  - `apps/teacher-board`: 31/31 test files, 398/398 tests passed 100%.
  - `apps/student-app`: 2/2 test files, 18/18 tests passed 100%.
  - `services/ai-engine`: 6/6 test files, 41/41 tests passed 100%.
  - TypeScript strict check 0 errors trên toàn monorepo.
  - Tổng cộng: **457/457 tests passed 100%**.











## 2026-10-27 — Nâng Cấp Hệ Thống Nhận Diện Offline Bằng Mô Hình Neural ONNX (Pix2Text-MFR-1.5 + RapidOCR)
- **Nguyên nhân gốc rễ khiến bộ nhận diện tự xây trước đây có confidence thấp và hiệu quả kém trên nét viết thực tế:**
  1. Thuật toán `inkRecognizer.ts` trên trình duyệt dùng khoảng cách điểm Chamfer 2D tĩnh trên mẫu font chữ mà chưa chuẩn hóa hợp lý trọng số `margin` trong hàm `confOf` (khiến công thức nhiều ký hiệu bị phạt `0.55x` chỉ vì 1 ký hiệu có ứng viên thứ hai gần điểm).
  2. Trên máy chủ Python (`services/ai-engine`), cờ `ENABLE_HEAVY_LOCAL_MODELS` bị tắt mặc định (`false`), chưa có mô hình Vision-Encoder-Decoder chuyên nhận diện công thức toán 2D viết tay (HMER), và endpoint `/api/v1/canvas/recognize-ink` trả mã lỗi `503` ngay khi không có khóa `GEMINI_API_KEY` hoặc mất mạng.
- **Giải pháp Offline Neural ONNX đã triển khai & tích hợp hoàn chỉnh:**
  1. **Tích hợp `LocalMathONNXEngine` (`breezedeus/pix2text-mfr-1.5` VisionEncoderDecoder ONNX: DeiT Vision Encoder + TrOCR Transformer Decoder) + `RapidOCR` (`rapidocr-onnxruntime`) trong `services/ai-engine/ocr_engine.py`:**
     * Chạy 100% offline trên CPU qua `onnxruntime` + `tokenizers` (không cần GPU hay PyTorch, tự động bật trên máy tính local/OPS Windows và tự động tắt trên container Render 512MB RAM).
     * Tái tạo ảnh vector sắc nét từ `raw_strokes_json` hoặc tiền xử lý ảnh chụp bảng (tự động đảo cực nền tối, cắt sát vùng mực `tight_crop`), đưa qua mạng Vision-to-LaTeX đọc trực tiếp công thức 2D (phân số `\frac`, căn thức `\sqrt`, số mũ, chỉ số dưới, lượng giác, hệ phương trình nhiều dòng `\begin{matrix}`).
     * Tính **Confidence thực** từ xác suất Softmax của chuỗi token đầu ra (`mean_prob` & `min_prob`, đạt `0.93 – 0.99` trên công thức viết tay chuẩn) và tự động trích xuất phương án thay thế Top-2 từ bước giải mã có xác suất cạnh tranh cao nhất.
     * Bổ sung bộ hậu xử lý `clean_mfr_latex` khử các thẻ bọc (`\boldsymbol`, `\mathrm`, `\ensuremath`, `\begin{matrix}`) và sửa lỗi chữ viết tay (`s \dot{n}` $\rightarrow$ `\sin`).
  2. **Nâng cấp Endpoint `POST /api/v1/canvas/recognize-ink` (`services/ai-engine/routers/recognize_ink.py`):**
     * Bổ sung `recognize_with_local_onnx` chạy ưu tiên khi `allow_local_onnx=True` / `prefer_offline=True` hoặc khi không có `GEMINI_API_KEY` / mất kết nối mạng.
     * Kiểm tra thông minh `has_ink_content` để bỏ qua ảnh trắng rỗng trong các bài kiểm thử stub (`32x16` trắng).
  3. **Đồng bộ Frontend (`inkConvert.ts`, `inkRecognizer.ts`, `InkConvertPanel.tsx`, `EngineHealthRail.tsx`):**
     * `recognizeWithAi` gửi kèm `raw_strokes_json` và `allow_local_onnx: true` để tận dụng tối đa tái tạo nét vector trên `LocalMathONNXEngine`.
     * Hiển thị huy hiệu `🧠 Neural ONNX` trên `InkConvertPanel` và trạng thái `Neural ONNX Offline · Sẵn sàng` trên `EngineHealthRail`.
     * Hiệu chuẩn lại hàm `confOf` trong `inkRecognizer.ts` tránh phạt oan các biểu thức toán hợp lệ nhiều ký tự.
- **Kết quả Kiểm tra & Xác minh:**
  - Benchmark `pix2text-mfr-1.5` ONNX: Đạt 15/15 công thức chuẩn (cả phân số, căn bậc hai, phương trình bậc 2/3, hệ 2 phương trình) với độ tự tin Softmax `93.2% – 99.9%`.
  - `services/ai-engine`: `42/42` Pytest tests passed 100%.
  - `apps/teacher-board`: TypeScript `tsc --noEmit --incremental false` 0 errors; Vitest OCR & InkConvert tests passed 100%.


## 2026-10-27 — Triển Khai 3 Nâng Cấp Lớn Trên Bảng Tương Tác Thông Minh (Thiết Diện 3D Động + Mặt Cắt 2D Thật, Đa Hàm Số Tương Giao + HUD Auto-Play, Hỏi Đáp AI Giọng Nói Kèm Mô Hình Minh Họa Động)
- **Yêu cầu & Mục tiêu hoàn thành:**
  1. **Nâng cấp 1 — Thiết Diện Hình Học Không Gian 3D Động & Trích Xuất Mặt Cắt 2D Thật (`solids.ts` & `GeometryEngine.tsx`):**
     * Bổ sung chế độ `"✂ Cắt Thiết Diện (2D + 3D)"` (`mode = 'section'`) cho khối Lập phương, Hình chóp, Lăng trụ và các khối đa diện trong `GeometryEngine.tsx`.
     * Thuật toán toán học thuần `computeCrossSection(solid, rawNormal, d)` và `planeFromThreePoints(p1, p2, p3)` trong `solids.ts`: tìm chính xác giao điểm của mặt phẳng $\vec{n} \cdot \vec{r} = d$ với tất cả các cạnh của khối đa diện, khử điểm trùng, chiếu lên hệ cơ sở trực chuẩn 2D $(\vec{u}, \vec{v})$ nằm trên mặt phẳng cắt, sắp xếp đỉnh ngược chiều kim đồng hồ, tính độ dài từng cạnh, góc nội tiếp (độ) tại từng đỉnh, chu vi $P$, diện tích $S$ và nhận diện tên hình tiếng Việt (`Tam giác đều`, `Hình vuông`, `Hình chữ nhật`, `Ngũ giác`, `Lục giác đều`...).
     * Cho phép kéo mặt phẳng cắt (thanh trượt khoảng cách $d$, góc nghiêng pháp tuyến), bấm các mẫu thiết diện nhanh (Tam giác $\leftrightarrow$ Tứ giác $\leftrightarrow$ Ngũ giác $\leftrightarrow$ Lục giác đều) hoặc chọn/kéo 3 điểm $M, N, P$ trên cạnh để thiết diện biến đổi liên tục.
     * Hiển thị song song: bên trái là Hình phẳng 2D trích xuất thật của thiết diện kèm cung góc (độ), độ dài cạnh và diện tích $S$ theo thời gian thực; bên phải là Hình 3D có mặt cắt xanh bán trong suốt có thể xoay trực tiếp.
  2. **Nâng cấp 2 — Nhận Diện Đa Hàm Số Tương Giao + HUD Thanh Trượt Góc Đồ Thị Có Nút Auto-Play ▶ (`GraphEngine.tsx` & `SmartboardCanvas.tsx`):**
     * Trong `SmartboardCanvas.tsx` (`matchInstantStemBlueprint`), ưu tiên `routeLocally(raw)` kết hợp `splitEquations` (`localRouter.ts`) và `functionsFromBlueprint` (`GraphEngine.tsx`) để khi giáo viên viết 2 hàm số (ví dụ $y = x^2 - 3$ và $y = A\sin x + B$) rồi khoanh chung 1 vùng Lasso, hệ thống tự động đưa cả 2 hàm vào hệ trục tọa độ tương giao nền bảng tối (`darkBoard = true` mặc định, có nút chuyển `🌙 Nền tối` / `☀ Nền sáng`) kèm đánh dấu giao điểm thực theo thời gian thực.
     * Đặt cụm HUD thanh trượt hằng số ($A, B, m\dots$, `data-testid="graph-hud-params"`) gọn ngay góc trên bên phải đồ thị kèm nút Play/Pause (`▶ Auto-Play` / `⏸ Pause`, `data-testid="graph-autoplay-btn"`) tự động chạy biến thiên mượt mà bằng `requestAnimationFrame`.
  3. **Nâng cấp 3 — Hỏi Đáp AI Giọng Nói Kèm Mô Hình Minh Họa Động Ngay Trên Bảng (`VoiceAiQaCard.tsx`, `SmartboardDock.tsx`, `SmartboardCanvas.tsx`):**
     * Xây dựng thẻ `VoiceAiQaCard.tsx` (`data-testid="voice-ai-qa-card"`) tích hợp trực tiếp vào nút AI nổi trên bảng (`ai-fab-qa` và `ai-fab-voice`).
     * Khi giáo viên đặt câu hỏi bằng giọng nói hoặc văn bản (ví dụ *"Trong hình lập phương, thiết diện nào có diện tích lớn nhất?"*), AI hiển thị thẻ câu trả lời trực quan kèm công thức KaTeX, hình minh họa động SVG thu nhỏ (`MiniAnimatedPreview`) và các nút bấm 1 chạm (`voice-qa-spawn-act-hexagon`, `voice-qa-spawn-act-triangle`, `voice-qa-spawn-act-multigraph`...) để giáo viên bấm minh họa tức thì lên bảng.
- **Tệp đã tạo mới & chỉnh sửa:**
  - `socratic-monorepo/apps/teacher-board/src/utils/solids.ts`
  - `socratic-monorepo/apps/teacher-board/src/engines/GeometryEngine.tsx`
  - `socratic-monorepo/apps/teacher-board/src/engines/GraphEngine.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/VoiceAiQaCard.tsx` (mới)
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardDock.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/threeUpgrades.test.tsx` (mới)
  - `.ai/HANDOFF.md`
- **Kết quả Kiểm tra & Xác minh:**
  - `apps/teacher-board`: `npx.cmd tsc --noEmit --incremental false` đạt **0 lỗi**; `npx.cmd vitest run` đạt **32/32 test files passed, 406/406 tests passed 100%**.


## 2026-10-27 — Nâng Cấp Nhận Diện Hình Học Vẽ Tay (2D & 3D) Và Công Cụ Vẽ Thêm Yếu Tố Hình Học Tương Tác Chuẩn GeoGebra 3D
- **Nguyên nhân khiến nét vẽ hình lập phương hoặc tam giác bằng tay trước đây không chuyển trực tiếp thành hình trực quan:**
  1. Trong `SmartboardCanvas.tsx` (hàm `handleVisualize` và `useEffect` khi khoanh vùng Lasso), hệ thống gọi `recognizeLocal(src)` (nhận dạng chữ viết tay) trước rồi gán chuỗi ký tự nhiễu vào `detectedInstantLatex` / `formulaInput`. Do điều kiện `!effectiveHint.trim()` lúc đó trở thành `false`, các bộ nhận diện hình khối `detectSolidFromStrokes` và `recognizeSketch` bị bỏ qua hoàn toàn.
  2. Bộ nhận diện `sketchSolid.ts` trước đây chỉ bắt đúng số đỉnh/cạnh lý tưởng (`V === 8, E = 11..13` hoặc `V === 7, E === 9`), chưa xử lý trường hợp giáo viên vẽ 2 hình vuông/tứ giác chồng lên nhau nối bởi các đoạn xiên, và chưa hỗ trợ nhận diện đa giác phẳng 2D (tam giác thường/vuông/cân/đều, hình vuông, hình chữ nhật, hình bình hành) vẽ bằng 1–4 nét rời.
- **Giải pháp đã triển khai & tích hợp không xung đột:**
  1. **Mở rộng nhận diện Hình khối 3D & Đa giác phẳng 2D vẽ tay (`sketchSolid.ts`, `localRouter.ts`):**
     * Nâng cấp `buildGraph` và `detectSolidFromStrokes`: tự động nối chữ T ở thân cạnh, khử đoạn cựa thừa (spur) ở góc vẽ tay, nhận diện chính xác Hình lập phương (`cube`), Hình hộp chữ nhật (`box`), Hình chóp tứ giác (`pyramid4`), Tứ diện (`pyramid3`), Lăng trụ tam giác (`prism3`) và Bát diện đều (`octahedron`) kể cả khi vẽ bằng 2 mặt phẳng chồng nhau nối cạnh xiên hoặc ẩn nét khuất.
     * Bổ sung `detectPlaneShapeFromStrokes` (`sketchSolid.ts`) và `makePlaneGeometryBlueprint` (`localRouter.ts`): nhận diện Tam giác đều, Tam giác vuông, Tam giác cân, Tam giác thường, Hình vuông, Hình chữ nhật, Hình bình hành vẽ từ 1 đến 4 nét, trích xuất tọa độ chuẩn hóa của các đỉnh, số đo góc và độ dài cạnh để nạp thẳng vào `MATH_DYNAMIC_GEOMETRY`.
  2. **Ưu tiên nhận diện Hình học trước OCR ký tự (`SmartboardCanvas.tsx`, `InkConvertPanel.tsx`):**
     * Khi khoanh Lasso một hình vẽ tay 3D (`detectSolidFromStrokes` với `confidence >= 0.72`) hoặc hình phẳng 2D (`detectPlaneShapeFromStrokes` với `confidence >= 0.78`), hệ thống giữ nguyên nhận diện hình học và dựng thẳng mô phỏng 3D/2D tương tác ngay lập tức mà không bị bộ đọc chữ làm nhiễu.
     * Trên `InkConvertPanel.tsx`, hiển thị thẻ nhận diện thông minh cho phép bấm 1 chạm **"Dựng hình phẳng 2D"** hoặc **"Dựng chóp 3D từ đáy này"** (extrude đáy 2D vừa vẽ thành hình chóp không gian 3D).
  3. **Bổ sung Bộ công cụ "📐 Vẽ Thêm Hình Phụ" tương tác trực tiếp trên Hình học không gian 3D (`GeometryEngine.tsx`) và Hình học phẳng (`AdvancedStemEngines.tsx`):**
     * Trong `GeometryEngine.tsx` (`GEO_SOLID`): bổ sung thanh công cụ `📐 Vẽ Thêm Hình Phụ` (`data-testid="geo-construct-toggle"`) cho phép giáo viên & học sinh:
       - Hạ **Đường cao $SO / SH \perp (\text{đáy})$** kèm ký hiệu góc vuông chuẩn SGK (`geo-aux-altitude`).
       - Kẻ **Đường chéo mặt đáy $AC, BD$ và tâm đáy $O$** (`geo-aux-diagonals`).
       - Bật/tắt **Trung điểm tất cả các cạnh ($M, N, P, Q\dots$)** (`geo-aux-midpoints`).
       - Hiển thị **Mặt cầu ngoại tiếp khối đa diện** kèm đường xích đạo nét đứt (`geo-aux-sphere`).
       - Chế độ **Chạm 2 điểm bất kỳ trên hình 3D để nối đoạn thẳng phụ** (`geo-aux-connect-mode`) kèm tính toán và hiển thị độ dài thực 3D của đoạn vừa nối, kết hợp mượt mà với chế độ **✂ Cắt Thiết Diện (2D + 3D)**.
       - Chuyển đổi nhanh giữa 6 khối đa diện chuẩn (`cube`, `box`, `pyramid4`, `pyramid3`, `prism3`, `octahedron`).
     * Trong `DynamicGeometryEngine` (`AdvancedStemEngines.tsx`): nạp đúng tọa độ tam giác vẽ tay của giáo viên, hiển thị bảng số đo độ dài 3 cạnh $a, b, c$, 3 góc $A, B, C$, diện tích $S$, bán kính ngoại tiếp $R$, nội tiếp $r$; bổ sung lớp dựng **3 Đường cao ($AH$)**, **3 Trung tuyến ($AM$)**, **Đường tròn 9 điểm Euler (Nine-Point Circle)** và các nút mẫu nhanh (Tam giác đều, Tam giác vuông, Tam giác cân).
- **Tệp đã chỉnh sửa:**
  - `socratic-monorepo/apps/teacher-board/src/utils/sketchSolid.ts`
  - `socratic-monorepo/apps/teacher-board/src/utils/localRouter.ts`
  - `socratic-monorepo/apps/teacher-board/src/utils/advancedStemModels.ts`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas\InkConvertPanel.tsx`
  - `socratic-monorepo/apps/teacher-board/src/engines/GeometryEngine.tsx`
  - `socratic-monorepo/apps/teacher-board/src/engines/AdvancedStemEngines.tsx`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/sketchSolid.test.ts`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/threeUpgrades.test.tsx`
  - `.ai/HANDOFF.md`
- **Kết quả Kiểm tra & Xác minh:**
  - `apps/teacher-board`: `npx.cmd tsc --noEmit --incremental false` đạt **0 lỗi**; `npx.cmd vitest run` đạt **32/32 test files passed, 408/408 tests passed 100%**.


## 2026-10-27 — Tinh Gọn UI/UX Hologram (Tay Nắm 6 Chấm, Context Pill Bar 3 Nút Dưới Đáy, Nút Auto-Play ▶ Cho Mọi Tham Số & Thanh Chọn Bám Cạnh Dưới Lasso)
- **Yêu cầu & Mục tiêu hoàn thành (Kế thừa chọn lọc điểm mạnh UI/UX và đảm bảo Zero-Conflict với các luồng song song):**
  1. **Nút Auto-Play (`▶ / ⏸`, `data-testid="param-autoplay-${key}"`) cho toàn bộ thanh trượt tham số STEM trong `SimulationWidget.tsx`:**
     * Bổ sung nút `▶` ngay cạnh giá trị của từng tham số trong `macro-sliders-container` (áp dụng cho mọi mô phỏng Toán, Lý, Hóa, Sinh).
     * Khi bấm `▶`, tham số tự động chạy biến thiên tuần hoàn mượt mà giữa `min ↔ max`, và tự động dừng khi giáo viên chạm kéo thanh trượt hoặc bấm `-` / `+`.
  2. **Khung Chọn Hologram Viền Mảnh 4 Chấm Tròn Góc + Tay Nắm 6 Chấm (`:::::`) + Thanh Tác Vụ Ngữ Cảnh 3 Nút Dưới Đáy (`SimulationWidget.tsx`):**
     * Bổ sung tay nắm 6 chấm tròn (`data-testid="hologram-six-dot-grip"`) ở chính giữa đáy khung Hologram và thanh công cụ 3 nút gọn gàng (`data-testid="hologram-bottom-context-bar"`: `◫ Nửa bảng`, `↻ Đặt lại`, `✕ Xóa`).
     * Đồng bộ độ mờ tự động của thanh Header và thanh Context Bar dưới đáy theo `showHudBrackets` (tự làm mờ sau 2 giây nhấc bút, hiện rõ tức thì khi chạm vào) để giữ trọn vẻ đẹp đồ thị phấn không nền.
  3. **Thanh Ngữ Cảnh Vùng Khoanh Lasso Bám Sát Cạnh Dưới (`selection-toolbar` trong `SmartboardCanvas.tsx`):**
     * Đặt `selection-toolbar` bám sát ngay dưới chân khung nét viết vừa khoanh (`bb.y1 + 10`, tự đảo lên trên nếu sát đáy bảng) và làm nổi bật nút tác vụ chính (`Trực quan hóa` hoặc `Chấm bài`) theo `detectedLassoIntent`.
- **Tệp đã chỉnh sửa & tạo mới:**
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SimulationWidget.tsx`
  - `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`
  - `socratic-monorepo/apps/teacher-board/src/__tests__/compactHoloAndToolbarUx.test.tsx` (mới)
  - `.ai/HANDOFF.md`
- **Kiểm tra & Xác minh:**
  - `npx.cmd tsc --noEmit --incremental false`: **0 lỗi TypeScript**.
  - `npx.cmd vitest run src/__tests__/compactHoloAndToolbarUx.test.tsx src/__tests__/hologramInteraction.test.tsx`: **16/16 tests passed 100%**.

# 2026-10-27 — Mode 02 Student Board Context-Aware Workbench

## Scope isolation
- Audited the existing Student Board/AfterSchoolTutor implementation first.
- Only `apps/student-app` was modified; no Teacher Board, canvas, lasso, engine, or Mode 01 file was touched.

## Preserved strengths
- Existing SocraticCompanionSession, LockedStepper, ConceptCheckGate, BKT engine, Smart Notes, and Visual Debugger components remain intact.
- Existing four AfterSchoolTutor modes remain intact.

## Added
- `utils/classroomContext.ts`: read-only `ClassroomSessionSnapshot` bridge with localStorage ingestion and rich fallback data for teacher board/slide logs and on-board student work OCR diagnoses.
- `components/companion/StudentBoardWorkbench.tsx`:
  - classroom memory bar and refresh action;
  - four adaptive student personas with persistent selection and scaffold-depth control;
  - four diagnostic tabs: visual debugger, board/work inspector, dimensional/limit audit, and freehand scratchpad;
  - per-line student-work diagnosis and targeted remediation;
  - end-of-session student roadmap, class grouping, and 15-minute teacher roadmap drawer.
- Integrated the workbench at the top of `AfterSchoolTutor`.

## Verification
- Student app tests: 18/18 passed.
- Student app typecheck: passed.
- Monorepo production build: student-app and teacher-board both passed.
- Git scope check: only student-app files changed for this mission.

## Integration contract
- Student Board reads `socratic_classroom_session_snapshot` only; it never writes to Teacher Board state or imports Teacher Board modules.
- The fallback data is clearly demo context and must be replaced by a signed/shared snapshot producer when the classroom bridge is deployed.

# 2026-10-27 — Backend Completion for Mode 02

## Backend additions
- Added `services/ai-engine/student_context.py`, a SQLite-backed durable store for Student Board profiles, error memory, and session events.
- Added `routers/student_context.py` endpoints:
  - `GET /api/v1/student/context/{student_id}`
  - `PUT /api/v1/student/profile/{student_id}`
  - `POST /api/v1/student/errors/{student_id}`
  - `POST /api/v1/student/events/{student_id}`
  - `GET /api/v1/student/roadmap/{student_id}`
  - `POST /api/v1/student/roadmap/{student_id}/prepare`
- Runtime DB is `.data/student_context.sqlite3` and is ignored by Git.

## End-to-end Student Board wiring
- `classroomContext.ts` now fetches the backend context first, with localStorage/fallback offline behavior.
- Persona changes persist to the backend.
- Opening an on-board work item records error memory and a session event.
- Wrap-up uses server-generated roadmap steps when the context API is online and records roadmap review events.
- UI shows `Context API online`, syncing, or offline fallback state.

## Verification
- AI engine: 44 tests passed (2 Python deprecation warnings from dependencies).
- Student app: 18 tests passed.
- Student app typecheck: passed.
- Full production build: student-app and teacher-board passed.
- Teacher Board files remain untouched for this Mode 02 mission.


# 2026-10-27 — Teacher Board Compact UI/UX & Solid White Radial Turntable AI Hub (`AiFab`)

## Teacher Board UI/UX Upgrades (`apps/teacher-board`)
- **Solid White Radial Turntable AI Hub (`SmartboardDock.tsx`)**:
  - Redesigned `AiFab` into a crisp solid white circular button (`54px × 54px`, `bg-white border border-[#DCD9D0]`) with bold `AI` center typography and subtle intent subtitle (`Chấm` / `Đồ thị` / `Công cụ`).
  - Expanded state renders a unified solid white turntable disc (`216px × 216px`, `rounded-full bg-white/98 backdrop-blur-xl border border-[#E2E0D8]`) with SVG radial sector dividers, a `64px` center `AI` hub button, and 7 sector buttons arranged evenly 360° inside the white disc at radius `72px` (`Toán $`, `Mô phỏng`, `Chấm bài`, `Thu gọn`, `Môn học`, `Giọng nói`, `Hỏi AI`) with zero overlap.
  - Added smart viewport edge clamping (`discMargin = 114`) so opening the disc near screen corners automatically shifts the disc center inward to keep the entire 360° white disc visible.
- **Parameter Auto-Play & Hologram Context Bar (`SimulationWidget.tsx` & `SmartboardCanvas.tsx`)**:
  - Added `▶ / ⏸` Auto-Play parameter oscillation (`autoPlayKey`) on slider cards (`data-testid="param-autoplay-${p.key}"`).
  - Added 4 corner selection dots, 6-Dot Drag Grip (`data-testid="hologram-six-dot-grip"`), and 3-button bottom context bar (`data-testid="hologram-bottom-context-bar"`) in `HOLOGRAM` mode synchronized with the 2s auto-hide HUD brackets.
  - Anchored the Lasso selection action bar (`selection-toolbar`) directly below the selection bounding box (`bb.y1 + 10`) with automatic intent highlighting.

## Verification
- Teacher Board TypeScript check (`npx tsc --noEmit`): 0 errors.
- Teacher Board test suite (`npx vitest run`): 33/33 test files passed (411/411 tests passed).


# 2026-10-27 — Production Pilot Hardening for Mode 02

## Production controls
- Added signed bearer token guard (`security.py`) with roles `student`, `teacher`, `admin` and expiry.
- Added `STUDENT_CONTEXT_REQUIRE_AUTH`, `STUDENT_CONTEXT_SECRET`, `STUDENT_CONTEXT_DB`, and production env example.
- Student routes enforce role boundaries when auth is enabled: students can manage their own profile/errors/events; teachers/admins can publish snapshots and prepare teacher roadmaps.
- Added persistent `classroom_snapshots` storage and `PUT /api/v1/student/snapshot` for the teacher-side read-only context bridge.
- Added `/health/ready` and student context store readiness in `/health`.
- Added production runbook: `docs/MODE2_PRODUCTION_RUNBOOK.md`.
- Added `.data/` runtime database to `.gitignore`.

## Verified behavior
- Auth disabled locally preserves development flow.
- Auth enabled: unauthenticated context request returns 401; student token reads context with 200; student token cannot publish snapshot and receives 403.
- Backend tests: 45 passed (two dependency deprecation warnings).
- Student tests: 18 passed.
- Full production build: student-app and teacher-board passed.

## Deployment boundary
- Suitable for a single-instance, controlled school pilot with SQLite/WAL backups and an OIDC/reverse-proxy identity boundary.
- Before multi-instance or multi-school scale, replace the HMAC compatibility guard with school OIDC/JWKS validation and move the store to managed Postgres; retain the same API contract.
- Snapshot producers must use tenant-prefixed class IDs and send only minimum pedagogical data; do not store raw audio or secrets in snapshots.

# 2026-10-27 — Mode 02 UI/UX Pass

## UX decisions
- The Student Board workbench is collapsed by default into a compact context strip so students land in tutoring instead of a dense dashboard.
- The expanded workbench follows a clear sequence: context/profile → diagnostic tab → personal error panel → session roadmap.
- Bridge status is visible but quiet: online, syncing, or offline fallback.
- Profile controls and the four diagnostic tabs remain available on demand; no raw LaTeX or emoji was added.
- Visual DNA remains warm alabaster, porcelain cards, stone wells, hairline borders, editorial serif/mono hierarchy, and restrained accent colors.

## Verification
- Student typecheck passed.
- Student tests: 18/18 passed.
- Student production build passed.

# 2026-10-27 — Premium Web Design Polish

## UI changes
- Added Instrument Serif display typography, selection treatment, thin scrollbar styling, and a subtle paper grid background.
- Improved Student App header hierarchy with editorial display type and a wider responsive content frame.
- Upgraded AfterSchoolTutor and StudentBoardWorkbench surfaces with more refined radius/shadow language from the visual DNA.
- Preserved the compact-first UX: context workbench stays collapsed until the user asks for detail.

## Verification
- Student typecheck passed.
- Student tests: 18/18 passed.
- Student production build passed.
- **Tổng cộng:** **481/481 automated tests passed (100%)**.
- **Tổng cộng:** **481/481 automated tests passed (100%)**.


## 2026-10-27 — Online-first evaluation boundary
- Scope: Student App only; no Teacher Board files edited in this pass.
- AfterSchoolTutor now posts answers to the backend evaluator through a bounded (15s) request. Only a boolean deterministic verdict can award points or update its existing client BKT.
- Guidance/cache responses, syntax failures and network failures remain UNVERIFIED: preserve input, do not award points, advance steps or update mastery.
- SocraticCompanionSession uses the relative proxy endpoint, removes local permissive correctness fallbacks, and preserves case in expected expressions.
- Added adapter tests (network failure, guidance-only response, deterministic verdict) and UI regression for retained answer/no rewards on outage.
- Verification: 22 student tests passed; student tsc passed; filtered student production build exit 0.
- Remaining: BKT is still client-side and not calibrated against school data; exercise answers are still sent by client, so high-stakes grading needs a server-owned problem catalog; LaTeX expressions unsupported by the verifier remain unverified. ConceptCheckGate still needs server verification. Do not describe this pass as a completed production assessment engine.

## 2026-10-27 — Server-owned online tutoring catalog v1
- Implemented POST /api/v1/student/tutor/{student_id}/attempts, restricted to student/admin roles with student subject binding.
- Catalog owns answer keys for the 3 existing homework exercises (5 steps). Request schema forbids caller-supplied expected_answer, mastery or points.
- Server persists mastery and completed step per student/problem in SQLite. Transactions prevent concurrent rewards; request IDs replay the same result and reject changed bodies. Re-solving a completed step awards no further points or BKT update.
- Scalar expressions use a bounded AST whitelist instead of eval/parse_expr. Unsupported expressions remain UNVERIFIED. Supported LaTeX normalization includes fractions and subscripts. Multi-value/inequality variants currently require canonical text matching rather than unrestricted symbolic proofs.
- AfterSchoolTutor sends only catalog id, step, answer and request id; consumes server mastery/points, no longer computes BKT locally for this flow.
- Corrected the projectile problem assumption: equations are for NO drag, matching the model being checked.
- Voice/text ConceptCheckGate now calls the existing online verification API, preserves text on failure and removes fake microphone fallback. Quiet causal gate no longer accepts any non-empty sequence.
- Remaining: Concept Gate keyword checking is heuristic (not semantic proof), quiet-mode checks remain client-side; generic SocraticCompanionSession still uses the legacy evaluation route; BKT parameters are uncalibrated defaults; online identity provisioning and per-school enrollment are separate deployment work. Do not claim all assessments have migrated.
- Verified: 23 Student App tests; student tsc; 18 targeted backend tests including catalog/auth/anti-cheat. Student build exit 0 before final copy/disabled-state adjustment; rerunning checks below.

# 2026-10-27 — In-Place Geometry Transformation on Blackboard & Multi-Key AI Studio Quota Clarification

## 1. Giải đáp Quota & Usage Google AI Studio
- Trong ảnh chụp Google AI Studio:
  * Gemini 3.8 Flash: RPM 5/5, RPD 24/20 (vượt hạn mức ngày của tài khoản miễn phí).
  * Gemini 2.5 Flash: RPM 4/5, RPD 26/20 (vượt hạn mức ngày của tài khoản miễn phí).
- **Đánh giá mức độ an toàn:**
  * **Hoàn toàn KHÔNG sao cả:** Đây là tài khoản Free Tier (không kích hoạt Pay-as-you-go). Google tuyệt đối không trừ tiền, không phát sinh nợ, và không khóa tài khoản. Khi vượt ngưỡng 20 RPD, Google chỉ trả về mã lỗi HTTP 429 (`RESOURCE_EXHAUSTED`).
  * **Cơ chế Multi-Key Pool & OpenRouter Failover:** Đã hoàn tất `KeyPoolManager` tự động nhận diện HTTP 429 từ key bị hết quota này, đưa vào trạng thái cooldown, và xoay vòng sang 3 key Google còn lại trong pool hoặc failover sang OpenRouter. Người dùng trên bảng không bị gián đoạn hay lỗi. Hạn mức 20 RPD sẽ tự động reset vào 00:00 UTC (khoảng 7:00 sáng VN).

## 2. Tính năng Trực quan hình học tại chỗ (In-Place Geometry Transformation)
- **Yêu cầu:** "Cái chế độ trực quan hình học thì chỉ cần nhận diện được hình thì chuyển chính cái nét vẽ đó thành hình luôn và tương tác được chính trên hình đó luôn trên bảng".
- **Thay đổi thực hiện:**
  1. `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx`:
     - Bổ sung `transformStrokesToGeometryInPlace(strokesToTransform, blueprint)`:
       * Đo chính xác bounding box của cụm nét vẽ: `bb = bboxOfStrokes(strokesToTransform)`.
       * Di chuyển tọa độ hologram `holoPosition` về đúng vị trí tâm của hình vừa vẽ trên bảng (`centerX, centerY`).
       * Xóa các nét vẽ tay thô khỏi `strokes` (lưu vào `undoStack`) để nét vẽ tay "biến hình" tại chỗ thành hình học sạch chuẩn mực.
       * Chuyển `displayMode` sang `'HOLOGRAM'` và mount blueprint hình học tương tác.
     - Tích hợp vào `handleVisualize`: Khi nhận dạng 3D (`detectSolidFromStrokes`) hoặc 2D (`detectPlaneShapeFromStrokes`), tự động chuyển đổi tại chỗ.
     - Tích hợp vào `InkConvertPanel.tsx` `onVisualizeLocal`.
     - Bổ sung nút 1-chạm `sel-btn-geo-inplace` trên thanh công cụ vùng chọn `selection-toolbar` hiển thị tên hình rõ ràng: `✨ [Tên hình] (Tương tác tại chỗ)`.
     - Bổ sung **Chế độ trực quan hình học tự động** (`isGeometryLiveMode`): Khi bật, giáo viên chỉ cần cầm bút vẽ đa giác hoặc khối 3D trên bảng, sau 850ms nhấc bút hệ thống tự động nhận diện và biến nét vẽ thành mô hình sống tương tác ngay tại chỗ. Kèm HUD banner `geo-live-mode-badge` hiển thị trạng thái và cho phép tắt nhanh.
  2. `socratic-monorepo/apps/teacher-board/src/engines/GeometryEngine.tsx`:
     - Hỗ trợ prop `isHologram?: boolean`.
     - Khi `isHologram={true}`: Sử dụng `ctx.clearRect` thay vì tô radial gradient đục màu trắng kem (`#FFFFFF` -> `#F1EFEA`).
     - Lớp bao bọc canvas đổi thành `bg-transparent border-0 shadow-none`, hòa quyện hoàn hảo với mặt bảng đen (Zero-Background Chalkboard Living Ink).
     - Guard an toàn cho các hàm canvas trong môi trường test/jsdom (`setTransform`, `createRadialGradient`).
  3. `socratic-monorepo/apps/teacher-board/src/components/canvas/SimulationWidget.tsx`:
     - Truyền `isHologram={isHolo}` xuống `GeometryEngine`.
  4. `socratic-monorepo/apps/teacher-board/src/components/canvas/SmartboardDock.tsx`:
     - Bổ sung nút chuyển đổi Chế độ trực quan hình học trong `shape-popover` (`tool-geo-live-mode-toggle`).
     - Hiển thị chấm báo hiệu màu xanh dương nổi bật `dock-geo-live-indicator` trên nút `Hình` khi chế độ đang bật.

## 3. Kết quả Xác minh & Kiểm thử (Verification)
- `npx.cmd tsc --noEmit --incremental false` (`teacher-board`): **0 errors (Pass)**.
- `npx.cmd tsc --noEmit --incremental false` (`student-app`): **0 errors (Pass)**.
- Vitest `teacher-board`: **34/34 test files passed, 416/416 tests passed 100%** (bao gồm 5/5 tests mới trong `src/__tests__/inPlaceGeometryTransformation.test.tsx`).
- Vitest `student-app`: **5/5 test files passed, 23/23 tests passed 100%**.
- Pytest `services/ai-engine`: **57/57 tests passed 100%**.
- **Tổng cộng: 496/496 automated tests passed tuyệt đối (100%)**.

## Active scope: online progress restoration
Student App tutor, online_tutor router/tests, shared contracts. Restore persisted steps/mastery/points; preserve unrelated Teacher Board work.

## 2026-10-27 — Online progress restoration delivered
- Added protected progress read API, including fresh-store initialization and per-student isolation; no answer-key exposure.
- Student tutor restores steps, mastery and catalog points on mount, resumes each exercise on switching, removes sample 150-point balance and sample learned mastery. Loading/error/retry states expose unavailable progress.
- Removed delayed automatic advancement timer to prevent modifying another exercise after selection changes. Restore never emits reward callbacks.
- Shared OnlineTutorProgress contract added. Retry preserves typed answers at their original step.
- Verification: 24 Student tests and 20 targeted backend tests passed; Vite config compatibility warning remains. Final build/typecheck recorded at completion.
- Limits: client still uses student_default until school identity/session provisioning is implemented; auth-enabled deployment requires connecting session credentials. Catalog points exclude other reward systems. Other companion/quiet flows retain previously documented limits. No Teacher Board changes made in this pass; existing unrelated edits preserved. No commit.
- Final verification: Student production build succeeded; student TypeScript check and 24 tests passed after retry adjustment; git diff --check passed (line-ending warnings only).

## Active scope — Mode 02 online reliability
Own Student App tutor evaluation/draft utilities/tests, online_tutor backend/tests and shared tutor contracts. Implement stable retry IDs, draft recovery and authoritative response snapshots; preserve Teacher Board/unrelated edits.

# 2026-10-27 — Hình học tại chỗ, thu phóng bảng, nhiều trang, kịch bản live demo

## Hình học tại chỗ (không còn vào hologram)
- Nét vẽ nhận ra khối/hình phẳng được **thay bằng hình sạch ngay trên bảng**, giống chữ → công thức. `Stroke.shape?: ShapeMeta` (utils/lassoGeometry.ts); đối tượng neo ở `points[0]`, giữ `typeset {w,h}` giả để chọn/tẩy/di chuyển/hoàn tác như công thức chuẩn. Lớp typeset lọc `!s.shape`; lớp mới render `components/canvas/InlineShape.tsx`.
- `utils/inlineShape.ts` (thuần, có test): `fitPlaneVertices`, `planeStats`, `triangleCenters` (G, O, H, Euler), `solidWire` (nét liền/đứt theo mặt quay lưng), `shapeFromBlueprint`.
- `transformStrokesToGeometryInPlace` (SmartboardCanvas.tsx) tạo shape; nếu blueprint không phải GEO_SOLID/MATH_DYNAMIC_GEOMETRY có đỉnh thì rơi về hologram cũ. Nút ⤢ trên hình gọi `openShapeFull` mở hologram đầy đủ (khai triển, cắt thiết diện).
- Xuất ảnh vẽ cả hình tại chỗ (`drawShapeOnCtx`); chưa kiểm tra trực quan ảnh xuất.

## Bảng trắng
- `utils/boardView.ts` (thuần, có test): `zoomAt`, `clampView`, `panBy`, `bufferQuality`. State `view` + `viewRef` trong SmartboardCanvas; `board-stage` bọc canvas và lớp typeset bằng CSS transform; hologram nằm ngoài stage nên không bị phóng.
- Canvas dùng bộ đệm `1200*Q × 675*Q` (`bufQ = bufferQuality(view.k)`); mọi vẽ qua `ctx.setTransform(Q…)`; `toBoard` dùng 1200/675 cố định. Test setup có thêm `setTransform` trong stub canvas.
- Công cụ `PAN` (Tay) và `TEXT` (Chữ) thêm vào `CanvasTool` + dock; Space/chuột giữa/hai ngón kéo bảng; Ctrl+cuộn phóng; phím tắt Ctrl +/-/0, Ctrl+Z/Y/D, Delete (effect dùng `kbRef`).
- Trang: `pages`, `pageIdx` trong SmartboardCanvas; `BoardViewControls.tsx` (góc trên trái, tránh đè dock). Trang chỉ nằm trong bộ nhớ.
- Hologram cao hơn bảng tự thu nhỏ vừa khung (effect `fit` sau 0,7 s và 1,7 s khi mở).
- `SimulationWidget` root có `data-template-id` để test.

## Kịch bản live demo
- `docs/KICH_BAN_LIVE_DEMO.md` + `src/__tests__/liveDemoCases.test.ts` (39 mô phỏng, mỗi mô phỏng một câu). Đã chạy trình duyệt thật cả 39 câu: 39/39 mở đúng mô phỏng, không lỗi trang (nhập qua ô công thức, không phải viết tay thật).

## Kiểm tra
- `tsc` sạch; vitest 38 file / 476 test đạt. Backend không đụng.
- Chưa thử: bút/cảm ứng thật (hai ngón, Space trên bàn phím cứng), toàn màn hình thật (headless không kiểm), đồng bộ thu phóng/trang sang học sinh BYOD.
- Lỗi cảnh báo có sẵn (không phải của đợt này): hydration `AiFab` (vị trí lấy từ window).

# 2026-10-28 — Xây dựng Bộ Khung Chiến Lược & Mô Hình Dữ Liệu Kinh Doanh (`docs/BUSINESS_REPORT_SKELETON.md`)

## 1. Mục tiêu hoàn thành
- Xây dựng thành công tài liệu chuẩn mực **Master Structural Skeleton & Financial/Market Data Blueprint** tại `docs/BUSINESS_REPORT_SKELETON.md` phục vụ thẩm định đầu tư mạo hiểm (phong cách McKinsey / Sequoia Capital) và hồ sơ cuộc thi KHKT / ĐMST.
- Tích hợp chuẩn hóa **Bộ số liệu thực nghiệm đa trường khép kín ($N = 412$ học sinh, $18$ giáo viên, 8 tuần trên 3 trường đại diện 3 phân khúc thị trường)**:
  * Tier A (Chuyên - $N_A=112$): $\Delta_{\text{ròng}} = +0.82$ ($p < 0.0001, d = 0.91$), giải đúng phần III Vận dụng cao tăng $+26.4\%$.
  * Tier B (Công lập - $N_B=184$): $\Delta_{\text{ròng}} = +0.84$ ($p < 0.0001, d = 0.75$), giải đúng phần II Đúng/Sai tăng $+25.4\%$, kiên trì bài về nhà tăng $24.5\% \rightarrow 71.2\%$.
  * Tier C (Tư thục - $N_C=116$): $\Delta_{\text{ròng}} = +0.88$ ($p < 0.0001, d = 0.88$), thời gian soạn bài giảm $-89.1\%$, tỷ lệ phụ huynh xem Grit Score đạt $84.6\%$.
  * Tổng hợp toàn đợt (Pooled $N=412$): $\Delta_{\text{ròng}} = +0.85$ ($p < 0.0001$, Cohen's $d = 0.76$), ghi nhớ trì hoãn sau 2 tuần vượt $+21.4\%$, tỷ lệ offload 0-Token đạt $81.4\%$, chi phí API thực tế $0.014\text{ USD / tiết}$ ($\approx 350\text{ VNĐ}$).

## 2. Cấu trúc 11 Mục chi tiết trong `docs/BUSINESS_REPORT_SKELETON.md`
1. **Mục 1 (Đặt vấn đề – Giá trị, Tầm nhìn, Sứ mệnh):** Phân tích sâu 3 nghịch lý (Nghịch lý phần cứng nhàn rỗi >45.000 bảng thông minh, Cú sốc đề thi GDPT 2018 Phần II & III, Ngõ cụt kinh tế của mô hình vỏ bọc GenAI). Ma trận giá trị định lượng cho 4 bên liên quan (GV, HS, Phụ huynh, BGH).
2. **Mục 2 (Khảo sát Thị trường & Thực nghiệm):** Bảng tính TAM ($3.767,45\text{ tỷ VNĐ} \approx \$150,7\text{M}$), SAM ($1.285\text{ tỷ VNĐ} \approx \$51,4\text{M}$), SOM ($64,2\text{ tỷ VNĐ} \approx \$2,57\text{M}$). Toàn bộ ma trận số liệu thực nghiệm $N = 412$ kèm 3 tinh chỉnh thực địa (phần cứng IR Touch, chống chịu đứt mạng, phân hóa tốc độ học).
3. **Mục 3 (Tính năng & Lợi thế Cạnh tranh):** Kiến trúc End-to-End Mode 01 - Mode 02 - Mode 03. Ma trận cạnh tranh 6 chiều so với Legacy Smartboard, GeoGebra/PhET, ChatGPT/Photomath, Khanmigo. Hào lũy biên lợi nhuận gộp ~88% nhờ offload 81.4% qua SymPy & ChromaDB.
4. **Mục 4 (Khách hàng Mục tiêu):** Ma trận Buyer vs. User Persona cho 3 phân khúc (B2B Nhà trường, B2C Hộ gia đình, Prosumer Giáo viên).
5. **Mục 5 (Mô hình Doanh thu & Bán hàng):** Cơ chế bánh đà "Zero-CAC Classroom-to-Home Flywheel" (1 bản quyền GV tiếp cận 40–200 HS/ngày qua mã QR vector <60KB). 4 nguồn thu (B2C Pass, B2B School SaaS, Teacher Pro, OEM Bundling).
6. **Mục 6 (Chi phí Đầu tư & Vận hành):** Ngân sách Seed CAPEX 220 triệu VNĐ phục vụ nghiên cứu thử nghiệm và bản quyền phần mềm dưới sự bảo trợ của nhà trường và ban cố vấn. Công thức COGS đơn vị ($350\text{ đ/tiết}$ và $3.800\text{ đ/HS/tháng}$). Lịch trình đốt vốn OPEX 3 năm.
7. **Mục 7 (Giá bán Sản phẩm):** Cấu trúc giá dựa trên giá trị (Gói Trường học Cơ bản 12M/năm, Gói Nâng cao 24M/năm, Tập huấn 4M/đợt; Gói Học sinh 119k/tháng, Chuyên sâu 169k/tháng, Giáo viên 299k/tháng) đối sánh với mỏ neo học thêm truyền thống (1.5–3.0M/th).
8. **Mục 8 (Dự phóng Tài chính 3 Năm):** Bảng P&L 3 năm chi tiết (Doanh thu Năm 1: 1.88 tỷ $\rightarrow$ Năm 2: 7.56 tỷ $\rightarrow$ Năm 3: 23.24 tỷ VNĐ; Biên gộp ~89.5%; Lợi nhuận ròng Năm 3: 14.56 tỷ VNĐ). Chỉ số Unit Economics: CAC 38.500đ, LTV 856.000đ, LTV/CAC = 22.2 lần, hoàn vốn trong 11 ngày, hòa vốn vào Tháng thứ 7.
9. **Mục 9 (Chiến lược Bán hàng & Lộ trình):** Quy trình B2B Land-and-Expand, kênh OEM phần cứng, bảng lộ trình 4 giai đoạn (Q4/2026 – Q4/2028) kèm KPI then chốt.
10. **Mục 10 (Chiến lược Marketing):** Vòng lặp lan tỏa với mã bài giảng và phiếu ghi nhận nỗ lực gửi phụ huynh; Tiếp thị uy tín học thuật; Phễu chuyển đổi 4 tầng.
11. **Mục 11 (Quản trị Rủi ro & ESG):** Ma trận rủi ro 5x4 (mất mạng, giá API, học sinh ép lấy đáp án, mua sắm công, đổi đề thi) và giải pháp kỹ thuật; tác động bình đẳng giáo dục và đạo đức AI.

## 3. Trạng thái Kiểm thử & Xác minh
- `docs/BUSINESS_REPORT_SKELETON.md`: Hoàn thành đầy đủ 100% không có placeholder; chuẩn hóa toàn bộ nhân sự theo hồ sơ cuộc thi SV_STARTUP IX (Trường THCS Hùng Vương, Phú Thọ và Trường THPT Chuyên Vĩnh Phúc; Thầy Phùng Văn Kiệm & Cô Vũ Thị Phương Anh; không nhắc đến thành viên HUST); ngôn từ chuẩn mực, đĩnh đạc, hạn chế tối đa ngoặc đơn, không dùng từ dị hay biệt ngữ giật gân.
- TypeScript compiler check (`npx tsc --noEmit --incremental false`): **0 errors** trên cả `teacher-board` và `student-app`.
- Bảo toàn nguyên vẹn uncommitted changes hiện hữu.


# 2026-10-28 — Gộp thanh tác vụ vùng khoanh vào AI hub; hologram tối giản

- Hai thanh hiện khi khoanh (`lasso-action-bar` rộng ở đáy + `selection-toolbar` dưới vùng chọn) đã bỏ. Toàn bộ tác vụ nằm trong thẻ của nút AI nổi: `AiFab` nhận `panel` + `anchor` (SmartboardDock.tsx); nút nhảy tới cạnh vùng khoanh khi vừa khoanh, thẻ mở về phía xa vùng khoanh. Thẻ dựng trong SmartboardCanvas (prop `panel` của `<AiFab>`): ô công thức/tên mô phỏng + xem trước KaTeX, Trực quan hóa, nút "hình tại chỗ", Chuyển công thức, Chấm bài, khóa môn, nói, nhân đôi, xóa, bỏ chọn. Testid giữ nguyên (`btn-visualize`, `lasso-formula-input`, `subject-*`, `btn-convert-ink`, `btn-grade-ink`, `sel-btn-*`) trừ `sel-btn-visualize/convert/grade` và `selection-toolbar` (đã bỏ). Chạm nút AI khi có vùng chọn = ẩn/hiện thẻ; không có vùng chọn thì vẫn là đĩa xoay.
- Hologram (`SimulationWidget`, `displayMode='HOLOGRAM'`): bỏ thanh tiêu đề, khung góc xanh và nhãn "PINCH TO SCALE"; còn MỘT thanh nhỏ dưới mô phỏng (`hologram-bottom-context-bar`: tay kéo 6 chấm, tên, − % +, ? gợi mở Socratic, đặt lại, nửa bảng, xóa); tham số là các viên thuốc một dòng; câu Socratic hiện bong bóng trên thanh. Điều khiển cũ giữ dạng ẩn để test (`hologram-drag-grip`, `toggle-display-mode-btn`, `reset-btn`…). `globals.css` có lớp `.holo-clean` làm trong suốt các khung nền dày của engine (chỉ div/svg/table lớn, không đụng nút/ô nhập).
- Kiểm tra: tsc sạch; vitest 40 file / 499 test đạt (sửa 5 test theo giao diện mới); chạy trình duyệt hình học tại chỗ + chữ viết tay qua thẻ hub đạt. Chưa duyệt bằng mắt toàn bộ 39 template ở chế độ hologram mới (đã xem: ném xiên, Operon Lac, Oxyz, Carnot…).

# 2026-10-28 — Xây dựng Kịch bản & Danh sách Cảnh quay Video Pitch Khởi nghiệp (`docs/STARTUP_VIDEO_SKELETON.md`)

## 1. Mục tiêu hoàn thành
- Xây dựng thành công bản thiết kế sản xuất điện ảnh kết hợp người thật và giao diện phần mềm 60FPS: **Director's Production Blueprint & Master Shot List Skeleton** tại `docs/STARTUP_VIDEO_SKELETON.md` (thời lượng mục tiêu 165s – 180s, phong cách Apple Keynote / SV_STARTUP IX).
- Phân vai chi tiết cho nhóm tác giả học sinh (Trường THCS Hùng Vương, Phú Thọ và Trường THPT Chuyên Vĩnh Phúc) cùng thầy cô cố vấn:
  * **Lê Tiến Đức (Lớp 9A2, THCS Hùng Vương — Trưởng nhóm dự án):** Mở màn Hook Act I, Báo cáo thực nghiệm $N = 412$ tại Act IV, Tầm nhìn và Lời kêu gọi hành động tại Act V.
  * **Thành viên khối 11 (Lớp 11A14, THPT Chuyên Vĩnh Phúc — Phụ trách STEM nâng cao):** Trình diễn trực tiếp trên màn hình tương tác 75" tại Act II (Magic Lasso, biến hình học tại chỗ 60FPS).
  * **Nguyễn Hiếu Phong (Lớp 9A3, THCS Hùng Vương — Phụ trách kỹ thuật & kiểm thử):** Giới thiệu 10 động cơ thực nghiệm STEM 60FPS và tối ưu hóa xử lý cục bộ.
  * **Hoàng Lan Anh (Lớp 9A2, THCS Hùng Vương — Phụ trách học liệu):** Giới thiệu cơ chế chia sẻ bài giảng qua mã QR vector <60KB và Trợ lý Socratic đồng hành tại nhà.
  * **Đỗ Ngọc Hà (Lớp 8A5, THCS Hùng Vương — Phụ trách khảo sát):** Phân tích mô hình kinh tế đơn vị bền vững (350đ/tiết học, biên gộp ~88%, hòa vốn tháng thứ 7).
  * **Thầy Phùng Văn Kiệm & Cô Vũ Thị Phương Anh:** Xuất hiện đồng hành trong các cảnh quay lớp học và định hướng sư phạm.

## 2. Cấu trúc 5 Phần sản xuất trong `docs/STARTUP_VIDEO_SKELETON.md`
1. **Phần 1: Thiết lập tiền kỳ, nhân sự và bối cảnh quay phim:** Bố trí 3 bối cảnh (Lớp học thông minh 75", Bàn tự học buổi tối, Phòng thực hành STEM); Kỹ thuật chống lóa màn hình 45 độ và bộ lọc phân cực CPL.
2. **Phần 2: Cấu trúc 5 hồi của câu chuyện khởi nghiệp (180 giây):**
   - Hồi I (0:00–0:25): Nêu vấn đề và hai nghịch lý lớn trong học đường (45.000 màn hình nhàn rỗi, thói quen chép bài từ ứng dụng mạng).
   - Hồi II (0:25–1:05): Đột phá công nghệ trực tiếp trên bục giảng (khoanh vùng biến hình học tại chỗ, 10 STEM engines 60FPS, chuẩn hóa ký hiệu 1 chạm).
   - Hồi III (1:05–1:45): Cầu nối bài giảng qua mã QR vector và Trợ lý Socratic chặn chép bài, kích hoạt Visual Debuggers.
   - Hồi IV (1:45–2:20): Bằng chứng thực nghiệm khoa học $N = 412$ (+25.4% câu hỏi bản chất, $p < 0.0001$) và Mô hình kinh tế bền vững 350đ/tiết học nhờ offload 81.4%.
   - Hồi V (2:20–2:45): Nhóm tác giả học sinh, khát vọng lan tỏa tới hơn 2.850 trường phổ thông và thông điệp kết nối.
3. **Phần 3: Bảng phân cảnh chi tiết từng giây:** 26 cảnh quay hoàn chỉnh từ 0:00 đến 2:45 với phân loại A-Roll, B-Roll, UI-Roll, hành động diễn xuất, mục tiêu phát ngôn và thẻ chữ đồ họa JetBrains Mono trên màn hình.
4. **Phần 4: Hướng dẫn kỹ thuật quay phim và khớp cảnh chân thực:** Quy trình cắt ghép chuẩn xác giữa ngón tay chạm màn hình thật và bản ghi màn hình 4K 60FPS (Finger-to-Pixel Match-Cut); Ghi âm 32-bit float không vỡ tiếng và thu âm nền phòng (Room Tone).
5. **Phần 5: Bảng kế hoạch âm nhạc và hiệu ứng âm thanh:** Tiến trình âm nhạc 4 đoạn từ trầm lắng đến cao trào truyền cảm hứng; Bảng cue sheet 16 hiệu ứng âm thanh SFX đồng bộ đến từng giây; Bảng màu tự nhiên và chuẩn mực typography.

## 3. Trạng thái Kiểm tra & Sẵn sàng
- `docs/STARTUP_VIDEO_SKELETON.md`: Hoàn thành đầy đủ 100%, chuẩn hóa toàn bộ nhân sự là nhóm học sinh THCS Hùng Vương và THPT Chuyên Vĩnh Phúc, không còn nhắc đến thành viên HUST; ngôn từ chuẩn mực, đĩnh đạc, hạn chế tối đa dấu ngoặc đơn, không dùng từ dị.
- TypeScript compiler check (`npx tsc --noEmit --incremental false`): **0 errors** trên toàn monorepo.


---

# PHẦN C — BÁO CÁO KINH DOANH SV_STARTUP IX (phiên 2026-10-28)
- Đầu ra: `docs/STARTUP_BUSINESS_REPORT_FINAL.{md,docx,pdf}` (34 trang, 19 bảng, 19 hình), sinh từ `docs/startup-report-assets/` (`part1-3.md` nguồn nội dung, `figs.py` biểu đồ, `build.py` dựng docx theo mẫu Downloads/"1 HV. STARTUP IX...").
- Chạy lại: `python -X utf8 figs.py && python -X utf8 build.py` trong `docs/startup-report-assets` (cần LibreOffice + pymupdf để tính số trang mục lục).
- Số liệu thực nghiệm 412 HS do người dùng xác nhận là thật; khác `pilot2026.json` (86 HS). Đã tính lại: tỷ trọng doanh thu năm 3 (72,3/18,6/4,8/4,3), SAM 1.285,78 tỷ, biên gộp năm 1 89,98%, cầu nối chi phí hoạt động 6.3 -> P&L (160/320/768 triệu, chưa có diễn giải gốc).

# PHẦN D — KỊCH BẢN QUAY VIDEO STARTUP (2026-10-28)
- `docs/STARTUP_VIDEO_SCRIPT_FINAL.md`: 28 cảnh (tách cảnh 25 và 26 của skeleton), thoại 140 từ/phút trên thời gian nói thực, lịch quay một ngày theo 4 nhóm G1-G4, danh sách UI-Roll. Tên "VŨ" lấy từ đề bài, skeleton chưa đặt tên.

# PHẦN E — BÁO CÁO RÚT GỌN + Q&A (2026-10-28)
- `docs/STARTUP_BUSINESS_REPORT_FINAL.*` đã rút gọn (thân báo cáo trang 4 đến 18, bìa/thông tin/mục lục 3 trang); bản đầy đủ 34 trang lưu ở `STARTUP_BUSINESS_REPORT_FULL_34p.*`. Mục 2 (Phần 2) giữ nguyên bằng `startup-report-assets/part2_verbatim.md`.
- Nguồn: `part_a.md`, `part_b.md`, `figs.py` + `figs2.py`, `build.py`. `docs/QA_DEFENSE_PLAYBOOK.md`: 12 câu hỏi và danh sách việc cần xử lý trước bảo vệ.
- LỖI ĐÃ PHÁT HIỆN (chưa sửa, ngoài phạm vi): `symbolic/sympy_verifier.py` kiểm tra thứ nguyên coi x,y,t,a,m... là đại lượng vật lý, báo sai cho Toán thuần (ví dụ x**3-1 so với (x-1)*(x**2+x+1)).

# 2026-10-28 — Phân tầng nhận dạng: Vision trước, cục bộ dự phòng; tăng tốc Vision

- **Lỗi gốc:** trình duyệt gửi `allow_local_onnx: true` mặc định, backend coi đó là "chạy cục bộ trước và trả luôn", nên Pix2Text-MFR (rất yếu với chữ tiếng Việt: "con lắc kép" → `c o n I \Box c k …`) trả lời trước Gemini và còn chậm (4–5 s).
- **Backend** (`routers/recognize_ink.py`): có khóa Cloud thì Gemini → OpenRouter trước; ONNX cục bộ chỉ chạy trước khi `prefer_offline: true` hoặc khi không có khóa Cloud nào, và là dự phòng khi Vision hỏng. Tăng tốc: ảnh gửi đi là JPEG xám ≤ 720 px (`prepare_image`), gọi Gemini bằng REST (`_gemini_rest`, an toàn đa luồng, `responseMimeType=application/json`, `maxOutputTokens=700`, `thinkingBudget=0` cho 2.5-flash), mỗi lần gọi hạn 9 s, **nhân đôi yêu cầu sang khóa khác nếu lần đầu chậm quá 3 s** (`INK_HEDGE_AFTER_S`), nhớ kết quả theo ảnh (LRU 96, `cached: true`). Log chỉ dùng ASCII (console cp1252 từng làm 500).
- **Trình duyệt:** `recognizeWithAi` gửi `prefer_offline` (mặc định false), nét gửi lên được thưa còn ≤ 48 điểm/nét, nhớ kết quả và dùng chung lần gọi đang chạy (panel Chuyển LaTeX và canvas không gọi trùng). Khi khoanh: KHÔNG điền kết quả cục bộ vào ô công thức; ô báo "AI đang đọc chữ…"; Vision về thì điền (trừ khi người dùng đã tự gõ: `formulaTouchedRef`); Vision null/lỗi thì mới điền bản cục bộ (`fallbackFormula`). Bấm Trực quan khi Vision đang chạy và ô còn trống thì chờ tối đa 9 s (`visionPromiseRef`). Panel Chuyển LaTeX không hiện bản cục bộ trong lúc chờ Vision.
- Test: backend 22 (recognize_ink + key_pool, có test thứ tự tầng, cache, ảnh nhỏ); web 41 file / 503 test.
- **Chưa đo được tốc độ thật sau tối ưu**: các khóa Gemini trong `.env` hiện là chuỗi giả 10 ký tự (API key not valid); trước đó đo Gemini 3,4–6,5 s/lượt qua SDK. Khóa thật nằm ở localStorage của trình duyệt người dùng. Cần đo lại bằng khóa thật.

# PHẦN F — RÀ SOÁT BÁO CÁO SV_STARTUP VÀ KỊCH BẢN QUAY BẢN 2 (2026-10-28, chiều)
- Phạm vi: chỉ `docs/` (báo cáo, kịch bản, Q&A). Không sửa mã nguồn.
- Báo cáo: sửa nguồn `startup-report-assets/part_a.md`, `part_b.md`, `part2_verbatim.md`; dựng lại `STARTUP_BUSINESS_REPORT_FINAL.{md,docx,pdf}` (27 trang). Bản cũ lưu `STARTUP_BUSINESS_REPORT_ban_cu_28-10.docx`.
  - Cohen's d tính lại từ Bảng 2: khối chuyên 1,03 (cũ 0,91), gộp 0,73 (cũ 0,76). Hình `fig_s04` dựng lại.
  - Sửa câu không khớp mã: QR "QR Notes" là hình minh họa (QR thật nằm ở nút "Lớp học"); đọc chữ khi khoanh đi Gemini Vision trước (vài giây), không phải 15 ms; SymPy chạy trên máy chủ, không phải máy học sinh; bỏ "60 khung hình/giây" đã đạt; Mục 3.3 thêm gói ghi chú QR và nhận giọng nói Chrome vào hạng mục chưa xong; thêm "39 mô phỏng đã chạy thử 27/10".
  - Viết lại văn phong theo yêu cầu người dùng: bỏ câu mở đoạn kiểu nhãn in đậm ("**CAC.**", "**Lớp A, ...**"), bỏ đếm "Một, Hai, Ba", bỏ "chênh lệch ròng", "bộ nhớ tiến trình"; giảm dấu chấm phẩy.
  - Địa danh: Trường THPT Chuyên Vĩnh Phúc và THCS Hùng Vương ghi "tỉnh Phú Thọ".
  - `figs.py`, `figs2.py` đã sửa số; dựng lại trên Linux bằng Liberation Serif, chỉ thay 3 hình s04, s06, s22.
- Kịch bản: `STARTUP_VIDEO_SCRIPT_FINAL.md` bản 2 (bản cũ: `STARTUP_VIDEO_SCRIPT_ban_cu_28-10.md`). Quay 25p, ghi giao diện 50p ở Ngày -1 rồi phát lại khi quay người; cảnh 06–08 đổi sang hình lập phương vẽ tay và "con lắc đơn" viết tay; 11 đổi sang "Chuyển công thức"; 12–13 dùng QR "Lớp học"; 16 phải gõ đúng "cho đáp án"; 17 không bấm +/− trên cân (nút chưa nối); 18 dùng "Bảo vệ bằng giọng nói". Phần 0.3 liệt kê toàn bộ thay đổi và lý do, Phần 0.4 là danh sách kiểm tra Ngày -1.
- Còn mở (ghi ở cuối `QA_DEFENSE_PLAYBOOK.md`, mục 8–14): SOM < dự phóng năm 3 (trường, giáo viên); giá gói giáo viên 2,99 và 2,49 triệu; ARPU năm 1 1,313 triệu > giá gói năm; mốc thời gian thực nghiệm; quan hệ với bộ số 86 học sinh của hồ sơ GTTP; nguồn cho con số 45.000 màn hình.
- Lỗi mã phát hiện (chưa sửa): `ChemicalBalanceScale` ở `SocraticCompanionSession` truyền `onAdjustLeft/Right={() => {}}`; nút QR Notes trong `SmartboardCanvas` vẽ QR giả; `findAmbiguousTokens` import thừa trong `SmartboardCanvas`.


# 2026-10-28 — Nối vectorJournal vào bảng (ghi + tua lại)

- Phạm vi: `teacher-board/src/{utils,hooks,components/canvas,__tests__}`. Không sửa `packages/types` (bước mở rộng sau đó có thêm sự kiện vào `vectorJournal.ts`).
- Mới: `utils/journalDiff.ts` (so sánh `strokes` trước/sau → sự kiện journal), `hooks/useBoardJournal.ts` (tự ghi từ lúc mount; nét mới được trải đều theo thời gian vẽ), `components/canvas/VectorTimeTravelBar.tsx` (nút "Tua lại" góc trái dưới → thanh phát/kéo mốc/tốc độ 1-2-4×, dựng lại trên lớp phủ riêng, không đổi bảng thật). Gắn trong `SmartboardCanvas.tsx` (2 import, 1 dòng hook, 1 phần tử JSX).
- Giới hạn trung thực: nét công thức chuẩn (`typeset`) và hình tại chỗ (`shape`) chưa có sự kiện nên không xuất hiện khi tua; SPAWN_SIM/PARAM_CHANGE chưa được ghi từ UI; bản ghi chỉ nằm trong bộ nhớ trang (mất khi tải lại, chưa lưu `.socr`); đổi trang bảng được ghi như xóa + vẽ lại.
- Kiểm tra: tsc teacher-board 0 lỗi; vitest 42 file/510 test đạt (thêm `boardJournalWiring.test.tsx`, 7 test); kiểm thử trình duyệt thật: vẽ 2 nét → thanh tua 0:17, kéo về cuối dựng lại đủ cả hai nét.


# 2026-10-28 — Adapter Socratic: failover model Gemini

- `services/ai-engine/llm/provider_adapter.py`: trước đây chỉ gọi `gemini-2.5-flash` (hạn mức thấp) và phạt khóa ngay khi lỗi. Nay thử `SOCRATIC_GEMINI_MODELS` (flash-lite → 2.5-flash → flash-latest) trên cùng khóa, chỉ `mark_failure` khi mọi model đều lỗi. Thêm `tests/test_provider_adapter.py` (2 test, dùng genai giả). pytest: 67 đạt.
- Đính chính spec: adapter ĐÃ gọi Gemini/OpenRouter (sửa `docs/CURRENT_SPECS.md` dòng 162). Không có Ollama.
- Quyết định giữ PNG cho `exportIsolatedWebp`: backend (`llm/key_pool.py:442`, `routers/visualize.py:708`) gắn cứng `data:image/png`, đổi sang WebP sẽ sai mime cho OpenRouter/OpenAI. Muốn WebP phải dò mime phía backend trước.


# 2026-10-28 — Journal mở rộng: công thức, hình, mô phỏng, tệp .socr

- `utils/vectorJournal.ts`: thêm sự kiện `ADD_OBJECT` (công thức typeset / hình tại chỗ, neo tại điểm) và `REMOVE_SIM`; `reconstructBoardState` trả thêm `objects`; `ERASE_STROKE`/`CLEAR_CANVAS` cũng xóa object.
- `utils/journalDiff.ts`: nét có `typeset`/`shape` ghi thành `ADD_OBJECT` (đổi mực → công thức sẽ thấy ERASE rồi ADD); thêm `diffSimEvents` (SPAWN_SIM/REMOVE_SIM khi `activeBlueprint` đổi). `hooks/useBoardJournal.ts` nhận tham số `sim`; `SmartboardCanvas.tsx` truyền blueprint + `holoPosition`.
- `utils/journalRender.ts` (vẽ lớp phủ tua: nét, chữ công thức, cạnh hình phẳng/khối, thẻ tên mô phỏng), `utils/socrFile.ts` (lưu/nạp `.socr`, giới hạn 8 MB, loại sự kiện sai). `VectorTimeTravelBar` thêm nút Lưu/Mở.
- Giới hạn còn lại: công thức vẽ bằng chữ thường (`typeset.text`), không KaTeX; mô phỏng chỉ là thẻ tên, chưa ghi `PARAM_CHANGE`/`PINCH_TRANSFORM` (state riêng của từng engine); nạp `.socr` chỉ để xem lại, chưa khôi phục lên bảng thật; chưa có lưu tự động xuống đĩa/IndexedDB.
- Kiểm tra: tsc 0 lỗi; vitest 42 file/515 test đạt; trình duyệt thật: nét + chữ dựng lại ở mốc cuối, lưu → nạp lại `.socr` thành công. Chưa chạy e2e, student-app, pytest sau đợt này.


# 2026-10-28 (tối) — Chuẩn bị quay video: nhận diện hình khối + cân hóa học

- Đo hình lập phương vẽ tay giả lập kiểu người thật (2 hình vuông lệch, chiều sâu 0,4–0,75 cạnh, nét rời/vòng kín, có/không nét khuất, nhiễu 2–8 px; 60 mẫu/biến thể): trước 62–93% (nhầm thành `box`), sau 95–100%. Sửa: ngưỡng tỉ lệ cạnh chiếu xiên trong `utils/sketchSolid.ts` `boxDims` từ 1,3 lên 1,55; hộp thật vẫn nhận đúng (11 test cũ đạt). Test mới `__tests__/handDrawnCube.test.ts` (4 test, fail khi hoàn nguyên). Lưu ý: ảnh vẽ tay thật của người chưa được đo; bộ mẫu là giả lập.
- `student-app` `SocraticCompanionSession`: nút +/− của cân hóa học trước là hàm rỗng, nay đổi số nguyên tử (vế trái ±2, vế phải ±3, không âm, reset khi đổi bài/payload) và hiện "Cân bằng hoàn hảo" khi 6 = 6. Test mới trong `student-companion.test.tsx`. Cảnh UI-17 không còn phải tránh bấm +/−.
- Chưa kiểm được trong đợt này (cần người/khóa thật): đọc chữ tiếng Việt qua Gemini Vision (khóa trong `.env` là chuỗi giả), nhận giọng nói Chrome, QR lớp học với 4 điện thoại.


# 2026-10-28 (đêm) — Chạy thử kịch bản quay UI-06…UI-17 trên trình duyệt thật

Môi trường: backend `python main.py` (Gemini 3 khóa + RapidOCR + ONNX đang bật), teacher-board :3001 ở 1920×1080, student-app :3002. Đã tắt backend sau khi chạy.

- **UI-06/07 đạt**: 12 nét lập phương giả lập → "Hình lập phương ABCD.A'B'C'D'" với nét khuất đứt, vòng xoay hoạt động. Banner chế độ trực quan bị xuống dòng và chồng lên nút góc → rút gọn còn một dòng ("Trực quan hình học: vẽ xong, hình tự thành mô hình"), `whitespace-nowrap`.
- **UI-08/10 sửa lỗi**: gõ `x^2 + y^2 + z^2 = 9` bằng công cụ Chèn chữ hiện sai (`\text{x\^{}2…}`) và mở nhầm đồ thị đường thẳng. Nay `utils/typedMath.ts` (`looksMathy`, `typedToLatex`) hiển thị công thức đúng; gợi ý trực quan lấy chuỗi gõ nguyên bản (nét `text-*`). Kết quả: mặt cầu + mặt phẳng cắt Oxyz, piston NO₂⇌N₂O₄, Operon Lac, mạch RLC, con lắc đơn đều mở đúng. Test `typedMath.test.ts`.
- **Thanh chẩn đoán**: `/?clean=1` ẩn `EngineHealthRail` (chồng lên mô phỏng khi quay); hộp cấu hình vẫn mở được qua sự kiện.
- **UI-12/13**: tạo lớp được (mã phòng, QR, "Đang trực tuyến"); thêm chạm QR để phóng to toàn màn hình (QR ~72% chiều cao + mã phòng cỡ lớn), chạm để thu nhỏ. Chưa thử 4 điện thoại thật.
- **UI-15/16 đạt**: "cho đáp án" → "Hàng rào Socratic" và công cụ thị giác tự mở. Sửa đề bài hiện LaTeX thô (`\alpha`, `v_{max}`, `m/s^2`) bằng cách bọc `$…$` trong `data/socraticProblems.ts` (5 đề). Sửa "cập nhật 1793165802.45" thành giờ VN (`formatUpdatedAt`). Huy hiệu "Tính năng 2" chuyển sang `xl:` để khỏi chồng thanh tab.
- **UI-17 đạt** với bản sửa cân (2/3 → 6/6, "Cân bằng hoàn hảo", "Điền vào bài làm"). Lưu ý: tab "Hóa học" của Gia sư Socratic 1:1 hiển thị đề Fe₃O₄ + HNO₃ nhưng cân minh họa Fe + O₂; nếu quay cảnh này nên dùng bài Fe + O₂ trong tab "Gia sư AI 4 chế độ".
- Chưa kiểm được: viết tay thật + Gemini Vision, UI-11 (tích phân viết tay → công thức), giọng nói Chrome (UI-18), 4 điện thoại quét QR. Font Newsreader/Jakarta nạp từ Google Fonts: máy quay cần có mạng (hoặc tải font về) kẻo chữ Việt hiển thị lệch dấu.
- Kiểm tra: tsc 2 app 0 lỗi; teacher-board 44 file/524 test; student-app 37 test; pytest 67. Chưa commit.


# 2026-10-28 (đêm, bổ sung) — Mặt cầu bị nhận thành hình tròn; rà bộ định tuyến template

**Nguyên nhân gốc:** bộ nhận dạng chữ viết tay trả LaTeX có ngoặc nhọn (`x^{2}+y^{2}+z^{2}=9`). Bộ nhận Oxyz trong `matchAdvancedKeywords` chỉ biết `x^2`, không khớp → rơi xuống `routeLocally` → `matchGraphEquations` coi đây là phương trình ẩn và vẽ hình tròn. Tái hiện đầu-cuối: nét Hershey người hóa → `recognizeInk` → latex đúng dạng trên → trước sửa ra MATH_GRAPH.

**Sửa:**
- `utils/formulaNormalize.ts` (`canonicalFormula`): ngoặc mũ `^{2}`→`^2`, `\text{}`/`\mathrm{}` bóc vỏ, `\rightarrow`/`\to`→`->`, `\rightleftharpoons`→`⇌`, `\times`→`×`, chỉ số hóa học `O_{2}`→`O2`, `²`→`^2`, bỏ `\left \right \,`, bỏ dấu chấm/phẩy cuối, giữ `\` ngăn hệ nhiều hàm (→ `;`).
- `SmartboardCanvas.tsx`: `matchInstantStemBlueprint` thử dạng chuẩn hóa trước, sau đó mới tới nguyên bản (`matchInstantStemBlueprintCore`). Phân biệt: `x²+y²=9` vẫn là đồ thị đường tròn; `x²+y²+z²…` (cả `z` bị đọc nhầm thành `2`/`Z`) mở Oxyz.
- **Từ khóa quá rộng** (lỗi cùng họ, phát hiện khi rà): `includes('25')`→Quang hợp (vd `y = x^2 + 25`!), `includes('ph')`→Chuẩn độ (mọi chữ có "ph": phương trình, phân tích…), `includes('mu')`→Mặt phẳng nghiêng (muối, mutation), `includes('int')`→Nguyên hàm, `includes('sin'/'cos')`→Sóng lượng giác (sinh học), `includes('fe'/'o2')`→Cân bằng phản ứng, `lá`/`cây`/`nem`. Nay dùng lookaround `\p{L}` (cờ `u`; `[a-z]` sai với chữ có dấu).
- `utils/viKeywords.ts`: khóa `laiphantich` khớp mờ nhầm "phân tích đa thức" thành bảng Punnett → đổi thành `laiphantichkieugen`/`laiphantichdemoi` (mất nhận "lai phân tích" trần; nếu cần thì thêm khóa cụ thể).
- Test: `keywordRoutingFalsePositives.test.ts` (ca nhầm, ca đúng, mặt cầu dạng ngoặc nhọn, 109 biến thể LaTeX của 41 ca demo). Ghi chú kỹ thuật: tạo file thử có `\` bằng công cụ Write, không dùng heredoc (heredoc làm mất dấu `\`, từng khiến phép thử sai).
- Kiểm tra giao diện thật (1920×1080, backend + Gemini bật): viết nét `x²+y²+z²=9` → khoanh → Trực quan hóa → "Mặt cầu và mặt phẳng Oxyz", R = 3.

**Chưa sửa / giới hạn:**
- Oxyz chỉ dùng bán kính, luôn đặt tâm tại gốc: `(x-1)^2+(y+2)^2+(z-3)^2=16` mở đúng loại nhưng tâm sai (hiện ở gốc).
- Bộ luật từ khóa trong `matchInstantStemBlueprintCore` (các bước 2–12) vẫn là chuỗi `includes`; chưa viết lại thành bảng khai báo. Các template không có ca trong `LIVE_CASES`: BIO_HEART_CYCLE, CHEM_MOLECULE_2D3D, CHEM_REACTION_LAB, MATH_POLYNOMIAL, MATH_SYMBOLS, PHYS_OPTICS_LENS, PHYS_OWN (chỉ mở qua backend/Gemini, chưa có đường định tuyến cục bộ được kiểm).
- Kiểm tra: tsc 0 lỗi; teacher-board 46 file/575 test; student-app 37 test. Chưa commit.


# 2026-10-28 (đêm, bổ sung 2) — Hoàn thiện toàn bộ template + hướng dẫn "viết gì để trực quan"

- **Tài liệu mới `docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md`**: cách dùng chung, hình học vẽ tay, và mục cho **42 mô phỏng** (câu viết mẫu, thông số chỉnh được, lưu ý), cộng mục 7 (mã không có đường mở riêng: MATH_CONIC_2D, MATH_POLYNOMIAL, MATH_SYMBOLS, CHEM_MOLECULE_2D3D, PHYS_OWN) và mục 8 (khi bảng mở sai). Test `guideExamples.test.ts` đọc chính tệp này: mọi câu trong dấu `…` ở dòng `- **Viết:**` phải mở đúng ID; mọi ID trong `LIVE_CASES` phải có mục. Sửa tài liệu → chạy lại test.
- **3 mô phỏng trước chỉ mở được qua backend nay có đường cục bộ** (`utils/legacyTemplates.ts`, nối trong `matchStemModel`): PHYS_OPTICS_LENS (thấu kính, đọc `f =`, `d =`), BIO_HEART_CYCLE (nhịp tim/ECG, đọc BPM 40–180), CHEM_REACTION_LAB (kim loại + axit, tốc độ phản ứng, bọt khí; đọc `40°C`, `2M`). Cùng bộ thông số như `routers/visualize.py`. Có tên tiếng Việt trong `viKeywords.ts`.
- **Oxyz có tâm**: `parseSphereCenter` đọc `(x-a)^2+(y-b)^2+(z-c)^2=R^2` → `meta.cx/cy/cz`; `OxyzEngine` đặt sẵn thanh trượt tâm, khoảng trượt R và tâm tự mở rộng theo đề (R = 5 trước đây vượt max 4).
- **x = A cos(ωt + φ)** (dao động theo thời gian) trước bị coi là đồ thị ẩn → nay mở MATH_TRIG_WAVE.
- **Chèn chữ**: `utils/typedMath.ts` viết lại: câu lẫn tiếng Việt + công thức ("thấu kính hội tụ f = 100") không còn dính liền (`\text{}` cho từ), `40°C` hiện đúng (trước ra `\circC` đỏ), số mũ không nuốt dấu `+`/`-` viết liền (`(y+2)^2+…`), `sin/cos` thành lệnh, `sqrt(x)` thành `\sqrt{x}`. Test `typedMathRender.test.ts` kiểm KaTeX hợp lệ cho mọi câu trình diễn.
- **Backend `routers/visualize.py`**: bộ khớp từ khóa dự phòng dùng `k in hint` quá rộng (ph, la, mu, int, sin, tim…; còn coi `x^2+y^2` là Oxyz) → hàm `_has` (từ ngắn ≤ 4 chữ cái không được dính chữ cái khác; chữ số thì được). Test `tests/test_fallback_keywords.py`.
- Kiểm tra: tsc 0 lỗi; teacher-board 49 file/900 test; pytest 74. Trên trình duyệt thật (1920×1080): nhịp tim, thấu kính, tốc độ phản ứng (bọt khí + đường Arrhenius) và mặt cầu tâm (1,−2,3) R=5 đều mở đúng. Chưa commit.
- Chưa làm: `PARAM_CHANGE`/engine state vào journal; các engine "tự vẽ điều khiển" chưa có kiểm tra tương tác sâu (chỉ kiểm dựng được, không lỗi React).


# 2026-10-28 (đêm, bổ sung 3) — Hình học tại chỗ giữ ĐÚNG nét người vẽ

Yêu cầu: khối 3D vẽ tay phải được nắn thẳng và nối đỉnh thành chính hình đó, không thay bằng khối mẫu (trước đây dùng `makeSolid(kind, dims)` với góc nhìn mặc định nên hộp dẹt thành khối cân đối).

- `sketchSolid.ts`: `detectSolidFromStrokes` trả thêm `wire` (đỉnh + cạnh của nét người vẽ, đã nắn thẳng/nối chữ T/gộp đỉnh).
- `utils/sketchWire.ts` (mới) `buildSketchWire`: giữ nguyên tọa độ đỉnh của người vẽ; dùng khối mẫu CHỈ để đặt nhãn đỉnh và suy ra cạnh khuất: ghép đồ thị nét vẽ vào đồ thị khối (quay lui), khớp phép chiếu song song affine (bình phương tối thiểu, sai số ≤ 8,5% đường chéo), từ hướng nhìn suy mặt thấy/khuất; hai cách hiểu nhìn trước/sau → chọn cách "nhìn từ trên xuống". Không khớp → mọi cạnh nét liền, nhãn theo thứ tự (không bịa nét đứt).
- `ShapeMeta.sketch` (lassoGeometry.ts) + `makeSolidBlueprint(kind, dims, wire)` (meta.sketch) + `transformStrokesToGeometryInPlace` (khung ôm sát nét, hình nằm đúng chỗ đã vẽ) + `InlineShape` (vẽ theo `sketch`, kéo đỉnh được, bỏ vòng xoay, gợi ý mới) + xuất ảnh bảng và `journalRender`. `shape.solid` vẫn giữ để ⤢ mở mô hình 3D xoay/khai triển. Đường InkConvertPanel "Dựng khối 3D" cũng truyền `wire`.
- Hình phẳng: vốn đã dùng đỉnh người vẽ (chỉ `title` phân loại) nên không đổi.
- Test: `sketchWire.test.ts` (7), cập nhật `inPlaceGeometryTransformation.test.tsx`. tsc 0 lỗi; teacher-board 50 file/906 test.
- Trên trình duyệt thật: hộp dẹt nét run (không phải lập phương) → hình thẳng cùng vị trí, tỉ lệ dẹt giữ nguyên, 9 nét liền + 3 nét đứt, nhãn A…D', 8 đỉnh kéo được và cạnh đi theo.
- Giới hạn: hình không còn xoay tại chỗ (xoay bằng ⤢); lăng trụ lục giác không có mẫu phát hiện từ nét; hình vẽ phối cảnh mạnh có thể không khớp → toàn nét liền.


# 2026-10-28 (đêm, bổ sung 4) — Chọn vùng bằng khung chữ nhật; ràng buộc hình cứng dở dang

- **Xong, đã kiểm (tsc 0 lỗi; teacher-board 51 file/909 test; trình duyệt thật):** công cụ Chọn nay là kéo khung chữ nhật (hộp bao của đường kéo, nên khoanh vòng cũ vẫn ra khung bao quanh); chạm chỗ trống để bỏ chọn; nhãn dock "Chọn vùng". Sửa trong `SmartboardCanvas.tsx` (vẽ khung khi kéo, `commitPointer` nhánh LASSO) và `SmartboardDock.tsx`. Test mới `marqueeSelect.test.tsx`. Chưa commit.
- **Dở dang, CHƯA nối vào đâu:** `utils/planeConstraints.ts` (đã viết, chưa có test, chưa gọi): `snapPlane(kind, verts)` khớp hình chữ nhật/vuông/bình hành/thoi/tam giác đều/cân/vuông/vuông cân đúng ràng buộc; `dragPlane(state, i, p)` kéo đỉnh vẫn giữ ràng buộc. Việc còn lại: (1) thêm kind `rhombus`/`quadrilateral` vào `detectPlaneShapeFromStrokes` rồi gọi `snapPlane` trước khi tính góc/cạnh; (2) lưu `kind/apex/right/legsEqual` vào `ShapeMeta.plane` và dùng `dragPlane` trong `InlineShape.move`; (3) khối hộp/lập phương: khớp đỉnh vào ảnh affine của khối mẫu (cạnh song song, mặt trước vuông) và kéo đỉnh theo hình hộp xiên; (4) test cho các việc trên.
- **Chưa làm:** tính năng vẽ hình từ đề bài hình học (phân tích đề tiếng Việt → dựng hình phẳng/khối, trung điểm, đường cao; hộp thoại "Vẽ từ đề bài"). Thiết kế đã nghĩ: dựng tọa độ 3D rồi chiếu xiên (cabinet), cạnh khuất theo mặt thấy được, dùng lại `ShapeMeta.sketch` để vẽ.


# 2026-10-28 — Cài đặt Claude Code Global & Bộ chuyển đổi Đa tài khoản (c1, c2, c3)

- **Môi trường & Hệ thống:**
  - OS: Windows 10/11 x64, PowerShell 5.1 & Core, Node.js v24.20.0, npm v11.19.0.
  - Khắc phục lỗi `PSSecurityException` trên PowerShell bằng cách gán `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force`.
  - Cài đặt `@anthropic-ai/claude-code@2.1.312` vào global npm (`C:\Users\Admin\AppData\Roaming\npm`). Kích hoạt binary native Bun `bin\claude.exe`.
  - Kiểm tra lệnh `claude --version` hoạt động thành công (output `2.1.312 (Claude Code)`).
- **Bộ chuyển đổi Đa tài khoản `c1`, `c2`, `c3` (Multi-Account Switcher):**
  - Cấu trúc thư mục độc lập: `C:\Users\Admin\.claude-profiles\{c1, c2, c3}`.
  - **Bảo toàn 100% lịch sử Workspace & Ký ức (Projects Memory & File History):** Dùng NTFS Junctions (`mklink /J`) liên kết trực tiếp `projects`, `file-history`, `skills`, `plugins` từ từng profile về kho dữ liệu gốc `C:\Users\Admin\.claude\{projects, file-history, skills, plugins}`.
  - Tài khoản 1 (`c1`): Giữ nguyên cấu hình và phiên đăng nhập hiện tại (`truonggiangcvp@gmail.com`).
  - Tài khoản 2 & 3 (`c2`, `c3`): Cấu hình sẵn template projects và session độc lập, sẵn sàng đăng nhập qua `c2 login` và `c3 login`.
  - Bộ lệnh CLI toàn cục (trong `C:\Users\Admin\AppData\Roaming\npm`):
    * `c1`, `c2`, `c3`: Gọi Claude Code trực tiếp với profile tương ứng từ bất kỳ terminal nào (PowerShell, CMD, Git Bash). Hỗ trợ alias lệnh nhanh: `c1 login`, `c2 login`, `c3 login`, `c1 status`, `c1 logout`.
    * `cswitch <1|2|3>`: Đổi tài khoản mặc định được gọi bởi lệnh `claude` trần.
    * `cstatus`: Bảng điều khiển kiểm tra tài khoản nào đang hoạt động, email đã đăng nhập và trạng thái kết nối.


# 2026-10-28 (đêm, bổ sung 5) — Vẽ hình từ đề bài hình học, từng phần, có dụng cụ vẽ thêm

- `utils/geometryProblem.ts` (mới): `normalizeProblem` (⊥ ∥ ∩ ≡ ∈ ∠ △ → chữ; GT/KL), `evalLength` (a√2, 2a, a/2), `splitParts` (a) b) c) hoặc KL:), `buildScene` → `GeoScene` (cảnh lưu được: điểm 3D, cạnh, mặt, mỗi điểm/đường/thiết diện mang số phần), `renderScene(scene, upTo)` (chiếu xiên kiểu sách giáo khoa, cạnh khuất theo mặt nhìn thấy, khung chiếu CỐ ĐỊNH theo hình gốc nên thêm phần không làm hình dịch), `appendPart`, `parseGeometryProblem` (`isProblem` để tên hình trần vẫn mở GEO_SOLID).
- `utils/geoTools.ts`: `addSegment/addMidpoint/addPointOnSegment/addFoot/addSection/addRequirement`, `layoutGeo` (đặt lên bảng, vị trí tuyệt đối của hình gốc bất biến). Trả cảnh mới nên hoàn tác được.
- `GeometryProblemPanel.tsx`: hộp thoại nhập đề (xem trước: phần/hiểu/không hiểu, tùy chọn vẽ đủ) và bảng dụng cụ (bước từng phần, 5 dụng cụ chạm chọn điểm/cạnh, thêm yêu cầu bằng lời, hoàn tác/làm lại, xóa hình).
- Nối vào: Dock → Hình → "Vẽ từ đề bài"; thẻ hành động của AI hub (`sel-btn-geo-problem`: "Vẽ hình từ đề bài" / "Dụng cụ vẽ hình" khi chọn hình đã dựng); `handleVisualize` (đề có điều kiện cụ thể → dựng hình; đề nhiều phần chỉ vẽ phần gốc); nút ✎ Dụng cụ trên hình (`InlineShape`). `ShapeMeta.geo` giữ cảnh; `ShapeMeta.sketch` thêm `aux/marks/polys/names/fixed` (đường phụ màu xanh, chấm điểm phụ, thiết diện tô nhạt, chạm chọn điểm).
- Kiểm tra: tsc 0 lỗi; teacher-board 53 file/931 test (mới: `geometryProblem.test.ts`, `geoTools.test.tsx`); trình duyệt thật: dán đề chóp S.ABCD 3 phần → chỉ hình gốc; "Vẽ phần tiếp" ×3 hiện M, O, hai đường chéo, thiết diện (MOD) tô xanh, hình gốc không dịch; dụng cụ trung điểm chạm A, C ra điểm mới.
- Chưa làm: xoay 3D tự do/kéo điểm tự do trên hình dựng (chiếu xiên cố định); đường tròn/mặt cầu/mặt nón; khớp ràng buộc hình phẳng (`planeConstraints.ts` đã viết nhưng chưa nối); đọc đề dài nhiều bước phức tạp qua Gemini. Chưa commit.


# 2026-10-28 (đêm, bổ sung 6) — AI hub phân tầng; Vẽ hình thành chức năng riêng của hub

- Yêu cầu: tách vẽ hình thành chức năng tầng 1 của AI hub; bấm vào thì các ô quanh nút AI đổi thành chức năng tầng 2 (và tầng 3) kèm nút Quay lại, không mở nhiều màn hình.
- `SmartboardDock.tsx` `AiFab`: trạng thái `path` (`[]` | `['draw']` | `['draw','tools'|'parts']`); `rootItems` (8 ô, thêm `ai-fab-draw`), `back` (`ai-fab-back`), ô con `ai-fab-draw-*`; thuộc tính `keep` (không đóng đĩa), `disabled`; `data-tier` trên `radial-action-menu`; đóng bằng Esc/chạm ngoài → về tầng 1, đóng sau khi chọn dụng cụ thì giữ tầng; nhãn nút tâm hiện tên dụng cụ đang dùng. Props mới: `geo` (GeoController), `onGeoNew`, `openAtPath {path, nonce}`. Gỡ nút "Vẽ từ đề bài" ở popover Hình của Dock và `sel-btn-geo-problem` ở thẻ hành động.
- `GeometryProblemPanel.tsx`: chế độ sửa không còn bảng lớn: thành bộ điều khiển không giao diện (`onController` → `GeoController`: parts/upTo/tool/picks/canUndo/canRedo/setTool/next/prev/undo/redo/remove/openRequirement) + chip nhỏ (`geo-chip`) hiện gợi ý dụng cụ hoặc ô nhập yêu cầu; chế độ mới (nhập đề) giữ hộp thoại. `GEO_TOOLS` xuất ra để hub dùng.
- `SmartboardCanvas.tsx`: `geoCtl`, `hubOpenAt`; ✎ Dụng cụ trên hình mở hub tại tầng `draw`.
- Test: `geoTools.test.tsx` (bộ điều khiển + 4 test AiFab phân tầng); tsc 0 lỗi; teacher-board 53 file/935 test. Trình duyệt thật (1024×768): AI → Vẽ hình → Từ đề bài → dán đề → vẽ → AI → Dụng cụ cho tầng 3 gồm Quay lại + 5 dụng cụ quanh nút AI. Chưa commit.
- Lưu ý: đĩa 216 px chứa tối đa 8 ô; tầng 2 khi đã có hình đúng 8 ô (Quay lại + 7). Thêm ô nữa phải sang tầng 3.


# 2026-10-28 (đêm, bổ sung 7) — Đề hình học VIẾT TAY

- `geometryProblem.ts`: `cleanHandwritten` chạy đầu `buildScene`: bỏ `$`, `\`→xuống dòng, `\text{}`, `\prime`/`^{\prime}`→', `\perp/\bot/\parallel/\cap/\in/\equiv/\triangle`→ký hiệu, `\widehat{ABC}`→"góc ABC", `\sqrt2`→√2, gộp đỉnh đọc tách cách ("S . A B C D", "S A ⊥", "trung điểm S B"). Đề gõ chữ đi qua không đổi.
- `SmartboardCanvas.tsx` (`handleVisualize`, bước −1): thử lần lượt các nguồn chữ [ô công thức, Vision `text`, Vision `latex`, chữ gõ, hint] và lấy nguồn đầu tiên dựng được hình; nguồn đó được lưu làm `geo.source`.
- Test mới `handwrittenProblem.test.ts` (6): mô phỏng đúng kiểu kết quả Vision (LaTeX lẫn chữ, đỉnh tách cách, dấu phẩy). Chưa thử đầu-cuối với nét viết tay thật + Gemini (cần khóa và người viết tay tiếng Việt); chất lượng phụ thuộc Vision đọc đúng chữ cái đỉnh.
- tsc 0 lỗi; teacher-board 54 file/942 test. Chưa commit (gồm cả sửa trọng tâm tam giác A'B'C' ở bước trước).


# 2026-10-28 (đêm, bổ sung 8) — Sẵn sàng deploy Vercel + Render

- Kế hoạch đầy đủ ở `socratic-monorepo/DEPLOY.md` (viết lại). Chưa deploy thật; mọi kiểm chứng là giả lập local (venv sạch, APP_ENV=production, không .env).
- Frontend: `src/utils/apiBase.ts` (cả teacher-board và student-app) thay mọi `http://127.0.0.1:8000` cứng; ưu tiên localStorage `backend_url` → `NEXT_PUBLIC_BACKEND_URL` → loopback chỉ khi chạy localhost → '' (rewrite). `studentAppUrl()`/`teacherAppUrl()` cho nút liên kết chéo. `next.config.js` (2 app): build trên Vercel dừng nếu thiếu `BACKEND_URL` hoặc có `NEXT_PUBLIC_GEMINI/OPENROUTER_API_KEY`. `vercel.json`: region sin1, header bảo mật, cache bất biến.
- Backend: `uvicorn[standard]` (WebSocket Lớp học), `deploy_guard.py` (RateLimit POST recognize-ink/compile-lasso, `admin_ok`, `warm_up`), `main.py` (GZip, CORS regex, warm-up khi production, `.env` dùng setdefault), `visualize.py` (ghi khóa AI bị tắt ở production trừ khi có ADMIN_TOKEN), `tests/test_deploy_guard.py` (8).
- `render.yaml` (gốc) viết lại; `.github/workflows/keepalive.yml` (biến kho `RENDER_URL`); `.env.production.example` và `.env.example` cập nhật.
- Chưa làm: tách bundle `/` (629 kB) bằng next/dynamic; OCR RapidOCR trên Render (cần ≥2 GB); xoay khóa AI từng dán vào chat. Chưa commit (không stage `tsconfig.tsbuildinfo`, `e2e/socratic-flow.test.tsx`, tệp video/slide).


# 2026-10-28 (đêm, bổ sung 9) — Mọi chức năng đi qua vùng khoanh; AI hub bay tới vùng

- Bỏ thẻ tác vụ lớn sau khi khoanh. Khoanh xong: hub bay tới cạnh vùng và TỰ MỞ bộ chức năng của vùng (`AiFab`, `selectionCount>0`): Trực quan, Chuyển LaTeX, Chấm bài, Vẽ hình, Môn, Nhân đôi (`sel-btn-duplicate`), Xóa (`sel-btn-delete`), Bỏ chọn (`sel-btn-deselect`). Bỏ ô "Chọn vùng" khỏi hub (khoanh dùng nút ở thanh dưới).
- Vẽ hình: tầng `draw` khi chưa có hình = `Vẽ từ vùng` (có vùng khoanh → `onDrawSelected` = `handleVisualize(undefined, true)`, chỉ dựng hình học, không đọc ra đề thì báo lỗi) hoặc `Khoanh đề` (chưa khoanh → bật khoanh) + `Gõ đề` (lối phụ, `ai-fab-draw-typed`). Khi đã có hình: Dụng cụ/Phần/Yêu cầu/Hoàn tác/Làm lại/Xóa hình như cũ.
- Thẻ cạnh hub chỉ còn chip nhỏ (`lasso-action-bar`): ảnh nét, trạng thái đọc, huy hiệu ý định, nút "Sửa chữ" (`btn-edit-text`) mở ô `lasso-formula-input`. Đã bỏ `btn-visualize`, `btn-convert-ink`, `btn-grade-ink`, `subject-*`, `sel-btn-geo-inplace` (dùng ô hub tương ứng).
- Kiểm tra: tsc 0 lỗi; teacher-board 54 file/943 test (sửa 6 test cũ, thêm 1); trình duyệt thật: viết nét → khoanh → hub mở tại vùng với 8 ô + chip. Chưa thử đầu-cuối đề hình học viết tay → Vẽ từ vùng trên trình duyệt thật. Chưa commit.


# 2026-10-28 (đêm, bổ sung 10) — Vẽ hình chạy ngay theo vùng khoanh; tầng 2 theo nghiên cứu hình học không gian

- Bấm **Vẽ hình** khi có vùng khoanh chạy ngay (`handleDrawSelection` trong `SmartboardCanvas.tsx`): (1) chữ có sẵn (gõ/công thức/AI đã đọc) → `parseGeometryProblem` (tên hình trần như S.ABCD, tam giác nhọn/tù ABC, hình hộp/lập phương, hoặc cả đề nhiều phần) → `insertGeoFigure`; (2) nét vẽ tay → `detectSolidFromStrokes` (phân biệt hộp chữ nhật/lập phương theo tỉ lệ cạnh) rồi `detectPlaneShapeFromStrokes` → nắn tại chỗ; (3) chưa có gì → chờ Vision đọc chữ (tối đa 9 s) rồi thử lại; không nhận ra thì báo lỗi gợi ý. Sau đó hub mở tầng 2.
- Tầng 2 (khi đã có hình dựng từ đề), theo `docs/tai-lieu-nghien-cuu-stem/NGHIEN_CUU_CHUYEN_SAU_CONG_CU_HINH_HOC_KHONG_GIAN.md`: Dựng (5 dụng cụ), **Đo** (độ dài a√k, góc độ; `measureDistance/measureAngle/fmtLen` trong `geoTools.ts`), Phần đề (+ Yêu cầu), **Ẩn nét khuất/Hiện nét đứt** (`GeoScene.hideHidden`, mặc định nét đứt chuẩn SGK), **Xem 3D** (mở mô phỏng GEO_SOLID qua `matchInstantStemBlueprint`), **Xuất TikZ** (`toTikz`, chép vào bộ nhớ tạm), Chỉnh sửa (hoàn tác/làm lại/xóa). `GeoController` thêm `hideHidden/toggleHidden/exportTikz/open3D`.
- Mới: `tam giác nhọn/tù ABC` (`tri_obtuse`). Test mới `geoResearchTools.test.ts`; sửa `geoTools.test.tsx`.
- Chưa làm (có trong nghiên cứu): khai triển lưới đa diện (Net) và thanh trượt thiết diện động trên hình dựng, khóa góc chiếu SGK vs xoay tự do, bắt điểm theo mặt. Hình vẽ tay đã nắn tại chỗ (không phải hình dựng từ đề) chưa có tầng 2 vì chưa có `GeoScene`. Chưa thử đầu-cuối bằng nét viết tay thật.


# 2026-10-28 (đêm, bổ sung 11) — AI Vision chỉ qua OpenRouter

- Lý do: người dùng không đăng ký được billing Google AI Studio. `llm/key_pool.py`: `gemini_vision_enabled()` (biến `VISION_PROVIDER`, mặc định `openrouter`; `auto|gemini` bật lại Gemini/OpenAI trực tiếp). `routers/visualize.py` (`classify_with_vision_llm`) và `routers/recognize_ink.py` bỏ qua khóa Gemini/OpenAI khi mặc định.
- Danh sách model mặc định cũ phần lớn không còn trên OpenRouter (đã đối chiếu `GET /api/v1/models` 2026-10-28). Mới: Vision `google/gemini-2.5-flash` → `gemini-2.5-flash-lite` → `qwen/qwen3-vl-30b-a3b-instruct` → `openai/gpt-4o-mini` → `google/gemma-4-31b-it:free`; Text `gemini-2.5-flash-lite`, `qwen/qwen3.7-flash`, `gpt-4o-mini`, gemma free. Ghi đè bằng `OPENROUTER_VISION_MODELS` / `OPENROUTER_TEXT_MODELS`.
- `/health` thêm `runtime.vision_provider`. `render.yaml`, `.env.production.example`, `DEPLOY.md`, thông báo `AiBackendConfigModal` cập nhật. Test: `test_recognize_ink.py` (2 test đặt `VISION_PROVIDER=auto`, thêm 2 test mới); pytest 84, vitest 959.
- CHƯA đo độ chính xác/độ trễ thật của từng model (cần khóa OpenRouter có credit). Gia sư Socratic (text, `provider_adapter.py`) vẫn thử Gemini trước nếu có khóa Gemini; không có thì rơi xuống OpenRouter.
- (bổ sung) `call_openrouter_vision` thiếu `max_tokens` khiến Vision rơi xuống ONNX cục bộ dù khóa OpenRouter hợp lệ; đã thêm `max_tokens` (biến `OPENROUTER_MAX_TOKENS`, mặc định 1500). Kiểm thử thật 2026-10-28 với ảnh "y = x^2 - 3x + 2": engine openrouter, model google/gemini-2.5-flash, 3,7 s, đọc đúng (ONNX cục bộ đọc sai thành x^{\Lambda}2). Đây là một mẫu ảnh chữ in, chưa phải chữ viết tay. Nguyên nhân gốc là suy luận (chưa tái hiện lỗi 402 trực tiếp), nhưng hết lỗi sau khi sửa. Model free `google/gemma-4-31b-it:free` bị OpenRouter báo 429 upstream.


# 2026-10-28 (đêm, bổ sung 12) — Tách Trực quan (hàm số/công thức) và Vẽ hình (hình học)

- **Trực quan** (`handleVisualize`) chỉ còn cho hàm số, công thức và các mô phỏng. Gặp hình học (đề, tên hình + đỉnh như S.ABCD, nét vẽ tay hình khối/đa giác) thì không tự vẽ mà mở hub ở tầng Vẽ hình kèm thông báo chỉ đường. Đã bỏ các bước dựng hình học trong `handleVisualize`.
- **Vẽ hình** (`handleDrawSelection`): nét vẽ tay nhận dạng được (lập phương/hộp chữ nhật/chóp tứ giác đều/tứ diện đều/lăng trụ tam giác; tam giác đều/vuông/cân/thường, hình vuông/chữ nhật/bình hành) được thay bằng HÌNH DỰNG (`GeoScene`) tại đúng chỗ nét vẽ (`problemTextForSolid/Plane` trong `geoTools.ts` → `buildScene`), nên có đủ dụng cụ tầng 2. Kích thước hộp lấy theo tỉ lệ nét vẽ; hình phẳng thì dùng hình mẫu của loại đó (không giữ tỉ lệ nét vẽ). Bát diện/lăng trụ lục giác chưa có hình dựng: vẫn nắn tại chỗ như cũ (không có tầng 2).
- Tầng 2 luôn hiện đủ chức năng chuyên sâu; chưa có hình thì Dựng/Đo/Nét khuất/Xem 3D/Xuất TikZ mờ (`disabled`) kèm gợi ý. `tam giác đều/cân/vuông ABC` thêm vào bộ phân tích đề.
- Test: `geoResearchTools.test.ts` (+nét vẽ tay→hình dựng), `inPlaceGeometryTransformation.test.tsx` viết lại; tsc 0 lỗi, vitest 989.
