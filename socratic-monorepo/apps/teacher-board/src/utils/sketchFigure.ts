// apps/teacher-board/src/utils/sketchFigure.ts
/**
 * Hình GHÉP vẽ tay (cả hình của một bài: tam giác + đường cao + trực tâm, đường tròn ngoại tiếp, tiếp tuyến, tứ giác nội tiếp có đường chéo…)
 * → MỘT cảnh GeoScene có công thức, đặt đúng chỗ chính các nét đã vẽ.
 *  nét → đoạn thẳng / đường tròn → gộp đầu mút gần nhau thành điểm chung, nối hai nét cùng một đường, điểm cắt nhau
 *  → quan hệ của từng điểm: chân đường vuông góc, trung điểm, điểm trên cạnh, giao điểm, tiếp điểm, đầu kia đường kính, tâm
 *  → điểm tự do + điểm có công thức (GeoDef) như hình dựng từ đề: kéo đỉnh gốc thì mọi tính chất vẫn giữ.
 * Thuần tính toán (không React/DOM).
 */
import {fitCircle, simplify, dropFlatCorners, type SketchPt, type SketchStrokeLike} from './sketchSolid';
import {buildScene, renderScene, type GeoCircle, type GeoDef, type GeoScene} from './geometryProblem';
import {applyDefs} from './geoTools';
import type {V3} from './solids';

type Pt = SketchPt;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLen = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1], q) : 0), 0);
const sub = (a: Pt, b: Pt) => ({x: a.x - b.x, y: a.y - b.y});
const crossZ = (u: Pt, v: Pt) => u.x * v.y - u.y * v.x;
const dotP = (u: Pt, v: Pt) => u.x * v.x + u.y * v.y;
/** |sin| góc giữa hai hướng */
const sinAng = (u: Pt, v: Pt) => Math.abs(crossZ(u, v)) / ((Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) || 1);
/** tham số t của hình chiếu p lên ab và khoảng cách tới đường ab */
const onLine = (p: Pt, a: Pt, b: Pt) => {
  const d = sub(b, a);
  const L2 = dotP(d, d) || 1;
  return {t: dotP(sub(p, a), d) / L2, d: Math.abs(crossZ(d, sub(p, a))) / Math.sqrt(L2)};
};

interface Circ {
  c: Pt;
  r: number;
  /** nét CUNG (không khép kín): hai đầu và một điểm giữa cung (tọa độ bảng) */
  arc?: {a: Pt; b: Pt; mid: Pt};
}
type Role =
  | {k: 'free'}
  | {k: 'center'; ci: number}
  | {k: 'inter'; l1: number; l2: number}
  | {k: 'foot'; p: number; l: number}
  | {k: 'seg'; l: number; t: number; fix?: true}
  | {k: 'tan'; p: number; ci: number; w: 1 | -1}
  | {k: 'onc'; ci: number}
  /** cát tuyến: giao (gần / xa theo hướng a→b) của đường thẳng ab với đường tròn */
  | {k: 'sec'; ci: number; a: number; b: number; w: 1 | 2}
  /** giao điểm còn lại của đường thẳng qua a và điểm b (b đã nằm trên đường tròn) */
  | {k: 'secx'; ci: number; a: number; b: number}
  /** giao của tiếp tuyến tại t với đường thẳng cd ("tiếp tuyến tại A cắt CD tại S") */
  | {k: 'tanx'; ci: number; t: number; c: number; d: number}
  /** giao của hai đường tròn c1, c2; w = ±1: bên trái / phải hướng tâm c1 → tâm c2 (nhìn như toán) */
  | {k: 'ccx'; c1: number; c2: number; w: 1 | -1};

export interface SketchFigure {
  scene: GeoScene;
  /** vị trí trên bảng (px) của từng điểm có tên, theo nét đã vẽ: dùng để đặt hình khít lên chính các nét */
  anchors: Record<string, Pt>;
  /** có dấu hiệu chỉ hình PHẲNG mới có (đường tròn, nét dừng giữa cạnh khác: chân đường cao, trung tuyến…): ưu tiên hơn nhận dạng khối */
  planar: boolean;
  /** tứ giác lồi có hai đường chéo cắt nhau (không có đường tròn thì dễ lẫn với tứ diện vẽ không nét khuất) */
  quadDiag: boolean;
}

/** Đường tròn trong một nét (khép kín, đều, cong đều) — cùng tiêu chí với nhận dạng đường tròn đơn. */
function roundOf(pts: Pt[]): Circ | null {
  const f = fitCircle(pts);
  if (!f || f.r < 15 || f.rms > 0.09 * f.r || f.cover < 300) return null;
  return simplify(pts, 0.08 * f.r).length >= 8 ? {c: {x: f.cx, y: f.cy}, r: f.r} : null;
}

/**
 * Nét CUNG tròn (nửa đường tròn, cung có tâm): khớp đường tròn tốt, phủ 60°–300°, cong rõ (đỉnh cung cách dây ≥ 15% dây — cạnh vẽ hơi phồng
 * không bị coi là cung), cong đều không có góc gãy (nét chữ V hai cạnh thẳng không phải cung).
 */
function arcOf(pts: Pt[], D: number): Circ | null {
  if (pts.length < 8) return null;
  const f = fitCircle(pts);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const chord = dist(a, b);
  if (!f || f.r < 15 || f.r > 2.5 * D || f.rms > 0.05 * f.r || f.cover < 60 || f.cover >= 300 || chord < 0.12 * D) return null;
  const mid = pts.reduce((m, p) => (onLine(p, a, b).d > onLine(m, a, b).d ? p : m), pts[0]);
  if (onLine(mid, a, b).d < 0.15 * chord) return null;
  const poly = simplify(pts, 0.012 * D);
  for (let i = 1; i < poly.length - 1; i++) if (sinAng(sub(poly[i], poly[i - 1]), sub(poly[i + 1], poly[i])) > Math.sin((45 * Math.PI) / 180) || dotP(sub(poly[i], poly[i - 1]), sub(poly[i + 1], poly[i])) < 0) return null;
  return {c: {x: f.cx, y: f.cy}, r: f.r, arc: {a, b, mid}};
}

/** góc theo hướng toán (y lên) của p nhìn từ tâm c */
const angMath = (p: Pt, c: Pt) => Math.atan2(-(p.y - c.y), p.x - c.x);

const POOL = 'ABCDEFGKLMNPQRSTUVXYZ'.split('');

/**
 * Nhận dạng hình ghép từ các nét (tọa độ bảng, y hướng xuống). null khi không đủ chất liệu (ít hơn 2 thành phần) hoặc có nét cong không phải đường tròn.
 */
