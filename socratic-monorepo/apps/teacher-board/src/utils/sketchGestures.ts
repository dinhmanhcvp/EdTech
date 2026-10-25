// apps/teacher-board/src/utils/sketchGestures.ts
/**
 * Nhận ra HÌNH PHÁC THẢO STEM (không phải chữ, không phải khối đa diện) từ ≤ 3 nét — thay cho đoạn mã mẫu "$1" trong tài liệu
 * (bản mẫu có hàm luôn trả true). Mỗi bộ nhận dạng dựa trên đặc trưng hình học đo được, trả điểm 0..1:
 *   SPRING   nét ziczac góc nhọn đều đặn, kéo dài một hướng          → con lắc lò xo
 *   WAVE     nét lượn sóng mượt cắt đường giữa ≥ 4 lần               → đồ thị hình sin
 *   PARABOLA một nét có đúng một cực trị, hai đầu cân đối            → parabol (toán) / quỹ đạo ném xiên (lý)
 *   ELLIPSE  nét kín, không có góc                                   → conic / tế bào
 *   CIRCUIT  nét kín có 4 góc ~90°, khung chữ nhật                   → mạch điện RLC
 *   Y_FORK   ba đoạn gặp nhau tại một điểm (thân + hai nhánh)        → chạc sao chép ADN
 *   BEANS    hai nét cong "( )" đối xứng, ôm lấy khoảng trống        → khí khổng
 * Trả null nếu không có hình nào đủ chắc — khi đó hệ thống nhận dạng chữ/AI như thường.
 */
export interface SkPt {
  x: number;
  y: number;
}
export interface SkStroke {
  points: SkPt[];
}

export type SketchKind = 'SPRING' | 'WAVE' | 'PARABOLA' | 'ELLIPSE' | 'CIRCUIT' | 'Y_FORK' | 'BEANS';
export interface SketchGuess {
  kind: SketchKind;
  score: number;
}
export interface SketchResult {
  best: SketchGuess;
  alternatives: SketchGuess[];
}

const dist = (a: SkPt, b: SkPt) => Math.hypot(a.x - b.x, a.y - b.y);
const plen = (p: SkPt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1], q) : 0), 0);
const bbox = (pts: SkPt[]) => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  return {x0, y0, x1, y1, w: x1 - x0, h: y1 - y0};
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function resample(p: SkPt[], n: number): SkPt[] {
  const total = plen(p);
  if (p.length < 2 || total < 1e-9) return p.slice();
  const step = total / (n - 1);
  const out: SkPt[] = [p[0]];
  let acc = 0;
  let prev = p[0];
  for (let i = 1; i < p.length && out.length < n; ) {
    const d = dist(prev, p[i]);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const q = {x: prev.x + t * (p[i].x - prev.x), y: prev.y + t * (p[i].y - prev.y)};
      out.push(q);
      prev = q;
      acc = 0;
    } else {
      acc += d;
      prev = p[i];
      i++;
    }
  }
  while (out.length < n) out.push(p[p.length - 1]);
  return out;
}

