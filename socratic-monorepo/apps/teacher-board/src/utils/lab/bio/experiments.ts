import {C, box, dot, gauss, ln, ring, seeded, tube, txt} from '../../presets/sceneKit';
import type {Shape} from '../../presets/types';
import {linearFit, mean, noisy} from '../phys/engine';
import type {PhysAction, PhysExperiment, Row} from '../phys/types';

// Sinh dùng chung khung đo đạc của phòng Lý (PhysBench): biến số đặt bằng thanh trượt/ô chọn, nhóm đối chứng là một lựa chọn,
// mỗi lần "Đo" là một lần quan sát có sai khác ngẫu nhiên giữa các mẫu sinh vật.

const M: PhysAction = {type: 'measure'};
const rep = (n: number): PhysAction[] => Array.from({length: n}, () => M);
const setp = (key: string, value: number): PhysAction => ({type: 'set', key, value});
const ch = (key: string, value: string): PhysAction => ({type: 'choose', key, value});
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toLocaleString('vi-VN', {maximumFractionDigits: d}) : '—');
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const where = (rows: Row[], pred: (r: Row) => boolean) => rows.filter(pred);
const avg = (rows: Row[], key: string) => mean(rows.map((r) => r[key]));
/** chỉ số (1…) của lựa chọn trong danh sách: lưu vào bảng số liệu dạng số */
const code = (opts: [string, string][], v: string) => opts.findIndex((o) => o[0] === v) + 1;
const binom = (n: number, p: number, rng: () => number) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng() < p) k++;
  return k;
};
const poisson = (lam: number, rng: () => number) => {
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
};
const variance = (xs: number[]) => {
  const m = mean(xs);
  return xs.length > 1 ? xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) : NaN;
};
const mode = (xs: number[]) => {
  const cnt = new Map<number, number>();
  for (const x of xs) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  let best = NaN;
  let n = 0;
  for (const [x, c] of cnt) if (c > n) [best, n] = [x, c];
  return best;
};
const lcd = (x: number, y: number, w: number, text: string): Shape[] => [box(x, y, w, 26, '#14532D', '#052E16'), txt(x + w / 2, y + 18, text, {size: 13, fill: '#4ADE80', bold: true})];
/** Thị trường kính hiển vi: nền tối, vòng sáng tâm (280, 110) bán kính 100. */
const scope = (inner: Shape[], label: string): Shape[] => [
  box(0, 0, 560, 220, '#1C1917'),
  {t: 'circle', cx: 280, cy: 110, r: 100, fill: '#FEFCE8'},
  ...inner,
  ring(280, 110, 100, '#44403C', 10),
  txt(548, 210, label, {size: 11, fill: '#E7E5E4', anchor: 'end'}),
];
/** các ô lưới nằm trong thị trường */
const field = (w: number, h: number): [number, number][] => {
  const out: [number, number][] = [];
  // cả tế bào nằm trong vòng sáng: tâm cách tâm thị trường không quá (bán kính − nửa đường chéo)
  const lim = 96 - Math.hypot(w, h) / 2;
  for (let y = 110 - 96 + h / 2; y < 206; y += h) for (let x = 280 - 96 + w / 2; x < 376; x += w) if (Math.hypot(x - 280, y - 110) <= lim) out.push([x, y]);
  return out.length ? out : [[280, 110]];
};
const bar = (x: number, base: number, w: number, h: number, color: string, label: string, value: string): Shape[] => [box(x, base - h, w, h, color), txt(x + w / 2, base + 14, label, {size: 10}), txt(x + w / 2, base - h - 5, value, {size: 10, bold: true})];
const ground = (y: number): Shape => ln(20, y, 540, y, {stroke: '#78716C', w: 3});

const SAMPLES: [string, string][] = [['starch', 'Dịch khoai tây'], ['glucose', 'Nước nho'], ['protein', 'Lòng trắng trứng'], ['lipid', 'Dầu ăn'], ['water', 'Nước cất (đối chứng)']];
const REAGENTS: [string, string][] = [['iodine', 'Iodine (Lugol)'], ['benedict', 'Benedict, đun cách thủy'], ['biuret', 'Biuret (NaOH + CuSO₄)'], ['sudan', 'Sudan III']];
const REAGENT_COLOR = [['#CA8A04', '#1E1B4B'], ['#3B82F6', '#C2410C'], ['#93C5FD', '#7C3AED'], ['#FECACA', '#DC2626']];

const CELL_SAMPLES: [string, string][] = [['onion', 'Biểu bì vảy hành'], ['cheek', 'Niêm mạc miệng'], ['yeast', 'Nấm men']];
const CELL_SIZE = [250, 60, 8];
const OBJ: [string, string][] = [['4', 'Vật kính 4×'], ['10', 'Vật kính 10×'], ['40', 'Vật kính 40×']];

const PLASMO: [string, string][] = [['water', 'Nước cất (đối chứng)'], ['salt', 'Dung dịch NaCl 8%'], ['rinse', 'Nhỏ nước cất sau khi co']];
const SURVEY: [string, string][] = [['flu', 'Cúm mùa'], ['dengue', 'Sốt xuất huyết'], ['hfmd', 'Tay chân miệng']];
const TRANSP: [string, string][] = [['full', 'Đủ lá (đối chứng)'], ['lower', 'Bôi vaseline mặt dưới lá'], ['upper', 'Bôi vaseline mặt trên lá'], ['none', 'Ngắt hết lá']];
const BANDS: [string, string][] = [['car', 'Carotene (vàng cam)'], ['xan', 'Xanthophyll (vàng)'], ['chla', 'Diệp lục a (xanh lam)'], ['chlb', 'Diệp lục b (xanh vàng)']];
const RF = [0.95, 0.75, 0.5, 0.35];
const BAND_COLOR = ['#F97316', '#FACC15', '#0F766E', '#65A30D'];
const TROP: [string, string][] = [['light', 'Hướng sáng'], ['gravity', 'Hướng trọng lực'], ['water', 'Hướng nước']];
const TROP_MAX = [60, 80, 40];
const META: [string, string][] = [['frog', 'Ếch'], ['butterfly', 'Bướm'], ['grasshopper', 'Châu chấu']];
const META_STAGES: [number, string, number][][] = [
  [[0, 'Trứng', 2], [5, 'Nòng nọc', 12], [25, 'Nòng nọc có chân', 30], [45, 'Ếch con', 22]],
  [[0, 'Trứng', 1], [4, 'Sâu', 25], [18, 'Nhộng', 20], [28, 'Bướm', 30]],
  [[0, 'Trứng', 4], [15, 'Châu chấu non (chưa có cánh)', 12], [45, 'Châu chấu trưởng thành', 40]],
];
const stageOf = (sp: number, d: number) => {
  const st = META_STAGES[sp - 1];
  let k = 0;
  st.forEach(([d0], i) => {
    if (d >= d0) k = i;
  });
  return k;
};
const PROP: [string, string][] = [['cutting', 'Giâm cành'], ['layering', 'Chiết cành'], ['grafting', 'Ghép cành'], ['pollination', 'Thụ phấn nhân tạo']];
const PROP_P = [[0.85, 0.4], [0.8, 0.45], [0.8, 0.2], [0.8, 0.05]];
const CHROMO: [string, string][] = [['normal', 'Bình thường 2n'], ['trisomy', 'Thể ba 2n + 1'], ['triploid', 'Tam bội 3n'], ['tetraploid', 'Tứ bội 4n']];
const CHROMO_N = [16, 17, 24, 32];
const SITES: [string, string][] = [['A', 'Khu A: bãi cỏ trồng'], ['B', 'Khu B: đồi cỏ tự nhiên'], ['C', 'Khu C: ven suối']];
const COMM: [string, string][] = [['forest', 'Rừng thứ sinh'], ['grass', 'Đồng cỏ'], ['rice', 'Ruộng lúa']];
const COMM_LAM = [[8, 6, 5, 4, 3], [20, 6, 3, 1, 0.5], [40, 2, 1, 0.3, 0.2]];
const simpson = (rows: Row[]) => {
  const tot = ['a', 'b', 'c', 'd', 'e'].map((k) => rows.reduce((s, r) => s + r[k], 0));
  const n = tot.reduce((a, b) => a + b, 0);
  return n ? 1 - tot.reduce((s, x) => s + (x / n) ** 2, 0) : NaN;
};

const yes: [string, string][] = [['no', 'Chưa'], ['yes', 'Rồi']];

