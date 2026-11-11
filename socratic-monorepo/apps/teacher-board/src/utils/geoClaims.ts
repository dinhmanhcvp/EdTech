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
  | {k: 'ang'; a: [string, string, string]; b: [string, string, string]};

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
    .replace(/[∠̂̃]|\\widehat|\\angle|\bgóc\b/giu, '∠')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;]$/, '');
  t = t.replace(/\(([A-Z])\)/g, '$1');
  let m = t.match(/^(.+?)\s*thẳng\s*hàng$/iu);
  if (m) {
    const n = names(m[1]);
    return n.length >= 3 ? {k: 'col', pts: n} : null;
  }
  m = t.match(/^(?:các\s*điểm\s*)?(.+?)\s*(?:cùng\s*(?:nằm\s*)?(?:thuộc|trên)(?:\s*một)?\s*đường\s*tròn|đồng\s*viên|nằm\s*trên\s*(?:một\s*)?đường\s*tròn)$/iu);
  if (m) {
    const n = names(m[1]);
    return n.length >= 4 ? {k: 'cyc', pts: n} : null;
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

const claimPoints = (c: Claim): string[] => (c.k === 'col' || c.k === 'cyc' ? c.pts : c.k === 'ang' ? [...c.a, ...c.b] : c.k === 'ratio' ? [...c.a, ...c.b, ...c.c, ...c.d] : [...c.a, ...c.b]);

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
