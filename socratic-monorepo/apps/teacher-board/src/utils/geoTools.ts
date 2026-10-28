/**
 * Dụng cụ vẽ thêm trên hình dựng từ đề (kiểu các nền tảng vẽ hình): đoạn nối, trung điểm, điểm trên cạnh,
 * chân đường vuông góc, thiết diện, và "thêm yêu cầu" bằng lời. Mọi hàm trả CẢNH MỚI (không sửa cảnh cũ) để hoàn tác được.
 * Điểm/đường mới gắn vào `part` đang hiển thị nên bật/tắt từng phần của đề vẫn đúng.
 */
import {add, dot, mul, sub, type V3} from './solids';
import {appendPart, modelFromScene, renderScene, sceneFromModel, type GeoScene} from './geometryProblem';
import type {ShapeMeta} from './lassoGeometry';

const NAMES = 'MNPQRTUVWXYZHKIJEFGL'.split('');

const clone = (sc: GeoScene): GeoScene => JSON.parse(JSON.stringify(sc));
const key2 = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Tên điểm tiếp theo chưa dùng (M, N, P, Q, …, rồi M1, N1…). */
export function nextName(sc: GeoScene): string {
  const used = new Set(Object.keys(sc.pts));
  for (const n of NAMES) if (!used.has(n)) return n;
  for (let i = 1; i < 100; i++) for (const n of NAMES) if (!used.has(`${n}${i}`)) return `${n}${i}`;
  return 'Z9';
}

const addPoint = (sc: GeoScene, name: string, p: V3, part: number) => {
  sc.pts[name] = p;
  sc.order.push(name);
  sc.marks.push(name);
  sc.ptPart[name] = part;
};

export function addSegment(sc: GeoScene, a: string, b: string, part: number): GeoScene {
  if (a === b || !sc.pts[a] || !sc.pts[b]) return sc;
  const k = key2(a, b);
  if (sc.edges.some(([p, q]) => key2(p, q) === k) || sc.aux.some(([p, q]) => key2(p, q) === k)) return sc;
  const n = clone(sc);
  n.aux.push([a, b, part]);
  return n;
}

export function addPointOnSegment(sc: GeoScene, a: string, b: string, t: number, part: number, name?: string): {scene: GeoScene; name: string} {
  const n = clone(sc);
  const nm = name ?? nextName(n);
  addPoint(n, nm, add(n.pts[a], mul(sub(n.pts[b], n.pts[a]), Math.min(0.95, Math.max(0.05, t)))) as V3, part);
  return {scene: n, name: nm};
}

export const addMidpoint = (sc: GeoScene, a: string, b: string, part: number) => addPointOnSegment(sc, a, b, 0.5, part);

/** Chân đường vuông góc hạ từ `p` xuống đường thẳng ab, kèm đoạn nối. */
export function addFoot(sc: GeoScene, p: string, a: string, b: string, part: number): {scene: GeoScene; name: string} {
  const n = clone(sc);
  const nm = nextName(n);
  const P = n.pts[p];
  const A = n.pts[a];
  const d = sub(n.pts[b], A);
  const t = dot(sub(P, A), d) / dot(d, d);
  addPoint(n, nm, add(A, mul(d, t)) as V3, part);
  n.aux.push([p, nm, part]);
  return {scene: n, name: nm};
}

/** Thiết diện qua ba điểm: dùng lại bộ phân tích đề ("thiết diện (MNP)"). */
export function addSection(sc: GeoScene, names: string[], part: number): GeoScene {
  const m = modelFromScene(sc);
  m.cur = part;
  // dùng appendPart rồi gộp về phần hiện tại: đơn giản và nhất quán với câu chữ
  const next = appendPart(sc, `thiết diện của hình cắt bởi mặt phẳng (${names.join('')})`, '·');
  const fixed = clone(next);
  fixed.parts = sc.parts;
  const shift = (x: number) => (x > sc.parts.length - 1 ? part : x);
  for (const k of Object.keys(fixed.ptPart)) fixed.ptPart[k] = shift(fixed.ptPart[k]);
  fixed.aux = fixed.aux.map(([a, b, p]) => [a, b, shift(p)]);
  fixed.polys = fixed.polys.map((p) => ({...p, part: shift(p.part)}));
  void m;
  return fixed;
}

/** Thêm yêu cầu bằng lời thành MỘT PHẦN MỚI của đề. */
export const addRequirement = (sc: GeoScene, text: string) => appendPart(sc, text);

/** Tên đỉnh theo chỉ số hiển thị (phục vụ chọn điểm bằng chạm). */
export function visibleNames(sc: GeoScene, upTo: number): string[] {
  return sc.order.filter((n) => (sc.ptPart[n] ?? 0) <= upTo);
}

// ------------------------------------------------------------------ bố trí hình trên bảng
export interface GeoLayout {
  sketch: NonNullable<ShapeMeta['sketch']>;
  ax: number;
  ay: number;
  w: number;
  h: number;
}

const PAD = 30;

/**
 * Chiếu cảnh đến phần `upTo` và đặt lên bảng với góc gốc của hình gốc tại `origin` (tọa độ bảng).
 * Vị trí tuyệt đối của mọi điểm KHÔNG đổi khi thêm/bớt phần; chỉ khung bao (neo, w, h) co giãn.
 */