export function sketchFigure(strokes: SketchStrokeLike[]): SketchFigure | null {
  const all = strokes.flatMap((s) => s.points);
  if (all.length < 6) return null;
  const [x0, x1, y0, y1] = [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x)), Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y))];
  const D = Math.hypot(x1 - x0, y1 - y0);
  if (D < 60) return null;
  const rr = Math.max(10, 0.06 * D);

  // 1. nét → đường tròn hoặc các đoạn thẳng
  const circles: Circ[] = [];
  const segs: [Pt, Pt][] = [];
  const curvy: Pt[][] = [];
  const arcs: {c: Circ; pts: Pt[]}[] = [];
  for (const s of strokes) {
    const pts = s.points;
    if (pts.length < 2 || pathLen(pts) < 0.04 * D) continue;
    const rc = pts.length >= 6 ? roundOf(pts) : null;
    if (rc) {
      circles.push(rc);
      continue;
    }
    const ac = arcOf(pts, D);
    if (ac) {
      arcs.push({c: ac, pts});
      continue;
    }
    const chord = dist(pts[0], pts[pts.length - 1]);
    if (pts.length >= 6 && pathLen(pts) > 1.25 * chord && simplify(pts, (0.04 * pathLen(pts)) / 3).length >= 5) curvy.push(pts);
    const poly = simplify(pts, 0.03 * D);
    // cạnh vẽ hơi cong bị bẻ thành hai đoạn: bỏ "góc" gần bẹt giữa nét (không đụng hai đầu nét)
    const inner = poly.slice(1, -1);
    const kept = [poly[0], ...inner.filter((p, i) => {
      const a = i === 0 ? poly[0] : inner[i - 1];
      const b = poly[i + 2];
      return sinAng(sub(p, a), sub(b, p)) > Math.sin((28 * Math.PI) / 180) || dotP(sub(p, a), sub(b, p)) < 0;
    }), poly[poly.length - 1]];
    for (let i = 1; i < kept.length; i++) if (dist(kept[i - 1], kept[i]) >= 0.04 * D) segs.push([kept[i - 1], kept[i]]);
  }
  // các cung cùng một đường tròn mà ghép lại đủ vòng: là đường tròn vẽ nhấc bút giữa chừng; còn lại là cung thật
  for (let i = 0; i < arcs.length; i++) {
    const same = arcs.filter((o) => dist(o.c.c, arcs[i].c.c) < 0.2 * arcs[i].c.r && Math.abs(o.c.r - arcs[i].c.r) < 0.2 * arcs[i].c.r);
    const rc = same.length >= 2 ? roundOf(same.flatMap((o) => o.pts)) : null;
    if (!rc) continue;
    circles.push(rc);
    for (const o of same) arcs.splice(arcs.indexOf(o), 1);
    i = -1;
  }
  circles.push(...arcs.map((o) => o.c));
  // đường tròn vẽ bằng vài cung (nhấc bút giữa chừng)
  if (curvy.length >= 2) {
    const rc = roundOf(curvy.flat());
    if (rc) {
      circles.push(rc);
      const set = new Set(curvy.flat());
      for (let i = segs.length - 1; i >= 0; i--) if (set.has(segs[i][0]) || set.has(segs[i][1])) segs.splice(i, 1);
    }
  }
  if (circles.length + segs.length < 2 || segs.length > 40) return null;

  // 2. gộp đầu mút gần nhau thành một điểm (cả hai đầu của nét cung)
  const arcCi = circles.map((c, ci) => (c.arc ? ci : -1)).filter((ci) => ci >= 0);
  const ends = [...segs.flat(), ...arcCi.flatMap((ci) => [circles[ci].arc!.a, circles[ci].arc!.b])];
  const parent = ends.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) if (dist(ends[i], ends[j]) < rr) parent[find(i)] = find(j);
  const roots = [...new Set(ends.map((_, i) => find(i)))];
  const V: Pt[] = roots.map((r) => {
    const g = ends.filter((_, i) => find(i) === r);
    return {x: g.reduce((s, p) => s + p.x, 0) / g.length, y: g.reduce((s, p) => s + p.y, 0) / g.length};
  });
  const vOf = (i: number) => roots.indexOf(find(i));
  let lines: [number, number][] = [];
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const addLine = (a: number, b: number) => {
    if (a !== b && !lines.some(([p, q]) => key(p, q) === key(a, b))) lines.push([a, b]);
  };
  segs.forEach((_, i) => addLine(vOf(2 * i), vOf(2 * i + 1)));

  // 3. hai đoạn cùng một đường thẳng nối nhau tại một điểm → một đường (điểm đó nằm trên đường nếu còn đoạn khác tới nó, không thì bỏ)
  for (let guard = 0; guard < 60; guard++) {
    let did = false;
    for (let v = 0; v < V.length && !did; v++) {
      const inc = lines.filter((l) => l.includes(v));
      for (let i = 0; i < inc.length && !did; i++)
        for (let j = i + 1; j < inc.length && !did; j++) {
          const a = inc[i][0] === v ? inc[i][1] : inc[i][0];
          const b = inc[j][0] === v ? inc[j][1] : inc[j][0];
          if (a === b || dotP(sub(V[a], V[v]), sub(V[b], V[v])) >= 0 || sinAng(sub(V[a], V[v]), sub(V[b], V[v])) > 0.2) continue;
          lines = lines.filter((l) => l !== inc[i] && l !== inc[j]);
          addLine(a, b);
          did = true;
        }
    }
    if (!did) break;
  }
  // hai đầu của mỗi cung (theo chỉ số đường tròn)
  const arcEnds = new Map<number, [number, number]>(arcCi.map((ci, k) => [ci, [vOf(2 * segs.length + 2 * k), vOf(2 * segs.length + 2 * k + 1)]]));
  // điểm còn lại sau khi gộp (đỉnh, đầu mút, điểm trên đường, đầu cung)
  const used = new Set([...lines.flat(), ...[...arcEnds.values()].flat()]);

  // 4. điểm cắt của hai đường (đường chéo, đường cao cắt nhau) chưa có điểm nào ở đó; nhớ cặp đường tạo ra nó
  const dup = Math.max(8, 0.5 * rr); // chỉ coi là "đã có điểm" khi rất gần (đầu mút lệch tay), không nuốt giao điểm gần tâm/đỉnh khác
  const crossOf = new Map<number, [number, number]>();
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const [a, b] = lines[i];
      const [c, d] = lines[j];
      if (new Set([a, b, c, d]).size < 4) continue;
      const u = sub(V[b], V[a]);
      const w = sub(V[d], V[c]);
      const den = crossZ(u, w);
      if (Math.abs(den) < 0.1 * Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y)) continue;
      const s = crossZ(sub(V[c], V[a]), w) / den;
      const t = crossZ(sub(V[c], V[a]), u) / den;
      if (s < 0.04 || s > 0.96 || t < 0.04 || t > 0.96) continue;
      const X = {x: V[a].x + u.x * s, y: V[a].y + u.y * s};
      if ([...used].some((k) => dist(V[k], X) < dup)) continue;
      V.push(X);
      used.add(V.length - 1);
      crossOf.set(V.length - 1, [i, j]);
    }

  // 5. đường tròn: tâm có sẵn hay chưa; điểm trên đường tròn
  const centerOf = circles.map((c) => {
    // giao điểm hai đường chỉ là tâm khi trùng rất sát (hình chữ nhật nội tiếp); đầu mút (bán kính vẽ tới tâm) được lệch nhiều hơn
    const near = [...used].filter((k) => dist(V[k], c.c) < (crossOf.has(k) ? Math.max(8, 0.06 * c.r) : Math.max(8, Math.min(rr, 0.12 * c.r)))).sort((p, q) => dist(V[p], c.c) - dist(V[q], c.c));
    if (near.length) return near[0];
    V.push({...c.c});
    used.add(V.length - 1);
    return V.length - 1;
  });
  // cát tuyến vẽ một nét xuyên qua đường tròn: chỗ cắt chưa có điểm thì thêm (khi đường đi XUYÊN qua: cả hai giao ở giữa nét, hoặc một giao
  // ở giữa nét và giao kia đúng ở đầu nét). Đoạn từ tâm ra ngoài (OM) hay dây cung thì không thêm.
  circles.forEach((c) => {
    if (c.arc) return;
    for (const [a, b] of [...lines]) {
      const d = sub(V[b], V[a]);
      const f = sub(V[a], c.c);
      const A2 = dotP(d, d);
      const B2 = 2 * dotP(f, d);
      const disc = B2 * B2 - 4 * A2 * (dotP(f, f) - c.r * c.r);
      if (disc <= 0) continue;
      const ts = [(-B2 - Math.sqrt(disc)) / (2 * A2), (-B2 + Math.sqrt(disc)) / (2 * A2)];
      const L = Math.sqrt(A2);
      if ((ts[1] - ts[0]) * L < 2 * rr) continue; // gần tiếp xúc
      const inside = ts.map((t) => t > 0.04 && t < 0.96);
      const atEnd = ts.map((t) => Math.min(Math.abs(t), Math.abs(t - 1)) * L < rr);
      if (!((inside[0] && inside[1]) || (inside[0] && atEnd[1]) || (inside[1] && atEnd[0]))) continue;
      ts.forEach((t, i) => {
        if (!inside[i]) return;
        const X = {x: V[a].x + d.x * t, y: V[a].y + d.y * t};
        if ([...used].some((k) => dist(V[k], X) < dup)) return;
        V.push(X);
        used.add(V.length - 1);
      });
    }
  });
  // hai đường tròn cắt nhau: hai giao điểm (đã có điểm vẽ ở đó — đầu dây chung — thì dùng điểm đó)
  const ccAt = new Map<number, {a: number; b: number; w: 1 | -1}>();
  circles.forEach((c1, i) =>
    circles.forEach((c2, j) => {
      if (j <= i || c1.arc || c2.arc) return;
      const d = dist(c1.c, c2.c);
      if (d < 1e-6 || d > c1.r + c2.r - 0.5 * rr || d < Math.abs(c1.r - c2.r) + 0.5 * rr) return; // rời nhau / gần tiếp xúc
      const a = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d);
      const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
      const u = {x: (c2.c.x - c1.c.x) / d, y: (c2.c.y - c1.c.y) / d};
      for (const sg of [1, -1]) {
        const X = {x: c1.c.x + u.x * a - u.y * h * sg, y: c1.c.y + u.y * a + u.x * h * sg};
        let v = [...used].filter((k) => !centerOf.includes(k)).sort((p, q) => dist(V[p], X) - dist(V[q], X)).find((k) => dist(V[k], X) < rr);
        if (v === undefined) {
          V.push(X);
          used.add((v = V.length - 1));
        }
        // y bảng hướng xuống: tích có hướng âm ở đây = bên trái khi nhìn như toán
        ccAt.set(v, {a: i, b: j, w: crossZ(sub(c2.c, c1.c), sub(X, c1.c)) < 0 ? 1 : -1});
      }
    }),
  );
  const onCirc = (v: number, ci: number) => v !== centerOf[ci] && Math.abs(dist(V[v], circles[ci].c) - circles[ci].r) < Math.max(rr, 0.12 * circles[ci].r);
  const interior = (v: number) =>
    lines
      .map((l, li) => ({l, li}))
      .filter(({l}) => !l.includes(v))
      .filter(({l}) => {
        const o = onLine(V[v], V[l[0]], V[l[1]]);
        return o.t > 0.04 && o.t < 0.96 && o.d < Math.max(10, 0.5 * rr); // chạm giữa đường: lệch tay vài px, không nhận đường đi ngang gần đó
      })
      .sort((p, q) => onLine(V[v], V[p.l[0]], V[p.l[1]]).d - onLine(V[v], V[q.l[0]], V[q.l[1]]).d) // đường sát điểm nhất trước
      .map(({li}) => li);
  const dir = (li: number) => sub(V[lines[li][1]], V[lines[li][0]]);

  // 6. quan hệ của từng điểm
  const verts = [...used].sort((p, q) => p - q);
  const role = new Map<number, Role>();
  for (const v of verts) {
    const ci = centerOf.indexOf(v);
    if (ci >= 0) {
      role.set(v, {k: 'center', ci});
      continue;
    }
    const cc = ccAt.get(v);
    // đỉnh của hình (nối tới điểm khác ngoài tâm và giao kia) nằm trên cả hai đường tròn: giữ tự do, hai đường tròn sẽ dựng đi qua nó
    const structural = lines.some((l) => l.includes(v) && !centerOf.includes(l[0] === v ? l[1] : l[0]) && !ccAt.has(l[0] === v ? l[1] : l[0]));
    if (cc && !structural) {
      role.set(v, {k: 'ccx', c1: cc.a, c2: cc.b, w: cc.w});
      continue;
    }
    const inn = interior(v);
    // giao điểm do chính hai đường cắt nhau tạo ra: dùng đúng hai đường đó (đường khác đi sát qua không đổi định nghĩa)
    const pair = crossOf.get(v) ?? inn.flatMap((a, i) => inn.slice(i + 1).map((b) => [a, b] as const)).find(([a, b]) => sinAng(dir(a), dir(b)) > 0.15);
    if (pair) {
      // đường cao kéo dài tới đường tròn ("AD cắt (O) tại K"): hai đường vuông góc, một đường có đầu chỉ chạm đường tròn → v là chân đường vuông góc
      const ext = ([[pair[0], pair[1]], [pair[1], pair[0]]] as const)
        .map(([l1, l2]) => {
          if (sinAng(dir(l1), dir(l2)) < Math.sin((84 * Math.PI) / 180)) return null; // chặt hơn chân đường cao thường: cát tuyến tình cờ gần vuông không bị bắt
          const tip = lines[l1].find((x) => lines.filter((l) => l.includes(x)).length === 1 && circles.some((c, ci) => !c.arc && onCirc(x, ci)));
          return tip === undefined ? null : {p: lines[l1][0] === tip ? lines[l1][1] : lines[l1][0], l: l2};
        })
        .find((x) => x);
      role.set(v, ext ? {k: 'foot', p: ext.p, l: ext.l} : {k: 'inter', l1: pair[0], l2: pair[1]});
      continue;
    }
    if (inn.length >= 1) {
      const li = inn[0];
      const [a, b] = lines[li];
      // đoạn từ một điểm P tới v vuông góc với đường ab → v là chân đường vuông góc hạ từ P
      const ps = lines.filter((l) => l.includes(v)).map((l) => (l[0] === v ? l[1] : l[0])).filter((p) => p !== a && p !== b);
      const p = ps.find((q) => sinAng(sub(V[q], V[v]), dir(li)) > Math.sin((81 * Math.PI) / 180));
      const t = onLine(V[v], V[a], V[b]).t;
      // vừa gần trung điểm vừa gần vuông góc (tam giác gần cân): chọn cái khớp sát hơn so với ngưỡng của nó
      const angErr = p === undefined ? Infinity : Math.abs(dotP(sub(V[p], V[v]), dir(li))) / (Math.hypot(sub(V[p], V[v]).x, sub(V[p], V[v]).y) * Math.hypot(dir(li).x, dir(li).y)) / Math.sin((9 * Math.PI) / 180);
      const midErr = Math.abs(t - 0.5) / 0.06;
      // kẻ từ TÂM đường tròn: chân đường vuông góc luôn đúng (tiếp điểm; với dây cung thì cũng là trung điểm)
      if (p !== undefined && (angErr <= midErr || centerOf.includes(p))) role.set(v, {k: 'foot', p, l: li});
      else role.set(v, midErr < 1 ? {k: 'seg', l: li, t: 0.5, fix: true} : {k: 'seg', l: li, t});
      continue;
    }
    // tiếp điểm: v trên đường tròn, đoạn vP từ điểm P ngoài đường tròn vuông góc bán kính
    const tan = circles
      .map((c, ci) => ({c, ci}))
      .filter(({ci}) => onCirc(v, ci))
      .flatMap(({c, ci}) =>
        lines
          .filter((l) => l.includes(v))
          .map((l) => (l[0] === v ? l[1] : l[0]))
          .filter((p) => dist(V[p], c.c) > 1.15 * c.r && sinAng(sub(c.c, V[v]), sub(V[p], V[v])) > Math.sin((78 * Math.PI) / 180))
          .map((p) => ({p, ci})),
      )[0];
    if (tan) {
      const c = circles[tan.ci].c;
      // trong hai tiếp tuyến từ P, chọn bên người vẽ (y bảng hướng xuống → đổi dấu khi về tọa độ toán)
      const side = crossZ(sub(V[tan.p], c), sub(V[v], c)) < 0 ? 1 : -1;
      role.set(v, {k: 'tan', p: tan.p, ci: tan.ci, w: side as 1 | -1});
      continue;
    }
    role.set(v, {k: 'free'});
  }

  // 6a. "tiếp tuyến tại T cắt đường CD tại S": S nằm trên một đường khác đi qua hai điểm của hình → T là điểm của đường tròn, S là giao (không phải
  // T là tiếp điểm kẻ từ S). Điểm trên đường CD kéo dài (D giữa C và S) thôi là điểm trượt, thành điểm của hình.
  const onLineOf = (li: number) => verts.filter((x) => lines[li].includes(x) || interior(x).includes(li));
  for (const v of verts) {
    const r = role.get(v)!;
    if (r.k !== 'tan') continue;
    const p = r.p;
    const tl = lines.findIndex((l) => l.includes(v) && l.includes(p));
    const li = lines.findIndex((l, i) => i !== tl && (l.includes(p) || interior(p).includes(i)) && onLineOf(i).filter((x) => x !== p && x !== v).length >= 2);
    if (li < 0) continue;
    const defs2 = onLineOf(li).filter((x) => x !== p && x !== v).sort((a, b) => +!lines[li].includes(a) - +!lines[li].includes(b));
    const [c, d] = defs2;
    if ([c, d].some((x) => role.get(x)!.k !== 'free' && !(role.get(x)!.k === 'seg' && (role.get(x) as {l: number}).l === li))) continue;
    for (const x of [c, d]) if (role.get(x)!.k === 'seg') role.set(x, {k: 'free'});
    role.set(p, {k: 'tanx', ci: r.ci, t: v, c, d});
    role.set(v, {k: 'free'});
  }

  // 6b. cát tuyến: điểm vừa trên đường thẳng vừa trên đường tròn = giao của đường đó với đường tròn (có công thức), không phải điểm trượt trên đoạn
  const roleDeps = (v: number): number[] => {
    const r = role.get(v)!;
    return r.k === 'inter' ? [...lines[r.l1], ...lines[r.l2]] : r.k === 'foot' ? [r.p, ...lines[r.l]] : r.k === 'seg' ? [...lines[r.l]] : r.k === 'tanx' ? [r.t, r.c, r.d] : [];
  };
  const fixedRole = (v: number) => ['tan', 'tanx', 'center', 'sec', 'secx', 'onc', 'ccx'].includes(role.get(v)!.k);
  circles.forEach((c, ci) => {
    if (c.arc) return;
    lines.forEach(([a, b], li) => {
      const onL = verts.filter((v) => v === a || v === b || interior(v).includes(li));
      // chỉ điểm còn "trượt" (tự do / trên đoạn); chân đường vuông góc, giao hai đường… đã có định nghĩa mạnh hơn (tiếp điểm đường tròn nội tiếp)
      const C = onL.filter((v) => onCirc(v, ci) && !fixedRole(v) && ['free', 'seg'].includes(role.get(v)!.k));
      if (!C.length) return;
      // đường gần tiếp xúc (cạnh tam giác ngoài đường tròn nội tiếp): không phải cát tuyến
      {
        const d = sub(V[b], V[a]);
        const f = sub(V[a], c.c);
        const A2 = dotP(d, d);
        const B2 = 2 * dotP(f, d);
        const disc = B2 * B2 - 4 * A2 * (dotP(f, f) - c.r * c.r);
        if (disc <= 0 || (Math.sqrt(disc) / A2) * Math.sqrt(A2) < 2 * rr) return;
      }
      const deg = (x: number) => lines.filter((l) => l.includes(x)).length;
      // điểm được đổi thành giao: nằm giữa đường, hoặc là đầu nét "cụt" chỉ chạm đường tròn (không phải đỉnh của hình)
      const defining = (exclude: number[]) => onL.filter((v) => !onCirc(v, ci) && role.get(v)!.k !== 'center' && !roleDeps(v).some((d) => exclude.includes(d))).sort((p, q) => +(p !== a && p !== b) - +(q !== a && q !== b));
      const isEnd = (v: number) => v === a || v === b;
      const movable = (v: number) => !isEnd(v) || deg(v) === 1;
      // một giao đã là điểm của hình (đầu nét, thường là đỉnh): giao còn lại = "giao điểm thứ hai" của đường qua điểm kia
      if (C.length === 2 && C.some(isEnd) && C.some(movable)) {
        const keep = [...C].sort((p, q) => +movable(p) - +movable(q) || +isEnd(q) - +isEnd(p) || deg(q) - deg(p))[0];
        const other = C.find((x) => x !== keep)!;
        const N = defining([other]);
        if (N.length) {
          role.set(other, {k: 'secx', ci, a: N[0], b: keep});
          if (role.get(keep)!.k === 'seg') role.set(keep, {k: 'free'});
          return;
        }
      }
      const N = defining(C);
      if (N.length < 2) return;
      const [p, q] = [N[0], N[1]];
      // hai giao theo hướng p→q: w = 1 giao gần p, 2 giao xa
      const d = sub(V[q], V[p]);
      const f = sub(V[p], c.c);
      const A2 = dotP(d, d);
      const B2 = 2 * dotP(f, d);
      const disc = B2 * B2 - 4 * A2 * (dotP(f, f) - c.r * c.r);
      if (disc <= 0) return;
      const tMid = -B2 / (2 * A2);
      for (const x of C.filter(movable)) role.set(x, {k: 'sec', ci, a: p, b: q, w: dotP(sub(V[x], V[p]), d) / A2 <= tMid ? 1 : 2});
    });
  });

  // 7. loại đường tròn: ngoại tiếp (≥ 3 điểm tự do trên đó), nội tiếp tam giác, hoặc tâm O qua một điểm / bán kính cố định
  type CircleKind = {f: 'circum'; n: number[]; all: number[]} | {f: 'in'; n: number[]} | {f: 'cp'; q: number} | {f: 'cr'} | {f: 'semi' | 'sector' | 'diam'; s: number; e: number};
  const ring = mainPolygon(V, lines, (v) => role.get(v)?.k === 'free');
  const TAU = 2 * Math.PI;
  const ckind: CircleKind[] = circles.map((c, ci) => {
    const free = verts.filter((v) => role.get(v)!.k === 'free' && onCirc(v, ci));
    const ends = arcEnds.get(ci);
    if (c.arc && ends) {
      // cung vẽ từ s ngược chiều kim đồng hồ (nhìn như toán) tới e, đi qua điểm giữa nét
      let [s, e] = ends;
      const a0 = angMath(V[s], c.c);
      if ((angMath(c.arc.mid, c.c) - a0 + 2 * TAU) % TAU > (angMath(V[e], c.c) - a0 + 2 * TAU) % TAU) [s, e] = [e, s];
      const O = centerOf[ci];
      // nửa đường tròn: tâm ở trung điểm hai đầu cung (đường kính vẽ hay không cũng vậy)
      const semi = dist(V[O], {x: (V[s].x + V[e].x) / 2, y: (V[s].y + V[e].y) / 2}) < Math.max(rr, 0.12 * c.r);
      if (!semi && role.get(e)!.k === 'free') role.set(e, {k: 'onc', ci});
      free.filter((v) => v !== s && v !== e).forEach((v) => role.set(v, {k: 'onc', ci}));
      return {f: semi ? 'semi' : 'sector', s, e};
    }
    // đường kính: đường qua tâm, hai đầu trên đường tròn → "đường tròn đường kính AB" (tâm là trung điểm, hai đầu kéo tự do)
    if (free.length < 3) {
      const dm = lines.find(([a, b]) => free.includes(a) && free.includes(b) && interior(centerOf[ci]).some((li) => key(...lines[li]) === key(a, b)));
      if (dm) {
        free.filter((v) => !dm.includes(v)).forEach((v) => role.set(v, {k: 'onc', ci}));
        return {f: 'diam', s: dm[0], e: dm[1]};
      }
    }
    if (free.length >= 3) return {f: 'circum', n: free.slice(0, 3), all: free};
    if (ring?.length === 3 && ring.every((v, i) => {
      const o = onLine(c.c, V[v], V[ring[(i + 1) % 3]]);
      return Math.abs(o.d - c.r) < 0.18 * c.r;
    })) return {f: 'in', n: ring};
    if (free.length) {
      free.slice(1).forEach((v) => role.set(v, {k: 'onc', ci}));
      return {f: 'cp', q: free[0]};
    }
    return {f: 'cr'};
  });

  // 8. tên điểm: đa giác chính A, B, C… (ngược chiều kim đồng hồ từ đỉnh cao nhất), tâm O, giao các đường cao H, giao khác I
  const name = new Map<number, string>();
  const taken = new Set<string>();
  const give = (v: number, prefer: string[]) => {
    const nm = [...prefer, ...POOL].find((x) => !taken.has(x)) ?? `P${v}`;
    name.set(v, nm);
    taken.add(nm);
  };
  ring?.forEach((v) => give(v, []));
  ckind.forEach((k, ci) => {
    if (!name.has(centerOf[ci])) give(centerOf[ci], k.f === 'in' ? ['I', 'O', 'J'] : ['O', "O'", 'I', 'J', 'K']);
  });
  // đường cao: đi qua đỉnh p và chân đường vuông góc hạ từ p (chân là đầu nét hay nằm giữa đường kéo dài)
  const isAltitude = (li: number) => verts.some((x) => {
    const r = role.get(x)!;
    return r.k === 'foot' && !!ring?.includes(r.p) && lines[li].includes(r.p) && (lines[li].includes(x) || interior(x).includes(li));
  });
  // chỗ hai đường tình cờ cắt nhau (trung tuyến cắt đường cao…) vẫn là điểm của hình nhưng ẩn tên; hiện tên khi là điểm đề hay gọi:
  // ≥ 3 đường đồng quy, giao hai đường cao, hai đường vuông góc, giao hai đường chéo của đa giác khung, giao nằm trên đường tròn
  const diag = (li: number) => {
    if (!ring || !lines[li].every((x) => ring.includes(x))) return false;
    const d = Math.abs(ring.indexOf(lines[li][0]) - ring.indexOf(lines[li][1]));
    return d !== 1 && d !== ring.length - 1;
  };
  /** đường thứ ba trở đi đi (gần) qua giao điểm v theo nét vẽ */
  const extraThrough = (v: number) => {
    const [l1, l2] = crossOf.get(v)!;
    return lines.map((l, li) => ({l, li})).filter(({l, li}) => li !== l1 && li !== l2 && (l.includes(v) || (interior(v).includes(li) && onLine(V[v], V[l[0]], V[l[1]]).d < Math.max(6, 0.3 * rr))));
  };
  /** lí do hiện tên không dựa vào "trông như đồng quy" */
  const namedStrict = (v: number) => {
    const [l1, l2] = crossOf.get(v)!;
    return (isAltitude(l1) && isAltitude(l2)) || (isMedian(l1) && isMedian(l2)) || sinAng(dir(l1), dir(l2)) > Math.sin((81 * Math.PI) / 180) || (diag(l1) && diag(l2)) || circles.some((_, ci) => onCirc(v, ci));
  };
  const namedCross = (v: number) => namedStrict(v) || extraThrough(v).length > 0;
  // trung tuyến: từ một đỉnh tới trung điểm cạnh đối
  const isMedian = (li: number) => lines[li].some((x) => {
    const r = role.get(x)!;
    return r.k === 'seg' && !!r.fix && !!ring?.includes(lines[li][0] === x ? lines[li][1] : lines[li][0]);
  });
  // chân đường cao đặt tên theo thứ tự đỉnh (từ A → D, từ B → E, từ C → F), rồi mới tới các điểm khác
  const rank = (v: number) => {
    const r = role.get(v)!;
    return r.k === 'foot' && ring?.includes(r.p) ? ring.indexOf(r.p) : 99;
  };
  for (const v of [...verts].sort((a, b) => rank(a) - rank(b) || a - b)) {
    if (name.has(v)) continue;
    const r = role.get(v)!;
    const minor = r.k === 'inter' && crossOf.has(v) && !namedCross(v);
    // trung điểm (cả chân đường vuông góc hạ từ tâm xuống dây) M, N; giao thứ hai với đường tròn K, N
    const midLike = (r.k === 'seg' && r.fix) || (r.k === 'foot' && centerOf.includes(r.p));
    give(v, minor ? ['X', 'Y', 'Z', 'U', 'V', 'T'] : r.k === 'inter' ? ((isAltitude(r.l1) && isAltitude(r.l2)) || (!(diag(r.l1) && diag(r.l2)) && sinAng(dir(r.l1), dir(r.l2)) > Math.sin((84 * Math.PI) / 180)) ? ['H', 'I', 'K'] : isMedian(r.l1) && isMedian(r.l2) ? ['G', 'I', 'K'] : ['I', 'K', 'J']) : midLike ? ['M', 'N', 'P'] : r.k === 'secx' || r.k === 'sec' ? ['K', 'N', 'P', 'Q'] : []);
  }

  // 9. thứ tự dựng: điểm có công thức đứng sau các điểm nó dựa vào (công thức được tính lại theo đúng thứ tự này)
  /** điểm mà đường tròn thứ ci dựa vào (tâm + điểm cho bán kính) */
  const circDeps = (ci: number): number[] => {
    const k = ckind[ci];
    return [centerOf[ci], ...(k.f === 'cp' ? [k.q] : k.f === 'circum' || k.f === 'in' ? k.n : k.f === 'semi' || k.f === 'sector' || k.f === 'diam' ? [k.s] : [])];
  };
  const deps = (v: number): number[] => {
    const r = role.get(v)!;
    if (r.k === 'inter') return [...lines[r.l1], ...lines[r.l2]];
    if (r.k === 'foot') return [r.p, ...lines[r.l]];
    if (r.k === 'seg') return [...lines[r.l]];
    if (r.k === 'tan') return [r.p, ...circDeps(r.ci)];
    if (r.k === 'onc') return circDeps(r.ci);
    if (r.k === 'sec' || r.k === 'secx') return [r.a, r.b, ...circDeps(r.ci)];
    if (r.k === 'tanx') return [r.t, r.c, r.d, ...circDeps(r.ci)];
    if (r.k === 'ccx') return [...circDeps(r.c1), ...circDeps(r.c2)];
    if (r.k === 'center') {
      const k = ckind[r.ci];
      return k.f === 'circum' || k.f === 'in' ? k.n : k.f === 'semi' || k.f === 'diam' ? [k.s, k.e] : [];
    }
    return [];
  };
  const order: number[] = [];
  for (let guard = 0; order.length < verts.length && guard < 200; guard++) {
    const next = verts.find((v) => !order.includes(v) && deps(v).every((d) => d !== v && order.includes(d)));
    if (next !== undefined) order.push(next);
    else {
      // phụ thuộc vòng (hình vẽ mâu thuẫn): điểm đầu tiên chưa dựng được thành điểm tự do
      const stuck = verts.find((v) => !order.includes(v))!;
      role.set(stuck, {k: 'free'});
    }
  }

  // 10. dựng cảnh: tọa độ toán (y hướng lên), cạnh dài nhất của khung = 4 đơn vị
  const k = 4 / Math.max(x1 - x0, y1 - y0, 1);
  const P = (p: Pt): V3 => [+((p.x - x0) * k).toFixed(4), +((y1 - p.y) * k).toFixed(4), 0];
  const nm = (v: number) => name.get(v)!;
  const ln = (li: number) => lines[li].map(nm) as [string, string];
  const free = order.filter((v) => role.get(v)!.k === 'free' || (role.get(v)!.k === 'center' && !['circum', 'in', 'semi', 'diam'].includes(ckind[(role.get(v) as {ci: number}).ci].f)));
  const fmt = (v: number) => `${nm(v)}(${P(V[v]).slice(0, 2).join(';')})`;
  const POLY = ['tam giác', 'tứ giác', 'ngũ giác', 'lục giác', 'thất giác', 'bát giác'];
  const base = ring ? `${POLY[ring.length - 3]} ${ring.map(nm).join('')}, ${ring.map(fmt).join(', ')}` : free.slice(0, 2).map(fmt).join(', ');
  const sc0 = base ? buildScene(base).scene : null;
  if (!sc0) return null;
  const sc: GeoScene = JSON.parse(JSON.stringify(sc0));
  const defs: Record<string, GeoDef> = {...(sc.defs ?? {})};
  const loose = new Set(sc.loose ?? []);
  const circleRef = (ci: number) => {
    const kd = ckind[ci];
    return kd.f === 'cp' ? nm(kd.q) : kd.f === 'circum' || kd.f === 'in' ? nm(kd.n[0]) : kd.f === 'semi' || kd.f === 'sector' || kd.f === 'diam' ? nm(kd.s) : '';
  };
  for (const v of order) {
    const n = nm(v);
    if (!sc.pts[n]) {
      sc.pts[n] = P(V[v]);
      sc.order.push(n);
      sc.marks.push(n);
      sc.ptPart[n] = 0;
    }
    const r = role.get(v)!;
    if (r.k === 'inter') defs[n] = {k: 'inter', a: ln(r.l1)[0], b: ln(r.l1)[1], c: ln(r.l2)[0], d: ln(r.l2)[1]};
    else if (r.k === 'foot') defs[n] = {k: 'foot', p: nm(r.p), a: ln(r.l)[0], b: ln(r.l)[1]};
    else if (r.k === 'seg') defs[n] = r.fix ? {k: 'seg', a: ln(r.l)[0], b: ln(r.l)[1], t: 0.5, fix: true} : {k: 'seg', a: ln(r.l)[0], b: ln(r.l)[1], t: Math.min(0.95, Math.max(0.05, r.t))};
    else if (r.k === 'onc') {
      const O = P(circles[r.ci].c);
      const Q = P(V[v]);
      defs[n] = {k: 'onc', o: nm(centerOf[r.ci]), q: circleRef(r.ci), ang: Math.atan2(Q[1] - O[1], Q[0] - O[0])};
    } else if (r.k === 'tan') {
      const q = circleRef(r.ci);
      defs[n] = q ? {k: 'tan', p: nm(r.p), o: nm(centerOf[r.ci]), q, w: r.w} : {k: 'tan', p: nm(r.p), o: nm(centerOf[r.ci]), q: '', r: circles[r.ci].r * k, w: r.w};
    } else if (r.k === 'tanx') {
      defs[n] = {k: 'tanx', o: nm(centerOf[r.ci]), t: nm(r.t), c: nm(r.c), d: nm(r.d)};
    } else if (r.k === 'ccx') {
      const [q1, q2] = [circleRef(r.c1), circleRef(r.c2)];
      defs[n] = {k: 'ccx', o1: nm(centerOf[r.c1]), q1, ...(q1 ? {} : {r1: circles[r.c1].r * k}), o2: nm(centerOf[r.c2]), q2, ...(q2 ? {} : {r2: circles[r.c2].r * k}), w: r.w};
    } else if (r.k === 'sec' || r.k === 'secx') {
      const q = circleRef(r.ci);
      const circ = q ? {o: nm(centerOf[r.ci]), q} : {o: nm(centerOf[r.ci]), q: '', r: circles[r.ci].r * k};
      defs[n] = r.k === 'sec' ? {k: 'lcint', ...circ, a: nm(r.a), b: nm(r.b), deg: 0, w: r.w} : {k: 'lcx', ...circ, a: nm(r.a), b: nm(r.b), ex: nm(r.b)};
    } else if (r.k === 'center') {
      const kd = ckind[r.ci];
      if (kd.f === 'circum' || kd.f === 'in') defs[n] = {k: 'calc', f: kd.f, n: kd.n.map(nm)};
      else if (kd.f === 'semi' || kd.f === 'diam') defs[n] = {k: 'calc', f: 'mid', n: [nm(kd.s), nm(kd.e)]};
    }
    if (!defs[n] && !ring?.includes(v) && !Object.values(defs).some((d) => d.k === 'tan' && d.p === n)) loose.add(n);
  }
  // điểm tự do vẽ thêm (điểm ngoài đường tròn, đầu đoạn tự do) kéo được; điểm có công thức thì không
  for (const n of Object.keys(defs)) loose.delete(n);
  sc.defs = defs;
  if (loose.size) sc.loose = [...loose];
  const edgeKeys = new Set(sc.edges.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)));
  for (const [a, b] of lines) {
    const [p, q] = [nm(a), nm(b)];
    if (!edgeKeys.has(p < q ? `${p}|${q}` : `${q}|${p}`)) sc.aux.push([p, q, 0]);
  }
  const circs: GeoCircle[] = circles.map((c, ci) => {
    const kd = ckind[ci];
    const O = nm(centerOf[ci]);
    const of: GeoCircle['of'] =
      kd.f === 'circum' || kd.f === 'in' ? {f: kd.f, n: kd.n.map(nm)} : kd.f === 'cp' ? {f: 'cp', n: [O, nm(kd.q)]} : kd.f === 'semi' || kd.f === 'diam' ? {f: kd.f, n: [nm(kd.s), nm(kd.e)]} : kd.f === 'sector' ? {f: 'sector', n: [O, nm(kd.s), nm(kd.e)]} : {f: 'cr', n: [O]};
    const label =
      kd.f === 'circum'
        ? `đường tròn (${O}) ngoại tiếp ${(ring && kd.all.every((v) => ring.includes(v)) ? ring : kd.all).map(nm).join('')}`
        : kd.f === 'in'
          ? `đường tròn (${O}) nội tiếp ${kd.n.map(nm).join('')}`
          : kd.f === 'semi' || kd.f === 'diam'
            ? `${kd.f === 'semi' ? 'nửa ' : ''}đường tròn đường kính ${nm(kd.s)}${nm(kd.e)}`
            : kd.f === 'sector'
              ? `cung ${nm(kd.s)}${nm(kd.e)} tâm ${O}`
              : `đường tròn (${O})`;
    return {center: P(c.c), normal: [0, 0, 1], r: c.r * k, part: 0, label, of};
  });
  sc.circles = [...(sc.circles ?? []), ...circs];
  const bits = [ring ? `${POLY[ring.length - 3][0].toUpperCase()}${POLY[ring.length - 3].slice(1)} ${ring.map(nm).join('')}` : '', ...circs.map((c) => c.label)].filter(Boolean);
  sc.title = bits.join(', ') || 'Hình vẽ tay';
  sc.parts = [{label: '', text: sc.title}];
  // điểm tự do thứ tư, thứ năm… trên đường tròn ngoại tiếp: đặt đúng lên đường tròn (vẽ tay chỉ gần đúng) để kéo đỉnh giữ đồng viên
  const settle = (s0: GeoScene): GeoScene => {
    const o = applyDefs(s0);
    ckind.forEach((kd, ci) => {
      if (kd.f !== 'circum') return;
      const c = o.circles![o.circles!.length - circles.length + ci];
      for (const v of kd.all.slice(3)) {
        const p = o.pts[nm(v)];
        const L = Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) || 1;
        o.pts[nm(v)] = [c.center[0] + ((p[0] - c.center[0]) * c.r) / L, c.center[1] + ((p[1] - c.center[1]) * c.r) / L, 0];
      }
    });
    return applyDefs(o);
  };
  let out = settle(sc);
  // khớp nét: nét tay không thỏa đúng các ràng buộc, nên điểm suy ra (giao ở xa, giao thứ hai…) lệch khỏi chỗ vẽ. Nhích nhẹ các điểm tự do
  // (dò từng trục, bước giảm dần) để TỔNG độ lệch của mọi điểm so với nét nhỏ nhất; ràng buộc vẫn đúng tuyệt đối vì điểm suy ra tính lại theo công thức
  const target = new Map(order.map((v) => [nm(v), P(V[v])] as const));
  const err = (s: GeoScene) => [...target].reduce((e, [n, t]) => e + (s.pts[n] ? (s.pts[n][0] - t[0]) ** 2 + (s.pts[n][1] - t[1]) ** 2 : 0), 0);
  const tunable = out.order.filter((n) => !out.defs?.[n] && target.has(n));
  let best = err(out);
  for (let step = 0.04, it = 0; step > 2e-4 && it < 60; it++) {
    let improved = false;
    for (const n of tunable)
      for (const ax of [0, 1])
        for (const sg of [1, -1]) {
          const moved = [...out.pts[n]] as V3;
          moved[ax] += sg * step;
          const cand = settle({...out, pts: {...out.pts, [n]: moved}});
          const e = err(cand);
          if (e < best - 1e-12 && Object.values(cand.pts).every((p) => p.every(Number.isFinite))) {
            best = e;
            out = cand;
            improved = true;
          }
        }
    if (!improved) step /= 2;
  }
  // giao trông như đồng quy với đường thứ ba nhưng trên hình dựng KHÔNG đồng quy thật (tâm O nằm sát trung tuyến…): chỉ là chỗ cắt tình cờ → ẩn tên
  const exactOn = (v: number, l: [number, number]) => {
    const [A, B, X] = [out.pts[nm(l[0])], out.pts[nm(l[1])], out.pts[nm(v)]];
    return Math.abs((B[0] - A[0]) * (X[1] - A[1]) - (B[1] - A[1]) * (X[0] - A[0])) <= 1e-6 * (Math.hypot(B[0] - A[0], B[1] - A[1]) * Math.hypot(X[0] - A[0], X[1] - A[1]) || 1);
  };
  for (const v of crossOf.keys()) {
    if (role.get(v)!.k !== 'inter') continue;
    if (!namedStrict(v) && !extraThrough(v).some(({l}) => l.includes(v) || exactOn(v, l))) out.hiddenLabels = [...(out.hiddenLabels ?? []), nm(v)];
  }
  const anchors: Record<string, Pt> = {};
  for (const v of order) anchors[nm(v)] = {...V[v]};
  const planar = circles.length > 0 || [...role.values()].some((r) => r.k === 'foot' || r.k === 'seg');
  // tứ giác lồi có hai đường chéo cắt nhau: hình phẳng, trừ khi người vẽ có nét đứt (nét khuất của tứ diện) — nơi gọi kiểm nét đứt
  const quadDiag = ring?.length === 4 && [...crossOf.values()].some(([l1, l2]) => diag(l1) && diag(l2));
  return {scene: out, anchors, planar, quadDiag};
}

