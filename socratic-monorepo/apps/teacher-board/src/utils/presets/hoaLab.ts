import {CHEM_EXPERIMENTS} from '../lab/chem/experiments';
import type {PresetSpec} from './types';

const WITH_PREFIX = /^(?:thí nghiệm|thực hành)/i;

/**
 * Câu hỏi Socratic riêng từng bài, ba nhịp: dự đoán trước khi làm → số liệu/hiện tượng của CHÍNH lượt làm của em → phản biện một nhận định sai bằng kết quả đó.
 * Câu trả lời phụ thuộc lượt làm của từng học sinh nên chép câu hỏi đi hỏi máy không ra đáp án; test bắt buộc mọi bài có câu.
 */
export const CHEM_LAB_QUESTIONS: Record<string, string> = {
  NA_MG_WATER: 'Trước khi làm: em đoán Na hay Mg làm phenolphthalein hóa hồng trước? Sau khi làm: ghi lại ống của em hồng sau bao lâu và có cần đun không. Một bạn nói "Mg không phản ứng với nước" — kết quả của em ủng hộ hay bác bỏ câu đó, và câu đúng phải sửa thế nào?',
  RATE_TEMP: 'Trước khi làm: dự đoán ống nóng hồng trước ống nguội bao nhiêu giây. Sau khi làm: ghi thời điểm hồng của từng ống em đo được. Bạn em bảo "đun nóng làm Mg nhiều hơn nên nhanh hơn" — chỗ sai trong lập luận đó là gì, và em kiểm tra lại bằng cách nào trên chính hai ống của mình?',
  CL2_I2_STARCH: 'Trước khi nhỏ: em đoán dung dịch KI có hồ tinh bột sẽ đổi sang màu gì? Sau khi nhỏ: tả màu em thấy và ống nào giữ nguyên. Nếu chỉ nhìn ống của em thì đã đủ để kết luận "chlorine có tính phi kim mạnh hơn iodine" chưa, còn thiếu ống đối chứng nào?',
  CARBONATE_ACID: 'Trước khi làm: em đoán nước vôi trong ở ống dẫn khí sẽ thế nào? Sau khi làm: ghi lại thứ tự hiện tượng em thấy ở từng ống. Một bạn nói "cứ sủi bọt là CO₂" — dùng chính dụng cụ của bài, em chứng minh khí của em đúng là CO₂ chứ không phải H₂ ra sao?',
  CONDUCTIVITY: 'Trước khi thử: em đoán ống nào làm đèn sáng? Sau khi thử: ghi kết quả từng ống của em, có ống nào khác dự đoán không. Bạn em bảo "muối ăn dẫn điện vì nó là muối" — vậy sao hạt muối khô của em lại không làm đèn sáng, và câu của bạn phải sửa thế nào cho đúng?',
  REDOX_FE: 'Trước khi làm: em đoán đinh sắt trong CuSO₄ và trong H₂SO₄ loãng sẽ thay đổi thế nào? Sau khi làm: tả màu đinh và màu dung dịch sau 2 phút ở ống của em. Từ chính hai ống đó, em chỉ ra chất nhường electron, chất nhận electron; nếu ai đó nói "Cu²⁺ bị oxi hóa" thì sai ở đâu?',
  NEUTRAL_TEMP: 'Trước khi trộn: em đoán nhiệt độ tăng hay giảm, khoảng bao nhiêu độ? Sau khi trộn: ghi nhiệt độ đầu và cao nhất em đọc được. Một bạn bảo "dùng gấp đôi thể tích thì nhiệt độ tăng gấp đôi" — làm thêm một lần với thể tích khác, số liệu của em ủng hộ hay bác bỏ câu đó?',
  RATE_CONC: 'Trước khi làm: xếp ba ống theo thứ tự em đoán sẽ đục. Sau khi làm: ghi thời gian đục em đo ở từng ống. Nồng độ tăng gấp 6 lần thì thời gian của em có giảm đúng 6 lần không? Nếu không, em giải thích chênh lệch đó thế nào?',
  RATE_SURFACE: 'Trước khi làm: em đoán ống đá viên hay đá đập nhỏ sủi mạnh hơn, và cuối cùng ống nào thu được nhiều khí hơn? Sau khi làm: ghi điều em quan sát. Bạn em nói "đá nhỏ nhanh hơn nên ra nhiều CO₂ hơn" — kết quả của em có ủng hộ nửa sau của câu đó không?',
  RATE_CAT: 'Trước khi thêm MnO₂: em đoán ống 1 và ống 2 khác nhau ra sao? Sau khi làm: tả lượng bọt ở hai ống của em. Bạn em cho rằng MnO₂ "tham gia phản ứng nên bị hết". Em sẽ làm thêm bước nào trong lab để kiểm tra nhận định đó, và em đoán kết quả ra sao?',
  HALIDE_DISPLACE: 'Trước khi nhỏ: dự đoán màu từng ống NaBr, NaI khi gặp nước chlorine và nước bromine. Sau khi làm: ghi màu thật em thấy. Dựa đúng vào các ống của em, em sắp xếp tính oxi hóa Cl₂, Br₂, I₂ được đến đâu? Còn cặp nào em chưa có bằng chứng và cần thêm ống nào?',
  HCL_METALS: 'Trước khi làm: em đoán Zn và Cu, kim loại nào sủi bọt trong HCl? Sau khi làm: ghi điều em thấy ở từng ống. Một bạn nói "HCl là acid mạnh nên hòa tan được mọi kim loại" — kết quả của em bác bỏ câu đó thế nào, và quy luật đúng là gì?',
  HALIDE_ID: 'Trước khi nhỏ AgNO₃: em đoán ống nào không có kết tủa? Sau khi làm: ghi màu kết tủa từng ống của em. Nếu giáo viên đưa một ống không ghi nhãn cho kết tủa vàng nhạt, em có chắc chắn đó là NaBr không, hay còn nhầm được với ống nào? Em làm thêm gì để chắc chắn?',
  ACID_BASE_INDICATOR: 'Trước khi thử: em đoán dung dịch CH₃COONa làm phenolphthalein thế nào? Sau khi thử: ghi màu thật em thấy ở từng ống. Bạn em nói "muối thì luôn trung tính" — dùng ống CH₃COONa của em để phản biện, và em đoán NaCl sẽ cho kết quả ra sao (thử lại để kiểm tra)?',
  S_FE_HEAT: 'Trước khi đun: em đoán hỗn hợp sắt và lưu huỳnh sau khi đun sẽ trông thế nào? Sau khi đun: tả chất rắn em thu được. Một bạn nói "chất đen chỉ là bột sắt bị cháy" — em dùng cách nào (nam châm, màu…) để chứng minh đã có chất mới?',
  CU_H2SO4_CONC: 'Trước khi đun: em đoán lá đồng có tan không? Sau khi đun: ghi màu dung dịch và hiện tượng khí ở ống của em. Bạn em bảo "khí thoát ra là H₂ như mọi kim loại tác dụng với acid" — hiện tượng nào trong ống của em bác bỏ điều đó?',
  SULFATE_TEST: 'Trước khi làm: em đoán kết tủa với BaCl₂ có tan trong HCl dư không? Sau khi làm: ghi điều em thấy. Nếu một bạn bỏ qua bước thêm HCl và khẳng định "có kết tủa trắng tức là có sulfate", em chỉ ra họ có thể nhầm với ion nào?',
  C2H2_PREP: 'Trước khi dẫn khí: em đoán nước bromine sẽ đổi thế nào? Sau khi làm: ghi lại tốc độ sủi khí và màu nước bromine ở ống của em. Một bạn nói "khí nào sục qua cũng làm nước bromine nhạt màu vì bị loãng" — em thiết kế ống đối chứng nào để bác bỏ?',
  HEXANE_BR: 'Trước khi làm: em đoán hexane làm mất màu nước bromine trong tối không? Sau khi làm: ghi lại khi nào màu bắt đầu nhạt ở ống của em. Từ kết quả của em, vì sao không thể dùng nước bromine trong tối để phân biệt hexane với nước cất? Điều kiện ánh sáng cho thấy đây là loại phản ứng nào?',
  CU_OH_GLYCEROL: 'Trước khi nhỏ glycerol: em đoán kết tủa xanh lam sẽ ra sao? Sau khi làm: tả màu em thấy. Bạn em cho rằng "mọi alcohol đều hòa tan Cu(OH)₂". Em sẽ thử thêm chất nào để kiểm tra, và đặc điểm cấu tạo nào em đang muốn tách riêng ra?',
  TOLLENS: 'Trước khi đun: em đoán thành ống nghiệm sẽ thay đổi thế nào? Sau khi đun: tả lớp bám em thấy. Nếu một bạn lắc mạnh hoặc đun sôi và không thấy gương bạc mà chỉ có kết tủa đen, kết quả đó có nghĩa aldehyde không phản ứng không? Em giải thích ra sao?',
  ACETIC_ACID: 'Trước khi làm: em đoán khí ở ống Na₂CO₃ và ống Mg có giống nhau không? Sau khi làm: ghi tốc độ sủi bọt ở từng ống của em. Bạn em nói "acetic acid là acid nên cũng mạnh như HCl" — em đề xuất cách so sánh công bằng ngay trong lab để kiểm tra?',
  GLUCOSE_CU: 'Trước khi đun: em đoán dung dịch xanh thẫm sẽ biến đổi ra sao khi đun nóng? Sau khi làm: ghi màu ở hai thời điểm trước và sau khi đun. Hai hiện tượng của em chứng tỏ hai nhóm chức khác nhau — nếu chỉ làm bước đầu mà không đun thì em sẽ bỏ sót kết luận nào?',
  STARCH_IODINE: 'Trước khi thử ống đã đun với acid: em đoán còn màu xanh tím không? Sau khi làm: ghi màu thật ở hai ống của em. Bạn em nói "màu mất vì đun nóng làm iodine bay hơi" — em bố trí thêm ống nào để tách hai khả năng đó ra?',
  BIURET: 'Trước khi nhỏ CuSO₄: em đoán lòng trắng trứng sẽ đổi sang màu gì? Sau khi làm: tả màu em thấy. Một bạn dùng nước đường thay lòng trắng trứng và cũng thấy màu xanh nhạt, rồi kết luận "đường có protein" — sai ở đâu?',
  ANILINE_BR: 'Trước khi nhỏ: em đoán aniline có làm mất màu nước bromine ngay ở nhiệt độ thường không? Sau khi làm: tả hiện tượng ở ống của em. So với bài hexane (cần ánh sáng), em rút ra gì về ảnh hưởng của nhóm –NH₂ lên vòng benzene?',
  METAL_SALT: 'Trước khi làm: em đoán trong ba cặp Zn + CuSO₄, Cu + AgNO₃, Cu + ZnSO₄, cặp nào có phản ứng? Sau khi làm: ghi hiện tượng từng cặp em thấy. Chỉ từ ba cặp của em, em xếp được tính khử Zn, Cu, Ag chưa? Cặp nào em cần thử thêm để chắc chắn?',
  CATION_NAOH: 'Trước khi nhỏ: em đoán màu kết tủa của từng ion. Sau khi làm: ghi màu thật và ống nào thay đổi khi thêm NaOH dư hoặc để lâu. Một bạn chỉ nhỏ vài giọt NaOH rồi kết luận ống trắng là Mg²⁺ — em chỉ ra họ có thể nhầm với ion nào và bước nào bị bỏ qua?',
  CU_NH3_COMPLEX: 'Trước khi nhỏ NH₃: em đoán điều gì xảy ra khi nhỏ ít và khi nhỏ dư? Sau khi làm: ghi lại thời điểm kết tủa xuất hiện và tan trong ống của em. Bạn em nói "kết tủa tan vì bị pha loãng" — em thêm ống đối chứng nào (chỉ thêm nước) để bác bỏ?',
  KMNO4_FE2: 'Trước khi chuẩn độ: em ước lượng cần khoảng bao nhiêu mL KMnO₄? Sau khi làm: ghi thể tích tại điểm hồng bền em đọc được và tính nồng độ Fe²⁺ từ số liệu của mình. Nếu em nhỏ quá tay vài giọt thì kết quả bị lệch về phía nào?',
  NH4_NAOH: 'Trước khi đun: em đoán giấy quỳ ẩm đặt ở miệng ống sẽ đổi màu gì? Sau khi làm: ghi kết quả em thấy. Một bạn đặt quỳ khô và không thấy đổi màu, rồi kết luận "không có NH₃" — em giải thích vì sao kết luận đó chưa đáng tin?',
  CARBONATE_BARIUM: 'Trước khi thêm HCl: em đoán kết tủa ở ống nào sẽ tan? Sau khi làm: ghi điều em thấy ở từng ống, có sủi bọt ở đâu. Dựa vào chính các ống của em, nếu chỉ dừng ở bước BaCl₂ thì em kết luận được gì và không kết luận được gì?',
  FE3_SCN: 'Trước khi nhỏ KSCN: em đoán ống Fe³⁺ và ống Fe²⁺ khác nhau thế nào? Sau khi làm: ghi màu thật ở hai ống. Có một lọ Fe²⁺ để lâu ngoài không khí, nhỏ KSCN thấy hồng nhạt — em đọc kết quả đó ra sao, và có thể kết luận lọ đó "đã hỏng hoàn toàn" không?',
};

