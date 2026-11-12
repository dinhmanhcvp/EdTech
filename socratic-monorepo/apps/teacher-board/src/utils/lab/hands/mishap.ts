import {fatigue, harmonic} from './sims/advanced';

/**
 * Hậu quả của thao tác sai trong phòng thực hành: mỗi sự cố có HIỆU ỨNG 3D (`kind`), lời giải thích chuyện gì xảy ra, hậu quả ngoài đời thật
 * và cách phòng tránh. Logic phát hiện là hàm thuần (kiểm thử được); cảnh 3D chỉ nhận id sự cố rồi vẽ hiệu ứng, giao diện hiện thẻ sự cố.
 * Nội dung viết cho học sinh THPT, bám kiến thức an toàn phòng thí nghiệm phổ thông; mô hình sự cố là minh họa, không phải mô phỏng tai nạn chính xác.
 */
export type MishapKind = 'short' | 'fire' | 'explosion' | 'acid' | 'scald' | 'shock' | 'break' | 'burn';
export interface Mishap {
  id: string;
  kind: MishapKind;
  /** danger: có thể gây thương tích nặng; warn: sai quy trình, hậu quả nhẹ hơn */
  level: 'danger' | 'warn';
  title: string;
  what: string;
  real: string;
  avoid: string;
}
const m = (id: string, kind: MishapKind, level: Mishap['level'], title: string, what: string, real: string, avoid: string): [string, Mishap] => [id, {id, kind, level, title, what, real, avoid}];

