/**
 * Vẽ trạng thái bảng dựng lại từ journal lên canvas 2D (lớp phủ tua lại).
 * Công thức vẽ dạng chữ thường (không KaTeX) và mô phỏng chỉ là thẻ tên: journal chưa lưu tham số mô phỏng.
 */
import type { ReconstructedBoardState, ReconstructedObject } from './vectorJournal';
import { solidWire } from './inlineShape';
import type { SolidKind } from './localRouter';

export const BOARD_W = 1200;
export const BOARD_H = 675;

type Ctx = CanvasRenderingContext2D;

function drawShape(ctx: Ctx, o: ReconstructedObject) {
  const sh = o.shape!;
  ctx.strokeStyle = o.color;
  ctx.lineWidth = Math.max(2.2, o.width);
  ctx.fillStyle = o.color;
  ctx.font = '600 14px sans-serif';
  if (sh.plane) {
    const v = sh.plane.verts;
    if (v.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(o.x + v[0].x, o.y + v[0].y);
    for (const p of v.slice(1)) ctx.lineTo(o.x + p.x, o.y + p.y);
    ctx.closePath();
    ctx.stroke();
    v.forEach((p, i) => ctx.fillText('ABCDEFGH'[i] ?? '', o.x + p.x + 6, o.y + p.y - 6));
  } else if (sh.sketch) {
    const sk = sh.sketch;
    for (const e of sk.edges) {
      ctx.setLineDash(e.hidden ? [6, 5] : []);
      ctx.beginPath();
      ctx.moveTo(o.x + sk.verts[e.a].x, o.y + sk.verts[e.a].y);
      ctx.lineTo(o.x + sk.verts[e.b].x, o.y + sk.verts[e.b].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    sk.verts.forEach((p, i) => ctx.fillText(sk.labels[i] ?? '', o.x + p.x + 6, o.y + p.y - 6));
  } else if (sh.solid) {
    const w = o.typeset?.w ?? 260;
    const h = o.typeset?.h ?? 200;
    const wire = solidWire(sh.solid.kind as SolidKind, sh.solid.dims, sh.solid.yaw, sh.solid.pitch, w, h);
    for (const e of wire.edges) {
      const a = wire.pts[e.a];
      const b = wire.pts[e.b];
      ctx.setLineDash(e.hidden ? [6, 5] : []);
      ctx.beginPath();
      ctx.moveTo(o.x + a.x, o.y + a.y);
      ctx.lineTo(o.x + b.x, o.y + b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

export function drawBoardState(ctx: Ctx, board: ReconstructedBoardState): void {
  ctx.fillStyle = '#FBFAF6';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const s of board.strokes) {
    if (s.points.length === 0) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  for (const o of board.objects) {
    if (o.shape) {
      drawShape(ctx, o);
    } else if (o.typeset) {
      ctx.fillStyle = o.color;
      ctx.font = `${o.typeset.size}px "Times New Roman", serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(o.typeset.text, o.x, o.y);
      ctx.textBaseline = 'alphabetic';
    }
  }

  ctx.font = '600 15px sans-serif';
  for (const sim of board.simulations.values()) {
    const w = 260;
    const h = 40;
    ctx.fillStyle = 'rgba(37,99,235,0.10)';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.fillRect(sim.x, sim.y, w, h);
    ctx.strokeRect(sim.x, sim.y, w, h);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillText(`Mô phỏng: ${sim.template}`, sim.x + 10, sim.y + 25);
  }
}
