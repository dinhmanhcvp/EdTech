/**
 * Khung sư phạm dựng sẵn (học từ board hntech: POE, CER, 4 bước Polya, 3-2-1, tiến trình tiết, thang Bloom) chèn lên bảng một chạm.
 * Khác bản gốc: mỗi ô có câu hỏi gợi mở ngắn (kiểu Socratic) thay vì ô trống, và khung Polya khớp với bốn bước của coach giải bài hình.
 * Chỉ tạo nét (khung + chữ) nên di chuyển, tẩy, nhân đôi, hoàn tác như mọi đối tượng trên bảng.
 */
import type {Stroke} from './lassoGeometry';

export type FrameId = 'polya' | 'poe' | 'cer' | 'exit321' | 'lesson' | 'bloom';

interface Cell {
  title: string;
  hint: string;
}
interface FrameDef {
  id: FrameId;
  label: string;
  heading: string;
  layout: 'cols' | 'rows';
  cells: Cell[];
}

export const FRAMES: FrameDef[] = [
  {
    id: 'polya',
    label: 'Giải toán (Polya)',
    heading: 'Giải toán · 4 bước Polya',
    layout: 'cols',
    cells: [
      {title: '① Tìm hiểu đề', hint: 'Đề cho gì? Cần tìm gì? Vẽ hình được chưa?'},
      {title: '② Lập kế hoạch', hint: 'Đã gặp bài tương tự? Cần vẽ thêm đường phụ?'},
      {title: '③ Thực hiện', hint: 'Viết từng bước, nêu rõ định lí dùng'},
      {title: '④ Kiểm tra lại', hint: 'Thử kéo đỉnh, trường hợp đặc biệt?'},
    ],
  },
  {
    id: 'poe',
    label: 'Khoa học (POE)',
    heading: 'Dự đoán · Quan sát · Giải thích',
    layout: 'cols',
    cells: [
      {title: 'Dự đoán', hint: 'Em nghĩ điều gì sẽ xảy ra? Vì sao?'},
      {title: 'Quan sát', hint: 'Thực tế xảy ra điều gì?'},
      {title: 'Giải thích', hint: 'Vì sao khác / giống dự đoán?'},
    ],
  },
  {
    id: 'cer',
    label: 'Lập luận (CER)',
    heading: 'Tuyên bố · Bằng chứng · Lập luận',
    layout: 'cols',
    cells: [
      {title: 'Tuyên bố', hint: 'Em khẳng định điều gì?'},
      {title: 'Bằng chứng', hint: 'Số liệu, hình vẽ nào ủng hộ?'},
      {title: 'Lập luận', hint: 'Bằng chứng dẫn tới tuyên bố ra sao?'},
    ],
  },
  {
    id: 'exit321',
    label: 'Phiếu ra cửa 3-2-1',
    heading: 'Cuối tiết · 3-2-1',
    layout: 'rows',
    cells: [
      {title: '3 điều em đã hiểu rõ', hint: ''},
      {title: '2 câu hỏi em còn thắc mắc', hint: ''},
      {title: '1 chỗ em có thể áp dụng', hint: ''},
    ],
  },
  {
    id: 'lesson',
    label: 'Tiến trình tiết',
    heading: 'Tiến trình tiết học',
    layout: 'cols',
    cells: [
      {title: 'Khởi động', hint: 'Gợi vấn đề'},
      {title: 'Khám phá', hint: 'Tự tìm ra kiến thức'},
      {title: 'Luyện tập', hint: 'Làm bài, chữa chung'},
      {title: 'Vận dụng', hint: 'Bài toán thực tế'},
    ],
  },
  {
    id: 'bloom',
    label: 'Câu hỏi Bloom',
    heading: 'Câu hỏi theo thang Bloom',
    layout: 'rows',
    cells: [
      {title: 'Nhận biết', hint: ''},
      {title: 'Thông hiểu', hint: ''},
      {title: 'Vận dụng', hint: ''},
      {title: 'Phân tích', hint: ''},
      {title: 'Đánh giá', hint: ''},
      {title: 'Sáng tạo', hint: ''},
    ],
  },
];

const W = 1200;
const H = 675;
const INK = '#334155';

const escapeTex = (t: string) => t.replace(/\\/g, '\\textbackslash{}').replace(/([{}%#&_$^~])/g, (m) => (m === '^' || m === '~' ? `\\${m}{}` : `\\${m}`));

const text = (id: string, x: number, y: number, s: string, size: number, color: string, w: number): Stroke => ({
  id,
  points: [{x, y}],
  color,
  width: 0,
  typeset: {latex: `\\text{${escapeTex(s)}}`, text: s, size, w, h: size * 1.5},
});

const box = (id: string, x: number, y: number, w: number, h: number, color = INK): Stroke => ({
  id,
  points: [{x, y}, {x: x + w, y}, {x: x + w, y: y + h}, {x, y: y + h}, {x, y}],
  color,
  width: 2.5,
});

/** Nét của khung `id` đặt vừa mặt bảng (1200 × 675); `uid` làm mã duy nhất cho từng nét. */
export function buildFrame(id: FrameId, uid = Date.now().toString(36)): Stroke[] {
  const def = FRAMES.find((f) => f.id === id);
  if (!def) return [];
  const out: Stroke[] = [text(`text-${uid}-h`, 60, 24, def.heading, 30, '#0F172A', 1000)];
  const top = 84;
  const bottom = H - 30;
  const n = def.cells.length;
  const gap = 14;
  def.cells.forEach((c, i) => {
    const cols = def.layout === 'cols';
    const cw = cols ? (W - 120 - gap * (n - 1)) / n : W - 120;
    const ch = cols ? bottom - top : (bottom - top - gap * (n - 1)) / n;
    const x = 60 + (cols ? i * (cw + gap) : 0);
    const y = top + (cols ? 0 : i * (ch + gap));
    out.push(box(`${uid}-b${i}`, x, y, cw, ch));
    out.push(text(`text-${uid}-t${i}`, x + 14, y + 10, c.title, cols ? 24 : 22, '#1D4ED8', Math.max(60, cw - 28)));
    if (c.hint) out.push(text(`text-${uid}-s${i}`, x + 14, y + 52, c.hint, 16, '#64748B', Math.max(60, cw - 28)));
  });
  return out;
}
