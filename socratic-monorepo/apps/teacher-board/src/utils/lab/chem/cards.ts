import {RULES} from './rules';
import {propertiesOf} from './properties';
import {SPECIES, SUB_BY_ID} from './species';
import type {Derived, Vessel} from './types';

/**
 * Nội dung các thẻ thông tin hiện NGAY TRÊN chất và trên chính phản ứng trong cảnh 3D của phòng hóa (không để trong tab Hướng dẫn):
 * thẻ chất (tính chất vật lí, cảnh báo, vài phản ứng tiêu biểu) khi trỏ vào hoặc cầm chai; thẻ ống nghiệm (đang có gì, màu, pH, nhiệt độ,
 * kết tủa, khí, phản ứng vừa xảy ra kèm hiện tượng). Cùng dạng với `CardRow` của `Stage3D`.
 */
export type Row = {t: 'h' | 'kv' | 'eq' | 'p' | 'warn'; a: string; b?: string; c?: string};

const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
const KIND: Record<string, string> = {solution: 'dung dịch', solid: 'chất rắn', liquid: 'chất lỏng', indicator: 'chất chỉ thị'};
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function substanceRows(id: string, maxReactions = 3): Row[] {
  const sub = SUB_BY_ID[id];
  const props = propertiesOf(id);
  if (!sub || !props) return [];
  const rows: Row[] = [{t: 'h', a: `${sub.label}${sub.formula ? ` (${sub.formula})` : ''}`}];
  rows.push({t: 'kv', a: 'Loại', b: `${KIND[sub.kind]} · nhóm ${sub.group}${sub.conc ? ` · ${sub.conc} mol/L` : ''}${sub.molar ? ` · M = ${sub.molar} g/mol` : ''}`});
  const ph = props.physical;
  if (ph) {
    for (const [k, v] of [['Bề ngoài', ph.look], ['Mùi', ph.smell], ['Tan trong nước', ph.water], ['Nóng chảy', ph.mp ? `${ph.mp} °C` : ''], ['Sôi', ph.bp ? `${ph.bp} °C` : ''], ['Khối lượng riêng', ph.rho ? `${ph.rho} g/cm³` : '']] as [string, string][])
      if (v) rows.push({t: 'kv', a: `${k}:`, b: cut(v, 70)});
  }
  if (sub.hazard) rows.push({t: 'warn', a: `⚠ ${sub.hazard}`});
  for (const n of props.notes.slice(0, 1)) rows.push({t: 'p', a: cut(n, 110)});
  if (props.reactions.length) {
    rows.push({t: 'p', a: `Tính chất hóa học: ${props.reactions.length} phản ứng, ví dụ`});
    for (const r of props.reactions.slice(0, maxReactions)) {
      rows.push({t: 'eq', a: cut(r.eq, 64)});
      if (r.text) rows.push({t: 'p', a: cut(r.text, 90)});
    }
  }
  return rows;
}

/** Thẻ của một ống / cốc: rỗng nếu chưa có gì. `last` = số phản ứng gần nhất cần hiện. */
export function vesselRows(v: Vessel, d: Derived, last = 2): Row[] {
  const inside = Object.entries(v.moles)
    .filter(([, mol]) => mol > 1e-7)
    .map(([sp]) => sp);
  if (!inside.length && v.liquidMl <= 0.01) return [];
  const rows: Row[] = [{t: 'h', a: `${v.id} · ${v.liquidMl.toFixed(1)} mL · ${d.temp.toFixed(0)} °C${d.ph !== null ? ` · pH ${d.ph.toFixed(1)}` : ''}`}];
  const names = inside.map((sp) => (SPECIES[sp]?.name ?? sp).replace(/^ion /, ''));
  if (names.length) rows.push({t: 'kv', a: 'Có:', b: `${names.slice(0, 4).join(', ')}${names.length > 4 ? ` +${names.length - 4}` : ''}`});
  rows.push({t: 'kv', a: 'Màu dung dịch:', b: d.colorAlpha > 0.08 ? 'có màu' : 'trong suốt', c: d.colorAlpha > 0.08 ? d.color : undefined});
  if (d.precipitates.length) rows.push({t: 'kv', a: 'Kết tủa / chất rắn:', b: d.precipitates.slice(0, 3).map((p) => p.name).join(', '), c: d.precipitates[0].color});
  if (d.smell.length) rows.push({t: 'kv', a: 'Mùi / khí:', b: d.smell.slice(0, 2).join(', ')});
  for (const id of v.fired.slice(-last)) {
    const r = RULE_BY_ID.get(id);
    if (!r) continue;
    rows.push({t: 'eq', a: cut(r.eq, 64)});
    if (r.text) rows.push({t: 'p', a: `→ ${cut(r.text, 100)}`});
  }
  return rows;
}
