import {BIO_EXPERIMENTS} from '../lab/bio/experiments';
import type {PresetSpec} from './types';

const WITH_PREFIX = /^(?:thí nghiệm|thực hành)/i;

/**
 * Câu hỏi Socratic riêng từng bài, ba nhịp: dự đoán trước khi làm → số liệu/hiện tượng của CHÍNH lượt làm của em → phản biện một nhận định sai bằng kết quả đó.
 * Câu trả lời phụ thuộc lượt làm của từng học sinh nên chép câu hỏi đi hỏi máy không ra đáp án; test bắt buộc mọi bài có câu.
 */
export const BIO_LAB_QUESTIONS: Record<string, string> = {
  BIOMOLECULES: 'Trước khi nhỏ thuốc thử: em đoán mẫu nào chứa tinh bột, đường khử, protein, lipid. Sau khi làm: ghi màu từng ống của em, so với ống nước cất. Một mẫu của em đổi màu rất nhạt — em kết luận "có" hay "không"? Ống đối chứng giúp em quyết định thế nào?',
  CELL_OBSERVE: 'Trước khi quan sát: em đoán tế bào nào lớn nhất trong ba loại. Sau khi đo: ghi kích thước em đo được ở từng loại. Bạn em nói "tế bào miệng không có thành nên nhìn không rõ là do kính kém" — từ tiêu bản của em, em phản biện thế nào?',
  PLASMOLYSIS: 'Trước khi nhỏ muối: em đoán khối nguyên sinh chất sẽ co hay phồng, khoảng bao nhiêu phần trăm? Sau khi làm: ghi tỉ lệ diện tích em đo trước, sau khi nhỏ muối và sau khi nhỏ lại nước cất. Nếu lần thứ hai không phản co được, em nghi tế bào đã gặp chuyện gì?',
  ENZYME: 'Trước khi ủ: em đoán ở nhiệt độ và pH nào iodine hết xanh tím nhanh nhất? Sau khi làm: ghi thời gian em đo ở từng điều kiện. Bạn em nói "nhiệt độ càng cao enzyme càng mạnh" — số liệu của em ủng hộ đến mức nào và gãy ở đâu?',
  MITOSIS_SLIDE: 'Trước khi đếm: em đoán chỉ số phân bào ở chóp rễ khoảng bao nhiêu phần trăm? Sau khi đếm: ghi số tế bào phân chia trên tổng số ở từng thị trường của em. Các thị trường của em chênh nhau bao nhiêu, và vì sao không được lấy kết quả của một thị trường đẹp nhất?',
  YOGURT: 'Trước khi ủ: em đoán pH của ống có men và ống không men sẽ thay đổi thế nào theo giờ? Sau khi làm: ghi pH em đo ở các mốc. Một bạn nói "ủ càng nóng sữa chua càng nhanh" — số liệu ở các nhiệt độ của em có ủng hộ không?',
  VIRUS_SURVEY: 'Trước khi khảo sát: em đoán bệnh nào người ta biết cách phòng ít nhất. Sau khi khảo sát: ghi tỉ lệ em thu được cho từng bệnh và cỡ mẫu. Từ số liệu của em, chọn một bệnh để tuyên truyền và nói vì sao; nếu nhóm bạn chọn bệnh khác thì số liệu nào của em giúp hai nhóm tranh luận?',
  TRANSPIRATION: 'Trước khi cân: em đoán bôi vaseline mặt trên hay mặt dưới lá thì cây mất nước ít hơn. Sau khi làm: ghi lượng nước mất em cân được ở từng lô. Từ số liệu của em, khí khổng tập trung ở đâu? Lô nào là đối chứng, và nếu thiếu lô đó em có kết luận được không?',
  PIGMENT: 'Trước khi chạy sắc kí: em đoán vạch màu nào đi xa nhất. Sau khi chạy: ghi quãng đường dung môi và từng vạch, tính Rf của em. Nếu lần chạy của bạn có Rf khác của em, em kiểm tra những yếu tố nào trước khi kết luận ai sai?',
  LEAF_STARCH: 'Trước khi thử iodine: em vẽ dự đoán phần lá nào sẽ xanh tím. Sau khi làm: tả kết quả trên lá của em. Một bạn quên để cây trong tối trước và thấy cả lá đều xanh tím, rồi kết luận "ánh sáng không cần cho quang hợp" — sai ở đâu?',
  SEED_RESPIRATION: 'Trước khi làm: em đoán ống nước vôi nào vẩn đục trước. Sau khi làm: ghi mức độ vẩn đục hoặc lượng CO₂ em đo ở từng nhiệt độ. Bạn em hỏi "sao không dùng hạt khô làm đối chứng mà phải luộc chín?" — em trả lời thế nào?',
  CIRCULATION: 'Trước khi chạy: em đoán mạch của mình tăng lên bao nhiêu nhịp/phút. Sau khi đo: ghi mạch và huyết áp lúc nghỉ, ngay sau chạy, sau 5 phút nghỉ của chính em. So với bạn cùng nhóm, ai hồi phục nhanh hơn và điều đó có thể nói gì? Kết luận đó dựa trên một lần đo đã chắc chưa?',
  TROPISM: 'Trước khi bố trí: em đoán góc uốn của cây mầm sau 3 ngày. Sau khi làm: ghi góc em đo theo từng ngày ở lô thí nghiệm và lô đối chứng. Nếu lô đối chứng của em cũng uốn cong, em nghi bố trí có vấn đề gì?',
  APICAL_DOMINANCE: 'Trước khi bấm ngọn: em đoán số cành bên sẽ thay đổi thế nào. Sau khi theo dõi: ghi số cành và chiều cao của hai lô theo thời gian. Bạn em nói "bấm ngọn làm cây khỏe hơn" — số liệu của em cho thấy "khỏe hơn" theo nghĩa nào, và với cây lấy gỗ thì sao?',
  TREE_AGE: 'Trước khi đếm: em đoán cây đường kính lớn nhất bao nhiêu tuổi. Sau khi đếm: ghi số vòng em đếm và vẽ đồ thị theo đường kính. Dùng đồ thị của em ước tính tuổi một cây đường kính khác; vì sao ước tính đó có thể sai với cây trồng ở nơi khác?',
  METAMORPHOSIS: 'Trước khi theo dõi: em đoán con non của loài nào giống con trưởng thành nhất. Sau khi theo dõi: ghi các giai đoạn và số ngày em ghi nhận cho từng loài. Bạn em xếp châu chấu vào biến thái hoàn toàn — dấu hiệu nào trong ghi chép của em giúp em phản biện?',
  PROPAGATION: 'Trước khi làm: em đoán tỉ lệ thành công của từng lô. Sau khi làm: ghi tỉ lệ em thu được ở từng cặp lô có/không xử lí. Lô nào cho chênh lệch lớn nhất? Nếu một lô chỉ có 2 cây thay vì 20, em còn tin kết luận đến đâu?',
  DNA_EXTRACT: 'Trước khi làm: em đoán bỏ bước nào sẽ làm lượng DNA giảm nhiều nhất. Sau khi làm: ghi lượng DNA em thu được khi làm đủ bước và khi bỏ từng bước. Kết quả của em có đúng như dự đoán không, và số liệu đó cho thấy bước ấy đóng vai trò gì?',
  CHROMOSOME_MUTATION: 'Trước khi đếm: em đoán các tiêu bản đột biến có số nhiễm sắc thể bao nhiêu. Sau khi đếm: ghi số em đếm được ở từng tiêu bản. Nếu hai bạn đếm cùng một tế bào ra hai số khác nhau, em sẽ làm gì để chọn số đúng, và vì sao phải đếm ở kì giữa?',
  MODIFICATION: 'Trước khi trồng: em đoán giống nào tăng năng suất mạnh hơn khi bón thêm phân. Sau khi làm: vẽ đường mức phản ứng từ số liệu của em. Bạn em nói "bón càng nhiều phân năng suất càng cao" — đồ thị của em có điểm nào bác bỏ không?',
  QUADRAT: 'Trước khi đếm: em đoán quần thể phân bố đều, ngẫu nhiên hay theo nhóm. Sau khi đếm: ghi số cá thể từng ô, tính trung bình và phương sai của em. Nếu em chỉ đặt ô ở chỗ thấy nhiều cây, kết quả ước tính kích thước quần thể bị lệch về phía nào?',
  COMMUNITY: 'Trước khi tính: em đoán khu nào có độ đa dạng cao nhất. Sau khi đếm: ghi số loài, loài ưu thế và chỉ số Simpson em tính được cho từng khu. Một bạn nói "nhiều cá thể thì đa dạng" — số liệu khu nào của em bác bỏ câu đó?',
  MINI_ECOSYSTEM: 'Trước khi chạy 7 ngày: dự đoán bố trí nào của em giữ được cá khỏe. Sau khi chạy: ghi oxygen hòa tan và tình trạng cá với bố trí của em, rồi đổi một yếu tố và chạy lại. Bể của em có thật sự tự duy trì không, hay vẫn phụ thuộc thứ gì từ bên ngoài?',
};

