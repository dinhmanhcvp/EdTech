# Bóc tách GitHub iFLYTEK (github.com/iflytek) → kế thừa & khắc phục cho Socratic Vision Board

Ngày: 2026-11-11. Nguồn: GitHub API (danh sách 40 repo của tổ chức) + README của 10 repo quan trọng. **Chỉ đọc README, chưa đọc mã nguồn** – mọi nhận định về "điểm yếu" dựa trên tài liệu của chính họ. Số sao lấy từ API lúc đọc.

Kết hợp với `PHAN_TICH_4_VIDEO_DOI_THU_AI_BOARD.md` (bóc tách phía **sản phẩm bảng AI**). File này bóc tách phía **nền tảng/kỹ thuật mở**.

## 1. Bản đồ 40 repo (gom nhóm)

| Nhóm | Repo (sao) | Liên quan giáo dục? |
|---|---|---|
| Nền tảng agent | astron-agent (8.9k), astron-rpa (5.3k), astron-xmod-shim (101), astron-bifrost | Gián tiếp |
| Kỹ năng/registry | skillhub (5.4k), iFly-Skills (214) | **Có** – mô hình đóng gói kỹ năng |
| Trí nhớ agent | memflywheel (42) | **Có** – bộ nhớ gia sư |
| Nghiên cứu | DeepResearch (56) | **Có** – tạo tài liệu/đề có trích dẫn |
| Chuyển đổi DSL | agentbridge (23) | Thấp |
| Tài liệu | astron-harness-tutorial (363), website | **Có** – cách viết hướng dẫn |
| Mô hình nhỏ | domux (33), MiniRBT (307), cino (274) | **Có** – ý tưởng "mô hình nhỏ cho lệnh có cấu trúc" |
| MCP/tích hợp | ifly-workflow-mcp-server (28), ifly-spark-agent-mcp, dolphin-mcp-pilot | Thấp |
| Hạ tầng suy luận | aiges (254), sglang forks, DeepEP, prow, NetAxe, rdma_demo… | Không |
| SDK Spark | spark-ai-python (308), spark-ai-go, spark-ai-cli | Thấp (khoá vào hãng) |

Nhận xét chung: **iFLYTEK không có repo mã nguồn mở nào cho chính "AI Board"** – phần bảng thông minh là phần cứng + phần mềm đóng. Cái mở là hạ tầng agent. Nên "kế thừa" ở đây là kế thừa **mẫu thiết kế**, không phải mã.

## 2. Bóc tách từng repo: mạnh / yếu / áp dụng cho ta

### skillhub – kho kỹ năng tự host
- **Mạnh:** gói kỹ năng `SKILL.md` + phiên bản ngữ nghĩa + thẻ beta/stable; vai trò Owner/Admin/Member theo namespace; **kiểm duyệt trước khi lên phạm vi toàn cục**; nhật ký kiểm toán; tự host sau tường lửa.
- **Yếu (theo README):** mật khẩu admin mặc định công khai; không tương thích hoàn toàn khi đăng; ghim phiên bản không trọn vẹn; dựng lại dễ lấy artifact cũ.
- **Cho ta:** mô hình "thư viện bài giảng/mẫu mô phỏng" có **duyệt trước khi chia sẻ giữa các trường**. Ta đã có `LessonLibraryPanel` và 34/40 template; thiếu: phiên bản, vai trò, duyệt, nhật ký.
- **Khắc phục điểm yếu của họ:** không bao giờ có mật khẩu mặc định (ép tạo lần đầu); ghim phiên bản bằng hash nội dung.

