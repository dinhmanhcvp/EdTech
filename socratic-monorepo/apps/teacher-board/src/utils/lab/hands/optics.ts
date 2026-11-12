/** Bàn quang học: dò tia laser qua các gương phẳng trên mặt bàn (toạ độ x sang phải, z về phía người làm). Logic thuần. */

export interface Mirror {
  x: number;
  z: number;
  /** hướng của mặt gương trên mặt bàn (rad); gương phản xạ cả hai mặt */
  a: number;
}
type P2 = [number, number];

export const MIRROR_LEN = 0.7;
export const BENCH = {
  /** vùng đặt gương */
  min: [-3.6, -2.4] as P2,
  max: [3.0, 1.5] as P2,
  laser: {x: -3.2, z: -1.6, dir: [1, 0] as P2},
  /** vách chắn sáng */
  wall: [[-0.3, -2.6], [-0.3, -0.6]] as [P2, P2],
  /** đầu thu: `face` = hướng miệng ống; tia phải đi ngược hướng này, lệch không quá `tol` độ, mới lọt tới cảm biến */
  detector: {x: 2.5, z: -1.6, face: [0, 1] as P2, r: 0.18, tol: 6},
};
export const START: Mirror[] = [-2, -1, 0].map((x) => ({x, z: 1.2, a: 0}));
/** lời giải mẫu ba gương vuông góc */
export const SAMPLE_MIRRORS: Mirror[] = [
  {x: -1.5, z: -1.6, a: Math.PI / 4},
  {x: -1.5, z: 0.6, a: Math.PI / 4},
  {x: 2.5, z: 0.6, a: -Math.PI / 4},
];

export interface Trace {
  /** các điểm gãy của tia, bắt đầu từ laser */
  path: P2[];
  /** tia chạm miệng đầu thu từ phía trước */
  hit: boolean;
  /** chạm và đúng hướng trục ống: đầu thu nhận đủ tín hiệu */
  aligned: boolean;
  /** độ lệch so với trục ống (độ) khi chạm */
  off: number;
  /** lần phản xạ: gương thứ mấy, góc tới = góc phản xạ (độ) */
  bounces: {mirror: number; deg: number}[];
}

/** tia (o, d) cắt đoạn ab: trả khoảng cách dọc tia, hoặc null */
function cut(o: P2, d: P2, a: P2, b: P2): number | null {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const den = d[0] * ez - d[1] * ex;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a[0] - o[0]) * ez - (a[1] - o[1]) * ex) / den;
  const u = ((a[0] - o[0]) * d[1] - (a[1] - o[1]) * d[0]) / den;
  return t > 1e-6 && u >= 0 && u <= 1 ? t : null;
}
const ends = (m: Mirror): [P2, P2] => {
  const hx = (Math.cos(m.a) * MIRROR_LEN) / 2;
  const hz = (Math.sin(m.a) * MIRROR_LEN) / 2;
  return [[m.x - hx, m.z - hz], [m.x + hx, m.z + hz]];
};
export const clampMirror = (m: Mirror): Mirror => ({a: m.a, x: Math.min(Math.max(m.x, BENCH.min[0]), BENCH.max[0]), z: Math.min(Math.max(m.z, BENCH.min[1]), BENCH.max[1])});

export function trace(mirrors: Mirror[]): Trace {
  const det = BENCH.detector;
  const mouth: [P2, P2] = [[det.x + det.face[1] * det.r, det.z - det.face[0] * det.r], [det.x - det.face[1] * det.r, det.z + det.face[0] * det.r]];
  let o: P2 = [BENCH.laser.x, BENCH.laser.z];
  let d: P2 = BENCH.laser.dir;
  const out: Trace = {path: [o], hit: false, aligned: false, off: 0, bounces: []};
  for (let n = 0; n < 12; n++) {
    let best = 14; // ra khỏi bàn
    let what = -2; // −2 ra ngoài, −1 vách, −3 đầu thu, ≥ 0 gương
    const tryCut = (seg: [P2, P2], id: number) => {
      const t = cut(o, d, seg[0], seg[1]);
      if (t !== null && t < best) {
        best = t;
        what = id;
      }
    };
    tryCut(BENCH.wall, -1);
    tryCut(mouth, -3);
    mirrors.forEach((m, i) => tryCut(ends(m), i));
    o = [o[0] + d[0] * best, o[1] + d[1] * best];
    out.path.push(o);
    if (what === -3) {
      const cos = -(d[0] * det.face[0] + d[1] * det.face[1]);
      out.hit = cos > 0;
      out.off = (Math.acos(Math.min(1, Math.abs(cos))) * 180) / Math.PI;
      out.aligned = out.hit && out.off <= det.tol;
    }
    if (what < 0) break;
    const nx = -Math.sin(mirrors[what].a);
    const nz = Math.cos(mirrors[what].a);
    const dot = d[0] * nx + d[1] * nz;
    out.bounces.push({mirror: what, deg: (Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI});
    d = [d[0] - 2 * dot * nx, d[1] - 2 * dot * nz];
  }
  return out;
}
