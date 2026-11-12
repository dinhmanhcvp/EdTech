import {PHYSICAL} from './physical';
import type {Row} from './cards';

/**
 * Thẻ phản ứng hiện NGAY TRÊN dụng cụ của năm bài hóa thao tác riêng (chuẩn độ, NO₂ ⇌ N₂O₄, clo khô / ẩm, kim loại kiềm, BZ):
 * phương trình, hiện tượng đang thấy theo trạng thái thật của bài, và tính chất vật lí của chất tham gia. Thay cho phần giải thích trong tab Hướng dẫn.
 */
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const vi = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
/** một dòng tính chất vật lí của một chất trên kệ (id trong species.ts) */
const phys = (id: string, name: string): Row[] => {
  const p = PHYSICAL[id];
  return p ? [{t: 'kv', a: `${name}:`, b: cut(p.look, 56)}] : [];
};

export function titrationRows(vol: number, cb: number, pH: number): Row[] {
  const pink = pH >= 8.2;
  return [
    {t: 'h', a: 'Chuẩn độ acid mạnh bằng base mạnh'},
    {t: 'eq', a: 'HCl + NaOH → NaCl + H₂O'},
    {t: 'kv', a: 'Đã nhỏ:', b: `${vi(vol)} mL NaOH ${vi(cb, 3)} M`},
    {t: 'kv', a: 'pH:', b: vi(pH)},
    {t: 'kv', a: 'Phenolphtalein:', b: pink ? 'hồng (pH ≥ 8,2)' : 'không màu (pH < 8,2)', c: pink ? '#E84F9A' : undefined},
    {t: 'p', a: pH < 4 ? 'Acid còn dư nhiều: pH tăng chậm theo từng giọt.' : pH <= 10 ? 'Gần điểm tương đương: chỉ vài giọt làm pH nhảy vọt.' : 'Đã quá điểm tương đương: base dư.'},
    ...phys('hcl', 'HCl'),
    ...phys('naoh', 'NaOH'),
  ];
}

export function no2Rows(T: number, P: number, x: number): Row[] {
  return [
    {t: 'h', a: 'Cân bằng NO₂ ⇌ N₂O₄'},
    {t: 'eq', a: '2NO₂ (nâu đỏ) ⇌ N₂O₄ (không màu)  ΔH = −57 kJ'},
    {t: 'kv', a: 'NO₂ (nâu):', b: `${(x * 100).toFixed(0)} % số phân tử`, c: '#B5523B'},
    {t: 'kv', a: 'N₂O₄ (không màu):', b: `${(100 - x * 100).toFixed(0)} %`},
    {t: 'kv', a: 'Bể / áp suất:', b: `${T.toFixed(0)} °C · ${vi(P, 1)} atm`},
    {t: 'p', a: 'Nén khí hoặc làm lạnh: cân bằng dịch sang N₂O₄ (màu nhạt đi). Đun nóng hoặc giãn khí: dịch sang NO₂ (nâu đậm).'},
  ];
}

export function chlorineRows(wet: boolean, cl: number, bleached: number, t: number, inJar: boolean): Row[] {
  return [
    {t: 'h', a: wet ? 'Clo ẩm tẩy màu vải' : 'Clo khô không tẩy màu'},
    {t: 'eq', a: wet ? 'Cl₂ + H₂O ⇌ HCl + HClO' : 'Cl₂ (khô): không có HClO'},
    {t: 'kv', a: 'Khí clo trong bình:', b: `${cl.toFixed(0)} %`, c: '#9BCB3A'},
    {t: 'kv', a: 'Vải:', b: inJar ? `mất ${(bleached * 100).toFixed(0)} % màu sau ${t.toFixed(0)} s` : 'đang ở ngoài bình'},
    {t: 'p', a: wet ? 'HClO có tính oxi hóa mạnh nên phá màu thuốc nhuộm.' : 'Cl₂ khô không phá màu: phải có nước để tạo HClO.'},
    ...phys('cl2w', 'Nước clo'),
  ];
}

export function alkaliRows(sym: string, d: number, level: number, pH: number, reacting: boolean, pink: number): Row[] {
  const rows: Row[] = [{t: 'h', a: `${sym} tác dụng với nước`}, {t: 'eq', a: `2${sym} + 2H₂O → 2${sym}OH + H₂↑`}, {t: 'kv', a: 'Mẩu kim loại:', b: `${vi(d, 1)} mm`}];
  if (reacting) {
    rows.push({t: 'p', a: ['Tan êm, sủi bọt khí H₂ đều.', 'Nóng chảy, vo tròn thành giọt chạy trên mặt nước.', 'H₂ bốc cháy, ngọn lửa mang màu đặc trưng của kim loại.', 'NỔ: nhiệt tỏa ra quá lớn; ngoài đời đây là tai nạn bỏng kiềm.'][level] ?? ''});
    rows.push({t: level === 3 ? 'warn' : 'p', a: `Dung dịch tạo thành: base mạnh (pH ≈ ${vi(pH, 1)}), phenolphtalein hóa hồng.`});
  } else if (pink > 0.02) rows.push({t: 'p', a: `Sau phản ứng: dung dịch ${sym}OH, phenolphtalein ${pink > 0.3 ? 'hồng rõ' : 'hồng nhạt'}.`});
  else rows.push({t: 'p', a: 'Chưa thả vào nước: kim loại kiềm mềm, cắt được bằng dao, phải cất trong dầu hỏa.'});
  return rows;
}

export function bzRows(f: number, eps: number, period: number): Row[] {
  return [
    {t: 'h', a: 'Phản ứng dao động Belousov–Zhabotinsky'},
    {t: 'eq', a: 'Fe(phen)₃²⁺ (đỏ) ⇌ Fe(phen)₃³⁺ (xanh) + e⁻'},
    {t: 'kv', a: 'f · ε:', b: `${vi(f)} · ${vi(eps, 3)}`},
    {t: 'kv', a: 'Dao động:', b: period > 0 ? `chu kì ≈ ${vi(period, 1)}` : 'không (cốc đứng ở một màu)'},
    {t: 'p', a: 'Chất xúc tác bị oxi hóa rồi khử luân phiên nhờ khâu tự xúc tác và khâu ức chế chậm; f quá nhỏ hoặc quá lớn thì dao động tắt.'},
  ];
}