/** Các bài thực hành Sinh học 10–12 (KNTT): có nhóm đối chứng, kính hiển vi ảo, số liệu khác nhau giữa các mẫu. */
export const BIO_EXPERIMENTS: PhysExperiment[] = [
  {
    id: 'BIOMOLECULES',
    lesson: 'Sinh 10, bài 6',
    title: 'Thực hành nhận biết một số phân tử sinh học',
    goal: 'Dùng thuốc thử đặc trưng nhận biết tinh bột, đường khử, protein và lipid; so sánh với ống đối chứng nước cất.',
    hazards: ['Đeo kính khi đun ống nghiệm, hướng miệng ống ra xa người', 'NaOH ăn da: rửa ngay bằng nhiều nước nếu dính tay'],
    apparatus: 'Ống nghiệm, giá, đèn cồn hoặc nồi cách thủy, ống nhỏ giọt; dịch khoai tây, nước nho, lòng trắng trứng, dầu ăn, nước cất; iodine, Benedict, biuret, Sudan III',
    sliders: [],
    choices: [
      {key: 'sample', label: 'Mẫu thử', value: 'starch', options: SAMPLES},
      {key: 'reagent', label: 'Thuốc thử', value: 'iodine', options: REAGENTS},
    ],
    columns: [{key: 'x', label: 'Mẫu (1 khoai tây … 5 nước cất)', digits: 0}, {key: 'r', label: 'Thuốc thử (1 iodine, 2 Benedict, 3 biuret, 4 Sudan)', digits: 0}, {key: 'pos', label: 'Dương tính (1 có, 0 không)', digits: 0}],
    measure: (_p, s) => {
      const x = code(SAMPLES, s.sample);
      const r = code(REAGENTS, s.reagent);
      return {x, r, pos: x === r ? 1 : 0};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => {
      const r = last ? last.r : code(REAGENTS, s.reagent);
      const color = last ? REAGENT_COLOR[last.r - 1][last.pos] : '#E0F2FE';
      return [
        ...tube(150, 30, 160, color, 0.55),
        txt(150, 212, last ? SAMPLES[last.x - 1][1] : 'Chưa thử', {size: 12, bold: true}),
        txt(330, 70, `Thuốc thử: ${REAGENTS[r - 1][1]}`, {size: 13, anchor: 'start'}),
        txt(330, 100, last ? (last.pos ? 'Đổi màu đặc trưng: DƯƠNG TÍNH' : 'Không đổi màu đặc trưng: âm tính') : 'Chọn mẫu, thuốc thử rồi bấm "Đo"', {size: 13, anchor: 'start', bold: true, fill: last?.pos ? C.green : C.ink}),
        txt(330, 130, 'iodine → xanh tím đen · Benedict → đỏ gạch', {size: 11, anchor: 'start', fill: '#78716C'}),
        txt(330, 150, 'biuret → tím · Sudan III → đỏ cam (lớp dầu)', {size: 11, anchor: 'start', fill: '#78716C'}),
      ];
    },
    results: (rows) => [
      {key: 'found', label: 'Số cặp mẫu – thuốc thử dương tính đã tìm', value: new Set(where(rows, (r) => r.pos === 1).map((r) => r.x)).size, digits: 0},
      {key: 'ctrl', label: 'Số thuốc thử đã thử trên ống đối chứng', value: new Set(where(rows, (r) => r.x === 5).map((r) => r.r)).size, digits: 0},
    ],
    verdict: (c) => (c.results.found === 4 && c.results.ctrl >= 2 ? {ok: true, text: 'Em đã nhận biết đủ bốn nhóm chất và có ống đối chứng không đổi màu.'} : {ok: false, text: 'Hãy tìm đủ bốn phản ứng đặc trưng và thử ít nhất hai thuốc thử trên ống nước cất để đối chứng.'}),
    steps: [
      ...SAMPLES.slice(0, 4).map(([, name], i) => ({text: `Nhận biết: ${name} cho phản ứng dương tính`, done: (c: {rows: Row[]}) => c.rows.some((r) => r.x === i + 1 && r.pos === 1)})),
      {text: 'Thử ít nhất 2 thuốc thử trên ống đối chứng nước cất', done: (c) => c.results.ctrl >= 2},
    ],
    questions: [
      {q: 'Ống nước cất trong thí nghiệm này để làm gì?', options: ['Làm đối chứng: chắc chắn màu đổi là do chất cần nhận biết', 'Pha loãng thuốc thử', 'Làm nguội ống nghiệm', 'Không cần thiết'], answer: 0, why: 'So với ống đối chứng không có chất cần thử mới kết luận được sự đổi màu là do chất đó.'},
      {q: 'Thuốc thử Benedict cần điều kiện gì để cho kết tủa đỏ gạch với đường khử?', options: ['Đun nóng', 'Làm lạnh', 'Thêm iodine', 'Để trong tối'], answer: 0, why: 'Phản ứng khử Cu²⁺ thành Cu₂O (đỏ gạch) chỉ xảy ra rõ khi đun.'},
    ],
    keywords: /nhan biet (?:mot so )?phan tu sinh hoc|nhan biet tinh bot,? duong khu,? protein|thuoc thu benedict va biuret/,
    examples: ['thực hành nhận biết một số phân tử sinh học', 'thực hành thuốc thử Benedict và biuret'],
    script: [ch('sample', 'starch'), ch('reagent', 'iodine'), M, ch('sample', 'glucose'), ch('reagent', 'benedict'), M, ch('sample', 'protein'), ch('reagent', 'biuret'), M, ch('sample', 'lipid'), ch('reagent', 'sudan'), M, ch('sample', 'water'), ch('reagent', 'iodine'), M, ch('reagent', 'benedict'), M],
  },
  {
    id: 'CELL_OBSERVE',
    lesson: 'Sinh 10, bài 9',
    title: 'Thực hành quan sát tế bào dưới kính hiển vi',
    goal: 'Làm tiêu bản, lấy nét từ vật kính nhỏ đến lớn, quan sát và đo kích thước tế bào biểu bì hành, niêm mạc miệng, nấm men.',
    hazards: ['Cầm kính hiển vi bằng hai tay (một tay thân, một tay đế)', 'Ở vật kính 40× chỉ dùng ốc vi cấp để không làm vỡ tiêu bản'],
    apparatus: 'Kính hiển vi quang học, lam kính, lamen, kim mũi mác, thước trắc vi thị kính, củ hành, tăm sạch, dung dịch xanh methylene',
    sliders: [{key: 'focus', label: 'Ốc chỉnh nét (0 = nét)', min: -10, max: 10, step: 1, value: 6}],
    choices: [
      {key: 'sample', label: 'Tiêu bản', value: 'onion', options: CELL_SAMPLES},
      {key: 'obj', label: 'Vật kính', value: '4', options: OBJ},
    ],
    columns: [{key: 'x', label: 'Tiêu bản (1 hành, 2 miệng, 3 nấm men)', digits: 0}, {key: 'o', label: 'Vật kính (×)', digits: 0}, {key: 'sh', label: 'Đã nét (1/0)', digits: 0}, {key: 'L', label: 'Chiều dài tế bào', unit: 'µm', digits: 0}],
    measure: (p, s, rng) => {
      const x = code(CELL_SAMPLES, s.sample);
      const o = Number(s.obj);
      const res = o === 40 ? 2 : o === 10 ? 10 : 25;
      return {x, o, sh: Math.abs(p.focus) <= 1 ? 1 : 0, L: Math.max(res, noisy(CELL_SIZE[x - 1], CELL_SIZE[x - 1] * 0.12, res, rng))};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const x = code(CELL_SAMPLES, s.sample);
      const k = Number(s.obj) * 0.012;
      const L = Math.max(3, CELL_SIZE[x - 1] * k);
      const o = Math.abs(p.focus) <= 1 ? 1 : Math.max(0.15, 0.7 - Math.abs(p.focus) * 0.06);
      const cells: Shape[] =
        x === 1
          ? field(L, L * 0.35).flatMap(([cx, cy]): Shape[] => [{t: 'rect', x: cx - L / 2, y: cy - L * 0.175, w: L, h: L * 0.35, fill: '#FDF4FF', stroke: '#86198F', o}, {t: 'circle', cx: cx - L * 0.2, cy, r: Math.max(1.5, L * 0.05), fill: '#86198F', o}])
          : x === 2
            ? field(L * 1.2, L * 1.1).flatMap(([cx, cy]): Shape[] => [{t: 'circle', cx, cy, r: L / 2, fill: '#DBEAFE', stroke: '#1D4ED8', o}, {t: 'circle', cx, cy, r: Math.max(1.5, L * 0.12), fill: '#1E3A8A', o}])
            : field(Math.max(8, L * 2.2), Math.max(8, L * 2)).map(([cx, cy]): Shape => ({t: 'circle', cx, cy, r: L / 2, fill: '#FDE68A', stroke: '#92400E', o}));
      return scope(cells, `${CELL_SAMPLES[x - 1][1]} · ${s.obj}×${Math.abs(p.focus) <= 1 ? '' : ' · chưa nét'}`);
    },
    results: (rows) =>
      CELL_SAMPLES.map(([key, name], i) => ({key, label: `Chiều dài trung bình (${name}, 40×, đã nét)`, value: avg(where(rows, (r) => r.x === i + 1 && r.o === 40 && r.sh === 1), 'L'), unit: 'µm', digits: 0})),
    verdict: (c) =>
      Math.abs(c.results.onion - 250) <= 50 && Math.abs(c.results.cheek - 60) <= 15
        ? {ok: true, text: `Tế bào biểu bì hành ≈ ${f(c.results.onion, 0)} µm, tế bào niêm mạc miệng ≈ ${f(c.results.cheek, 0)} µm: tế bào thực vật lớn hơn nhiều.`}
        : {ok: false, text: 'Cần đo ở vật kính 40× khi đã lấy nét, mỗi tiêu bản hành và niêm mạc miệng ít nhất 3 tế bào.'},
    steps: [
      {text: 'Quan sát ở vật kính nhỏ (4× hoặc 10×) trước', done: (c) => c.rows.some((r) => r.o < 40)},
      {text: 'Lấy nét (ốc chỉnh nét về 0)', done: (c) => Math.abs(c.p.focus) <= 1},
      {text: 'Đo ít nhất 3 tế bào biểu bì hành ở 40× khi đã nét', done: (c) => where(c.rows, (r) => r.x === 1 && r.o === 40 && r.sh === 1).length >= 3},
      {text: 'Đo ít nhất 3 tế bào niêm mạc miệng ở 40× khi đã nét', done: (c) => where(c.rows, (r) => r.x === 2 && r.o === 40 && r.sh === 1).length >= 3},
    ],
    questions: [
      {q: 'Vì sao phải quan sát ở vật kính nhỏ trước rồi mới chuyển sang vật kính lớn?', options: ['Thị trường rộng, dễ tìm mẫu và lấy nét', 'Vật kính lớn không có ánh sáng', 'Để tế bào to ra', 'Không có lí do'], answer: 0, why: 'Vật kính nhỏ có thị trường rộng và khoảng cách làm việc lớn, dễ tìm vùng cần xem, tránh chạm lamen.'},
      {q: 'Đặc điểm nào chỉ có ở tế bào biểu bì hành mà không có ở tế bào niêm mạc miệng?', options: ['Thành tế bào', 'Nhân', 'Màng sinh chất', 'Tế bào chất'], answer: 0, why: 'Tế bào thực vật có thành cellulose làm tế bào có hình đa giác đều đặn.'},
    ],
    keywords: /quan sat te bao (?:duoi |bang )?kinh hien vi|quan sat te bao bieu bi hanh|quan sat te bao niem mac mieng/,
    examples: ['thực hành quan sát tế bào dưới kính hiển vi', 'thực hành quan sát tế bào niêm mạc miệng'],
    script: [ch('obj', '10'), M, setp('focus', 0), ch('obj', '40'), ch('sample', 'onion'), ...rep(3), ch('sample', 'cheek'), ...rep(3)],
  },
  {
    id: 'PLASMOLYSIS',
    lesson: 'Sinh 10, bài 11',
    title: 'Thực hành thí nghiệm co và phản co nguyên sinh',
    goal: 'Quan sát tế bào biểu bì hành tím trong nước cất, trong dung dịch muối ưu trương và khi nhỏ lại nước cất; đo tỉ lệ diện tích khối nguyên sinh chất.',
    hazards: [],
    apparatus: 'Kính hiển vi, lam kính, lamen, giấy thấm, củ hành tím, nước cất, dung dịch NaCl 8%',
    sliders: [{key: 't', label: 'Thời gian ngâm', unit: 'phút', min: 0, max: 15, step: 1, value: 0}],
    choices: [{key: 'sol', label: 'Dung dịch', value: 'water', options: PLASMO}],
    columns: [{key: 'sol', label: 'Dung dịch (1 nước cất, 2 NaCl, 3 phản co)', digits: 0}, {key: 't', label: 't', unit: 'phút', digits: 0}, {key: 'R', label: 'Nguyên sinh chất / tế bào', unit: '%', digits: 0}],
    measure: (p, s, rng) => {
      const sol = code(PLASMO, s.sol);
      const [start, target] = [[100, 100], [100, 52], [52, 97]][sol - 1];
      return {sol, t: p.t, R: clamp(noisy(target + (start - target) * Math.exp(-p.t / 3), 2, 1, rng), 20, 100)};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => {
      const sol = code(PLASMO, s.sol);
      const [start, target] = [[100, 100], [100, 52], [52, 97]][sol - 1];
      const R = last && last.sol === sol && last.t === p.t ? last.R : target + (start - target) * Math.exp(-p.t / 3);
      const k = Math.sqrt(R / 100);
      const cells = field(70, 36).flatMap(([cx, cy]): Shape[] => [box(cx - 33, cy - 16, 66, 32, '#FAFAF9', '#57534E'), {t: 'rect', x: cx - 31 * k, y: cy - 14 * k, w: 62 * k, h: 28 * k, rx: 8, fill: '#C026D3', o: 0.75}]);
      return scope(cells, `${PLASMO[sol - 1][1]} · ${p.t} phút · ${f(R, 0)}%`);
    },
    chart: {x: 't', y: 'R', xLabel: 't (phút)', yLabel: 'Nguyên sinh chất (%)', fit: false},
    results: (rows) =>
      PLASMO.map(([key, name], i) => ({key, label: `Tỉ lệ sau ≥ 10 phút (${name})`, value: avg(where(rows, (r) => r.sol === i + 1 && r.t >= 10), 'R'), unit: '%', digits: 0})),
    verdict: (c) =>
      c.results.water > 95 && c.results.salt < 70 && c.results.rinse > 90
        ? {ok: true, text: `Trong NaCl 8% nguyên sinh chất co còn ≈ ${f(c.results.salt, 0)}%; nhỏ nước cất trở lại ≈ ${f(c.results.rinse, 0)}%: tế bào còn sống nên phản co được.`}
        : {ok: false, text: 'Cần đủ ba trường hợp, mỗi trường hợp có lần quan sát sau ít nhất 10 phút.'},
    steps: [
      {text: 'Quan sát đối chứng trong nước cất (≥ 10 phút)', done: (c) => c.rows.some((r) => r.sol === 1 && r.t >= 10)},
      {text: 'Quan sát trong NaCl 8% ở ít nhất 3 thời điểm', done: (c) => new Set(where(c.rows, (r) => r.sol === 2).map((r) => r.t)).size >= 3},
      {text: 'Thấy co nguyên sinh rõ (dưới 70%)', done: (c) => c.rows.some((r) => r.sol === 2 && r.R < 70)},
      {text: 'Nhỏ nước cất, quan sát phản co (≥ 10 phút)', done: (c) => c.rows.some((r) => r.sol === 3 && r.t >= 10)},
    ],
    questions: [
      {q: 'Vì sao nguyên sinh chất co lại trong dung dịch NaCl 8%?', options: ['Dung dịch ưu trương, nước đi ra khỏi tế bào', 'Muối đi vào làm tế bào chết ngay', 'Thành tế bào co lại', 'Ánh sáng kính hiển vi làm khô'], answer: 0, why: 'Nước di chuyển từ nơi thế nước cao (trong tế bào) ra nơi thế nước thấp (dung dịch ưu trương).'},
      {q: 'Hiện tượng phản co nguyên sinh chứng tỏ điều gì?', options: ['Tế bào còn sống', 'Tế bào đã chết', 'Thành tế bào bị phá', 'Muối không thấm vào'], answer: 0, why: 'Chỉ tế bào sống có màng bán thấm hoạt động mới hút nước trở lại.'},
    ],
    // câu có "nguyên sinh" / "thẩm thấu" mở mô phỏng khái niệm BIO_OSMOSIS_CELL (bộ định tuyến cũ chạy trước preset)
    keywords: /co (?:va )?phan co nguyen sinh|phan co nguyen sinh|te bao (?:bieu bi )?hanh tim (?:trong |ngam )?(?:dung dich )?(?:nuoc )?muoi/,
    examples: ['thực hành tế bào biểu bì hành tím trong dung dịch muối', 'thí nghiệm tế bào hành tím ngâm nước muối'],
    script: [ch('sol', 'water'), setp('t', 10), M, ch('sol', 'salt'), setp('t', 2), M, setp('t', 5), M, setp('t', 10), M, ch('sol', 'rinse'), setp('t', 10), M],
  },
  {
    id: 'ENZYME',
    lesson: 'Sinh 10, bài 15',
    title: 'Thực hành ảnh hưởng của nhiệt độ, pH, chất ức chế đến hoạt tính enzyme amylase',
    goal: 'Ủ tinh bột với amylase ở các nhiệt độ, pH khác nhau và khi có chất ức chế; đo thời gian đến khi iodine không còn chuyển xanh tím.',
    hazards: ['Cẩn thận nước nóng trong bể ổn nhiệt'],
    apparatus: 'Ống nghiệm, bể ổn nhiệt, nhiệt kế, đồng hồ bấm giờ, hồ tinh bột 1%, dịch amylase (nước bọt pha loãng), dung dịch đệm pH, CuSO₄ loãng, iodine',
    sliders: [
      {key: 'T', label: 'Nhiệt độ ủ', unit: '°C', min: 0, max: 90, step: 5, value: 37},
      {key: 'pH', label: 'pH dung dịch đệm', min: 3, max: 11, step: 1, value: 7},
    ],
    choices: [{key: 'inh', label: 'Chất ức chế', value: 'none', options: [['none', 'Không thêm'], ['cu', 'Thêm CuSO₄ (ion kim loại nặng)']]}],
    columns: [{key: 'T', label: 'T', unit: '°C', digits: 0}, {key: 'pH', label: 'pH', digits: 0}, {key: 'i', label: 'Ức chế (1/0)', digits: 0}, {key: 't', label: 'Thời gian mất màu', unit: 'phút', digits: 1}, {key: 'v', label: 'Tốc độ 100/t', digits: 1}],
    measure: (p, s, rng) => {
      const act = Math.exp(-(((p.T - 37) / 15) ** 2)) * Math.exp(-(((p.pH - 6.8) / 1.6) ** 2)) * (s.inh === 'cu' ? 0.15 : 1);
      const t = clamp(noisy(Math.min(60, 3 / Math.max(act, 0.05)), 0.25, 0.5, rng), 0.5, 60);
      return {T: p.T, pH: p.pH, i: s.inh === 'cu' ? 1 : 0, t, v: 100 / t};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => {
      const v = last ? last.v : 0;
      const color = !last ? '#1E1B4B' : v > 20 ? '#FDE68A' : v > 6 ? '#A16207' : '#1E1B4B';
      return [box(60, 90, 220, 110, '#BAE6FD', '#0369A1'), txt(170, 84, `Bể ổn nhiệt ${p.T} °C`, {size: 12, bold: true}), ...tube(130, 40, 150, color, 0.55), ...tube(210, 40, 150, '#1E1B4B', 0.55), txt(130, 214, 'Ống thí nghiệm', {size: 10}), txt(210, 214, 'Đối chứng (không enzyme)', {size: 10}), ...lcd(330, 60, 200, last ? `t = ${f(last.t)} phút` : 't = —'), txt(330, 120, `pH ${p.pH}${s.inh === 'cu' ? ' · có CuSO₄' : ''}`, {size: 13, anchor: 'start'}), txt(330, 150, 'Nhỏ iodine: còn tinh bột → xanh tím', {size: 11, anchor: 'start', fill: '#78716C'})];
    },
    chart: {x: 'T', y: 'v', xLabel: 'T (°C)', yLabel: 'Tốc độ (100/t)', fit: false},
    results: (rows) => {
      const best = (rs: Row[], key: string) => (rs.length ? rs.reduce((a, b) => (b.v > a.v ? b : a))[key] : NaN);
      const free = where(rows, (r) => r.i === 0);
      const sameT = where(rows, (r) => r.i === 1).map((r) => free.find((x) => x.T === r.T && x.pH === r.pH)?.t ?? NaN);
      return [
        {key: 'Topt', label: 'Nhiệt độ cho tốc độ lớn nhất (pH 7)', value: best(where(free, (r) => r.pH === 7), 'T'), unit: '°C', digits: 0},
        {key: 'pHopt', label: 'pH cho tốc độ lớn nhất (37 °C)', value: best(where(free, (r) => r.T === 37), 'pH'), digits: 0},
        {key: 'tFree', label: 'Thời gian không ức chế (cùng điều kiện)', value: mean(sameT), unit: 'phút', digits: 1},
        {key: 'tInh', label: 'Thời gian khi có CuSO₄', value: avg(where(rows, (r) => r.i === 1), 't'), unit: 'phút', digits: 1},
      ];
    },
    verdict: (c) =>
      c.results.Topt >= 30 && c.results.Topt <= 45 && c.results.pHopt >= 6 && c.results.pHopt <= 8 && c.results.tInh > c.results.tFree
        ? {ok: true, text: `Amylase hoạt động mạnh nhất quanh ${f(c.results.Topt, 0)} °C, pH ${f(c.results.pHopt, 0)}; CuSO₄ làm chậm phản ứng.`}
        : {ok: false, text: 'Cần đo ở nhiều nhiệt độ (pH 7), nhiều pH (37 °C) và một ống có CuSO₄ cùng điều kiện với một ống không có.'},
    steps: [
      {text: 'Đo ở ít nhất 4 nhiệt độ (pH 7, không ức chế)', done: (c) => new Set(where(c.rows, (r) => r.i === 0 && r.pH === 7).map((r) => r.T)).size >= 4},
      {text: 'Đo ở ít nhất 3 pH (37 °C, không ức chế)', done: (c) => new Set(where(c.rows, (r) => r.i === 0 && r.T === 37).map((r) => r.pH)).size >= 3},
      {text: 'Đo ống có chất ức chế CuSO₄', done: (c) => c.rows.some((r) => r.i === 1)},
    ],
    questions: [
      {q: 'Vì sao ở 80 °C tinh bột hầu như không bị phân giải?', options: ['Enzyme bị biến tính, mất cấu hình trung tâm hoạt động', 'Tinh bột bay hơi', 'Iodine bị phân hủy', 'Enzyme hoạt động quá nhanh'], answer: 0, why: 'Nhiệt độ cao phá vỡ liên kết giữ cấu trúc không gian của protein enzyme.'},
      {q: 'Ống đối chứng không có enzyme dùng để chứng minh điều gì?', options: ['Tinh bột không tự phân giải trong thời gian thí nghiệm', 'Iodine có màu xanh', 'Nhiệt độ đúng', 'pH đúng'], answer: 0, why: 'Nếu ống không enzyme vẫn xanh tím thì sự mất màu ở ống thí nghiệm là do amylase.'},
    ],
    keywords: /anh huong cua nhiet do,? ph.*enzyme|hoat tinh (?:cua )?(?:enzyme )?amylase|kiem tra hoat tinh amylase|chat uc che (?:den )?(?:hoat tinh )?enzyme/,
    examples: ['thực hành kiểm tra hoạt tính amylase', 'thực hành ảnh hưởng của nhiệt độ, pH đến hoạt tính enzyme'],
    script: [setp('T', 10), M, setp('T', 25), M, setp('T', 55), M, setp('T', 70), M, setp('T', 37), M, setp('pH', 5), M, setp('pH', 9), M, setp('pH', 7), ch('inh', 'cu'), M],
  },
  {
    id: 'MITOSIS_SLIDE',
    lesson: 'Sinh 10, bài 18',
    title: 'Thực hành làm và quan sát tiêu bản quá trình nguyên phân và giảm phân',
    goal: 'Nhuộm tiêu bản chóp rễ hành và bao phấn, đếm tế bào đang phân chia trong nhiều thị trường, tính chỉ số phân bào.',
    hazards: ['HCl và thuốc nhuộm: đeo găng, không để dính da, mắt'],
    apparatus: 'Rễ hành, nụ hoa (bao phấn), HCl 1 M, thuốc nhuộm orcein hoặc carmine acetic, kính hiển vi, lam kính, lamen',
    sliders: [],
    choices: [
      {key: 'sample', label: 'Tiêu bản', value: 'root', options: [['root', 'Chóp rễ hành (nguyên phân)'], ['anther', 'Bao phấn (giảm phân)']]},
      {key: 'stain', label: 'Đã nhuộm', value: 'no', options: yes},
    ],
    columns: [{key: 'x', label: 'Tiêu bản (1 rễ, 2 bao phấn)', digits: 0}, {key: 'n', label: 'Số tế bào', digits: 0}, {key: 'D', label: 'Đang phân chia', digits: 0}, {key: 'MI', label: 'Chỉ số phân bào', unit: '%', digits: 1}],
    measure: (_p, s, rng) => {
      const x = s.sample === 'root' ? 1 : 2;
      const n = 30 + Math.floor(rng() * 20);
      if (s.stain !== 'yes') return {x, n, D: NaN, MI: NaN};
      const D = binom(n, x === 1 ? 0.18 : 0.3, rng);
      return {x, n, D, MI: (100 * D) / n};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => {
      const stained = s.stain === 'yes';
      const frac = last && Number.isFinite(last.D) ? last.D / last.n : 0.2;
      const cells = field(30, 26).flatMap(([cx, cy], i): Shape[] => {
        const dividing = stained && (i * 0.618) % 1 < frac;
        return [box(cx - 14, cy - 12, 28, 24, stained ? '#FCE7F3' : '#F5F5F4', stained ? '#BE185D' : '#D6D3D1'), dividing ? ln(cx - 8, cy, cx + 8, cy, {stroke: '#831843', w: 4}) : dot(cx, cy, 4, stained ? '#9D174D' : '#E7E5E4')];
      });
      return scope(cells, `${s.sample === 'root' ? 'Chóp rễ hành' : 'Bao phấn'}${stained ? '' : ' · chưa nhuộm, khó phân biệt'}`);
    },
    results: (rows) => {
      const mi = (x: number) => {
        const rs = where(rows, (r) => r.x === x && Number.isFinite(r.D));
        const n = rs.reduce((a, r) => a + r.n, 0);
        return n ? (100 * rs.reduce((a, r) => a + r.D, 0)) / n : NaN;
      };
      return [
        {key: 'root', label: 'Chỉ số nguyên phân ở chóp rễ', value: mi(1), unit: '%', digits: 1},
        {key: 'anther', label: 'Tỉ lệ tế bào đang giảm phân ở bao phấn', value: mi(2), unit: '%', digits: 1},
      ];
    },
    verdict: (c) => (c.results.root >= 8 && c.results.root <= 30 ? {ok: true, text: `Chỉ số phân bào ở chóp rễ ≈ ${f(c.results.root)}%: phần lớn tế bào ở kì trung gian.`} : {ok: false, text: 'Hãy nhuộm tiêu bản và đếm ít nhất 5 thị trường ở chóp rễ.'}),
    steps: [
      {text: 'Nhuộm tiêu bản', done: (c) => c.s.stain === 'yes'},
      {text: 'Đếm ít nhất 5 thị trường ở chóp rễ', done: (c) => where(c.rows, (r) => r.x === 1 && Number.isFinite(r.D)).length >= 5},
      {text: 'Đếm ít nhất 3 thị trường ở bao phấn', done: (c) => where(c.rows, (r) => r.x === 2 && Number.isFinite(r.D)).length >= 3},
    ],
    questions: [
      {q: 'Vì sao phần lớn tế bào quan sát được ở kì trung gian?', options: ['Kì trung gian chiếm phần lớn thời gian chu kì tế bào', 'Tế bào đã chết', 'Thuốc nhuộm làm dừng phân bào', 'Kính không đủ độ phóng đại'], answer: 0, why: 'Tỉ lệ tế bào ở mỗi giai đoạn tỉ lệ với thời gian của giai đoạn đó.'},
      {q: 'Lấy mẫu ở chóp rễ vì:', options: ['Mô phân sinh ở đó phân chia mạnh', 'Rễ dễ nhuộm hơn lá', 'Rễ không có nhân', 'Chóp rễ có giảm phân'], answer: 0, why: 'Mô phân sinh đỉnh rễ có nhiều tế bào đang nguyên phân.'},
    ],
    keywords: /(?:lam va )?quan sat tieu ban (?:qua trinh )?nguyen phan|tieu ban (?:qua trinh )?(?:nguyen phan|giam phan)|chi so phan bao/,
    examples: ['thực hành làm và quan sát tiêu bản quá trình nguyên phân', 'thực hành tiêu bản giảm phân'],
    script: [ch('stain', 'yes'), ch('sample', 'root'), ...rep(5), ch('sample', 'anther'), ...rep(3)],
  },
  {
    id: 'YOGURT',
    lesson: 'Sinh 10, bài 23',
    title: 'Thực hành làm sữa chua và theo dõi quá trình lên men',
    goal: 'Ủ sữa có và không có men cái (đối chứng) ở các nhiệt độ, đo pH theo thời gian; giải thích vai trò vi khuẩn lactic.',
    hazards: ['Dụng cụ phải tráng nước sôi; không ăn sản phẩm có mùi lạ'],
    apparatus: 'Sữa, sữa chua làm men cái, cốc thủy tinh có nắp, thùng ủ ấm, nhiệt kế, máy đo pH',
    sliders: [
      {key: 'T', label: 'Nhiệt độ ủ', unit: '°C', min: 20, max: 50, step: 1, value: 43},
      {key: 't', label: 'Thời gian ủ', unit: 'giờ', min: 0, max: 12, step: 1, value: 0},
    ],
    choices: [{key: 'st', label: 'Men cái', value: 'yes', options: [['yes', 'Có thêm sữa chua làm men'], ['no', 'Không thêm (đối chứng)']]}],
    columns: [{key: 'st', label: 'Men (1/0)', digits: 0}, {key: 'T', label: 'T', unit: '°C', digits: 0}, {key: 't', label: 't', unit: 'giờ', digits: 0}, {key: 'pH', label: 'pH', digits: 2}],
    measure: (p, s, rng) => {
      const k = 0.4 * Math.exp(-(((p.T - 42) / 7) ** 2));
      const pH = s.st === 'yes' ? 6.6 - 2.4 * (1 - Math.exp(-k * p.t)) : 6.6 - 0.04 * p.t;
      return {st: s.st === 'yes' ? 1 : 0, T: p.T, t: p.t, pH: noisy(pH, 0.03, 0.01, rng)};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => {
      const pH = last ? last.pH : 6.6;
      const thick = clamp((6.6 - pH) / 2, 0, 1);
      return [box(80, 50, 140, 150, '#F8FAFC', C.ink), box(84, 200 - 140 * (0.6 + 0.3 * thick), 132, 140 * (0.6 + 0.3 * thick) - 4, thick > 0.9 ? '#FEFCE8' : '#F1F5F9'), txt(150, 40, s.st === 'yes' ? 'Có men cái' : 'Đối chứng', {size: 12, bold: true}), ...lcd(300, 60, 200, last ? `pH = ${f(last.pH, 2)}` : 'pH = —'), txt(300, 120, thick > 0.9 ? 'Sữa đã đông, vị chua' : 'Sữa còn lỏng', {size: 13, anchor: 'start', bold: true}), txt(300, 150, 'Vi khuẩn lactic: lactose → acid lactic', {size: 11, anchor: 'start', fill: '#78716C'})];
    },
    chart: {x: 't', y: 'pH', xLabel: 't (giờ)', yLabel: 'pH', fit: false},
    results: (rows) => [
      {key: 'minStarter', label: 'pH thấp nhất (có men)', value: Math.min(...where(rows, (r) => r.st === 1).map((r) => r.pH)), digits: 2},
      {key: 'ctrl', label: 'pH đối chứng sau ≥ 8 giờ', value: avg(where(rows, (r) => r.st === 0 && r.t >= 8), 'pH'), digits: 2},
    ],
    verdict: (c) => (c.results.minStarter <= 4.6 && c.results.ctrl >= 6 ? {ok: true, text: `Có men cái pH giảm còn ${f(c.results.minStarter, 2)} (sữa đông); đối chứng vẫn ≈ ${f(c.results.ctrl, 2)}.`} : {ok: false, text: 'Cần ống đối chứng ủ ≥ 8 giờ và ống có men ủ ở 40–45 °C đến khi pH ≤ 4,6.'}),
    steps: [
      {text: 'Ủ ống đối chứng không men ít nhất 8 giờ', done: (c) => c.rows.some((r) => r.st === 0 && r.t >= 8)},
      {text: 'Có men: đo pH ở ít nhất 4 thời điểm, nhiệt độ 40–45 °C', done: (c) => new Set(where(c.rows, (r) => r.st === 1 && r.T >= 40 && r.T <= 45).map((r) => r.t)).size >= 4},
      {text: 'Sữa đông (pH ≤ 4,6)', done: (c) => c.rows.some((r) => r.st === 1 && r.pH <= 4.6)},
    ],
    questions: [
      {q: 'Vì sao sữa đông lại khi lên men?', options: ['Acid lactic làm pH giảm, protein casein đông tụ', 'Nhiệt độ làm sữa bay hơi', 'Vi khuẩn tạo tinh bột', 'Đường bị kết tinh'], answer: 0, why: 'pH giảm đến điểm đẳng điện của casein làm protein kết tủa thành khối.'},
      {q: 'Muối dưa chua cũng dựa vào nhóm vi sinh vật nào?', options: ['Vi khuẩn lactic', 'Nấm men rượu', 'Vi khuẩn lam', 'Virus'], answer: 0, why: 'Vi khuẩn lactic lên men đường trong rau thành acid lactic.'},
    ],
    keywords: /lam sua chua|lam dua chua|len men lactic|quan sat san pham len men/,
    examples: ['thực hành làm sữa chua', 'thực hành làm dưa chua và quan sát sản phẩm lên men'],
    script: [ch('st', 'no'), setp('t', 8), M, ch('st', 'yes'), setp('T', 43), setp('t', 0), M, setp('t', 2), M, setp('t', 4), M, setp('t', 6), M, setp('t', 8), M],
  },
  {
    id: 'VIRUS_SURVEY',
    lesson: 'Sinh 10, bài 26',
    title: 'Thực hành điều tra một số bệnh do virus và tuyên truyền phòng chống',
    goal: 'Khảo sát mẫu người trong cộng đồng: tỉ lệ đã mắc trong năm và tỉ lệ biết cách phòng bệnh; so sánh giữa các bệnh để chọn nội dung tuyên truyền.',
    hazards: ['Phiếu khảo sát ẩn danh, xin phép người được hỏi'],
    apparatus: 'Phiếu khảo sát, bảng tổng hợp',
    sliders: [{key: 'n', label: 'Số người khảo sát mỗi lượt', min: 20, max: 200, step: 10, value: 50}],
    choices: [{key: 'd', label: 'Bệnh', value: 'flu', options: SURVEY}],
    columns: [{key: 'd', label: 'Bệnh (1 cúm, 2 sốt xuất huyết, 3 tay chân miệng)', digits: 0}, {key: 'n', label: 'Số người', digits: 0}, {key: 'k', label: 'Đã mắc', digits: 0}, {key: 'kp', label: 'Tỉ lệ mắc', unit: '%', digits: 1}, {key: 'yp', label: 'Biết cách phòng', unit: '%', digits: 1}],
    measure: (p, s, rng) => {
      const d = code(SURVEY, s.d);
      const k = binom(p.n, [0.35, 0.06, 0.04][d - 1], rng);
      return {d, n: p.n, k, kp: (100 * k) / p.n, yp: (100 * binom(p.n, [0.7, 0.55, 0.45][d - 1], rng)) / p.n};
    },
    viewBox: [560, 220],
    scene: (_p, _s, last) => (last ? [ground(180), ...bar(160, 180, 80, last.kp * 2.6, C.red, 'Tỉ lệ đã mắc', `${f(last.kp)}%`), ...bar(320, 180, 80, last.yp * 1.4, C.green, 'Biết cách phòng', `${f(last.yp)}%`), txt(280, 24, SURVEY[last.d - 1][1], {size: 14, bold: true})] : [txt(280, 110, 'Chọn bệnh, số người rồi bấm "Đo" để thu phiếu', {size: 14})]),
    results: (rows) => [
      {key: 'total', label: 'Tổng số phiếu', value: rows.reduce((a, r) => a + r.n, 0), digits: 0},
      ...SURVEY.map(([key, name], i) => {
        const rs = where(rows, (r) => r.d === i + 1);
        const n = rs.reduce((a, r) => a + r.n, 0);
        return {key, label: `Tỉ lệ mắc: ${name}`, value: n ? (100 * rs.reduce((a, r) => a + r.k, 0)) / n : NaN, unit: '%', digits: 1};
      }),
    ],
    verdict: (c) => (c.results.total >= 150 && c.results.flu > c.results.dengue ? {ok: true, text: `Thu ${f(c.results.total, 0)} phiếu; cúm mùa phổ biến nhất (${f(c.results.flu)}%), cần tuyên truyền tiêm phòng, đeo khẩu trang, rửa tay.`} : {ok: false, text: 'Khảo sát đủ ba bệnh, tổng ít nhất 150 người.'}),
    steps: [
      {text: 'Khảo sát cả 3 bệnh', done: (c) => c.distinct('d') >= 3},
      {text: 'Mỗi bệnh ít nhất 50 người', done: (c) => [1, 2, 3].every((d) => where(c.rows, (r) => r.d === d).reduce((a, r) => a + r.n, 0) >= 50)},
      {text: 'Tổng ít nhất 150 phiếu', done: (c) => c.results.total >= 150},
    ],
    questions: [
      {q: 'Bệnh sốt xuất huyết lây truyền qua:', options: ['Muỗi vằn đốt', 'Không khí', 'Bắt tay', 'Thức ăn'], answer: 0, why: 'Virus Dengue truyền qua muỗi Aedes; diệt bọ gậy, ngủ màn là biện pháp chính.'},
      {q: 'Vì sao kháng sinh không chữa được cúm?', options: ['Kháng sinh không tác động lên virus', 'Cúm tự khỏi nên không cần', 'Kháng sinh quá đắt', 'Virus quá to'], answer: 0, why: 'Kháng sinh nhắm vào cấu trúc của vi khuẩn mà virus không có.'},
    ],
    keywords: /dieu tra (?:mot so )?benh do virus|tuyen truyen phong chong benh do virus|khao sat benh do virus/,
    examples: ['thực hành điều tra một số bệnh do virus', 'thực hành tuyên truyền phòng chống bệnh do virus'],
    script: [setp('n', 60), ch('d', 'flu'), M, ch('d', 'dengue'), M, ch('d', 'hfmd'), M],
  },
  {
    id: 'TRANSPIRATION',
    lesson: 'Sinh 11, bài 3',
    title: 'Thực hành thí nghiệm thoát hơi nước ở lá',
    goal: 'Cân lượng nước mất của cây trong 1 giờ khi bôi vaseline mặt trên hoặc mặt dưới lá, ngắt lá, ở các cường độ ánh sáng; suy ra vị trí khí khổng.',
    hazards: [],
    apparatus: 'Chậu cây bọc kín đất bằng túi nilon, cân điện tử 0,01 g, vaseline, đèn chiếu sáng có điều chỉnh',
    sliders: [{key: 'L', label: 'Cường độ ánh sáng', unit: 'klux', min: 0, max: 40, step: 5, value: 20}],
    choices: [{key: 'c', label: 'Xử lí lá', value: 'full', options: TRANSP}],
    columns: [{key: 'c', label: 'Xử lí (1 đủ lá … 4 ngắt lá)', digits: 0}, {key: 'L', label: 'Ánh sáng', unit: 'klux', digits: 0}, {key: 'm', label: 'Nước mất', unit: 'g/giờ', digits: 2}],
    measure: (p, s, rng) => {
      const c = code(TRANSP, s.c);
      return {c, L: p.L, m: Math.max(0, noisy([2.4, 0.6, 2.0, 0.15][c - 1] * (0.3 + (0.7 * p.L) / 40), 0.05, 0.01, rng))};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => {
      const c = code(TRANSP, s.c);
      const leaves = c === 4 ? [] : [-1, 1].flatMap((side): Shape[] => [0, 1, 2].map((i): Shape => ({t: 'path', d: `M150 ${150 - i * 30} q${side * 40} -25 ${side * 70} -5 q${-side * 30} 15 ${-side * 70} 5`, fill: c === 1 ? '#22C55E' : '#86EFAC', stroke: '#15803D', w: 1.5})));
      return [box(110, 150, 80, 50, '#A16207', C.ink), ln(150, 150, 150, 70, {stroke: '#15803D', w: 4}), ...leaves, box(80, 200, 140, 12, '#CBD5E1', C.ink), {t: 'circle', cx: 470, cy: 40, r: 10 + p.L / 4, fill: '#FDE047', o: 0.8}, ...lcd(290, 110, 200, last ? `${f(last.m, 2)} g/giờ` : '— g/giờ'), txt(290, 160, TRANSP[c - 1][1], {size: 13, anchor: 'start', bold: true})];
    },
    chart: {x: 'L', y: 'm', xLabel: 'Ánh sáng (klux)', yLabel: 'Nước mất (g/giờ)', fit: false},
    results: (rows) => {
      // so với đối chứng đủ lá đo ở CÙNG cường độ ánh sáng
      const rel = (c: number) => mean(where(rows, (r) => r.c === c).map((r) => r.m / avg(where(rows, (x) => x.c === 1 && x.L === r.L), 'm')).filter(Number.isFinite));
      return [
        {key: 'lower', label: 'Bôi mặt dưới / đối chứng', value: rel(2), digits: 2},
        {key: 'upper', label: 'Bôi mặt trên / đối chứng', value: rel(3), digits: 2},
        {key: 'none', label: 'Ngắt lá / đối chứng', value: rel(4), digits: 2},
      ];
    },
    verdict: (c) =>
      c.results.lower < c.results.upper && c.results.upper < 1 && c.results.none < 0.2
        ? {ok: true, text: `Bôi mặt dưới giảm thoát hơi nước nhiều hơn (còn ${f(c.results.lower * 100, 0)}% so với ${f(c.results.upper * 100, 0)}%): khí khổng tập trung ở mặt dưới lá.`}
        : {ok: false, text: 'Cần đủ bốn cách xử lí, đo ở cùng cường độ ánh sáng với đối chứng đủ lá.'},
    steps: [
      ...TRANSP.map(([, name], i) => ({text: `Đo: ${name}`, done: (c: {rows: Row[]}) => c.rows.some((r) => r.c === i + 1)})),
      {text: 'Đối chứng đủ lá ở ít nhất 3 cường độ ánh sáng', done: (c) => new Set(where(c.rows, (r) => r.c === 1).map((r) => r.L)).size >= 3},
    ],
    questions: [
      {q: 'Vì sao phải bọc kín đất trong chậu?', options: ['Để nước mất chỉ do lá thoát ra', 'Để cây không đổ', 'Giữ ấm rễ', 'Cho đẹp'], answer: 0, why: 'Nếu không bọc, nước bốc hơi từ đất làm sai lệch số đo thoát hơi nước.'},
      {q: 'Khi ánh sáng tăng, thoát hơi nước tăng chủ yếu vì:', options: ['Khí khổng mở rộng hơn', 'Lá to ra', 'Rễ hút ít nước', 'Cuticle dày lên'], answer: 0, why: 'Ánh sáng làm tế bào hạt đậu trương nước, khí khổng mở.'},
    ],
    keywords: /thoat hoi nuoc (?:o |qua )?la|trao doi nuoc va khoang o thuc vat|bo?i vaseline (?:mat )?(?:duoi|tren) la/,
    examples: ['thực hành thí nghiệm thoát hơi nước ở lá', 'thực hành trao đổi nước và khoáng ở thực vật'],
    script: [setp('L', 20), ch('c', 'full'), M, ch('c', 'lower'), M, ch('c', 'upper'), M, ch('c', 'none'), M, ch('c', 'full'), setp('L', 5), M, setp('L', 35), M],
  },
  {
    id: 'PIGMENT',
    lesson: 'Sinh 11, bài 5',
    title: 'Thực hành tách chiết sắc tố quang hợp bằng sắc kí giấy',
    goal: 'Chạy sắc kí dịch chiết lá, đo quãng đường của dung môi và từng vạch sắc tố, tính Rf và sắp xếp các sắc tố.',
    hazards: ['Acetone, xăng dễ cháy: làm xa lửa, nơi thoáng khí'],
    apparatus: 'Lá xanh, cối chày, acetone 80%, giấy sắc kí, ống đong có nắp, dung môi (xăng + acetone), thước',
    sliders: [{key: 'ds', label: 'Quãng đường dung môi', unit: 'cm', min: 4, max: 10, step: 0.5, value: 8}],
    choices: [{key: 'b', label: 'Vạch sắc tố đo', value: 'car', options: BANDS}],
    columns: [{key: 'b', label: 'Vạch (1 carotene … 4 diệp lục b)', digits: 0}, {key: 'ds', label: 'Dung môi', unit: 'cm', digits: 1}, {key: 'dp', label: 'Sắc tố', unit: 'cm', digits: 1}, {key: 'Rf', label: 'Rf', digits: 2}],
    measure: (p, s, rng) => {
      const b = code(BANDS, s.b);
      const dp = clamp(noisy(RF[b - 1] * p.ds, 0.08, 0.1, rng), 0.1, p.ds);
      return {b, ds: p.ds, dp, Rf: dp / p.ds};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const y0 = 200;
      const k = 18;
      return [box(240, 10, 80, 200, '#FAFAF9', C.ink), ln(240, y0 - p.ds * k, 320, y0 - p.ds * k, {stroke: C.blue, dash: '4 3'}), txt(330, y0 - p.ds * k + 4, 'mức dung môi', {size: 10, anchor: 'start', fill: C.blue}), ...RF.map((rf, i): Shape => box(246, y0 - rf * p.ds * k - 3, 68, 6, BAND_COLOR[i])), ln(240, y0, 320, y0, {stroke: C.ink, dash: '2 2'}), txt(230, y0 + 4, 'vạch xuất phát', {size: 10, anchor: 'end'}), txt(360, 60, `Đang đo: ${BANDS[code(BANDS, s.b) - 1][1]}`, {size: 12, anchor: 'start', bold: true})];
    },
    results: (rows) => BANDS.map(([key, name], i) => ({key, label: `Rf ${name}`, value: avg(where(rows, (r) => r.b === i + 1), 'Rf'), digits: 2})),
    verdict: (c) => (c.results.car > c.results.xan && c.results.xan > c.results.chla && c.results.chla > c.results.chlb ? {ok: true, text: 'Thứ tự Rf: carotene > xanthophyll > diệp lục a > diệp lục b, đúng với độ tan trong dung môi.'} : {ok: false, text: 'Hãy đo đủ bốn vạch để so sánh Rf.'}),
    steps: [
      {text: 'Đo đủ 4 vạch sắc tố', done: (c) => c.distinct('b') >= 4},
      {text: 'Chạy lại ở quãng đường dung môi khác (Rf không đổi)', done: (c) => c.distinct('ds') >= 2},
    ],
    questions: [{q: 'Sắc tố nào đi xa nhất trên giấy?', options: ['Carotene', 'Diệp lục a', 'Diệp lục b', 'Xanthophyll'], answer: 0, why: 'Carotene kém phân cực nhất, tan tốt trong dung môi nên đi xa nhất.'}],
    keywords: /tach (?:chiet )?sac to (?:quang hop|la)|sac ki giay sac to|sac to quang hop bang sac ki/,
    examples: ['thực hành tách chiết sắc tố quang hợp', 'thực hành sắc kí giấy sắc tố lá'],
    script: [setp('ds', 8), ch('b', 'car'), M, ch('b', 'xan'), M, ch('b', 'chla'), M, ch('b', 'chlb'), M, setp('ds', 6), ch('b', 'chla'), M],
  },
  {
    id: 'LEAF_STARCH',
    lesson: 'Sinh 11, bài 5',
    title: 'Thực hành thử tinh bột ở lá (vai trò của ánh sáng trong quang hợp)',
    goal: 'Để cây trong tối, bọc một phần lá bằng giấy bạc, chiếu sáng rồi thử iodine; so sánh phần lá được chiếu và phần bị che.',
    hazards: ['Đun cồn tẩy diệp lục bằng cách thủy, không đun trực tiếp trên lửa'],
    apparatus: 'Chậu cây, giấy bạc, đèn, cồn 90°, nồi cách thủy, đĩa petri, dung dịch iodine',
    sliders: [{key: 'h', label: 'Thời gian chiếu sáng', unit: 'giờ', min: 0, max: 8, step: 1, value: 0}],
    choices: [
      {key: 'dark', label: 'Đã để cây trong tối 2 ngày', value: 'no', options: yes},
      {key: 'leaf', label: 'Phần lá thử', value: 'open', options: [['open', 'Phần để sáng'], ['covered', 'Phần bọc giấy bạc (đối chứng)']]},
    ],
    columns: [{key: 'dk', label: 'Để tối trước (1/0)', digits: 0}, {key: 'cv', label: 'Bị che (1/0)', digits: 0}, {key: 'h', label: 'Chiếu sáng', unit: 'giờ', digits: 0}, {key: 'S', label: 'Mức xanh tím (tinh bột)', unit: '%', digits: 0}],
    measure: (p, s, rng) => {
      const dk = s.dark === 'yes' ? 1 : 0;
      const cv = s.leaf === 'covered' ? 1 : 0;
      const base = dk ? 3 : 80;
      return {dk, cv, h: p.h, S: clamp(noisy(cv ? base : base + (95 - base) * (1 - Math.exp(-p.h / 2.5)), 4, 1, rng), 0, 100)};
    },
    viewBox: [560, 220],
    scene: (_p, _s, last) => {
      const color = (v: number) => (v > 60 ? '#1E1B4B' : v > 25 ? '#6D28D9' : '#FDE68A');
      const open = last && !last.cv ? last.S : null;
      const cov = last && last.cv ? last.S : null;
      return [{t: 'path', d: 'M80 110 Q200 10 380 110 Q200 210 80 110 Z', fill: open === null ? '#BBF7D0' : color(open), stroke: '#15803D', w: 2}, box(190, 80, 90, 60, cov === null ? '#CBD5E1' : color(cov), C.ink), txt(235, 160, 'vùng bọc giấy bạc', {size: 10}), txt(420, 90, 'Iodine:', {size: 12, anchor: 'start', bold: true}), txt(420, 112, 'xanh tím = có tinh bột', {size: 11, anchor: 'start'}), txt(420, 132, 'vàng nâu = không có', {size: 11, anchor: 'start'})];
    },
    chart: {x: 'h', y: 'S', xLabel: 'Chiếu sáng (giờ)', yLabel: 'Tinh bột (%)', fit: false},
    results: (rows) => [
      {key: 'open', label: 'Mức tinh bột cao nhất ở phần để sáng (đã để tối)', value: Math.max(...where(rows, (r) => r.dk === 1 && r.cv === 0).map((r) => r.S)), unit: '%', digits: 0},
      {key: 'covered', label: 'Mức tinh bột ở phần bị che (đã để tối)', value: avg(where(rows, (r) => r.dk === 1 && r.cv === 1), 'S'), unit: '%', digits: 0},
    ],
    verdict: (c) => (c.results.open >= 60 && c.results.covered <= 15 ? {ok: true, text: 'Chỉ phần lá được chiếu sáng tạo tinh bột: quang hợp cần ánh sáng.'} : {ok: false, text: 'Hãy để cây trong tối trước để lá hết tinh bột cũ, rồi so sánh phần bị che với phần để sáng.'}),
    steps: [
      {text: 'Để cây trong tối 2 ngày trước khi thí nghiệm', done: (c) => c.s.dark === 'yes'},
      {text: 'Thử phần lá bọc giấy bạc (≥ 4 giờ chiếu)', done: (c) => c.rows.some((r) => r.dk === 1 && r.cv === 1 && r.h >= 4)},
      {text: 'Thử phần để sáng ở ít nhất 3 thời gian chiếu', done: (c) => new Set(where(c.rows, (r) => r.dk === 1 && r.cv === 0).map((r) => r.h)).size >= 3},
    ],
    questions: [{q: 'Vì sao phải để cây trong tối 2 ngày trước thí nghiệm?', options: ['Để lá dùng hết tinh bột đã có', 'Để cây ngủ', 'Để lá mềm', 'Để diệp lục tăng'], answer: 0, why: 'Nếu lá còn tinh bột cũ thì cả phần bị che cũng xanh tím, không kết luận được.'}],
    keywords: /thu tinh bot (?:o |trong )?la|vai tro cua anh sang (?:trong|doi voi) quang hop|boc giay bac (?:mot phan )?la/,
    examples: ['thực hành thử tinh bột ở lá', 'thí nghiệm bọc giấy bạc một phần lá'],
    script: [ch('dark', 'yes'), ch('leaf', 'covered'), setp('h', 6), M, ch('leaf', 'open'), setp('h', 1), M, setp('h', 3), M, setp('h', 6), M],
  },
  {
    id: 'SEED_RESPIRATION',
    lesson: 'Sinh 11, bài 7',
    title: 'Thực hành hô hấp ở hạt nảy mầm',
    goal: 'So sánh lượng CO₂ thải ra của hạt đang nảy mầm và hạt đã luộc chín (đối chứng) ở các nhiệt độ; nhận biết CO₂ bằng nước vôi trong.',
    hazards: [],
    apparatus: 'Hạt đậu đã ngâm nảy mầm, hạt luộc chín, bình kín, ống dẫn khí, nước vôi trong, bể ổn nhiệt, cảm biến CO₂',
    sliders: [{key: 'T', label: 'Nhiệt độ', unit: '°C', min: 10, max: 50, step: 5, value: 25}],
    choices: [{key: 'g', label: 'Hạt', value: 'live', options: [['live', 'Hạt đang nảy mầm'], ['boiled', 'Hạt luộc chín (đối chứng)']]}],
    columns: [{key: 'g', label: 'Hạt sống (1/0)', digits: 0}, {key: 'T', label: 'T', unit: '°C', digits: 0}, {key: 'co2', label: 'CO₂ thải ra', unit: 'mg/giờ', digits: 1}],
    measure: (p, s, rng) => {
      const g = s.g === 'live' ? 1 : 0;
      const v = g ? 12 * 2 ** ((p.T - 25) / 10) * Math.exp(-(Math.max(0, p.T - 38) ** 2) / 40) : 0.2;
      return {g, T: p.T, co2: Math.max(0, noisy(v, 0.4, 0.1, rng))};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => {
      const turbid = last ? clamp(last.co2 / 25, 0, 1) : 0;
      return [{t: 'path', d: 'M80 200 V100 Q80 60 130 60 Q180 60 180 100 V200 Z', fill: '#F0FDF4', stroke: C.ink, w: 2}, ...[0, 1, 2, 3, 4, 5].map((i): Shape => ({t: 'circle', cx: 100 + (i % 3) * 30, cy: 185 - Math.floor(i / 3) * 18, r: 9, fill: s.g === 'live' ? '#A3E635' : '#D6D3D1', stroke: '#3F6212'})), ln(130, 60, 130, 30, {stroke: C.ink, w: 3}), ln(130, 30, 330, 30, {stroke: C.ink, w: 3}), ln(330, 30, 330, 150, {stroke: C.ink, w: 3}), ...tube(330, 80, 120, `rgba(214,211,209,${0.25 + 0.75 * turbid})`, 0.6), txt(400, 120, turbid > 0.3 ? 'Nước vôi vẩn đục: có CO₂' : 'Nước vôi trong', {size: 13, anchor: 'start', bold: true}), txt(400, 150, `${p.T} °C`, {size: 12, anchor: 'start'})];
    },
    chart: {x: 'T', y: 'co2', xLabel: 'T (°C)', yLabel: 'CO₂ (mg/giờ)', fit: false},
    results: (rows) => {
      const live = where(rows, (r) => r.g === 1);
      return [
        {key: 'Topt', label: 'Nhiệt độ hô hấp mạnh nhất', value: live.length ? live.reduce((a, b) => (b.co2 > a.co2 ? b : a)).T : NaN, unit: '°C', digits: 0},
        {key: 'max', label: 'CO₂ lớn nhất (hạt sống)', value: Math.max(...live.map((r) => r.co2)), unit: 'mg/giờ', digits: 1},
        {key: 'boiled', label: 'CO₂ trung bình (hạt luộc)', value: avg(where(rows, (r) => r.g === 0), 'co2'), unit: 'mg/giờ', digits: 1},
      ];
    },
    verdict: (c) => (c.results.max > 5 * Math.max(0.5, c.results.boiled) && c.results.Topt >= 30 && c.results.Topt <= 40 ? {ok: true, text: `Hạt sống thải CO₂ mạnh nhất ở ≈ ${f(c.results.Topt, 0)} °C; hạt luộc gần như không: hô hấp cần enzyme hoạt động.`} : {ok: false, text: 'Cần đối chứng hạt luộc và đo hạt sống ở ít nhất 4 nhiệt độ trải từ thấp đến cao.'}),
    steps: [
      {text: 'Đo đối chứng hạt luộc chín', done: (c) => c.rows.some((r) => r.g === 0)},
      {text: 'Đo hạt nảy mầm ở ít nhất 4 nhiệt độ', done: (c) => new Set(where(c.rows, (r) => r.g === 1).map((r) => r.T)).size >= 4},
    ],
    questions: [{q: 'Nhiệt độ quá cao (trên 40 °C) làm hô hấp giảm vì:', options: ['Enzyme hô hấp bị biến tính', 'Hạt hết nước', 'CO₂ không tan', 'Oxygen tăng'], answer: 0, why: 'Hô hấp là chuỗi phản ứng enzyme nên phụ thuộc nhiệt độ như hoạt tính enzyme.'}],
    keywords: /ho hap (?:o )?(?:hat nay mam|thuc vat)|hat nay mam thai (?:ra )?co2|hat nay mam (?:va )?nuoc voi trong/,
    examples: ['thực hành hô hấp ở thực vật', 'thí nghiệm hạt nảy mầm thải CO2'],
    script: [ch('g', 'boiled'), setp('T', 25), M, ch('g', 'live'), setp('T', 15), M, setp('T', 25), M, setp('T', 35), M, setp('T', 40), M, setp('T', 45), M],
  },
  {
    id: 'CIRCULATION',
    lesson: 'Sinh 11, bài 11',
    title: 'Thực hành đo mạch và huyết áp trước và sau vận động',
    goal: 'Đo mạch đập và huyết áp tâm thu lúc nghỉ, ngay sau khi chạy tại chỗ 2 phút và sau khi nghỉ 5 phút; giải thích sự điều hòa tim mạch.',
    hazards: ['Học sinh có bệnh tim mạch không chạy tại chỗ', 'Không bơm vòng bít quá 180 mmHg'],
    apparatus: 'Máy đo huyết áp điện tử, đồng hồ bấm giây',
    sliders: [],
    choices: [{key: 'st', label: 'Trạng thái', value: 'rest', options: [['rest', 'Lúc nghỉ'], ['after', 'Ngay sau chạy tại chỗ 2 phút'], ['recover', 'Sau nghỉ 5 phút']]}],
    columns: [{key: 'st', label: 'Trạng thái (1 nghỉ, 2 sau chạy, 3 hồi phục)', digits: 0}, {key: 'hr', label: 'Mạch', unit: 'lần/phút', digits: 0}, {key: 'sbp', label: 'Huyết áp tâm thu', unit: 'mmHg', digits: 0}],
    measure: (_p, s, rng) => {
      const st = s.st === 'rest' ? 1 : s.st === 'after' ? 2 : 3;
      return {st, hr: noisy([72, 118, 80][st - 1], 4, 1, rng), sbp: noisy([115, 140, 120][st - 1], 4, 1, rng)};
    },
    viewBox: [560, 220],
    scene: (_p, _s, last) => [{t: 'path', d: 'M140 70 C140 40 100 40 100 70 C100 100 140 120 140 150 C140 120 180 100 180 70 C180 40 140 40 140 70 Z', fill: C.red, stroke: '#7F1D1D', w: 2}, ...lcd(260, 60, 240, last ? `Mạch ${f(last.hr, 0)} lần/phút` : 'Mạch —'), ...lcd(260, 110, 240, last ? `HA tâm thu ${f(last.sbp, 0)} mmHg` : 'HA —')],
    results: (rows) => ['rest', 'after', 'recover'].map((key, i) => ({key, label: `Mạch trung bình (${['lúc nghỉ', 'sau chạy', 'sau nghỉ 5 phút'][i]})`, value: avg(where(rows, (r) => r.st === i + 1), 'hr'), unit: 'lần/phút', digits: 0})),
    verdict: (c) => (c.results.after > c.results.rest + 25 && c.results.recover < c.results.after - 20 ? {ok: true, text: `Mạch tăng từ ${f(c.results.rest, 0)} lên ${f(c.results.after, 0)} lần/phút khi vận động rồi trở về ≈ ${f(c.results.recover, 0)}.`} : {ok: false, text: 'Đo mỗi trạng thái ít nhất 3 lần để so sánh.'}),
    steps: [0, 1, 2].map((i) => ({text: `Đo ít nhất 3 lần: ${['lúc nghỉ', 'ngay sau chạy', 'sau nghỉ 5 phút'][i]}`, done: (c: {rows: Row[]}) => where(c.rows, (r) => r.st === i + 1).length >= 3})),
    questions: [{q: 'Khi vận động, tim đập nhanh hơn để:', options: ['Cung cấp nhiều O₂ và chất dinh dưỡng cho cơ', 'Giảm thân nhiệt', 'Giảm huyết áp', 'Tiết kiệm năng lượng'], answer: 0, why: 'Cơ hoạt động cần nhiều O₂; hệ thần kinh giao cảm làm tăng nhịp và lực co tim.'}],
    keywords: /do mach va huyet ap|huyet ap (?:truoc va )?sau (?:khi )?van dong|mot so thi nghiem ve he tuan hoan|thi nghiem ve he tuan hoan/,
    examples: ['thực hành đo mạch và huyết áp', 'thực hành một số thí nghiệm về hệ tuần hoàn'],
    script: [ch('st', 'rest'), ...rep(3), ch('st', 'after'), ...rep(3), ch('st', 'recover'), ...rep(3)],
  },
  {
    id: 'TROPISM',
    lesson: 'Sinh 11, bài 16',
    title: 'Thực hành cảm ứng ở thực vật: hướng sáng, hướng trọng lực, hướng nước',
    goal: 'Bố trí mỗi thí nghiệm kèm đối chứng (chiếu sáng đều, quay đều trên clinostat, tưới đều), đo góc uốn của cây mầm theo ngày.',
    hazards: [],
    apparatus: 'Hạt đậu nảy mầm, hộp có khe sáng, clinostat, khay mùn cưa ẩm, thước đo góc',
    sliders: [{key: 'd', label: 'Số ngày', unit: 'ngày', min: 0, max: 5, step: 1, value: 4}],
    choices: [
      {key: 'ty', label: 'Thí nghiệm', value: 'light', options: TROP},
      {key: 'grp', label: 'Nhóm', value: 'exp', options: [['exp', 'Thí nghiệm (kích thích một phía)'], ['ctrl', 'Đối chứng (kích thích đều)']]},
    ],
    columns: [{key: 'ty', label: 'Loại (1 sáng, 2 trọng lực, 3 nước)', digits: 0}, {key: 'grp', label: 'Thí nghiệm (1) / đối chứng (0)', digits: 0}, {key: 'd', label: 'Ngày', digits: 0}, {key: 'a', label: 'Góc uốn', unit: '°', digits: 0}],
    measure: (p, s, rng) => {
      const ty = code(TROP, s.ty);
      const grp = s.grp === 'exp' ? 1 : 0;
      return {ty, grp, d: p.d, a: noisy(grp ? TROP_MAX[ty - 1] * (1 - Math.exp(-p.d / 1.5)) : 0, 3, 1, rng)};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const ty = code(TROP, s.ty);
      const a = s.grp === 'exp' ? TROP_MAX[ty - 1] * (1 - Math.exp(-p.d / 1.5)) : 0;
      const r = (a * Math.PI) / 180;
      const sign = ty === 2 ? -1 : 1;
      const stem = ty === 2 ? `M200 150 L250 150 q40 0 ${60 * Math.cos(r)} ${-60 * Math.sin(r)}` : `M200 190 L200 130 q0 -30 ${sign * 60 * Math.sin(r)} ${-60 * Math.cos(r)}`;
      return [ground(190), {t: 'path', d: stem, stroke: '#15803D', w: 5}, ...(ty === 1 && s.grp === 'exp' ? [{t: 'circle', cx: 470, cy: 60, r: 18, fill: '#FDE047'} as Shape, txt(470, 100, 'ánh sáng một phía', {size: 11})] : []), ...(ty === 3 && s.grp === 'exp' ? [box(380, 170, 120, 20, '#60A5FA'), txt(440, 165, 'nguồn nước', {size: 11})] : []), txt(40, 30, `${TROP[ty - 1][1]} · ${s.grp === 'exp' ? 'thí nghiệm' : 'đối chứng'} · ngày ${p.d}`, {size: 13, anchor: 'start', bold: true})];
    },
    results: (rows) => [
      {key: 'exp', label: 'Góc uốn trung bình nhóm thí nghiệm (≥ 3 ngày)', value: avg(where(rows, (r) => r.grp === 1 && r.d >= 3), 'a'), unit: '°', digits: 0},
      {key: 'ctrl', label: 'Độ lệch trung bình nhóm đối chứng', value: mean(where(rows, (r) => r.grp === 0).map((r) => Math.abs(r.a))), unit: '°', digits: 0},
    ],
    verdict: (c) => (c.results.exp > 25 && c.results.ctrl < 8 ? {ok: true, text: 'Cây mầm chỉ uốn khi bị kích thích từ một phía; nhóm đối chứng mọc thẳng.'} : {ok: false, text: 'Cần đủ ba loại hướng động, mỗi loại có nhóm thí nghiệm và đối chứng sau ít nhất 3 ngày.'}),
    steps: TROP.map(([, name], i) => ({text: `${name}: thí nghiệm và đối chứng (≥ 3 ngày)`, done: (c: {rows: Row[]}) => [0, 1].every((g) => c.rows.some((r) => r.ty === i + 1 && r.grp === g && r.d >= 3))})),
    questions: [{q: 'Clinostat quay đều cây mầm nằm ngang để làm gì?', options: ['Triệt tiêu tác động một phía của trọng lực (đối chứng)', 'Cho cây lớn nhanh', 'Tạo ánh sáng', 'Tưới nước đều'], answer: 0, why: 'Khi quay đều, mọi phía chịu trọng lực như nhau nên rễ, thân không uốn.'}],
    keywords: /cam ung o thuc vat|huong sang,? huong trong luc|thi nghiem huong (?:sang|trong luc|nuoc)/,
    examples: ['thực hành cảm ứng ở thực vật', 'thực hành hướng sáng, hướng trọng lực, hướng nước'],
    script: [setp('d', 4), ...TROP.flatMap(([ty]) => [ch('ty', ty), ch('grp', 'exp'), M, ch('grp', 'ctrl'), M])],
  },
  {
    id: 'APICAL_DOMINANCE',
    lesson: 'Sinh 11, bài 21',
    title: 'Thực hành bấm ngọn, tỉa cành (ưu thế ngọn)',
    goal: 'So sánh cây bấm ngọn và cây để nguyên (đối chứng): số cành bên và chiều cao theo thời gian.',
    hazards: ['Dùng kéo cắt cành đúng cách, không chĩa mũi kéo vào người'],
    apparatus: 'Hai nhóm cây cùng giống, cùng tuổi (ví dụ cây đậu, cây ớt), kéo cắt cành, thước',
    sliders: [{key: 'd', label: 'Số ngày sau khi bấm', unit: 'ngày', min: 0, max: 28, step: 7, value: 0}],
    choices: [{key: 'cut', label: 'Nhóm', value: 'no', options: [['no', 'Để nguyên (đối chứng)'], ['yes', 'Bấm ngọn']]}],
    columns: [{key: 'cut', label: 'Bấm ngọn (1/0)', digits: 0}, {key: 'd', label: 'Ngày', digits: 0}, {key: 'side', label: 'Số cành bên', digits: 0}, {key: 'h', label: 'Chiều cao', unit: 'cm', digits: 1}],
    measure: (p, s, rng) => {
      const cut = s.cut === 'yes';
      return {cut: cut ? 1 : 0, d: p.d, side: Math.max(0, Math.round(noisy(cut ? 1 + 0.2 * p.d : 1 + 0.05 * p.d, 0.5, 1, rng))), h: noisy(cut ? 15 + 0.3 * p.d : 15 + p.d, 0.8, 0.5, rng)};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const cut = s.cut === 'yes';
      const h = (cut ? 15 + 0.3 * p.d : 15 + p.d) * 3.2;
      const side = Math.round(cut ? 1 + 0.2 * p.d : 1 + 0.05 * p.d);
      return [ground(200), ln(280, 200, 280, 200 - h, {stroke: '#15803D', w: 5}), ...Array.from({length: side}, (_, i): Shape => ln(280, 190 - (i * (h - 20)) / Math.max(1, side), 280 + (i % 2 ? -1 : 1) * 50, 170 - (i * (h - 20)) / Math.max(1, side), {stroke: '#16A34A', w: 3})), ...(cut ? [txt(280, 192 - h, '✂', {size: 16})] : [dot(280, 200 - h, 5, '#22C55E')]), txt(40, 30, `${cut ? 'Bấm ngọn' : 'Để nguyên'} · ngày ${p.d}`, {size: 13, anchor: 'start', bold: true})];
    },
    results: (rows) => {
      const last = (cut: number) => where(rows, (r) => r.cut === cut && r.d >= 21);
      return [
        {key: 'sideNo', label: 'Cành bên, để nguyên (≥ 21 ngày)', value: avg(last(0), 'side'), digits: 1},
        {key: 'sideCut', label: 'Cành bên, bấm ngọn (≥ 21 ngày)', value: avg(last(1), 'side'), digits: 1},
        {key: 'hNo', label: 'Chiều cao, để nguyên', value: avg(last(0), 'h'), unit: 'cm', digits: 1},
        {key: 'hCut', label: 'Chiều cao, bấm ngọn', value: avg(last(1), 'h'), unit: 'cm', digits: 1},
      ];
    },
    verdict: (c) => (c.results.sideCut >= 2 * c.results.sideNo && c.results.hCut < c.results.hNo ? {ok: true, text: 'Bấm ngọn làm mất ưu thế ngọn: chồi bên phát triển thành nhiều cành, cây thấp và tán rộng.'} : {ok: false, text: 'Theo dõi cả hai nhóm đến ít nhất 21 ngày.'}),
    steps: [
      {text: 'Theo dõi nhóm để nguyên đến ≥ 21 ngày', done: (c) => c.rows.some((r) => r.cut === 0 && r.d >= 21)},
      {text: 'Theo dõi nhóm bấm ngọn đến ≥ 21 ngày', done: (c) => c.rows.some((r) => r.cut === 1 && r.d >= 21)},
      {text: 'Ghi ở ít nhất 3 thời điểm', done: (c) => c.distinct('d') >= 3},
    ],
    questions: [{q: 'Ưu thế ngọn do hormone nào từ chồi ngọn ức chế chồi bên?', options: ['Auxin', 'Gibberellin', 'Ethylene', 'Abscisic acid'], answer: 0, why: 'Auxin từ đỉnh ngọn vận chuyển xuống ức chế chồi bên; bấm ngọn làm mất nguồn auxin.'}],
    keywords: /bam ngon,? tia canh|uu the ngon|bam ngon (?:cay|cho cay)/,
    examples: ['thực hành bấm ngọn, tỉa cành', 'thí nghiệm ưu thế ngọn'],
    script: [ch('cut', 'no'), setp('d', 7), M, setp('d', 14), M, setp('d', 21), M, ch('cut', 'yes'), setp('d', 7), M, setp('d', 14), M, setp('d', 21), M],
  },
  {
    id: 'TREE_AGE',
    lesson: 'Sinh 11, bài 21',
    title: 'Thực hành tính tuổi cây qua vòng gỗ',
    goal: 'Đếm vòng gỗ trên lát cắt ngang của các thân cây đường kính khác nhau, vẽ đồ thị số vòng theo đường kính và suy ra bề dày vòng gỗ trung bình.',
    hazards: [],
    apparatus: 'Các lát cắt ngang thân cây, kính lúp, thước',
    sliders: [{key: 'D', label: 'Đường kính thân', unit: 'cm', min: 10, max: 60, step: 5, value: 20}],
    columns: [{key: 'D', label: 'Đường kính', unit: 'cm', digits: 0}, {key: 'n', label: 'Số vòng gỗ', digits: 0}],
    measure: (p, _s, rng) => ({D: p.D, n: Math.max(1, Math.round(p.D / 2 / 0.4 + 1.5 * gauss(rng)))}),
    viewBox: [560, 220],
    scene: (p, _s, last) => {
      const n = last ? last.n : Math.round(p.D / 0.8);
      const R = 30 + p.D * 1.3;
      const shown = Math.min(n, 24);
      return [{t: 'circle', cx: 160, cy: 110, r: Math.min(100, R), fill: '#FDE68A', stroke: '#78350F', w: 4}, ...Array.from({length: shown}, (_, i): Shape => ring(160, 110, (Math.min(100, R) * (i + 1)) / (shown + 1), '#B45309', 1)), ...lcd(320, 60, 200, last ? `${last.n} vòng` : '— vòng'), txt(320, 120, `D = ${p.D} cm`, {size: 13, anchor: 'start'}), txt(320, 145, 'Mỗi vòng = 1 năm (vùng có mùa rõ)', {size: 11, anchor: 'start', fill: '#78716C'})];
    },
    chart: {x: 'D', y: 'n', xLabel: 'Đường kính (cm)', yLabel: 'Số vòng', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.D), rows.map((r) => r.n));
      return [
        {key: 'slope', label: 'Số vòng tăng thêm mỗi cm đường kính', value: fit.slope, digits: 2},
        {key: 'w', label: 'Bề dày vòng gỗ trung bình', value: 10 / (2 * fit.slope), unit: 'mm', digits: 1},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 3},
      ];
    },
    verdict: (c) => (c.results.slope > 1.05 && c.results.slope < 1.45 ? {ok: true, text: `Mỗi năm thân dày thêm ≈ ${f(c.results.w)} mm mỗi bên; đếm vòng gỗ cho biết tuổi cây.`} : {ok: false, text: 'Đếm vòng trên ít nhất 4 thân có đường kính khác nhau.'}),
    steps: [
      {text: 'Đếm vòng trên ít nhất 4 thân có đường kính khác nhau', done: (c) => c.distinct('D') >= 4},
      {text: 'Đồ thị gần thẳng (R² > 0,95)', done: (c) => c.results.r2 > 0.95},
    ],
    questions: [{q: 'Vì sao mỗi năm tạo một vòng gỗ rõ?', options: ['Tầng phát sinh hoạt động mạnh mùa mưa ấm, yếu mùa khô lạnh', 'Cây bị cắt mỗi năm', 'Vỏ cây bong ra', 'Rễ dài thêm'], answer: 0, why: 'Gỗ sớm (mạch to, màu nhạt) và gỗ muộn (mạch nhỏ, sẫm) xen kẽ tạo vòng năm.'}],
    keywords: /tinh tuoi cay|dem vong go|vong go (?:hang nam|tinh tuoi)/,
    examples: ['thực hành tính tuổi cây', 'thực hành đếm vòng gỗ'],
    script: [setp('D', 15), M, setp('D', 25), M, setp('D', 35), M, setp('D', 45), M, setp('D', 55), M],
  },
  {
    id: 'METAMORPHOSIS',
    lesson: 'Sinh 11, bài 23',
    title: 'Thực hành quan sát quá trình biến thái ở động vật',
    goal: 'Theo dõi theo ngày các giai đoạn phát triển của ếch, bướm (biến thái hoàn toàn) và châu chấu (biến thái không hoàn toàn).',
    hazards: ['Rửa tay sau khi chăm sóc động vật; thả lại tự nhiên sau khi quan sát'],
    apparatus: 'Bể nuôi nòng nọc, hộp nuôi sâu, kính lúp, thước',
    sliders: [{key: 'd', label: 'Ngày theo dõi', unit: 'ngày', min: 0, max: 60, step: 2, value: 2}],
    choices: [{key: 'sp', label: 'Loài', value: 'frog', options: META}],
    columns: [{key: 'sp', label: 'Loài (1 ếch, 2 bướm, 3 châu chấu)', digits: 0}, {key: 'd', label: 'Ngày', digits: 0}, {key: 'k', label: 'Giai đoạn số', digits: 0}, {key: 'L', label: 'Chiều dài', unit: 'mm', digits: 0}],
    measure: (p, s, rng) => {
      const sp = code(META, s.sp);
      const k = stageOf(sp, p.d);
      return {sp, d: p.d, k: k + 1, L: Math.max(1, noisy(META_STAGES[sp - 1][k][2], META_STAGES[sp - 1][k][2] * 0.1, 1, rng))};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const sp = code(META, s.sp);
      const st = META_STAGES[sp - 1];
      const k = stageOf(sp, p.d);
      return [...st.flatMap(([, name], i): Shape[] => [{t: 'circle', cx: 80 + i * 130, cy: 100, r: 34, fill: i === k ? '#BBF7D0' : '#F5F5F4', stroke: i === k ? C.green : C.grey, w: i === k ? 3 : 1.5}, txt(80 + i * 130, 160, name, {size: 11, bold: i === k}), ...(i < st.length - 1 ? [ln(118 + i * 130, 100, 172 + i * 130, 100, {stroke: C.grey, arrow: true})] : [])]), txt(40, 30, `${META[sp - 1][1]} · ngày ${p.d}`, {size: 13, anchor: 'start', bold: true})];
    },
    results: (rows) => META.map(([key, name], i) => ({key, label: `Số giai đoạn đã thấy: ${name}`, value: new Set(where(rows, (r) => r.sp === i + 1).map((r) => r.k)).size, digits: 0})),
    verdict: (c) => (c.results.frog >= 4 && c.results.butterfly >= 4 && c.results.grasshopper >= 3 ? {ok: true, text: 'Ếch và bướm qua giai đoạn ấu trùng khác hẳn con trưởng thành (biến thái hoàn toàn); châu chấu non giống con trưởng thành (không hoàn toàn).'} : {ok: false, text: 'Theo dõi mỗi loài đến khi thấy đủ các giai đoạn.'}),
    steps: [
      {text: 'Ếch: thấy đủ 4 giai đoạn', done: (c) => c.results.frog >= 4},
      {text: 'Bướm: thấy đủ 4 giai đoạn', done: (c) => c.results.butterfly >= 4},
      {text: 'Châu chấu: thấy đủ 3 giai đoạn', done: (c) => c.results.grasshopper >= 3},
    ],
    questions: [{q: 'Loài nào biến thái không hoàn toàn?', options: ['Châu chấu', 'Bướm', 'Ếch', 'Ruồi'], answer: 0, why: 'Châu chấu non giống con trưởng thành, lột xác nhiều lần, không có giai đoạn nhộng.'}],
    keywords: /quan sat (?:qua trinh )?bien thai|bien thai (?:o |cua )?dong vat|bien thai hoan toan va khong hoan toan/,
    examples: ['thực hành quan sát quá trình biến thái ở động vật', 'thực hành biến thái hoàn toàn và không hoàn toàn'],
    script: [ch('sp', 'frog'), ...[2, 10, 30, 50].flatMap((d) => [setp('d', d), M]), ch('sp', 'butterfly'), ...[2, 10, 20, 30].flatMap((d) => [setp('d', d), M]), ch('sp', 'grasshopper'), ...[2, 20, 50].flatMap((d) => [setp('d', d), M])],
  },
  {
    id: 'PROPAGATION',
    lesson: 'Sinh 11, bài 26',
    title: 'Thực hành nhân giống vô tính và thụ phấn cho cây',
    goal: 'Mỗi lô 20 cây/hoa: giâm cành có và không có auxin, chiết cành có và không bôi thuốc ra rễ, ghép khớp và không khớp tượng tầng, thụ phấn nhân tạo và bao hoa không thụ phấn; tính tỉ lệ thành công.',
    hazards: ['Dao ghép sắc: cắt hướng ra ngoài người'],
    apparatus: 'Cành giâm, bầu chiết, dao ghép, dây buộc, chế phẩm auxin (NAA/IBA), bút lông thụ phấn, túi bao hoa',
    sliders: [{key: 'd', label: 'Số ngày theo dõi', unit: 'ngày', min: 0, max: 35, step: 7, value: 28}],
    choices: [
      {key: 'm', label: 'Phương pháp', value: 'cutting', options: PROP},
      {key: 'tr', label: 'Nhóm', value: 'yes', options: [['yes', 'Làm đúng kĩ thuật / có xử lí'], ['no', 'Đối chứng']]},
    ],
    columns: [{key: 'm', label: 'Cách (1 giâm, 2 chiết, 3 ghép, 4 thụ phấn)', digits: 0}, {key: 'tr', label: 'Xử lí (1/0)', digits: 0}, {key: 'd', label: 'Ngày', digits: 0}, {key: 'k', label: 'Thành công / 20', digits: 0}, {key: 'pct', label: 'Tỉ lệ', unit: '%', digits: 0}],
    measure: (p, s, rng) => {
      const m = code(PROP, s.m);
      const tr = s.tr === 'yes' ? 1 : 0;
      const k = binom(20, PROP_P[m - 1][1 - tr] * Math.min(1, p.d / 21), rng);
      return {m, tr, d: p.d, k, pct: 5 * k};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => {
      const k = last ? last.k : 0;
      return [...Array.from({length: 20}, (_, i): Shape => ({t: 'circle', cx: 60 + (i % 10) * 44, cy: 70 + Math.floor(i / 10) * 60, r: 16, fill: i < k ? '#86EFAC' : '#E7E5E4', stroke: i < k ? C.green : C.grey})), txt(280, 190, `${PROP[code(PROP, s.m) - 1][1]} · ${s.tr === 'yes' ? 'có xử lí' : 'đối chứng'}${last ? ` · ${last.k}/20 thành công` : ''}`, {size: 13, bold: true})];
    },
    results: (rows) =>
      PROP.flatMap(([key, name], i) =>
        [1, 0].map((tr) => ({key: `${key}${tr}`, label: `${name} ${tr ? '(xử lí)' : '(đối chứng)'}`, value: avg(where(rows, (r) => r.m === i + 1 && r.tr === tr && r.d >= 21), 'pct'), unit: '%', digits: 0})),
      ),
    verdict: (c) => (PROP.every(([key]) => c.results[`${key}1`] > c.results[`${key}0`]) ? {ok: true, text: 'Ở mọi phương pháp, làm đúng kĩ thuật (auxin, khớp tượng tầng, thụ phấn) cho tỉ lệ thành công cao hơn đối chứng.'} : {ok: false, text: 'Cần đủ bốn phương pháp, mỗi phương pháp có nhóm xử lí và đối chứng theo dõi ≥ 21 ngày.'}),
    steps: PROP.map(([, name], i) => ({text: `${name}: nhóm xử lí và đối chứng (≥ 21 ngày)`, done: (c: {rows: Row[]}) => [0, 1].every((tr) => c.rows.some((r) => r.m === i + 1 && r.tr === tr && r.d >= 21))})),
    questions: [
      {q: 'Khi ghép cành phải làm khớp phần nào của cành ghép và gốc ghép?', options: ['Tượng tầng (mô phân sinh bên)', 'Vỏ ngoài', 'Lõi gỗ', 'Lá'], answer: 0, why: 'Tượng tầng của hai bên phân chia, liền nhau tạo mạch dẫn thông suốt.'},
      {q: 'Nhân giống vô tính giữ được đặc điểm gì của cây mẹ?', options: ['Toàn bộ kiểu gen', 'Chỉ màu hoa', 'Không giữ được gì', 'Chỉ chiều cao'], answer: 0, why: 'Cây con sinh ra từ nguyên phân nên giống hệt cây mẹ về kiểu gen.'},
    ],
    keywords: /nhan giong vo tinh|giam,? chiet,? ghep|thu phan nhan tao (?:cho cay)?/,
    examples: ['thực hành nhân giống vô tính và thụ phấn cho cây', 'thực hành giâm, chiết, ghép cành'],
    script: [setp('d', 28), ...PROP.flatMap(([m]) => [ch('m', m), ch('tr', 'yes'), M, ch('tr', 'no'), M])],
  },
  {
    id: 'DNA_EXTRACT',
    lesson: 'Sinh 12, bài 6',
    title: 'Thực hành tách chiết DNA',
    goal: 'Nghiền mẫu, phá màng bằng dịch chiết (nước rửa chén + muối), lọc, kết tủa DNA bằng cồn lạnh; so sánh lượng DNA thu được khi bỏ bớt bước.',
    hazards: ['Cồn dễ cháy, để xa lửa', 'Không ăn mẫu sau thí nghiệm'],
    apparatus: 'Gan gà hoặc chuối, cối chày, nước rửa chén, muối ăn, giấy lọc, cồn 90° để lạnh, que thủy tinh',
    sliders: [{key: 'mass', label: 'Khối lượng mẫu', unit: 'g', min: 5, max: 50, step: 5, value: 20}],
    choices: [
      {key: 'grind', label: 'Nghiền mẫu', value: 'no', options: yes},
      {key: 'lysis', label: 'Dịch chiết (nước rửa chén + muối)', value: 'no', options: yes},
      {key: 'filter', label: 'Lọc bỏ cặn', value: 'no', options: yes},
      {key: 'eth', label: 'Cồn kết tủa', value: 'warm', options: [['warm', 'Cồn ở nhiệt độ phòng'], ['cold', 'Cồn để lạnh']]},
    ],
    columns: [{key: 'm', label: 'Mẫu', unit: 'g', digits: 0}, {key: 'ok', label: 'Đủ quy trình (1/0)', digits: 0}, {key: 'y', label: 'DNA thu được', unit: 'mg', digits: 2}, {key: 'pu', label: 'Độ sạch A260/A280', digits: 2}],
    measure: (p, s, rng) => {
      const ok = s.grind === 'yes' && s.lysis === 'yes' && s.filter === 'yes' && s.eth === 'cold' ? 1 : 0;
      const y = p.mass * 0.04 * (s.grind === 'yes' ? 1 : 0.2) * (s.lysis === 'yes' ? 1 : 0.1) * (s.eth === 'cold' ? 1 : 0.35);
      return {m: p.mass, ok, y: Math.max(0, noisy(y, y * 0.05, 0.01, rng)), pu: noisy(s.filter === 'yes' ? 1.8 : 1.4, 0.03, 0.01, rng)};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => [...tube(160, 30, 170, '#FEF3C7', 0.5), ...tube(160, 30, 170, 'rgba(219,234,254,0.8)', 0.75), ...(last ? Array.from({length: Math.min(12, Math.round(last.y * 5))}, (_, i): Shape => ({t: 'path', d: `M${150 + (i % 3) * 6} ${110 - i * 3} q4 -6 8 0 q4 6 8 0`, stroke: '#FFFFFF', w: 2})) : []), txt(160, 214, 'lớp cồn / dịch chiết', {size: 10}), ...lcd(280, 60, 230, last ? `DNA ${f(last.y, 2)} mg` : 'DNA —'), txt(280, 120, ['grind', 'lysis', 'filter'].map((k) => `${s[k] === 'yes' ? '✓' : '✗'} ${({grind: 'nghiền', lysis: 'dịch chiết', filter: 'lọc'} as Record<string, string>)[k]}`).join('  ') + `  ${s.eth === 'cold' ? '✓' : '✗'} cồn lạnh`, {size: 12, anchor: 'start'})],
    chart: {x: 'm', y: 'y', xLabel: 'Mẫu (g)', yLabel: 'DNA (mg)', fit: true},
    results: (rows) => {
      const full = where(rows, (r) => r.ok === 1);
      const fit = linearFit(full.map((r) => r.m), full.map((r) => r.y));
      return [
        {key: 'yield', label: 'DNA thu được mỗi gam mẫu (đủ quy trình)', value: fit.slope, unit: 'mg/g', digits: 3},
        {key: 'pu', label: 'Độ sạch trung bình (đủ quy trình)', value: avg(full, 'pu'), digits: 2},
      ];
    },
    verdict: (c) => (c.results.yield > 0.03 && c.results.yield < 0.05 && c.results.pu >= 1.7 ? {ok: true, text: `Thu ≈ ${f(c.results.yield * 1000, 0)} µg DNA mỗi gam mẫu, độ sạch ≈ ${f(c.results.pu, 2)}.`} : {ok: false, text: 'Làm đủ bốn bước (nghiền, dịch chiết, lọc, cồn lạnh) với ít nhất 3 khối lượng mẫu.'}),
    steps: [
      {text: 'Nghiền mẫu', done: (c) => c.s.grind === 'yes'},
      {text: 'Thêm dịch chiết phá màng', done: (c) => c.s.lysis === 'yes'},
      {text: 'Lọc bỏ cặn', done: (c) => c.s.filter === 'yes'},
      {text: 'Kết tủa bằng cồn lạnh', done: (c) => c.s.eth === 'cold'},
      {text: 'Đủ quy trình với ít nhất 3 khối lượng mẫu', done: (c) => new Set(where(c.rows, (r) => r.ok === 1).map((r) => r.m)).size >= 3},
    ],
    questions: [
      {q: 'Nước rửa chén trong dịch chiết có vai trò:', options: ['Phá màng tế bào và màng nhân (lipid)', 'Kết tủa DNA', 'Nhuộm màu DNA', 'Làm lạnh mẫu'], answer: 0, why: 'Chất tẩy hòa tan lipid màng, giải phóng DNA ra dịch.'},
      {q: 'Vì sao DNA kết tủa khi cho cồn lạnh?', options: ['DNA không tan trong cồn, nhiệt độ thấp giúp kết tủa nhiều hơn', 'Cồn phân hủy protein thành DNA', 'Cồn làm DNA nóng chảy', 'Không có lí do'], answer: 0, why: 'DNA tan trong nước nhưng không tan trong cồn; lạnh làm giảm độ tan hơn nữa.'},
    ],
    keywords: /tach chiet dna|tach chiet adn|chiet xuat (?:dna|adn)/,
    examples: ['thực hành tách chiết DNA', 'thực hành tách chiết ADN từ gan gà'],
    script: [ch('grind', 'yes'), ch('lysis', 'yes'), ch('filter', 'yes'), ch('eth', 'cold'), setp('mass', 10), M, setp('mass', 20), M, setp('mass', 30), M, setp('mass', 40), M],
  },
  {
    id: 'CHROMOSOME_MUTATION',
    lesson: 'Sinh 12, bài 14',
    title: 'Thực hành quan sát đột biến số lượng nhiễm sắc thể trên tiêu bản',
    goal: 'Đếm số nhiễm sắc thể ở kì giữa trên tiêu bản cố định của cây bình thường (2n = 16) và các thể đột biến; xác định dạng đột biến.',
    hazards: [],
    apparatus: 'Kính hiển vi, tiêu bản cố định tế bào chóp rễ ở kì giữa',
    sliders: [],
    choices: [{key: 'sl', label: 'Tiêu bản', value: 'normal', options: CHROMO}],
    columns: [{key: 'sl', label: 'Tiêu bản (1 bình thường … 4 tứ bội)', digits: 0}, {key: 'n', label: 'Số NST đếm được', digits: 0}],
    measure: (_p, s, rng) => {
      const sl = code(CHROMO, s.sl);
      // đôi khi hai NST chồng nhau hoặc một NST nằm lệch: đếm lệch ±1
      const err = rng() < 0.2 ? (rng() < 0.5 ? -1 : 1) : 0;
      return {sl, n: CHROMO_N[sl - 1] + err};
    },
    viewBox: [560, 220],
    scene: (_p, s) => {
      const n = CHROMO_N[code(CHROMO, s.sl) - 1];
      const rng = seeded(n);
      return scope(Array.from({length: n}, (_, i): Shape => {
        const a = (i / n) * Math.PI * 2 + rng();
        const r = 20 + rng() * 60;
        const x = 280 + r * Math.cos(a);
        const y = 110 + r * Math.sin(a);
        const t = rng() * Math.PI;
        return ln(x - 7 * Math.cos(t), y - 7 * Math.sin(t), x + 7 * Math.cos(t), y + 7 * Math.sin(t), {stroke: '#7E22CE', w: 4});
      }), 'Tế bào kì giữa · vật kính 40×');
    },
    results: (rows) => CHROMO.map(([key, name], i) => ({key, label: `Số NST (giá trị gặp nhiều nhất): ${name}`, value: mode(where(rows, (r) => r.sl === i + 1).map((r) => r.n)), digits: 0})),
    verdict: (c) => (CHROMO.every(([key], i) => c.results[key] === CHROMO_N[i]) ? {ok: true, text: '2n = 16; thể ba 17; tam bội 24; tứ bội 32: đột biến lệch bội thêm một NST, đa bội tăng cả bộ.'} : {ok: false, text: 'Đếm ít nhất 4 tế bào mỗi tiêu bản và lấy giá trị gặp nhiều nhất.'}),
    steps: CHROMO.map(([, name], i) => ({text: `Đếm ít nhất 4 tế bào: ${name}`, done: (c: {rows: Row[]}) => where(c.rows, (r) => r.sl === i + 1).length >= 4})),
    questions: [{q: 'Tế bào có 17 NST khi 2n = 16 là thể đột biến nào?', options: ['Thể ba (lệch bội)', 'Tam bội', 'Mất đoạn', 'Thể một'], answer: 0, why: 'Thêm một NST ở một cặp: 2n + 1.'}],
    keywords: /dot bien (?:so luong )?nhiem sac the tren tieu ban|quan sat (?:mot so dang )?dot bien nhiem sac the|tieu ban (?:co dinh )?dot bien nst/,
    examples: ['thực hành quan sát một số dạng đột biến nhiễm sắc thể', 'thực hành tiêu bản cố định đột biến NST'],
    script: CHROMO.flatMap(([sl]) => [ch('sl', sl), ...rep(5)]),
  },
  {
    id: 'MODIFICATION',
    lesson: 'Sinh 12, bài 17',
    title: 'Thực hành thí nghiệm về thường biến ở cây trồng',
    goal: 'Trồng hai giống (mỗi giống một kiểu gen) ở các mức phân bón khác nhau, đo năng suất; vẽ mức phản ứng của từng giống.',
    hazards: [],
    apparatus: 'Ô ruộng hoặc chậu, hai giống cây, phân đạm, cân',
    sliders: [{key: 'N', label: 'Lượng phân đạm', unit: 'kg/ha', min: 0, max: 200, step: 25, value: 50}],
    choices: [{key: 'g', label: 'Giống', value: 'A', options: [['A', 'Giống A'], ['B', 'Giống B']]}],
    columns: [{key: 'g', label: 'Giống (1 A, 2 B)', digits: 0}, {key: 'N', label: 'Phân đạm', unit: 'kg/ha', digits: 0}, {key: 'y', label: 'Năng suất', unit: 'tấn/ha', digits: 1}],
    measure: (p, s, rng) => {
      const g = s.g === 'A' ? 1 : 2;
      return {g, N: p.N, y: noisy(g === 1 ? 3 + 0.03 * p.N - 0.0001 * p.N ** 2 : 4 + 0.012 * p.N, 0.15, 0.1, rng)};
    },
    viewBox: [560, 220],
    scene: (p, s) => {
      const y = s.g === 'A' ? 3 + 0.03 * p.N - 0.0001 * p.N ** 2 : 4 + 0.012 * p.N;
      return [ground(200), ...Array.from({length: 8}, (_, i): Shape[] => [ln(60 + i * 60, 200, 60 + i * 60, 200 - y * 22, {stroke: '#65A30D', w: 4}), {t: 'circle', cx: 60 + i * 60, cy: 200 - y * 22, r: 3 + y, fill: '#EAB308'}]).flat(), txt(40, 24, `Giống ${s.g} · ${p.N} kg đạm/ha`, {size: 13, anchor: 'start', bold: true})];
    },
    chart: {x: 'N', y: 'y', xLabel: 'Phân đạm (kg/ha)', yLabel: 'Năng suất (tấn/ha)', fit: false},
    results: (rows) =>
      ['A', 'B'].map((g, i) => {
        const ys = where(rows, (r) => r.g === i + 1).map((r) => r.y);
        return {key: g, label: `Khoảng biến động năng suất giống ${g}`, value: ys.length ? Math.max(...ys) - Math.min(...ys) : NaN, unit: 'tấn/ha', digits: 1};
      }),
    verdict: (c) => (c.results.A >= 1 && c.results.B >= 1 ? {ok: true, text: 'Cùng một kiểu gen nhưng năng suất thay đổi theo phân bón: đó là thường biến; mỗi giống có mức phản ứng riêng.'} : {ok: false, text: 'Trồng mỗi giống ở ít nhất 3 mức phân bón trải rộng.'}),
    steps: ['A', 'B'].map((g, i) => ({text: `Giống ${g}: ít nhất 3 mức phân bón`, done: (c: {rows: Row[]}) => new Set(where(c.rows, (r) => r.g === i + 1).map((r) => r.N)).size >= 3})),
    questions: [{q: 'Thường biến có di truyền cho đời sau không?', options: ['Không, vì kiểu gen không đổi', 'Có, luôn luôn', 'Chỉ qua mẹ', 'Chỉ ở thực vật'], answer: 0, why: 'Thường biến là biến đổi kiểu hình do môi trường, không làm thay đổi vật chất di truyền.'}],
    keywords: /thuong bien (?:o |cua )?cay trong|thi nghiem ve thuong bien|muc phan ung cua giong/,
    examples: ['thực hành thí nghiệm về thường biến ở cây trồng'],
    script: [ch('g', 'A'), setp('N', 0), M, setp('N', 75), M, setp('N', 150), M, ch('g', 'B'), setp('N', 0), M, setp('N', 75), M, setp('N', 150), M],
  },
  {
    id: 'QUADRAT',
    lesson: 'Sinh 12, bài 25',
    title: 'Thực hành xác định kiểu phân bố và ước tính mật độ, kích thước quần thể',
    goal: 'Đặt ngẫu nhiên các ô tiêu chuẩn 1 m² ở ba khu vực, đếm cá thể, tính mật độ trung bình, phương sai/trung bình để xác định kiểu phân bố và ước tính kích thước quần thể trên 500 m².',
    hazards: ['Đi thành nhóm, mang găng tay, tránh khu vực có rắn, côn trùng đốt'],
    apparatus: 'Khung ô tiêu chuẩn 1 m × 1 m, cọc, dây, thước dây, phiếu ghi',
    sliders: [],
    choices: [{key: 'site', label: 'Khu vực', value: 'A', options: SITES}],
    columns: [{key: 'site', label: 'Khu (1 A, 2 B, 3 C)', digits: 0}, {key: 'n', label: 'Số cá thể trong ô', digits: 0}],
    measure: (_p, s, rng) => {
      const site = code(SITES, s.site);
      const n = site === 1 ? Math.max(0, Math.round(10 + gauss(rng))) : site === 2 ? poisson(10, rng) : rng() < 0.3 ? poisson(28, rng) : poisson(2, rng);
      return {site, n};
    },
    viewBox: [560, 220],
    scene: (_p, s) => {
      const site = code(SITES, s.site);
      const rng = seeded(site * 31);
      const pts: [number, number][] = [];
      if (site === 1) for (let i = 0; i < 60; i++) pts.push([40 + (i % 12) * 40, 30 + Math.floor(i / 12) * 38]);
      else if (site === 2) for (let i = 0; i < 60; i++) pts.push([30 + rng() * 500, 20 + rng() * 180]);
      else for (let c = 0; c < 5; c++) {
        const [cx, cy] = [60 + rng() * 440, 40 + rng() * 140];
        for (let i = 0; i < 12; i++) pts.push([cx + gauss(rng) * 15, cy + gauss(rng) * 12]);
      }
      return [box(20, 10, 520, 200, '#ECFCCB', '#65A30D'), ...pts.map(([x, y]): Shape => dot(x, y, 4, '#15803D')), box(240, 80, 70, 70, undefined, C.red), txt(275, 165, 'ô 1 m²', {size: 10, fill: C.red})];
    },
    results: (rows, _p, s) => {
      const vmr = (site: number) => {
        const xs = where(rows, (r) => r.site === site).map((r) => r.n);
        return variance(xs) / mean(xs);
      };
      const cur = where(rows, (r) => r.site === code(SITES, s.site)).map((r) => r.n);
      return [
        {key: 'mean', label: 'Mật độ trung bình (khu đang chọn)', value: mean(cur), unit: 'cá thể/m²', digits: 1},
        {key: 'N', label: 'Ước tính kích thước quần thể trên 500 m²', value: mean(cur) * 500, unit: 'cá thể', digits: 0},
        {key: 'vA', label: 'Phương sai / trung bình, khu A', value: vmr(1), digits: 2},
        {key: 'vB', label: 'Phương sai / trung bình, khu B', value: vmr(2), digits: 2},
        {key: 'vC', label: 'Phương sai / trung bình, khu C', value: vmr(3), digits: 2},
      ];
    },
    verdict: (c) =>
      c.results.vA < 0.6 && c.results.vB > 0.4 && c.results.vB < 2 && c.results.vC > 2
        ? {ok: true, text: `Khu A phân bố đều (${f(c.results.vA, 2)} < 1), khu B ngẫu nhiên (≈ 1), khu C theo nhóm (${f(c.results.vC, 1)} > 1).`}
        : {ok: false, text: 'Đặt ít nhất 10 ô ở mỗi khu để tỉ số phương sai/trung bình đủ tin cậy.'},
    steps: SITES.map(([, name], i) => ({text: `${name}: ít nhất 10 ô`, done: (c: {rows: Row[]}) => where(c.rows, (r) => r.site === i + 1).length >= 10})),
    questions: [{q: 'Tỉ số phương sai / trung bình lớn hơn 1 rõ rệt cho biết kiểu phân bố nào?', options: ['Theo nhóm', 'Đồng đều', 'Ngẫu nhiên', 'Không xác định'], answer: 0, why: 'Cá thể tụ lại thành đám nên có ô rất đông, có ô gần như trống.'}],
    keywords: /kieu phan bo ca the|o tieu chuan|uoc tinh (?:kich thuoc|mat do) (?:ca the )?quan the|khu vuc phan bo.*quan the/,
    examples: ['thực hành xác định kiểu phân bố cá thể', 'thực hành ước tính mật độ cá thể quần thể'],
    script: SITES.flatMap(([site]) => [ch('site', site), ...rep(12)]),
  },
  {
    id: 'COMMUNITY',
    lesson: 'Sinh 12, bài 27',
    title: 'Thực hành tìm hiểu một số đặc trưng cơ bản của quần xã',
    goal: 'Đếm 5 loài thực vật chính trong các ô tiêu chuẩn ở rừng thứ sinh, đồng cỏ và ruộng lúa; tính số loài, loài ưu thế và chỉ số đa dạng Simpson.',
    hazards: ['Không hái, nhổ cây khi chưa được phép'],
    apparatus: 'Khung ô tiêu chuẩn, khóa định loại, phiếu ghi. Loài 1–5 xếp theo độ phổ biến ở mỗi nơi (ví dụ ruộng lúa: lúa, cỏ lồng vực, rau bợ, bèo tấm, cỏ gấu)',
    sliders: [],
    choices: [{key: 'site', label: 'Quần xã', value: 'forest', options: COMM}],
    columns: [{key: 'site', label: 'Nơi (1 rừng, 2 cỏ, 3 lúa)', digits: 0}, ...['a', 'b', 'c', 'd', 'e'].map((key, i) => ({key, label: `Loài ${i + 1}`, digits: 0}))],
    measure: (_p, s, rng) => {
      const site = code(COMM, s.site);
      const [a, b, c, d, e] = COMM_LAM[site - 1].map((l) => poisson(l, rng));
      return {site, a, b, c, d, e};
    },
    viewBox: [560, 220],
    scene: (_p, s, last) => {
      const site = code(COMM, s.site);
      const counts = last && last.site === site ? ['a', 'b', 'c', 'd', 'e'].map((k) => last[k]) : COMM_LAM[site - 1];
      const colors = [C.green, C.teal, C.gold, C.purple, C.orange];
      return [ground(180), ...counts.flatMap((v, i) => bar(70 + i * 90, 180, 60, Math.min(150, v * 3.5), colors[i], `Loài ${i + 1}`, f(v, 0))), txt(40, 24, COMM[site - 1][1], {size: 13, anchor: 'start', bold: true})];
    },
    results: (rows, _p, s) => {
      const cur = where(rows, (r) => r.site === code(COMM, s.site));
      const tot = ['a', 'b', 'c', 'd', 'e'].map((k) => cur.reduce((a, r) => a + r[k], 0));
      return [
        {key: 'rich', label: 'Số loài gặp (nơi đang chọn)', value: tot.filter((x) => x > 0).length, digits: 0},
        {key: 'dom', label: 'Tỉ lệ của loài ưu thế', value: (100 * Math.max(...tot)) / (tot.reduce((a, b) => a + b, 0) || NaN), unit: '%', digits: 0},
        ...COMM.map(([key], i) => ({key: `D_${key}`, label: `Chỉ số đa dạng Simpson: ${COMM[i][1]}`, value: simpson(where(rows, (r) => r.site === i + 1)), digits: 2})),
      ];
    },
    verdict: (c) => (c.results.D_forest > c.results.D_grass && c.results.D_grass > c.results.D_rice ? {ok: true, text: `Đa dạng: rừng ${f(c.results.D_forest, 2)} > đồng cỏ ${f(c.results.D_grass, 2)} > ruộng lúa ${f(c.results.D_rice, 2)} (ruộng có một loài ưu thế tuyệt đối).`} : {ok: false, text: 'Đặt ít nhất 5 ô ở mỗi quần xã.'}),
    steps: COMM.map(([, name], i) => ({text: `${name}: ít nhất 5 ô`, done: (c: {rows: Row[]}) => where(c.rows, (r) => r.site === i + 1).length >= 5})),
    questions: [{q: 'Quần xã nào thường ổn định hơn trước biến động môi trường?', options: ['Quần xã có độ đa dạng cao', 'Quần xã chỉ có một loài', 'Quần xã ít cá thể', 'Không liên quan'], answer: 0, why: 'Nhiều loài, nhiều mối quan hệ dinh dưỡng thay thế nhau giúp quần xã bền vững.'}],
    keywords: /dac trung (?:co ban )?cua quan xa|tim hieu (?:mot so )?dac trung (?:co ban )?(?:cua )?quan xa|chi so da dang simpson/,
    examples: ['thực hành tìm hiểu một số đặc trưng cơ bản của quần xã'],
    script: COMM.flatMap(([site]) => [ch('site', site), ...rep(5)]),
  },
  {
    id: 'MINI_ECOSYSTEM',
    lesson: 'Sinh 12, bài 32',
    title: 'Thực hành thiết kế một hệ sinh thái nhân tạo (bể cá)',
    goal: 'Chọn số cây thủy sinh, số cá và thời gian chiếu sáng; đo oxygen hòa tan sau 7 ngày và tìm bố trí để cá sống khỏe mà không cần sục khí.',
    hazards: ['Cắm điện đèn và máy bơm xa nước, có giáo viên kiểm tra'],
    apparatus: 'Bể kính, cát, cây thủy sinh, cá nhỏ, ốc, đèn, máy đo oxygen hòa tan',
    sliders: [
      {key: 'pl', label: 'Số cây thủy sinh', min: 0, max: 10, step: 1, value: 2},
      {key: 'fi', label: 'Số cá', min: 0, max: 10, step: 1, value: 5},
      {key: 'L', label: 'Chiếu sáng mỗi ngày', unit: 'giờ', min: 0, max: 16, step: 1, value: 8},
    ],
    columns: [{key: 'pl', label: 'Cây', digits: 0}, {key: 'fi', label: 'Cá', digits: 0}, {key: 'L', label: 'Sáng', unit: 'giờ', digits: 0}, {key: 'O2', label: 'O₂ hòa tan', unit: 'mg/L', digits: 1}, {key: 'al', label: 'Cá sống sau 7 ngày', digits: 0}],
    measure: (p, _s, rng) => {
      const O2 = clamp(noisy(3 + (0.55 * p.pl * p.L) / 12 - 0.45 * p.fi, 0.3, 0.1, rng), 0, 12);
      return {pl: p.pl, fi: p.fi, L: p.L, O2, al: O2 >= 4 ? p.fi : Math.round((p.fi * O2) / 4)};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => [
      box(40, 30, 340, 170, '#E0F2FE', '#0369A1'),
      box(40, 180, 340, 20, '#D6D3D1'),
      ...Array.from({length: p.pl}, (_, i): Shape => ({t: 'path', d: `M${60 + i * 32} 180 q-8 -40 4 -80 q8 30 -4 80`, fill: '#22C55E'})),
      ...Array.from({length: p.fi}, (_, i): Shape => ({t: 'path', d: `M${80 + (i % 5) * 60} ${70 + Math.floor(i / 5) * 50} q15 -10 30 0 l8 -6 v12 l-8 -6 q-15 10 -30 0 Z`, fill: last && i >= last.al ? '#A8A29E' : C.orange})),
      {t: 'circle', cx: 470, cy: 50, r: 6 + p.L, fill: '#FDE047', o: 0.8},
      ...lcd(400, 120, 140, last ? `O₂ ${f(last.O2)} mg/L` : 'O₂ —'),
    ],
    results: (rows) => {
      const ok = where(rows, (r) => r.fi >= 4 && r.O2 >= 5 && r.al === r.fi);
      return [
        {key: 'stable', label: 'Số bố trí bền vững (≥ 4 cá, O₂ ≥ 5 mg/L)', value: ok.length, digits: 0},
        {key: 'best', label: 'O₂ cao nhất đạt được', value: Math.max(...rows.map((r) => r.O2)), unit: 'mg/L', digits: 1},
      ];
    },
    verdict: (c) => (c.results.stable >= 1 ? {ok: true, text: 'Em đã tìm được bể cân bằng: cây quang hợp tạo đủ O₂ cho cá, cá thải CO₂ và chất khoáng cho cây.'} : {ok: false, text: 'Chưa có bố trí nào nuôi được ít nhất 4 cá với O₂ ≥ 5 mg/L: thêm cây, tăng ánh sáng hoặc bớt cá.'}),
    steps: [
      {text: 'Thử ít nhất 3 cách bố trí', done: (c) => new Set(c.rows.map((r) => `${r.pl}-${r.fi}-${r.L}`)).size >= 3},
      {text: 'Tìm bố trí bền vững (≥ 4 cá, O₂ ≥ 5 mg/L, cá sống hết)', done: (c) => c.results.stable >= 1},
    ],
    questions: [{q: 'Trong bể cá cân bằng, vai trò của cây thủy sinh là:', options: ['Sinh vật sản xuất: tạo O₂ và chất hữu cơ', 'Sinh vật tiêu thụ', 'Sinh vật phân giải', 'Chỉ để trang trí'], answer: 0, why: 'Cây quang hợp cung cấp O₂, hấp thụ CO₂ và chất thải chứa nitrogen của cá.'}],
    keywords: /he sinh thai nhan tao|thiet ke (?:mot )?he sinh thai|be ca can bang|he sinh thai ti hon/,
    examples: ['thực hành thiết kế một hệ sinh thái nhân tạo', 'thực hành bể cá cân bằng'],
    script: [setp('L', 12), setp('pl', 0), setp('fi', 6), M, setp('pl', 4), setp('fi', 8), setp('L', 8), M, setp('pl', 10), setp('fi', 4), setp('L', 12), M],
  },
];

export const BIO_BY_ID: Record<string, PhysExperiment> = Object.fromEntries(BIO_EXPERIMENTS.map((e) => [e.id, e]));

