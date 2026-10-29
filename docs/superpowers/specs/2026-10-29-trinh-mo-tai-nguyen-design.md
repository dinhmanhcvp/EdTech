# Trình mở tài nguyên trên bảng: slide, bài tập, đề — thu phóng, viết đè, đưa lên bảng

Ngày: 2026-10-29 · Trạng thái: chờ duyệt · Phụ lục của `docs/superpowers/specs/2026-10-29-bai-tap-trong-tiet-design.md` (dùng lại tải file → trang ảnh, kiểm quyền tải ảnh, nối console ↔ hub).

## 1. Mục tiêu và tiêu chí thành công

Giáo viên mở mọi tài nguyên của đỉnh 1 lên bảng (đỉnh 2), thu phóng, viết đè, đưa trang lên bảng; học sinh (đỉnh 3) xem lại tài liệu đã dùng trong tiết.

Kịch bản thành công:
1. Trên console, giáo viên tải `bai-giang.pdf` (12 trang) làm **slide**; tải một đề kiểm tra PDF (đã có từ spec bài tập).
2. Bảng đã ghép tiết: ngăn **"Tài nguyên"** có tab Slide / Bài tập / Đề; mở slide → trình xem toàn màn hình.
3. Chụm hai ngón (hoặc cuộn chuột, nút +/−) phóng 0,5–5 lần quanh điểm chụm; kéo để di chuyển; chạm đúp vừa màn hình; mũi tên / dải ảnh thu nhỏ để đổi trang. Chuyển động mượt (≥ 50 fps trên bảng 1080p).
4. Viết bút lên trang 3 → đóng → mở lại: nét vẫn còn (lưu theo tiết). Bấm **"Đưa trang này lên bảng"** → bảng có trang mới chứa ảnh trang 3 + các nét đó; chọn/di chuyển/tẩy ảnh được như công thức.
5. Mở đề: danh sách câu bên cạnh; chạm "Câu 3" → phóng tới khung câu 3; **"Giao bài"** → QR (dùng API lượt giao đã có).
6. Hết tiết, học sinh lớp đó thấy mục **"Tài liệu của tiết"** với slide/đề đã mở, xem được từng trang (thu phóng trên điện thoại).

## 2. Thiết kế

### 2.1 Dữ liệu (hub)

- **Slide là một loại tài nguyên trong bảng `assignments`**: `kind ∈ exercise | exam | slides`. Với `slides`, `questions` được phép rỗng (0–40); với `exercise`/`exam` vẫn 1–40 như cũ. Dùng lại nguyên tải lên, trang, tệp, quyền.
- `DELETE /assignments/{id}` (giáo viên): xóa tài nguyên chưa từng được giao (`assignment_runs` không có dòng nào) — 409 `in_use` nếu đã giao.
- Bảng mới `resource_uses (period_id, assignment_id, opened_at, PRIMARY KEY(period_id, assignment_id))`: bảng ghi khi mở (`POST /board/resources/{id}/open`).
- Bảng mới `resource_annotations (period_id, assignment_id, page, strokes, updated_at, PRIMARY KEY(period_id, assignment_id, page))`: nét viết đè theo tiết. `GET|PUT /board/resources/{id}/pages/{n}/annotations {strokes}` (≤ 500 nét, tọa độ 0–1 theo ảnh trang).
- Quyền ảnh trang (`GET /files/page/{id}/{n}`): thêm học sinh có lớp đã dùng tài nguyên đó trong một tiết (qua `resource_uses` + tiết console của lớp đã liên kết).
- `GET /me/resources` (học sinh): `[{assignmentId, title, kind, pages, openedAt, periodTitle}]` các tài nguyên đã mở trong các tiết của lớp em, mới nhất trước.

### 2.2 Bảng (đỉnh 2)

Người dùng cho phép làm cả phần của teammate (console, bảng): được sửa code bảng/console khi cần, nhưng mọi hành vi và test hiện có phải giữ nguyên (chạy lại toàn bộ vitest của app sau mỗi bước).