export function layoutGeo(sc: GeoScene, upTo: number, origin: {x: number; y: number}): GeoLayout {
  const fig = renderScene(sc, upTo);
  const xs = fig.verts.map((v) => origin.x + v.x);
  const ys = fig.verts.map((v) => origin.y + v.y);
  const ax = Math.min(...xs) - PAD;
  const ay = Math.min(...ys) - PAD;
  const w = Math.max(...xs) - ax + PAD;
  const h = Math.max(...ys) - ay + PAD;
  const names = visibleNames(sc, upTo);
  return {
    ax,
    ay,
    w,
    h,
    sketch: {
      verts: fig.verts.map((v) => ({x: origin.x + v.x - ax, y: origin.y + v.y - ay})),
      edges: fig.edges,
      labels: fig.labels,
      names,
      marks: fig.marks,
      polys: fig.polys,
      fixed: true,
    },
  };
}

// ------------------------------------------------------------------ đo (đơn vị: cạnh a = 1)
/** Độ dài dạng a√k/m khi gọn được, ngược lại số thập phân. */
export function fmtLen(x: number): string {
  if (x < 1e-9) return '0';
  for (const den of [1, 2, 3, 4]) {
    const k = x * x * den * den;
    const kr = Math.round(k);
    if (kr > 0 && kr <= 200 && Math.abs(k - kr) < 1e-6) {
      const root = Math.round(Math.sqrt(kr));
      if (root * root === kr) {
        const num = root === 1 ? 'a' : `${root}a`;
        return den === 1 ? num : `${num}/${den}`;
      }
      return den === 1 ? `a√${kr}` : `a√${kr}/${den}`;
    }
  }
  return `${+x.toFixed(2)}a`;
}

export function measureDistance(sc: GeoScene, a: string, b: string): string {
  const P = sc.pts[a];
  const Q = sc.pts[b];
  if (!P || !Q) return '';
  const d = Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]);
  return `${a}${b} = ${fmtLen(d)} (≈ ${+d.toFixed(3)}a)`;
}

/** Góc ∠(a v c) tại đỉnh v, tính bằng độ. */
export function measureAngle(sc: GeoScene, a: string, v: string, c: string): string {
  const A = sc.pts[a];
  const V = sc.pts[v];
  const C = sc.pts[c];
  if (!A || !V || !C) return '';
  const u = sub(A, V);
  const w = sub(C, V);
  const lu = Math.hypot(u[0], u[1], u[2]);
  const lw = Math.hypot(w[0], w[1], w[2]);
  if (lu < 1e-9 || lw < 1e-9) return '';
  const deg = (Math.acos(Math.max(-1, Math.min(1, dot(u, w) / (lu * lw)))) * 180) / Math.PI;
  return `∠${a}${v}${c} = ${+deg.toFixed(1)}°`;
}

// ------------------------------------------------------------------ xuất mã TikZ (nét đứt theo chuẩn SGK)
export function toTikz(sc: GeoScene, upTo: number): string {
  const fig = renderScene(sc, upTo);
  const S = 50; // px → cm
  const pt = (i: number) => `(${(fig.verts[i].x / S).toFixed(2)},${(-fig.verts[i].y / S).toFixed(2)})`;
  const lines: string[] = ['\\begin{tikzpicture}[line join=round]'];
  fig.verts.forEach((_, i) => lines.push(`  \\coordinate (P${i}) at ${pt(i)};`));
  for (const e of fig.edges) {
    const opt = [e.hidden ? 'dashed' : '', e.aux ? 'blue' : ''].filter(Boolean).join(',');
    lines.push(`  \\draw${opt ? `[${opt}]` : ''} (P${e.a}) -- (P${e.b});`);
  }
  for (const poly of fig.polys) lines.push(`  \\fill[blue,opacity=0.15] ${poly.map((i) => `(P${i})`).join(' -- ')} -- cycle;`);
  fig.labels.forEach((l, i) => {
    if (l) lines.push(`  \\node[above right] at (P${i}) {$${l.replace(/≡/g, '\\equiv ')}$};`);
  });
  lines.push('\\end{tikzpicture}');
  return lines.join('\n');
}

// ------------------------------------------------------------------ nét vẽ tay đã nhận dạng → đề dựng hình (để có đủ dụng cụ của tầng 2)
const fmtDim = (v: number | undefined, d = 2) => `${+(v && v > 0 ? v : d).toFixed(1)}`;

/** Khối nhận dạng từ nét vẽ tay → câu mô tả mà bộ dựng hình hiểu; null nếu chưa có hình dựng tương ứng (bát diện, lăng trụ lục giác…). */
export function problemTextForSolid(kind: string, dims: {a?: number; b?: number; c?: number; h?: number} = {}): string | null {
  switch (kind) {
    case 'cube':
      return "hình lập phương ABCD.A'B'C'D' cạnh a";
    case 'box':
      return `hình hộp chữ nhật ABCD.A'B'C'D' có AB = ${fmtDim(dims.a)}, AD = ${fmtDim(dims.b)}, AA' = ${fmtDim(dims.c)}`;
    case 'pyramid4':
      return 'hình chóp tứ giác đều S.ABCD cạnh đáy a';
    case 'pyramid3':
      return 'tứ diện đều ABCD cạnh a';
    case 'prism3':
      return "lăng trụ tam giác đều ABC.A'B'C' cạnh đáy a";
    default:
      return null;
  }
}

/** Hình phẳng nhận dạng từ nét vẽ tay → câu mô tả. */
export function problemTextForPlane(kind: string): string | null {
  switch (kind) {
    case 'triangle_equilateral':
      return 'tam giác đều ABC';
    case 'triangle_right':
      return 'tam giác ABC vuông tại A';
    case 'triangle_isosceles':
      return 'tam giác ABC cân tại A';
    case 'triangle_scalene':
      return 'tam giác ABC';
    case 'square':
      return 'hình vuông ABCD';
    case 'rectangle':
      return 'hình chữ nhật ABCD';
    case 'parallelogram':
      return 'hình bình hành ABCD';
    default:
      return null;
  }
}

export const geoTitle = (sc: GeoScene) => sc.title;
export {sceneFromModel};