### memflywheel – trí nhớ dạng file, kiểm toán được
- **Mạnh:** trí nhớ là Markdown (đọc được, diff được); chỉ mục `MEMORY.md` → nội dung → nguồn gốc; **mỗi ký ức truy được về bằng chứng**; trích xuất cuối lượt; "dream" gộp ký ức khi rảnh; lặp lại nhiều lần → đóng thành kỹ năng; không bắt buộc embedding.
- **Yếu:** không nêu giới hạn; không có số đo kết quả (chỉ có cách đánh giá); chỉ mục >200 dòng phải có embedding; phụ thuộc host.
- **Cho ta:** `bktEngine.ts` chỉ lưu xác suất thành thạo, **không lưu "vì sao"**. Có thể thêm hồ sơ học sinh dạng ghi chú: "hay nhầm dấu khi chuyển vế – bằng chứng: bài 12/10 bước 3". Giáo viên đọc/sửa được – hợp tinh thần "AI giải thích được" của ta và **hợp quy định dữ liệu học sinh** (xoá được từng dòng).
- **Điểm ta vượt họ:** ta có BKT định lượng; họ chỉ có ghi chú định tính. Kết hợp cả hai.

### DeepResearch – tìm kiếm tăng dần + kiểm chứng chéo
- **Mạnh:** lập kế hoạch → gọi công cụ → đánh giá lặp; **kiểm chứng chéo để giảm bịa**; mô hình nhỏ + lớn phối hợp để giảm chi phí; cấu hình theo từng module.
- **Yếu:** không có số đo chất lượng, chỉ có ví dụ; phụ thuộc Jina/Tavily + LLM ngoài; khuyến nghị mô hình suy luận đắt.
- **Cho ta:** tạo đề/lời giải từ SGK (`lesson_builder.py`, `lesson_llm.py`). Mẫu "sinh → kiểm chéo bằng nguồn thứ hai". **Ta đã mạnh hơn** ở chỗ có kiểm bằng ký hiệu (`symbolic/`, `formula_check.py`, `socratic_guard.py`) – kiểm chéo bằng toán thật, không chỉ bằng LLM thứ hai. Nên giữ và nhấn mạnh.

### domux – mô hình nhỏ ra lệnh có cấu trúc
- **Mạnh:** 7 trường cố định, ô trống `*`, lệnh ghép → nhiều dòng; công bố **98,37% chính xác, 100% đúng định dạng**, có bộ test + script đánh giá mở; mục tiêu <150 ms.
- **Yếu:** "nhẹ" nhưng cần ≥20 GB VRAM; phạm vi 4 loại thiết bị; chưa xử lý ý định mơ hồ; chưa công bố độ trễ đo thực.
- **Cho ta:** lệnh giọng nói/gõ trên bảng ("vẽ đường cao từ A", "cắt khối bằng mặt qua M, N, P") → bản ghi có cấu trúc. Ta đã có parser quy tắc (`geometryProblem.ts`, `geoNotation`). Học ở họ: **công bố bộ test + số chính xác/độ đúng định dạng có thể tái lập** – chính là điểm ta đang thiếu cho phần nhận lệnh (đã có benchmark độ trễ 12–25 ms).
- **Khắc phục điểm yếu:** chạy trên trình duyệt, không cần GPU, quy tắc + dự phòng LLM.

### astron-agent / astron-rpa – nền tảng workflow, RPA
- **Mạnh:** thiết kế workflow kéo-thả, kho công cụ, MCP, 300+ thao tác RPA.
- **Yếu:** chỉ Windows; cần ≥8 GB RAM; cài đặt nhiều bước, mật khẩu mặc định Casdoor; RAG/bộ nhớ không mô tả; hướng dẫn nhiều ở ngoài và bằng tiếng Trung.
- **Cho ta:** **không kế thừa** – quá nặng, đúng mục tiêu doanh nghiệp. Chỉ lấy một ý: giáo viên **nối chuỗi bước dạy** (mở bài → mô phỏng → câu hỏi → bài tập) kéo-thả. Ta có `PrepPanel`/`MicroLessonPanel`; có thể thành "chuỗi tiết học" – ưu tiên thấp.

