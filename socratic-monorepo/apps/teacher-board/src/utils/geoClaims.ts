/**
 * Kiểm chứng mệnh đề hình học trên hình đang vẽ bằng SỐ (không phải chứng minh): đo trên hình hiện tại, rồi kéo thử các đỉnh tự do
 * (hình vẫn giữ vuông góc/bằng nhau/song song của đề) để xem mệnh đề còn đúng không. Đúng ở mọi vị trí thử = có cơ sở để học sinh đi chứng minh;
 * sai ở một vị trí = mệnh đề chưa đúng hoặc chỉ đúng ở trường hợp đặc biệt. Chỉ cho hình phẳng.
 * Ngoài ra `detectFacts` liệt kê các quan hệ đang đúng giữa các điểm có tên (làm căn cứ cho coach và AI hỏi đáp).
 */
import type {GeoScene} from './geometryProblem';
import {freePoints, moveFreePoint} from './geoTools';

type Seg = [string, string];
export type Claim =
  | {k: 'eq'; a: Seg; b: Seg}
  | {k: 'ratio'; a: Seg; b: Seg; c: Seg; d: Seg}
  | {k: 'perp'; a: Seg; b: Seg}
  | {k: 'par'; a: Seg; b: Seg}
  | {k: 'col'; pts: string[]}
  | {k: 'cyc'; pts: string[]}
  | {k: 'ang'; a: [string, string, string]; b: [string, string, string]}
  /** hai tam giác đồng dạng (ba góc đôi một bằng nhau, không phân biệt thứ tự đỉnh) */
  | {k: 'sim'; a: [string, string, string]; b: [string, string, string]}
  /** a² = b·c (phương tích / tiếp tuyến), vd BK² = KI·KD */
  | {k: 'pow'; a: Seg; b: Seg; c: Seg}
  /** a·b = c·d (tích hai đoạn), vd AH·AP = AI·AB */
  | {k: 'prod'; a: Seg; b: Seg; c: Seg; d: Seg}
  /** M là trung điểm đoạn a */
  | {k: 'mid'; m: string; a: Seg}
  /** đường thẳng a là tiếp tuyến của đường tròn tâm o (tiếp điểm là một đầu mút của a) */
  | {k: 'tang'; a: Seg; o: string}
  /** tứ giác v (theo thứ tự đỉnh) là hình bình hành */
  | {k: 'par4'; v: [string, string, string, string]}
  /** tam giác (apex, a, b) cân tại apex */
  | {k: 'iso'; apex: string; a: string; b: string}
  /** tam giác (a, v, b) vuông tại v */
  | {k: 'right'; v: string; a: string; b: string};

type P = Record<string, number[]>;
const EPS = 1e-5;
const d2 = (p: P, a: string, b: string) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
const vec = (p: P, a: string, b: string) => [p[b][0] - p[a][0], p[b][1] - p[a][1]];
const crs = (u: number[], v: number[]) => u[0] * v[1] - u[1] * v[0];
const dt = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1];
const ang = (p: P, a: string, v: string, c: string) => Math.acos(Math.max(-1, Math.min(1, dt(vec(p, v, a), vec(p, v, c)) / ((d2(p, v, a) * d2(p, v, c)) || 1))));
const rel = (x: number, y: number) => Math.abs(x - y) / Math.max(1, Math.abs(x), Math.abs(y));

