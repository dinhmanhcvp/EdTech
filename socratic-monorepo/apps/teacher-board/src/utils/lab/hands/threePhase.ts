/** Bài thực hành tay: đấu động cơ không đồng bộ 3 pha vào lưới 380 V. Logic thuần, không phụ thuộc hiển thị. */

export const TERMS = ['L1', 'L2', 'L3', 'PE', 'U1', 'V1', 'W1', 'W2', 'U2', 'V2', 'GND'] as const;
/** GND = bu lông nối đất trên vỏ động cơ; PE = thanh nối đất của tủ */
export type Term = (typeof TERMS)[number];
export type Wire = [Term, Term];
export type Source = 'L1' | 'L2' | 'L3' | 'PE';

const WINDINGS: Wire[] = [
  ['U1', 'U2'],
  ['V1', 'V2'],
  ['W1', 'W2'],
];
const UP = 380 / Math.sqrt(3);
const A120 = (2 * Math.PI) / 3;
/** điện áp pha dạng phức [re, im]; L2 chậm pha 120° so với L1 */
const SRC: Record<Source, [number, number]> = {
  L1: [UP, 0],
  L2: [UP * Math.cos(-A120), UP * Math.sin(-A120)],
  L3: [UP * Math.cos(A120), UP * Math.sin(A120)],
  PE: [0, 0],
};
const isSource = (t: Term): t is Source => t in SRC;

export const wireKey = (a: Term, b: Term): string => [a, b].sort().join('-');
export const SAMPLE: Record<'star' | 'delta' | 'short', Wire[]> = {
  short: [['L1', 'U1'], ['L2', 'U1']],
  star: [['L1', 'U1'], ['L2', 'V1'], ['L3', 'W1'], ['W2', 'U2'], ['U2', 'V2'], ['PE', 'GND']],
  delta: [['L1', 'U1'], ['L2', 'V1'], ['L3', 'W1'], ['U1', 'W2'], ['V1', 'U2'], ['W1', 'V2'], ['PE', 'GND']],
};

/** Gom các cọc nối nhau bằng dây thành nút điện; trả hàm tìm nút đại diện. */
function nets(wires: Wire[]): (t: Term) => Term {
  const par = new Map<Term, Term>(TERMS.map((t) => [t, t]));
  const find = (t: Term): Term => {
    let r = t;
    while (par.get(r) !== r) r = par.get(r)!;
    return r;
  };
  for (const [a, b] of wires) par.set(find(a), find(b));
  return find;
}

/** Nguồn (pha / đất) đang tới mỗi cọc; dùng để tô màu dây. Nút chập hai nguồn lấy nguồn gặp trước. */
export function netSources(wires: Wire[]): Record<Term, Source | null> {
  const find = nets(wires);
  const of = new Map<Term, Source>();
  for (const t of TERMS) if (isSource(t) && !of.has(find(t))) of.set(find(t), t);
  return Object.fromEntries(TERMS.map((t) => [t, of.get(find(t)) ?? null])) as Record<Term, Source | null>;
}

export type Verdict =
  | {kind: 'short'; between: [Source, Source]; earthed: boolean}
  | {kind: 'live_frame'; phase: Source; earthed: false}
  | {kind: 'dead'; earthed: boolean}
  | {kind: 'unbalanced'; u: number[]; earthed: boolean}
  | {kind: 'run'; conn: 'star' | 'delta'; load: 'ok' | 'over' | 'under'; dir: 1 | -1; u: number[]; earthed: boolean};

/**
 * Kết quả khi đóng aptomat. Ba cuộn dây coi như ba trở kháng bằng nhau; điện thế các nút tự do giải bằng phương pháp
 * điện thế nút (trở kháng bằng nhau nên triệt tiêu: mỗi nút tự do là trung bình các nút bên kia cuộn dây).
 * `rated` = điện áp định mức của MỘT cuộn dây (220 V với động cơ Δ/Y 220/380 V; 380 V với động cơ Δ/Y 380/660 V).
 */
