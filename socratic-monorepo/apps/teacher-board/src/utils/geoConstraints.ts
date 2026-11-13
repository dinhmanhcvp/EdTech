/**
 * Giữ tính chất khi kéo đỉnh hình phẳng: vuông góc, bằng nhau, song song.
 * Ràng buộc suy ra MỘT lần từ hình dựng đúng (rồi lưu), nên kéo không vô tình "khóa" thêm tính chất ngẫu nhiên.
 * Giải bằng chiếu lặp (position-based): điểm đang kéo được ghim, các điểm còn lại tự điều chỉnh.
 */
export type P2 = [number, number];

export type Cons =
  | {k: 'perp'; a: string; v: string; c: string} // góc a-v-c = 90°
  | {k: 'eq'; a: string; b: string; c: string; d: string} // |ab| = |cd|
  | {k: 'par'; a: string; b: string; c: string; d: string} // ab ∥ cd
  | {k: 'cyc'; a: string; b: string; c: string; d: string}; // bốn điểm cùng thuộc một đường tròn

const names = (c: Cons): string[] => (c.k === 'perp' ? [c.a, c.v, c.c] : [c.a, c.b, c.c, c.d]);

const val = (c: Cons, p: Record<string, P2>): number => {
  if (c.k === 'perp') {
    const u = [p[c.a][0] - p[c.v][0], p[c.a][1] - p[c.v][1]];
    const w = [p[c.c][0] - p[c.v][0], p[c.c][1] - p[c.v][1]];
    return (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]) || 1);
  }
  if (c.k === 'cyc') {
    // định thức đồng viên (tịnh tiến a về gốc), chia cho bình phương tổng bình phương khoảng cách để không phụ thuộc cỡ hình
    const q = [c.b, c.c, c.d].map((n) => [p[n][0] - p[c.a][0], p[n][1] - p[c.a][1]]);
    const s = q.map((v) => v[0] * v[0] + v[1] * v[1]);
    const det = q[0][0] * (q[1][1] * s[2] - q[2][1] * s[1]) - q[0][1] * (q[1][0] * s[2] - q[2][0] * s[1]) + s[0] * (q[1][0] * q[2][1] - q[2][0] * q[1][1]);
    const sc = s[0] + s[1] + s[2];
    return det / (sc * sc || 1);
  }
  const u = [p[c.b][0] - p[c.a][0], p[c.b][1] - p[c.a][1]];
  const w = [p[c.d][0] - p[c.c][0], p[c.d][1] - p[c.c][1]];
  if (c.k === 'eq') return Math.hypot(u[0], u[1]) - Math.hypot(w[0], w[1]);
  return (u[0] * w[1] - u[1] * w[0]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]) || 1);
};

/** Suy ràng buộc từ hình hiện tại. `edges` chỉ gồm cạnh có hai đầu cùng nằm trong `pts`. */
export function inferCons(pts: Record<string, P2>, edges: [string, string][], tol = 1e-4): Cons[] {
  const es = edges.filter(([a, b]) => pts[a] && pts[b] && a !== b);
  const L = (a: string, b: string) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
  const out: Cons[] = [];
  for (let i = 0; i < es.length; i++) {
    for (let j = i + 1; j < es.length; j++) {
      const [a, b] = es[i];
      const [c, d] = es[j];
      const shared = [a, b].find((x) => x === c || x === d);
      if (shared) {
        const o1 = a === shared ? b : a;
        const o2 = c === shared ? d : c;
        if (o1 !== o2) {
          const k: Cons = {k: 'perp', a: o1, v: shared, c: o2};
          if (Math.abs(val(k, pts)) < tol) out.push(k);
        }
      } else if (L(a, b) > 1e-9 && L(c, d) > 1e-9) {
        const k: Cons = {k: 'par', a, b, c, d};
        const dist = Math.abs((pts[c][0] - pts[a][0]) * (pts[b][1] - pts[a][1]) - (pts[c][1] - pts[a][1]) * (pts[b][0] - pts[a][0])) / L(a, b);
        if (Math.abs(val(k, pts)) < tol && dist > 1e-6) out.push(k);
      }
      if (Math.abs(L(a, b) - L(c, d)) < tol * Math.max(L(a, b), 1e-9)) out.push({k: 'eq', a, b, c, d});
    }
  }
  return out;
}

