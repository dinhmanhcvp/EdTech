/** Phần tính thuần của các cảnh Vật lí dựng bằng Blender (động học, dốc, mạch điện): tách riêng để kiểm thử. */
import {G, slideAccel} from './lyScene1';

/** Vị trí x(t) và vận tốc v(t), vị trí quy về đệm khí [−5, 5] (`X`), thời điểm kết thúc (rơi tự do dừng khi chạm đáy). */
export function kinematicsX(mode: string, v0: number, a0: number, h: number, t: number) {
  const a = mode === 'uniform' ? 0 : mode === 'fall' ? G : a0;
  const v00 = mode === 'fall' ? 0 : v0;
  const tEnd = mode === 'fall' ? Math.sqrt((2 * h) / G) : 8;
  const tc = Math.min(t, tEnd);
  const xf = (u: number) => v00 * u + 0.5 * a * u * u;
  const xs = Array.from({length: 41}, (_, i) => xf((8 * i) / 40));
  const lo = Math.min(...xs, 0);
  const hi = Math.max(...xs, 1);
  return {x: xf(tc), v: v00 + a * tc, X: -5 + (10 * (xf(tc) - lo)) / (hi - lo), tEnd};
}
/** Kích thước dốc trong cảnh: L = chiều dài mặt dốc (m), ku = đơn vị cảnh trên mét (vừa khung 5,75 đơn vị), đỉnh dốc ở (topX, topY). */
export function rampLayout(h: number, alDeg: number) {
  const al = (alDeg * Math.PI) / 180;
  const L = h / Math.sin(al);
  const ku = Math.min(36, 230 / Math.max(L * Math.cos(al), h)) / 40;
  return {L, ku, topX: -3.2, topY: h * ku, accel: slideAccel(alDeg, 0)};
}
export const niceMax = (v: number, steps: number[]) => steps.find((s) => s >= v) ?? steps[steps.length - 1];
/** Đường đi của electron trên bảng mạch (x, z), theo chiều dòng điện quy ước từ cực + ra; cảnh đảo ngược cho electron. Trùng dây trong board_parts2.py. */
export const CIRC_PATHS: Record<'series' | 'parallel', [number, number][][]> = {
  series: [[[-2.6, -0.7], [-2.6, -1.5], [2.9, -1.5], [2.9, 1.5], [-2.6, 1.5], [-2.6, 0.7]]],
  parallel: [
    [[-2.6, -0.7], [-2.6, -1.5], [0, -1.5], [0, -0.5], [2.9, -0.5], [2.9, 1.5], [-2.6, 1.5], [-2.6, 0.7]],
    [[-2.6, -0.7], [-2.6, -1.5], [0, -1.5], [0, 0.5], [2.9, 0.5], [2.9, 1.5], [-2.6, 1.5], [-2.6, 0.7]],
  ],
};
