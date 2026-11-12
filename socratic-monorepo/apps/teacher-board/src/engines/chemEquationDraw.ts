/**
 * Cân đĩa phương trình hóa học: vẽ ĐÚNG các chất của phương trình (trái/phải), hệ số hiện tại lấy từ thanh trượt c1, c2, … cùng thứ tự,
 * và bảng đếm nguyên tử từng nguyên tố hai vế. Không in sẵn đáp án: chỉ nói nguyên tố nào đang lệch.
 */
import type {EquationMeta} from '../utils/chemBalanceBlueprint';
import {prettyFormula} from '../utils/chemBalanceBlueprint';
import {sideCounts} from '../utils/chemEquation';

const COLORS = ['#2563EB', '#0891B2', '#7C3AED', '#E11D48', '#D97706', '#059669'];

/** Hệ số hiện tại của từng chất (thanh trượt c1…cn; thiếu thì 1). */
export const coefsFromParams = (n: number, params: Record<string, number>): number[] => Array.from({length: n}, (_, i) => Math.max(1, Math.round(params[`c${i + 1}`] ?? 1)));

export interface BalanceState {
  coefs: number[];
  left: Record<string, number>;
  right: Record<string, number>;
  /** nguyên tố lệch giữa hai vế */
  off: string[];
  balanced: boolean;
  minimal: boolean;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function balanceState(meta: EquationMeta, params: Record<string, number>): BalanceState {
  const coefs = coefsFromParams(meta.species.length, params);
  const L = meta.species.map((s, i) => ({s, c: coefs[i]})).filter((x) => x.s.side === 'L');
  const R = meta.species.map((s, i) => ({s, c: coefs[i]})).filter((x) => x.s.side === 'R');
  const left = sideCounts(L.map((x) => x.s.atoms), L.map((x) => x.c));
  const right = sideCounts(R.map((x) => x.s.atoms), R.map((x) => x.c));
  const els = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  const off = els.filter((e) => (left[e] ?? 0) !== (right[e] ?? 0));
  return {coefs, left, right, off, balanced: off.length === 0 && R.length > 0, minimal: coefs.reduce((a, b) => gcd(a, b), 0) === 1};
}

export function drawEquationScale(ctx: CanvasRenderingContext2D, LW: number, LH: number, meta: EquationMeta, params: Record<string, number>): void {
  const st = balanceState(meta, params);
  const has = meta.species.some((s) => s.side === 'R');
  ctx.textAlign = 'start';
  ctx.font = 'bold 13px sans-serif';
  if (!has) {
    ctx.fillStyle = '#B45309';
    ctx.fillText(meta.none ? `Không xảy ra phản ứng: ${meta.note}` : meta.note || 'Chưa dự đoán chắc sản phẩm.', 18, 40);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#57534E';
    ctx.fillText(`Các chất đã cho: ${meta.species.map((s) => prettyFormula(s.formula)).join(' + ')}`, 18, 66);
    return;
  }
  const side = (sd: 'L' | 'R') => meta.species.map((s, i) => ({s, i})).filter((x) => x.s.side === sd);
  const eqText = (sd: 'L' | 'R') => side(sd).map(({s, i}) => `${st.coefs[i] > 1 ? st.coefs[i] : ''}${prettyFormula(s.formula)}`).join(' + ');
  const okColor = st.balanced ? '#059669' : '#D97706';

  // phương trình hiện tại + ghi chú (sản phẩm do máy dự đoán thì nói rõ)
  ctx.fillStyle = okColor;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`${eqText('L')}  →  ${eqText('R')}`, 18, 26);
  if (meta.predicted || meta.note) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#57534E';
    ctx.fillText(`${meta.predicted ? 'Sản phẩm dự đoán · ' : ''}${meta.kind}${meta.note ? ` — ${meta.note}` : ''}`, 18, 44);
  }

  // cân đĩa: nghiêng theo chênh lệch tổng số nguyên tử
  const totL = Object.values(st.left).reduce((a, b) => a + b, 0);
  const totR = Object.values(st.right).reduce((a, b) => a + b, 0);
  const tilt = Math.max(-0.16, Math.min(0.16, (totR - totL) * 0.012));
  const cx = LW / 2;
  const cy = 92;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.strokeStyle = okColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-210, 0);
  ctx.lineTo(210, 0);
  ctx.stroke();
  const pan = (x: number, sd: 'L' | 'R') => {
    const items = side(sd);
    const h = 16 + items.length * 15;
    ctx.fillStyle = 'rgba(241,245,249,0.95)';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.fillRect(x - 90, -h - 2, 180, h);
    ctx.strokeRect(x - 90, -h - 2, 180, h);
    ctx.font = 'bold 11px sans-serif';
    items.forEach(({s, i}, k) => {
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fillText(`${st.coefs[i]} × ${prettyFormula(s.formula)}`, x - 82, -h + 12 + k * 15);
    });
  };
  pan(-120, 'L');
  pan(120, 'R');
  ctx.restore();
  ctx.fillStyle = '#78716C';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 18, cy + 46);
  ctx.lineTo(cx + 18, cy + 46);
  ctx.closePath();
  ctx.fill();

  // bảng đếm nguyên tử từng nguyên tố
  const els = [...new Set([...Object.keys(st.left), ...Object.keys(st.right)])].slice(0, 7);
  const top = 156;
  const maxC = Math.max(1, ...els.map((e) => Math.max(st.left[e] ?? 0, st.right[e] ?? 0)));
  const k = 110 / maxC;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#78716C';
  ctx.fillText('Nguyên tố', 18, top);
  ctx.fillText('Vế trái', 110, top);
  ctx.fillText('Vế phải', 360, top);
  els.forEach((e, r) => {
    const y = top + 16 + r * 18;
    const l = st.left[e] ?? 0;
    const rr = st.right[e] ?? 0;
    const ok = l === rr;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = ok ? '#059669' : '#BE123C';
    ctx.fillText(e, 24, y);
    ctx.fillStyle = ok ? '#34D399' : '#FB7185';
    ctx.fillRect(110, y - 10, Math.max(2, l * k), 9);
    ctx.fillRect(360, y - 10, Math.max(2, rr * k), 9);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(String(l), 118 + l * k, y - 1);
    ctx.fillText(String(rr), 368 + rr * k, y - 1);
    ctx.fillStyle = ok ? '#059669' : '#BE123C';
    ctx.fillText(ok ? '✓' : '≠', 560, y - 1);
  });
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = okColor;
  const msg = st.balanced
    ? st.minimal
      ? 'Cân bằng! Số nguyên tử mỗi nguyên tố hai vế bằng nhau (bảo toàn nguyên tố).'
      : 'Đã cân bằng nhưng hệ số chưa tối giản: có thể chia chung cho một số không?'
    : `Nguyên tố ${st.off.slice(0, 3).join(', ')} đang lệch giữa hai vế: em điều chỉnh hệ số của chất nào?`;
  ctx.fillText(msg, cx, LH - 10);
  ctx.textAlign = 'start';
}
