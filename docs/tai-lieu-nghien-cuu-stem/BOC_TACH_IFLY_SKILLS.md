# Bóc tách `iflytek/iFly-Skills` (11/11/2026)

Nguồn: https://github.com/iflytek/iFly-Skills (Apache-2.0, bản clone nông ở `iflytek_skills_src/repo/`, 273 tệp, 4,9 MB). Đây là kho "skill" của iFLYTEK cho hệ sinh thái agent, không phải sản phẩm giáo dục. Giá trị với dự án của chúng ta nằm ở **cách đóng gói và kỷ luật vận hành**, không ở các năng lực AI (tiếng Trung, cần khóa iFlytek).

## 1. Cấu trúc kho

| Phần | Nội dung |
|---|---|
| `skills/` (11 skill) | Hyper TTS, Voice Clone TTS, Speed Transcription (1 giờ âm thanh ≈ 20 giây, 202 phương ngữ), Translate, Video Translate (lồng tiếng), Image Understanding, PDF/Image OCR, Invoice OCR, Text Proofread (công văn: lỗi chính tả, tên riêng, từ cấm), **Contract Intelligence Review** (quy trình nhiều bước), **Animated Sketch Diagram** (sơ đồ hoạt hình nét tay, xuất GIF) |
| `integrations/coze/` | Backend FastAPI bọc 11 skill thành 24 công cụ HTTP + OpenAPI cho từng skill; ~3.300 dòng, có hàng đợi tác vụ, giới hạn, xác thực, nhiều test |
| `packages/n8n-nodes-iflytek/` | 11 node n8n (npm), chạy skill Python như tiến trình con |
| `.github/workflows/` | `skill-lint` (SARIF), kiểm Python/Coze/n8n, phát hành ClawHub, thưởng đóng góp |
| `tests/` | Kiểm tra ngoại tuyến việc di trú biến môi trường `IFLY_*` |

Mỗi skill là một thư mục tự đủ: `SKILL.md` (mô tả + khi nào dùng/không dùng + biến môi trường), `scripts/`, `_meta.json` (phiên bản), có khi có `examples/`, `templates/`, `tests/`.

## 2. Điểm mạnh đáng kế thừa

1. **Mã lỗi ổn định, tách khỏi lỗi thô của nhà cung cấp** (`errors.py`): 14 mã (`RATE_LIMITED`, `UPSTREAM_QUOTA_EXCEEDED`, `TIMEOUT`…), mỗi mã có HTTP status, thông điệp cố định và cờ `retryable`; mọi phản hồi kèm `trace_id` (cũng ở tiêu đề `X-Trace-Id`); nhật ký chỉ ghi `trace_id/operation/status/duration`, không ghi nội dung hay khóa.
2. **Khóa không lẫn nhóm**: đặt bất kỳ biến `IFLY_*` (kể cả rỗng) thì chỉ dùng nhóm đó, thiếu thì báo lỗi, không ghép chéo `IFLY_*` với `XFEI_*`. Có test riêng.
3. **Giới hạn nhỏ, có chặn bộ nhớ**: cửa sổ trượt theo khóa (`max_keys` loại cũ), cổng đồng thời theo khóa, thân yêu cầu ≤ 2 MB, hàng đợi tối đa 32 tác vụ.
4. **Tác vụ bất đồng bộ an toàn khi khởi động lại**: `request_fingerprint` (SHA-256 của yêu cầu đã chuẩn hóa, không chứa khóa) để idempotency, trạng thái có `submission_unknown` ("không chắc đã gửi chưa", dặn kiểm tra rồi mới gửi lại).
5. **Quy trình duyệt nhiều bước, trung thực về độ chắc chắn** (Contract Review): mỗi rủi ro có `source` ∈ {nguyên văn, suy luận, khuyến nghị}, `evidence` (trích nguyên văn), `confidence`, danh sách `uncertain_regions`/`human_review_flags`; luật (regex) chạy trước, LLM bổ sung; ghi rõ "When NOT to Use" và "chỉ là tham khảo, không phải ý kiến pháp lý".
6. **Quy trình tự kiểm tra bắt buộc** (Animated Sketch Diagram): sau khi xuất phải trích khung từ **sản phẩm cuối** (GIF), xem lại theo checklist (độ nét, bố cục, chuyển động, nội dung), sửa → xuất lại cho đến khi qua hết. Có "quy tắc đỏ" về mật độ bố cục và nhịp chuyển động (80–150 px/s).
7. **Kỷ luật phát hành**: mỗi skill có phiên bản; CI lint skill; docs vận hành (`operations.md`, `compatibility.md`, `RELEASING.md`).

