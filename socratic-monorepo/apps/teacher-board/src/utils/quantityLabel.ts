/**
 * Nhãn đại lượng gọn cho thanh trượt / số đọc của các mô phỏng: cụm chữ dài đứng đầu nhãn ("Lực đẩy Archimedes…", "Khối lượng riêng…")
 * được thay bằng KÍ HIỆU quen thuộc của SGK (Fₐ, ρ…), phần chữ còn lại giữ nguyên; tên đầy đủ vẫn có ở chú thích (tooltip) và ở dòng "Kí hiệu".
 * Nhãn vốn ngắn thì để nguyên. Từ điển tách theo môn để không nhầm nghĩa ("tần số" ở Sinh là tần số alen, không phải f).
 */
import {SHORT_OVERRIDES} from './quantityLabelOverrides';

export type Subject = 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY' | 'MATH' | string | undefined;

/** [cụm chữ (chữ thường), kí hiệu]; cụm dài đứng trước cụm ngắn cùng gốc */
const COMMON: [string, string][] = [
  ['khối lượng riêng', 'ρ'],
  ['nhiệt dung riêng', 'c'],
  ['khối lượng mol', 'M'],
  ['khối lượng', 'm'],
  ['thể tích', 'V'],
  ['nhiệt độ', 'T'],
  ['áp suất', 'p'],
  ['thời gian', 't'],
  ['diện tích', 'S'],
];
const PHYSICS: [string, string][] = [
  ['lực đẩy archimedes', 'Fₐ'],
  ['lực đẩy ác-si-mét', 'Fₐ'],
  ['lực đẩy acsimet', 'Fₐ'],
  ['gia tốc trọng trường', 'g'],
  ['gia tốc', 'a'],
  ['vận tốc ban đầu', 'v₀'],
  ['tốc độ ban đầu', 'v₀'],
  ['vận tốc', 'v'],
  ['quãng đường', 's'],
  ['trọng lượng', 'P'],
  ['độ cao', 'h'],
  ['độ sâu', 'h'],
  ['chiều dài', 'ℓ'],
  ['hiệu điện thế', 'U'],
  ['điện áp', 'U'],
  ['cường độ dòng điện', 'I'],
  ['cường độ điện trường', 'E'],
  ['điện trở', 'R'],
  ['điện dung', 'C'],
  ['độ tự cảm', 'L'],
  ['công suất', 'P'],
  ['động năng', 'Wđ'],
  ['thế năng', 'Wt'],
  ['cơ năng', 'W'],
  ['tần số góc', 'ω'],
  ['tần số', 'f'],
  ['chu kì', 'T'],
  ['chu kỳ', 'T'],
  ['bước sóng', 'λ'],
  ['biên độ', 'A'],
  ['góc nghiêng', 'α'],
  ['góc tới', 'i'],
  ['góc khúc xạ', 'r'],
  ['chiết suất', 'n'],
  ['tiêu cự', 'f'],
  ['hệ số ma sát', 'μ'],
  ['độ cứng lò xo', 'k'],
  ['độ cứng', 'k'],
  ['cảm ứng từ', 'B'],
  ['từ thông', 'Φ'],
  ['suất điện động', 'ℰ'],
  ['nhiệt lượng', 'Q'],
  ['điện tích', 'q'],
  ['hiệu suất', 'H'],
  ['li độ', 'x'],
  ['pha ban đầu', 'φ'],
  ['lực ma sát', 'Fₘₛ'],
  ['lực hướng tâm', 'Fₕₜ'],
  ['lực đàn hồi', 'Fđh'],
  ['động lượng', 'p'],
  ['số vòng dây', 'N'],
  ['khoảng cách', 'd'],
  ['bán kính', 'r'],
];
const CHEMISTRY: [string, string][] = [
  ['nồng độ mol', 'Cₘ'],
  ['nồng độ', 'C'],
  ['số mol', 'n'],
  ['hằng số cân bằng', 'K'],
];
const BIOLOGY: [string, string][] = [
  ['kích thước quần thể', 'N'],
  ['sức chứa của môi trường', 'K'],
  ['sức chứa môi trường', 'K'],
  ['sức chứa', 'K'],
  ['tốc độ tăng trưởng', 'r'],
];

const dict = (subject: Subject): [string, string][] => {
  // Sinh, Toán: giữ chữ (thời gian sinh trưởng, nhiệt độ tối ưu… đọc bằng chữ dễ hơn kí hiệu)
  const extra = subject === 'PHYSICS' ? [...PHYSICS, ...COMMON] : subject === 'CHEMISTRY' ? [...CHEMISTRY, ...COMMON] : subject === 'BIOLOGY' ? BIOLOGY : [];
  return extra.sort((a, b) => b[0].length - a[0].length);
};

