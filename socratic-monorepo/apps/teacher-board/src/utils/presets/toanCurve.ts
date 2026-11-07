import type {P, PresetSpec} from './types';

const f1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});
const f2 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 2});

/** Nghiệm thực của ax² + bx + c = 0, tăng dần (a = 0 thì là phương trình bậc nhất). */
export function quadRoots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  if (d === 0) return [-b / (2 * a)];
  return [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)].sort((x, y) => x - y);
}
/** Thể tích hộp không nắp: tấm vuông cạnh a, cắt bốn góc vuông cạnh x. */
export const boxVolume = (x: number, a: number) => x * (a - 2 * x) ** 2;
/** Giá trị sau t năm với lãi kép hằng năm r %. */
export const compound = (P0: number, r: number, t: number) => P0 * Math.pow(1 + r / 100, t);

export const TOAN_CURVE_PRESETS: Record<string, PresetSpec> = {
  MATH_QUADRATIC: {
    family: 'CURVE_LAB',
    engine: 'MATH',
    title: 'Hàm số bậc hai, parabol và dấu tam thức',
    question: 'Hệ số a, b, c quyết định hướng, đỉnh và số giao điểm với trục hoành của parabol như thế nào? Dấu của Δ cho biết gì về số nghiệm và dấu của tam thức?',
    keywords: /ham so bac hai|tam thuc bac hai|dau cua tam thuc|bat phuong trinh bac hai|do thi parabol|dinh cua parabol|bieu thuc delta/,
    examples: ['hàm số bậc hai', 'dấu của tam thức bậc hai', 'bất phương trình bậc hai', 'đỉnh của parabol'],
    data: {
      xLabel: 'x',
      yLabel: 'y = ax² + bx + c',
      xRange: [-6, 6],
      yRange: [-10, 10],
      params: [
        {key: 'a', label: 'a', min: -3, max: 3, step: 0.1, value: 1},
        {key: 'b', label: 'b', min: -6, max: 6, step: 0.5, value: -2},
        {key: 'c', label: 'c', min: -8, max: 8, step: 0.5, value: -3},
      ],
      curves: [
        {id: 'y', label: 'y = ax² + bx + c', color: '#2563EB', fn: (x, p) => p.a * x * x + p.b * x + p.c},
        {id: 'axis', label: 'Trục hoành y = 0', color: '#A8A29E', dashed: true, fn: () => 0},
      ],
      readouts: [
        {label: 'Δ = b² − 4ac', value: (p: P) => f2(p.b * p.b - 4 * p.a * p.c)},
        {label: 'Nghiệm', value: (p: P) => {
          const r = quadRoots(p.a, p.b, p.c);
          return r.length ? r.map(f2).join(' ; ') : 'vô nghiệm thực';
        }},
        {label: 'Đỉnh I', value: (p: P) => (Math.abs(p.a) < 1e-9 ? 'không có (đường thẳng)' : `(${f2(-p.b / (2 * p.a))}; ${f2(p.c - (p.b * p.b) / (4 * p.a))})`)},
        {label: 'Tam thức mang dấu', value: (p: P) => {
          const r = quadRoots(p.a, p.b, p.c);
          if (Math.abs(p.a) < 1e-9) return '—';
          if (r.length < 2) return p.a > 0 ? 'dương (trừ tại nghiệm kép)' : 'âm (trừ tại nghiệm kép)';
          return `cùng dấu a ngoài [${f2(r[0])}; ${f2(r[1])}], trái dấu a trong khoảng đó`;
        }},
      ],
      note: 'a > 0: bề lõm hướng lên, đỉnh là điểm thấp nhất. Δ > 0 hai nghiệm, Δ = 0 nghiệm kép, Δ < 0 vô nghiệm (parabol không cắt trục hoành).',
    },
  },

  MATH_EXP_LOG: {
    family: 'CURVE_LAB',
    engine: 'MATH',
    title: 'Hàm số mũ và hàm số lôgarit',
    question: 'Vì sao đồ thị y = aˣ và y = logₐ x đối xứng nhau qua đường thẳng y = x? Cơ số a lớn hơn 1 hay nhỏ hơn 1 thì đồng biến hay nghịch biến?',
    keywords: /ham so mu|ham so logarit|ham so lo-?ga-?rit|ham mu va logarit|logarit co so|doi xung qua duong thang y = ?x|phuong trinh mu va logarit/,
    examples: ['hàm số mũ', 'hàm số lôgarit', 'đồ thị hàm mũ và lôgarit đối xứng'],
    data: {
      xLabel: 'x',
      yLabel: 'y',
      xRange: [-4, 8],
      yRange: [-4, 8],
      params: [
        {key: 'a', label: 'Cơ số a', min: 0.2, max: 5, step: 0.1, value: 2},
        {key: 'b', label: 'Giải aˣ = b, b =', min: 0.1, max: 30, step: 0.1, value: 8},
      ],
      curves: [
        {id: 'exp', label: 'y = aˣ', color: '#2563EB', fn: (x, p) => Math.pow(p.a, x)},
        {id: 'log', label: 'y = logₐ x', color: '#E11D48', fn: (x, p) => (x > 0 && Math.abs(p.a - 1) > 1e-9 ? Math.log(x) / Math.log(p.a) : NaN)},
        {id: 'diag', label: 'y = x', color: '#A8A29E', dashed: true, fn: (x) => x},
      ],
      readouts: [
        {label: 'Tính đơn điệu', value: (p: P) => (Math.abs(p.a - 1) < 1e-9 ? 'a = 1: hằng số' : p.a > 1 ? 'đồng biến (a > 1)' : 'nghịch biến (0 < a < 1)')},
        {label: 'Nghiệm của aˣ = b', value: (p: P) => (Math.abs(p.a - 1) < 1e-9 ? '—' : `x = logₐ b ≈ ${f2(Math.log(p.b) / Math.log(p.a))}`)},
        {label: 'Điểm cố định', value: () => 'aˣ luôn qua (0; 1), logₐ x luôn qua (1; 0)'},
      ],
      note: 'Hai hàm là ngược nhau nên đồ thị đối xứng qua y = x. Thang pH, độ lớn Richter và decibel đều là thang lôgarit.',
    },
  },

  MATH_OPTIMIZATION: {
    family: 'CURVE_LAB',
    engine: 'MATH',
    title: 'Bài toán tối ưu: làm hộp có thể tích lớn nhất',
    question: 'Vì sao thể tích hộp đạt lớn nhất đúng tại điểm mà đạo hàm V′(x) bằng 0? Cắt góc quá nhỏ hay quá lớn thì thể tích thay đổi ra sao?',
    keywords: /bai toan toi uu|gia tri lon nhat (?:va )?nho nhat thuc te|lam hop (?:khong nap )?the tich lon nhat|toi uu hoa the tich|cat bon goc/,
    examples: ['bài toán tối ưu', 'làm hộp không nắp thể tích lớn nhất', 'cắt bốn góc tấm tôn'],
    data: {
      xLabel: 'cạnh góc cắt x (cm)',
      yLabel: 'V (cm³) và V′',
      xRange: (p: P) => [0, p.a / 2],
      yRange: (p: P) => [-p.a * p.a, (p.a ** 3) / 12],
      params: [{key: 'a', label: 'Cạnh tấm vuông a', unit: 'cm', min: 12, max: 30, step: 0.5, value: 18}],
      curves: [
        {id: 'v', label: 'V(x) = x(a − 2x)²', color: '#2563EB', fn: (x, p) => boxVolume(x, p.a)},
        {id: 'dv', label: 'V′(x) = (a − 2x)(a − 6x)', color: '#E11D48', dashed: true, fn: (x, p) => (p.a - 2 * x) * (p.a - 6 * x)},
        {id: 'zero', label: 'V′ = 0', color: '#A8A29E', dashed: true, fn: () => 0},
      ],
      readouts: [
        {label: 'x tối ưu = a/6', value: (p: P) => `${f2(p.a / 6)} cm`},
        {label: 'V lớn nhất = 2a³/27', value: (p: P) => `${f1((2 * p.a ** 3) / 27)} cm³`},
        {label: 'Kích thước hộp', value: (p: P) => `${f2(p.a - p.a / 3)} × ${f2(p.a - p.a / 3)} × ${f2(p.a / 6)} cm`},
      ],
      note: 'V′(x) = 0 ⇔ x = a/6 (x = a/2 bị loại). V′ đổi dấu từ + sang − nên V đạt cực đại tại đó.',
    },
  },

  MATH_FINANCE_GROWTH: {
    family: 'CURVE_LAB',
    engine: 'MATH',
    title: 'Lãi đơn, lãi kép và tăng trưởng',
    question: 'Vì sao lãi kép tăng nhanh hơn lãi đơn dù cùng lãi suất? Cần bao nhiêu năm để số tiền gấp đôi?',
    keywords: /lai kep|lai don|lai suat (?:kep|don|ngan hang)|gui tiet kiem|tang truong (?:kep|theo cap so nhan)|quy tac 72/,
    examples: ['lãi kép', 'lãi đơn và lãi kép', 'gửi tiết kiệm lãi suất ngân hàng'],
    data: {
      xLabel: 'thời gian t (năm)',
      yLabel: 'số tiền (triệu đồng)',
      xRange: [0, 30],
      yRange: (p: P) => [0, Math.max(compound(p.P0, p.r, 30), p.P0 * (1 + (p.r / 100) * 30)) * 1.05],
      params: [
        {key: 'P0', label: 'Số tiền gửi ban đầu', unit: 'triệu', min: 10, max: 500, step: 10, value: 100},
        {key: 'r', label: 'Lãi suất mỗi năm', unit: '%', min: 1, max: 15, step: 0.5, value: 7},
      ],
      curves: [
        {id: 'simple', label: 'Lãi đơn P(1 + rt)', color: '#A8A29E', fn: (x, p) => p.P0 * (1 + (p.r / 100) * x)},
        {id: 'compound', label: 'Lãi kép P(1 + r)ᵗ', color: '#2563EB', fn: (x, p) => compound(p.P0, p.r, x)},
      ],
      readouts: [
        {label: 'Sau 10 năm: đơn · kép', value: (p: P) => `${f1(p.P0 * (1 + (p.r / 100) * 10))} · ${f1(compound(p.P0, p.r, 10))} triệu`},
        {label: 'Thời gian gấp đôi (kép)', value: (p: P) => `${f1(Math.log(2) / Math.log(1 + p.r / 100))} năm (xấp xỉ 72/r = ${f1(72 / p.r)})`},
      ],
      note: 'Lãi kép nhập lãi vào vốn mỗi kì nên sau t kì vốn là P(1 + r)ᵗ, hàm mũ; lãi đơn chỉ là hàm bậc nhất.',
    },
  },
};