const signs = (pts: Record<string, P2>, ring: string[]) =>
  ring.map((_, i) => {
    const [a, b, c] = [pts[ring[i]], pts[ring[(i + 1) % ring.length]], pts[ring[(i + 2) % ring.length]]];
    return Math.sign((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]));
  });

/**
 * `anchor` (tùy chọn): một điểm khác cũng được giữ nguyên (hình quay/co giãn quanh nó thay vì cả hình trôi theo).
 * Đưa `pin` tới `to` rồi chỉnh các điểm khác để mọi ràng buộc vẫn đúng.
 * Không giải được (suy biến, đảo chiều đa giác, cạnh co về 0) thì trả null: hình đứng yên thay vì méo.
 * `ring` = đa giác (thứ tự đỉnh) để canh chiều; có thể rỗng.
 */
export function solveDrag(pts: Record<string, P2>, cons: Cons[], pin: string, to: P2, ring: string[] = [], iters = 80, anchor?: string): Record<string, P2> | null {
  const p: Record<string, P2> = {};
  for (const [n, v] of Object.entries(pts)) p[n] = [v[0], v[1]];
  const used = cons.filter((c) => names(c).every((n) => p[n]));
  const before = ring.length >= 3 && ring.every((n) => p[n]) ? signs(p, ring) : [];
  const minLen = Math.min(...Object.keys(p).map((n) => Object.keys(p).filter((m) => m !== n).reduce((s, m) => Math.min(s, Math.hypot(p[n][0] - p[m][0], p[n][1] - p[m][1])), Infinity)));
  p[pin] = [to[0], to[1]];
  const h = 1e-6;
  for (let it = 0; it < iters; it++) {
    let worst = 0;
    for (const c of used) {
      const ns = names(c);
      const f = val(c, p);
      worst = Math.max(worst, Math.abs(f));
      if (Math.abs(f) < 1e-12) continue;
      const g: number[] = [];
      for (const n of ns) {
        for (let ax = 0; ax < 2; ax++) {
          p[n][ax] += h;
          g.push((val(c, p) - f) / h);
          p[n][ax] -= h;
        }
      }
      let den = 0;
      ns.forEach((n, i) => {
        if (n !== pin && n !== anchor) den += g[2 * i] ** 2 + g[2 * i + 1] ** 2;
      });
      if (den < 1e-18) continue;
      ns.forEach((n, i) => {
        if (n === pin || n === anchor) return;
        p[n][0] -= (f * g[2 * i]) / den;
        p[n][1] -= (f * g[2 * i + 1]) / den;
      });
    }
    if (worst < 1e-9) break;
  }
  if (used.some((c) => Math.abs(val(c, p)) > 1e-5)) return null;
  const after = before.length ? signs(p, ring) : [];
  if (before.some((s, i) => s !== after[i])) return null;
  const short = Object.keys(p).some((n) => Object.keys(p).some((m) => m !== n && Math.hypot(p[n][0] - p[m][0], p[n][1] - p[m][1]) < minLen * 0.15));
  return short ? null : p;
}

/**
 * Kéo kiểu tự nhiên: giữ yên đỉnh xa nhất (hình quay/co giãn quanh nó, không trôi); nếu không giải được thì thả neo.
 * Dùng cho cả hình dựng từ đề lẫn hình vẽ tay.
 */
export function solveDragNatural(pts: Record<string, P2>, cons: Cons[], pin: string, to: P2, ring: string[] = []): Record<string, P2> | null {
  if (cons.length === 0) return solveDrag(pts, cons, pin, to, ring);
  let far = '';
  let best = -1;
  for (const [n, v] of Object.entries(pts)) {
    if (n === pin) continue;
    const d = Math.hypot(v[0] - pts[pin][0], v[1] - pts[pin][1]);
    if (d > best) {
      best = d;
      far = n;
    }
  }
  return (far ? solveDrag(pts, cons, pin, to, ring, 160, far) : null) ?? solveDrag(pts, cons, pin, to, ring);
}
