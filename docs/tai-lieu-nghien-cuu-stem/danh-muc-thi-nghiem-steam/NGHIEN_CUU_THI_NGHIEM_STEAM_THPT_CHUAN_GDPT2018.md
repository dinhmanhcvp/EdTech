# TÀI LIỆU NGHIÊN CỨU CHUYÊN SÂU: HỆ THỐNG THÍ NGHIỆM STEAM ĐẶC BIỆT DÀNH CHO CHƯƠNG TRÌNH THPT (GDPT 2018)
## CÁC BÀI THỰC HÀNH "HAY - KHÓ - TỐN KÉM - NGUY HIỂM" THƯỜNG PHẢI "DẠY CHAY" TRONG NHÀ TRƯỜNG
*(VẬT LÍ, HÓA HỌC, CÔNG NGHỆ CƠ KHÍ & ĐỘNG CƠ, ROBOTICS VÀ SINH HỌC PHÂN TỬ LỚP 10 - 11 - 12)*

**Dự án:** Nền tảng Bảng thông minh Tích hợp Mô phỏng STEAM & Trợ giảng AI (Socratic Vision Board)  
**Mục tiêu tài liệu:** Bám sát 100% khung chương trình Giáo dục Phổ thông 2018 (SGK Kết nối tri thức, Cánh Diều, Chân trời sáng tạo). Hệ thống hóa các bài học có thí nghiệm bắt buộc hoặc chuyên đề nâng cao nhưng **thực tế 95% trường THPT tại Việt Nam không thể cho học sinh làm thật** vì rào cản an toàn (cháy nổ, khí độc, phóng xạ), rào cản chi phí thiết bị đắt đỏ, hoặc thí nghiệm đòi hỏi thời gian kéo dài nhiều tuần lễ.

---

## MỤC LỤC TỔNG THỂ
1. **Phân hệ I: VẬT LÍ THPT (Cơ học Nâng cao, Sóng, Điện - Từ, Quang lượng tử & Hạt nhân)**
   * Bài 1: Con lắc ngược tự cân bằng trên xe trượt (Inverted Pendulum Cart) — *Vật lí 10 & Chuyên đề Robotics*
   * Bài 2: Khảo sát va chạm trên đệm khí & Đo vận tốc tức thời — *Vật lí 10*
   * Bài 3: Hạt mang điện chuyển động trong điện trường & từ trường (Ống tia âm cực Thomson đo $e/m$) — *Vật lí 11*
   * Bài 4: Hiện tượng cảm ứng điện từ, dòng điện Foucault & Đệm từ trường nâng nam châm — *Vật lí 11*
   * Bài 5: Đo hằng số Planck $h$ bằng Tế bào quang điện ngoài & Điện áp hãm — *Vật lí 12*
   * Bài 6: Tán xạ hạt Alpha Rutherford & Đo chu kỳ bán rã phóng xạ hạt nhân — *Vật lí 12 (Nghiêm cấm nguồn phóng xạ thật)*
2. **Phân hệ II: CÔNG NGHỆ, ĐỘNG CƠ & CHẾ TẠO MÁY THPT**
   * Bài 7: Chu trình cháy nổ Động cơ đốt trong 4 kỳ & Hệ thống phối khí xupap — *Công nghệ 11 (Cơ khí động lực)*
   * Bài 8: Cơ cấu Hộp số và Bộ vi sai Ô tô (Differential Gear) khi vào cua — *Công nghệ 11*
   * Bài 9: Cánh tay Robot gắp 3 bậc tự do (3-DOF Arm) & Động học ngược (Inverse Kinematics) — *Tin học / Chuyên đề Công nghệ 12*
   * Bài 10: Xe tự hành 2 bánh tự cân bằng thuật toán Lọc bù & Điều khiển hồi tiếp PID — *STEM Robotics THPT*
3. **Phân hệ III: HÓA HỌC THPT (Khí độc, Phản ứng Nổ & Cân bằng Hóa học)**
   * Bài 11: Điều chế và khảo sát tính tẩy màu của Khí Clo khô vs Khí Clo ẩm — *Hóa học 10 (Khí cực độc)*
   * Bài 12: Phản ứng nổ của Kim loại kiềm ($Na, K$) với Nước và Axit — *Hóa học 12 (Nguy cơ bỏng nổ)*
   * Bài 13: Chuyển dịch cân bằng hóa học theo nhiệt độ và áp suất của khí $NO_2 \rightleftharpoons N_2O_4$ — *Hóa học 10*
   * Bài 14: Chuẩn độ điện thế Axit - Bazơ & Vẽ đường cong pH tự động — *Hóa học 11*
4. **Phân hệ IV: SINH HỌC & DI TRUYỀN THPT**
   * Bài 15: Điện di Gel Agarose phát hiện đột biến gen & Đo kích thước phân tử DNA — *Sinh học 10 & 12*
   * Bài 16: Thí nghiệm kiểm chứng Hoán vị gen & Tần số tái tổ hợp ở Ruồi giấm (Morgan) — *Sinh học 12*
5. **Ma trận Tổng hợp Sư phạm & Kiến trúc Tích hợp Bảng Thông minh Socratic**

---

# PHÂN HỆ I: VẬT LÍ THPT (LỚP 10 - 11 - 12)

---