export function evaluate(wires: Wire[], rated: number): Verdict {
  const find = nets(wires);
  const fixed = new Map<Term, Source>();
  for (const t of TERMS) {
    if (!isSource(t)) continue;
    const r = find(t);
    const had = fixed.get(r);
    if (had) return {kind: 'short', between: [had, t], earthed: find('GND') === find('PE')};
    fixed.set(r, t);
  }
  const earthed = find('GND') === find('PE');
  const frame = fixed.get(find('GND'));
  if (frame && frame !== 'PE') return {kind: 'live_frame', phase: frame, earthed: false};

  // nút tự do có cuộn dây chạm vào
  const free = [...new Set(WINDINGS.flat().map(find).filter((r) => !fixed.has(r)))];
  const n = free.length;
  // ma trận mở rộng [A | re | im]; rò 1e-9 xuống đất để nhóm nút không nối nguồn không làm ma trận suy biến
  const M = free.map(() => new Array<number>(n + 2).fill(0));
  free.forEach((_, i) => (M[i][i] = 1e-9));
  for (const [a, b] of WINDINGS) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue;
    for (const [x, y] of [[ra, rb], [rb, ra]]) {
      const i = free.indexOf(x);
      if (i < 0) continue;
      M[i][i] += 1;
      const j = free.indexOf(y);
      if (j >= 0) M[i][j] -= 1;
      else {
        const [re, im] = SRC[fixed.get(y)!];
        M[i][n] += re;
        M[i][n + 1] += im;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n + 2; k++) M[r][k] -= f * M[c][k];
    }
  }
  const volt = (t: Term): [number, number] => {
    const r = find(t);
    const src = fixed.get(r);
    if (src) return SRC[src];
    const i = free.indexOf(r);
    return [M[i][n] / M[i][i], M[i][n + 1] / M[i][i]];
  };
  const ph = WINDINGS.map(([a, b]) => {
    const [ar, ai] = volt(a);
    const [br, bi] = volt(b);
    return [ar - br, ai - bi];
  });
  const u = ph.map(([re, im]) => Math.hypot(re, im));
  const max = Math.max(...u);
  if (max < 1) return {kind: 'dead', earthed};
  // từ trường quay cần ba điện áp bằng nhau VÀ lệch pha 120° (tổng bằng 0); bằng nhau mà cùng pha thì không quay
  const sum = Math.hypot(ph[0][0] + ph[1][0] + ph[2][0], ph[0][1] + ph[1][1] + ph[2][1]);
  if (max - Math.min(...u) > 0.05 * max || sum > 0.05 * max) return {kind: 'unbalanced', u, earthed};
  const cross = ph[0][0] * ph[1][1] - ph[0][1] * ph[1][0]; // < 0: cuộn V chậm pha hơn cuộn U → quay thuận
  const k = max / rated;
  return {kind: 'run', conn: max > 300 ? 'delta' : 'star', load: k > 1.2 ? 'over' : k < 0.8 ? 'under' : 'ok', dir: cross < 0 ? 1 : -1, u, earthed};
}

const V10 = (v: number) => `${Math.round(v / 10) * 10} V`;

/** Dòng trạng thái và lời giải thích cho học sinh. `ok` = đạt yêu cầu bài. */
export function explain(v: Verdict): {ok: boolean; danger: boolean; head: string; body: string} {
  switch (v.kind) {
    case 'short':
      return {ok: false, danger: true, head: `Ngắn mạch ${v.between.join('–')}: aptomat nhảy`, body: v.between.includes('PE') ? 'Một dây pha đang nối thẳng xuống đất. Dòng điện tăng vọt nên aptomat cắt ngay.' : 'Hai dây pha nối thẳng vào nhau, không qua cuộn dây nào. Dòng ngắn mạch rất lớn nên aptomat cắt ngay.'};
    case 'live_frame':
      return {ok: false, danger: true, head: `Vỏ động cơ mang điện pha ${v.phase}`, body: 'Dây pha đang nối vào bu lông vỏ máy mà vỏ chưa nối đất. Chạm vào vỏ sẽ bị điện giật. Aptomat chống giật cắt mạch.'};
    case 'dead':
      return {ok: false, danger: false, head: 'Chưa có dòng điện qua cuộn dây', body: 'Mỗi cuộn dây cần hai đầu ở hai điện thế khác nhau. Hãy nối các đầu U1, V1, W1 với ba pha rồi đấu sao hoặc tam giác.'};
    case 'unbalanced':
      return {ok: false, danger: true, head: 'Động cơ rung, kêu ù, không khởi động được', body: `Điện áp trên ba cuộn không cân bằng (${v.u.map(V10).join(' · ')}): mất pha hoặc đấu thiếu dây. Không có từ trường quay, cuộn dây nóng rất nhanh.`};
    case 'run': {
      const conn = v.conn === 'star' ? 'Đấu sao (Y)' : 'Đấu tam giác (Δ)';
      const dir = v.dir > 0 ? 'quay thuận' : 'quay ngược (đổi chỗ hai dây pha bất kì để đảo chiều)';
      if (v.load === 'over') return {ok: false, danger: true, head: `${conn}: quá áp, cuộn dây bốc khói`, body: `Mỗi cuộn đang chịu ${V10(v.u[0])}, cao hơn định mức. Động cơ quay nhưng nóng dần và rơ-le nhiệt sẽ cắt mạch. Với lưới 380 V, động cơ này phải đấu sao.`};
      if (v.load === 'under') return {ok: false, danger: false, head: `${conn}: động cơ chạy yếu`, body: `Mỗi cuộn chỉ nhận ${V10(v.u[0])}, thấp hơn định mức, nên mô-men chỉ còn khoảng một phần ba. Với lưới 380 V, động cơ này phải đấu tam giác.`};
      if (!v.earthed) return {ok: false, danger: false, head: `${conn}: chạy đúng định mức nhưng chưa nối đất`, body: `Động cơ ${dir}, mỗi cuộn nhận ${V10(v.u[0])}. Còn thiếu dây nối bu lông vỏ máy với thanh PE: nếu cách điện hỏng, vỏ máy sẽ mang điện.`};
      return {ok: true, danger: false, head: `${conn}: chạy đúng định mức`, body: `Động cơ ${dir}, mỗi cuộn nhận ${V10(v.u[0])}, vỏ máy đã nối đất.`};
    }
  }
}
