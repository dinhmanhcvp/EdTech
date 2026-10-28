/**
 * Dụng cụ vẽ thêm trên hình dựng từ đề (kiểu các nền tảng vẽ hình): đoạn nối, trung điểm, điểm trên cạnh,
 * chân đường vuông góc, thiết diện, và "thêm yêu cầu" bằng lời. Mọi hàm trả CẢNH MỚI (không sửa cảnh cũ) để hoàn tác được.
 * Điểm/đường mới gắn vào `part` đang hiển thị nên bật/tắt từng phần của đề vẫn đúng.
 */
import {add, dot, mul, sub, type V3} from './solids';
import {appendPart, modelFromScene, partShown, renderScene, sceneFromModel, type GeoScene} from './geometryProblem';
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
  return sc.order.filter((n) => partShown(sc, sc.ptPart[n] ?? 0, upTo));
}

// ------------------------------------------------------------------ bật/tắt từng phần của đề (a, b, c, d…)
/** Phần i có nét vẽ riêng (điểm, đường, thiết diện, đường tròn, điểm trùng)? Phần chỉ là lời đề (không vẽ gì) thì không có nút. */
export function partHasContent(sc: GeoScene, i: number): boolean {
  return (
    Object.entries(sc.ptPart).some(([n, p]) => p === i && sc.order.includes(n)) ||
    sc.aux.some((a) => a[2] === i) ||
    sc.polys.some((p) => p.part === i) ||
    Object.values(sc.mergedPart).some((p) => p === i) ||
    (sc.circles ?? []).some((c) => c.part === i)
  );
}