/** Mỗi bài thí nghiệm Hóa là một preset mở thẳng giá thí nghiệm với bài đó; từ khóa luôn đi kèm "thí nghiệm/thực hành". */
export const HOA_LAB_PRESETS: Record<string, PresetSpec> = {
  CHEM_LAB_BENCH: {
    family: 'CHEM_BENCH',
    engine: 'CHEMISTRY',
    title: 'Phòng thí nghiệm Hóa học ảo: giá ống nghiệm, kệ hóa chất và nhật kí hiện tượng',
    question: 'Khi trộn các chất với nhau, hiện tượng nào cho biết đã có phản ứng xảy ra, và em viết được phương trình hóa học nào để giải thích?',
    keywords: /phong thi nghiem hoa (?:hoc )?ao|phong thuc hanh hoa|thuc hanh hoa hoc|tiet thuc hanh hoa/,
    examples: ['phòng thí nghiệm hóa học ảo', 'thực hành hóa học', 'tiết thực hành hóa'],
    data: {experiment: null},
  },
  ...Object.fromEntries(
    CHEM_EXPERIMENTS.map((e): [string, PresetSpec] => [
      `CHEM_LAB_${e.id}`,
      {
        family: 'CHEM_BENCH',
        engine: 'CHEMISTRY',
        title: `Thực hành: ${e.title}`,
        question: CHEM_LAB_QUESTIONS[e.id] ?? `Quan sát thí nghiệm "${e.title}": hiện tượng nào xảy ra và em giải thích bằng phương trình hóa học nào?`,
        keywords: e.keywords.source.startsWith('thi nghiem') ? e.keywords : new RegExp(`(?:thi nghiem|thuc hanh|lam thi nghiem).*(?:${e.keywords.source})`),
        examples: e.examples.map((x) => (WITH_PREFIX.test(x) ? x : `thí nghiệm ${x}`)),
        data: {experiment: e.id},
      },
    ]),
  ),
};
