# Bóc tách 4 video đối thủ AI Board → điểm mạnh để kế thừa

Nguồn (thư mục `docs/`), xem bằng cách trích 20 khung hình/video + phóng to các khung then chốt (chưa nghe được lời thoại; chữ Trung Quốc trên màn hình đọc từ khung hình nên chỉ dùng làm tham khảo):

| # | Video | Thời lượng | Nội dung chính |
|---|---|---|---|
| V0 | Chinese AI Blackboard (Shorts, iFLYTEK) | 49 s | Giáo viên dùng bút trên bảng: vẽ tam giác, cắt, khối chóp, viết công thức ra đồ thị |
| V1 | Spark Smart Blackboard (triển lãm) | 59 s | Demo trực tiếp "3D recognition", xoay, tô màu, "3D cross section", "extend" |
| V2 | AI黑板 (video quảng bá hãng) | 133 s | Phần cứng + "AI số hoá板书", "全自然交互", giáo viên ảo, quan sát lớp, báo cáo học tập |
| V3 | iFLYTEK AI Board (bản tiếng Anh) | 165 s | "Future class": công bằng, mô phỏng, vòng quay, nhân vật ảo đối thoại, ghi & chia sẻ bài giảng |

## 1. Điểm mạnh theo từng video

### V0 – bút → hình phẳng tương tác
- **Vòng tròn "AI" nổi ngay dưới tay** (menu xuyên tâm: bút, màu, hoàn tác, AI). Giáo viên không phải với ra thanh công cụ ở mép bảng.
- **Vẽ đường cắt ngang tam giác → hình tự tách thành 2 phần, một phần tô đỏ, có nhãn góc (180°)** khi xoay mảnh. Biến "vẽ thêm đường" thành thao tác đo.
- **Khối chóp đã nhận dạng gắn sẵn hệ trục Oxyz màu** (z hồng, y xanh), mặt cắt tô xanh lam: dùng cho bài toán toạ độ.
- **Viết `y = x²−3` rồi `y = A sin x` bằng chữ tay đỏ** → hiện lưới toạ độ, 2 đồ thị khác màu, thanh trượt A, B **nằm ngay trên đồ thị**, khung đồ thị có 4 chốt để kéo thu phóng; chữ viết tay vẫn còn bên cạnh; vẽ tay đánh dấu giao điểm.

### V1 – khối 3D
- Vẽ lập phương nguệch ngoạc → **nhãn xanh "3D recognition"** + hình dây sạch (nét khuất đứt).
- **Vòng xoay 3 màu (đỏ/xanh lá/xanh dương) quanh khối** để xoay; ghép nhiều khối (2 lập phương xếp chồng) rồi xoay cùng nhau.
- **Bảng màu hiện ngay dưới khối** → chạm mặt để tô màu hồng/đỏ.
- **"3D cross section"**: các đỉnh thành điểm chạm được; chọn 3 điểm → mặt phẳng cắt tô xanh **trong suốt**. Nút **"extend"**: tách thiết diện **ra ngoài khối**, đặt cạnh (hình thật của thiết diện) và kéo đi được.

### V2 – hệ sinh thái
- **Màn hình chia đôi đồng bộ** (trái 2D, phải 3D của cùng một bài): sửa một bên, bên kia đổi theo.
- **Chữ viết tay → ghi chú có cấu trúc** ("全自然交互": nói + viết + chạm).
- **Giáo viên ảo toàn cảnh**: đóng vai (phi hành gia, nhà khoa học) trò chuyện với học sinh trong cảnh nhập vai.
- **Quan sát lớp bằng camera "4+1"** → báo cáo đa phương thức: biểu đồ mức tham gia (kim tự tháp), bản tóm tắt học tập sau giờ.

### V3 – "Future class"
- **Mô phỏng ném xiên** có bảng tham số bên phải ngay trên bảng; **vòng quay chọn học sinh/chủ đề** (gamification).
- **Nhân vật ảo đối thoại tình huống** (ngoại ngữ, giáo dục công dân) có thẻ chat bên cạnh.
- **Ghi lại → "vi bài giảng" có sơ đồ tư duy**, chia sẻ giữa các trường.
- **Ba hình chiếu của khối** (Orthographic views) làm hoạt động tìm tòi nhóm; hình chiếu sáng vẫn rõ dưới nắng (phần cứng, bỏ qua).