### BÀI 1: CON LẮC NGƯỢC TỰ CÂN BẰNG TRÊN XE TRƯỢT (CART-POLE SYSTEM)
* **Vị trí trong SGK:** Vật lí 10 (Chương 3: Cân bằng và chuyển động của vật rắn, Momen lực) & Chuyên đề STEM Công nghệ điều khiển.
* **Tại sao trường học phải "dạy chay":** 
  * Cân bằng không bền: Trọng tâm con lắc nằm trên trục quay, nếu không có lực điều khiển phản hồi liên tục thì con lắc sẽ rơi đổ ngay lập tức trong vòng $0.2\text{ giây}$.
  * Chi phí bàn thí nghiệm Cart-Pole chuẩn nghiên cứu (như của Quanser) lên tới **$6.000 - $12.000 USD** (150 - 300 triệu VNĐ) với động cơ encoder góc phân giải cao và thanh ray trượt bi tuyến tính.
* **Ý nghĩa sư phạm:** Giúp học sinh THPT hiểu từ bản chất sự khác nhau giữa **Cân bằng bền** (con lắc thuận) và **Cân bằng không bền** (con lắc ngược, tên lửa Falcon 9 hạ cánh thẳng đứng, xe tự cân bằng Segway).
* **Mô hình toán học:**
  $$(M + m)\ddot{x} + ml\ddot{\theta}\cos\theta - ml\dot{\theta}^2\sin\theta = F$$
  $$ml\ddot{x}\cos\theta + (I + ml^2)\ddot{\theta} - mgl\sin\theta = 0$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh dùng tay "búng" vào đầu thanh con lắc trên bảng: Xe trượt tự động dịch chuyển tiến lùi cực nhanh để đón góc nghiêng, giữ thanh luôn dựng đứng ở góc $\theta = 0^\circ$.
  * Học sinh kéo thanh trượt đổi khối lượng con lắc $m$, chiều dài thanh $l$, quan sát đáp ứng góc nghiêng và điện áp cấp cho động cơ.

---

### BÀI 2: KHẢO SÁT VA CHẠM TRÊN ĐỆM KHÍ & BẢO TOÀN ĐỘNG LƯỢNG
* **Vị trí trong SGK:** Vật lí 10 (Chương 4: Năng lượng, Động lượng, Định luật bảo toàn động lượng, Va chạm đàn hồi và va chạm mềm).
* **Tại sao trường học thực hành rất khó đạt kết quả:**
  * Băng đệm khí (Air track) ở các trường THPT thường xuyên bị cong vênh, các lỗ thổi khí bị bụi phấn làm tắc nghẽn $\to$ ma sát lớn làm mất mát động lượng từ $15 - 30\%$, học sinh tính toán định luật bảo toàn động lượng $p_1 + p_2 = p_1' + p_2'$ luôn bị lệch số liệu.
  * Máy nén khí thổi đệm khí kêu rất to, gây ồn ào cả phòng học.
* **Mô hình toán học:**
  * Hệ số phục hồi va chạm (Coefficient of Restitution):
    $$e = \frac{v_2' - v_1'}{v_1 - v_2} \quad (e=1: \text{Đàn hồi hoàn toàn}; \ e=0: \text{Va chạm mềm})$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh kéo thanh trượt hệ số phục hồi $e$ từ $0 \to 1$.
  * Chọn các đầu va chạm: Lò xo đàn hồi, chốt dính nam châm, hoặc đầu cắm đất sét mềm.
  * Hệ thống vẽ đồ thị Động lượng và Động năng trước - trong - sau va chạm theo thời gian thực; hiển thị vùng diện tích xung lượng lực $\int F dt$.

---

### BÀI 3: HẠT MANG ĐIỆN CHUYỂN ĐỘNG TRONG ĐIỆN TRƯỜNG & TỪ TRƯỜNG (ỐNG TIA CATOT THOMSON ĐO $e/m$)
* **Vị trí trong SGK:** Vật lí 11 (Chương 3: Điện trường; Chương 4: Từ trường, Lực Lorentz, Ứng dụng trong máy gia tốc Cyclotron và khối phổ kế).
* **Tại sao trường học phải "dạy chay":**
  * Thiết bị ống phóng tia catot chân không (Crookes tube) có cuộn dây Helmholtz đòi hỏi nguồn cao áp từ **$3.000\text{ V} - 5.000\text{ V}$**, tiềm ẩn nguy cơ giật điện cao áp cho học sinh.
  * Bóng đèn thủy tinh chân không nhập khẩu giá hàng chục triệu đồng, dây tóc vonfram rất dễ đứt khi cắm nguồn đột ngột.
* **Mô hình toán học:**
  * Lực tổng hợp Lorentz: $\mathbf{F} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B})$
  * Khi cân bằng lực điện và lực từ ($F_e = F_b \implies qE = qvB$), hạt bay thẳng không lệch: $v = \frac{E}{B}$
  * Khi chỉ có từ trường, hạt chuyển động tròn bán kính: $R = \frac{mv}{qB} \implies \frac{e}{m} = \frac{E}{B^2 R}$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh kéo thanh trượt hiệu điện thế bản cực $U$ và dòng điện cuộn dây Helmholtz $I$.
  * Chùm electron màu xanh huỳnh quang 3D uốn cong mềm mại trên bảng: Ban đầu bị bẻ cong lệch lên trên do điện trường, sau đó tăng từ trường để kéo chùm electron uốn ngược trở lại đúng đường thẳng tâm.
  * Tự động tính toán ra giá trị hằng số tự nhiên $\frac{e}{m} \approx 1.76 \times 10^{11}\text{ C/kg}$.