function perp(p: SkPt, a: SkPt, b: SkPt) {
  const L = dist(a, b);
  if (L < 1e-9) return dist(p, a);
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L;
}
function rdp(pts: SkPt[], eps: number): SkPt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const st: [number, number][] = [[0, pts.length - 1]];
  while (st.length) {
    const [s, e] = st.pop()!;
    let dm = 0;
    let im = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perp(pts[i], pts[s], pts[e]);
      if (d > dm) {
        dm = d;
        im = i;
      }
    }
    if (im >= 0 && dm > eps) {
      keep[im] = true;
      st.push([s, im], [im, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Góc ngoặt (độ, 0..180) tại các đỉnh trong của đa tuyến. */
const turnAngles = (v: SkPt[]) =>
  v.slice(1, -1).map((p, i) => {
    const a = Math.atan2(p.y - v[i].y, p.x - v[i].x);
    const b = Math.atan2(v[i + 2].y - p.y, v[i + 2].x - p.x);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return (d * 180) / Math.PI;
  });

function selfCrossings(p: SkPt[]): number {
  const q = resample(p, 40);
  let n = 0;
  const ccw = (a: SkPt, b: SkPt, c: SkPt) => (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
  for (let i = 0; i < q.length - 1; i++) {
    for (let j = i + 2; j < q.length - 1; j++) {
      if (i === 0 && j === q.length - 2) continue; // vòng kín: đoạn đầu và cuối kề nhau
      if (ccw(q[i], q[j], q[j + 1]) * ccw(q[i + 1], q[j], q[j + 1]) < 0 && ccw(q[i], q[i + 1], q[j]) * ccw(q[i], q[i + 1], q[j + 1]) < 0) n++;
    }
  }
  return n;
}

// -------------------------------------------------------------- bộ nhận dạng một nét
function scoreSpring(s: SkPt[]): number {
  const total = plen(s);
  const bb = bbox(s);
  const long = Math.max(bb.w, bb.h);
  const short = Math.min(bb.w, bb.h);
  if (long < 1e-6 || long / Math.max(short, 1e-6) < 1.6) return 0;
  const v = rdp(resample(s, 80), 0.05 * long);
  if (v.length < 7) return 0;
  const ang = turnAngles(v);
  const sharp = ang.filter((a) => a > 55).length / Math.max(ang.length, 1);
  const segs = v.slice(1).map((p, i) => dist(v[i], p)).slice(1, -1);
  if (!segs.length) return 0;
  const mean = segs.reduce((a, b) => a + b, 0) / segs.length;
  const cv = Math.sqrt(segs.reduce((a, b) => a + (b - mean) ** 2, 0) / segs.length) / Math.max(mean, 1e-9);
  // các đỉnh luân phiên hai phía của trục chính
  const horiz = bb.w >= bb.h;
  const side = v.slice(1, -1).map((p, i) => Math.sign(horiz ? (p.y - (v[i].y + v[i + 2].y) / 2) : (p.x - (v[i].x + v[i + 2].x) / 2)));
  let alt = 0;
  for (let i = 1; i < side.length; i++) if (side[i] !== 0 && side[i] === -side[i - 1]) alt++;
  const altR = alt / Math.max(side.length - 1, 1);
  void total;
  return clamp01(0.45 * clamp01((sharp - 0.4) / 0.5) + 0.3 * clamp01(1 - cv / 0.7) + 0.25 * clamp01((altR - 0.5) / 0.4)) * clamp01((v.length - 6) / 4);
}

function scoreWave(s: SkPt[]): number {
  const bb = bbox(s);
  if (bb.w < 2.2 * bb.h || bb.h < 1e-6) return 0;
  const p = resample(s, 120);
  const mid = (bb.y0 + bb.y1) / 2;
  let cross = 0;
  for (let i = 1; i < p.length; i++) if ((p[i - 1].y - mid) * (p[i].y - mid) < 0) cross++;
  // x phải gần đơn điệu (đồ thị hàm số)
  let fwd = 0;
  for (let i = 1; i < p.length; i++) if (p[i].x >= p[i - 1].x - 0.5) fwd++;
  const mono = Math.max(fwd, p.length - 1 - fwd) / (p.length - 1);
  // mượt: ít góc nhọn
  const v = rdp(resample(s, 80), 0.18 * bb.h);
  const sharp = turnAngles(v).filter((a) => a > 100).length / Math.max(v.length - 2, 1);
  return clamp01(clamp01((cross - 1) / 3) * 0.5 + clamp01((mono - 0.85) / 0.12) * 0.25 + clamp01(1 - sharp / 0.5) * 0.25) * (cross >= 4 ? 1 : 0.3);
}

function scoreParabola(s: SkPt[]): number {
  const bb = bbox(s);
  if (bb.w < 40 || bb.h < 25) return 0;
  const p = resample(s, 60);
  // một cực trị theo y: trục tung đổi chiều đúng một lần
  let ext = 0;
  let dir = 0;
  for (let i = 1; i < p.length; i++) {
    const d = Math.sign(p[i].y - p[i - 1].y);
    if (Math.abs(p[i].y - p[i - 1].y) < 0.003 * bb.h) continue;
    if (dir !== 0 && d !== dir) ext++;
    dir = d;
  }
  if (ext !== 1) return 0;
  const imin = p.reduce((m, q, i) => (q.y < p[m].y ? i : m), 0);
  const imax = p.reduce((m, q, i) => (q.y > p[m].y ? i : m), 0);
  const ie = [imin, imax].find((i) => i > 6 && i < p.length - 7);
  if (ie === undefined) return 0;
  const pos = ie / (p.length - 1);
  const left = Math.abs(p[0].y - p[ie].y);
  const right = Math.abs(p[p.length - 1].y - p[ie].y);
  const balance = Math.min(left, right) / Math.max(left, right, 1e-9);
  let fwd = 0;
  for (let i = 1; i < p.length; i++) if (p[i].x >= p[i - 1].x - 0.5) fwd++;
  const mono = Math.max(fwd, p.length - 1 - fwd) / (p.length - 1);
  return clamp01(0.35 * clamp01(1 - Math.abs(pos - 0.5) / 0.25) + 0.35 * clamp01((balance - 0.4) / 0.5) + 0.3 * clamp01((mono - 0.85) / 0.12));
}

function closedness(s: SkPt[]) {
  const total = plen(s);
  return total < 1e-9 ? 0 : 1 - dist(s[0], s[s.length - 1]) / total;
}

function scoreEllipse(s: SkPt[]): number {
  const bb = bbox(s);
  if (Math.max(bb.w, bb.h) < 40) return 0;
  const c = closedness(s);
  if (c < 0.82) return 0;
  const diag = Math.hypot(bb.w, bb.h);
  const v = rdp(resample(s, 90), 0.1 * diag);
  const corners = turnAngles(v).filter((a) => a > 62).length;
  // độ "tròn": chu vi so với chu vi elip nội tiếp
  const a = bb.w / 2;
  const b = bb.h / 2;
  const per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const ratio = plen(s) / Math.max(per, 1e-9);
  return clamp01(0.55 * clamp01(1 - corners / 3) + 0.25 * clamp01(1 - Math.abs(ratio - 1) / 0.25) + 0.2 * clamp01((c - 0.82) / 0.12)) * (selfCrossings(s) <= 1 ? 1 : 0.4);
}

function scoreCircuit(s: SkPt[]): number {
  const bb = bbox(s);
  if (bb.w < 60 || bb.h < 40) return 0;
  const c = closedness(s);
  if (c < 0.8) return 0;
  const diag = Math.hypot(bb.w, bb.h);
  const v = rdp(resample([...s, s[0]], 120), 0.06 * diag);
  const ang = turnAngles(v);
  const right = ang.filter((a) => a > 62 && a < 118).length;
  const aspect = bb.w / bb.h;
  const asp = aspect >= 1.15 && aspect <= 3.6 ? 1 : clamp01(1 - Math.min(Math.abs(aspect - 1.15), Math.abs(aspect - 3.6)) / 0.6);
  return clamp01(0.6 * clamp01((right - 2) / 2) + 0.25 * asp + 0.15 * clamp01((c - 0.8) / 0.15)) * (right >= 3 ? 1 : 0.2);
}

// -------------------------------------------------------------- nhiều nét
function scoreFork(strokes: SkStroke[]): number {
  const all = strokes.flatMap((s) => s.points);
  const bb = bbox(all);
  const D = Math.hypot(bb.w, bb.h);
  if (D < 50) return 0;
  const segs: [SkPt, SkPt][] = [];
  for (const s of strokes) {
    if (plen(s.points) < 0.12 * D) continue;
    const v = rdp(resample(s.points, 40), 0.06 * D);
    for (let i = 1; i < v.length; i++) if (dist(v[i - 1], v[i]) > 0.15 * D) segs.push([v[i - 1], v[i]]);
  }
  if (segs.length !== 3) return 0;
  // tìm điểm chung của cả ba đoạn
  const ends = segs.flatMap(([a, b], i) => [{p: a, i}, {p: b, i}]);
  let best: {jx: SkPt; arms: SkPt[]} | null = null;
  for (const e of ends) {
    const near = segs.map(([a, b]) => (dist(a, e.p) < 0.14 * D ? {at: a, far: b} : dist(b, e.p) < 0.14 * D ? {at: b, far: a} : null));
    if (near.every(Boolean)) {
      const jx = {x: near.reduce((s, n) => s + n!.at.x, 0) / 3, y: near.reduce((s, n) => s + n!.at.y, 0) / 3};
      best = {jx, arms: near.map((n) => n!.far)};
      break;
    }
  }
  if (!best) return 0;
  const ang = best.arms.map((a) => Math.atan2(a.y - best!.jx.y, a.x - best!.jx.x));
  const lens = best.arms.map((a) => dist(a, best!.jx));
  // góc giữa các cặp nhánh: một cặp hẹp (hai nhánh), hai cặp còn lại rộng; không có cặp ~180° (chữ T) hay ~0
  const diffs: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      let d = Math.abs(ang[i] - ang[j]);
      if (d > Math.PI) d = 2 * Math.PI - d;
      diffs.push((d * 180) / Math.PI);
    }
  const sorted = [...diffs].sort((a, b) => a - b);
  const narrow = sorted[0];
  const wide = sorted[1];
  if (narrow < 22 || narrow > 105 || wide < 105 || sorted[2] > 200) return 0;
  const balance = Math.min(...lens) / Math.max(...lens);
  return clamp01(0.5 * clamp01(1 - Math.abs(narrow - 60) / 50) + 0.3 * clamp01((balance - 0.3) / 0.5) + 0.2);
}

function bulge(s: SkPt[]): number {
  // >0: phình sang phải, <0: phình sang trái (so với dây cung nối hai điểm cực trị theo y)
  const top = s.reduce((m, q) => (q.y < m.y ? q : m), s[0]);
  const bot = s.reduce((m, q) => (q.y > m.y ? q : m), s[0]);
  const cx = s.reduce((a, q) => a + q.x, 0) / s.length;
  return cx - (top.x + bot.x) / 2;
}

function scoreBeans(strokes: SkStroke[]): number {
  if (strokes.length !== 2) return 0;
  const [a, b] = strokes.map((s) => s.points).sort((p, q) => bbox(p).x0 - bbox(q).x0);
  const A = bbox(a);
  const B = bbox(b);
  if (A.h < 40 || B.h < 40) return 0;
  const sizeRatio = Math.min(A.h, B.h) / Math.max(A.h, B.h);
  const overlap = (Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0)) / Math.min(A.h, B.h);
  const gap = B.x0 - A.x1;
  const avgW = (A.w + B.w) / 2;
  const tall = Math.min(A.h / Math.max(A.w, 1), B.h / Math.max(B.w, 1));
  if (sizeRatio < 0.55 || overlap < 0.7 || gap > 2 * avgW || gap < -0.6 * avgW || tall < 1.1) return 0;
  const bl = bulge(resample(a, 40));
  const br = bulge(resample(b, 40));
  // mỗi hạt đậu phình ra phía ngoài, ôm lấy khe ở giữa: trái phình trái (< 0), phải phình phải (> 0)
  if (!(bl < -0.04 * A.h && br > 0.04 * B.h)) return 0;
  return clamp01(0.4 * clamp01((sizeRatio - 0.55) / 0.35) + 0.3 * clamp01((overlap - 0.7) / 0.25) + 0.3 * clamp01(Math.min(-bl / A.h, br / B.h) / 0.12));
}

/** Điểm của mọi bộ nhận dạng (chưa lọc ngưỡng) — dùng để gỡ lỗi và để hiện phương án thay thế. */
export function scoreSketch(strokes: SkStroke[]): SketchGuess[] {
  const st = strokes.filter((s) => s.points.length >= 3 && plen(s.points) > 20);
  if (st.length === 0 || st.length > 3) return [];
  const bb = bbox(st.flatMap((s) => s.points));
  if (Math.hypot(bb.w, bb.h) < 90) return []; // quá nhỏ: có thể là chữ
  const guesses: SketchGuess[] = [];
  const push = (kind: SketchKind, score: number) => score > 0.05 && guesses.push({kind, score});
  if (st.length === 1) {
    const s = st[0].points;
    push('SPRING', scoreSpring(s));
    push('WAVE', scoreWave(s));
    push('PARABOLA', scoreParabola(s));
    push('ELLIPSE', scoreEllipse(s));
    push('CIRCUIT', scoreCircuit(s));
  }
  push('Y_FORK', scoreFork(st));
  if (st.length === 2) push('BEANS', scoreBeans(st));
  return guesses.sort((a, b) => b.score - a.score);
}

/** Nhận hình phác thảo; strokes là các nét đã chọn. Trả null nếu không giống hình nào đủ chắc. */
export function recognizeSketch(strokes: SkStroke[], minScore = 0.6): SketchResult | null {
  const g = scoreSketch(strokes);
  if (!g.length || g[0].score < minScore) return null;
  return {best: g[0], alternatives: g.filter((x) => x.score >= 0.35).slice(1, 3)};
}
