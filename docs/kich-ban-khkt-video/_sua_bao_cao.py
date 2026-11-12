"""Sửa các chỗ báo cáo KHKT mô tả sai cấu trúc hệ thống / nguyên lý hoạt động (đối chiếu .ai/ARCHITECTURE.md, docs/CURRENT_SPECS.md, mã nguồn):
python -I -X utf8 _sua_bao_cao.py   (đọc/ghi docs/BAO_CAO_KHOA_HOC_KY_THUAT_SOCRATIC_VISION_BOARD.md; bản gốc lưu thành .truoc-sua.md)"""
import os
import shutil

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'BAO_CAO_KHOA_HOC_KY_THUAT_SOCRATIC_VISION_BOARD.md')
shutil.copyfile(P, P.replace('.md', '.truoc-sua.md'))
s = open(P, encoding='utf-8').read()


def sub(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)


sub('2. Thuật toán nhận dạng nét vẽ dựa trên cây cú pháp trừu tượng AST, kết hợp công cụ đại số máy tính SymPy CAS chạy ngoại tuyến trên máy khách, đạt độ trễ phản hồi tức thì 12ms và xử lý tại chỗ 81,4% truy vấn mà không tốn chi phí gọi API đám mây.',
    '2. Cơ chế nhận dạng và định tuyến: nét viết và vùng khoanh được đọc bằng mô hình thị giác và OCR cục bộ (RapidOCR, LaTeX ONNX) ở máy chủ AI Engine, bộ định tuyến cục bộ chọn mô phỏng phù hợp, và hệ đại số máy tính SymPy trên máy chủ AI Engine kiểm chứng từng bước giải của học sinh; phần lớn truy vấn (81,4% theo Bảng 4.4) được xử lý mà không phải gọi mô hình ngôn ngữ trên đám mây.')
sub('xử lý đại số máy tính ngoại tuyến và bảo vệ sư phạm Socratic', 'kiểm chứng đại số bằng máy chủ AI Engine và bảo vệ sư phạm Socratic')
sub('phân giải biểu thức toán học thành cây cú pháp và định tuyến mô phỏng với thời gian phản hồi dưới 50ms mà không tốn chi phí gọi API đám mây?',
    'đọc chữ viết thành công thức, định tuyến mô phỏng và kiểm chứng từng bước giải với thời gian phản hồi thấp mà hạn chế tối đa việc gọi mô hình ngôn ngữ trên đám mây?')
sub('Giả thiết 1: Cơ chế định tuyến cục bộ dựa trên cây cú pháp trừu tượng AST kết hợp đại số máy tính SymPy CAS ngoại tuyến có thể xử lý thành công trên 80% các biểu thức STEM chuẩn hóa với độ trễ dưới 30ms, giúp hệ thống hoạt động ổn định và tin cậy ngay cả khi mất kết nối Internet hoàn toàn.',
    'Giả thiết 1: Cơ chế định tuyến cục bộ kết hợp đại số máy tính SymPy chạy trên máy chủ AI Engine có thể xử lý trên 80% các biểu thức STEM chuẩn hóa mà không cần gọi mô hình ngôn ngữ đám mây, với độ trễ dưới 30ms.')
sub('1. Thiết kế và làm chủ kiến trúc phần mềm ba phân hệ: Teacher Board trên bục giảng, AI Engine Hub điều phối, và Student Companion trên thiết bị học sinh.',
    '1. Thiết kế và làm chủ kiến trúc phần mềm gồm bốn thành phần: Teacher Console (trang soạn bài, quản lý lớp), Teacher Board (bảng tương tác tại lớp), Student App (ứng dụng gia sư trên điện thoại học sinh) và máy chủ AI Engine làm trung tâm điều phối.')
sub('3. Phát triển thuật toán nhận dạng cú pháp AST, thuật toán vi phân', '3. Phát triển cơ chế nhận dạng nét viết và định tuyến mô phỏng, thuật toán vi phân')
sub('được tổ chức theo mô hình ba phân hệ độc lập nhưng đồng bộ chặt chẽ thời gian thực như thể hiện trên Hình 3.1 và được đặc tả chi tiết ở Bảng 3.1:',
    'được tổ chức theo mô hình bốn thành phần: ba ứng dụng (Teacher Console, Teacher Board, Student App) chỉ trao đổi với nhau thông qua máy chủ AI Engine, như thể hiện trên Hình 3.1 và được đặc tả chi tiết ở Bảng 3.1. Cuối mỗi tiết học, bài giảng trên bảng được đóng gói và gửi xuống ứng dụng học sinh qua mã QR hoặc liên kết, tạo thành một luồng dữ liệu từ lớp học về nhà.')