### iFly-Skills – giọng nói, OCR, dịch
- **Mạnh:** mỗi kỹ năng một thư mục tự chứa; TTS/nhận giọng/OCR/dịch/chấm lỗi chính tả; nút n8n.
- **Yếu:** bản beta, đổi định dạng không báo; mỗi dịch vụ cần hạn mức riêng; không công bố độ chính xác, ngôn ngữ, giới hạn.
- **Cho ta:** hiện chỉ 2 file dùng giọng nói trình duyệt (`ConceptCheckGate`, `SmartboardCanvas`). Giọng nói là điểm yếu của ta so với V2 ("全自然交互": nói + viết + chạm). **Không** nên gọi dịch vụ giọng iFLYTEK (dữ liệu trẻ em ra nước ngoài, khoá nhà cung cấp); dùng Web Speech/Whisper cục bộ hoặc ElevenLabs bạn đang có.

### iFly-Skills – danh mục thật (đọc cây thư mục `skills/`)
11 kỹ năng: hyper-tts, voiceclone-tts, speed-transcription, pdf-image-ocr, ocr-invoice, image-understanding, translate, video-translate, text-proofread, contract-intelligence-review, animated-sketch-diagram. Thêm `integrations/coze`, `packages/n8n-nodes-iflytek`, `tests/`, giấy phép Apache-2.0, cần `IFLY_APP_ID/API_KEY/API_SECRET`.
- Dùng được cho ta: **ý tưởng** — mỗi kỹ năng có `SKILL.md` + `tests/` riêng (mẫu tốt cho hạng mục B: test theo từng tính năng); `animated-sketch-diagram` (sơ đồ tả tay động, một file HTML, xuất GIF) hợp làm hình minh hoạ hướng dẫn/hồ sơ.
- Không dùng: mọi kỹ năng giọng/OCR/dịch gửi dữ liệu lên đám mây iFLYTEK (học sinh nhỏ tuổi, khoá nhà cung cấp); ta đã có OCR và nhận dạng cục bộ.

### agentbridge – chuyển DSL giữa nền tảng
- **Mạnh:** pipeline parse → DSL thống nhất → kiểm 3 tầng → sinh; **không im lặng làm mất dữ liệu**: nút lạ thành "nút giữ chỗ" ghi rõ loại gốc, có báo cáo `--verbose`.
- **Yếu:** chỉ 7 loại nút; thay thế đổi hành vi; không hứa chuyển hai chiều không mất.
- **Cho ta:** nếu xuất/nhập bài giảng (GeoGebra, PDF, bản cũ) – dùng nguyên tắc **báo rõ chỗ mất**, thay vì lặng lẽ bỏ. Ưu tiên thấp.

### astron-harness-tutorial – cách viết hướng dẫn
- **Mạnh:** tổ chức **theo mục tiêu người dùng**, ảnh chụp đi cùng bước, song ngữ, có trợ lý hỏi đáp nhúng, **kiểm tra tự động hằng ngày xem tài liệu còn khớp giao diện**.
- **Yếu:** ảnh vẫn giao diện Trung; chỉ một sản phẩm được kiểm đầy đủ.
- **Cho ta:** `HUONG_DAN_VIET_DE_TRUC_QUAN` và bộ video demo – có thể tạo bộ hướng dẫn giáo viên có ảnh tự chụp lại bằng Puppeteer (bạn đã có `tools/demo-video`), kèm kiểm tra ảnh lỗi thời.

### aiges / sglang / DeepEP / prow…
Hạ tầng phục vụ mô hình lớn. **Không liên quan.** (`aiges` README không có trên nhánh `main` – 404, nên chưa đọc.)

## 3. Điểm mạnh chung của iFLYTEK (cần học) và điểm yếu chung (cần tránh)

**Học:**
1. Đóng gói tự chứa + phiên bản + duyệt (skillhub).
2. Trí nhớ có bằng chứng, người đọc được (memflywheel).
3. Công bố số đo + bộ test mở (domux) – tăng độ tin cậy với ban giám khảo.
4. Không lặng lẽ mất dữ liệu khi chuyển đổi (agentbridge).
5. Tài liệu theo mục tiêu người dùng, ảnh khớp bước, tự kiểm hằng ngày.
6. Mô hình nhỏ + lớn phối hợp để giảm chi phí.

