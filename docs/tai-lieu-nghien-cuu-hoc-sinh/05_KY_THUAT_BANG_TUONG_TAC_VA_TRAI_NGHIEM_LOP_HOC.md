# CHUYÊN ĐỀ 05: KỸ THUẬT BẢNG TƯƠNG TÁC VÀ TRẢI NGHIỆM LỚP HỌC
## Tài liệu nghiên cứu chuyên sâu dành cho học sinh dự thi ViSEF / ISEF

---

### 1. Toàn cảnh phần cứng Màn hình tương tác thông minh (IFP 75"-86")

Màn hình tương tác thông minh (Interactive Flat Panel - IFP) là thiết bị trung tâm của phòng học hiện đại. Khi nghiên cứu sâu về phần cứng, các em cần nắm được hai công nghệ cảm ứng chính trên thị trường:
1. **Cảm ứng hồng ngoại (Infrared - IR Touch):**
   * Sử dụng dải đèn LED hồng ngoại và các cảm biến quang học bố trí xung quanh viền màn hình tạo thành một lưới tia hồng ngoại vô hình.
   * *Ưu điểm:* Giá thành hợp lý, độ bền cao, hoạt động được với mọi vật thể (ngón tay, bút nhựa, thước kẻ). Đây là công nghệ chiếm $85\%$ thị phần trường học tại Việt Nam.
   * *Nhược điểm:* Dễ bị nhiễu bởi ánh sáng mặt trời chiếu trực tiếp hoặc bụi bám ở góc viền.
2. **Cảm ứng điện dung tán xạ (Capacitive Touch - P-Cap):**
   * Tương tự màn hình điện thoại iPhone/iPad, sử dụng lưới điện cực trong suốt đè trên kính.
   * *Ưu điểm:* Cực kỳ chính xác, hỗ trợ áp lực bút chân thực, không bị ảnh hưởng bởi ánh sáng môi trường.
   * *Nhược điểm:* Giá thành rất đắt, chỉ trang bị ở các phòng họp cao cấp.

---

### 2. Chuẩn sự kiện W3C Pointer Events API và Nhận diện tiếp xúc

Nhiều phần mềm cũ chỉ bắt các sự kiện chuột truyền thống (`mousedown`, `mousemove`, `mouseup`) hoặc sự kiện chạm (`touchstart`), khiến chúng hoạt động chập chờn trên màn hình lớn.

Socratic Vision Board chuẩn hóa hoàn toàn theo chuẩn **W3C Pointer Events API** hiện đại, cho phép khai thác trực tiếp các thuộc tính phần cứng:
* `event.pointerType`: Phân biệt chính xác giữa ngón tay (`touch`), bút cảm ứng (`pen`) và chuột máy tính (`mouse`).
* `event.pointerId`: Định danh duy nhất cho từng điểm chạm, phục vụ tính năng nhiều học sinh cùng cầm bút vẽ trên bảng cùng lúc (Multi-touch / Multi-pen).
* `event.width` và `event.height`: Chiều rộng và chiều cao của vùng tiếp xúc hình học (tính bằng pixel).
* `event.pressure`: Lực nhấn của đầu bút (từ $0.0$ đến $1.0$).

---

### 3. Thuật toán loại bỏ tỳ tay (Palm Rejection) và Xóa bằng lòng bàn tay (Palm Eraser)

Khi giáo viên hoặc học sinh viết lên bảng, cổ tay tự nhiên sẽ tỳ vào mặt kính màn hình. Nếu không có thuật toán xử lý, màn hình sẽ nhận nhầm cổ tay là một nét vẽ, làm hỏng toàn bộ bài giảng.

#### Thuật toán Palm Rejection của hệ thống:
1. **Phân tích diện tích tiếp xúc:** Đầu bút cảm ứng thông thường tạo ra diện tích tiếp xúc rất nhỏ ($S_{\text{pen}} < 25 \text{ pixel}^2$). Trong khi đó, cổ tay tỳ vào bảng tạo ra một vùng tiếp xúc elip lớn ($S_{\text{palm}} > 200 \text{ pixel}^2$).
2. **Khoảng cách tương đối giữa các điểm chạm:** Khi phát hiện một điểm chạm bút (`pointerType == 'pen'`), hệ thống tạo một "vùng cấm lân cận" (Neighbor Rejection Zone) có bán kính $R = 80 \text{ pixel}$ về phía dưới bên phải của đầu bút (đối với người thuận tay phải). Mọi điểm chạm ngón tay hoặc cổ tay rơi vào vùng này sẽ bị triệt tiêu ngay lập tức.

#### Thuật toán Cọ xóa bằng lòng bàn tay (Palm Eraser):
Nếu diện tích tiếp xúc vượt quá ngưỡng $S > 500 \text{ pixel}^2$ và không có điểm chạm bút nào đồng thời xuất hiện, hệ thống tự động suy luận người dùng đang áp cả lòng bàn tay hoặc cạnh bàn tay lên bảng để xóa. Lập tức con trỏ chuyển sang chế độ tẩy xóa (Eraser Mode) và xóa các nét vẽ trong phạm vi tiếp xúc mà giáo viên không cần phải bấm chọn biểu tượng cục tẩy trên thanh công cụ!

