import {RULES} from './rules';
import {SPECIES, SUBSTANCES, SUB_BY_ID} from './species';
import {PHYSICAL, type Physical} from './physical';
import type {Rule, Substance} from './types';

/**
 * Tính chất hóa học của một chất, rút từ chính cơ sở dữ liệu phản ứng (không viết tay riêng cho từng chất):
 * mọi luật mà loài của chất tham gia, kèm điều kiện, hiện tượng và các chất có thể làm cặp phản ứng.
 */
export interface Reaction {
  id: string;
  eq: string;
  /** hiện tượng quan sát được */
  text?: string;
  /** điều kiện cần: nhiệt độ, ánh sáng, xúc tác, có nước, phản ứng chậm */
  conditions: string[];
  /** các chất trong kệ có thể làm cặp (phản ứng cần cả hai); rỗng nếu chất này tự phản ứng (đun nóng, hòa tan, phân hủy) */
  partners: Substance[];
  /** tỏa (−) hay thu (+) nhiệt, kJ/mol */
  heat?: number;
}
export interface Properties {
  substance: Substance;
  /** tính chất vật lí (trạng thái, màu, mùi, tính tan, nhiệt độ nóng chảy và sôi, khối lượng riêng) */
  physical: Physical | null;
  /** ghi chú tính chất không phải phản ứng (chất chỉ thị đổi màu, dung môi…) */
  notes: string[];
  /** loài tạo ra và trạng thái */
  species: {name: string; phase: string; color?: string}[];
  smell: string[];
  reactions: Reaction[];
}

const PHASE: Record<string, string> = {aq: 'tan trong dung dịch', s: 'chất rắn', l: 'chất lỏng', g: 'chất khí'};
const conditionsOf = (r: Rule): string[] => {
  const c: string[] = [];
  if (r.minTemp !== undefined) c.push(`cần đun tới ≥ ${r.minTemp} °C`);
  if (r.needsLight) c.push('cần ánh sáng');
  if (r.catalysts?.length) c.push(`cần xúc tác ${r.catalysts.map((s) => SPECIES[s]?.name ?? s).join(', ')}`);
  if (r.wet) c.push('cần có nước');
  if (r.k !== undefined) c.push('xảy ra từ từ (chờ hoặc tua nhanh thời gian)');
  return c;
};
const providers = (species: string): Substance[] => SUBSTANCES.filter((s) => species in s.species);

export function propertiesOf(id: string): Properties | null {
  const sub = SUB_BY_ID[id];
  if (!sub) return null;
  const mine = new Set(Object.keys(sub.species));
  const reactions: Reaction[] = [];
  for (const r of RULES) {
    const names = Object.keys(r.reactants);
    if (!names.some((n) => mine.has(n))) continue;
    const others = names.filter((n) => !mine.has(n) && n !== 'H2O');
    const partners = others.length ? [...new Map(others.flatMap(providers).filter((s) => s.id !== sub.id).map((s) => [s.id, s])).values()] : [];
    reactions.push({id: r.id, eq: r.eq, text: r.text, conditions: conditionsOf(r), partners, heat: r.heat});
  }
  // vai trò xúc tác: chất không bị tiêu thụ nhưng làm phản ứng khác xảy ra nhanh
  for (const r of RULES) if (r.catalysts?.some((c) => mine.has(c)) && !reactions.some((x) => x.id === r.id)) reactions.push({id: r.id, eq: r.eq, text: r.text, conditions: ['đóng vai trò xúc tác, không bị tiêu thụ', ...conditionsOf(r).filter((c) => !c.startsWith('cần xúc tác'))], partners: [], heat: r.heat});
  const notes: string[] = [];
  if (sub.id === 'pp') notes.push('Phenolphtalein: không màu khi pH < 8,2; hồng tím khi pH ≥ 8,2 (nhận biết dung dịch base).');
  if (sub.id === 'mo') notes.push('Methyl da cam: đỏ khi pH < 3,1; cam khi 3,1–4,4; vàng khi pH > 4,4.');
  if (sub.id === 'litmus') notes.push('Quỳ tím: đỏ khi pH < 5; tím khi 5–8; xanh khi pH > 8.');
  if (['pp', 'mo', 'litmus'].includes(sub.id)) reactions.push({id: `${sub.id}-ph`, eq: 'màu của chỉ thị đổi theo pH của dung dịch', text: notes[0], conditions: ['cho vào dung dịch đã có acid hoặc base'], partners: SUBSTANCES.filter((x) => x.group === 'Acid' || x.group === 'Base').slice(0, 8)});
  if (sub.id === 'water') {
    notes.push('Nước là dung môi: muối và đường chỉ tan khi có nước; acid đặc pha loãng toả nhiều nhiệt (luôn rót acid vào nước).');
    for (const r of RULES) if (r.wet) reactions.push({id: r.id, eq: r.eq, text: r.text, conditions: ['cần có nước'], partners: [], heat: r.heat});
  }
  const sp = [...mine].map((k) => ({name: SPECIES[k]?.name ?? k, phase: PHASE[SPECIES[k]?.phase ?? 'aq'] ?? '', color: SPECIES[k]?.color}));
  const smell = [...mine].map((k) => SPECIES[k]?.smell).filter((x): x is string => !!x);
  return {substance: sub, physical: PHYSICAL[sub.id] ?? null, notes, species: sp, smell, reactions};
}
