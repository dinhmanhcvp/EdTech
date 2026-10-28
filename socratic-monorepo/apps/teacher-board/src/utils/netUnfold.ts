/**
 * Khai triển khối đa diện thành lưới phẳng (và gấp lại), theo tham số t ∈ [0, 1]: 0 = khối, 1 = lưới phẳng.
 * Mỗi mặt quay quanh cạnh chung với mặt cha (cây khung các mặt, gốc là mặt đáy) một góc t·θ; góc θ được chọn sao cho ở t = 1
 * mặt nằm cùng mặt phẳng với mặt cha và ở phía bên kia của cạnh chung. Các phép quay lồng nhau theo cây nên hình luôn liền khối.
 */
import {add, cross, dot, len, mul, norm, sub, type V3} from './solids';
import type {GeoScene} from './geometryProblem';

export interface NetFace {
  names: string[];
  /** tọa độ 3D của các đỉnh mặt tại thời điểm t */
  pts: V3[];
  /** pháp tuyến hướng ra ngoài tại thời điểm t */
  normal: V3;
}

export interface NetState {
  faces: NetFace[];
  /** tâm và bán kính của lưới phẳng hoàn toàn (t = 1): để khung nhìn co giãn theo */
  flatCenter: V3;
  flatRadius: number;
  /** pháp tuyến ngoài của mặt gốc (t = 0): máy ảnh nhìn thẳng vào đây khi lưới đã phẳng */
  rootNormal: V3;
  solidCenter: V3;
}

const centroid = (ps: V3[]): V3 => mul(ps.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / Math.max(1, ps.length));

function rotAbout(p: V3, a: V3, k: V3, ang: number): V3 {
  const v = sub(p, a);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return add(a, add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))));
}

/** cạnh chung (hai đỉnh liền nhau ở cả hai mặt) hoặc null */
function sharedEdge(f: string[], g: string[]): [string, string] | null {
  for (let i = 0; i < f.length; i++) {
    const a = f[i];
    const b = f[(i + 1) % f.length];
    const ia = g.indexOf(a);
    const ib = g.indexOf(b);
    if (ia >= 0 && ib >= 0 && (Math.abs(ia - ib) === 1 || Math.abs(ia - ib) === g.length - 1)) return [a, b];
  }
  return null;
}

export function canUnfold(sc: GeoScene): boolean {
  return sc.dim === 3 && sc.faces.length >= 4;
}

type Tx = (p: V3) => V3;

/** Trạng thái các mặt tại thời điểm t, hoặc null nếu hình không khai triển được (không đủ mặt, mặt rời nhau). */
export function unfoldNet(sc: GeoScene, t: number): NetState | null {
  if (!canUnfold(sc)) return null;
  const P = (n: string) => sc.pts[n];
  const faces = sc.faces.filter((f) => f.every((n) => !!P(n)));
  if (faces.length < 4) return null;
  const solidCenter = centroid(Object.entries(sc.pts).filter(([n]) => (sc.ptPart[n] ?? 0) === 0 && faces.some((f) => f.includes(n))).map(([, p]) => p));

  // cây khung theo chiều rộng, gốc là mặt đầu tiên (mặt đáy)
  const parent: (number | null)[] = faces.map(() => null);
  const hinge: ([string, string] | null)[] = faces.map(() => null);
  const order: number[] = [0];
  const seen = new Set<number>([0]);
  for (let h = 0; h < order.length; h++) {
    const i = order[h];
    for (let j = 0; j < faces.length; j++) {
      if (seen.has(j)) continue;
      const e = sharedEdge(faces[i], faces[j]);
      if (!e) continue;
      seen.add(j);
      parent[j] = i;
      hinge[j] = e;
      order.push(j);
    }
  }
  if (seen.size !== faces.length) return null;

  const outward = faces.map((f) => {
    const ps = f.map(P);
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < ps.length; i++) n = add(n, cross(ps[i], ps[(i + 1) % ps.length]));
    n = norm(n);
    return dot(n, sub(centroid(ps), solidCenter)) < 0 ? mul(n, -1) : n;
  });

  // góc gập θ_j của từng mặt (không phụ thuộc t): đưa mặt về cùng mặt phẳng với mặt cha, phía bên kia cạnh chung
  const theta: number[] = faces.map(() => 0);
  const axis: {a: V3; k: V3}[] = faces.map(() => ({a: [0, 0, 0] as V3, k: [1, 0, 0] as V3}));
  for (const j of order) {
    const p = parent[j];
    const hg = hinge[j];
    if (p === null || !hg) continue;
    const A = P(hg[0]);
    const k = norm(sub(P(hg[1]), A));
    axis[j] = {a: A, k};
    const perp = (x: V3) => {
      const w = sub(x, A);
      return sub(w, mul(k, dot(w, k)));
    };
    const wc = perp(centroid(faces[j].map(P)));
    const up = norm(perp(centroid(faces[p].map(P))));
    const target = mul(up, -len(wc));
    theta[j] = Math.atan2(dot(k, cross(wc, target)), dot(wc, target));
  }

  const build = (tt: number) => {
    const tx: Tx[] = [];
    const out: NetFace[] = new Array(faces.length);
    for (const j of order) {
      const p = parent[j];
      if (p === null) tx[j] = (x) => x;
      else {
        const parentTx = tx[p];
        const {a, k} = axis[j];
        const ang = theta[j] * tt;
        tx[j] = (x) => parentTx(rotAbout(x, a, k, ang));
      }
      const pts = faces[j].map((n) => tx[j](P(n)));
      let nrm: V3 = [0, 0, 0];
      for (let i = 0; i < pts.length; i++) nrm = add(nrm, cross(pts[i], pts[(i + 1) % pts.length]));
      nrm = norm(nrm);
      // giữ hướng ra ngoài như lúc đầu (dấu của tích vô hướng với pháp tuyến ngoài ban đầu quay theo mặt)
      const base0: V3 = outward[j];
      const ref = sub(tx[j](add(P(faces[j][0]), base0)), tx[j](P(faces[j][0])));
      out[j] = {names: faces[j], pts, normal: dot(nrm, ref) < 0 ? mul(nrm, -1) : nrm};
    }
    return out;
  };

  const flat = build(1);
  const flatPts = flat.flatMap((f) => f.pts);
  const flatCenter = centroid(flatPts);
  const flatRadius = Math.max(1e-6, ...flatPts.map((p) => len(sub(p, flatCenter))));
  return {faces: build(Math.max(0, Math.min(1, t))), flatCenter, flatRadius, rootNormal: outward[0], solidCenter};
}