---

### 4. Trải nghiệm bục giảng Zero-Keyboard và Floating Screen Overlay

* **Triết lý Zero-Keyboard:** Giáo viên khi đứng trên bục giảng không nên bị trói buộc vào bàn phím hay chuột máy tính. Toàn bộ thao tác tương tác trong hệ thống (chọn môn học, phóng to mô phỏng, thay đổi thông số lò xo, kích hoạt bài tập) đều được tối ưu hóa cho thao tác chạm trực tiếp bằng ngón tay hoặc cử chỉ bút với kích thước nút bấm tối thiểu $48 \times 48$ pixel.
* **Công nghệ Floating Screen Overlay:**
  Hệ thống cung cấp một lớp phủ trong suốt nằm đè lên trên màn hình Windows hoặc Android OPS. Khi giáo viên đang trình chiếu bài giảng PowerPoint hay đọc file sách giáo khoa PDF, giáo viên chỉ cần dùng bút vẽ một vòng tròn khép kín (Magic Lasso) bao quanh một sơ đồ hoặc hình vẽ trong sách. Hệ thống sẽ chụp ảnh vùng khoanh đó, gửi tới AI và bung ngay một mô phỏng tương tác nổi trực tiếp trên nền slide mà giáo viên không cần phải thoát PowerPoint hay mở tab trình duyệt mới!

---

### 5. Phân hệ Student Companion, Locked Stepper và 4 Visual Debuggers

Trên thiết bị cá nhân của học sinh (BYOD), hệ thống triển khai hai cơ chế sư phạm độc đáo:

#### Cơ chế kiểm soát bước nhảy sư phạm (Locked Stepper):
Học sinh thường có xu hướng bấm bừa các nút để xem kết quả mà không chịu đọc đề hay suy nghĩ. Cơ chế Locked Stepper chia bài học thành các chặng nhận thức nối tiếp nhau. Học sinh chỉ được mở khóa bước tiếp theo khi đã hoàn thành việc quan sát, dự đoán hoặc trả lời câu hỏi dẫn dắt của bước hiện tại.

#### Bộ 4 công cụ gỡ lỗi tư duy trực quan (Visual Debuggers):
1. **Vector Force Debugger:** Hiển thị tức thời các mũi tên lực (trọng lực, phản lực, ma sát, lực căng) và tổng hợp lực $\vec{F}_{\text{net}}$ biến thiên theo thời gian thực để học sinh thấy rõ vật chuyển động nhanh dần khi nào.
2. **Energy Bar Debugger:** Các cột năng lượng (Động năng $W_đ$, Thế năng $W_t$, Nhiệt lượng hao phí do ma sát $Q$) co dãn liên tục nhưng tổng chiều cao luôn không đổi, khắc sâu định luật bảo toàn cơ năng.
3. **Phase Portrait Debugger:** Đồ thị quỹ đạo pha biểu diễn mối quan hệ giữa tọa độ $x$ và vận tốc $v$. Một dao động điều hòa sẽ tạo thành một đường elip khép kín tuyệt đẹp; dao động tắt dần tạo thành đường xoắn ốc hội tụ về gốc tọa độ.
4. **Free-Body Diagram (FBD) Debugger:** Tách riêng vật thể cô lập ra khỏi môi trường để kiểm tra điều kiện cân bằng tĩnh học.

---

### 6. Câu hỏi nghiên cứu tự rèn luyện dành cho học sinh

1. **Câu hỏi 1 (Về phần cứng cảm ứng):** So sánh ưu và nhược điểm của công nghệ cảm ứng hồng ngoại (IR Touch) và cảm ứng điện dung (Capacitive Touch) trên màn hình kích thước lớn. Tại sao các trường học phổ thông hiện nay lại ưu tiên chọn màn hình hồng ngoại?
2. **Câu hỏi 2 (Về xử lý sự kiện):** Thuộc tính `event.pointerId` trong chuẩn W3C Pointer Events có vai trò quan trọng như thế nào khi lập trình tính năng đa điểm chạm (Multi-touch)? Nếu hai học sinh cùng lúc chạm vào bảng để di chuyển hai vật thể khác nhau, hệ thống quản lý trạng thái của hai con trỏ này ra sao?
3. **Câu hỏi 3 (Về trải nghiệm người dùng bục giảng):** Hãy giải thích tại sao triết lý "Zero-Keyboard" lại mang tính sống còn đối với sự thành bại của một phần mềm dạy học trên lớp? Những phiền toái nào sẽ xảy ra nếu giáo viên liên tục phải quay lại bàn giáo viên để gõ bàn phím trong tiết học?
4. **Câu hỏi 4 (Về công cụ Visual Debuggers):** Chọn một trong 4 công cụ Visual Debuggers (Force, Energy, Phase, FBD) và phân tích xem công cụ đó giúp học sinh giải quyết được một "ngộ nhận trực giác" điển hình nào trong môn Vật lý THPT?
