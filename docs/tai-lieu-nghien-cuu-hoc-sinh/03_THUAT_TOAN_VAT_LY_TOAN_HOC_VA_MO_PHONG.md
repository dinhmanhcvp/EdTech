# CHUYÊN ĐỀ 03: THUẬT TOÁN VẬT LÝ, TOÁN HỌC VÀ ĐỘNG CƠ MÔ PHỎNG
## Tài liệu nghiên cứu chuyên sâu dành cho học sinh dự thi ViSEF / ISEF

---

### 1. Thuật toán tích phân số Runge-Kutta bậc 4 (RK4)

Khi mô phỏng chuyển động của con lắc, hệ lò xo hay quỹ đạo hạt mang điện, máy tính không thể giải phương trình vi phân liên tục như con người mà phải chia thời gian thành các bước nhảy nhỏ $\Delta t$.

#### So sánh giữa phương pháp Euler và RK4:
* **Phương pháp Euler tiến (Forward Euler):**
  Phương pháp đơn giản nhất chỉ ước lượng vận tốc và vị trí tiếp theo dựa trên độ dốc tại điểm đầu:
  $$x(t + \Delta t) \approx x(t) + v(t) \cdot \Delta t$$
  *Sai số:* Sai số cục bộ của Euler là bậc $\mathcal{O}(\Delta t^2)$ và sai số tích lũy toàn cục là bậc $\mathcal{O}(\Delta t)$.
  *Hậu quả:* Năng lượng của hệ không được bảo toàn. Sau một vài chu kỳ dao động, biên độ con lắc sẽ tự động nở to dần ra và bay ra khỏi màn hình (hiện tượng phân kỳ nghiệm số hay mất ổn định số).

* **Phương pháp Runge-Kutta bậc 4 (RK4):**
  Thuật toán RK4 tính toán 4 độ dốc thử nghiệm tại các điểm khác nhau trong một bước thời gian $\Delta t$ để lấy trung bình trọng số:
  - $k_1$: Độ dốc tại thời điểm ban đầu $t$.
  - $k_2$: Độ dốc tại điểm chính giữa bước nhảy $t + \frac{\Delta t}{2}$, ước lượng dựa vào $k_1$.
  - $k_3$: Độ dốc tại điểm chính giữa bước nhảy, nhưng ước lượng chính xác hơn dựa vào $k_2$.
  - $k_4$: Độ dốc tại điểm cuối bước nhảy $t + \Delta t$, ước lượng dựa vào $k_3$.
  
  Công thức cập nhật trạng thái của RK4:
  $$x_{n+1} = x_n + \frac{\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4)$$
  
  *Ưu thế vượt trội:* Sai số cắt cụt cục bộ của RK4 là $\mathcal{O}(\Delta t^5)$ và sai số toàn cục chỉ là $\mathcal{O}(\Delta t^4)$. Độ chính xác cao gấp hàng nghìn lần so với Euler, giúp con lắc và lò xo dao động hàng giờ liền mà không bị mất năng lượng hay méo quỹ đạo.

---

### 2. Bộ lọc chuyển động Lò xo - Giảm chấn bậc 2 (Second-Order Spring-Damper)

Để các vật thể đồ họa trên màn hình di chuyển mượt mà, chân thực như có quán tính thay vì giật cục, hệ thống áp dụng phương trình vi phân dao động của hệ lò xo - giảm chấn:

$$m \frac{d^2x}{dt^2} + c \frac{dx}{dt} + k(x - x_0) = 0$$

Chia cả hai vế cho khối lượng $m$, ta có dạng chuẩn tắc trong kỹ thuật điều khiển:
$$\frac{d^2x}{dt^2} + 2\zeta\omega_0 \frac{dx}{dt} + \omega_0^2(x - x_0) = 0$$

Trong đó:
* $\omega_0 = \sqrt{\frac{k}{m}}$ là tần số góc dao động riêng của hệ.
* $\zeta = \frac{c}{2\sqrt{km}}$ là hệ số suy giảm (Damping Ratio).

**Ý nghĩa của hệ số suy giảm $\zeta$ trong lập trình đồ họa:**
1. **$\zeta < 1$ (Dao động tắt dần dưới hạn - Underdamped):** Vật thể lướt nhanh về đích và dao động qua lại quanh vị trí đích vài nhịp trước khi dừng hẳn. Rất thích hợp cho các hiệu ứng nảy đàn hồi (bouncy animation) vui nhộn.
2. **$\zeta = 1$ (Tắt dần tới hạn - Critically Damped):** Vật thể trở về vị trí cân bằng trong thời gian ngắn nhất có thể mà **hoàn toàn không bị vọt lố (no overshoot)**. Đây là chế độ lý tưởng nhất được hệ thống dùng cho việc bắt dính (snapping) các linh kiện vào lưới tọa độ.
3. **$\zeta > 1$ (Quá cản - Overdamped):** Lực cản quá lớn khiến vật thể trôi chầm chậm về đích, gây cảm giác nặng nề và trễ nải.