export const MISHAPS: Record<string, Mishap> = Object.fromEntries([
  // ---- điện
  m('electric-short', 'short', 'danger', 'Chập mạch pha – pha', 'Hai dây pha bị nối thẳng vào nhau, không qua tải nào. Dòng điện tăng vọt, hồ quang bắn tia lửa và khói, aptomat nhảy.', 'Ngoài đời dây dẫn nóng đỏ chỉ sau vài giây, lớp cách điện chảy và bốc cháy; nếu không có aptomat hay cầu chì đúng định mức thì cháy nhà, nổ thiết bị, có thể gây bỏng và điện giật.', 'Cắt aptomat trước khi đấu dây. Soát lại từng dây: không để hai dây pha chạm nhau hay chạm vào vỏ. Chọn aptomat đúng định mức dòng.'),
  m('electric-frame', 'shock', 'danger', 'Vỏ máy mang điện', 'Một dây pha bị nối vào vỏ máy. Vỏ kim loại có điện áp 220 V so với đất; hồ quang loé ở chỗ nối.', 'Ai chạm vào vỏ máy sẽ bị điện giật: dòng chỉ cỡ 30 mA chạy qua tim đã có thể gây rung thất và ngừng tim. Người đứng trên nền ẩm hoặc chân đất còn nguy hiểm hơn.', 'Luôn nối vỏ máy với dây bảo vệ PE. Dùng aptomat chống giật (RCD). Kiểm tra cách điện trước khi cấp điện, không chạm vào thiết bị khi tay ướt.'),
  m('electric-over', 'burn', 'danger', 'Động cơ bị quá áp, cháy cuộn dây', 'Cuộn dây chịu điện áp cao hơn định mức (đấu tam giác cho động cơ cuộn 220 V). Dòng và nhiệt tăng nhanh, rơ-le nhiệt phải cắt mạch.', 'Cách điện của cuộn dây bị cháy sém, động cơ bốc mùi khét và hỏng hẳn; nếu không có rơ-le nhiệt thì có thể bốc cháy.', 'Đọc nhãn động cơ trước khi đấu: Δ/Y 220/380 V nghĩa là mỗi cuộn chịu 220 V, với lưới 380 V phải đấu sao.'),
  m('coil-burn', 'burn', 'danger', 'Cuộn dây quá tải, cháy cách điện', 'Dòng qua cuộn dây vượt xa mức cho phép nên cuộn nóng lên nhanh, lớp sơn cách điện bốc khói.', 'Lớp sơn cách điện cháy làm các vòng dây chạm nhau (chập vòng), cuộn hỏng vĩnh viễn; dây nóng đỏ còn gây bỏng và cháy vật xung quanh.', 'Đặt dòng điện từ nhỏ lên và theo dõi ampe kế; không vượt dòng định mức ghi trên cuộn dây; có cầu chì hoặc aptomat bảo vệ.'),
  m('inverter-burn', 'short', 'danger', 'Nghịch lưu bị quá dòng / quá áp', 'Điện áp hoặc dòng yêu cầu vượt giới hạn của bộ nghịch lưu: các transistor công suất bị đánh thủng, tia lửa bắn ra từ mạch.', 'Transistor SiC hoặc IGBT nổ và cháy, tụ điện phình nổ, có thể làm cháy cả xe điện; chi phí sửa chữa rất lớn.', 'Giữ dòng và điện áp trong giới hạn của bộ nghịch lưu; khi chạy nhanh hơn tốc độ định mức phải làm yếu từ thông (i_d âm) chứ không tăng điện áp.'),
  // ---- cơ khí
  m('turbine-overheat', 'fire', 'danger', 'Tuabin quá nhiệt', 'Khí trước tuabin vượt quá 1100 °C: cánh tuabin đỏ rực, chảy dẻo và biến dạng.', 'Cánh tuabin quay 100 000 vòng/phút mất cân bằng, vỡ và văng mảnh kim loại như đạn; động cơ có thể nổ và bốc cháy.', 'Hạn chế nhiên liệu để nhiệt độ trước tuabin không vượt giới hạn vật liệu; có cảm biến nhiệt tự cắt nhiên liệu; đứng xa và có tấm chắn khi chạy thử.'),
  m('gear-shear', 'break', 'danger', 'Trượt răng, gãy bộ truyền', 'Mô-men tải vượt quá mức danh định: bánh mềm nhảy qua răng của vành cứng rồi bị cắt răng.', 'Khớp robot mất độ chính xác hoặc kẹt cứng; cánh tay robot có thể đột ngột rơi hay vung, gây va đập và kẹp tay người.', 'Không để tải vượt mô-men danh định, dùng bộ giới hạn mô-men; cắt điện và hạ tay máy xuống trước khi bảo trì.'),
  m('fatigue-fracture', 'break', 'danger', 'Gãy mỏi đột ngột', 'Với ứng suất lặp quá lớn, vết nứt lan rất nhanh và chi tiết gãy chỉ sau vài trăm chu kì.', 'Chi tiết gãy giòn không báo trước, không biến dạng; nhiều tai nạn máy bay, cầu và trục xe do nứt mỏi bị bỏ sót.', 'Thiết kế với ứng suất đủ thấp, chọn vật liệu có độ dai cao và kiểm tra định kì để phát hiện vết nứt khi còn nhỏ.'),
  // ---- hóa chất
  m('acid-into-water', 'acid', 'danger', 'Rót nước vào acid đặc', 'Nước nhẹ hơn nên nổi trên mặt acid đặc, toả nhiệt cục bộ rất mạnh làm nước sôi bùng lên và bắn tung acid.', 'Acid đặc bắn vào mắt hoặc da gây bỏng nặng, có thể mù mắt; áo quần bị thủng.', 'Quy tắc nhớ: "acid vào nước, không bao giờ ngược lại". Rót acid từ từ theo thành cốc vào nước, vừa rót vừa khuấy; luôn đeo kính và găng.'),
  m('sodium-excess', 'explosion', 'danger', 'Thả cục natri quá to', 'Natri phản ứng với nước toả rất nhiều nhiệt và khí hiđro; hiđro bốc cháy rồi nổ, bắn giọt natri hiđroxit nóng chảy ra xung quanh.', 'Giọt kiềm nóng bắn vào mắt và mặt gây bỏng hóa chất và bỏng nhiệt; vụ nổ có thể làm vỡ cốc thủy tinh.', 'Chỉ lấy mẩu natri bằng hạt đậu xanh, thấm khô dầu, dùng chậu thủy tinh dày có nắp lưới, đứng xa và đeo kính bảo hộ.'),
  m('flammable-heat', 'fire', 'danger', 'Đun trực tiếp chất dễ cháy', 'Hơi của chất dễ cháy (cồn, hexane) gặp ngọn lửa trần nên bắt lửa và bùng cháy cả ống nghiệm.', 'Lửa lan theo hơi chất lỏng, cháy lan ra bàn và quần áo; hơi cồn cháy gần như không nhìn thấy nên rất dễ bị bỏng.', 'Không dùng lửa trần đun chất dễ cháy: dùng bếp điện hoặc bể nước nóng; để lọ chất dễ cháy xa ngọn lửa; có bình chữa cháy và chăn dập lửa gần đó.'),
  m('overflow', 'acid', 'warn', 'Tràn hóa chất ra bàn', 'Ống đã đầy mà vẫn rót tiếp nên dung dịch tràn ra mặt bàn.', 'Hóa chất loang trên bàn ăn mòn mặt bàn, làm trơn sàn và dính vào tay; với acid hay kiềm có thể gây bỏng da.', 'Chỉ rót tới 1/3 ống nghiệm; quan sát mức dung dịch khi rót; có khăn và dung dịch trung hòa gần đó để xử lí khi tràn.'),
  m('no-goggles', 'burn', 'warn', 'Không đeo kính bảo hộ', 'Bạn đang dùng hóa chất nguy hiểm khi chưa đeo kính bảo hộ.', 'Chỉ một giọt bắn vào mắt có thể gây tổn thương giác mạc; khi phản ứng sủi mạnh hay sôi bùng, giọt bắn rất khó tránh.', 'Đeo kính bảo hộ (chạm vào kính trên bàn) trước khi cầm bất kì chai hóa chất nào.'),
  m('spill-acid', 'acid', 'danger', 'Đổ acid ra bàn', 'Bạn nghiêng chai khi chưa ở trên miệng dụng cụ nên acid đổ ra mặt bàn, bốc khói và loang rộng.', 'Acid ăn mòn mặt bàn, làm thủng quần áo và gây bỏng da; khói acid kích ứng mắt và đường thở.', 'Chỉ nghiêng chai khi miệng chai đã ở ngay trên miệng cốc; nếu lỡ đổ thì dùng baking soda trung hòa, lau bằng khăn ướt và đeo găng.'),
  m('spill-base', 'acid', 'danger', 'Đổ dung dịch kiềm ra bàn', 'Bạn nghiêng chai khi chưa ở trên miệng dụng cụ nên dung dịch kiềm đổ loang ra bàn.', 'Kiềm đặc nhờn và ăn mòn da, gây bỏng sâu mà ban đầu ít đau nên dễ bị bỏ qua; rất nguy hiểm khi vào mắt.', 'Chỉ nghiêng chai khi đã ở trên miệng dụng cụ; nếu dính da, rửa nước sạch ít nhất 15 phút và báo giáo viên.'),
  m('spill-hot', 'scald', 'danger', 'Đổ nước sôi ra ngoài', 'Bạn nghiêng cốc nước nóng khi chưa ở trên bể nên nước nóng đổ ra bàn, bốc hơi nước.', 'Nước sôi 100 °C làm bỏng da ngay lập tức; bỏng hơi nước còn lan rộng hơn vì hơi nóng bay lên mặt và tay.', 'Chỉ nghiêng cốc khi đã ở sát trên bể; cầm cốc bằng kẹp hoặc găng chịu nhiệt; luôn hướng miệng cốc ra xa người.'),
  m('spill-generic', 'acid', 'warn', 'Đổ hóa chất ra bàn', 'Bạn nghiêng chai khi chưa ở trên miệng dụng cụ nên chất lỏng đổ ra bàn.', 'Hóa chất đổ ra lãng phí và có thể gây trơn, bẩn hoặc nhiễm độc tùy loại chất.', 'Chỉ nghiêng chai khi miệng chai đã ở trên miệng dụng cụ; dọn ngay chỗ đổ theo hướng dẫn của giáo viên.'),
  m('alkali-explosion', 'explosion', 'danger', 'Kim loại kiềm nổ khi gặp nước', 'Mẩu kim loại lớn hoặc kim loại hoạt động mạnh (K, Rb, Cs) phản ứng với nước quá nhanh: khí hiđro bắt lửa và nổ, bắn giọt kiềm nóng chảy.', 'Vụ nổ làm vỡ chậu thủy tinh, giọt kiềm nóng chảy bắn vào mắt và da gây bỏng nặng; rubidi và xesi còn nổ ngay khi chạm nước.', 'Chỉ dùng mẩu nhỏ bằng hạt đậu xanh, kim loại ít hoạt động (Li, Na), đứng xa sau tấm chắn và đeo kính bảo hộ.'),
]) as Record<string, Mishap>;