**Tránh (điểm yếu lặp lại ở họ):**
- Mật khẩu mặc định / cài đặt nhiều bước → ta: tạo khoá lần đầu, một lệnh chạy.
- Khoá nhà cung cấp + dữ liệu ra ngoài → ta: chạy cục bộ trước, dự phòng đám mây (đã có `key_pool.py`, `deploy_guard.py`).
- Cần phần cứng/GPU/Windows → ta: trình duyệt + bảng thường.
- Tuyên bố không kèm số đo (DeepResearch, iFly-Skills, memflywheel) → ta: mọi tuyên bố có số + cách tái lập.
- Giao diện/tài liệu một ngôn ngữ → ta: tiếng Việt đầu tiên, có bản Anh cho thi quốc tế.

## 4. Đề xuất triển khai (xếp theo giá trị/chi phí)

| # | Việc | Học từ | Chạm vào | Độ khó |
|---|---|---|---|---|
| A | **Hồ sơ trí nhớ học sinh dạng Markdown có bằng chứng**, GV xem/sửa/xoá từng dòng, nối với BKT | memflywheel | `student-app/utils/bktEngine.ts`, `ai-engine/hub/learning.py`, `student_context.py` | Vừa |
| B | **Bộ test mở + báo cáo chính xác cho nhận lệnh/nhận dạng hình** (số đúng, đúng định dạng, độ trễ) | domux | `apps/teacher-board/src/__tests__`, `ai-engine/benchmarks` | Thấp |
| C | **Duyệt + phiên bản + nhật ký cho thư viện bài giảng dùng chung** (không mật khẩu mặc định) | skillhub | `LessonLibraryPanel`, `teacher-console`, `ai-engine/hub/auth.py`, `store/console_db.py` | Vừa–cao |
| D | **Kiểm chéo hai tầng khi sinh bài**: LLM → kiểm ký hiệu → nếu lệch thì gắn cờ cho GV (đã có nền) | DeepResearch | `lesson_builder.py`, `formula_check.py`, `socratic_guard.py` | Thấp–vừa |
| E | **Nhập/xuất bài giảng báo rõ chỗ mất** | agentbridge | khi làm xuất/nhập | Thấp (kèm khi cần) |
| F | **Hướng dẫn GV tự chụp ảnh + kiểm lỗi thời** | harness-tutorial | `tools/demo-video`, `docs/` | Thấp |
| G | **Giọng nói cục bộ** (nói + viết + chạm), không gửi dữ liệu trẻ em ra ngoài | iFly-Skills, V2 | `SmartboardCanvas` | Vừa |

Bỏ qua có chủ ý: RPA, nền tảng workflow doanh nghiệp, quan sát lớp bằng camera, dịch vụ giọng iFLYTEK (rủi ro quyền riêng tư và ngoài phạm vi).

## 4b. Gộp với bóc tách BC178.08 / board.hntech.dev (đối thủ KHKT Phú Thọ)

Nguồn: `docs/tai-lieu-nghien-cuu-stem/BOC_TACH_TOAN_DIEN_DU_AN_BC178_08.md` (đã đọc đủ) và `BOC_TACH_CHI_TIET_TUNG_CHUC_NANG_BOARD_HNTECH.md` (mới đọc mục lục). Đối thủ **gần ta hơn nhiều** so với iFLYTEK (cùng sân KHKT, cùng bảng + AI). Kiểm tra mã của ta cho thấy:

| Điểm mạnh của BC178.08 | Ta hiện có? | Nhận định |
|---|---|---|
| **AI điều khiển bảng bằng giao thức 18 công cụ** (`draw_function`, `cut_solid`, `fold_shape`, `read_board`…, vòng lặp tối đa 4 lượt) | **Không** thấy lớp function-calling/MCP nào trong `apps`, `services` | **Khoảng trống lớn nhất.** Ta có sẵn các động cơ (thiết diện, khai triển, đồ thị) nhưng AI chưa gọi được chúng. Khớp với kiến nghị #2 của chính báo cáo đó. |
| Bảng 1: 9 số đo độ trễ trên máy thật | Có benchmark 12–25 ms (`BENCHMARK_DO_TRE…md`) | Mở rộng thành bảng 9 tác vụ cùng định dạng (nhận hình, đồ thị, chấm bài, AI trả lời…). Học thêm từ domux: kèm script tái lập. |
| Phòng thi QR + 12 cờ gian lận, đề gửi về máy học sinh **đã lọc đáp án**, chấm ở server | Có lọc đáp án phía server (`hub/sessions.py`, `schemas.py`); phát hiện chuyển tab ở student-app | Thiếu: bộ cờ telemetry đầy đủ và bảng tổng hợp cho GV. Giữ nguyên tắc của họ: **không tự kết luận gian lận**. |
| Chỉ 7 hình nguyên thủy, JSON thuần, toạ độ tách khỏi khung nhìn | Tương đương | Không cần làm gì. |
| Tẩy theo khoảng cách tới đoạn thẳng | Đã có (commit "eraser kinds and sizes") | Ngang bằng. |
| Live2D "Cô Mai" + giọng thời gian thực | Không có Live2D; giọng chỉ qua Web Speech | Giá trị thi cao nhưng rủi ro riêng tư/chi phí. Làm bản nhẹ (avatar tĩnh/2D có biểu cảm `MOOD`) sau mục G. |
| 374 công cụ / 12 môn | 34/40 template, 10 engine STEM | Đừng chạy đua số lượng; nhấn **chiều sâu** (RK4, BKT). |
| Retrofit: khung IR USB + bảng phấn, 20 ms | Ta chạy trên smartboard/PC (xem `ARCHITECTURE.md`) | Chế độ nhập con trỏ đã có (pen/touch). Không cần camera. |

**Cẩn thận với ma trận ở mục 12 của báo cáo đó:** nó mô tả ta là "Vision-First (camera RGB)" – sai so với kiến trúc thật (bảng cảm ứng/trình duyệt, không camera). Nên sửa trước khi dùng trong hồ sơ/Q&A. Phần "ta vượt": Socratic guardrails, RK4, BKT – đúng với mã (`socratic_guard.py`, `bktEngine.ts`), giữ làm điểm nhấn.

### Thứ tự đề xuất sau khi gộp
1. **H – Lớp công cụ cho AI (MCP/function-calling) trên bảng** (mới, từ BC178.08): tách `draw_function`, `cut_solid`, `unfold`, `read_board`, `add_text`… thành schema Zod trong `packages/types`; vòng lặp ≤4 lượt; **Socratic guard vẫn chặn đáp số** (ta khác họ ở đây). Chạm `ai-engine/routers`, `SmartboardCanvas` – cần đọc HANDOFF/phân vùng trước.
2. **B** – bảng benchmark 9 tác vụ + bộ test mở (domux + Bảng 1).
3. **D** – kiểm chéo ký hiệu khi sinh bài.
4. **A** – trí nhớ học sinh có bằng chứng.
5. Telemetry 12 cờ gian lận (nếu bài kiểm tra là trọng tâm).
6. **C, F, G, avatar** – sau.

## 5. Giới hạn của bản bóc tách này
- Chỉ đọc README (qua công cụ tóm tắt), **không đọc mã** → có thể bỏ sót chi tiết; điểm yếu là điểm họ tự nêu hoặc suy ra từ thiếu sót tài liệu.
- Chưa đọc: iFly-Skills chi tiết từng kỹ năng, `aiges` (404), spark-ai-*, các fork hạ tầng.
- Chưa kiểm tra giấy phép từng repo (astron-agent, iFly-Skills: Apache 2.0; astron-rpa: chưa rõ).
- Đối chiếu "ta đã có gì" dựa trên tìm kiếm mã nhanh, chưa đọc từng module.