---

### BÀI 4: HIỆN TƯỢNG HÃM TỪ FOUCAULT & ĐỆM TỪ TRƯỜNG NÂNG NAM CHÂM SIÊU DẪN
* **Vị trí trong SGK:** Vật lí 11 (Chương 4: Hiện tượng cảm ứng điện từ, Định luật Lenz, Dòng điện xoáy Foucault và ứng dụng trong phanh từ tàu hỏa cao tốc).
* **Tại sao trường học phải "dạy chay":**
  * Thí nghiệm thả rơi nam châm Neodymium qua ống đồng dày: Học sinh chỉ thấy nam châm rơi chậm lại một cách bí ẩn, hoàn toàn **không nhìn thấy được các vòng xoáy dòng điện Foucault** vô hình chạy trong lòng khối đồng.
  * Thí nghiệm đệm từ Meissner đòi hỏi Nitơ lỏng ($-196^\circ\text{C}$) và đĩa gốm siêu dẫn $YBCO$, trường học không có kho lưu trữ lạnh sâu an toàn.
* **Mô hình toán học:**
  $$\mathcal{E} = -\frac{d\Phi}{dt}, \quad \mathbf{J} = \sigma (\mathbf{E} + \mathbf{v} \times \mathbf{B}), \quad \mathbf{F}_{drag} = \int (\mathbf{J} \times \mathbf{B}) dV \propto -\sigma B^2 v$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Mô hình 3D cắt dọc ống kim loại: Hiển thị các xoáy dòng điện Foucault đổi màu theo cường độ dòng điện cảm ứng chạy ngược chiều cản trở rơi.
  * Cho phép học sinh xẻ rãnh trên ống kim loại (tạo ống có khe xẻ): Dòng Foucault bị đứt đoạn, lực cản triệt tiêu $\to$ nam châm lập tức rơi tự do gia tốc $g$.

---

### BÀI 5: ĐO HẰNG SỐ PLANCK $h$ BẰNG HIỆU ỨNG QUANG ĐIỆN NGOÀI & ĐIỆN ÁP HÃM
* **Vị trí trong SGK:** Vật lí 12 (Chương: Lượng tử ánh sáng, Hiệu ứng quang điện, Phương trình Einstein).
* **Tại sao trường học phải "dạy chay":**
  * Bộ dụng cụ tế bào quang điện chân không kèm kính lọc sắc đơn sắc và nguồn phát điện áp ngược vi mô có giá từ **$15 - 25\text{ triệu VNĐ}$**. Dòng quang điện cực kỳ nhỏ (cỡ nano-ampe $10^{-9}\text{ A}$), các máy đo ở trường thường bị nhiễu điện lưới làm kim dao động loạn xạ không đo được điểm triệt tiêu $I=0$.
* **Mô hình toán học:**
  $$hf = A + \frac{1}{2}m v_{0,max}^2 = A + e |U_h| \implies |U_h| = \frac{h}{e} f - \frac{A}{e}$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh đổi các kính lọc sắc màu (Đỏ, Vàng, Lục, Lam, Tím, Tử ngoại), chiếu chùm photon hạt vào bản cực kim loại (Cesium, Natri, Kẽm, Bạc).
  * Vặn biến trở tăng dần điện áp hãm $U_h$: Quan sát các electron bay ngược trở lại bản cực âm, dòng quang điện giảm dần về đúng $0$.
  * Hệ thống tự động vẽ đồ thị đường thẳng thực nghiệm $U_h$ theo tần số $f$, lấy hệ số góc nhân với $e$ để ra hằng số Planck $h \approx 6.626 \times 10^{-34}\text{ J}\cdot\text{s}$.

---

### BÀI 6: TÁN XẠ RUTHERFORD HẠT ALPHA & PHÂN RÃ PHÓNG XẠ HẠT NHÂN
* **Vị trí trong SGK:** Vật lí 12 (Chương: Năng lượng nguyên tử & Hạt nhân nguyên tử, Thí nghiệm tìm ra hạt nhân của Rutherford, Định luật phân rã phóng xạ).
* **Tại sao trường học BẮT BUỘC 100% "DẠY CHAY":**
  * **Quy định pháp lý & an toàn:** Trường THPT bị cấm tuyệt đối lưu trữ các nguồn phóng xạ hạt nhân ($\alpha, \beta, \gamma$) vì nguy cơ ung thư, phơi nhiễm bức xạ cho học sinh và giáo viên.
  * Thí nghiệm bắn phá lá vàng mỏng bằng hạt Alpha của Rutherford chỉ tồn tại trong tranh vẽ tĩnh của sách giáo khoa.
