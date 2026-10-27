// apps/teacher-board/src/utils/inlineShape.ts
/**
 * Hình học "tại chỗ": nét vẽ tay được thay bằng hình sạch ngay trên bảng (như chữ → công thức chuẩn).
 * Thuần tính toán, không phụ thuộc React/DOM để kiểm thử.
 */
import type {ShapeMeta} from './lassoGeometry';
import type {SolidKind} from './localRouter';
import {makeSolid, edgesOf, faceNormal, mulMV, mulMM, rotAxis, project, type M3, type V3} from './solids';

export interface P2 {
  x: number;
  y: number;
}

/** px canvas ứng với 1 đơn vị độ dài trên hình phẳng */
export const PLANE_UNIT_PX = 50;

/** Đưa đỉnh chuẩn hóa (y hướng lên) về px trong khung w×h, giữ tỉ lệ và căn giữa. */
export function fitPlaneVertices(v2: [number, number][], w: number, h: number): P2[] {
  const xs = v2.map((v) => v[0]);
  const ys = v2.map((v) => v[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rw = Math.max(maxX - minX, 1e-6);
  const rh = Math.max(maxY - minY, 1e-6);
  const k = Math.min(w / rw, h / rh);
  const ox = (w - rw * k) / 2;
  const oy = (h - rh * k) / 2;
  return v2.map(([x, y]) => ({x: ox + (x - minX) * k, y: oy + (maxY - y) * k}));
}

export function planeStats(verts: P2[], unit = PLANE_UNIT_PX): {sides: number[]; angles: number[]; area: number} {
  const n = verts.length;
  const sides: number[] = [];
  const angles: number[] = [];
  let a2 = 0;
  for (let i = 0; i < n; i++) {
    const p = verts[i];
    const q = verts[(i + 1) % n];
    const r = verts[(i - 1 + n) % n];
    sides.push(Math.hypot(q.x - p.x, q.y - p.y) / unit);
    const ux = r.x - p.x;
    const uy = r.y - p.y;
    const vx = q.x - p.x;
    const vy = q.y - p.y;
    const c = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
    angles.push((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
    a2 += p.x * q.y - q.x * p.y;
  }
  return {sides, angles, area: Math.abs(a2) / 2 / (unit * unit)};
}

/** Trọng tâm G, tâm ngoại tiếp O, trực tâm H của tam giác (H = 3G − 2O). null nếu suy biến. */
export function triangleCenters(v: P2[]): {G: P2; O: P2; H: P2; R: number} | null {
  if (v.length !== 3) return null;
  const [a, b, c] = v;
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const O = {x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d};
  const G = {x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3};
  return {G, O, H: {x: 3 * G.x - 2 * O.x, y: 3 * G.y - 2 * O.y}, R: Math.hypot(a.x - O.x, a.y - O.y)};
}

export const VERTEX_LABELS = 'ABCDEFGH'.split('');

// ------------------------------------------------------------------ khối 3D nét liền / nét đứt
export const DEFAULT_YAW = 0.62;
export const DEFAULT_PITCH = 0.42;

const rotation = (yaw: number, pitch: number): M3 => mulMM(rotAxis([1, 0, 0] as V3, pitch), rotAxis([0, 1, 0] as V3, yaw));

export interface SolidWire {
  pts: P2[];
  labels: string[];
  edges: {a: number; b: number; hidden: boolean}[];
  title: string;
}

/** Chiếu khối vào khung w×h; cạnh bị che (mọi mặt kề đều quay lưng) vẽ nét đứt. */
export function solidWire(kind: SolidKind, dims: Record<string, number | undefined>, yaw: number, pitch: number, w: number, h: number): SolidWire {
  const solid = makeSolid(kind, dims);
  const R = rotation(yaw, pitch);
  const rad = Math.max(...solid.verts.map((v) => Math.hypot(v[0], v[1], v[2])), 1e-6);
  const zoom = (Math.min(w, h) * 0.46) / rad;
  const cam = {R, zoom, cx: w / 2, cy: h / 2, dist: 14};
  const pts = solid.verts.map((v) => {
    const p = project(cam, v);
    return {x: p.x, y: p.y};
  });
  const front = solid.faces.map((f) => mulMV(R, faceNormal(solid.verts, f))[2] > 1e-6);
  const edgeFaces = new Map<string, boolean[]>();
  solid.faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const arr = edgeFaces.get(key) ?? [];
      arr.push(front[fi]);
      edgeFaces.set(key, arr);
    }
  });
  const edges = edgesOf(solid.faces).map(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    const fs = edgeFaces.get(key) ?? [true];
    return {a, b, hidden: !fs.some(Boolean)};
  });
  return {pts, labels: solid.labels, edges, title: solid.title};
}

// ------------------------------------------------------------------ tạo đối tượng từ blueprint
export interface ShapeSeed {
  shape: ShapeMeta;
}

export function shapeFromBlueprint(bp: {templateId: string; meta?: Record<string, unknown>; recognizedLatex?: string}, w: number, h: number): ShapeMeta | null {
  const m = (bp.meta ?? {}) as Record<string, any>;
  if (bp.templateId === 'GEO_SOLID' && m.solid) {
    return {kind: 'solid', title: solidWire(m.solid as SolidKind, m.dims ?? {}, DEFAULT_YAW, DEFAULT_PITCH, w, h).title, solid: {kind: m.solid as SolidKind, dims: m.dims ?? {}, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH}};
  }
  if (bp.templateId === 'MATH_DYNAMIC_GEOMETRY' && Array.isArray(m.vertices2D) && m.vertices2D.length >= 3) {
    return {kind: 'plane', title: String(m.planeTitle ?? 'Hình phẳng'), plane: {verts: fitPlaneVertices(m.vertices2D, w, h), euler: false}};
  }
  return null;
}