/** kí hiệu đại lượng đứng riêng trong chữ: một chữ cái Latin/Hi Lạp, có thể kèm chỉ số dưới hoặc dấu phẩy trên */
const SYMBOL_TOKEN = /(?<![\p{L}\d])([A-Za-zα-ωΑ-Ωℓ][₀-₉ₐ-ₜ']*)(?![\p{L}\d(])/gu;

/** nhãn ngắn hơn ngưỡng này thì để nguyên */
export const SHORT_ENOUGH = 20;

export interface CompactLabel {
  /** nhãn hiển thị */
  short: string;
  /** nhãn đầy đủ (chú thích khi rê chuột) */
  full: string;
  /** kí hiệu thay cho cụm chữ đầu nhãn, và tên của nó (cho dòng "Kí hiệu") */
  sym?: string;
  name?: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function compactLabel(label: string, subject?: Subject): CompactLabel {
  const full = label.replace(/\s+/g, ' ').trim();
  // bản gọn viết tay (đã rà từng nhãn); nhãn thanh trượt có đơn vị "(kg)" ở cuối thì giữ đơn vị
  const unit = /^(.*\S)\s+(\([^()]*\))$/u.exec(full);
  const hand = SHORT_OVERRIDES[full] ?? (unit && SHORT_OVERRIDES[unit[1]] ? `${SHORT_OVERRIDES[unit[1]]} ${unit[2]}` : undefined);
  if (hand) {
    // bản gọn bắt đầu bằng kí hiệu của cụm chữ đầu nhãn (Fₐ…): vẫn ghi vào dòng "Kí hiệu"
    const lower0 = full.toLocaleLowerCase('vi');
    const hit = dict(subject).find(([ph, sy]) => lower0.startsWith(ph) && hand.startsWith(sy));
    return {short: hand, full, ...(hit ? {sym: hit[1], name: full.charAt(0).toLocaleLowerCase('vi') + full.slice(1, hit[0].length)} : {})};
  }
  if (full.length <= SHORT_ENOUGH) return {short: full, full};
  // "Tên: công thức" → chỉ còn công thức (tên ở chú thích)
  const colon = /^([^:=]{4,}):\s*(.*=.*)$/u.exec(full);
  if (colon) return {short: colon[2].trim(), full};
  let s = full;
  let sym: string | undefined;
  let name: string | undefined;
  const lower = full.toLocaleLowerCase('vi');
  for (const [phrase, symbol] of dict(subject)) {
    if (!lower.startsWith(phrase) || /\p{L}/u.test(lower.charAt(phrase.length))) continue;
    let rest = full.slice(phrase.length).trim();
    // nhãn là một danh sách ("Diện tích · thể tích · S/V"): thay mỗi cụm đầu thì khó đọc, để nguyên
    if (/[·,;]/.test(rest)) break;
    // nhãn đã tự nêu kí hiệu: trùng thì bỏ chỗ lặp ("Khối lượng xe m" → "m xe"), khác thì giữ chữ ("Biên độ điện trường E₀")
    const own = [...rest.replace(/\([^()]*\)/g, ' ').matchAll(SYMBOL_TOKEN)].map((x) => x[1]);
    if (own.some((x) => x !== symbol)) break;
    rest = rest.replace(new RegExp(`(^|\\s)${esc(symbol)}(?![\\p{L}\\d'₀-₉(])`, 'u'), '$1').replace(/\s+/g, ' ').trim();
    s = rest ? `${symbol} ${rest}` : symbol;
    sym = symbol;
    name = full.slice(0, phrase.length);
    break;
  }
  // còn dài: bỏ phần giải thích trong ngoặc (có khoảng trắng bên trong); đơn vị kiểu "(kg/m³)" giữ lại
  // (chỉ ngoặc đứng sau khoảng trắng và không chứa công thức: "√(F₁² + F₂²)", "v(t)" giữ nguyên)
  if (s.length > SHORT_ENOUGH + 6) s = s.replace(/\s+\((?![^()]*[√²|=\d])[^()]*\s[^()]*\)/gu, '').replace(/\s+/g, ' ').trim();
  return {short: s, full, ...(sym ? {sym, name: name!.charAt(0).toLocaleLowerCase('vi') + name!.slice(1)} : {})};
}

/** Các kí hiệu đã dùng thay chữ trong một bộ nhãn: [kí hiệu, tên], không trùng. */
export function symbolLegend(labels: string[], subject?: Subject): [string, string][] {
  const out = new Map<string, string>();
  for (const l of labels) {
    const c = compactLabel(l, subject);
    if (c.sym && c.name && !out.has(c.sym)) out.set(c.sym, c.name);
  }
  return [...out];
}

/**
 * Rút gọn cả bộ nhãn của MỘT mô phỏng mà vẫn phân biệt được:
 * - cùng kí hiệu cho hai đại lượng khác nhau (P trọng lượng / P công suất, T nhiệt độ / T chu kì…) → các nhãn đó giữ chữ;
 * - hai nhãn rút gọn ra cùng một chuỗi ("Độ cao ban đầu", "Độ sâu ban đầu" → "h ban đầu") → giữ nguyên văn.
 */
export function compactLabels(labels: string[], subject?: Subject): CompactLabel[] {
  const out = labels.map((l) => compactLabel(l, subject));
  const names = new Map<string, Set<string>>();
  for (const c of out) if (c.sym && c.name) (names.get(c.sym) ?? names.set(c.sym, new Set()).get(c.sym)!).add(c.name.toLocaleLowerCase('vi'));
  const clash = new Set([...names].filter(([, n]) => n.size > 1).map(([s]) => s));
  const plain = (c: CompactLabel): CompactLabel => ({short: c.full, full: c.full});
  const step1 = out.map((c) => (c.sym && clash.has(c.sym) ? plain(c) : c));
  const count = new Map<string, Set<string>>();
  for (const c of step1) (count.get(c.short) ?? count.set(c.short, new Set()).get(c.short)!).add(c.full);
  return step1.map((c) => ((count.get(c.short)?.size ?? 0) > 1 ? plain(c) : c));
}