* **Mô hình toán học:**
  * Tiết diện tán xạ vi phân Rutherford:
    $$\frac{d\sigma}{d\Omega} = \left( \frac{z Z e^2}{4\pi\varepsilon_0 \cdot 4E_k} \right)^2 \frac{1}{\sin^4(\theta/2)}$$
  * Định luật phóng xạ: $N(t) = N_0 \cdot e^{-\lambda t} = N_0 \cdot 2^{-t/T}$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Bắn hàng ngàn chùm hạt Alpha mang điện tích $+2e$ vào lá vàng mỏng 3D: Học sinh thấy $99.9\%$ hạt bay thẳng xuyên qua không gian trống rỗng của nguyên tử, nhưng thỉnh thoảng có 1 hạt bay sát hạt nhân vàng $+79e$ bị lực đẩy Coulomb cực mạnh **bật ngược trở lại một góc $> 90^\circ$** (hiện tượng làm Rutherford sửng sốt như *"bắn viên đại bác vào tờ giấy ăn mà viên đạn dội ngược lại"*).
  * Mô phỏng phân rã hạt nhân đồng vị phóng xạ $C-14$ hoặc $I-131$ qua trò chơi xúc xắc hạt nhân trực quan.

---

# PHÂN HỆ II: CÔNG NGHỆ, ĐỘNG CƠ & CHẾ TẠO MÁY THPT

---

### BÀI 7: CHU TRÌNH CHÁY NỔ ĐỘNG CƠ ĐỐT TRONG 4 KỲ & HỆ THỐNG PHỐI KHÍ
* **Vị trí trong SGK:** Công nghệ 11 (Cơ khí động lực, Bài: Cấu tạo và nguyên lý làm việc của động cơ đốt trong 4 kỳ xăng và diesel) & Vật lí 12 (Ứng dụng định luật bảo toàn năng lượng và chu trình nhiệt).
* **Tại sao trường học phải "dạy chay":**
  * Các trường chỉ có một mô hình cắt bổ bằng nhựa hoặc gang đã hỏng hóc, giáo viên dùng tay quay pít-tông di chuyển chậm chạp. Học sinh không thể hình dung được tốc độ cháy nổ thật ($2.000 - 4.000\text{ vòng/phút}$), tiếng nổ, sự thay đổi áp suất nhiệt độ trong kỳ nén và kỳ cháy giãn nở.
* **Mô hình toán học:**
  * Tỉ số nén: $\varepsilon = \frac{V_a}{V_c} = \frac{V_s + V_c}{V_c}$
  * Áp suất cuối kỳ nén: $P_c = P_a \cdot \varepsilon^n$ (với $n$ là chỉ số nén đa hướng $1.32 - 1.38$).
* **Thiết kế tương tác trên Bảng Socratic:**
  * Cắt lớp động cơ 3D hoàn chỉnh: Pít-tông, thanh truyền, trục khuỷu, xupap nạp, xupap xả, bugi đánh lửa.
  * Từng kỳ được mã hóa màu rực rỡ: 
    * Kỳ 1: Nạp (Màu xanh lam mát mẻ, xupap nạp mở, pít-tông đi xuống hút hòa khí).
    * Kỳ 2: Nén (Màu vàng cam, 2 xupap đóng kín, pít-tông đi lên nén áp suất vọt lên $15\text{ bar}$).
    * Kỳ 3: Cháy - Giãn nở sinh công (Bugi nảy chớp lửa điện, khí bốc cháy đỏ rực đẩy pít-tông đi xuống sinh công hữu ích).
    * Kỳ 4: Xả (Màu khói xám, xupap xả mở, pít-tông đi lên quét sạch khí thải ra ống xả).
  * Học sinh kéo thanh trượt điều chỉnh **Góc đánh lửa sớm** (Ignition Timing): Đánh lửa quá sớm gây tiếng gõ động cơ (Knocking); đánh lửa quá trễ làm động cơ mất lực kéo và nóng máy.

---

### BÀI 8: BỘ VI SAI Ô TÔ (DIFFERENTIAL GEAR) & HỘP SỐ TRUYỀN LỰC KHI VÀO CUA
* **Vị trí trong SGK:** Công nghệ 11 (Cơ khí động lực, Bài: Hệ thống truyền lực trên ô tô).
* **Tại sao trường học phải "dạy chay":**
  * Đây là cơ cấu bánh răng hành tinh không gian 3D phức tạp nhất trong chương trình THPT. Đa số giáo viên chỉ có hình vẽ phẳng 2D trong sách giáo khoa, học sinh không tài nào hình dung nổi tại sao khi xe ô tô vào cua, **bánh xe phía ngoài cua lại tự động quay nhanh hơn bánh xe phía trong cua** mà trục truyền động từ động cơ vẫn quay đều!
* **Mô hình toán học:**
  * Vận tốc góc bánh răng vi sai:
    $$\omega_{trục\_chính} = \frac{\omega_{bánh\_trái} + \omega_{bánh\_phải}}{2}$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Khối 3D cơ cấu vi sai gồm: Bánh răng quả dứa (Pinion), Vành chậu (Ring gear), Vỏ vi sai, 2 Bánh răng hành tinh (Spider gears) và 2 Bánh răng bán trục (Side gears).
  * Học sinh dùng tay "giữ cứng" bánh xe bên trái trên màn hình: Quan sát bánh răng hành tinh lập tức tự xoay quanh trục của nó, truyền toàn bộ tốc độ sang đẩy bánh xe bên phải quay nhanh gấp 2 lần.
  * Thử nghiệm tình huống bánh xe sa vào vũng lầy trơn trượt (Mất độ bám đường) và cách hoạt động của Khóa vi sai (Diff-Lock).

---