/**
 * Sự cố do THAM SỐ của bài mô phỏng gây ra (hàm thuần theo giá trị các thanh trượt / núm), null nếu an toàn.
 * Chỉ gồm bài luôn "đang chạy" (cuộn dây có dòng, bộ truyền có tải, chi tiết chịu tải lặp). Bài có công tắc khởi động (tuabin, nghịch lưu) và bài thao tác
 * (rót, thả, đấu dây) phát sự cố theo SỰ KIỆN từ chính cảnh: máy đang tắt thì thông số nguy hiểm chưa gây hậu quả.
 */
export function mishapOf(id: string, v: Record<string, number>): string | null {
  switch (id) {
    case 'thomson':
      return v.I > 1.6 ? 'coil-burn' : null;
    case 'harmonic':
      return harmonic(v.zf, v.rpm, v.load).ratchet ? 'gear-shear' : null;
    case 'fatigue':
      return fatigue(v.ds, v.a0, v.alloy).cycles < 1000 ? 'fatigue-fracture' : null;
    default:
      return null;
  }
}

/** Vi phạm an toàn của bàn hóa (câu chữ do `utils/lab/chem/engine.ts` ghi) → sự cố tương ứng; null nếu câu đó không có hậu quả riêng. */
export function chemMishapOf(violation: string): string | null {
  if (/Rót nước vào acid đặc/.test(violation)) return 'acid-into-water';
  if (/quá nhiều natri/.test(violation)) return 'sodium-excess';
  if (/Đun trực tiếp chất dễ cháy/.test(violation)) return 'flammable-heat';
  if (/Làm đầy tràn/.test(violation)) return 'overflow';
  if (/Chưa đeo kính bảo hộ/.test(violation)) return 'no-goggles';
  return null;
}

/** Chai nghiêng không đúng chỗ đổ ra bàn: loại sự cố theo bản chất chất trong chai. */
export function spillOf(kind: 'acid' | 'base' | 'hot' | 'other'): string {
  return kind === 'acid' ? 'spill-acid' : kind === 'base' ? 'spill-base' : kind === 'hot' ? 'spill-hot' : 'spill-generic';
}