/** Các phần khác mà phần i dùng điểm của chúng (VD thiết diện (MOD) cần M của phần a và O của phần b). */
export function partDeps(sc: GeoScene, i: number): number[] {
  const used = new Set<string>();
  sc.aux.forEach(([a, b, p]) => {
    if (p === i) {
      used.add(a);
      used.add(b);
    }
  });
  sc.polys.forEach((poly) => {
    if (poly.part === i) poly.names.forEach((n) => used.add(n));
  });
  Object.entries(sc.merged).forEach(([orig, aliases]) => {
    if (aliases.some((al) => sc.mergedPart[al] === i)) used.add(orig);
  });
  // điểm được nhắc trong lời của phần (VD "mặt phẳng (MOD)" cần M ở phần a và O ở phần b dù thiết diện chỉ có các đỉnh gốc)
  for (const tok of sc.parts[i]?.text.match(/(?<![\p{L}'])(?:[A-Z]'?){1,6}(?![\p{L}'])/gu) ?? []) {
    for (const n of tok.match(/[A-Z]'?/g) ?? []) if (sc.pts[n] !== undefined) used.add(n);
  }
  const deps = new Set<number>();
  used.forEach((n) => {
    const p = sc.ptPart[n] ?? 0;
    if (p !== 0 && p !== i) deps.add(p);
  });
  return [...deps];
}

const closureDeps = (sc: GeoScene, i: number, seen = new Set<number>()): Set<number> => {
  for (const d of partDeps(sc, i)) if (!seen.has(d)) closureDeps(sc, d, seen.add(d));
  return seen;
};

export interface PartChip {
  index: number;
  label: string;
  text: string;
  shown: boolean;
}

/** Các nút a, b, c… của hình (bỏ phần 0 và các phần không vẽ gì). */
export function partChips(sc: GeoScene): PartChip[] {
  const hidden = new Set(sc.hiddenParts ?? []);
  return sc.parts
    .map((p, i) => ({index: i, label: p.label, text: p.text, shown: !hidden.has(i)}))
    .filter((c) => c.index > 0 && partHasContent(sc, c.index));
}

/** Bật phần i (kéo theo các phần nó cần) hoặc tắt (kéo theo các phần cần nó). Các nét khác giữ nguyên, không vẽ lại hình. */
export function setPartShown(sc: GeoScene, i: number, show: boolean): GeoScene {
  const hidden = new Set(sc.hiddenParts ?? []);
  if (show) {
    hidden.delete(i);
    closureDeps(sc, i).forEach((d) => hidden.delete(d));
  } else {
    hidden.add(i);
    sc.parts.forEach((_, k) => {
      if (k !== i && k > 0 && closureDeps(sc, k).has(i)) hidden.add(k);
    });
  }
  return {...sc, hiddenParts: [...hidden].sort((a, b) => a - b)};
}

export const togglePart = (sc: GeoScene, i: number) => setPartShown(sc, i, (sc.hiddenParts ?? []).includes(i));

/** Chỉ hiện các phần 0..k (kiểu cũ: vẽ đến hết phần k). */
export const showUpTo = (sc: GeoScene, k: number): GeoScene => ({...sc, hiddenParts: sc.parts.map((_, i) => i).filter((i) => i > k)});

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
  const curvePts = fig.curves.flatMap((c) => c.pts);
  const xs = [...fig.verts, ...curvePts].map((v) => origin.x + v.x);
  const ys = [...fig.verts, ...curvePts].map((v) => origin.y + v.y);
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
      names: sc.net && sc.net > 0 ? [] : names,
      marks: fig.marks,
      polys: fig.polys,
      faces: fig.faces,
      curves: fig.curves.map((c) => ({label: c.label, dashed: c.dashed, own: c.own, pts: c.pts.map((p) => ({x: origin.x + p.x - ax, y: origin.y + p.y - ay}))})),
      fixed: true,
    },
  };
}

/** Cảnh `b` có thêm điểm/đường/thiết diện/đường tròn/trùng so với `a` không (để biết yêu cầu bằng lời có được hiểu). */
export const sceneGrew = (a: GeoScene, b: GeoScene) => {
  const n = (s: GeoScene) => s.order.length + s.aux.length + s.polys.length + Object.keys(s.merged).length + (s.circles?.length ?? 0);
  return n(b) > n(a);
};

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


// ------------------------------------------------------------------ đo nâng cao: khoảng cách, góc đường–mặt, nhị diện, thể tích, diện tích
const PI = Math.PI;
const cleanNum = (x: number) => `${+x.toFixed(3)}`.replace('.', ',');

/** Số dạng đẹp: p·√k/q (q ≤ 12) nếu khớp, kèm giá trị thập phân. */
export function fmtQuantity(x: number, unit: string, withPi = false): string {
  const u = withPi ? `π${unit ? ' ' + unit : ''}`.trim() : unit;
  const val = withPi ? x / PI : x;
  const tail = `${u ? ' ' + u : ''}`;
  for (let q = 1; q <= 12; q++) {
    for (const k of [1, 2, 3, 5, 6, 7]) {
      const p = (val * q) / Math.sqrt(k);
      const pr = Math.round(p);
      if (pr >= 1 && pr <= 80 && Math.abs(p - pr) < 1e-7) {
        const root = k === 1 ? '' : `√${k}`;
        const num = k === 1 ? `${pr}` : pr === 1 ? root : `${pr}${root}`;
        const form = q === 1 ? num : `${num}/${q}`;
        return `${form}${tail} (≈ ${cleanNum(x)})`;
      }
    }
  }
  return `${cleanNum(val)}${tail}`;
}

const P3 = (sc: GeoScene, n: string): V3 | null => (sc.pts[n] as V3 | undefined) ?? null;
const lenV = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const crossV = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Khoảng cách từ điểm p đến mặt phẳng (a, b, c). */
export function measureDistPointPlane(sc: GeoScene, p: string, a: string, b: string, c: string): string {
  const [P, A, B, C] = [P3(sc, p), P3(sc, a), P3(sc, b), P3(sc, c)];
  if (!P || !A || !B || !C) return '';
  const n = crossV(sub(B, A), sub(C, A));
  const nl = lenV(n);
  if (nl < 1e-9) return `Ba điểm ${a}${b}${c} thẳng hàng, không xác định mặt phẳng`;
  const d = Math.abs(dot(n, sub(P, A))) / nl;
  return `d(${p}, (${a}${b}${c})) = ${fmtQuantity(d, 'a')}`;
}

/** Khoảng cách từ điểm p đến đường thẳng ab. */
export function measureDistPointLine(sc: GeoScene, p: string, a: string, b: string): string {
  const [P, A, B] = [P3(sc, p), P3(sc, a), P3(sc, b)];
  if (!P || !A || !B) return '';
  const d = sub(B, A);
  if (lenV(d) < 1e-9) return '';
  const dist = lenV(crossV(sub(P, A), d)) / lenV(d);
  return `d(${p}, ${a}${b}) = ${fmtQuantity(dist, 'a')}`;
}

/** Góc giữa đường thẳng ab và mặt phẳng (c, d, e), tính bằng độ. */
export function measureAngleLinePlane(sc: GeoScene, a: string, b: string, c: string, d: string, e: string): string {
  const [A, B, C, D, E] = [P3(sc, a), P3(sc, b), P3(sc, c), P3(sc, d), P3(sc, e)];
  if (!A || !B || !C || !D || !E) return '';
  const u = sub(B, A);
  const n = crossV(sub(D, C), sub(E, C));
  if (lenV(u) < 1e-9 || lenV(n) < 1e-9) return '';
  const s = Math.abs(dot(u, n)) / (lenV(u) * lenV(n));
  const deg = (Math.asin(Math.min(1, s)) * 180) / PI;
  return `(${a}${b}, (${c}${d}${e})) = ${+deg.toFixed(1)}°`;
}

/** Góc nhị diện theo cạnh ab, với c ở mặt thứ nhất và d ở mặt thứ hai (góc giữa hai đường vuông góc với cạnh). */
export function measureDihedral(sc: GeoScene, a: string, b: string, c: string, d: string): string {
  const [A, B, C, D] = [P3(sc, a), P3(sc, b), P3(sc, c), P3(sc, d)];
  if (!A || !B || !C || !D) return '';
  const e = sub(B, A);
  const el = lenV(e);
  if (el < 1e-9) return '';
  const k: V3 = [e[0] / el, e[1] / el, e[2] / el];
  const perp = (X: V3): V3 => {
    const w = sub(X, A);
    return sub(w, mul(k, dot(w, k)));
  };
  const v1 = perp(C);
  const v2 = perp(D);
  if (lenV(v1) < 1e-9 || lenV(v2) < 1e-9) return 'Điểm nằm trên đường thẳng của cạnh, không xác định mặt';
  const deg = (Math.acos(Math.max(-1, Math.min(1, dot(v1, v2) / (lenV(v1) * lenV(v2))))) * 180) / PI;
  return `Nhị diện [${c}, ${a}${b}, ${d}] = ${+deg.toFixed(1)}°`;
}

/** Thể tích và diện tích của khối đang vẽ (đơn vị a, a²: a³). Khối tròn xoay tính theo công thức. */
export function solidStats(sc: GeoScene): string {
  const circles = (sc.circles ?? []).filter((c) => c.own);
  if (sc.title === 'Hình cầu' && circles[0]) {
    const r = circles[0].r;
    return `Mặt cầu bán kính ${cleanNum(r)}a: V = ${fmtQuantity((4 / 3) * PI * r ** 3, 'a³', true)}; S = ${fmtQuantity(4 * PI * r * r, 'a²', true)}`;
  }
  if (sc.title === 'Hình nón' && circles[0]) {
    const apex = sc.order.find((n) => (sc.pts[n] as V3)[1] > 1e-9 && Math.abs((sc.pts[n] as V3)[0]) < 1e-9);
    const h = apex ? (sc.pts[apex] as V3)[1] : 0;
    const r = circles[0].r;
    const l = Math.hypot(r, h);
    return `Hình nón r = ${cleanNum(r)}a, h = ${cleanNum(h)}a, l = ${cleanNum(l)}a: V = ${fmtQuantity((PI * r * r * h) / 3, 'a³', true)}; Sxq = ${fmtQuantity(PI * r * l, 'a²', true)}; Stp = ${fmtQuantity(PI * r * l + PI * r * r, 'a²', true)}`;
  }
  if (sc.title === 'Hình trụ' && circles[0]) {
    const top = circles.find((c) => c.center[1] > 1e-9);
    const h = top ? top.center[1] : 0;
    const r = circles[0].r;
    return `Hình trụ r = ${cleanNum(r)}a, h = ${cleanNum(h)}a: V = ${fmtQuantity(PI * r * r * h, 'a³', true)}; Sxq = ${fmtQuantity(2 * PI * r * h, 'a²', true)}; Stp = ${fmtQuantity(2 * PI * r * h + 2 * PI * r * r, 'a²', true)}`;
  }
  if (sc.dim !== 3 || sc.faces.length < 4) return 'Chỉ tính được thể tích với khối đa diện, hình nón, hình trụ, hình cầu';
  const faces = sc.faces.filter((f) => f.every((n) => !!sc.pts[n]));
  const all = [...new Set(faces.flat())].map((n) => sc.pts[n] as V3);
  const center = mul(all.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / all.length);
  const area = (f: string[]) => {
    let s: V3 = [0, 0, 0];
    const ps = f.map((n) => sc.pts[n] as V3);
    for (let i = 0; i < ps.length; i++) s = add(s, crossV(ps[i], ps[(i + 1) % ps.length]));
    return lenV(s) / 2;
  };
  let vol = 0;
  const areas = faces.map(area);
  faces.forEach((f, i) => {
    const ps = f.map((n) => sc.pts[n] as V3);
    const nrm = crossV(sub(ps[1], ps[0]), sub(ps[2], ps[0]));
    const nl = lenV(nrm);
    if (nl > 1e-12) vol += (areas[i] * Math.abs(dot(nrm, sub(center, ps[0])))) / nl / 3;
  });
  const total = areas.reduce((s, x) => s + x, 0);
  const base = areas[0];
  // lăng trụ/hộp: có mặt đối song song, cùng diện tích với đáy
  const n0 = crossV(sub(sc.pts[faces[0][1]] as V3, sc.pts[faces[0][0]] as V3), sub(sc.pts[faces[0][2]] as V3, sc.pts[faces[0][0]] as V3));
  const hasTop = faces.some((f, i) => {
    if (i === 0 || Math.abs(areas[i] - base) > 1e-7) return false;
    const n = crossV(sub(sc.pts[f[1]] as V3, sc.pts[f[0]] as V3), sub(sc.pts[f[2]] as V3, sc.pts[f[0]] as V3));
    return lenV(crossV(n0, n)) < 1e-7 * lenV(n0) * lenV(n);
  });
  const sxq = total - base - (hasTop ? base : 0);
  return `V = ${fmtQuantity(vol, 'a³')}; Sđáy = ${fmtQuantity(base, 'a²')}; Sxq = ${fmtQuantity(sxq, 'a²')}; Stp = ${fmtQuantity(total, 'a²')}`;
}

export const geoTitle = (sc: GeoScene) => sc.title;
export {sceneFromModel};