/**
 * Có đường NÉT ĐỨT không (≥ 3 gạch ngắn, thẳng, cùng hướng, nối tiếp nhau trên một đường): dấu hiệu nét khuất của hình khối.
 * Chữ nhãn (nét gấp), dấu bằng nhau, vạch đánh dấu cạnh (gạch song song đứng cạnh nhau) không tính.
 */
export function hasDashedLine(ink: SketchStrokeLike[]): boolean {
  const all = ink.flatMap((s) => s.points);
  if (all.length < 6) return false;
  const span = Math.hypot(Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.y)) - Math.min(...all.map((p) => p.y)));
  const dashes = ink
    .filter((s) => s.points.length >= 2)
    .map((s) => ({a: s.points[0], b: s.points[s.points.length - 1], len: pathLen(s.points)}))
    .filter((d) => d.len >= 0.012 * span && d.len <= 0.1 * span && d.len <= 1.2 * dist(d.a, d.b))
    .map((d) => ({...d, m: {x: (d.a.x + d.b.x) / 2, y: (d.a.y + d.b.y) / 2}, u: sub(d.b, d.a)}));
  for (const d of dashes) {
    const along = dashes.filter((e) => {
      if (e === d || sinAng(e.u, d.u) > 0.26) return false;
      const o = onLine(e.m, d.a, d.b);
      // cùng một đường (lệch ngang nhỏ) và nằm NỐI TIẾP theo hướng gạch (không đứng song song cạnh nhau)
      return o.d < 0.03 * span && Math.abs(o.t - 0.5) * dist(d.a, d.b) > 0.6 * d.len;
    });
    if (along.length >= 2) return true;
  }
  return false;
}

