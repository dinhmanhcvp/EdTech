import {Easing} from 'remotion';
import {H, W, type CamKF, type LayoutKF, type Mode, type Scene, type Seg, type ClipData} from './types';

const ease = Easing.inOut(Easing.cubic);
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Camera bên trong cửa sổ: nội suy keyframe đã ghi khi quay. */
export const camAt = (cams: CamKF[], t: number) => {
  let cx = 0.5;
  let cy = 0.5;
  let s = 1;
  for (const k of cams) {
    if (t < k.t) break;
    const p = ease(clamp((t - k.t) / Math.max(0.01, k.ms / 1000), 0, 1));
    cx = lerp(cx, k.cx, p);
    cy = lerp(cy, k.cy, p);
    s = lerp(s, k.s, p);
  }
  return {cx, cy, s};
};

/** Biến camera thành phép dịch/tỉ lệ trong khung 1920x1080 (kẹp biên, dịch tâm xuống nhẹ khi zoom). */
export const camTransform = (cam: {cx: number; cy: number; s: number}) => {
  const cy = cam.cy + 0.06 * clamp((cam.s - 1) / 0.5, 0, 1);
  const tx = clamp(W / 2 - cam.cx * W * cam.s, W - W * cam.s, 0);
  const ty = clamp(H / 2 - cy * H * cam.s, H - H * cam.s, 0);
  return {tx, ty, s: cam.s};
};

export type Rect = {x: number; y: number; w: number; h: number; rot: number; op: number; r: number};
const RECTS: Record<Mode, Rect> = {
  hero: {x: 1250, y: 150, w: 1180, h: 664, rot: 24, op: 0, r: 34},
  split: {x: 500, y: 74, w: 1360, h: 765, rot: -4, op: 1, r: 30},
  full: {x: 0, y: 0, w: 1920, h: 1080, rot: 0, op: 1, r: 0},
};
export const SPLIT_RECT = RECTS.split;

/** Bố cục cửa sổ theo thời gian cảnh (keyframe có easing). */
export const layoutAt = (kfs: LayoutKF[], t: number): Rect => {
  let cur: Rect = {...RECTS[kfs[0]?.mode ?? 'split']};
  for (const k of kfs) {
    if (t < k.t) break;
    const target = RECTS[k.mode];
    const p = ease(clamp((t - k.t) / Math.max(0.01, (k.ms ?? 1100) / 1000), 0, 1));
    cur = {
      x: lerp(cur.x, target.x, p),
      y: lerp(cur.y, target.y, p),
      w: lerp(cur.w, target.w, p),
      h: lerp(cur.h, target.h, p),
      rot: lerp(cur.rot, target.rot, p),
      op: lerp(cur.op, target.op, p),
      r: lerp(cur.r, target.r, p),
    };
  }
  return cur;
};
/** 0 = cửa sổ nhỏ (split), 1 = toàn màn hình. */
export const fullness = (r: Rect) => clamp((r.w - RECTS.split.w) / (W - RECTS.split.w), 0, 1);

export const segDur = (s: Seg, clips: Record<string, ClipData>) => ((s.to ?? clips[s.clip].duration) - s.from) / s.rate;
export const footageDur = (sc: Scene, clips: Record<string, ClipData>) => sc.segs.reduce((n, s) => n + segDur(s, clips), 0);

/** Tìm đoạn footage và thời điểm clip tại thời điểm ts của cảnh. */
export const segAt = (sc: Scene, clips: Record<string, ClipData>, tsRaw: number) => {
  const ts = Math.max(0, tsRaw - (sc.lead ?? 0));
  let start = 0;
  for (let i = 0; i < sc.segs.length; i++) {
    const s = sc.segs[i];
    const d = segDur(s, clips);
    if (ts < start + d || i === sc.segs.length - 1) {
      const local = Math.min(ts - start, d);
      return {i, seg: s, tc: s.from + local * s.rate, start};
    }
    start += d;
  }
  return null;
};
