// Phim SV_STARTUP IX (Socratic Vision Board): bảng cắt (EDL) theo sheet kịch bản, footage quay THCS Hùng Vương.
// Mọi mốc nguồn (in/out, phụ đề, chữ nổi) lấy từ chép lời có mốc từng từ: sv-startup-video/tools/words.py.
// Phụ đề ghi theo LỜI THẬT trong clip (đã sửa chính tả), không theo câu trong sheet khi hai bên khác nhau.

export const FPS = 30;

/** Lời đọc thu riêng (public/sv/vo_*.wav): phát đoạn [from, to] của file, bắt đầu ở giây `at` của đoạn phim. */
export type Vo = {file: string; from: number; to: number; at: number};
/** Phụ đề theo giờ NGUỒN (giây trong clip hoặc trong file giọng). */
export type Sub = [number, number, string];

export type Seg = {
  id: string;
  dur: number;
  /** clip người thật: public/sv/<src>.mp4 từ giây `in` */
  src?: string;
  in?: number;
  /** tắt tiếng clip trước giây nguồn này (đếm ngược 3-2-1 ...) */
  muteBefore?: number;
  /** tắt tiếng clip từ giây nguồn này (tiếng ê-kíp, hoặc khi lời đọc thu riêng vào) */
  muteAfter?: number;
  /** tốc độ phát clip (1,25 = nhanh hơn; giây nguồn → giây cảnh chia cho rate) */
  rate?: number;
  /** cảnh giao diện / đồ họa (vẽ trong SvStartup.tsx) */
  view?: 'flow-open' | 'intro' | 'montage' | 'problem' | 'ui-lasso' | 'ui-phys' | 'friction' | 'results' | 'finance' | 'outro';
  vo?: Vo;
  subs?: Sub[];
  chapter?: string;
};