# Bảng 3.1: thay ba dòng bằng bốn dòng
i = s.index('| **Teacher Board** | Next.js 14, React 18, WebGL')
j = s.index('*Bảng 3.1')
s = s[:i] + '''| **Teacher Console** | Next.js 14, React 18, TypeScript | Trang quản lý của giáo viên: tài khoản, lớp và học sinh, kho tài nguyên, bài soạn, giáo án, soạn tiết và điều khiển tiết học; đẩy kịch bản tiết lên bảng. |
| **Teacher Board** | Next.js 14, React 18, Canvas 2D, SVG, Web Audio API | Bảng tương tác tại lớp: viết vẽ tự nhiên với từ chối lòng bàn tay (Pointer Events), nhận dạng nét và định tuyến cục bộ, dựng mô phỏng ngay trên bảng, khung ngắm tự mờ sau 2 giây, âm thanh tổng hợp, đóng gói bài giảng thành mã QR cuối tiết. |
| **Student App** | Next.js 14, TailwindCSS | Ứng dụng gia sư Socratic của học sinh: giải bài theo từng bước (Locked Stepper), công cụ gỡ lỗi trực quan (Visual Debuggers), chặn yêu cầu xin đáp án, nhận gói bài giảng qua mã QR hoặc liên kết, bảng theo dõi cho giáo viên và phụ huynh. |
| **AI Engine** | Python, FastAPI, SymPy, RapidOCR, LaTeX ONNX, Gemini Vision (tùy chọn), WebSocket | Máy chủ trung tâm: nhận diện chữ viết tay qua mô hình thị giác và OCR, kiểm chứng đại số từng bước bằng SymPy, hàng rào Socratic chặn lộ đáp án, tài khoản, tiết học, chỉ số học tập, đồng bộ phòng BYOD. |

''' + s[j:]
sub('Hình 3.1: Sơ đồ khối kiến trúc phân tầng và luồng dữ liệu hệ thống Socratic Vision Board](figures/fig_3_1_architecture.png)',
    'Hình 3.1: Sơ đồ khối bốn thành phần và luồng dữ liệu hệ thống Socratic Vision Board](figures/fig_3_1_architecture.png) **[CẦN VẼ LẠI HÌNH: bản cũ ghi ba phân hệ]**')
sub('*Bảng 3.1: Đặc tả kỹ thuật các phân hệ kiến trúc trong hệ thống Socratic Vision Board*', '*Bảng 3.1: Đặc tả kỹ thuật bốn thành phần trong hệ thống Socratic Vision Board (theo mã nguồn hiện tại)*')
# 3.3: viết lại ba giai đoạn
i = s.index('Nhằm đáp ứng tiêu chuẩn phản hồi tức thời trong lớp học, hệ thống áp dụng cơ chế định tuyến thông minh dựa trên cây cú pháp')
j = s.index('![Hình 3.2')
s = s[:i] + '''Nhằm đáp ứng tiêu chuẩn phản hồi tức thời trong lớp học, hệ thống áp dụng cơ chế nhận dạng và định tuyến nhiều tầng như thể hiện trên Hình 3.2. Quy trình xử lý nét viết của giáo viên trải qua ba giai đoạn kỹ thuật:

Giai đoạn 1: Định tuyến cục bộ ngay trên bảng. Khi giáo viên viết hoặc khoanh vùng, Teacher Board thử xử lý ngay tại chỗ theo thứ tự: bộ định tuyến cục bộ (đối sánh từ khóa và mẫu với danh mục mô phỏng chuẩn hóa), rồi nhận dạng khối hình học và phác thảo từ cấu trúc nét. Nếu một trong hai bước nhận ra nội dung, mô phỏng được dựng ngay mà không gửi gì lên máy chủ.

Giai đoạn 2: Nhận dạng chữ viết tại máy chủ AI Engine. Nếu bảng chưa xử lý được, ảnh vùng khoanh và nét vector được gửi tới máy chủ AI Engine. Tại đây, chữ viết tay được đọc bằng mô hình thị giác và bộ OCR cục bộ (RapidOCR, LaTeX ONNX) thành công thức, sau đó máy chủ trả về bản thiết kế mô phỏng (blueprint) và câu hỏi gợi mở. Hệ đại số máy tính SymPy chạy trên máy chủ này, dùng để kiểm chứng từng bước giải của học sinh trong Student App; vì vậy kiểm chứng đại số cần kết nối tới máy chủ.

Giai đoạn 3: Hàng rào bảo vệ sư phạm Socratic Guardrails. Với những câu hỏi suy luận mở cần gửi lên mô hình ngôn ngữ đám mây, hàng rào Socratic chặn việc mô hình trả về đáp án số học cuối cùng, thay vào đó phân tích điểm nghẽn nhận thức của học sinh và chuyển hóa thành câu hỏi gợi mở bản chất dạng *"Nếu tăng thông số này lên 2 lần, đại lượng kia sẽ biến đổi theo hàm bậc mấy?"* để học sinh tự mình khám phá lời giải.

''' + s[j:]
sub('Hình 3.2: Lưu đồ thuật toán phân giải cây cú pháp AST và định tuyến mô hình Socratic](figures/fig_3_2_flowchart.png)',
    'Hình 3.2: Lưu đồ nhận dạng nét viết và định tuyến mô phỏng](figures/fig_3_2_flowchart.png) **[CẦN VẼ LẠI HÌNH: bản cũ vẽ cây cú pháp AST]**')