### BÀI 9: CÁNH TAY ROBOT 3 BẬC TỰ DO (3-DOF ARM) & BÀI TOÁN ĐỘNG HỌC NGƯỢC
* **Vị trí trong SGK:** Tin học 10/11 (Chuyên đề Tin học: Robot giáo dục) & Công nghệ 12 (Công nghệ tự động hóa).
* **Tại sao trường học khó thực hành:**
  * Mua cánh tay robot thật (như Dobot Magician hay cánh tay in 3D gắn servo SG90) rất dễ bị cháy bánh răng nhựa, rung lắc sai số lớn và phần mềm điều khiển phức tạp.
  * Sách chỉ dạy lập trình góc quay đơn giản, không dạy giải thuật để đầu gắp đi theo một đường thẳng mượt mà.
* **Mô hình toán học:**
  * Động học thuận (Forward Kinematics):
    $$x = l_1 \cos\theta_1 + l_2 \cos(\theta_1 + \theta_2)$$
    $$y = l_1 \sin\theta_1 + l_2 \sin(\theta_1 + \theta_2)$$
  * Động học ngược (Inverse Kinematics): Tìm góc quay $(\theta_1, \theta_2)$ khi biết tọa độ đích $(x, y)$.
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh dùng bút chấm vào bất kỳ điểm nào trên mặt bảng: Cánh tay robot 3D tự động co duỗi tính toán giải thuật ma trận góc quay Jacobi để đưa đầu gắp chạm chính xác vào điểm đó.
  * Cảnh báo vùng không gian công tác (Singularity & Workspace boundary) khi học sinh chỉ điểm vượt quá tầm với của cánh tay.

---

### BÀI 10: XE TỰ HÀNH 2 BÁNH TỰ CÂN BẰNG THUẬT TOÁN PID
* **Vị trí trong SGK:** Chuyên đề STEM Robotics & Tin học ứng dụng THPT.
* **Tại sao trường học khó làm:**
  * Lắp ráp robot thật dùng mạch Arduino, cảm biến góc nghiêng MPU6050 và động cơ bước tốn kém linh kiện. Quan trọng nhất: Khi chưa tìm được thông số $K_p, K_i, K_d$ chuẩn, xe sẽ giật lắc điên cuồng và đập xuống sàn gãy khung cơ khí.
* **Mô hình toán học:**
  * Bộ điều khiển PID hồi tiếp góc nghiêng $\theta$:
    $$u(t) = K_p e(t) + K_i \int_0^t e(\tau) d\tau + K_d \frac{de(t)}{dt}$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh kéo 3 thanh trượt $K_p, K_i, K_d$:
    * Nếu $K_p$ quá nhỏ $\to$ xe không đủ lực chống rơi, ngã đổ.
    * Nếu $K_p$ quá lớn $\to$ xe rung bần bật mất ổn định.
    * Tăng $K_d$ để hãm quán tính rung giật, tinh chỉnh $K_i$ để triệt tiêu sai số góc tĩnh.
  * Giúp học sinh nắm vững trực giác điều khiển tự động học mà không sợ hỏng bất kỳ linh kiện nào!

---

# PHÂN HỆ III: HÓA HỌC THPT (LỚP 10 - 11 - 12)

---

### BÀI 11: ĐIỀU CHẾ VÀ KHẢO SÁT TÍNH TẨY MÀU CỦA KHÍ CLO ($Cl_2$) KHÔ VS KHÍ CLO ẨM
* **Vị trí trong SGK:** Hóa học 10 (Chương 7: Nhóm nguyên tố Halogen, Tính chất hóa học của Clo).
* **Tại sao trường học BẮT BUỘC "DẠY CHAY":**
  * **Khí Clo cực độc (Độc bảng B):** Từng bị sử dụng làm vũ khí hóa học trong Thế chiến thứ nhất. Khí $Cl_2$ nặng hơn không khí, có mùi hắc nồng nặc phá hủy niêm mạc phổi gây co thắt phế quản cấp tính.
  * Hầu hết các phòng thí nghiệm trường THPT ở Việt Nam **hoàn toàn không có tủ hút khí độc đạt chuẩn**. Nếu làm thí nghiệm thật điều chế từ $KMnO_4 + HCl$ đặc, khí clo rò rỉ sẽ làm ngạt cả lớp học và ăn mòn rỉ sét toàn bộ quạt trần, máy tính trong phòng.
* **Phương trình phản ứng:**
  $$2KMnO_4 + 16HCl_{đặc} \xrightarrow{t^\circ} 2KCl + 2MnCl_2 + 5Cl_2 \uparrow + 8H_2O$$
  * *Bình 1 (Khí Clo khô qua axit $H_2SO_4$ đặc làm khô):* Tấm giấy quỳ tím/vải màu **hoàn toàn không bị mất màu**.
  * *Bình 2 (Khí Clo ẩm có nước):* Tạo axit hipoclorơ $HClO$ có tính oxy hóa cực mạnh làm **mất màu vải nhuộm tức thì**:
    $$Cl_2 + H_2O \rightleftharpoons HCl + HClO \quad (HClO \to HCl + [O])$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Mô hình bình điều chế thủy tinh kín với dòng khí màu vàng lục $Cl_2$ sục qua các bình rửa khí.
  * Học sinh dùng kẹp gắp tấm vải màu thả vào bình 1 và bình 2: Tận mắt thấy sự khác biệt bản chất giữa clo khô (không tẩy màu) và clo ẩm (tẩy trắng phau trong 2 giây).

---