- `components/resources/ResourcePanel.tsx` (ngăn trong thanh bên, như `LessonLibraryPanel`): chưa ghép → "Ghép bảng với tiết để mở tài nguyên"; đã ghép → tab Slide / Bài tập / Đề (`GET /hub/board/assignments`, lọc theo `kind`).
- `components/resources/ResourceViewer.tsx` (lớp phủ toàn màn hình):
  - Ảnh trang tải bằng `fetch` + `X-Board-Token` → object URL (bộ nhớ đệm theo `assignmentId:page`, thu hồi khi đóng).
  - Thu phóng/di chuyển bằng CSS `transform` + Pointer Events (không thêm thư viện); logic thuần trong `utils/viewport.ts`: `clampScale`, `zoomAt(view, point, factor)`, `fitTo(page, screen)`, `panBy`, `focusBox(box, page, screen)`.
  - Lớp nét viết đè (SVG) theo tọa độ trang 0–1; tự lưu (debounce 1 s) qua API annotations.
  - Bài tập/đề: danh sách câu (nhãn + loại), chạm → `focusBox`; nút "Giao bài" → `POST /hub/board/runs` → QR (thư viện `qrcode` sẵn có), "Đóng nhận bài".
  - "Đưa trang này lên bảng" → gọi `onInsertPage(page)` của `SmartboardCanvas`.
- **Đối tượng ảnh trên bảng**: `Stroke.image?: {assignmentId: string; page: number; w: number; h: number}` (khung trong tọa độ bảng; `points[0]` là góc trên trái, `typeset.w/h` để chọn/tẩy/di chuyển như công thức). `SmartboardCanvas` vẽ ảnh qua bộ nhớ đệm object URL ở trên; không tải được (bảng đã ngắt ghép) → khung xám ghi tên tài nguyên + trang. Chèn: trang bảng mới, ảnh vừa khung 1200×675 giữ tỉ lệ, nét viết đè chuyển sang tọa độ bảng thành nét thường.
- Ảnh chụp bảng theo tiết (`PUT /api/v1/board/snapshot`) tự mang đối tượng ảnh (JSON nét), nên console xem lại tiết thấy được khi có quyền.

### 2.3 Console (đỉnh 1)

- Trang mới `app/resources/page.tsx` + mục menu "Tài nguyên": tải lên (chọn loại Slide / Bài tập / Đề, môn, tên), lọc theo loại/môn/từ khóa, ảnh thu nhỏ trang đầu, xóa (khi chưa giao). Bài tập/đề mở sang màn duyệt câu (bước 3 của spec bài tập).

### 2.4 Student-app (đỉnh 3)

- Mục **"Tài liệu của tiết"**: danh sách từ `GET /hub/me/resources`; mở → trình xem trang (cùng `viewport` logic, bản sao trong app học sinh vì app không import nhau), thu phóng bằng chụm ngón.

## 3. Lỗi

| Tình huống | Xử lý |
|---|---|
| Ảnh trang tải lỗi | ô xám "Không tải được trang n" + nút thử lại; các trang khác vẫn xem được |
| Bảng mất ghép khi đang mở | trình xem đóng, báo "Bảng đã ngắt ghép"; đối tượng ảnh trên bảng hiện khung xám |
| Lưu nét viết đè lỗi | giữ trong bộ nhớ, thử lại lần lưu sau; báo nhỏ "Chưa lưu được nét viết" |
| PDF slide > 20 trang | 422 `too_many_pages` (như bài tập); console gợi ý tách file |
| Xóa tài nguyên đã giao | 409 `in_use` |

## 4. Kiểm thử

- pytest: `slides` không cần câu; `exercise` vẫn bắt buộc ≥ 1 câu; mở tài nguyên ghi `resource_uses`; annotations lưu/đọc theo tiết, giới hạn nét, bảng khác tiết 404; học sinh cùng lớp xem trang sau khi tài nguyên được mở, lớp khác 404; `/me/resources`; xóa 409 khi đã giao.
- Vitest: `viewport.ts` (thu phóng quanh điểm giữ nguyên điểm dưới ngón tay, giới hạn 0,5–5, vừa màn hình, phóng tới khung câu); `ResourcePanel` (tab, chưa ghép); `ResourceViewer` (đổi trang, lưu nét có debounce, giao bài hiện QR); chèn trang tạo đối tượng ảnh + nét đúng tọa độ; console trang tài nguyên; student-app tài liệu của tiết.
- Kiểm tay trên trình duyệt: bảng 1920×1080, thu phóng/di chuyển bằng chuột và cảm ứng mô phỏng.

## 5. Ngoài phạm vi

Đồng bộ trang slide sang điện thoại học sinh theo thời gian thực; PowerPoint/Word gốc (xuất PDF); hiệu ứng chuyển slide; tìm chữ trong PDF.

## 6. Thứ tự

1. Backend: `slides`, xóa, `resource_uses`, annotations, quyền học sinh, `/me/resources` (+ hợp đồng TS).
2. Bảng: `viewport.ts`, `ResourcePanel`, `ResourceViewer`, đối tượng ảnh + chèn trang, giao bài/QR.
3. Console: trang Tài nguyên.
4. Student-app: Tài liệu của tiết.