export const SEGS: Seg[] = [
  // ---------- INTRO: đám thẻ 3D của FlowCut (CardCloud, canh theo đầu bài nhạc) → montage cắt theo phách + logo
  {id: 'I0-open', view: 'flow-open', dur: 8.2},
  {id: 'I1-intro', view: 'intro', dur: 7.14},
  // ---------- 01 THỰC TRẠNG
  {id: 'A1-phan', src: '1671', in: 4.3, dur: 8.2, chapter: 'Thực trạng', subs: [
    [5.9, 9.2, 'Hàng thập kỷ qua, bảng phấn giúp thầy cô giảng bài tự nhiên,'],
    [9.2, 12.4, 'nhưng lại đóng băng các quy luật khoa học thành những hình vẽ tĩnh.'],
  ]},
  {id: 'P1-slide', view: 'problem', dur: 3.6},
  {id: 'A2-ai', src: '1679', in: 6.05, dur: 5.75, subs: [
    [6.3, 9.9, 'Trong khi đó, các công cụ AI hiện đại lại quá chậm, đắt đỏ'],
    [9.9, 11.8, 'và dễ làm sai lệch bản chất.'],
  ]},
  {id: 'A3-chep', src: '1690', in: 5.6, dur: 4.6},
  {id: 'A4-x', src: '1690', in: 12.2, dur: 5.5, subs: [
    [12.3, 14.9, 'Còn với học sinh, thay vì áp dụng công nghệ vào học tập,'],
    [14.9, 17.7, 'nhiều bạn lại dùng nó để tìm các lời giải sẵn.'],
  ]},
  {id: 'A5-nhat', src: '1690', in: 20.4, dur: 6.9, subs: [
    [21.6, 24.0, 'Công nghệ nghĩ thay, thì người học chẳng còn gì để tích lũy.'],
    [24.0, 26.8, 'Và đó là lý do chúng em làm dự án này.'],
  ]},
  // ---------- 02 GIẢI PHÁP: bỏ đoạn cả nhóm hô (người dùng 05/11), chỉ giữ cú máy hất lên trời của 1705 (9,9 → 13,2 s);
  // mask cut từ búng tay 1690@27.3 mở thẳng vào cú hất, tên sản phẩm hiện trên nền trời rồi nối A7 (cũng mở từ trời)
  {id: 'A6-ho', src: '1705', in: 9.9, muteAfter: 0, dur: 3.3, chapter: 'Giải pháp'},
  // giữ đoạn máy hạ từ trời xuống (khớp khung trời cuối A6)
  {id: 'A7-hesinhthai', src: '1770', in: 0.3, dur: 10.6, subs: [
    [2.7, 6.6, 'Socratic Vision Board là hệ sinh thái hỗ trợ giáo dục toàn diện cho giáo viên và học sinh'],
    [6.6, 10.7, 'trước, trong và sau giờ học, biến từng nét phấn thành hình ảnh trực quan.'],
  ]},
  // ---------- 03 TRONG GIỜ HỌC (giọng thu riêng)
  {id: 'U1-khoanh', view: 'ui-lasso', dur: 9.3, chapter: 'Trong giờ học',
    vo: {file: '7-SonHV', from: 0.9, to: 9.8, at: 0.1}, subs: [
      [1.0, 4.2, 'Giáo viên chỉ cần khoanh vùng, AI sẽ dịch ngay nét phấn tĩnh'],
      [4.2, 9.8, 'thành mô hình mô phỏng chuyển động thực tế cho 4 môn: Toán, Lý, Hóa, Sinh.'],
    ]},
  // Lâm đứng tại bảng thật (1794 viết x²+y²+z²=9 → khoanh lúc 12 s → cầu 3D lúc 13 s), tiếng hiện trường tắt, giọng thu riêng
  {id: 'U2-toan', src: '1794', in: 9.6, muteAfter: 0, dur: 4.9, vo: {file: '8-Lam', from: 1.85, to: 6.3, at: 0.1}, subs: [
    [1.9, 6.3, 'Với môn Toán, các phương trình được trực quan hóa thành không gian 3D sinh động.'],
  ]},
  {id: 'U3-ly', view: 'ui-phys', dur: 5.5, vo: {file: '8-Lam', from: 6.4, to: 11.9, at: 0.0}, subs: [
    [6.4, 11.9, 'Với môn Lý, hiện tượng con lắc được mô phỏng cùng các thông số thay đổi theo thời gian thực.'],
  ]},
  // 1805: bước sai "2x = 6 − 4" được AI tô đỏ lúc 4,5 s
  {id: 'U4-cham', src: '1805', in: 2.4, muteAfter: 0, dur: 6.8, vo: {file: '8-Lam', from: 68.85, to: 75.5, at: 0.1}, subs: [
    [68.85, 75.5, 'AI còn hỗ trợ chấm bài, kiểm tra từng bước và gợi ý phương pháp giải, giúp giáo viên giảng giải hiệu quả hơn.'],
  ]},
  // 1813: Lâm hỏi bảng bằng giọng thật (16,4–20,5 s, nghe nguyên tiếng), rồi giọng thu riêng; sau 20,65 s là tiếng ê-kíp nên tắt
  {id: 'U5-giongnoi', src: '1813', in: 16.1, muteBefore: 16.2, muteAfter: 20.65, dur: 10.6, vo: {file: '8-Lam', from: 127.85, to: 133.7, at: 4.7}, subs: [
    // giờ theo file giọng: giây clip c ↔ c − 16.1 − 4.7 + 127.85
    [123.45, 127.55, '“Vì sao dây càng dài thì chu kì càng lớn?”'],
    [127.85, 133.7, 'Đặc biệt, học sinh có thể tương tác trực tiếp với AI bằng giọng nói để giải đáp thắc mắc ngay trên bảng.'],
  ]},
  // ---------- 04 SAU GIỜ HỌC
  {id: 'A8-qr', src: '1696', in: 5.0, dur: 6.15, chapter: 'Sau giờ học',
    vo: {file: '9-Nhat', from: 1.0, to: 6.8, at: 0.15}, subs: [
      [1.0, 6.8, 'Không những vậy, học sinh còn có thể quét mã bằng điện thoại để kết nối và tương tác với bài giảng tại nhà.'],
    ]},
  // người đeo cặp đi ngang máy: mép lưng làm mặt nạ lộ cảnh học ở nhà (1709) phía sau
  {id: 'A9-mask', src: '1728', in: 3.6, dur: 2.45},
  {id: 'A10-nha', src: '1709', in: 3.0, dur: 11.5, vo: {file: '11-Lam', from: 1.6, to: 12.9, at: 0.1}, subs: [
    [1.7, 4.9, 'Nơi hành trình tự học tiếp tục với gia sư ảo Socratic.'],
    [4.9, 8.6, 'Thay vì cho sẵn đáp án, hệ thống khóa lại các lối tắt,'],
    [8.6, 12.9, 'mở ra các công cụ trực quan và đặt câu hỏi gợi mở để học sinh tự mình tư duy.'],
  ]},
  {id: 'F1-masat', view: 'friction', dur: 5.1},
  // ---------- 05 THỰC NGHIỆM
  {id: 'A11-thunghiem', src: '1718', in: 1.0, dur: 6.2, chapter: 'Thực nghiệm', subs: [
    [1.3, 3.7, 'Không chỉ là ý tưởng, dự án đã thử nghiệm thực tế 8 tuần'],
    [3.7, 7.0, 'với 412 học sinh và 18 giáo viên.'],
  ]},
  {id: 'G1-ketqua', view: 'results', dur: 6.2, vo: {file: '13-SonCVP', from: 2.2, to: 8.2, at: 0.1}, subs: [
    [2.2, 5.6, 'Kết quả: nhóm thực nghiệm cao hơn lớp đối chứng 0,85 điểm,'],
    [5.6, 8.2, 'tiến bộ đều đặn ở cả ba mô hình trường học.'],
  ]},
  // ---------- 06 TÀI CHÍNH
  {id: 'A12-taichinh', src: '1790', in: 3.4, dur: 5.8, chapter: 'Mô hình tài chính', subs: [
    [3.6, 6.8, 'Về bài toán tài chính, nhờ kiến trúc kỹ thuật phân tầng xử lý'],
    [6.8, 9.3, 'giúp giảm thiểu tối đa chi phí vận hành.'],
  ]},
  {id: 'G2-taichinh', view: 'finance', dur: 14.85, vo: {file: '15-Nam', from: 2.7, to: 17.4, at: 0.1}, subs: [
    [2.7, 8.2, 'Có tới 81,4% lượt tự học được xử lý cục bộ, không cần gọi đám mây.'],
    [8.2, 11.9, 'Chi phí AI tối đa chỉ 350 đồng mỗi tiết,'],
    [11.9, 17.4, 'đảm bảo biên lợi nhuận gộp 89,5% và hòa vốn ngay vào tháng thứ bảy.'],
  ]},
  // ---------- 07 TẦM NHÌN
  // 1751: Hà Thái Sơn nói một mạch tới "vươn xa nhé" (1,65–7,85 s), không còn cảnh cả nhóm hô
  {id: 'A13-tamnhin', src: '1751', in: 1.4, dur: 6.6, chapter: 'Tầm nhìn', subs: [
    [1.6, 5.05, 'Với khát vọng đưa Socratic Vision Board đến gần 3.000 trường phổ thông,'],
    [5.05, 7.95, 'hãy cùng chờ đón hành trình mang dự án vươn xa nhé!'],
  ]},
  // montage cuối kiểu FlowCut: lướt nhanh toàn bộ tính năng → tường thẻ + tên sản phẩm
  {id: 'M1-montage', view: 'montage', dur: 6.4},
  // outro kiểu FlowCut (chữ khổng lồ → logo trên nền đen); độ dài tự tính để phim = bản nhạc (xem dưới)
  {id: 'O1-outro', view: 'outro', dur: 0},
];