### BÀI 12: PHẢN ỨNG NỔ CỦA KIM LOẠI KIỀM ($Na, K$) VỚI NƯỚC VÀ DUNG DỊCH AXIT
* **Vị trí trong SGK:** Hóa học 12 (Chương: Kim loại kiềm, kim loại kiềm thổ, nhôm).
* **Tại sao trường học cực kỳ hạn chế làm:**
  * Giáo viên rất sợ tai nạn bỏng hóa chất: Mẩu kim loại Natri hoặc Kali nếu cắt to bằng hạt ngô thả vào chậu nước sẽ sinh nhiệt cực lớn, khí $H_2$ thoát ra bốc cháy ngọn lửa màu vàng/tím, sau đó **nổ tung bắn các giọt kiềm nóng chảy $NaOH/KOH$ vào mắt và mặt học sinh**.
* **Phương trình phản ứng:**
  $$2Na + 2H_2O \to 2NaOH + H_2 \uparrow \quad (\Delta H < 0, \text{Tỏa nhiệt dữ dội})$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh chọn mẩu kim loại: Liti ($Li$), Natri ($Na$), Kali ($K$), Rubidi ($Rb$), Xesi ($Cs$).
  * Kéo thanh trượt kích thước hạt kim loại từ $1\text{ mm} \to 20\text{ mm}$: Thả vào cốc nước có nhỏ sẵn dung dịch Phenolphthalein.
  * Màn hình mô phỏng chuyển động vo tròn chạy trên mặt nước, dung dịch chuyển sang màu hồng cánh sen, kèm hiệu ứng bốc khói, bắt lửa và phát nổ bắn bọt nước chân thực với âm thanh mô phỏng cường độ nổ tương ứng.

---

### BÀI 13: CHUYỂN DỊCH CÂN BẰNG HÓA HỌC KHÍ $NO_2 \rightleftharpoons N_2O_4$ THEO NHIỆT ĐỘ & ÁP SUẤT
* **Vị trí trong SGK:** Hóa học 10 (Chương: Tốc độ phản ứng và Cân bằng hóa học, Nguyên lý chuyển dịch cân bằng Le Chatelier).
* **Tại sao trường học phải "dạy chay":**
  * Khí $NO_2$ (Nitơ đioxit) màu nâu đỏ là khí cực kỳ độc hại cho đường hô hấp. Việc điều chế khí $NO_2$ từ đồng ($Cu$) và axit nitric đặc ($HNO_3$) sinh ra lượng khói độc màu nâu lớn rất nguy hiểm.
* **Phương trình cân bằng:**
  $$\underbrace{2NO_2\text{ (khí màu nâu đỏ)}}_{2\text{ mol khí}} \rightleftharpoons \underbrace{N_2O_4\text{ (khí không màu)}}_{1\text{ mol khí}} \quad (\Delta_r H_{298}^\circ = -57.2\text{ kJ} < 0, \text{Phản ứng tỏa nhiệt})$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Hai ống nghiệm kín chứa hỗn hợp khí đặt cạnh nhau:
    * Ống 1 ngâm vào cốc nước đá ($0^\circ\text{C}$): Cân bằng chuyển dịch theo chiều tỏa nhiệt (chiều thuận tạo $N_2O_4$) $\to$ **Màu nâu đỏ nhạt dần và chuyển thành không màu**.
    * Ống 2 ngâm vào cốc nước nóng ($80^\circ\text{C}$): Cân bằng chuyển dịch theo chiều thu nhiệt (chiều nghịch tạo $NO_2$) $\to$ **Màu nâu đỏ đậm đặc lên rõ rệt**.
  * Bơm pít-tông nén thể tích ống khí: Áp suất tăng $\to$ cân bằng chuyển dịch về phía giảm số mol khí ($N_2O_4$).

---

### BÀI 14: CHUẨN ĐỘ ĐIỆN THẾ AXIT - BAZƠ & ĐƯỜNG CONG pH
* **Vị trí trong SGK:** Hóa học 11 (Chương: Cân bằng hóa học trong dung dịch nước, Sự điện ly, Phép chuẩn độ axit - bazơ).
* **Tại sao trường học thực hành hay thất bại:**
  * Chuẩn độ bằng buret thủ công nhỏ giọt: Học sinh thường mở khóa buret quá nhanh làm dung dịch $NaOH$ rơi ồ ạt vượt qua "điểm tương đương", làm màu dung dịch đổi tím thẫm (hỏng phép đo).
  * Máy đo pH điện cực thủy tinh ở trường học thường xuyên bị khô màng mỏng, hỏng điện cực hoặc chưa được chuẩn hóa bằng dung dịch đệm chuẩn (Buffer solutions).
* **Mô hình toán học:**
  * Phương trình Henderson - Hasselbalch và cân bằng tích số ion của nước $K_w = [H^+][OH^-] = 10^{-14}$.
* **Thiết kế tương tác trên Bảng Socratic:**
  * Buret chứa dung dịch chuẩn $NaOH\ 0.1\text{M}$ nhỏ từng giọt $0.05\text{ mL}$ vào cốc chứa $HCl\ 0.1\text{M}$.
  * Màn hình vẽ đồ thị đường cong pH thời gian thực: Từ $\text{pH}=1$, tăng rất chậm lên $\text{pH}=3$, sau đó chỉ cần thêm **1 giọt dung dịch** tại điểm tương đương $V = 20\text{ mL}$, đường cong pH vọt dựng đứng từ $\text{pH}=4$ lên $\text{pH}=10$ (Bước nhảy pH kinh điển).