## 2. So với Socratic Vision Board hiện tại

Đã có (kiểm tra bằng tìm trong mã): nhận dạng hình/khối từ nét vẽ, xoay khối, thiết diện (`computeCrossSection`), khai triển lưới (`netUnfold.ts`), hình chiếu/Oxyz trong engine, đồ thị đa hàm có tham số tự động, mô phỏng lý/hoá/sinh, hỏi đáp theo ngữ cảnh bảng.

Chưa có hoặc yếu (đối chiếu hành vi trong video):

| # | Điểm mạnh của đối thủ | Trạng thái của ta | Độ khó | Giá trị khi thi |
|---|---|---|---|---|
| 1 | **Tách thiết diện ra ngoài ("extend") + hình thật** | Tính được thiết diện, chưa "kéo ra" cạnh khối | Vừa | Rất cao – demo ấn tượng |
| 2 | **Vẽ đường cắt tam giác → tách mảnh, tô màu, hiện góc** | Có phép dựng, chưa có cắt-tách-tô | Vừa | Cao |
| 3 | **Chip phản hồi "AI đã nhận ra: 3D / hàm số / hình phẳng"** khi vừa vẽ | Không có nhãn xác nhận trực quan | Thấp | Cao – chi phí rẻ |
| 4 | **Thanh trượt tham số nằm trên đồ thị + khung kéo thu phóng** | Có tham số, chưa đặt ngay trên vùng vẽ | Thấp–vừa | Trung bình |
| 5 | **Vòng xoay 3 trục + bảng màu tô mặt** trên khối | Xoay được, chưa có vòng/tô mặt | Vừa | Trung bình |
| 6 | **Menu xuyên tâm "AI" nổi theo tay** | Dock cố định ở mép | Vừa | Trung bình (hợp bảng lớn) |
| 7 | **Chia đôi 2D↔3D đồng bộ** | Chưa | Cao | Trung bình |
| 8 | **Phiên học → vi bài giảng + sơ đồ tư duy** | Có nhật ký nét vẽ/phát lại, chưa tóm tắt bằng AI | Vừa (tận dụng BoardContext) | Cao – khác biệt với đối thủ phần cứng |
| 9 | **Vòng quay chọn học sinh** | Chưa | Rất thấp | Thấp |
| 10 | Quan sát lớp bằng camera; giáo viên ảo; phần cứng (mic, quang học) | Không | — | **Không kế thừa**: cần phần cứng, dữ liệu hình ảnh học sinh (rủi ro riêng tư), và ngoài phạm vi sản phẩm |

## 3. Cái ta làm tốt hơn (giữ để nhấn mạnh khi thi)
- Hỏi đáp hiểu **số đo thật trên bảng** (đo theo tên đỉnh), không chỉ nhận dạng hình.
- Phép dựng phân giác/trung trực… **sống** khi kéo điểm; hình dựng từ đề bài có nút theo từng ý (a, b, c, d).
- Chạy trên **trình duyệt/bảng thường**, không đòi bảng chuyên dụng.

## 4. Đề xuất thứ tự làm
1. **#3 chip nhận dạng** (nhỏ, cho mọi chế độ vẽ) → cảm giác "AI hiểu" ngay.
2. **#1 extend thiết diện** → thành cảnh demo chính của hình học không gian.
3. **#2 cắt-tách-tô tam giác** + **#4 thanh trượt trên đồ thị**.
4. **#8 vi bài giảng + sơ đồ tư duy** từ nhật ký bảng (đối trọng với tính năng "ghi và chia sẻ" của V3).

Lưu ý phân vùng: #1, #2, #5 chạm `InlineShape.tsx`/`geoTools.ts` – vùng phiên hình học đang giữ; cần chờ phiên đó xong hoặc phối hợp trước khi sửa.
