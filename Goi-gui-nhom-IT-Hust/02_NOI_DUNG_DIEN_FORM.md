# Nội dung điền form đăng ký Hanovation

Form: https://hanovation.vn (mục Sáng tạo trẻ Hà Nội 2026 → Đăng ký). Tên ô dưới đây theo form mà hồ sơ BrandFlow đã dùng; nếu form thật khác, lấy nội dung tương ứng. Chưa đối chiếu được với biểu mẫu thật, nên nếu form có ô khác thì lấy nội dung tương ứng ở các mục bên dưới.
Thông tin thành viên đã điền sẵn. Chỉ cần kiểm tra lại họ tên, lớp, MSSV, điện thoại, email của từng người trước khi nhập vào form.

---

## Phần 00 · Cơ sở đề cử

| Trường | Điền |
|---|---|
| Bảng dự thi | **Bảng B** (sinh viên đại học) |
| Tên cơ sở giáo dục | **Đại học Bách khoa Hà Nội** (nếu không có trong danh sách thì chọn "Khác" và nhập tên đầy đủ) |
| Hình thức dự thi | **Nhóm** (tối đa 5 thành viên, cùng một bảng) hoặc cá nhân nếu chỉ có một sinh viên |

## Phần 01 · Thông tin nhóm

| Trường | Điền |
|---|---|
| Tên nhóm | **IT-Hust** |
| Người đại diện | **Phan Trọng Đạt** (MSSV 20235033, KHMT-05 – K68): là đầu mối làm việc với trường và Ban Tổ chức |
| Giáo viên / cố vấn | **Phùng Văn Kiệm**, giáo viên Tin học, Trường THPT Chuyên Vĩnh Phúc, kiempv@cvp.vn. Là cố vấn, không tính là thành viên dự thi |

| STT | Họ và tên | Lớp | Mã số SV | Điện thoại | Email | Vai trò thực tế |
|---|---|---|---|---|---|---|
| 1 | Phan Trọng Đạt | KHMT-05 – K68 | 20235033 | 0382977551 | dat.pt235033@sis.hust.edu.vn | Trưởng nhóm; kiến trúc AI, đường ống đọc nét khoanh, SymPy và bộ chặn xin đáp án; điều phối thực nghiệm sư phạm |
| 2 | Lê Trường Giang | KTMT-04 (IT2-04) – K68 | 20235317 | 0865499124 | giang.lt235317@sis.hust.edu.vn | Bốn bộ máy mô phỏng 60 FPS, bộ giải RK4, giản đồ Fresnel, mô hình 3D, gỡ lỗi thị giác |
| 3 | Đỗ Đình Vũ | KTMT-04 – K68 | 20235460 | 0862407533 | vu.dd235460@sis.hust.edu.vn | Lõi bảng viết độ trễ thấp, $1 Unistroke, Magic Lasso, xuất ảnh < 8 KB, giao diện và thanh trượt |
| 4 | Phạm Ngọc Tuyên | KTMT-04 – K68 | 20235455 | 0942912186 | tuyendznha01@gmail.com (email cá nhân; nên bổ sung email trường nếu em có) | Kho gợi mở ChromaDB, vở ghi QR, bản đồ nhiệt giáo viên, chỉ số kiên trì |

Nhóm **IT-Hust**, 4 thành viên, người đại diện **Phan Trọng Đạt**.

Vai trò của từng người cũng có trong **mục 10 của thuyết minh PDF**. Ban giám khảo chấm "tính xác thực của phần đóng góp" (Điều 8), nên mỗi bạn phải đọc phần của mình và giải thích được.

## Phần 02 · Giải pháp và phân loại

**Tóm tắt giải pháp** (khoảng 230 từ, dưới 2.000 ký tự; dán nguyên):

```
Socratic Vision Board (AXIOMA) là bảng tương tác thông minh kèm gia sư Socratic cho Toán, Lý, Hóa, Sinh THPT. Nó giải hai vấn đề: màn hình tương tác của trường chủ yếu chiếu slide tĩnh, còn học sinh ở nhà dùng chatbot để lấy lời giải; dựng một mô phỏng cho một tiết mất trung bình 38,5 phút.

Trên lớp, giáo viên viết tay trên bảng, nét chữ được nhận dạng ngay tại máy, không gọi AI. Khi khoanh một công thức, hệ thống chỉ gửi đúng nét được khoanh (ảnh dưới 8 KB) cho Gemini Flash một lần; AI đóng vai trình biên dịch trả về công thức, tham số và câu hỏi Socratic dưới dạng JSON. Trình duyệt dựng mô phỏng 60 khung hình/giây bằng bốn bộ máy Toán, Lý, Hóa, Sinh; kéo thanh trượt không gọi lại AI. Khi tự học, học sinh gặp gia sư Socratic có chủ ý tạo ma sát nhận thức: bước sau bị khóa đến khi bước trước đúng, không dán được đáp án, SymPy chấm từng bước, AI chỉ đặt câu hỏi và không nói đáp án.

Thí điểm 4 tuần, có nhóm đối chứng, 86 học sinh lớp 11 và 12: điểm bài sau 7,74 so với 6,85 (d = 0,88; p = 0,0002); phần Đúng/Sai tăng thêm 25,8 điểm phần trăm; thời gian dựng mô phỏng giảm từ 38,5 xuống 4,2 phút mỗi tiết; chi phí AI khoảng 350 đồng mỗi tiết. Sản phẩm là MVP chạy trên màn hình tương tác sẵn có, chưa thu phí, hướng tới các trường THPT và sở giáo dục.
```

