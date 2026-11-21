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
}
type Role =
  | {k: 'free'}
  | {k: 'center'; ci: number}
  | {k: 'inter'; l1: number; l2: number}
  | {k: 'foot'; p: number; l: number}
  | {k: 'seg'; l: number; t: number; fix?: true}
  | {k: 'tan'; p: number; ci: number; w: 1 | -1}
  | {k: 'refp'; a: number; ci: number}
  | {k: 'onc'; ci: number};

export interface SketchFigure {
  scene: GeoScene;
  /** vị trí trên bảng (px) của từng điểm có tên, theo nét đã vẽ: dùng để đặt hình khít lên chính các nét */
  anchors: Record<string, Pt>;
  /** có dấu hiệu chỉ hình PHẲNG mới có (đường tròn, nét dừng giữa cạnh khác: chân đường cao, trung tuyến…): ưu tiên hơn nhận dạng khối */
  planar: boolean;
}

/** Đường tròn trong một nét (khép kín, đều, cong đều) — cùng tiêu chí với nhận dạng đường tròn đơn. */
function roundOf(pts: Pt[]): Circ | null {
  const f = fitCircle(pts);
  if (!f || f.r < 15 || f.rms > 0.09 * f.r || f.cover < 300) return null;
  return simplify(pts, 0.08 * f.r).length >= 8 ? {c: {x: f.cx, y: f.cy}, r: f.r} : null;
}

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
  for (const s of strokes) {
    const pts = s.points;
    if (pts.length < 2 || pathLen(pts) < 0.04 * D) continue;
    const rc = pts.length >= 6 ? roundOf(pts) : null;
    if (rc) {
      circles.push(rc);
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

  // 2. gộp đầu mút gần nhau thành một điểm
  const ends = segs.flat();
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
  // điểm còn lại sau khi gộp (đỉnh, đầu mút, điểm trên đường)
  const used = new Set(lines.flat());

  // 4. điểm cắt của hai đường (đường chéo, đường cao cắt nhau) chưa có điểm nào ở đó
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
      if ([...used].some((k) => dist(V[k], X) < rr)) continue;
      V.push(X);
      used.add(V.length - 1);
    }

  // 5. đường tròn: tâm có sẵn hay chưa; điểm trên đường tròn
  const centerOf = circles.map((c) => {
    const near = [...used].filter((k) => dist(V[k], c.c) < Math.max(8, Math.min(rr, 0.12 * c.r))).sort((p, q) => dist(V[p], c.c) - dist(V[q], c.c));
    if (near.length) return near[0];
    V.push({...c.c});
    used.add(V.length - 1);
    return V.length - 1;
  });
  const onCirc = (v: number, ci: number) => v !== centerOf[ci] && Math.abs(dist(V[v], circles[ci].c) - circles[ci].r) < Math.max(rr, 0.12 * circles[ci].r);
  const interior = (v: number) =>
    lines
      .map((l, li) => ({l, li}))
      .filter(({l}) => !l.includes(v))
      .filter(({l}) => {
        const o = onLine(V[v], V[l[0]], V[l[1]]);
        return o.t > 0.04 && o.t < 0.96 && o.d < rr;
      })
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
    const inn = interior(v);
    const pair = inn.flatMap((a, i) => inn.slice(i + 1).map((b) => [a, b] as const)).find(([a, b]) => sinAng(dir(a), dir(b)) > 0.15);
    if (pair) {
      role.set(v, {k: 'inter', l1: pair[0], l2: pair[1]});
      continue;
    }
    if (inn.length >= 1) {
      const li = inn[0];
      const [a, b] = lines[li];
      // đoạn từ một điểm P tới v vuông góc với đường ab → v là chân đường vuông góc hạ từ P
      const ps = lines.filter((l) => l.includes(v)).map((l) => (l[0] === v ? l[1] : l[0])).filter((p) => p !== a && p !== b);
      const p = ps.find((q) => sinAng(sub(V[q], V[v]), dir(li)) > Math.sin((81 * Math.PI) / 180));
      if (p !== undefined) role.set(v, {k: 'foot', p, l: li});
      else {
        const t = onLine(V[v], V[a], V[b]).t;
        role.set(v, Math.abs(t - 0.5) < 0.06 ? {k: 'seg', l: li, t: 0.5, fix: true} : {k: 'seg', l: li, t});
      }
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

  // 7. loại đường tròn: ngoại tiếp (≥ 3 điểm tự do trên đó), nội tiếp tam giác, hoặc tâm O qua một điểm / bán kính cố định
  type CircleKind = {f: 'circum'; n: number[]; all: number[]} | {f: 'in'; n: number[]} | {f: 'cp'; q: number} | {f: 'cr'};
  const ring = mainPolygon(V, lines, (v) => role.get(v)?.k === 'free');
  const ckind: CircleKind[] = circles.map((c, ci) => {
    const free = verts.filter((v) => role.get(v)!.k === 'free' && onCirc(v, ci));
    // đường kính: đường qua tâm, hai đầu trên đường tròn → đầu sau là đối xứng của đầu trước qua tâm
    for (const [a, b] of lines) {
      if (free.length >= 3) break;
      if (!free.includes(a) || !free.includes(b) || interior(centerOf[ci]).every((li) => key(...lines[li]) !== key(a, b))) continue;
      role.set(b, {k: 'refp', a, ci});
      free.splice(free.indexOf(b), 1);
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
    if (!name.has(centerOf[ci])) give(centerOf[ci], k.f === 'in' ? ['I', 'O', 'J'] : ['O', 'I', 'J', 'K']);
  });
  const isAltitude = (li: number) => lines[li].some((e) => role.get(e)?.k === 'foot' && lines[li].includes((role.get(e) as {p: number}).p));
  for (const v of verts) {
    if (name.has(v)) continue;
    const r = role.get(v)!;
    give(v, r.k === 'inter' ? (isAltitude(r.l1) && isAltitude(r.l2) ? ['H', 'I', 'K'] : ['I', 'K', 'J']) : r.k === 'seg' && r.fix ? ['M', 'N', 'P'] : []);
  }

  // 9. thứ tự dựng: điểm có công thức đứng sau các điểm nó dựa vào (công thức được tính lại theo đúng thứ tự này)
  const deps = (v: number): number[] => {
    const r = role.get(v)!;
    if (r.k === 'inter') return [...lines[r.l1], ...lines[r.l2]];
    if (r.k === 'foot') return [r.p, ...lines[r.l]];
    if (r.k === 'seg') return [...lines[r.l]];
    if (r.k === 'tan' || r.k === 'onc' || r.k === 'refp') {
      const k = ckind[r.ci];
      return [...(r.k === 'tan' ? [r.p] : r.k === 'refp' ? [r.a] : []), centerOf[r.ci], ...(k.f === 'cp' ? [k.q] : k.f === 'circum' || k.f === 'in' ? k.n : [])];
    }
    if (r.k === 'center') {
      const k = ckind[r.ci];
      return k.f === 'circum' || k.f === 'in' ? k.n : [];
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
  const free = order.filter((v) => role.get(v)!.k === 'free' || (role.get(v)!.k === 'center' && !['circum', 'in'].includes(ckind[(role.get(v) as {ci: number}).ci].f)));
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
    return kd.f === 'cp' ? nm(kd.q) : kd.f === 'circum' || kd.f === 'in' ? nm(kd.n[0]) : '';
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
    else if (r.k === 'refp') defs[n] = {k: 'refp', p: nm(r.a), o: nm(centerOf[r.ci])};
    else if (r.k === 'onc') {
      const O = P(circles[r.ci].c);
      const Q = P(V[v]);
      defs[n] = {k: 'onc', o: nm(centerOf[r.ci]), q: circleRef(r.ci), ang: Math.atan2(Q[1] - O[1], Q[0] - O[0])};
    } else if (r.k === 'tan') {
      const q = circleRef(r.ci);
      defs[n] = q ? {k: 'tan', p: nm(r.p), o: nm(centerOf[r.ci]), q, w: r.w} : {k: 'tan', p: nm(r.p), o: nm(centerOf[r.ci]), q: '', r: circles[r.ci].r * k, w: r.w};
    } else if (r.k === 'center') {
      const kd = ckind[r.ci];
      if (kd.f === 'circum' || kd.f === 'in') defs[n] = {k: 'calc', f: kd.f, n: kd.n.map(nm)};
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
    const of: GeoCircle['of'] = kd.f === 'circum' || kd.f === 'in' ? {f: kd.f, n: kd.n.map(nm)} : kd.f === 'cp' ? {f: 'cp', n: [O, nm(kd.q)]} : {f: 'cr', n: [O]};
    const label = kd.f === 'circum' ? `đường tròn (${O}) ngoại tiếp ${(ring && kd.all.every((v) => ring.includes(v)) ? ring : kd.all).map(nm).join('')}` : kd.f === 'in' ? `đường tròn (${O}) nội tiếp ${kd.n.map(nm).join('')}` : `đường tròn (${O})`;
    return {center: P(c.c), normal: [0, 0, 1], r: c.r * k, part: 0, label, of};
  });
  sc.circles = [...(sc.circles ?? []), ...circs];
  const bits = [ring ? `${POLY[ring.length - 3][0].toUpperCase()}${POLY[ring.length - 3].slice(1)} ${ring.map(nm).join('')}` : '', ...circs.map((c) => c.label)].filter(Boolean);
  sc.title = bits.join(', ') || 'Hình vẽ tay';
  sc.parts = [{label: '', text: sc.title}];
  // điểm tự do thứ tư, thứ năm… trên đường tròn ngoại tiếp: đặt đúng lên đường tròn (vẽ tay chỉ gần đúng) để kéo đỉnh giữ đồng viên
  let out = applyDefs(sc);
  ckind.forEach((kd, ci) => {
    if (kd.f !== 'circum') return;
    const c = out.circles![out.circles!.length - circles.length + ci];
    for (const v of kd.all.slice(3)) {
      const p = out.pts[nm(v)];
      const L = Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) || 1;
      out.pts[nm(v)] = [c.center[0] + ((p[0] - c.center[0]) * c.r) / L, c.center[1] + ((p[1] - c.center[1]) * c.r) / L, 0];
    }
  });
  out = applyDefs(out);
  const anchors: Record<string, Pt> = {};
  for (const v of order) anchors[nm(v)] = {...V[v]};
  const planar = circles.length > 0 || [...role.values()].some((r) => r.k === 'foot' || r.k === 'seg');
  return {scene: out, anchors, planar};
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