/** Hai điểm tạo đoạn? (hai chữ cái viết liền hoặc có dấu ') */
const seg = (s: string): Seg | null => {
  const m = s.trim().match(/^([A-Z]'?)\s*([A-Z]'?)$/);
  return m && m[1] !== m[2] ? [m[1], m[2]] : null;
};
const tri = (s: string): [string, string, string] | null => {
  const m = s.trim().match(/^([A-Z]'?)\s*([A-Z]'?)\s*([A-Z]'?)$/);
  return m ? [m[1], m[2], m[3]] : null;
};
const names = (s: string): string[] => [...s.matchAll(/[A-Z]'?/g)].map((m) => m[0]);

/** Đọc một mệnh đề viết tay/gõ ("AB ⊥ CD", "HD/HC = KB/KA", "A, B, C, D cùng thuộc một đường tròn"…); không hiểu thì null. */
export function parseClaim(raw: string): Claim | null {
  let t = ` ${raw || ''} `
    .replace(/(?:Chứng minh(?: rằng)?|CM|Cmr|Tính|Tìm)\s*/giu, ' ')
    .replace(/⊥|\\perp|vuông\s*góc(?:\s*với)?/giu, '⊥')
    .replace(/∥|\/\/|\\parallel|song\s*song(?:\s*với)?/giu, '∥')
    .replace(/[△Δ∆]/gu, ' tam giác ')
    .replace(/[∠̂̃]|\\widehat|\\angle|\bgóc\b/giu, '∠')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;]$/, '');
  t = t.replace(/\(([A-Z])\)/g, '$1');
  t = t.replace(/\/\s*\//g, '∥');
  let m = t.match(/^(?:(?:ba|3)\s*điểm\s*)?(.+?)\s*thẳng\s*hàng$/iu);
  if (m) {
    const n = names(m[1]);
    return n.length >= 3 ? {k: 'col', pts: n} : null;
  }
  m = t.match(/^(?:(?:các|bốn|4|năm|5)\s*điểm\s*)?(.+?)\s*(?:cùng\s*(?:nằm\s*)?(?:thuộc|trên)(?:\s*(?:một|1))?\s*đường\s*tròn|đồng\s*viên|nằm\s*trên\s*(?:cùng\s*)?(?:một|1)?\s*đường\s*tròn)$/iu);
  if (m) {
    const n = names(m[1]);
    return n.length >= 4 ? {k: 'cyc', pts: n} : null;
  }
  m = t.match(/^(?:hai\s*)?tam\s*giác\s*([A-Z'\s]+?)\s*(?:và|,)\s*(?:tam\s*giác\s*)?([A-Z'\s]+?)\s*đồng\s*dạng$/iu) ?? t.match(/^tam\s*giác\s*([A-Z'\s]+?)\s*đồng\s*dạng\s*(?:với\s*)?tam\s*giác\s*([A-Z'\s]+?)$/iu);
  if (m) {
    const [a, b] = [tri(m[1]), tri(m[2])];
    return a && b ? {k: 'sim', a, b} : null;
  }
  m = t.match(/^(?:tứ\s*giác\s*)?((?:[A-Z]'?\s*){4,5}?)\s*(?:là\s*tứ\s*giác\s*)?nội\s*tiếp(?:\s*(?:được\s*)?(?:trong\s*)?(?:một|1)?\s*đường\s*tròn)?$/iu);
  if (m) {
    const n = names(m[1]);
    return n.length >= 4 ? {k: 'cyc', pts: n} : null;
  }
  m = t.match(/^([A-Z]'?\s*[A-Z]'?)\s*(?:\^\s*)?(?:2|²)\s*=\s*([A-Z]'?\s*[A-Z]'?)\s*(?:[*⋅·.×]|nhân)?\s*([A-Z]'?\s*[A-Z]'?)$/u);
  if (m) {
    const [a, b, c] = [seg(m[1]), seg(m[2]), seg(m[3])];
    return a && b && c ? {k: 'pow', a, b, c} : null;
  }
  m = t.match(/^([A-Z]'?)\s*là\s*trung\s*điểm\s*(?:của\s*)?(?:đoạn\s*thẳng\s*|dây\s*|cạnh\s*)?([A-Z]'?\s*[A-Z]'?)$/u);
  if (m) {
    const a = seg(m[2]);
    return a ? {k: 'mid', m: m[1], a} : null;
  }
  m = t.match(/^([A-Z]'?\s*[A-Z]'?)\s*là\s*tiếp\s*tuyến\s*của\s*(?:nửa\s*)?(?:đường\s*tròn\s*)?([A-Z])$/u);
  if (m) {
    const a = seg(m[1]);
    return a ? {k: 'tang', a, o: m[2]} : null;
  }
  m = t.match(/^(?:tứ\s*giác\s*)?((?:[A-Z]'?\s*){4})\s*là\s*hình\s*bình\s*hành$/u);
  if (m) {
    const v = names(m[1]);
    return v.length === 4 ? {k: 'par4', v: v as [string, string, string, string]} : null;
  }
  m = t.match(/^tam\s*giác\s*([A-Z])([A-Z])([A-Z])\s*cân\s*(?:tại|ở)\s*([A-Z])$/u);
  if (m && [m[1], m[2], m[3]].includes(m[4])) {
    const o = [m[1], m[2], m[3]].filter((n) => n !== m![4]);
    return {k: 'iso', apex: m[4], a: o[0], b: o[1]};
  }
  m = t.match(/^tam\s*giác\s*([A-Z])([A-Z])([A-Z])\s*vuông\s*(?:tại|ở)\s*([A-Z])$/u);
  if (m && [m[1], m[2], m[3]].includes(m[4])) {
    const o = [m[1], m[2], m[3]].filter((n) => n !== m![4]);
    return {k: 'right', v: m[4], a: o[0], b: o[1]};
  }
  m = t.match(/^([A-Z]'?\s*[A-Z]'?)\s*[*⋅·.×]\s*([A-Z]'?\s*[A-Z]'?)\s*=\s*([A-Z]'?\s*[A-Z]'?)\s*[*⋅·.×]\s*([A-Z]'?\s*[A-Z]'?)$/u);
  if (m) {
    const [a, b, c, d] = [seg(m[1]), seg(m[2]), seg(m[3]), seg(m[4])];
    return a && b && c && d ? {k: 'prod', a, b, c, d} : null;
  }
  m = t.match(/^(.+?)\s*⊥\s*(.+)$/u);
  if (m) {
    const a = seg(m[1]);
    const b = seg(m[2]);
    return a && b ? {k: 'perp', a, b} : null;
  }
  m = t.match(/^(.+?)\s*∥\s*(.+)$/u);
  if (m) {
    const a = seg(m[1]);
    const b = seg(m[2]);
    return a && b ? {k: 'par', a, b} : null;
  }
  m = t.match(/^∠\s*(.+?)\s*=\s*∠\s*(.+)$/u);
  if (m) {
    const a = tri(m[1]);
    const b = tri(m[2]);
    return a && b ? {k: 'ang', a, b} : null;
  }
  m = t.match(/^(.+?)\s*\/\s*(.+?)\s*=\s*(.+?)\s*\/\s*(.+)$/u);
  if (m) {
    const [a, b, c, d] = [seg(m[1]), seg(m[2]), seg(m[3]), seg(m[4])];
    return a && b && c && d ? {k: 'ratio', a, b, c, d} : null;
  }
  // tỉ số dán từ PDF mất gạch phân số: "HD HC = KB KA"
  m = t.match(/^([A-Z]'?[A-Z]'?)\s+([A-Z]'?[A-Z]'?)\s*=\s*([A-Z]'?[A-Z]'?)\s+([A-Z]'?[A-Z]'?)$/u);
  if (m) {
    const [a, b, c, d] = [seg(m[1]), seg(m[2]), seg(m[3]), seg(m[4])];
    return a && b && c && d ? {k: 'ratio', a, b, c, d} : null;
  }
  m = t.match(/^(.+?)\s*=\s*(.+)$/u);
  if (m) {
    const a = seg(m[1]);
    const b = seg(m[2]);
    return a && b ? {k: 'eq', a, b} : null;
  }
  return null;
}

export const claimPoints = (c: Claim): string[] => {
  switch (c.k) {
    case 'col':
    case 'cyc':
      return c.pts;
    case 'ang':
    case 'sim':
      return [...c.a, ...c.b];
    case 'pow':
      return [...c.a, ...c.b, ...c.c];
    case 'prod':
    case 'ratio':
      return [...c.a, ...c.b, ...c.c, ...c.d];
    case 'mid':
      return [c.m, ...c.a];
    case 'tang':
      return [...c.a, c.o];
    case 'par4':
      return c.v;
    case 'iso':
      return [c.apex, c.a, c.b];
    case 'right':
      return [c.v, c.a, c.b];
    default:
      return [...c.a, ...c.b];
  }
};

/** Đo mệnh đề trên một bộ tọa độ: sai số (0 = đúng tuyệt đối); null nếu thiếu điểm. */
export function claimError(p: P, c: Claim): number | null {
  if (claimPoints(c).some((n) => !p[n])) return null;
  switch (c.k) {
    case 'eq':
      return rel(d2(p, ...c.a), d2(p, ...c.b));
    case 'ratio': {
      const [b, d] = [d2(p, ...c.b), d2(p, ...c.d)];
      return b < 1e-9 || d < 1e-9 ? null : rel(d2(p, ...c.a) / b, d2(p, ...c.c) / d);
    }
    case 'perp':
      return Math.abs(dt(vec(p, ...c.a), vec(p, ...c.b))) / ((d2(p, ...c.a) * d2(p, ...c.b)) || 1);
    case 'par':
      return Math.abs(crs(vec(p, ...c.a), vec(p, ...c.b))) / ((d2(p, ...c.a) * d2(p, ...c.b)) || 1);
    case 'col': {
      const [a, b] = c.pts;
      const u = vec(p, a, b);
      return Math.max(...c.pts.slice(2).map((x) => Math.abs(crs(u, vec(p, a, x))) / ((d2(p, a, b) * d2(p, a, x)) || 1)));
    }
    case 'cyc': {
      // đường tròn qua 3 điểm đầu; sai số = lệch bán kính tương đối của các điểm còn lại
      const [a, b, cc] = c.pts;
      const D = 2 * (p[a][0] * (p[b][1] - p[cc][1]) + p[b][0] * (p[cc][1] - p[a][1]) + p[cc][0] * (p[a][1] - p[b][1]));
      if (Math.abs(D) < 1e-9) return null;
      const s = (n: string) => p[n][0] ** 2 + p[n][1] ** 2;
      const ux = (s(a) * (p[b][1] - p[cc][1]) + s(b) * (p[cc][1] - p[a][1]) + s(cc) * (p[a][1] - p[b][1])) / D;
      const uy = (s(a) * (p[cc][0] - p[b][0]) + s(b) * (p[a][0] - p[cc][0]) + s(cc) * (p[b][0] - p[a][0])) / D;
      const r = Math.hypot(p[a][0] - ux, p[a][1] - uy);
      return Math.max(...c.pts.slice(3).map((x) => Math.abs(Math.hypot(p[x][0] - ux, p[x][1] - uy) - r) / (r || 1)));
    }
    case 'ang':
      return Math.abs(ang(p, ...c.a) - ang(p, ...c.b)) / Math.PI;
    case 'sim': {
      const angs = (t: [string, string, string]) => [ang(p, t[1], t[0], t[2]), ang(p, t[0], t[1], t[2]), ang(p, t[0], t[2], t[1])].sort((x, y) => x - y);
      const [u, w] = [angs(c.a), angs(c.b)];
      return Math.max(...u.map((x, i) => Math.abs(x - w[i]))) / Math.PI;
    }
    case 'mid':
      return Math.hypot(p[c.m][0] - (p[c.a[0]][0] + p[c.a[1]][0]) / 2, p[c.m][1] - (p[c.a[0]][1] + p[c.a[1]][1]) / 2) / (d2(p, ...c.a) || 1);
    case 'tang': {
      const e = (x: string, y: string) => Math.abs(dt(vec(p, c.o, x), vec(p, x, y))) / ((d2(p, c.o, x) * d2(p, x, y)) || 1);
      return Math.min(e(c.a[0], c.a[1]), e(c.a[1], c.a[0]));
    }
    case 'par4': {
      const [a, b, cc, d] = c.v;
      return Math.hypot(p[a][0] + p[cc][0] - p[b][0] - p[d][0], p[a][1] + p[cc][1] - p[b][1] - p[d][1]) / ((d2(p, a, cc) + d2(p, b, d)) / 2 || 1);
    }
    case 'iso':
      return rel(d2(p, c.apex, c.a), d2(p, c.apex, c.b));
    case 'right':
      return Math.abs(dt(vec(p, c.v, c.a), vec(p, c.v, c.b))) / ((d2(p, c.v, c.a) * d2(p, c.v, c.b)) || 1);
    case 'prod':
      return rel(d2(p, ...c.a) * d2(p, ...c.b), d2(p, ...c.c) * d2(p, ...c.d));
    case 'pow':
      return rel(d2(p, ...c.a) ** 2, d2(p, ...c.b) * d2(p, ...c.c));
  }
}

export interface ClaimVerdict {
  verdict: 'holds' | 'fails' | 'unknown' | 'unparsed';
  detail: string;
  /** số vị trí đã thử (kể cả hình hiện tại) */
  tried: number;
  claim?: Claim;
}

// bộ sinh giả ngẫu nhiên cố định → kết quả lặp lại được (test, hai lần bấm cho cùng kết quả)
const prng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** Kiểm chứng `text` trên cảnh `sc`: hình hiện tại rồi `trials` lần kéo thử đỉnh tự do. */
export function verifyClaim(sc: GeoScene, text: string, trials = 8): ClaimVerdict {
  const claim = parseClaim(text);
  if (!claim) return {verdict: 'unparsed', detail: 'Chưa đọc được mệnh đề. Viết dạng: AB ⊥ CD, AB // CD, AB = CD, HD/HC = KB/KA, góc ABC = góc DEF, A, B, C thẳng hàng, A, B, C, D cùng thuộc một đường tròn.', tried: 0};
  if (sc.dim !== 2) return {verdict: 'unknown', detail: 'Kiểm chứng bằng số mới hỗ trợ hình phẳng.', tried: 0, claim};
  const err0 = claimError(sc.pts, claim);
  if (err0 === null) return {verdict: 'unknown', detail: `Trên hình chưa có đủ điểm: ${[...new Set(claimPoints(claim))].filter((n) => !sc.pts[n]).join(', ') || '(đoạn suy biến)'}.`, tried: 0, claim};
  if (err0 > EPS) return {verdict: 'fails', detail: 'Trên hình hiện tại mệnh đề KHÔNG đúng (số đo không khớp). Em kiểm tra lại cách đọc đề hoặc tên điểm.', tried: 1, claim};
  const free = freePoints(sc);
  const baseFacts = detectFacts(sc, 80);
  const movedHas = (m: GeoScene, f: string) => detectFacts(m, 80).includes(f);
  const rnd = prng(12345);
  let tried = 1;
  for (let i = 0; i < trials && free.length; i++) {
    const f = free[Math.floor(rnd() * free.length)];
    const spread = 0.4 + rnd() * 0.8;
    const moved = moveFreePoint(sc, f, [sc.pts[f][0] + (rnd() - 0.5) * 2 * spread, sc.pts[f][1] + (rnd() - 0.5) * 2 * spread, sc.pts[f][2]]);
    if (moved === sc) continue;
    // chỉ nhận vị trí kéo mà các quan hệ đang có của hình (đề cho) vẫn còn nguyên; nếu không thì "sai" là do hình bị phá, không phải do mệnh đề
    if (!baseFacts.every((f) => movedHas(moved, f))) continue;
    const e = claimError(moved.pts, claim);
    if (e === null) continue;
    tried++;
    if (e > EPS) return {verdict: 'fails', detail: `Đúng ở hình hiện tại nhưng SAI khi kéo đỉnh ${f}: có thể mệnh đề chỉ đúng ở trường hợp đặc biệt. Em xem lại giả thiết.`, tried, claim};
  }
  return {
    verdict: 'holds',
    detail: tried > 1 ? `Đúng ở ${tried} vị trí kéo thử (kể cả hình hiện tại). Đây là kiểm chứng bằng số, chưa phải chứng minh.` : 'Đúng ở hình hiện tại (không kéo thử được đỉnh nào nên chưa biết có đúng tổng quát). Chưa phải chứng minh.',
    tried,
    claim,
  };
}

// ------------------------------------------------------------------ quan hệ đang đúng trên hình
const key = (a: string, b: string) => (a < b ? `${a}${b}` : `${b}${a}`);

/**
 * Các quan hệ đang đúng giữa điểm có tên của hình phẳng (vuông góc, song song, bằng nhau, trung điểm, thẳng hàng, cùng đường tròn).
 * Chỉ xét đoạn có thật trên hình (cạnh, đường nối); giới hạn `max` để gọn.
 */
export function detectFacts(sc: GeoScene, max = 24): string[] {
  if (sc.dim !== 2) return [];
  const p = sc.pts;
  const segs = new Map<string, Seg>();
  for (const [a, b] of [...sc.edges, ...sc.aux.map(([a, b]) => [a, b] as Seg)]) if (p[a] && p[b] && a !== b) segs.set(key(a, b), [a, b]);
  // điểm M nằm trong một cạnh/đoạn AB thì MA, MB cũng là đoạn của hình (vd trung điểm M của BC: MB, MC)
  for (const [a, b] of [...segs.values()])
    for (const m of sc.order) {
      if (m === a || m === b || !p[m] || sc.hiddenPts?.includes(m)) continue;
      const u = vec(p, a, b);
      const w = vec(p, a, m);
      if (Math.abs(crs(u, w)) / ((d2(p, a, b) * d2(p, a, m)) || 1) < EPS && dt(u, w) > 0 && d2(p, a, m) < d2(p, a, b)) {
        if (!segs.has(key(m, a))) segs.set(key(m, a), [m, a]);
        if (!segs.has(key(m, b))) segs.set(key(m, b), [m, b]);
      }
    }
  const L = [...segs.values()];
  const out: string[] = [];
  const add = (s: string) => {
    if (out.length < max) out.push(s);
  };
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const [a, b] = [L[i], L[j]];
      const shared = a.some((x) => b.includes(x));
      const e = (c: Claim) => claimError(p, c) ?? 1;
      if (e({k: 'perp', a, b}) < EPS) add(`${a.join('')} ⊥ ${b.join('')}`);
      else if (!shared && e({k: 'par', a, b}) < EPS) add(`${a.join('')} ∥ ${b.join('')}`);
      if (e({k: 'eq', a, b}) < EPS) add(`${a.join('')} = ${b.join('')}`);
    }
  const ns = sc.order.filter((n) => p[n] && !sc.hiddenPts?.includes(n));
  for (const m of ns)
    for (const [a, b] of L) {
      if (m === a || m === b) continue;
      const u = vec(p, a, b);
      const w = vec(p, a, m);
      if (Math.abs(crs(u, w)) / ((d2(p, a, b) * d2(p, a, m)) || 1) < EPS && dt(u, w) > 0 && d2(p, a, m) < d2(p, a, b)) add(rel(d2(p, a, m), d2(p, m, b)) < EPS ? `${m} là trung điểm ${a}${b}` : `${m} nằm trên đoạn ${a}${b}`);
    }
  for (let i = 0; i < ns.length; i++)
    for (let j = i + 1; j < ns.length; j++)
      for (let k = j + 1; k < ns.length; k++)
        for (let l = k + 1; l < ns.length && out.length < max; l++) {
          const q = [ns[i], ns[j], ns[k], ns[l]];
          if ((claimError(p, {k: 'col', pts: q.slice(0, 3)}) ?? 1) < EPS) continue;
          if ((claimError(p, {k: 'cyc', pts: q}) ?? 1) < EPS && !(sc.circles ?? []).length) add(`${q.join(', ')} cùng thuộc một đường tròn`);
        }
  return out;
}