| Trường | Điền |
|---|---|
| Lĩnh vực | Đề xuất **(d) Công nghiệp văn hóa số, du lịch thông minh, giáo dục và giải pháp vì cộng đồng** (có nội dung "giáo dục, hỗ trợ học tập"). Phương án khác: (a) Công nghệ số, AI và đô thị thông minh. Điều 4.2 cho phép Ban Tổ chức điều chỉnh lĩnh vực nếu cần; lĩnh vực chỉ phục vụ phân loại, không ảnh hưởng giải thưởng |
| Mức độ hoàn thiện | **Thử nghiệm quy mô nhỏ**: MVP đã thí điểm 4 tuần có nhóm đối chứng (86 học sinh), chưa thương mại hóa. Nếu form có mục "đã có người dùng thực" và nhóm tự tin về dữ liệu thì chọn mục đó |
| Đã tham gia cuộc thi khác | **Phải khai đúng.** Cùng sản phẩm này đã/đang dự: (1) "Ngày hội nhà giáo sáng tạo với công nghệ số và AI 2026" (Bộ GD&ĐT, RMIT; tác giả Phùng Văn Kiệm); (2) cuộc thi "Ý tưởng sáng tạo EdTech 2026" nếu AXIOMA đã nộp ở đó **[ĐIỀN: xác nhận]**. Điều 10.2 chỉ cấm dùng nguyên trạng sản phẩm đã **đạt giải** ở cuộc thi cấp tỉnh, bộ, ngành Trung ương; hiện chưa có kết quả, nên khai rõ là "đang dự, chưa có kết quả" |

## Phần 03 · Tài liệu và minh chứng

| Trường | Tệp / nội dung |
|---|---|
| Thuyết minh dự án (PDF) | `01_FILE_UPLOAD/Thuyet_minh_du_an.pdf` (14 trang, 2,3 MB). **Điền các ô vàng trước khi nộp** |
| Link video demo | Không bắt buộc. **Bỏ trống lần này** (video hiện có do thầy Kiệm thuyết minh, chưa phù hợp để nhóm nộp) |
| Hình ảnh sản phẩm (tối đa 5 JPG/PNG, mỗi ảnh ≤ 2 MB) | 5 ảnh trong `01_FILE_UPLOAD/Hinh_anh_san_pham/` (mỗi ảnh 140–320 KB) |
| Tài liệu khác (tối đa 3 PDF, mỗi PDF ≤ 10 MB) | `01_FILE_UPLOAD/Tai_lieu_khac_AXIOMA_Slide.pdf` (12 slide) |
| Xác nhận của trường | Trường (Đại học Bách khoa Hà Nội) ký và đóng dấu/ký số; kèm phụ lục. Mẫu phụ lục: `03_PHU_LUC_DUA_CHO_TRUONG_KY.md`. **Phần này nhóm không làm thay được** |

## Phần 04 · Cam kết (tích đủ ba ô nếu đúng thực tế)

1. Trung thực và bản quyền: thông tin chính xác, sản phẩm do nhóm tạo ra, không vi phạm sở hữu trí tuệ của bên thứ ba.
2. Chấp hành Thể lệ.
3. Dữ liệu cá nhân: đồng ý cho xử lý và công bố họ tên, trường, hình ảnh; thí sinh dưới 18 tuổi cần cha mẹ hoặc người giám hộ đồng ý.

**Đọc kỹ điều 1:** toàn bộ số liệu và phần đóng góp trong hồ sơ phải thật. Thể lệ (Điều 10.4) cho Ban Tổ chức hủy kết quả và thu hồi giải thưởng nếu phát hiện khai gian.

## Kê khai sử dụng công cụ AI

Đã có ở mục 11 của thuyết minh. Nếu form có ô riêng, dán đoạn sau và điền ô vàng:

```
Có sử dụng công cụ AI.
- Trong sản phẩm: Google Gemini Flash đọc nét chữ được khoanh và sinh dữ liệu mô phỏng, câu hỏi gợi mở; SymPy kiểm tra đại số và thứ nguyên; nhận dạng nét $1 Unistroke chạy ngoại tuyến.
- Trong phát triển và làm hồ sơ: dùng trợ lý lập trình AI (Claude Code) hỗ trợ viết mã, dựng slide, poster, video và soạn tài liệu.
- Phần do thí sinh trực tiếp thực hiện: Đạt: kiến trúc AI, đường ống đọc nét khoanh, tầng kiểm tra SymPy, bộ chặn xin đáp án. Giang: bốn bộ máy mô phỏng 60 FPS, bộ giải RK4, mô hình 3D, gỡ lỗi thị giác. Vũ: bảng viết độ trễ thấp, nhận dạng nét, Magic Lasso, giao diện. Tuyên: kho gợi mở, vở ghi QR, bản đồ nhiệt.
- Nguồn dữ liệu, tài liệu: Chương trình GDPT 2018, cấu trúc đề thi tốt nghiệp THPT từ 2025; số liệu thí điểm 86 học sinh tại Trường THPT Chuyên Vĩnh Phúc.
```
