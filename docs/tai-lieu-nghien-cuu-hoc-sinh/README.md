# BỘ TÀI LIỆU NGHIÊN CỨU CHUYÊN SÂU DÀNH CHO HỌC SINH DỰ THI VISEF / ISEF
## Đề tài: Nền tảng Bảng tương tác thông minh Socratic Vision Board

Chào các em học sinh trong nhóm tác giả dự thi!

Bộ tài liệu này được biên soạn nhằm trang bị cho các em kiến thức nền tảng vững chắc, sâu sắc và toàn diện về toàn bộ hệ thống phần mềm, các thuật toán toán học, cơ chế trí tuệ nhân tạo và phương pháp nghiên cứu khoa học của đề tài.

Khi đứng trước Hội đồng Ban Giám khảo (BGK) các cấp của cuộc thi Khoa học Kỹ thuật Quốc gia (ViSEF) hay Quốc tế (ISEF), điều mà các Giám khảo đánh giá cao nhất không phải là những thuật ngữ đao to búa lớn học vẹt, mà là **sự hiểu biết sâu sắc về bản chất, thái độ trung thực khoa học và khả năng tự tin giải trình mọi quyết định kỹ thuật** mà nhóm đã thực hiện.

---

### Cấu trúc bộ tài liệu ôn tập gồm 6 Chuyên đề

1. **[Chuyên đề 01: Tổng quan đề tài, Bối cảnh thực tiễn và Triết lý hệ thống](./01_TONG_QUAN_DE_TAI_VA_TRIET_LY_HE_THONG.md)**
   * Nắm vững bài toán thực tế của GDPT Việt Nam, hai triết lý *"AI as a Compiler"* và *"Socratic Scaffolding"*, đối sánh với 5 giải pháp lớn trên thế giới (PhET, Khanmigo, Algodoo, Chalktalk, Apple Math Notes).
   * *Cuối bài có 4 câu hỏi tự rèn luyện tư duy tổng quan.*

2. **[Chuyên đề 02: Kiến trúc phần mềm và Công nghệ Web hiện đại](./02_KIEN_TRUC_PHAN_MEM_VA_CONG_NGHE_WEB.md)**
   * Nắm vững kiến trúc phân tầng Next.js 14, FastAPI, Canvas 2D kết hợp SVG Overlay, Web Audio API tổng hợp âm thanh thủ tục, và giao thức đồng bộ Vector Journaling siêu nhẹ 1,2 KB/phút.
   * *Cuối bài có 4 câu hỏi tự rèn luyện kỹ thuật phần mềm.*

3. **[Chuyên đề 03: Thuật toán Vật lý, Toán học và Động cơ mô phỏng](./03_THUAT_TOAN_VAT_LY_TOAN_HOC_VA_MO_PHONG.md)**
   * Hiểu sâu thuật toán tích phân số Runge-Kutta bậc 4 (RK4) so với Euler, phương trình động lực học lò xo giảm chấn bậc 2 (Second-Order Spring-Damper), định luật Snell khúc xạ quang học và vai trò bảo đảm chính xác của SymPy CAS.
   * *Cuối bài có 4 câu hỏi tự rèn luyện toán lý chuyên sâu.*

4. **[Chuyên đề 04: Trí tuệ nhân tạo thị giác và Sư phạm gợi mở Socratic](./04_TRI_TUE_NHAN_TAO_THI_GIAC_VA_SU_PHAM_SOCRATIC.md)**
   * Nắm chắc phễu nhận dạng phác thảo 3 tầng ($1 Unistroke offline, Semantic Cache, Gemini Flash Vision), cây cú pháp trừu tượng AST, các lý thuyết sư phạm kinh điển (ZPD của Vygotsky, Cognitive Load của Sweller) và hàng rào Socratic Guardrails.
   * *Cuối bài có 4 câu hỏi tự rèn luyện AI và sư phạm.*

5. **[Chuyên đề 05: Kỹ thuật Bảng tương tác và Trải nghiệm lớp học](./05_KY_THUAT_BANG_TUONG_TAC_VA_TRAI_NGHIEM_LOP_HOC.md)**
   * Nắm vững công nghệ màn hình cảm ứng hồng ngoại 75"-86", chuẩn W3C Pointer Events, thuật toán Palm Rejection và Palm Eraser, tính năng Floating Screen Overlay trên PowerPoint, cơ chế Locked Stepper và 4 công cụ Visual Debuggers.
   * *Cuối bài có 4 câu hỏi tự rèn luyện trải nghiệm bục giảng.*

6. **[Chuyên đề 06: Phương pháp nghiên cứu và Xử lý số liệu thực nghiệm](./06_PHUONG_PHAP_NGHIEN_CUU_VA_XU_LY_SO_LIEU_THUC_NGHIEM.md)**
   * Làm chủ thiết kế thực nghiệm sư phạm đối chứng quasi-experiment ($n_1=42, n_2=44$), ý nghĩa các chỉ số thống kê toán ($p$-value $= 0{,}0002$, Cohen's $d = 0{,}88$, Cronbach's $\alpha = 0{,}89$), và số liệu kiểm thử tự động 432/432 tests passed 100%.
   * *Cuối bài có 4 câu hỏi tự rèn luyện phương pháp luận khoa học.*

---

### Lời khuyên vàng khi thuyết trình trước Ban Giám khảo

1. **Luôn bắt đầu từ Vấn đề thực tế (The "Why"):**
   Đừng vội khoe công nghệ AI hay thuật toán phức tạp ngay từ câu đầu tiên. Hãy kể cho Giám khảo nghe về nỗi trăn trở thực sự của các em: *"Chúng em thấy màn hình tương tác hàng trăm triệu trong lớp học bị biến thành máy chiếu thụ động, học sinh thì chỉ biết chép bài hoặc dùng AI để chép đáp số. Dự án này ra đời để trả lại bản chất thực nghiệm khám phá cho các môn khoa học."*

2. **Hiểu bản chất của mọi công thức và dòng mã:**
   Nếu các em viết công thức RK4 hay phương trình Spring-Damper lên poster, các em phải giải thích được từng biến số đại diện cho cái gì. Giám khảo sẽ đánh giá rất cao một học sinh THPT biết tại sao phương pháp Euler lại bị "nổ số" và tại sao RK4 lại triệt tiêu được sai số đó.

3. **Thái độ khiêm tốn, trung thực và cầu thị:**
   Nếu gặp câu hỏi quá khó hoặc vượt ngoài phạm vi nghiên cứu, đừng bao giờ nói mò hay bịa đặt số liệu. Hãy mỉm cười và trả lời tự tin: *"Dạ thưa Ban Giám khảo, đây là một hướng tiếp cận rất thú vị mà nhóm chúng em chưa khảo cứu hết trong phạm vi đề tài này. Chúng em xin phép được ghi nhận ý kiến quý báu của Thầy/Cô để tiếp tục mở rộng nghiên cứu trong giai đoạn tiếp theo ạ."*

Chúc các em nghiên cứu say mê và đạt kết quả xuất sắc nhất tại các vòng thi sắp tới!