sub('*Hình 3.2: Lưu đồ thuật toán phân giải cây cú pháp trừu tượng AST và định tuyến mô hình Socratic*', '*Hình 3.2: Lưu đồ nhận dạng nét viết và định tuyến mô phỏng (định tuyến cục bộ → máy chủ AI Engine → hàng rào Socratic)*')
sub('Giải toán đại số SymPy tại chỗ 12ms, hoạt động ngoại tuyến', 'Kiểm chứng đại số SymPy ở máy chủ AI Engine, ít gọi mô hình đám mây (12ms theo Bảng 4.4, **[CẦN XÁC NHẬN cách đo]**)')
sub('Nhật ký Vector Journal siêu nhẹ dưới 2,5MB, học sinh tự tua và thao tác', 'Gói bài giảng nén gửi về học sinh (module Vector Journal mục tiêu dưới 2,5MB, **chưa nối vào giao diện chính**)')
sub('Trong module `vectorJournal.ts`, toàn bộ diễn tiến', '**Lưu ý trung thực:** module `vectorJournal.ts` đã có mã và kiểm thử nhưng chưa được nối vào giao diện Teacher Board; các số liệu dưới đây là mục tiêu thiết kế, chưa đo trên một tiết học thực. Trong module `vectorJournal.ts`, toàn bộ diễn tiến')
sub('| **Bộ đệm Semantic Cache** |', '| **Bộ đệm gợi mở theo mẫu (khớp từ khóa)** |')
sub('| **Tổng cộng ngoại tuyến** | **$81,4\\%$** |', '| **Tổng cộng không gọi LLM đám mây** | **$81,4\\%$** |')
sub('*Bảng 4.4: Hiệu quả xử lý ngoại tuyến và độ trễ phản hồi hệ thống*', '*Bảng 4.4: Hiệu quả xử lý không gọi mô hình ngôn ngữ đám mây và độ trễ phản hồi hệ thống*')
sub('Khả năng chạy ngoại tuyến 81,4% giúp hệ thống thích ứng tốt với hạ tầng mạng tại các vùng nông thôn và miền núi, thúc đẩy công bằng giáo dục số.',
    'Việc 81,4% truy vấn không cần gọi mô hình ngôn ngữ đám mây giúp giảm chi phí và độ phụ thuộc vào đường truyền; hệ thống vẫn cần kết nối tới máy chủ AI Engine (đặt tại trường hoặc đám mây) nên chưa phải giải pháp hoàn toàn ngoại tuyến.')
sub('định tuyến cú pháp AST kết hợp SymPy CAS ngoại tuyến,', 'định tuyến cục bộ kết hợp kiểm chứng SymPy ở máy chủ AI Engine,')
sub('với kiến trúc ba phân hệ hoàn chỉnh,', 'với kiến trúc bốn thành phần,')
open(P, 'w', encoding='utf-8').write(s)
print('đã sửa; bản gốc: ' + os.path.basename(P.replace('.md', '.truoc-sua.md')))