---

# PHÂN HỆ IV: SINH HỌC & DI TRUYỀN PHÂN TỬ THPT

---

### BÀI 15: ĐIỆN DI GEL AGAROSE PHÂN TÍCH ĐOẠN DNA & ĐỘT BIẾN GEN
* **Vị trí trong SGK:** Sinh học 10 (Thành phần hóa học tế bào, Cấu trúc DNA) & Sinh học 12 (Công nghệ gen, Ứng dụng di truyền học y học, Giám định pháp y ADN).
* **Tại sao trường học BẮT BUỘC "DẠY CHAY":**
  * Bể điện di DNA kèm nguồn điện cao áp một chiều ($100 - 150\text{ V}$), khay đổ gel agarose, hóa chất enzyme cắt giới hạn restriction endonuclease có giá hàng chục triệu đồng.
  * **Đặc biệt nguy hiểm:** Chất nhuộm DNA truyền thống Ethidium Bromide ($EtBr$) là chất xen vào chuỗi xoắn kép DNA gây đột biến gen và nguy cơ ung thư cực cao, bị cấm sử dụng đối với học sinh phổ thông.
* **Nguyên lý sinh học:**
  * Bộ xương đường - photphat của phân tử DNA tích điện âm ($-$) do các nhóm photphat $PO_4^{3-}$. Khi đặt trong điện trường, các đoạn DNA di chuyển từ cực âm sang cực dương.
  * Đoạn DNA càng ngắn thì luồn lách qua các lỗ xốp của gel agarose càng nhanh và đi được quãng đường càng xa.
* **Thiết kế tương tác trên Bảng Socratic:**
  * Học sinh dùng micropipette ảo tra các mẫu DNA của Nghi phạm 1, Nghi phạm 2 và Mẫu hiện trường vào các giếng gel.
  * Bật công tắc điện di: Các vạch DNA huỳnh quang màu cam/xanh di chuyển tách dải theo thời gian thực dưới ánh đèn tia cực tím (UV Transilluminator).
  * Học sinh đối chiếu thang đo chuẩn (DNA Ladder) để xác định kích thước đoạn gen bị đột biến mất đoạn hoặc thêm đoạn.

---

### BÀI 16: THÍ NGHIỆM LAI GIỐNG RUỒI GIẤM CỦA MORGAN (HOÁN VỊ GEN & LIÊN KẾT GEN)
* **Vị trí trong SGK:** Sinh học 12 (Chương: Tính quy luật của hiện tượng di truyền, Bài: Liên kết gen và Hoán vị gen của Thomas Hunt Morgan).
* **Tại sao trường học BẮT BUỘC "DẠY CHAY":**
  * Nuôi ruồi giấm (*Drosophila melanogaster*) trong phòng thí nghiệm trường học cực kỳ phiền toái: Phải nấu môi trường bột ngô men chuối, ruồi bay lung tung gây mất vệ sinh, thời gian lai giống và đẻ trứng kéo dài từ **3 đến 4 tuần lễ**.
  * Học sinh phải dùng thuốc mê ete gây mê ruồi rồi soi kính lúp đếm hàng ngàn con ruồi giấm để tính tỉ lệ kiểu hình $\to$ hoàn toàn bất khả thi trong 1 tiết học 45 phút.
* **Mô hình toán học:**
  * Tần số hoán vị gen:
    $$f = \frac{\text{Số cá thể tái tổ hợp}}{\text{Tổng số cá thể tạo thành}} \times 100\% \quad (f \le 50\%)$$
* **Thiết kế tương tác trên Bảng Socratic:**
  * Cho lai ruồi cái thân xám, cánh dài thuần chủng với ruồi đực thân đen, cánh cụt $\to$ được $F_1$. Sau đó lai phân tích ruồi cái $F_1$.
  * Hệ thống tự động sinh số liệu ngẫu nhiên mô phỏng quần thể $2.000$ cá thể ruồi con chỉ trong **1 giây**:
    * $965$ Thân xám, cánh dài ($41.5\%$)
    * $944$ Thân đen, cánh cụt ($41.5\%$)
    * $206$ Thân xám, cánh cụt ($8.5\%$)
    * $185$ Thân đen, cánh dài ($8.5\%$)
  * Học sinh tính ngay ra tần số hoán vị gen $f = \frac{206 + 185}{2300} \approx 17\%$, vẽ bản đồ di truyền xác định khoảng cách giữa 2 gen là $17\text{ cM}$ (centimorgan) đúng như thí nghiệm lịch sử của Morgan đoạt giải Nobel 1933.

---

## MA TRẬN TỔNG HỢP SO SÁNH 16 BÀI THỰC HÀNH THPT