/** Euler (yaw, pitch) đưa pháp tuyến n về hướng người xem (+z), cùng quy ước với renderScene. */
export function faceOnView(n: V3): {yaw: number; pitch: number} {
  const yaw = Math.atan2(-n[0], n[2]);
  const z1 = -n[0] * Math.sin(yaw) + n[2] * Math.cos(yaw);
  return {yaw, pitch: Math.atan2(n[1], z1)};
}

/**
 * Thiết diện của mặt phẳng song song mặt đáy, ở độ cao frac (0..1) tính từ đáy tới đỉnh xa nhất. Trả các giao điểm đã sắp theo vòng, hoặc null.
 * Dùng cho thanh kéo "cắt ngang": kéo mặt phẳng lên xuống thì thiết diện đổi theo.
 */
export function sliceSection(sc: GeoScene, frac: number): V3[] | null {
  if (!canUnfold(sc)) return null;
  const P = (n: string) => sc.pts[n];
  const base = sc.faces[0];
  const bp = base.map(P);
  const solidPts = [...new Set(sc.faces.flat())].map(P);
  const center = centroid(solidPts);
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < bp.length; i++) n = add(n, cross(bp[i], bp[(i + 1) % bp.length]));
  n = norm(n);
  if (dot(n, sub(center, bp[0])) < 0) n = mul(n, -1); // hướng vào trong khối
  const hmax = Math.max(...solidPts.map((p) => dot(n, sub(p, bp[0]))));
  const h = Math.max(0.02, Math.min(0.98, frac)) * hmax;
  const hits: V3[] = [];
  const push = (p: V3) => {
    if (!hits.some((q) => len(sub(p, q)) < 1e-7)) hits.push(p);
  };
  for (const [u, v] of sc.edges) {
    if (!P(u) || !P(v)) continue;
    const du = dot(n, sub(P(u), bp[0])) - h;
    const dv = dot(n, sub(P(v), bp[0])) - h;
    if (Math.abs(du) < 1e-9) push(P(u));
    if (Math.abs(dv) < 1e-9) push(P(v));
    if (du * dv < -1e-12) push(add(P(u), mul(sub(P(v), P(u)), du / (du - dv))));
  }
  if (hits.length < 3) return null;
  const c = centroid(hits);
  const e1 = norm(sub(hits[0], c));
  const e2 = cross(n, e1);
  hits.sort((p, q) => Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1)) - Math.atan2(dot(sub(q, c), e2), dot(sub(q, c), e1)));
  return hits;
}

/** Diện tích và chu vi của đa giác phẳng 3D (đơn vị a). */
export function polygonStats(poly: V3[]): {area: number; perimeter: number} {
  let a: V3 = [0, 0, 0];
  let per = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a = add(a, cross(p, q));
    per += len(sub(p, q));
  }
  return {area: len(a) / 2, perimeter: per};
}