/** Mỗi bài thực hành Sinh là một preset mở phòng thực hành (dùng chung giao diện PHYS_BENCH) với bài đó. */
export const SINH_LAB_PRESETS: Record<string, PresetSpec> = {
  ...Object.fromEntries(
    BIO_EXPERIMENTS.map((e): [string, PresetSpec] => [
      `BIO_LAB_${e.id}`,
      {
        family: 'PHYS_BENCH',
        engine: 'BIOLOGY',
        title: `Thực hành: ${e.title}`,
        question: BIO_LAB_QUESTIONS[e.id] ?? `Sau khi làm "${e.title}", nhóm đối chứng cho em biết điều gì, và kết quả có đủ để rút ra kết luận chưa?`,
        keywords: new RegExp(`(?:thi nghiem|thuc hanh|lam thi nghiem).*(?:${e.keywords.source})`),
        examples: e.examples.map((x) => (WITH_PREFIX.test(x) ? x : `thí nghiệm ${x}`)),
        data: {experiment: e.id},
      },
    ]),
  ),
  BIO_LAB_BENCH: {
    family: 'PHYS_BENCH',
    engine: 'BIOLOGY',
    title: 'Phòng thực hành Sinh học ảo: kính hiển vi, nhóm đối chứng, số liệu',
    question: 'Vì sao một thí nghiệm sinh học cần nhóm đối chứng và cần lặp lại trên nhiều mẫu?',
    keywords: /phong thuc hanh sinh hoc ao|phong thi nghiem sinh hoc ao|tiet thuc hanh sinh hoc|thuc hanh sinh hoc\b/,
    examples: ['phòng thực hành sinh học ảo', 'tiết thực hành sinh học', 'thực hành sinh học'],
    data: {experiment: BIO_EXPERIMENTS[0].id},
  },
};