/**
 * Đa giác "khung" của hình: chu trình có diện tích lớn nhất (3–8 đỉnh) đi theo các đường nối hai điểm tự do; tên đặt ngược chiều
 * kim đồng hồ (nhìn như toán, y lên) bắt đầu từ đỉnh cao nhất. null nếu không có chu trình.
 */
function mainPolygon(V: Pt[], lines: [number, number][], ok: (v: number) => boolean): number[] | null {
  const adj = new Map<number, number[]>();
  for (const [a, b] of lines) {
    if (!ok(a) || !ok(b)) continue;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const area = (c: number[]) => c.reduce((s, v, i) => s + crossZ(V[v], V[c[(i + 1) % c.length]]), 0) / 2;
  let best: number[] | null = null;
  const nodes = [...adj.keys()];
  if (nodes.length > 14) return null;
  const walk = (path: number[]) => {
    const last = path[path.length - 1];
    for (const n of adj.get(last) ?? []) {
      if (n === path[0] && path.length >= 3) {
        if (!best || Math.abs(area(path)) > Math.abs(area(best))) best = [...path];
      } else if (!path.includes(n) && n > path[0] && path.length < 8) walk([...path, n]);
    }
  };
  for (const s of nodes) walk([s]);
  if (!best) return null;
  let ring: number[] = best;
  // y bảng hướng xuống: diện tích có hướng âm ở đây = ngược chiều kim đồng hồ khi nhìn như toán
  if (area(ring) > 0) ring = [...ring].reverse();
  const top = ring.reduce((t, v, i) => (V[v].y < V[ring[t]].y - 1e-6 || (Math.abs(V[v].y - V[ring[t]].y) < 1e-6 && V[v].x < V[ring[t]].x) ? i : t), 0);
  return [...ring.slice(top), ...ring.slice(0, top)];
}

/**
 * Đặt cảnh khít lên chính các nét đã vẽ: chọn tỉ lệ khung và góc đặt sao cho mỗi điểm có tên nằm đúng chỗ nét (bình phương tối thiểu).
 * Trả cảnh đã chỉnh tỉ lệ + góc gốc (tọa độ bảng) cho bố trí hình.
 */
export function placeOnInk(sc: GeoScene, anchors: Record<string, Pt>): {scene: GeoScene; origin: Pt} {
  const pairs = (s: GeoScene) => {
    const f = renderScene(s);
    return s.order.map((n, i) => ({a: anchors[n], v: f.verts[i]})).filter((p) => p.a && p.v);
  };
  let ps = pairs(sc);
  if (ps.length === 0) return {scene: sc, origin: {x: 0, y: 0}};
  const mean = (xs: Pt[]) => ({x: xs.reduce((s, p) => s + p.x, 0) / xs.length, y: xs.reduce((s, p) => s + p.y, 0) / xs.length});
  const [ma, mv] = [mean(ps.map((p) => p.a)), mean(ps.map((p) => p.v))];
  const sa = ps.reduce((s, p) => s + dist(p.a, ma), 0);
  const sv = ps.reduce((s, p) => s + dist(p.v, mv), 0);
  const scene = sv > 1e-6 && sa > 1e-6 ? {...sc, view: {...sc.view, k: (sc.view.k || 1) * (sa / sv)}} : sc;
  ps = pairs(scene);
  const off = mean(ps.map((p) => sub(p.a, p.v)));
  return {scene, origin: off};
}

// shortcut: chưa nhận cung tròn lẻ, elip, đường thẳng kéo dài vô hạn, đường tròn đi qua giao của đường và đường tròn (cát tuyến) — các nét đó thành đoạn thẳng hoặc làm hình trả null; nâng cấp khi giáo viên cần các hình đó.