// Phần có lời nói nhanh hơn 5% (clip và giọng thu riêng cùng tốc độ; atempo giữ cao độ) thay vì gọt cảnh,
// để montage cuối vừa trong 3:00 mà không cắt thô. Độ dài cảnh chia theo tốc độ.
export const SPEED = 1.01;
const SPEED_IDS = new Set(['A1-phan', 'A2-ai', 'A4-x', 'A5-nhat', 'A7-hesinhthai', 'U1-khoanh', 'U2-toan', 'U3-ly', 'U4-cham', 'U5-giongnoi',
  'A8-qr', 'A10-nha', 'A11-thunghiem', 'G1-ketqua', 'A12-taichinh', 'G2-taichinh', 'A13-tamnhin']);
for (const s of SEGS) if (SPEED_IDS.has(s.id)) {
  s.rate = SPEED;
  s.dur = +(s.dur / SPEED).toFixed(2);
}
// nhạc flow_bed dài 178,13 s (nhảy theo ô nhịp 2,76 s; nấc kế 180,89 s vượt 3:00) và bắt đầu sớm 0,048 s
export const MUSIC_TOTAL = 178.13 - 0.048;
const outro = SEGS[SEGS.length - 1];
outro.dur = +(MUSIC_TOTAL - SEGS.slice(0, -1).reduce((a, x) => a + x.dur, 0)).toFixed(3);
if (outro.dur < 6 || outro.dur > 8.5) throw new Error(`outro ${outro.dur}s: chỉnh SPEED hoặc độ dài cảnh`);

export const STARTS: number[] = [];
SEGS.reduce((t, s) => (STARTS.push(t), t + s.dur), 0);
export const TOTAL_SEC = STARTS[STARTS.length - 1] + SEGS[SEGS.length - 1].dur;
export const TOTAL_FRAMES = Math.round(TOTAL_SEC * FPS);
export const startOf = (id: string) => STARTS[SEGS.findIndex((s) => s.id === id)];
/** giây nguồn → giây tuyệt đối trên timeline (clip: trừ `in`, chia `rate`; giọng: trừ `from`, cộng `at`) */
export const absOf = (id: string, srcSec: number) => {
  const s = SEGS.find((x) => x.id === id)!;
  return startOf(id) + (s.vo ? srcSec - s.vo.from + s.vo.at : (srcSec - (s.in ?? 0)) / (s.rate ?? 1));
};