## 3. Điểm yếu / không phù hợp

- Toàn bộ năng lực nằm sau khóa iFlytek (tiếng Trung là chính), không dùng trực tiếp được cho tiếng Việt, toán/LaTeX hay giáo dục.
- Backend dùng SQLite + một tiến trình/thư mục dữ liệu ("không đặt nhiều worker"), không scale ngang; giống hạn chế đã ghi cho `console.db` của ta.
- Contract Review: luật và từ khóa cố định, `confidence` khởi tạo 1,0 rồi trừ; chưa có đánh giá định lượng nào trong kho.
- Beta, "format có thể đổi không báo trước".

## 4. Đối chiếu với dự án của ta và việc đã/sẽ làm

| Bài học | Hiện trạng của ta | Hành động |
|---|---|---|
| Mã lỗi ổn định + `retryable` + `trace_id` | 429 của `deploy_guard` chỉ có `detail`; các router khác trả `detail` tự do | **Đã làm** cho 429 (`code`, `retryable`, `retry_after`, `trace_id`, tiêu đề `x-trace-id`, giữ `detail` cũ để frontend không vỡ). Mở rộng ra các lỗi 503/AI còn lại: chưa làm |
| Nhãn nguồn + bằng chứng + cần người duyệt | `ask-board` đã lọc `used/highlights` theo id có thật; `similar-problems` có `verified/unverified` | Đề xuất: thêm `source: fact\|inference` cho từng bước trả lời, `needs_review` khi mô hình không chắc. Chưa làm |
| Tự kiểm tra trên sản phẩm cuối | Quy trình video/slide của ta đã có checklist; engine mô phỏng chưa có kiểm tra khung hình tự động | Đề xuất: chụp khung hình mô phỏng/hình dựng và so với số đo mô hình trong test |
| Khóa không lẫn nhóm | Khóa Gemini/OpenRouter đi theo tiêu đề từng yêu cầu (đã chặn ký tự xuống dòng) | Đã đủ; không đổi |
| Giới hạn có chặn bộ nhớ, thân ≤ 2 MB | `RateLimitMiddleware` có dọn IP > 5.000; chưa giới hạn kích thước thân | Đề xuất: giới hạn thân cho các điểm cuối AI (cẩn thận payload nét vẽ) |
| Idempotency/`submission_unknown` | Nộp bài BYOD ghi đè bản nộp cũ theo học sinh | Chưa cần; ghi lại cho khi chuyển hub sang Postgres |
| Đóng gói skill có "khi nào dùng / không dùng" | Các skill video của ta đã theo mẫu này | Không đổi |

## 5. Kết luận

Kho này dạy cách **vận hành dịch vụ AI nhỏ cho đáng tin**: lỗi có mã, mọi thứ có vết, nói rõ chỗ nào là suy luận, và không giao sản phẩm khi chưa xem lại thành phẩm. Ta đã lấy phần rẻ nhất (mã lỗi 429 có cấu trúc); phần "nhãn nguồn/bằng chứng" là bước tiếp theo đáng làm nhất vì khớp với lợi thế Socratic của ta (AI không bịa số liệu).