| STT | Tên Thí nghiệm | Môn học & Khối lớp | Rào cản khiến trường THPT phải "Dạy chay" | Giải thuật Mô phỏng Lõi trên Bảng |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Con lắc ngược Cart-Pole** | Vật lí 10 / Robot | Cực kỳ khó cân bằng, thiết bị thật $> 150$ triệu | Hệ phương trình vi phân phi tuyến Lagrange, RK4 |
| **2** | **Va chạm đệm khí** | Vật lí 10 | Băng đệm khí cong vênh, ma sát lớn, ồn ào | Bảo toàn động lượng, hệ số phục hồi $e$, xung lực $\int Fdt$ |
| **3** | **Ống tia Catot Thomson $e/m$** | Vật lí 11 | Điện áp nguy hiểm $5.000\text{ V}$, bóng chân không đắt | Quỹ đạo hạt Lorentz $\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B})$ |
| **4** | **Hãm từ Foucault & Đệm từ** | Vật lí 11 | Không nhìn thấy dòng điện Foucault vô hình | Phương trình Maxwell cảm ứng, mật độ dòng $\mathbf{J} = \sigma(\mathbf{v}\times\mathbf{B})$ |
| **5** | **Đo hằng số Planck quang điện**| Vật lí 12 | Thiết bị đắt tiền, dòng nano-ampe bị nhiễu điện | Phương trình Einstein $hf = A + e|U_h|$, hồi quy tuyến tính |
| **6** | **Tán xạ hạt Alpha & Phóng xạ** | Vật lí 12 | **Cấm lưu trữ nguồn phóng xạ trong trường học** | Tán xạ Coulomb Rutherford $\sin^{-4}(\theta/2)$, phân rã Poisson |
| **7** | **Động cơ đốt trong 4 kỳ** | Công nghệ 11 / Lí 12| Mô hình tĩnh quay tay, không thấy cháy nổ áp suất| Động học piston-trục khuỷu, chu trình nhiệt áp suất $P-v$ |
| **8** | **Bộ vi sai ô tô khi vào cua** | Công nghệ 11 | Cơ cấu không gian phức tạp, khó hình dung 2D | Động học hệ bánh răng hành tinh $\omega = (\omega_1+\omega_2)/2$ |
| **9** | **Cánh tay Robot 3 bậc tự do** | Tin học / CN 12 | Khớp nhựa dễ vỡ, thuật toán khó với học sinh | Động học ngược Inverse Kinematics (Ma trận Jacobi) |
| **10**| **Robot 2 bánh tự cân bằng PID**| STEM Robot THPT | Xe ngã gãy khung, cháy servo khi sai thông số | Bộ lọc bù Complementary Filter, thuật toán PID rời rạc |
| **11**| **Khí Clo khô vs Clo ẩm** | Hóa học 10 | **Khí Clo cực độc, trường không có tủ hút khí** | Phản ứng oxy hóa tạo $HClO$, động học tẩy màu vải nhuộm |
| **12**| **Natri / Kali nổ trong nước** | Hóa học 12 | **Nguy cơ nổ bắn kiềm nóng làm bỏng mắt học sinh**| Động học tỏa nhiệt Arrhenius, tạo bọt khí hydro $H_2$ |
| **13**| **Cân bằng khí $NO_2 \rightleftharpoons N_2O_4$**| Hóa học 10 | Khí $NO_2$ nâu đỏ độc hại niêm mạc phổi | Nguyên lý Le Chatelier, hằng số cân bằng $K_p(T)$ |
| **14**| **Chuẩn độ điện thế Axit - Bazơ**| Hóa học 11 | Nhỏ giọt quá tay trượt màu, điện cực pH hỏng | Phương trình Henderson-Hasselbalch, tích số $K_w$ |
| **15**| **Điện di Gel Agarose DNA** | Sinh học 10 / 12 | Máy đắt, chất nhuộm $EtBr$ gây ung thư | Vận tốc di chuyển phân tử trong gel $v \propto 1/\log(bp)$ |
| **16**| **Lai ruồi giấm Hoán vị gen** | Sinh học 12 | Nuôi ruồi mất 4 tuần, đếm hàng ngàn con ruồi | Di truyền học Men-đen & Morgan, tần số hoán vị $f \le 50\%$ |

---

## 🎯 GIÁ TRỊ VÀNG KHI ĐƯA VÀO DỰ ÁN KHKT / SẢN PHẨM CỦA BẠN

1. **Thuyết phục Giám khảo cuộc thi KHKT cấp Tỉnh/Quốc gia:**
   * Thay vì chọn những đề tài quá xa vời như máy gia tốc hạt hay hố đen vũ trụ (dễ bị giám khảo nghi ngờ do sao chép hoặc không thực tế), bộ 16 bài thí nghiệm này nằm **ngay trong Sách giáo khoa THPT hiện hành**. Giám khảo (thường là giảng viên ĐH Sư phạm hoặc giáo viên dạy Chuyên THPT) sẽ lập tức đánh giá cực cao vì dự án giải quyết trúng **"nỗi đau thế kỷ của giáo dục Việt Nam: Học chay vì thiếu thiết bị và sợ nguy hiểm"**.
2. **Kịch bản Trợ giảng AI Socratic Scaffolding đi kèm:**
   * Trong bài Chuẩn độ pH: Khi học sinh nhỏ quá nhiều kiềm, AI không nói "Em làm sai rồi", mà hỏi gợi mở: *"Giá trị pH vừa nhảy vọt từ 3 lên 11 chỉ sau một giọt, hiện tượng này trong hóa học gọi là gì và em cần làm gì để tìm chính xác điểm tương đương?"*.
   * Trong bài Lai ruồi giấm: AI hỏi: *"Tại sao tổng tỉ lệ hai kiểu hình thân xám cánh cụt và thân đen cánh dài chỉ chiếm 17% mà không phải 50% như quy luật phân ly độc lập của Men-đen?"*.

