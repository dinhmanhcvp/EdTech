/**
 * Bộ vẽ canvas dùng chung cho các engine Lý/Hóa/Sinh: thẻ số liệu kính mờ, gạch chéo nền cứng (trần, mặt đất),
 * cung góc có nhãn, thấu kính lồi, đường tia có quầng. Chỉ gọi API CanvasRenderingContext2D chuẩn nên kiểm thử được bằng ctx giả.
 */
type Ctx = CanvasRenderingContext2D;

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

export interface HudLine {
  text: string;
  color?: string;
  bold?: boolean;
}

/** Thẻ số liệu: nền trắng mờ, viền mảnh, bóng nhẹ; dòng đầu có thể in đậm. Trả về kích thước để xếp thẻ tiếp theo. */
export function hudCard(ctx: Ctx, lines: HudLine[], x: number, y: number, opts: {size?: number; pad?: number; family?: string} = {}): {w: number; h: number} {
  const size = opts.size ?? 11;
  const pad = opts.pad ?? 8;
  const family = opts.family ?? 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const lh = size + 5;
  ctx.save();
  let w = 0;
  for (const l of lines) {
    ctx.font = `${l.bold ? '700 ' : '500 '}${size}px ${family}`;
    w = Math.max(w, ctx.measureText(l.text).width);
  }
  w += pad * 2;
  const h = lines.length * lh + pad * 2 - 3;
  ctx.shadowColor = 'rgba(20, 20, 19, 0.12)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  roundRectPath(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(214, 211, 203, 0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    ctx.font = `${l.bold ? '700 ' : '500 '}${size}px ${family}`;
    ctx.fillStyle = l.color ?? '#292524';
    ctx.fillText(l.text, x + pad, y + pad + size + i * lh - 2);
  });
  ctx.restore();
  return {w, h};
}

/** Gạch chéo biểu thị vật cứng (trần treo, mặt đất, mặt phẳng). `dir` = hướng gạch lệch về phía vật (dưới/trên). */
export function hatch(ctx: Ctx, x1: number, x2: number, y: number, dir: 1 | -1 = 1, spacing = 9, len = 8, color = '#A8A29E'): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = x1; x <= x2; x += spacing) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.6, y + dir * len);
  }
  ctx.stroke();
  ctx.restore();
}

/** Cung góc từ tia a1 đến tia a2 (rad, hệ canvas y xuống) kèm nhãn ở giữa cung. */
export function angleArc(ctx: Ctx, cx: number, cy: number, r: number, a1: number, a2: number, color: string, label?: string): void {
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a1, a1 + d, d < 0);
  ctx.stroke();
  if (label) {
    const mid = a1 + d / 2;
    ctx.fillStyle = color;
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + Math.cos(mid) * (r + 12), cy + Math.sin(mid) * (r + 12));
  }
  ctx.restore();
}

/** Thấu kính hội tụ (lồi) hoặc phân kì (lõm) dạng kính trong suốt xanh nhạt, trục đi qua (cx, cy). */
export function lensBody(ctx: Ctx, cx: number, cy: number, halfH: number, bulge = 16, converging = true): void {
  const b = converging ? bulge : -bulge * 0.5;
  ctx.save();
  const g = ctx.createLinearGradient(cx - bulge, 0, cx + bulge, 0);
  g.addColorStop(0, 'rgba(147, 197, 253, 0.55)');
  g.addColorStop(0.5, 'rgba(219, 234, 254, 0.75)');
  g.addColorStop(1, 'rgba(96, 165, 250, 0.5)');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfH);
  ctx.quadraticCurveTo(cx + b * 2, cy, cx, cy + halfH);
  ctx.quadraticCurveTo(cx - b * 2, cy, cx, cy - halfH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // đường bóng sáng bên trái thân kính
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - b * 0.55, cy - halfH * 0.55);
  ctx.quadraticCurveTo(cx - b * 0.85, cy, cx - b * 0.55, cy + halfH * 0.55);
  ctx.stroke();
  ctx.restore();
}

/** Đường gấp khúc có quầng mờ phía dưới (tia sáng, quỹ đạo). */
export function glowPath(ctx: Ctx, pts: [number, number][], color: string, width = 1.8, dashed?: number[]): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ?? []);
  for (const [w, a] of [[width + 5, 0.14], [width, 1]] as [number, number][]) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Khối chữ nhật bo góc đổ bóng ba tông (sáng trên, tối dưới) trong hệ tọa độ đã xoay/tịnh tiến sẵn. */
export function shadedBlock(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, edge: string): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  g.addColorStop(0.35, base);
  g.addColorStop(1, edge);
  ctx.shadowColor = 'rgba(20, 20, 19, 0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = base;
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
