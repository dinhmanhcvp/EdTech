/**
 * Bộ chiếu 3D nhẹ cho SCENE_LAB (không cần WebGL): xoay quanh trục đứng bằng thanh trượt "góc xoay", nghiêng bằng "góc nhìn lên",
 * chiếu phối cảnh nhẹ, vẽ từ xa tới gần. Cùng (tham số, t) cho cùng hình nên kiểm thử được; học sinh nhìn rõ chiều sâu nhờ phối cảnh và độ mờ theo khoảng cách.
 * Hệ trục thế giới: x sang phải, y hướng lên, z hướng về phía người xem.
 */
import type {Shape} from './types';
import {rad} from './sceneKit';

export type V3 = [number, number, number];
export interface Cam {
  /** góc xoay quanh trục đứng (độ) */
  az: number;
  /** góc nhìn lên/xuống (độ) */
  el: number;
  /** tâm hiển thị trên màn hình */
  cx: number;
  cy: number;
  /** px trên một đơn vị thế giới */
  s: number;
  /** khoảng cách phối cảnh (đơn vị thế giới); lớn = ít méo */
  d?: number;
}

export interface P3 {
  x: number;
  y: number;
  /** độ sâu: lớn = gần người xem */
  z: number;
  /** hệ số phối cảnh (kích thước tương đối) */
  k: number;
}

export function project(p: V3, cam: Cam): P3 {
  const a = rad(cam.az);
  const e = rad(cam.el);
  const x1 = p[0] * Math.cos(a) + p[2] * Math.sin(a);
  const z1 = -p[0] * Math.sin(a) + p[2] * Math.cos(a);
  const y2 = p[1] * Math.cos(e) - z1 * Math.sin(e);
  const z2 = p[1] * Math.sin(e) + z1 * Math.cos(e);
  const d = cam.d ?? 14;
  const k = d / Math.max(1, d - z2);
  return {x: cam.cx + cam.s * x1 * k, y: cam.cy - cam.s * y2 * k, z: z2, k};
}

/** Độ mờ theo khoảng cách (gần rõ, xa mờ) để thấy chiều sâu. */
export const fade = (z: number, lo = 0.45): number => Math.max(lo, Math.min(1, 0.72 + z * 0.09));

export function line3(a: V3, b: V3, cam: Cam, stroke: string, w = 2, o: {dash?: string; arrow?: boolean} = {}): Shape {
  const A = project(a, cam);
  const B = project(b, cam);
  return {t: 'line', x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke, w, dash: o.dash, arrow: o.arrow};
}

export function poly3(pts: V3[], cam: Cam, o: {stroke?: string; fill?: string; w?: number; close?: boolean; dash?: string; o?: number} = {}): Shape {
  return {t: 'poly', pts: pts.map((p) => {
    const q = project(p, cam);
    return [q.x, q.y] as [number, number];
  }), stroke: o.stroke, fill: o.fill, w: o.w ?? 2, close: o.close ?? false, dash: o.dash, o: o.o};
}

/** Quả cầu: hình tròn có bán kính theo phối cảnh, kèm điểm sáng nhỏ cho có khối. */
export function sphere3(c: V3, r: number, cam: Cam, fill: string, stroke = '#44403C'): {z: number; shapes: Shape[]} {
  const p = project(c, cam);
  const R = r * cam.s * p.k;
  return {
    z: p.z,
    shapes: [
      {t: 'circle', cx: p.x, cy: p.y, r: R, fill, stroke, w: 1.2},
      {t: 'circle', cx: p.x - R * 0.3, cy: p.y - R * 0.3, r: R * 0.28, fill: '#FFFFFF', o: 0.5},
    ],
  };
}

/** Sắp xếp các nhóm hình theo độ sâu (xa vẽ trước). */
export const depthSorted = (items: {z: number; shapes: Shape[]}[]): Shape[] => [...items].sort((a, b) => a.z - b.z).flatMap((i) => i.shapes);

/** Ba trục tọa độ nhỏ ở góc, có nhãn: giúp người xem biết đang nhìn từ hướng nào. */
export function axes3(cam: Cam, len = 1, labels: [string, string, string] = ['x', 'y', 'z']): Shape[] {
  const o: V3 = [0, 0, 0];
  const out: Shape[] = [];
  const ends: [V3, string, string][] = [[[len, 0, 0], labels[0], '#E11D48'], [[0, len, 0], labels[1], '#16A34A'], [[0, 0, len], labels[2], '#2563EB']];
  for (const [e, l, c] of ends) {
    out.push(line3(o, e, cam, c, 1.8, {arrow: true}));
    const q = project([e[0] * 1.15, e[1] * 1.15, e[2] * 1.15], cam);
    out.push({t: 'text', x: q.x, y: q.y + 4, s: l, size: 11, fill: c, bold: true, anchor: 'middle'});
  }
  return out;
}

/** Elip (đường tròn trong không gian) theo hai vectơ đơn vị u, v: các điểm c + r(cos·u + sin·v). */
export function circle3(c: V3, r: number, u: V3, v: V3, n = 48, from = 0, to = 2 * Math.PI): V3[] {
  return Array.from({length: n + 1}, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return [c[0] + r * (Math.cos(t) * u[0] + Math.sin(t) * v[0]), c[1] + r * (Math.cos(t) * u[1] + Math.sin(t) * v[1]), c[2] + r * (Math.cos(t) * u[2] + Math.sin(t) * v[2])] as V3;
  });
}