---

### 3. Mô phỏng va chạm đàn hồi 2D và Khúc xạ ánh sáng

* **Va chạm đàn hồi 2 quả cầu trong mặt phẳng 2D:**
  Khi hai vật thể tròn va chạm, hệ thống phân tích vận tốc thành hai trục tọa độ cục bộ tại điểm tiếp xúc:
  - Trục pháp tuyến $\vec{n}$ (nối tâm 2 quả cầu): Tuân theo định luật bảo toàn động lượng và bảo toàn động năng trong va chạm đàn hồi 1D. Vận tốc sau va chạm dọc theo trục này được tính bằng:
    $$v_{1n}' = \frac{(m_1 - m_2)v_{1n} + 2m_2v_{2n}}{m_1 + m_2}$$
  - Trục tiếp tuyến $\vec{t}$ (vuông góc với trục pháp tuyến): Không có ngoại lực tác dụng, do đó vận tốc tiếp tuyến được giữ nguyên không đổi: $v_{1t}' = v_{1t}$.

* **Mô phỏng quang hình học theo Định luật Snell:**
  Tia sáng truyền qua mặt phân cách giữa hai môi trường chiết suất $n_1$ và $n_2$ được tính toán hướng truyền theo dạng vector:
  $$\vec{v}_{\text{refract}} = \frac{n_1}{n_2}\vec{v}_{\text{in}} + \left(\frac{n_1}{n_2}\cos\theta_1 - \cos\theta_2\right)\vec{n}$$
  Nếu góc tới vượt quá góc khúc xạ giới hạn ($\sin\theta_1 > \frac{n_2}{n_1}$ khi $n_1 > n_2$), thuật toán lập tức kích hoạt phản xạ toàn phần với góc phản xạ bằng góc tới.

---

### 4. Tại sao phải dùng SymPy CAS thay vì để AI tính nhẩm?

Một điểm cực kỳ thông minh trong thiết kế của đề tài mà Ban Giám khảo sẽ đánh giá rất cao:
* **Nhược điểm chí tử của các mô hình ngôn ngữ lớn (LLM):** LLM là mô hình xác suất dựa trên từ ngữ tiếp theo (token prediction), nên chúng tính nhẩm rất kém và rất dễ bị "ảo giác toán học" (ví dụ: tính nhầm đạo hàm của hàm hợp phức tạp, nhầm dấu tích phân, tính sai nghiệm phân số).
* **Giải pháp của đề tài:** Hệ thống tích hợp thư viện **SymPy** (Hệ thống đại số máy tính - Computer Algebra System) chạy trên máy chủ Python.
  - Khi cần tính đạo hàm, tích phân xác định, tìm cực trị hay rút gọn biểu thức, hệ thống chuyển bài toán sang dạng mã SymPy để tính toán giải tích chính xác tuyệt đối $100\%$.
  - AI chỉ đóng vai trò phân tích đề bài và sinh biểu thức toán học, còn phần tính toán giải số và nghiệm phương trình được chuyển giao cho SymPy. Điều này bảo đảm tính chuẩn xác khoa học tuyệt đối cho bài học.

---

### 5. Câu hỏi nghiên cứu tự rèn luyện dành cho học sinh

1. **Câu hỏi 1 (Về sai số giải tích số):** Hãy phân tích bằng toán học tại sao khi bước thời gian $\Delta t$ tăng lên, sai số của phương pháp Euler tăng theo tỷ lệ bậc nhất, trong khi sai số của phương pháp RK4 tăng theo tỷ lệ bậc 4? Điều này ảnh hưởng như thế nào đến tốc độ thực thi (frame rate) của phần mềm?
2. **Câu hỏi 2 (Về định luật bảo toàn):** Trong một hệ dao động điều hòa lý tưởng không có ma sát, đại lượng nào là bất biến theo thời gian? Hãy nêu cách kiểm tra mã nguồn để biết thuật toán mô phỏng vật lý có đang bảo toàn đại lượng này hay không?
3. **Câu hỏi 3 (Về kỹ thuật chuyển động):** Tại sao trạng thái tắt dần tới hạn (Critically Damped với $\zeta = 1$) lại được coi là trạng thái vàng trong thiết kế giao diện tương tác người dùng? Nếu chọn $\zeta = 0{,}2$ thì người dùng sẽ cảm thấy trải nghiệm như thế nào?
4. **Câu hỏi 4 (Về tích hợp hệ thống):** Phân biệt sự khác nhau giữa việc giải phương trình bằng phương pháp số (Numerical Methods như RK4) và phương pháp biểu tượng (Symbolic Methods như SymPy). Hãy chỉ ra trường hợp cụ thể nào trong hệ thống bắt buộc phải dùng RK4 và trường hợp nào bắt buộc phải dùng SymPy?
