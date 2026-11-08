import {C, arrow, box, dot, ln, poly, rad, ring, spring, txt} from '../../presets/sceneKit';
import type {Shape} from '../../presets/types';
import {linearFit, mean, meanAbsDev, noisy, roundTo} from './engine';
import type {PhysAction, PhysExperiment, Row} from './types';

const G = 9.79;
const M: PhysAction = {type: 'measure'};
const rep = (n: number): PhysAction[] => Array.from({length: n}, () => M);
const setp = (key: string, value: number): PhysAction => ({type: 'set', key, value});
const ch = (key: string, value: string): PhysAction => ({type: 'choose', key, value});
const f = (v: number, d = 2) => v.toLocaleString('vi-VN', {maximumFractionDigits: d});
const lcd = (x: number, y: number, w: number, text: string): Shape[] => [box(x, y, w, 26, '#14532D', '#052E16'), txt(x + w / 2, y + 18, text, {size: 14, fill: '#4ADE80', bold: true})];
const table = (y: number): Shape => ln(30, y, 530, y, {stroke: '#78716C', w: 4});
const fmt = (v: number | undefined, d: number, u = '') => (v === undefined ? '—' : `${f(v, d)}${u ? ` ${u}` : ''}`);
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const safe = {q: 'Trước khi bật nguồn điện của bộ thí nghiệm em phải làm gì?', options: ['Nhờ giáo viên kiểm tra mạch', 'Bật luôn cho nhanh', 'Chạm thử vào dây dẫn', 'Tháo hết thiết bị bảo vệ'], answer: 0, why: 'Chỉ cấp điện khi mạch đã được kiểm tra và được giáo viên cho phép.'};

/** Các bài thực hành và thí nghiệm có đo đạc của Vật lí 10–12: số đo có nhiễu và sai số dụng cụ, làm lại cho số khác. */
export const PHYS_EXPERIMENTS: PhysExperiment[] = [
  {
    id: 'SAFETY',
    lesson: 'Lí 10, bài 2',
    title: 'Quy tắc an toàn trong phòng thực hành Vật lí',
    goal: 'Nhận biết ký hiệu an toàn, nguy cơ về điện, cháy nổ và quy tắc khi làm thí nghiệm.',
    hazards: [],
    apparatus: 'Biển báo và ký hiệu trong phòng thực hành',
    sliders: [],
    choices: [
      {key: 'r1', label: 'Đã đọc: quy tắc về điện', value: 'no', options: [['no', 'Chưa'], ['yes', 'Rồi']]},
      {key: 'r2', label: 'Đã đọc: quy tắc về cháy nổ và hóa chất', value: 'no', options: [['no', 'Chưa'], ['yes', 'Rồi']]},
      {key: 'r3', label: 'Đã đọc: quy tắc về thiết bị quang, nhiệt', value: 'no', options: [['no', 'Chưa'], ['yes', 'Rồi']]},
    ],
    columns: [],
    measure: () => ({}),
    viewBox: [560, 200],
    scene: () => ['⚡ Nguy hiểm điện', '🔥 Dễ cháy', '☣ Hóa chất', '🔆 Tia laser', '🌡 Vật nóng', '⚠ Cẩn thận'].flatMap((t, i): Shape[] => [box(30 + (i % 3) * 175, 30 + Math.floor(i / 3) * 80, 160, 60, i % 2 ? '#FEF3C7' : '#FEE2E2', C.ink), txt(110 + (i % 3) * 175, 66 + Math.floor(i / 3) * 80, t, {size: 14, bold: true})]),
    results: () => [],
    verdict: (c) => (c.s.r1 === 'yes' && c.s.r2 === 'yes' && c.s.r3 === 'yes' ? {ok: true, text: 'Em đã đọc đủ ba nhóm quy tắc an toàn.'} : {ok: false, text: 'Hãy đọc đủ ba nhóm quy tắc trước khi làm thí nghiệm.'}),
    steps: [
      {text: 'Đọc quy tắc an toàn về điện', done: (c) => c.s.r1 === 'yes'},
      {text: 'Đọc quy tắc về cháy nổ và hóa chất', done: (c) => c.s.r2 === 'yes'},
      {text: 'Đọc quy tắc về thiết bị quang và nhiệt', done: (c) => c.s.r3 === 'yes'},
    ],
    questions: [
      safe,
      {q: 'Khi thấy thiết bị điện bốc khói, em phải:', options: ['Ngắt nguồn điện rồi báo giáo viên', 'Lấy nước dập ngay', 'Rút dây bằng tay ướt', 'Tiếp tục làm'], answer: 0, why: 'Ngắt điện trước, không dùng nước dập đám cháy thiết bị điện, báo ngay cho giáo viên.'},
      {q: 'Không được nhìn trực tiếp vào chùm tia nào?', options: ['Laser', 'Ánh sáng đèn bàn', 'Ánh sáng tự nhiên trong lớp', 'Màn hình dao động kí'], answer: 0, why: 'Tia laser có thể gây tổn thương võng mạc kể cả khi công suất nhỏ.'},
    ],
    keywords: /quy tac an toan (?:trong )?phong thuc hanh vat li|an toan khi (?:su dung )?thiet bi thi nghiem vat li|bien bao an toan phong thuc hanh/,
    examples: ['thực hành quy tắc an toàn trong phòng thực hành vật lí'],
    script: [ch('r1', 'yes'), ch('r2', 'yes'), ch('r3', 'yes')],
  },
  {
    id: 'ERROR_MEASURE',
    lesson: 'Lí 10, bài 3',
    title: 'Thực hành tính sai số trong phép đo, ghi kết quả đo',
    goal: 'Đo nhiều lần chiều dài một thanh bằng thước và bằng thước kẹp, tính sai số và ghi kết quả dạng L = L̄ ± ΔL.',
    hazards: [],
    apparatus: 'Thanh kim loại, thước thẳng chia 1 mm, thước kẹp chia 0,02 mm',
    sliders: [],
    choices: [{key: 'inst', label: 'Dụng cụ đo', value: 'ruler', options: [['ruler', 'Thước thẳng (độ chia 1 mm)'], ['caliper', 'Thước kẹp (độ chia 0,02 mm)']]}],
    columns: [{key: 'inst', label: 'Dụng cụ (1 thước, 2 kẹp)'}, {key: 'L', label: 'Chiều dài L', unit: 'cm', digits: 3}],
    measure: (_p, s, rng) => (s.inst === 'ruler' ? {inst: 1, L: noisy(12.347, 0.04, 0.1, rng)} : {inst: 2, L: noisy(12.347, 0.003, 0.002, rng)}),
    viewBox: [560, 200],
    scene: (_p, s, last) => [box(60, 80, 12.347 * 30, 24, '#94A3B8', C.ink), ...(s.inst === 'ruler' ? [box(50, 110, 400, 20, '#FDE68A', C.ink)] : [box(50, 40, 410, 12, '#CBD5E1', C.ink), box(60 + 12.347 * 30, 40, 14, 50, '#94A3B8', C.ink)]), ...lcd(380, 150, 150, last ? `L = ${f(last.L, 3)} cm` : 'L = —')],
    results: (rows, _p, s) => {
      const id = s.inst === 'ruler' ? 1 : 2;
      const xs = rows.filter((r) => r.inst === id).map((r) => r.L);
      const res = s.inst === 'ruler' ? 0.1 : 0.002;
      const dA = meanAbsDev(xs);
      const total = dA + res / 2;
      return [
        {key: 'mean', label: 'Giá trị trung bình L̄', value: mean(xs), unit: 'cm', digits: 3},
        {key: 'dA', label: 'ΔA (trung bình |Lᵢ − L̄|)', value: dA, unit: 'cm', digits: 3},
        {key: 'dI', label: "Sai số dụng cụ ΔA′ = nửa độ chia nhỏ nhất", value: res / 2, unit: 'cm', digits: 3},
        {key: 'dL', label: 'Sai số tuyệt đối ΔL = ΔA + ΔA′', value: total, unit: 'cm', digits: 3},
        {key: 'rel', label: 'Sai số tỉ đối δ', value: (100 * total) / mean(xs), unit: '%', digits: 2},
      ];
    },
    verdict: (c) => (near(c.results.mean, 12.347, c.results.dL) ? {ok: true, text: `L = ${f(c.results.mean, 3)} ± ${f(c.results.dL, 3)} cm chứa giá trị chuẩn 12,347 cm.`} : {ok: false, text: `Giá trị chuẩn 12,347 cm nằm ngoài ${f(c.results.mean, 3)} ± ${f(c.results.dL, 3)} cm: kiểm tra lại cách đọc hoặc số lần đo.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần bằng thước thẳng', done: (c) => c.rows.filter((r) => r.inst === 1).length >= 5},
      {text: 'Đo ít nhất 5 lần bằng thước kẹp', done: (c) => c.rows.filter((r) => r.inst === 2).length >= 5},
      {text: 'Ghi kết quả L = L̄ ± ΔL cho thước kẹp (kết quả dưới bảng)', done: (c) => c.s.inst === 'caliper' && c.rows.filter((r) => r.inst === 2).length >= 5},
    ],
    questions: [
      {q: 'Dụng cụ nào cho sai số tỉ đối nhỏ hơn?', options: ['Thước kẹp', 'Thước thẳng', 'Như nhau', 'Không so sánh được'], answer: 0, why: 'Độ chia nhỏ nhất của thước kẹp nhỏ hơn nên sai số dụng cụ và sai số tỉ đối nhỏ hơn.'},
      {q: 'Đo nhiều lần có làm giảm sai số dụng cụ không?', options: ['Không, chỉ giảm sai số ngẫu nhiên', 'Có, giảm hoàn toàn', 'Có, gấp đôi', 'Phụ thuộc người đo'], answer: 0, why: 'Sai số dụng cụ cố định theo độ chia nhỏ nhất; đo lặp lại chỉ làm trung bình ổn định hơn.'},
    ],
    keywords: /thuc hanh tinh sai so (?:trong )?(?:phep )?do|ghi ket qua do (?:co )?sai so|sai so tuyet doi trung binh thuoc ke?p|ghi ket qua do thuoc kep/,
    examples: ['thực hành tính sai số trong phép đo', 'thực hành ghi kết quả đo thước kẹp'],
    script: [ch('inst', 'ruler'), ...rep(5), ch('inst', 'caliper'), ...rep(5)],
  },
  {
    id: 'SPEED',
    lesson: 'Lí 10, bài 6',
    title: 'Thực hành đo tốc độ của vật chuyển động',
    goal: 'Dùng hai cổng quang điện đo thời gian xe đi qua quãng đường s, tính tốc độ trung bình và vẽ đồ thị s theo t.',
    hazards: [],
    apparatus: 'Đường ray, xe, hai cổng quang điện, đồng hồ đo thời gian hiện số',
    sliders: [{key: 's', label: 'Khoảng cách hai cổng quang s', unit: 'm', min: 0.1, max: 0.8, step: 0.05, value: 0.3}],
    columns: [{key: 's', label: 's', unit: 'm', digits: 2}, {key: 't', label: 't', unit: 's', digits: 3}, {key: 'v', label: 'v = s/t', unit: 'm/s', digits: 3}],
    measure: (p, _s, rng) => {
      const t = Math.max(0.001, noisy(p.s / 0.35, 0.004, 0.001, rng));
      return {s: p.s, t, v: p.s / t};
    },
    viewBox: [560, 200],
    scene: (p, _s, last) => [table(120), ...[0, 1].flatMap((i): Shape[] => [box(70 + i * (p.s * 520) - 6, 70, 12, 50, '#334155'), ln(70 + i * (p.s * 520), 70, 70 + i * (p.s * 520), 120, {stroke: '#EF4444', dash: '3 3', w: 1})]), box(40, 96, 40, 22, C.blue), dot(50, 122, 5), dot(72, 122, 5), ...lcd(380, 150, 150, last ? `t = ${f(last.t, 3)} s` : 't = —'), txt(70 + (p.s * 520) / 2, 60, `s = ${f(p.s)} m`, {size: 12})],
    chart: {x: 't', y: 's', xLabel: 't (s)', yLabel: 's (m)', fit: true},
    results: (rows) => {
      const v = rows.map((r) => r.v);
      const fit = linearFit(rows.map((r) => r.t), rows.map((r) => r.s));
      return [
        {key: 'vmean', label: 'Tốc độ trung bình v̄', value: mean(v), unit: 'm/s', digits: 3},
        {key: 'dv', label: 'Δv (trung bình |vᵢ − v̄|)', value: meanAbsDev(v), unit: 'm/s', digits: 3},
        {key: 'vfit', label: 'Tốc độ từ độ dốc đồ thị s–t', value: fit.slope, unit: 'm/s', digits: 3},
        {key: 'r2', label: 'Hệ số tương quan R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.vfit, 0.35, 0.02) ? {ok: true, text: `v ≈ ${f(c.results.vfit, 3)} m/s phù hợp giá trị chuẩn 0,350 m/s.`} : {ok: false, text: `v = ${f(c.results.vfit, 3)} m/s lệch khỏi 0,350 m/s: đo thêm ở các khoảng cách khác nhau.`}),
    steps: [
      {text: 'Đo ít nhất 4 lần', done: (c) => c.rows.length >= 4},
      {text: 'Đo ở ít nhất 3 khoảng cách s khác nhau', done: (c) => c.distinct('s') >= 3},
      {text: 'Đồ thị s–t gần thẳng (R² > 0,99)', done: (c) => c.results.r2 > 0.99},
    ],
    questions: [{q: 'Độ dốc của đồ thị s theo t cho biết đại lượng nào?', options: ['Tốc độ', 'Gia tốc', 'Khối lượng', 'Quãng đường'], answer: 0, why: 'Với chuyển động đều s = vt nên hệ số góc của đường thẳng s–t chính là tốc độ.'}],
    keywords: /thuc hanh do toc do (?:cua )?vat chuyen dong|do toc do cua xe bang cong quang|cong quang dien do toc do|do toc do xe bang cong quang/,
    examples: ['thực hành đo tốc độ của vật chuyển động', 'đo tốc độ xe bằng cổng quang điện'],
    script: [setp('s', 0.2), M, setp('s', 0.3), M, setp('s', 0.4), M, setp('s', 0.5), M, setp('s', 0.6), M],
  },
  {
    id: 'FREE_FALL_G',
    lesson: 'Lí 10, bài 11',
    title: 'Thực hành đo gia tốc rơi tự do',
    goal: 'Thả vật từ các độ cao khác nhau qua cổng quang điện, đo thời gian rơi và xác định g.',
    hazards: ['Đặt khay đỡ dưới trụ rơi để tránh hỏng thiết bị và đập vào chân'],
    apparatus: 'Giá đỡ, nam châm điện, trụ thép, cổng quang điện, đồng hồ hiện số, thước',
    sliders: [{key: 'h', label: 'Độ cao thả h', unit: 'm', min: 0.2, max: 0.8, step: 0.05, value: 0.4}],
    columns: [{key: 'h', label: 'h', unit: 'm', digits: 2}, {key: 't', label: 't', unit: 's', digits: 4}, {key: 't2', label: 't²', unit: 's²', digits: 4}, {key: 'g', label: 'g = 2h/t²', unit: 'm/s²', digits: 2}],
    measure: (p, _s, rng) => {
      const t = noisy(Math.sqrt((2 * p.h) / G), 0.0012, 0.0001, rng);
      return {h: p.h, t, t2: t * t, g: (2 * p.h) / (t * t)};
    },
    viewBox: [560, 240],
    scene: (p, _s, last) => [ln(100, 20, 100, 220, {stroke: '#78716C', w: 6}), box(70, 20, 70, 12, '#334155'), dot(135, 40 + 0, 7, C.red), ln(135, 46, 135, 200 - p.h * 100, {stroke: C.grey, dash: '4 4'}), box(120, 200 - p.h * 100 - 6, 40, 12, '#334155'), box(60, 210, 120, 8, '#A8A29E'), txt(205, 120, `h = ${f(p.h)} m`, {size: 13}), arrow(190, 60, 190, 200 - p.h * 100, C.blue), ...lcd(350, 150, 170, last ? `t = ${f(last.t, 4)} s` : 't = —')],
    chart: {x: 't2', y: 'h', xLabel: 't² (s²)', yLabel: 'h (m)', fit: true},
    results: (rows) => {
      const g = rows.map((r) => r.g);
      const fit = linearFit(rows.map((r) => r.t2), rows.map((r) => r.h));
      return [
        {key: 'gmean', label: 'Gia tốc trung bình ḡ', value: mean(g), unit: 'm/s²', digits: 2},
        {key: 'dg', label: 'Δg (trung bình |gᵢ − ḡ|)', value: meanAbsDev(g), unit: 'm/s²', digits: 2},
        {key: 'gfit', label: 'g từ độ dốc đồ thị h–t² (g = 2·độ dốc)', value: 2 * fit.slope, unit: 'm/s²', digits: 2},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.gfit, G, 0.25) ? {ok: true, text: `g ≈ ${f(c.results.gfit)} m/s² khớp giá trị 9,79 m/s².`} : {ok: false, text: `g = ${f(c.results.gfit)} m/s² lệch giá trị 9,79 m/s²: đo thêm ở nhiều độ cao.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 3 độ cao h khác nhau', done: (c) => c.distinct('h') >= 3},
      {text: 'Xác định g từ đồ thị h–t²', done: (c) => Number.isFinite(c.results.gfit)},
    ],
    questions: [{q: 'Vì sao dùng trụ thép nặng mà không dùng tờ giấy?', options: ['Giảm ảnh hưởng của lực cản không khí', 'Để tăng gia tốc', 'Vì giấy không rơi', 'Để g lớn hơn'], answer: 0, why: 'Vật nặng gọn chịu lực cản không khí rất nhỏ so với trọng lượng nên rơi gần như tự do.'}],
    keywords: /thuc hanh do gia toc roi tu do|do gia toc roi tu do bang cong quang|xac dinh g bang thi nghiem roi tu do|do g bang cong quang/,
    examples: ['thực hành đo gia tốc rơi tự do', 'đo g bằng cổng quang điện'],
    script: [setp('h', 0.3), M, setp('h', 0.4), M, setp('h', 0.5), M, setp('h', 0.6), M, setp('h', 0.7), M],
  },
  {
    id: 'FORCE_COMPOSITION',
    lesson: 'Lí 10, bài 22',
    title: 'Thực hành tổng hợp lực',
    goal: 'Đo hợp lực của hai lực đồng quy bằng lực kế và so với kết quả tính theo quy tắc hình bình hành.',
    hazards: [],
    apparatus: 'Bảng từ, ba lực kế, vòng nhẫn, thước đo góc',
    sliders: [
      {key: 'F1', label: 'Lực F₁', unit: 'N', min: 1, max: 5, step: 0.5, value: 3},
      {key: 'F2', label: 'Lực F₂', unit: 'N', min: 1, max: 5, step: 0.5, value: 4},
      {key: 'a', label: 'Góc giữa F₁ và F₂', unit: '°', min: 0, max: 150, step: 15, value: 90},
    ],
    columns: [{key: 'F1', label: 'F₁', unit: 'N', digits: 1}, {key: 'F2', label: 'F₂', unit: 'N', digits: 1}, {key: 'a', label: 'α', unit: '°', digits: 0}, {key: 'Fm', label: 'F đo', unit: 'N', digits: 2}, {key: 'Fc', label: 'F tính', unit: 'N', digits: 2}, {key: 'dF', label: 'F đo − F tính', unit: 'N', digits: 2}],
    measure: (p, _s, rng) => {
      const Fc = Math.sqrt(p.F1 ** 2 + p.F2 ** 2 + 2 * p.F1 * p.F2 * Math.cos(rad(p.a)));
      const Fm = noisy(Fc, 0.03, 0.05, rng);
      return {F1: p.F1, F2: p.F2, a: p.a, Fm, Fc: roundTo(Fc, 0.01), dF: roundTo(Fm - Fc, 0.01)};
    },
    viewBox: [560, 240],
    scene: (p, _s, last) => {
      const ox = 240;
      const oy = 150;
      const k = 24;
      const e1: [number, number] = [ox + p.F1 * k, oy];
      const e2: [number, number] = [ox + p.F2 * k * Math.cos(rad(p.a)), oy - p.F2 * k * Math.sin(rad(p.a))];
      return [arrow(ox, oy, e1[0], e1[1], C.blue, 3), arrow(ox, oy, e2[0], e2[1], C.red, 3), arrow(ox, oy, ox - 90 * 1, oy + 40, C.green, 3), dot(ox, oy, 8, '#FFFFFF'), ring(ox, oy, 8), txt(e1[0] + 14, e1[1] + 16, `F₁ = ${f(p.F1, 1)} N`, {size: 11}), txt(e2[0] + 14, e2[1] - 6, `F₂ = ${f(p.F2, 1)} N`, {size: 11}), txt(ox - 110, oy + 62, 'lực kế thứ ba (đo F)', {size: 11}), ...lcd(380, 180, 150, last ? `F = ${f(last.Fm)} N` : 'F = —')];
    },
    results: (rows) => [
      {key: 'dmean', label: 'Trung bình |F đo − F tính|', value: mean(rows.map((r) => Math.abs(r.dF))), unit: 'N', digits: 3},
      {key: 'rel', label: 'Sai lệch tương đối trung bình', value: mean(rows.map((r) => (100 * Math.abs(r.dF)) / r.Fc)), unit: '%', digits: 2},
    ],
    verdict: (c) => (c.results.rel < 3 ? {ok: true, text: `F đo và F tính chỉ lệch ${f(c.results.rel)} %: quy tắc hình bình hành đúng trong sai số.`} : {ok: false, text: `Sai lệch ${f(c.results.rel)} % còn lớn, đo thêm hoặc kiểm tra cách đọc lực kế.`}),
    steps: [
      {text: 'Đo ít nhất 4 lần', done: (c) => c.rows.length >= 4},
      {text: 'Thay đổi góc α, dùng ít nhất 3 giá trị khác nhau', done: (c) => c.distinct('a') >= 3},
      {text: 'So sánh F đo với F tính', done: (c) => Number.isFinite(c.results.rel)},
    ],
    questions: [{q: 'Hợp lực lớn nhất khi góc giữa hai lực bằng:', options: ['0°', '90°', '120°', '180°'], answer: 0, why: 'Hai lực cùng hướng thì F = F₁ + F₂, lớn nhất.'}, safe],
    keywords: /thuc hanh tong hop luc|tong hop hai luc dong quy bang luc ke|thi nghiem tong hop luc dong quy/,
    examples: ['thực hành tổng hợp lực', 'tổng hợp hai lực đồng quy bằng lực kế'],
    script: [setp('a', 0), M, setp('a', 60), M, setp('a', 90), M, setp('a', 120), M, setp('a', 150), M],
  },
  {
    id: 'COLLISION_MOMENTUM',
    lesson: 'Lí 10, bài 30',
    title: 'Thực hành xác định động lượng của vật trước và sau va chạm',
    goal: 'Dùng đệm khí và cổng quang đo tốc độ hai xe trước và sau va chạm đàn hồi và va chạm mềm, so sánh động lượng.',
    hazards: ['Bật máy thổi khí trước khi đặt xe lên đệm để không làm xước'],
    apparatus: 'Đệm khí, hai xe, lò xo hoặc nam châm gắn đầu xe, hai cổng quang điện',
    sliders: [
      {key: 'm1', label: 'Khối lượng xe 1', unit: 'kg', min: 0.2, max: 0.5, step: 0.05, value: 0.3},
      {key: 'm2', label: 'Khối lượng xe 2', unit: 'kg', min: 0.2, max: 0.5, step: 0.05, value: 0.2},
      {key: 'v1', label: 'Tốc độ xe 1 trước va chạm', unit: 'm/s', min: 0.2, max: 0.8, step: 0.1, value: 0.5},
    ],
    choices: [{key: 'type', label: 'Loại va chạm', value: 'elastic', options: [['elastic', 'Đàn hồi (lò xo)'], ['soft', 'Mềm (dính vào nhau)']]}],
    columns: [{key: 'e', label: 'Loại (1 đàn hồi, 0 mềm)'}, {key: 'p0', label: 'p trước', unit: 'kg·m/s', digits: 3}, {key: 'p1', label: 'p sau', unit: 'kg·m/s', digits: 3}, {key: 'dp', label: '|Δp|/p', unit: '%', digits: 2}, {key: 'k0', label: 'Wđ trước', unit: 'J', digits: 4}, {key: 'k1', label: 'Wđ sau', unit: 'J', digits: 4}],
    measure: (p, s, rng) => {
      const e = s.type === 'elastic' ? 1 : 0;
      const u1 = (p.m1 * p.v1 + p.m2 * 0 + p.m2 * e * (0 - p.v1)) / (p.m1 + p.m2);
      const u2 = (p.m1 * p.v1 + p.m1 * e * p.v1) / (p.m1 + p.m2);
      const v1m = noisy(p.v1, 0.008, 0.001, rng);
      const u1m = noisy(u1, 0.008, 0.001, rng);
      const u2m = noisy(u2, 0.008, 0.001, rng);
      const p0 = p.m1 * v1m;
      const p1 = p.m1 * u1m + p.m2 * u2m;
      return {e, p0, p1, dp: (100 * Math.abs(p1 - p0)) / p0, k0: 0.5 * p.m1 * v1m ** 2, k1: 0.5 * p.m1 * u1m ** 2 + 0.5 * p.m2 * u2m ** 2};
    },
    viewBox: [560, 200],
    scene: (p, s, last) => [table(120), box(60, 90, 30 + p.m1 * 80, 28, C.blue), box(330, 90, 30 + p.m2 * 80, 28, C.orange), txt(80, 82, `m₁ = ${f(p.m1)} kg`, {size: 11}), txt(350, 82, `m₂ = ${f(p.m2)} kg`, {size: 11}), arrow(100 + p.m1 * 40, 60, 100 + p.m1 * 40 + p.v1 * 90, 60, C.green), txt(280, 150, s.type === 'elastic' ? 'va chạm đàn hồi' : 'va chạm mềm', {size: 12, fill: C.grey}), ...lcd(380, 150, 150, last ? `Δp/p = ${f(last.dp, 1)} %` : '—')],
    results: (rows) => {
      const dp = rows.map((r) => r.dp);
      const el = rows.filter((r) => r.e === 1);
      const so = rows.filter((r) => r.e === 0);
      const loss = (rs: Row[]) => mean(rs.map((r) => (100 * (r.k0 - r.k1)) / r.k0));
      return [
        {key: 'dpmean', label: 'Độ lệch động lượng trung bình |Δp|/p', value: mean(dp), unit: '%', digits: 2},
        {key: 'lossEl', label: 'Wđ mất đi (đàn hồi)', value: loss(el), unit: '%', digits: 1},
        {key: 'lossSoft', label: 'Wđ mất đi (mềm)', value: loss(so), unit: '%', digits: 1},
      ];
    },
    verdict: (c) => (c.results.dpmean < 6 && c.results.lossSoft > c.results.lossEl + 10 ? {ok: true, text: 'Động lượng bảo toàn trong sai số; va chạm mềm mất nhiều động năng hơn va chạm đàn hồi.'} : {ok: false, text: 'Cần đo cả hai loại va chạm (ít nhất 2 lần mỗi loại) để kết luận.'}),
    steps: [
      {text: 'Đo ít nhất 2 lần va chạm đàn hồi', done: (c) => c.rows.filter((r) => r.e === 1).length >= 2},
      {text: 'Đo ít nhất 2 lần va chạm mềm', done: (c) => c.rows.filter((r) => r.e === 0).length >= 2},
      {text: 'Động lượng trước và sau bằng nhau trong sai số (< 6 %)', done: (c) => c.results.dpmean < 6},
    ],
    questions: [{q: 'Trong va chạm mềm động năng của hệ:', options: ['Giảm vì một phần chuyển thành nhiệt và biến dạng', 'Không đổi', 'Tăng', 'Bằng 0 sau va chạm'], answer: 0, why: 'Động lượng bảo toàn nhưng động năng không bảo toàn.'}],
    keywords: /thuc hanh xac dinh dong luong (?:cua vat )?truoc va sau va cham|dong luong truoc va sau va cham bang dem khi|bao toan dong luong (?:bang )?dem khi/,
    examples: ['thực hành xác định động lượng của vật trước và sau va chạm', 'bảo toàn động lượng bằng đệm khí'],
    script: [ch('type', 'elastic'), M, M, ch('type', 'soft'), M, M],
  },
  {
    id: 'SOUND_FREQUENCY',
    lesson: 'Lí 11, bài 10',
    title: 'Thực hành đo tần số của sóng âm',
    goal: 'Dùng dao động kí hiển thị tín hiệu âm thoa, đọc chu kì trên màn hình và tính tần số.',
    hazards: ['Không để dao động kí gần nơi ẩm ướt'],
    apparatus: 'Âm thoa, micro, dao động kí',
    sliders: [{key: 'td', label: 'Thang thời gian', unit: 'ms/ô', min: 0.2, max: 2, step: 0.1, value: 0.5}],
    choices: [{key: 'fork', label: 'Âm thoa', value: 'f440', options: [['f440', 'Âm thoa ghi 440 Hz'], ['f512', 'Âm thoa ghi 512 Hz']]}],
    columns: [{key: 'td', label: 'Thang', unit: 'ms/ô', digits: 1}, {key: 'N', label: 'Số ô một chu kì', unit: 'ô', digits: 1}, {key: 'T', label: 'T', unit: 'ms', digits: 3}, {key: 'f', label: 'f = 1/T', unit: 'Hz', digits: 1}],
    measure: (p, s, rng) => {
      const ft = s.fork === 'f440' ? 439.6 : 511.2;
      const Nt = 1000 / ft / p.td;
      const sigma = Nt < 1.5 || Nt > 10 ? 0.4 : 0.05;
      const N = Math.max(0.1, noisy(Nt, sigma, 0.1, rng));
      const T = N * p.td;
      return {td: p.td, N, T, f: 1000 / T};
    },
    viewBox: [560, 230],
    scene: (p, s, last) => {
      const ft = s.fork === 'f440' ? 439.6 : 511.2;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 400; i++) pts.push([80 + i, 100 - 40 * Math.sin(2 * Math.PI * ft * ((i / 40) * p.td) * 1e-3)]);
      return [box(60, 40, 440, 120, '#1C1917', '#44403C'), ...Array.from({length: 11}, (_, i) => ln(80 + i * 40, 40, 80 + i * 40, 160, {stroke: '#57534E', w: 0.6})), ln(60, 100, 500, 100, {stroke: '#57534E', w: 1}), poly(pts, {stroke: '#4ADE80', w: 2, close: false}), ...lcd(360, 175, 150, last ? `N = ${f(last.N, 1)} ô` : 'N = —')];
    },
    results: (rows, _p, s) => [
      {key: 'fmean', label: 'Tần số trung bình f̄', value: mean(rows.map((r) => r.f)), unit: 'Hz', digits: 1},
      {key: 'df', label: 'Δf (trung bình |fᵢ − f̄|)', value: meanAbsDev(rows.map((r) => r.f)), unit: 'Hz', digits: 1},
      {key: 'label', label: 'Tần số ghi trên âm thoa', value: s.fork === 'f440' ? 440 : 512, unit: 'Hz', digits: 0},
    ],
    verdict: (c) => (near(c.results.fmean, c.results.label, 0.02 * c.results.label) ? {ok: true, text: `f̄ = ${f(c.results.fmean, 1)} Hz khớp giá trị ghi ${c.results.label} Hz (sai lệch dưới 2 %).`} : {ok: false, text: `f̄ = ${f(c.results.fmean, 1)} Hz lệch nhiều so với ${c.results.label} Hz: chọn thang thời gian để thấy 2–8 ô cho một chu kì.`}),
    steps: [
      {text: 'Đo ít nhất 4 lần', done: (c) => c.rows.length >= 4},
      {text: 'Chọn thang thời gian sao cho một chu kì chiếm 2–8 ô', done: (c) => c.rows.some((r) => r.N >= 2 && r.N <= 8)},
      {text: 'Tính tần số trung bình và sai số', done: (c) => Number.isFinite(c.results.fmean)},
    ],
    questions: [{q: 'Vì sao nên chọn thang để một chu kì chiếm vài ô?', options: ['Đọc số ô chính xác hơn, sai số tương đối nhỏ', 'Để sóng truyền nhanh hơn', 'Để tần số tăng', 'Không có lí do'], answer: 0, why: 'Khi chu kì quá nhỏ hoặc quá lớn so với ô, sai số đọc tăng lên.'}],
    keywords: /thuc hanh do tan so (?:cua )?song am|do tan so am thoa bang dao dong k[yi]|do tan so song am bang dao dong k[yi]/,
    examples: ['thực hành đo tần số của sóng âm', 'đo tần số âm thoa bằng dao động kí'],
    script: [setp('td', 0.5), M, M, setp('td', 0.4), M, M, setp('td', 0.6), M],
  },
  {
    id: 'SOUND_SPEED',
    lesson: 'Lí 11, bài 15',
    title: 'Thực hành đo tốc độ truyền âm',
    goal: 'Dùng ống cộng hưởng tìm hai vị trí cộng hưởng liên tiếp, suy ra bước sóng và tốc độ âm.',
    hazards: ['Không đưa mặt sát miệng ống khi bật loa'],
    apparatus: 'Ống cộng hưởng có pit-tông, loa phát tần số, thước đo, nhiệt kế',
    sliders: [{key: 'T', label: 'Nhiệt độ phòng', unit: '°C', min: 10, max: 35, step: 1, value: 20}],
    choices: [{key: 'f', label: 'Tần số loa', value: '1000', options: [['500', '500 Hz'], ['1000', '1000 Hz'], ['1500', '1500 Hz']]}],
    columns: [{key: 'f', label: 'f', unit: 'Hz', digits: 0}, {key: 'l1', label: 'l₁', unit: 'cm', digits: 1}, {key: 'l2', label: 'l₂', unit: 'cm', digits: 1}, {key: 'lam', label: 'λ = 2(l₂ − l₁)', unit: 'cm', digits: 1}, {key: 'v', label: 'v = λf', unit: 'm/s', digits: 1}],
    measure: (p, s, rng) => {
      const f0 = Number(s.f);
      const lam = ((331 + 0.6 * p.T) / f0) * 100;
      const l1 = noisy(lam / 4 + 0.8, 0.25, 0.1, rng);
      const l2 = noisy(l1 + lam / 2, 0.25, 0.1, rng);
      const lamM = 2 * (l2 - l1);
      return {f: f0, l1, l2, lam: lamM, v: (lamM * f0) / 100};
    },
    viewBox: [560, 200],
    scene: (p, s, last) => [box(100, 90, 300, 30, '#E0F2FE', C.ink), box(40, 80, 50, 50, '#334155'), txt(65, 110, `${s.f} Hz`, {size: 10, fill: '#fff'}), ...(last ? [ln(100 + last.l1 * 3, 85, 100 + last.l1 * 3, 125, {stroke: C.red, w: 3}), ln(100 + last.l2 * 3 * 0.6 + 40, 85, 100 + last.l2 * 3 * 0.6 + 40, 125, {stroke: C.red, w: 3})] : []), txt(300, 70, `nhiệt độ ${f(p.T, 0)} °C`, {size: 12}), ...lcd(380, 150, 150, last ? `v = ${f(last.v, 1)} m/s` : 'v = —')],
    results: (rows, p) => [
      {key: 'vmean', label: 'Tốc độ âm trung bình v̄', value: mean(rows.map((r) => r.v)), unit: 'm/s', digits: 1},
      {key: 'dv', label: 'Δv', value: meanAbsDev(rows.map((r) => r.v)), unit: 'm/s', digits: 1},
      {key: 'ref', label: 'Tốc độ âm theo nhiệt độ (v = 331 + 0,6t)', value: 331 + 0.6 * p.T, unit: 'm/s', digits: 1},
    ],
    verdict: (c) => (near(c.results.vmean, c.results.ref, 8) ? {ok: true, text: `v̄ = ${f(c.results.vmean, 1)} m/s phù hợp ${f(c.results.ref, 1)} m/s ở nhiệt độ phòng.`} : {ok: false, text: `v̄ = ${f(c.results.vmean, 1)} m/s lệch ${f(c.results.ref, 1)} m/s: đo thêm vài lần.`}),
    steps: [
      {text: 'Đo ít nhất 4 lần', done: (c) => c.rows.length >= 4},
      {text: 'Dùng ít nhất 2 tần số loa khác nhau', done: (c) => c.distinct('f') >= 2},
      {text: 'Tính v theo λ và f', done: (c) => Number.isFinite(c.results.vmean)},
    ],
    questions: [{q: 'Khoảng cách giữa hai vị trí cộng hưởng liên tiếp bằng:', options: ['λ/2', 'λ', 'λ/4', '2λ'], answer: 0, why: 'Hai vị trí cộng hưởng liên tiếp của cột không khí cách nhau nửa bước sóng.'}],
    keywords: /thuc hanh do toc do truyen am|do toc do am bang ong cong huong|ong cong huong do toc do am/,
    examples: ['thực hành đo tốc độ truyền âm', 'đo tốc độ âm bằng ống cộng hưởng'],
    script: [ch('f', '500'), M, M, ch('f', '1000'), M, M, ch('f', '1500'), M],
  },
  {
    id: 'EMF_INTERNAL_R',
    lesson: 'Lí 11, bài 26',
    title: 'Thực hành đo suất điện động và điện trở trong của pin điện hóa',
    goal: 'Thay đổi biến trở, đo U và I rồi xác định E và r từ đồ thị U theo I.',
    hazards: ['Không nối tắt hai cực pin', 'Chỉ đóng khóa K khi cần đọc số'],
    apparatus: 'Pin điện hóa, biến trở, ampe kế, vôn kế, khóa K, dây nối',
    sliders: [{key: 'R', label: 'Biến trở R', unit: 'Ω', min: 1, max: 20, step: 1, value: 10}],
    columns: [{key: 'R', label: 'R', unit: 'Ω', digits: 0}, {key: 'U', label: 'U', unit: 'V', digits: 2}, {key: 'I', label: 'I', unit: 'A', digits: 3}],
    measure: (p, _s, rng) => {
      const I = 1.52 / (p.R + 0.82);
      return {R: p.R, U: noisy(1.52 - I * 0.82, 0.004, 0.01, rng), I: noisy(I, 0.003, 0.005, rng)};
    },
    viewBox: [560, 230],
    scene: (p, _s, last) => [poly([[60, 60], [400, 60], [400, 170], [60, 170], [60, 60]], {stroke: C.ink, w: 2, close: false}), box(40, 95, 40, 40, '#FFFFFF', C.ink), txt(60, 120, 'E,r', {size: 12, bold: true}), box(170, 48, 70, 24, C.blue), txt(205, 64, `R = ${f(p.R, 0)} Ω`, {size: 11, fill: '#fff'}), ring(300, 160, 18, C.ink, 2), txt(300, 165, 'A', {size: 14, bold: true}), ring(400, 115, 18, C.ink, 2), txt(400, 120, 'V', {size: 14, bold: true}), ...lcd(100, 185, 150, last ? `U = ${f(last.U, 2)} V` : 'U = —'), ...lcd(280, 185, 150, last ? `I = ${f(last.I, 3)} A` : 'I = —')],
    chart: {x: 'I', y: 'U', xLabel: 'I (A)', yLabel: 'U (V)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.I), rows.map((r) => r.U));
      return [
        {key: 'E', label: 'Suất điện động E (tung độ gốc)', value: fit.intercept, unit: 'V', digits: 3},
        {key: 'r', label: 'Điện trở trong r (−độ dốc)', value: -fit.slope, unit: 'Ω', digits: 2},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.E, 1.52, 0.06) && near(c.results.r, 0.82, 0.25) ? {ok: true, text: `E ≈ ${f(c.results.E, 3)} V, r ≈ ${f(c.results.r)} Ω: phù hợp với pin (E = 1,52 V, r ≈ 0,8 Ω).`} : {ok: false, text: `E = ${f(c.results.E, 3)} V, r = ${f(c.results.r)} Ω chưa khớp: thay đổi R rộng hơn và đo nhiều điểm hơn.`}),
    steps: [
      {text: 'Đo ít nhất 6 điểm', done: (c) => c.rows.length >= 6},
      {text: 'Dùng ít nhất 5 giá trị biến trở khác nhau', done: (c) => c.distinct('R') >= 5},
      {text: 'Đồ thị U–I gần thẳng (R² > 0,95)', done: (c) => c.results.r2 > 0.95},
    ],
    questions: [{q: 'Vì sao U giảm khi I tăng?', options: ['Có sụt thế Ir trên điện trở trong của pin', 'Suất điện động giảm', 'Biến trở nóng lên', 'Vôn kế sai'], answer: 0, why: 'U = E − Ir: dòng điện càng lớn thì độ giảm thế trong nguồn càng lớn.'}, safe],
    keywords: /thuc hanh do suat dien dong (?:va )?dien tro trong (?:cua )?pin|do suat dien dong cua pin dien hoa|xac dinh e va r cua pin|do e va r cua pin/,
    examples: ['thực hành đo E và r của pin bằng biến trở', 'xác định E và r của pin'],
    script: [setp('R', 2), M, setp('R', 4), M, setp('R', 6), M, setp('R', 9), M, setp('R', 13), M, setp('R', 18), M],
  },

  // ---------------------------------------------------------------- thí nghiệm trong bài
  {
    id: 'NEWTON2',
    lesson: 'Lí 10, bài 15',
    title: 'Thí nghiệm định luật II Newton: gia tốc theo lực',
    goal: 'Kéo xe bằng các lực khác nhau, đo gia tốc và xác định khối lượng từ độ dốc đồ thị a–F.',
    hazards: ['Chặn xe ở cuối đường ray'],
    apparatus: 'Đường ray, xe, quả cân treo, ròng rọc, cổng quang',
    sliders: [{key: 'F', label: 'Lực kéo F (trọng lượng quả cân treo)', unit: 'N', min: 0.1, max: 0.5, step: 0.1, value: 0.3}, {key: 'm', label: 'Khối lượng xe m', unit: 'kg', min: 0.3, max: 0.8, step: 0.1, value: 0.5}],
    columns: [{key: 'F', label: 'F', unit: 'N', digits: 2}, {key: 'm', label: 'm', unit: 'kg', digits: 1}, {key: 'a', label: 'a', unit: 'm/s²', digits: 3}],
    measure: (p, _s, rng) => ({F: p.F, m: p.m, a: Math.max(0.001, noisy(p.F / p.m, 0.012, 0.001, rng))}),
    viewBox: [560, 220],
    scene: (p, _s, last) => [table(110), box(70, 80, 70 + p.m * 40, 30, C.blue), ln(160 + p.m * 40, 95, 390, 95, {stroke: C.ink}), ring(400, 100, 12), ln(412, 100, 412, 150), box(398, 150, 28, 18 + p.F * 40, C.orange), txt(412, 190, `F = ${f(p.F, 1)} N`, {size: 11}), ...lcd(80, 150, 170, last ? `a = ${f(last.a, 3)} m/s²` : 'a = —')],
    chart: {x: 'F', y: 'a', xLabel: 'F (N)', yLabel: 'a (m/s²)', fit: true},
    results: (rows, p) => {
      const fit = linearFit(rows.map((r) => r.F), rows.map((r) => r.a));
      return [
        {key: 'slope', label: 'Độ dốc đồ thị a–F', value: fit.slope, unit: 'kg⁻¹', digits: 3},
        {key: 'mfit', label: 'Khối lượng m = 1/độ dốc', value: 1 / fit.slope, unit: 'kg', digits: 3},
        {key: 'mset', label: 'Khối lượng xe cân được', value: p.m, unit: 'kg', digits: 2},
      ];
    },
    verdict: (c) => (Math.abs(c.results.mfit - c.results.mset) / c.results.mset < 0.07 ? {ok: true, text: `m = ${f(c.results.mfit, 3)} kg khớp khối lượng xe ${f(c.results.mset)} kg: a tỉ lệ thuận với F.`} : {ok: false, text: 'Độ dốc chưa khớp 1/m: giữ nguyên m và đo ở nhiều lực khác nhau.'}),
    steps: [
      {text: 'Đo ít nhất 5 lần ở cùng khối lượng xe', done: (c) => c.rows.length >= 5 && c.distinct('m') === 1},
      {text: 'Dùng ít nhất 4 lực F khác nhau', done: (c) => c.distinct('F') >= 4},
      {text: 'Xác định m từ độ dốc đồ thị', done: (c) => Number.isFinite(c.results.mfit)},
    ],
    questions: [{q: 'Đồ thị a theo F là đường thẳng đi qua gốc, độ dốc bằng:', options: ['1/m', 'm', 'g', 'F'], answer: 0, why: 'a = F/m nên hệ số góc của a theo F là 1/m.'}],
    keywords: /thi nghiem dinh luat (?:2|ii|hai) (?:cua )?newton|kiem chung dinh luat ii newton bang xe|gia toc ti le thuan voi luc/,
    examples: ['thí nghiệm định luật II Newton đo gia tốc theo lực', 'kiểm chứng định luật 2 Newton bằng xe và cổng quang'],
    script: [setp('F', 0.1), M, setp('F', 0.2), M, setp('F', 0.3), M, setp('F', 0.4), M, setp('F', 0.5), M],
  },
  {
    id: 'FRICTION',
    lesson: 'Lí 10, bài 18',
    title: 'Thí nghiệm lực ma sát trượt: xác định hệ số ma sát',
    goal: 'Kéo vật trượt đều trên các bề mặt, đo lực ma sát theo áp lực và xác định hệ số ma sát trượt.',
    hazards: [],
    apparatus: 'Lực kế, khối gỗ, các quả cân, các tấm bề mặt gỗ, kính, cao su',
    sliders: [{key: 'm', label: 'Khối lượng vật (kể cả quả cân)', unit: 'kg', min: 0.2, max: 1.0, step: 0.2, value: 0.4}],
    choices: [{key: 'surf', label: 'Bề mặt', value: 'wood', options: [['wood', 'Gỗ'], ['glass', 'Kính'], ['rubber', 'Cao su']]}],
    columns: [{key: 'N', label: 'Áp lực N', unit: 'N', digits: 2}, {key: 'F', label: 'Lực ma sát F', unit: 'N', digits: 2}],
    measure: (p, s, rng) => {
      const mu = s.surf === 'wood' ? 0.25 : s.surf === 'glass' ? 0.12 : 0.7;
      const N = p.m * G;
      return {N, F: Math.max(0.05, noisy(mu * N, 0.04, 0.05, rng))};
    },
    viewBox: [560, 200],
    scene: (p, s, last) => [box(60, 118, 400, 14, s.surf === 'wood' ? '#B45309' : s.surf === 'glass' ? '#BAE6FD' : '#1F2937', C.ink), box(150, 80, 40 + p.m * 50, 38, '#CBD5E1', C.ink), txt(170 + p.m * 25, 104, `${f(p.m, 1)} kg`, {size: 11}), arrow(190 + p.m * 50, 99, 300, 99, C.green, 3), box(300, 82, 40, 34, '#FDE68A', C.ink), txt(320, 103, 'lực kế', {size: 10}), ...lcd(380, 150, 150, last ? `F = ${f(last.F, 2)} N` : 'F = —')],
    chart: {x: 'N', y: 'F', xLabel: 'N (N)', yLabel: 'F (N)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.N), rows.map((r) => r.F));
      return [
        {key: 'mu', label: 'Hệ số ma sát μ (độ dốc F–N)', value: fit.slope, digits: 3},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => {
      const truth = 0.25;
      return near(c.results.mu, truth, 0.05) ? {ok: true, text: `μ ≈ ${f(c.results.mu, 3)}: phù hợp bề mặt gỗ (≈ 0,25).`} : {ok: false, text: `μ = ${f(c.results.mu, 3)}. Chọn một bề mặt, đo ở nhiều khối lượng và so sánh giữa các bề mặt.`};
    },
    steps: [
      {text: 'Đo ít nhất 4 lần với cùng một bề mặt', done: (c) => c.rows.length >= 4},
      {text: 'Dùng ít nhất 4 khối lượng khác nhau', done: (c) => c.distinct('N') >= 4},
      {text: 'Xác định hệ số ma sát từ độ dốc đồ thị F–N', done: (c) => Number.isFinite(c.results.mu)},
    ],
    questions: [{q: 'Lực ma sát trượt phụ thuộc vào:', options: ['Áp lực và vật liệu, tình trạng bề mặt', 'Diện tích tiếp xúc', 'Tốc độ trượt rất lớn', 'Màu sắc bề mặt'], answer: 0, why: 'F = μN: μ phụ thuộc vật liệu và tình trạng bề mặt, không phụ thuộc diện tích tiếp xúc.'}],
    keywords: /thi nghiem luc ma sat (?:truot|nghi)|xac dinh he so ma sat (?:truot )?bang (?:luc ke|thi nghiem)|do luc ma sat bang luc ke/,
    examples: ['thí nghiệm lực ma sát trượt', 'xác định hệ số ma sát bằng lực kế'],
    script: [ch('surf', 'wood'), setp('m', 0.2), M, setp('m', 0.4), M, setp('m', 0.6), M, setp('m', 0.8), M, setp('m', 1.0), M],
  },
  {
    id: 'HOOKE',
    lesson: 'Lí 10, bài 33',
    title: 'Thí nghiệm định luật Hooke: xác định độ cứng lò xo',
    goal: 'Treo các quả cân vào lò xo, đo độ giãn và xác định độ cứng k từ đồ thị F–Δl.',
    hazards: ['Không treo vượt quá giới hạn đàn hồi của lò xo'],
    apparatus: 'Giá treo, lò xo, các quả cân 50 g, thước milimét',
    sliders: [{key: 'm', label: 'Khối lượng quả cân treo', unit: 'kg', min: 0.05, max: 0.3, step: 0.05, value: 0.1}],
    choices: [{key: 'spring', label: 'Lò xo', value: 'soft', options: [['soft', 'Lò xo mềm'], ['stiff', 'Lò xo cứng']]}],
    columns: [{key: 'F', label: 'F = mg', unit: 'N', digits: 3}, {key: 'dl', label: 'Độ giãn Δl', unit: 'm', digits: 4}],
    measure: (p, s, rng) => {
      const k = s.spring === 'soft' ? 30 : 80;
      return {F: p.m * G, dl: Math.max(0.0005, noisy((p.m * G) / k, 0.0006, 0.001, rng))};
    },
    viewBox: [560, 240],
    scene: (p, s, last) => {
      const k = s.spring === 'soft' ? 30 : 80;
      const ext = ((p.m * G) / k) * 600;
      return [ln(140, 20, 220, 20, {stroke: C.ink, w: 5}), spring(180, 20, 180, 80 + ext, 8, 12), box(160, 80 + ext, 40, 20 + p.m * 40, C.orange), txt(180, 96 + ext, `${f(p.m * 1000, 0)} g`, {size: 11, fill: '#fff'}), ln(240, 20, 240, 200, {stroke: C.grey}), ...lcd(320, 120, 190, last ? `Δl = ${f(last.dl * 1000, 1)} mm` : 'Δl = —')];
    },
    chart: {x: 'dl', y: 'F', xLabel: 'Δl (m)', yLabel: 'F (N)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.dl), rows.map((r) => r.F));
      return [
        {key: 'k', label: 'Độ cứng k (độ dốc F–Δl)', value: fit.slope, unit: 'N/m', digits: 1},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (c.results.k > 25 && c.results.k < 35) || (c.results.k > 70 && c.results.k < 90) ? {ok: true, text: `k ≈ ${f(c.results.k, 1)} N/m (lò xo ${c.results.k < 50 ? 'mềm ≈ 30 N/m' : 'cứng ≈ 80 N/m'}).`} : {ok: false, text: `k = ${f(c.results.k, 1)} N/m chưa hợp lí: đo thêm ở nhiều khối lượng khác nhau.`},
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 khối lượng khác nhau', done: (c) => c.distinct('F') >= 4},
      {text: 'Xác định k từ đồ thị F–Δl', done: (c) => Number.isFinite(c.results.k)},
    ],
    questions: [{q: 'Đồ thị F theo Δl của lò xo là:', options: ['Đường thẳng qua gốc tọa độ', 'Parabol', 'Đường cong giảm', 'Đường nằm ngang'], answer: 0, why: 'F = kΔl: trong giới hạn đàn hồi, lực đàn hồi tỉ lệ thuận với độ giãn.'}],
    keywords: /thi nghiem dinh luat hooke|xac dinh do cung (?:cua )?lo xo bang thi nghiem|do do gian cua lo xo theo khoi luong/,
    examples: ['thí nghiệm định luật Hooke', 'xác định độ cứng lò xo bằng thí nghiệm'],
    script: [ch('spring', 'soft'), setp('m', 0.05), M, setp('m', 0.1), M, setp('m', 0.15), M, setp('m', 0.2), M, setp('m', 0.25), M],
  },
  {
    id: 'PENDULUM_G',
    lesson: 'Lí 11, bài 1–7',
    title: 'Thí nghiệm con lắc đơn: xác định gia tốc trọng trường',
    goal: 'Đo chu kì con lắc đơn theo chiều dài dây và xác định g từ đồ thị T² theo l.',
    hazards: [],
    apparatus: 'Giá treo, dây, quả nặng, đồng hồ bấm giây, thước',
    sliders: [{key: 'l', label: 'Chiều dài dây l', unit: 'm', min: 0.3, max: 1.0, step: 0.1, value: 0.5}],
    columns: [{key: 'l', label: 'l', unit: 'm', digits: 2}, {key: 't20', label: 'Thời gian 20 dao động', unit: 's', digits: 2}, {key: 'T', label: 'T', unit: 's', digits: 3}, {key: 'T2', label: 'T²', unit: 's²', digits: 3}],
    measure: (p, _s, rng) => {
      const t20 = noisy(20 * 2 * Math.PI * Math.sqrt(p.l / G), 0.15, 0.01, rng);
      const T = t20 / 20;
      return {l: p.l, t20, T, T2: T * T};
    },
    viewBox: [560, 240],
    scene: (p, _s, last) => [ln(150, 20, 250, 20, {stroke: C.ink, w: 5}), ln(200, 20, 200 + 40, 20 + p.l * 190, {stroke: C.ink}), dot(240, 20 + p.l * 190, 12, C.red), ln(200, 20, 200, 20 + p.l * 190, {stroke: C.grey, dash: '4 4'}), txt(280, 20 + p.l * 100, `l = ${f(p.l, 1)} m`, {size: 12}), ...lcd(340, 130, 190, last ? `20T = ${f(last.t20)} s` : '20T = —')],
    chart: {x: 'l', y: 'T2', xLabel: 'l (m)', yLabel: 'T² (s²)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.l), rows.map((r) => r.T2));
      return [
        {key: 'slope', label: 'Độ dốc đồ thị T²–l (= 4π²/g)', value: fit.slope, unit: 's²/m', digits: 3},
        {key: 'g', label: 'g = 4π²/độ dốc', value: (4 * Math.PI * Math.PI) / fit.slope, unit: 'm/s²', digits: 2},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.g, G, 0.4) ? {ok: true, text: `g ≈ ${f(c.results.g)} m/s² khớp 9,79 m/s².`} : {ok: false, text: `g = ${f(c.results.g)} m/s² còn lệch: đo thêm ở nhiều chiều dài.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 chiều dài dây khác nhau', done: (c) => c.distinct('l') >= 4},
      {text: 'Xác định g từ đồ thị T²–l', done: (c) => Number.isFinite(c.results.g)},
    ],
    questions: [{q: 'Vì sao đo thời gian của 20 dao động rồi chia cho 20?', options: ['Giảm sai số tương đối của chu kì', 'Cho T lớn hơn', 'Để g lớn hơn', 'Bắt buộc theo quy định'], answer: 0, why: 'Sai số bấm đồng hồ cố định, chia cho nhiều dao động làm sai số của T nhỏ đi.'}],
    keywords: /thi nghiem con lac don|xac dinh gia toc trong truong bang con lac don|do g bang con lac don/,
    examples: ['thí nghiệm con lắc đơn xác định gia tốc trọng trường', 'đo g bằng con lắc đơn'],
    script: [setp('l', 0.3), M, setp('l', 0.5), M, setp('l', 0.7), M, setp('l', 0.9), M, setp('l', 1.0), M],
  },
  {
    id: 'BOYLE',
    lesson: 'Lí 12, bài 9',
    title: 'Thí nghiệm định luật Boyle',
    goal: 'Nén khí trong xi lanh ở nhiệt độ không đổi, đo áp suất theo thể tích và kiểm tra tích pV.',
    hazards: ['Nén chậm để nhiệt độ khí không đổi'],
    apparatus: 'Xi lanh có pit-tông, áp kế, thước chia thể tích',
    sliders: [{key: 'V', label: 'Thể tích khí V', unit: 'mL', min: 20, max: 60, step: 5, value: 40}],
    columns: [{key: 'V', label: 'V', unit: 'mL', digits: 0}, {key: 'p', label: 'p', unit: 'kPa', digits: 0}, {key: 'pV', label: 'p·V', unit: 'kPa·mL', digits: 0}, {key: 'iV', label: '1/V', unit: 'mL⁻¹', digits: 4}],
    measure: (p, _s, rng) => {
      const pm = noisy(5000 / p.V, 1.2, 1, rng);
      return {V: p.V, p: pm, pV: pm * p.V, iV: 1 / p.V};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => [box(100, 70, 220, 50, '#E0F2FE', C.ink), box(100 + (p.V / 60) * 190 + 20, 62, 10, 66, '#334155'), ln(130 + (p.V / 60) * 190, 95, 400, 95, {stroke: C.ink, w: 4}), ring(420, 95, 24, C.ink, 2), txt(420, 100, 'p', {size: 14, bold: true}), ...lcd(330, 150, 190, last ? `p = ${f(last.p, 0)} kPa` : 'p = —'), txt(180, 150, `V = ${f(p.V, 0)} mL`, {size: 12})],
    chart: {x: 'iV', y: 'p', xLabel: '1/V (mL⁻¹)', yLabel: 'p (kPa)', fit: true},
    results: (rows) => {
      const pv = rows.map((r) => r.pV);
      return [
        {key: 'pv', label: 'Trung bình p·V', value: mean(pv), unit: 'kPa·mL', digits: 0},
        {key: 'cv', label: 'Độ lệch tương đối của p·V', value: (100 * meanAbsDev(pv)) / mean(pv), unit: '%', digits: 2},
        {key: 'r2', label: 'R² của đồ thị p–1/V', value: linearFit(rows.map((r) => r.iV), rows.map((r) => r.p)).r2, digits: 4},
      ];
    },
    verdict: (c) => (c.results.cv < 4 ? {ok: true, text: `p·V gần như không đổi (lệch ${f(c.results.cv)} %): đúng định luật Boyle.`} : {ok: false, text: 'p·V còn dao động nhiều: đo thêm ở các thể tích khác nhau.'}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 thể tích khác nhau', done: (c) => c.distinct('V') >= 4},
      {text: 'Đồ thị p–1/V là đường thẳng (R² > 0,99)', done: (c) => c.results.r2 > 0.99},
    ],
    questions: [{q: 'Đồ thị p theo 1/V của khí ở nhiệt độ không đổi là:', options: ['Đường thẳng qua gốc', 'Parabol', 'Đường tròn', 'Đường nằm ngang'], answer: 0, why: 'pV = hằng số nên p tỉ lệ thuận với 1/V.'}],
    keywords: /thi nghiem dinh luat boyle|kiem chung dinh luat boyle|nen khi trong xi lanh do ap suat/,
    examples: ['thí nghiệm định luật Boyle', 'kiểm chứng định luật Boyle bằng xi lanh'],
    script: [setp('V', 20), M, setp('V', 30), M, setp('V', 40), M, setp('V', 50), M, setp('V', 60), M],
  },
  {
    id: 'OHM_LAW',
    lesson: 'Lí 11, bài 23',
    title: 'Thí nghiệm định luật Ohm: đặc tuyến vôn–ampe của điện trở',
    goal: 'Thay đổi hiệu điện thế đặt vào điện trở, đo cường độ dòng điện và xác định điện trở từ độ dốc đồ thị I–U.',
    hazards: ['Không vượt công suất định mức của điện trở'],
    apparatus: 'Nguồn một chiều điều chỉnh được, điện trở, ampe kế, vôn kế',
    sliders: [{key: 'U', label: 'Hiệu điện thế U', unit: 'V', min: 1, max: 10, step: 1, value: 5}],
    choices: [{key: 'res', label: 'Điện trở cần đo', value: 'r47', options: [['r47', 'Điện trở X'], ['r100', 'Điện trở Y']]}],
    columns: [{key: 'U', label: 'U', unit: 'V', digits: 1}, {key: 'I', label: 'I', unit: 'A', digits: 3}, {key: 'R', label: 'U/I', unit: 'Ω', digits: 1}],
    measure: (p, s, rng) => {
      const R = s.res === 'r47' ? 47 : 100;
      const I = Math.max(0.001, noisy(p.U / R, 0.0008, 0.001, rng));
      return {U: p.U, I, R: p.U / I};
    },
    viewBox: [560, 230],
    scene: (p, s, last) => [poly([[60, 60], [400, 60], [400, 170], [60, 170], [60, 60]], {stroke: C.ink, w: 2, close: false}), box(40, 95, 40, 40, '#FFFFFF', C.ink), txt(60, 120, `${f(p.U, 0)} V`, {size: 11, bold: true}), box(190, 48, 80, 24, s.res === 'r47' ? C.blue : C.purple), txt(230, 64, s.res === 'r47' ? 'X' : 'Y', {size: 11, fill: '#fff'}), ring(300, 160, 18, C.ink, 2), txt(300, 165, 'A', {size: 14, bold: true}), ...lcd(100, 185, 150, last ? `I = ${f(last.I, 3)} A` : 'I = —')],
    chart: {x: 'U', y: 'I', xLabel: 'U (V)', yLabel: 'I (A)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.U), rows.map((r) => r.I));
      return [
        {key: 'R', label: 'Điện trở R = 1/độ dốc', value: 1 / fit.slope, unit: 'Ω', digits: 1},
        {key: 'Rmean', label: 'Trung bình U/I', value: mean(rows.map((r) => r.R)), unit: 'Ω', digits: 1},
        {key: 'r2', label: 'R² của đồ thị I–U', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.R, 47, 3) || near(c.results.R, 100, 6) ? {ok: true, text: `R ≈ ${f(c.results.R, 1)} Ω, I tỉ lệ thuận với U.`} : {ok: false, text: `R = ${f(c.results.R, 1)} Ω chưa hợp lí: đo thêm nhiều giá trị U.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 hiệu điện thế khác nhau', done: (c) => c.distinct('U') >= 4},
      {text: 'Xác định R từ đồ thị I–U', done: (c) => Number.isFinite(c.results.R)},
    ],
    questions: [{q: 'Đồ thị I theo U của điện trở thuần là:', options: ['Đường thẳng qua gốc', 'Parabol', 'Đường cong lõm', 'Đường nằm ngang'], answer: 0, why: 'Định luật Ohm I = U/R: I tỉ lệ thuận với U.'}, safe],
    keywords: /thi nghiem dinh luat ohm|dac tuyen von ampe cua dien tro|do dien tro bang ampe ke va von ke/,
    examples: ['thí nghiệm định luật Ohm', 'đặc tuyến vôn ampe của điện trở'],
    script: [setp('U', 2), M, setp('U', 4), M, setp('U', 6), M, setp('U', 8), M, setp('U', 10), M],
  },
  {
    id: 'SPECIFIC_HEAT',
    lesson: 'Lí 12, bài 4',
    title: 'Thí nghiệm xác định nhiệt dung riêng của nước',
    goal: 'Đun nước bằng điện trở nhiệt công suất không đổi, đo độ tăng nhiệt độ theo thời gian và tính nhiệt dung riêng.',
    hazards: ['Không chạm vào điện trở nhiệt đang nóng', 'Chỉ cắm điện khi điện trở nhiệt đã ngập trong nước'],
    apparatus: 'Nhiệt lượng kế, điện trở nhiệt 40 W, nhiệt kế, đồng hồ bấm giây, cân',
    sliders: [{key: 't', label: 'Thời gian đun', unit: 's', min: 30, max: 300, step: 30, value: 120}],
    columns: [{key: 't', label: 't', unit: 's', digits: 0}, {key: 'dT', label: 'ΔT', unit: '°C', digits: 1}],
    measure: (p, _s, rng) => ({t: p.t, dT: Math.max(0.1, noisy((40 * 0.97 * p.t) / (0.2 * 4180), 0.12, 0.1, rng))}),
    viewBox: [560, 230],
    scene: (p, _s, last) => [box(130, 80, 120, 100, '#E0F2FE', C.ink), ln(160, 90, 160, 160, {stroke: C.red, w: 5}), ln(230, 60, 230, 160, {stroke: C.ink, w: 3}), dot(230, 165, 7, C.red), txt(190, 200, '200 g nước', {size: 12}), txt(190, 60, `đun ${f(p.t, 0)} s`, {size: 12}), ...lcd(320, 120, 190, last ? `ΔT = ${f(last.dT, 1)} °C` : 'ΔT = —')],
    chart: {x: 't', y: 'dT', xLabel: 't (s)', yLabel: 'ΔT (°C)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.t), rows.map((r) => r.dT));
      return [
        {key: 'slope', label: 'Độ dốc ΔT–t', value: fit.slope, unit: '°C/s', digits: 4},
        {key: 'c', label: 'c = P/(m·độ dốc), P = 40 W, m = 0,2 kg', value: 40 / (0.2 * fit.slope), unit: 'J/(kg·K)', digits: 0},
      ];
    },
    verdict: (c) => (Math.abs(c.results.c - 4180) / 4180 < 0.1 ? {ok: true, text: `c ≈ ${f(c.results.c, 0)} J/(kg·K), sai lệch dưới 10 % so với 4180 (một phần nhiệt hao phí ra môi trường).`} : {ok: false, text: `c = ${f(c.results.c, 0)} J/(kg·K) lệch nhiều: đo thêm ở nhiều thời gian.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 thời gian đun khác nhau', done: (c) => c.distinct('t') >= 4},
      {text: 'Tính nhiệt dung riêng từ độ dốc', done: (c) => Number.isFinite(c.results.c)},
    ],
    questions: [{q: 'Vì sao giá trị đo được thường lớn hơn 4180 một chút?', options: ['Một phần nhiệt hao phí ra môi trường', 'Nước có khối lượng lớn hơn', 'Nhiệt kế đo sai', 'Điện trở nhiệt sinh thêm nhiệt'], answer: 0, why: 'Nhiệt lượng thực sự truyền cho nước nhỏ hơn điện năng tiêu thụ nên c tính được lớn hơn thực tế.'}, safe],
    keywords: /thi nghiem (?:xac dinh )?nhiet dung rieng (?:cua )?nuoc|do nhiet dung rieng bang dien tro nhiet|nhiet luong ke dien tro nhiet/,
    examples: ['thí nghiệm xác định nhiệt dung riêng của nước', 'đo nhiệt dung riêng bằng điện trở nhiệt'],
    script: [setp('t', 60), M, setp('t', 120), M, setp('t', 180), M, setp('t', 240), M, setp('t', 300), M],
  },
  {
    id: 'CHARLES',
    lesson: 'Lí 12, bài 10',
    title: 'Thí nghiệm định luật Charles: thể tích khí theo nhiệt độ',
    goal: 'Làm nóng khí ở áp suất không đổi, đo thể tích theo nhiệt độ và ngoại suy nhiệt độ không tuyệt đối.',
    hazards: ['Dùng nước nóng đã đun sẵn, tránh bỏng', 'Không làm kín hoàn toàn bình khí khi đun'],
    apparatus: 'Bình khí nối ống xi lanh, cốc nước nóng, nhiệt kế, thước chia thể tích',
    sliders: [{key: 'T', label: 'Nhiệt độ khí', unit: '°C', min: 20, max: 80, step: 10, value: 30}],
    columns: [{key: 'T', label: 't', unit: '°C', digits: 0}, {key: 'V', label: 'V', unit: 'mL', digits: 1}],
    measure: (p, _s, rng) => ({T: p.T, V: noisy(50 * (1 + p.T / 273.15), 0.35, 0.5, rng)}),
    viewBox: [560, 230],
    scene: (p, _s, last) => [box(100, 70, 120, 90, '#BAE6FD', C.ink), box(100, 70, 120, 90 * (1 - p.T / 160), '#FFFFFF', 'none'), box(260, 80, 90, 24, '#E0F2FE', C.ink), box(260 + 20 + (last ? last.V - 40 : 10), 74, 8, 36, '#334155'), txt(160, 190, `t = ${f(p.T, 0)} °C`, {size: 12}), ...lcd(340, 150, 170, last ? `V = ${f(last.V, 1)} mL` : 'V = —')],
    chart: {x: 'T', y: 'V', xLabel: 't (°C)', yLabel: 'V (mL)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.T), rows.map((r) => r.V));
      return [
        {key: 'slope', label: 'Độ dốc V–t', value: fit.slope, unit: 'mL/°C', digits: 3},
        {key: 'T0', label: 'Nhiệt độ ngoại suy khi V = 0 (−tung độ gốc/độ dốc)', value: -fit.intercept / fit.slope, unit: '°C', digits: 0},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.T0, -273, 30) ? {ok: true, text: `V = 0 ngoại suy ở ≈ ${f(c.results.T0, 0)} °C, gần −273 °C: đây là nhiệt độ không tuyệt đối.`} : {ok: false, text: `Ngoại suy được ${f(c.results.T0, 0)} °C chưa gần −273 °C: đo thêm ở nhiều nhiệt độ.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 nhiệt độ khác nhau', done: (c) => c.distinct('T') >= 4},
      {text: 'Ngoại suy nhiệt độ ứng với V = 0', done: (c) => Number.isFinite(c.results.T0)},
    ],
    questions: [{q: 'Ở áp suất không đổi thể tích khí tỉ lệ thuận với đại lượng nào?', options: ['Nhiệt độ tuyệt đối', 'Nhiệt độ Celsius', 'Khối lượng riêng', 'Áp suất'], answer: 0, why: 'V/T = hằng số với T theo kelvin; đồ thị V–t cắt trục nhiệt độ tại −273 °C.'}, safe],
    keywords: /thi nghiem dinh luat charles|kiem chung dinh luat charles|the tich khi theo nhiet do (?:o )?ap suat khong doi/,
    examples: ['thí nghiệm định luật Charles', 'kiểm chứng định luật Charles'],
    script: [setp('T', 20), M, setp('T', 30), M, setp('T', 40), M, setp('T', 60), M, setp('T', 80), M],
  },
  {
    id: 'MAGNETIC_FORCE',
    lesson: 'Lí 12, bài 15',
    title: 'Thí nghiệm lực từ tác dụng lên dây dẫn mang dòng điện',
    goal: 'Đo lực từ lên đoạn dây dẫn trong từ trường đều bằng cân, xác định cảm ứng từ B từ F = BIl·sinθ.',
    hazards: ['Không đặt đồng hồ, thẻ từ gần nam châm', 'Không để dây dẫn nóng khi dòng lớn'],
    apparatus: 'Nam châm chữ U, khung dây, cân điện tử, nguồn một chiều, ampe kế',
    sliders: [{key: 'I', label: 'Cường độ dòng điện I', unit: 'A', min: 0.5, max: 3, step: 0.5, value: 1.5}, {key: 'th', label: 'Góc giữa dây và đường sức', unit: '°', min: 30, max: 90, step: 30, value: 90}],
    columns: [{key: 'I', label: 'I', unit: 'A', digits: 1}, {key: 'th', label: 'θ', unit: '°', digits: 0}, {key: 'F', label: 'F', unit: 'mN', digits: 2}, {key: 'B', label: 'B = F/(I·l·sinθ)', unit: 'T', digits: 3}],
    measure: (p, _s, rng) => {
      const F = Math.max(0.05, noisy(0.12 * p.I * 0.05 * Math.sin(rad(p.th)) * 1000, 0.15, 0.1, rng));
      return {I: p.I, th: p.th, F, B: F / 1000 / (p.I * 0.05 * Math.sin(rad(p.th)))};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => [box(100, 50, 40, 120, '#EF4444', C.ink), box(260, 50, 40, 120, '#3B82F6', C.ink), txt(120, 112, 'N', {size: 16, fill: '#fff', bold: true}), txt(280, 112, 'S', {size: 16, fill: '#fff', bold: true}), ln(140, 110, 260, 110, {stroke: C.ink, w: 3}), arrow(200, 110, 200, 110 - 20 * (p.I / 3) * Math.sin(rad(p.th)) - 12, C.green, 3), txt(200, 40, `I = ${f(p.I, 1)} A · θ = ${f(p.th, 0)}°`, {size: 12}), ...lcd(330, 140, 190, last ? `F = ${f(last.F, 2)} mN` : 'F = —')],
    chart: {x: 'I', y: 'F', xLabel: 'I (A)', yLabel: 'F (mN)', fit: false},
    results: (rows) => [
      {key: 'B', label: 'Cảm ứng từ trung bình B̄ (l = 5 cm)', value: mean(rows.map((r) => r.B)), unit: 'T', digits: 3},
      {key: 'dB', label: 'ΔB', value: meanAbsDev(rows.map((r) => r.B)), unit: 'T', digits: 3},
    ],
    verdict: (c) => (near(c.results.B, 0.12, 0.015) ? {ok: true, text: `B̄ ≈ ${f(c.results.B, 3)} T phù hợp nam châm (≈ 0,12 T); lực tỉ lệ với I và sinθ.`} : {ok: false, text: `B̄ = ${f(c.results.B, 3)} T lệch nhiều: đo thêm.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 3 cường độ dòng điện khác nhau', done: (c) => c.distinct('I') >= 3},
      {text: 'Đo ở ít nhất 2 góc θ khác nhau', done: (c) => c.distinct('th') >= 2},
    ],
    questions: [{q: 'Lực từ lớn nhất khi dây dẫn so với đường sức từ:', options: ['Vuông góc', 'Song song', 'Hợp góc 30°', 'Không phụ thuộc'], answer: 0, why: 'F = BIl·sinθ cực đại khi θ = 90°.'}, safe],
    keywords: /thi nghiem luc tu (?:tac dung )?(?:len )?day dan|do cam ung tu bang can|xac dinh cam ung tu bang luc tu|do cam ung tu bang luc tu/,
    examples: ['thí nghiệm lực từ tác dụng lên dây dẫn mang dòng điện', 'đo cảm ứng từ bằng lực từ'],
    script: [setp('th', 90), setp('I', 1), M, setp('I', 2), M, setp('I', 3), M, setp('th', 30), setp('I', 3), M, setp('th', 60), M],
  },
  {
    id: 'EM_INDUCTION',
    lesson: 'Lí 12, bài 16',
    title: 'Thí nghiệm cảm ứng điện từ: suất điện động khi nam châm chuyển động',
    goal: 'Đưa nam châm vào cuộn dây với tốc độ khác nhau, đo suất điện động cảm ứng theo tốc độ và số vòng dây.',
    hazards: [],
    apparatus: 'Cuộn dây (200, 400, 800 vòng), nam châm thẳng, milivôn kế',
    sliders: [{key: 'v', label: 'Tốc độ đưa nam châm vào', unit: 'cm/s', min: 2, max: 10, step: 2, value: 4}],
    choices: [{key: 'N', label: 'Số vòng dây', value: '400', options: [['200', '200 vòng'], ['400', '400 vòng'], ['800', '800 vòng']]}],
    columns: [{key: 'N', label: 'N', unit: 'vòng', digits: 0}, {key: 'v', label: 'v', unit: 'cm/s', digits: 0}, {key: 'e', label: 'e', unit: 'mV', digits: 2}, {key: 'k', label: 'e/(N·v)', unit: 'µV·s/cm', digits: 2}],
    measure: (p, s, rng) => {
      const N = Number(s.N);
      const e = Math.max(0.01, noisy(0.0015 * N * p.v, 0.04 * 0.0015 * N * p.v + 0.02, 0.01, rng));
      return {N, v: p.v, e, k: (1000 * e) / (N * p.v)};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => [...Array.from({length: Math.min(12, Number(s.N) / 70)}, (_, i) => ring(250 + i * 8, 110, 38, '#B45309', 2)), box(60 + 0, 98, 120, 24, '#EF4444', C.ink), txt(95, 114, 'N', {size: 12, fill: '#fff'}), txt(150, 114, 'S', {size: 12, fill: '#fff'}), arrow(100, 80, 100 + p.v * 8, 80, C.green, 3), ...lcd(330, 150, 190, last ? `e = ${f(last.e, 2)} mV` : 'e = —')],
    results: (rows) => [
      {key: 'k', label: 'Hằng số trung bình e/(N·v)', value: mean(rows.map((r) => r.k)), unit: 'µV·s/cm', digits: 2},
      {key: 'dk', label: 'Độ lệch của e/(N·v)', value: meanAbsDev(rows.map((r) => r.k)), unit: 'µV·s/cm', digits: 2},
    ],
    verdict: (c) => (near(c.results.k, 1.5, 0.15) && c.results.dk < 0.25 ? {ok: true, text: 'e tỉ lệ thuận với cả số vòng dây N và tốc độ biến thiên của từ thông (≈ v).'} : {ok: false, text: 'e/(N·v) chưa ổn định: đo ở nhiều tốc độ và hai số vòng khác nhau.'}),
    steps: [
      {text: 'Đo ít nhất 6 lần', done: (c) => c.rows.length >= 6},
      {text: 'Dùng ít nhất 3 tốc độ khác nhau', done: (c) => c.distinct('v') >= 3},
      {text: 'Đo với ít nhất 2 số vòng dây khác nhau', done: (c) => c.distinct('N') >= 2},
    ],
    questions: [{q: 'Suất điện động cảm ứng tăng khi:', options: ['Tăng tốc độ biến thiên từ thông và số vòng dây', 'Giảm số vòng dây', 'Đặt nam châm đứng yên trong cuộn', 'Dùng dây mảnh hơn'], answer: 0, why: 'Theo định luật Faraday |e| = N·|ΔΦ/Δt|.'}],
    keywords: /thi nghiem cam ung dien tu|thi nghiem faraday|nam cham (?:dua )?vao cuon day|suat dien dong cam ung (?:theo )?toc do/,
    examples: ['thí nghiệm cảm ứng điện từ', 'nam châm đưa vào cuộn dây'],
    script: [ch('N', '200'), setp('v', 4), M, setp('v', 8), M, ch('N', '400'), setp('v', 2), M, setp('v', 6), M, setp('v', 10), M, ch('N', '800'), setp('v', 4), M],
  },
  {
    id: 'WAVE_INTERFERENCE',
    lesson: 'Lí 11, bài 12',
    title: 'Thí nghiệm giao thoa sóng mặt nước',
    goal: 'Đo khoảng cách giữa các cực đại giao thoa liên tiếp, tính bước sóng và tốc độ truyền sóng.',
    hazards: ['Không để nước đổ ra thiết bị điện'],
    apparatus: 'Cần rung có hai mũi nhọn, khay nước, đèn hoạt nghiệm, thước',
    sliders: [{key: 'f', label: 'Tần số cần rung', unit: 'Hz', min: 20, max: 60, step: 5, value: 30}],
    columns: [{key: 'f', label: 'f', unit: 'Hz', digits: 0}, {key: 'L', label: 'Khoảng cách 5 cực đại liên tiếp', unit: 'cm', digits: 2}, {key: 'lam', label: 'λ = L/2', unit: 'cm', digits: 2}, {key: 'v', label: 'v = λf', unit: 'cm/s', digits: 1}],
    measure: (p, _s, rng) => {
      const lam = 30 / p.f;
      const L = noisy(2 * lam * 100 / 100 * 1, 0.025, 0.05, rng);
      return {f: p.f, L, lam: L / 2, v: (L / 2) * p.f};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => [box(60, 40, 340, 140, '#E0F2FE', C.ink), dot(130, 110, 5, C.red), dot(130 + 0, 140, 5, C.red), ...Array.from({length: 8}, (_, i) => ring(130, 125, 25 + i * (300 / p.f) * 6, 'rgba(37,99,235,0.35)', 1.2)), ...lcd(330, 190, 190, last ? `L = ${f(last.L, 2)} cm` : 'L = —')],
    results: (rows) => [
      {key: 'v', label: 'Tốc độ truyền sóng trung bình v̄', value: mean(rows.map((r) => r.v)), unit: 'cm/s', digits: 1},
      {key: 'dv', label: 'Δv', value: meanAbsDev(rows.map((r) => r.v)), unit: 'cm/s', digits: 1},
    ],
    verdict: (c) => (near(c.results.v, 30, 3) ? {ok: true, text: `v̄ ≈ ${f(c.results.v, 1)} cm/s: không phụ thuộc tần số, đúng với sóng trên mặt nước.`} : {ok: false, text: `v̄ = ${f(c.results.v, 1)} cm/s lệch: đo thêm ở nhiều tần số.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 3 tần số khác nhau', done: (c) => c.distinct('f') >= 3},
      {text: 'Tính tốc độ truyền sóng từ λ và f', done: (c) => Number.isFinite(c.results.v)},
    ],
    questions: [{q: 'Hai cực đại giao thoa liên tiếp trên đoạn nối hai nguồn cách nhau:', options: ['λ/2', 'λ', '2λ', 'λ/4'], answer: 0, why: 'Hiệu đường đi tăng thêm λ khi qua hai cực đại liên tiếp nên khoảng cách giữa chúng là λ/2.'}],
    keywords: /thi nghiem giao thoa song (?:mat )?nuoc|giao thoa song nuoc bang can rung|do buoc song giao thoa song/,
    examples: ['thí nghiệm giao thoa sóng mặt nước', 'đo bước sóng bằng giao thoa sóng nước'],
    script: [setp('f', 20), M, setp('f', 30), M, setp('f', 40), M, setp('f', 50), M, setp('f', 60), M],
  },
  {
    id: 'STANDING_WAVE',
    lesson: 'Lí 11, bài 13',
    title: 'Thí nghiệm sóng dừng trên sợi dây',
    goal: 'Tìm tần số cộng hưởng cơ bản của dây có chiều dài khác nhau và xác định tốc độ truyền sóng.',
    hazards: [],
    apparatus: 'Sợi dây căng, máy phát dao động, thước',
    sliders: [{key: 'L', label: 'Chiều dài dây', unit: 'm', min: 0.4, max: 1.0, step: 0.1, value: 0.6}],
    columns: [{key: 'L', label: 'L', unit: 'm', digits: 2}, {key: 'f1', label: 'f₁ (một bụng)', unit: 'Hz', digits: 1}, {key: 'iL', label: '1/L', unit: 'm⁻¹', digits: 3}, {key: 'v', label: 'v = 2Lf₁', unit: 'm/s', digits: 1}],
    measure: (p, _s, rng) => {
      const f1 = noisy(48 / (2 * p.L), 0.6, 0.1, rng);
      return {L: p.L, f1, iL: 1 / p.L, v: 2 * p.L * f1};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 120; i++) pts.push([60 + (i / 120) * p.L * 380, 100 - 38 * Math.sin((Math.PI * i) / 120)]);
      const pts2: [number, number][] = pts.map(([x, y]) => [x, 200 - y]);
      return [poly(pts, {stroke: C.blue, w: 2.4, close: false}), poly(pts2, {stroke: C.blue, w: 1.2, close: false, dash: '4 3'}), dot(60, 100, 5), dot(60 + p.L * 380, 100, 5), txt(60 + (p.L * 380) / 2, 40, `L = ${f(p.L, 1)} m`, {size: 12}), ...lcd(330, 150, 190, last ? `f₁ = ${f(last.f1, 1)} Hz` : 'f₁ = —')];
    },
    chart: {x: 'iL', y: 'f1', xLabel: '1/L (m⁻¹)', yLabel: 'f₁ (Hz)', fit: true},
    results: (rows) => {
      const fit = linearFit(rows.map((r) => r.iL), rows.map((r) => r.f1));
      return [
        {key: 'v', label: 'Tốc độ sóng v = 2·độ dốc f₁–1/L', value: 2 * fit.slope, unit: 'm/s', digits: 1},
        {key: 'vmean', label: 'Trung bình v = 2Lf₁', value: mean(rows.map((r) => r.v)), unit: 'm/s', digits: 1},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (near(c.results.v, 48, 3) ? {ok: true, text: `v ≈ ${f(c.results.v, 1)} m/s: f₁ tỉ lệ nghịch với chiều dài dây.`} : {ok: false, text: `v = ${f(c.results.v, 1)} m/s lệch: đo thêm ở nhiều chiều dài.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 4 chiều dài dây khác nhau', done: (c) => c.distinct('L') >= 4},
      {text: 'Xác định tốc độ sóng từ đồ thị f₁–1/L', done: (c) => Number.isFinite(c.results.v)},
    ],
    questions: [{q: 'Sóng dừng trên dây hai đầu cố định có chiều dài L, tần số cơ bản:', options: ['f₁ = v/(2L)', 'f₁ = v/L', 'f₁ = 2v/L', 'f₁ = v/(4L)'], answer: 0, why: 'Chiều dài dây bằng nửa bước sóng: L = λ/2.'}],
    keywords: /thi nghiem song dung (?:tren )?(?:soi )?day|do toc do song bang song dung|tan so co ban cua day/,
    examples: ['thí nghiệm sóng dừng trên sợi dây', 'đo tốc độ sóng bằng sóng dừng'],
    script: [setp('L', 0.4), M, setp('L', 0.5), M, setp('L', 0.7), M, setp('L', 0.9), M, setp('L', 1.0), M],
  },
  {
    id: 'CAPACITOR_RC',
    lesson: 'Lí 11, bài 21',
    title: 'Thí nghiệm nạp tụ điện qua điện trở: hằng số thời gian RC',
    goal: 'Đo hiệu điện thế trên tụ khi nạp theo thời gian và xác định hằng số thời gian τ = RC.',
    hazards: ['Xả tụ trước khi chạm vào mạch'],
    apparatus: 'Tụ 100 µF, điện trở, nguồn 6 V, vôn kế, đồng hồ bấm giây',
    sliders: [{key: 't', label: 'Thời gian nạp t', unit: 's', min: 0.5, max: 6, step: 0.5, value: 2}],
    choices: [{key: 'R', label: 'Điện trở nạp', value: '22', options: [['10', '10 kΩ'], ['22', '22 kΩ'], ['47', '47 kΩ']]}],
    columns: [{key: 'R', label: 'R', unit: 'kΩ', digits: 0}, {key: 't', label: 't', unit: 's', digits: 1}, {key: 'U', label: 'U', unit: 'V', digits: 2}, {key: 'y', label: 'ln(1 − U/E)', digits: 3}],
    measure: (p, s, rng) => {
      const tau = Number(s.R) * 1e3 * 100e-6;
      const U = Math.min(5.95, Math.max(0.05, noisy(6 * (1 - Math.exp(-p.t / tau)), 0.03, 0.05, rng)));
      return {R: Number(s.R), t: p.t, U, y: Math.log(Math.max(1e-3, 1 - U / 6))};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => [poly([[60, 60], [380, 60], [380, 170], [60, 170], [60, 60]], {stroke: C.ink, w: 2, close: false}), box(40, 95, 40, 40, '#FFFFFF', C.ink), txt(60, 120, '6 V', {size: 12, bold: true}), box(150, 48, 70, 24, C.blue), txt(185, 64, `${s.R} kΩ`, {size: 11, fill: '#fff'}), ln(300, 130, 300, 170, {stroke: C.ink, w: 3}), ln(280, 130, 320, 130, {stroke: C.ink, w: 3}), ln(280, 142, 320, 142, {stroke: C.ink, w: 3}), txt(340, 138, '100 µF', {size: 11, anchor: 'start'}), txt(200, 100, `t = ${f(p.t, 1)} s`, {size: 12}), ...lcd(100, 185, 170, last ? `U = ${f(last.U, 2)} V` : 'U = —')],
    chart: {x: 't', y: 'y', xLabel: 't (s)', yLabel: 'ln(1 − U/E)', fit: true},
    results: (rows, _p, s) => {
      const rr = rows.filter((r) => String(r.R) === s.R);
      const fit = linearFit(rr.map((r) => r.t), rr.map((r) => r.y));
      return [
        {key: 'tau', label: 'Hằng số thời gian τ = −1/độ dốc (điện trở đang chọn)', value: -1 / fit.slope, unit: 's', digits: 2},
        {key: 'rc', label: 'Giá trị RC tính', value: Number(s.R) * 1e3 * 100e-6, unit: 's', digits: 2},
        {key: 'r2', label: 'R²', value: fit.r2, digits: 4},
      ];
    },
    verdict: (c) => (Math.abs(c.results.tau - c.results.rc) / c.results.rc < 0.15 ? {ok: true, text: `τ ≈ ${f(c.results.tau)} s ≈ RC = ${f(c.results.rc)} s.`} : {ok: false, text: `τ = ${f(c.results.tau)} s khác RC = ${f(c.results.rc)} s: đo thêm ở các thời gian khác nhau.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần với cùng một điện trở', done: (c) => c.rows.length >= 5 && c.distinct('R') === 1},
      {text: 'Dùng ít nhất 4 thời gian khác nhau', done: (c) => c.distinct('t') >= 4},
      {text: 'Xác định τ từ đồ thị ln(1 − U/E)–t', done: (c) => Number.isFinite(c.results.tau)},
    ],
    questions: [{q: 'Tăng R thì tụ nạp:', options: ['Chậm hơn', 'Nhanh hơn', 'Như cũ', 'Không nạp được'], answer: 0, why: 'τ = RC tăng khi R tăng nên thời gian nạp dài hơn.'}, safe],
    keywords: /thi nghiem (?:nap|xa) tu dien|hang so thoi gian rc|nap tu qua dien tro/,
    examples: ['thí nghiệm nạp tụ điện qua điện trở', 'hằng số thời gian RC của tụ điện'],
    script: [ch('R', '22'), setp('t', 1), M, setp('t', 2), M, setp('t', 3), M, setp('t', 4), M, setp('t', 5), M],
  },
  {
    id: 'LATENT_HEAT_FUSION',
    lesson: 'Lí 12, bài 5',
    title: 'Thí nghiệm xác định nhiệt nóng chảy riêng của nước đá',
    goal: 'Thả nước đá vào nước ấm trong nhiệt lượng kế, đo nhiệt độ cân bằng và tính nhiệt nóng chảy riêng.',
    hazards: ['Không dùng nước quá nóng', 'Lau khô đá trước khi thả'],
    apparatus: 'Nhiệt lượng kế, nước ấm 200 g, nước đá, nhiệt kế, cân',
    sliders: [{key: 'mi', label: 'Khối lượng nước đá', unit: 'g', min: 20, max: 60, step: 10, value: 40}, {key: 'T1', label: 'Nhiệt độ ban đầu của nước', unit: '°C', min: 40, max: 70, step: 10, value: 50}],
    columns: [{key: 'mi', label: 'm đá', unit: 'g', digits: 0}, {key: 'T1', label: 'T₁', unit: '°C', digits: 0}, {key: 'Tf', label: 'T cân bằng', unit: '°C', digits: 1}, {key: 'lam', label: 'λ', unit: 'kJ/kg', digits: 0}],
    measure: (p, _s, rng) => {
      const mw = 0.2;
      const mi = p.mi / 1000;
      const c = 4.18;
      const lam = 334;
      const Tf = noisy((mw * c * p.T1 - mi * lam) / ((mw + mi) * c), 0.2, 0.1, rng);
      const lamM = (mw * c * (p.T1 - Tf) - mi * c * Tf) / mi;
      return {mi: p.mi, T1: p.T1, Tf, lam: lamM};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => [box(110, 80, 130, 90, '#FECACA', C.ink), box(130, 90, 30 + p.mi / 3, 30 + p.mi / 3, '#BAE6FD', C.ink), txt(175, 190, `nước ${f(p.T1, 0)} °C + đá ${f(p.mi, 0)} g`, {size: 12}), ...lcd(310, 130, 200, last ? `Tcb = ${f(last.Tf, 1)} °C` : 'Tcb = —')],
    results: (rows) => [
      {key: 'lam', label: 'Nhiệt nóng chảy riêng trung bình λ̄', value: mean(rows.map((r) => r.lam)), unit: 'kJ/kg', digits: 0},
      {key: 'dl', label: 'Δλ', value: meanAbsDev(rows.map((r) => r.lam)), unit: 'kJ/kg', digits: 0},
    ],
    verdict: (c) => (near(c.results.lam, 334, 40) ? {ok: true, text: `λ̄ ≈ ${f(c.results.lam, 0)} kJ/kg gần giá trị 334 kJ/kg.`} : {ok: false, text: `λ̄ = ${f(c.results.lam, 0)} kJ/kg lệch nhiều: đo thêm nhiều lần.`}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Thay đổi khối lượng đá hoặc nhiệt độ nước (ít nhất 3 cặp khác nhau)', done: (c) => new Set(c.rows.map((r) => `${r.mi}-${r.T1}`)).size >= 3},
      {text: 'Tính nhiệt nóng chảy riêng trung bình', done: (c) => Number.isFinite(c.results.lam)},
    ],
    questions: [{q: 'Phương trình cân bằng nhiệt dùng trong thí nghiệm là:', options: ['Nhiệt nước tỏa ra = nhiệt đá thu vào để tan và nóng lên', 'Nhiệt đá tỏa = nhiệt nước thu', 'Tổng nhiệt bằng 0 nên không cần tính', 'Nhiệt chỉ phụ thuộc khối lượng'], answer: 0, why: 'm_w·c·(T₁ − T) = m_đ·λ + m_đ·c·T.'}, safe],
    keywords: /thi nghiem (?:xac dinh )?nhiet nong chay rieng|nhiet nong chay rieng cua nuoc da|nuoc da (?:tha vao )?nuoc am can bang nhiet/,
    examples: ['thí nghiệm xác định nhiệt nóng chảy riêng của nước đá', 'nước đá thả vào nước ấm cân bằng nhiệt'],
    script: [setp('T1', 50), setp('mi', 30), M, setp('mi', 40), M, setp('T1', 60), M, setp('mi', 50), M, setp('T1', 40), M],
  },
  {
    id: 'LEVER_MOMENT',
    lesson: 'Lí 10, bài 21',
    title: 'Thí nghiệm moment lực: điều kiện cân bằng của đòn bẩy',
    goal: 'Treo vật ở hai bên trục quay, tìm vị trí cân bằng và kiểm tra quy tắc moment.',
    hazards: [],
    apparatus: 'Thanh có trục quay, các quả cân, thước',
    sliders: [{key: 'm1', label: 'Quả cân bên trái m₁', unit: 'kg', min: 0.1, max: 0.5, step: 0.1, value: 0.3}, {key: 'd1', label: 'Cánh tay đòn bên trái d₁', unit: 'cm', min: 10, max: 40, step: 10, value: 20}, {key: 'm2', label: 'Quả cân bên phải m₂', unit: 'kg', min: 0.1, max: 0.5, step: 0.1, value: 0.2}],
    columns: [{key: 'm1', label: 'm₁', unit: 'kg', digits: 1}, {key: 'd1', label: 'd₁', unit: 'cm', digits: 0}, {key: 'm2', label: 'm₂', unit: 'kg', digits: 1}, {key: 'd2', label: 'd₂ cân bằng', unit: 'cm', digits: 1}, {key: 'ratio', label: 'M₂/M₁', digits: 3}],
    measure: (p, _s, rng) => {
      const d2 = noisy((p.m1 * p.d1) / p.m2, 0.3, 0.1, rng);
      return {m1: p.m1, d1: p.d1, m2: p.m2, d2, ratio: (p.m2 * d2) / (p.m1 * p.d1)};
    },
    viewBox: [560, 220],
    scene: (p, _s, last) => {
      const d2 = last ? last.d2 : (p.m1 * p.d1) / p.m2;
      return [ln(60, 100, 460, 100, {stroke: C.ink, w: 7}), poly([[260, 100], [240, 150], [280, 150]], {fill: '#E7E5E4', stroke: C.grey}), box(260 - p.d1 * 4 - 12, 104, 24, 20 + p.m1 * 50, C.blue), box(260 + d2 * 4 - 12, 104, 24, 20 + p.m2 * 50, C.orange), txt(260 - p.d1 * 4, 92, `${f(p.d1, 0)} cm`, {size: 10}), txt(260 + d2 * 4, 92, `${f(d2, 1)} cm`, {size: 10}), ...lcd(330, 160, 190, last ? `M₂/M₁ = ${f(last.ratio, 3)}` : '—')];
    },
    results: (rows) => [
      {key: 'ratio', label: 'Trung bình M₂/M₁', value: mean(rows.map((r) => r.ratio)), digits: 3},
      {key: 'dr', label: 'Độ lệch trung bình', value: meanAbsDev(rows.map((r) => r.ratio)), digits: 3},
    ],
    verdict: (c) => (near(c.results.ratio, 1, 0.04) ? {ok: true, text: 'M₁ ≈ M₂: đòn bẩy cân bằng khi tổng moment theo hai chiều bằng nhau.'} : {ok: false, text: 'M₂/M₁ chưa gần 1: đo thêm.'}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Thay đổi m₁, d₁ hoặc m₂ (ít nhất 3 bộ khác nhau)', done: (c) => new Set(c.rows.map((r) => `${r.m1}-${r.d1}-${r.m2}`)).size >= 3},
      {text: 'Kiểm tra M₁ = M₂', done: (c) => Number.isFinite(c.results.ratio)},
    ],
    questions: [{q: 'Điều kiện cân bằng của vật có trục quay cố định là:', options: ['Tổng moment theo chiều kim đồng hồ bằng tổng moment ngược chiều', 'Tổng lực bằng 0', 'Khối lượng hai bên bằng nhau', 'Cánh tay đòn hai bên bằng nhau'], answer: 0, why: 'Quy tắc moment: M = F·d, cân bằng khi ΣM thuận = ΣM nghịch.'}],
    keywords: /thi nghiem moment luc|thi nghiem don bay|dieu kien can bang cua don bay|thanh co truc quay can bang/,
    examples: ['thí nghiệm moment lực', 'thí nghiệm điều kiện cân bằng của đòn bẩy'],
    script: [setp('m1', 0.3), setp('d1', 20), setp('m2', 0.2), M, setp('m2', 0.3), M, setp('d1', 30), M, setp('m1', 0.4), M, setp('m2', 0.4), M],
  },
  {
    id: 'PROJECTILE_HORIZONTAL',
    lesson: 'Lí 10, bài 12',
    title: 'Thí nghiệm chuyển động ném ngang',
    goal: 'Đo tầm xa của vật ném ngang theo độ cao và tốc độ ném, kiểm tra L = v₀·√(2h/g).',
    hazards: ['Quan sát từ phía sau máng bắn, không đứng trên đường bay'],
    apparatus: 'Máng ném, bi thép, thước, giấy than đo điểm rơi',
    sliders: [{key: 'h', label: 'Độ cao h', unit: 'm', min: 0.3, max: 1.0, step: 0.1, value: 0.5}, {key: 'v0', label: 'Tốc độ ném v₀', unit: 'm/s', min: 1, max: 3, step: 0.5, value: 2}],
    columns: [{key: 'h', label: 'h', unit: 'm', digits: 1}, {key: 'v0', label: 'v₀', unit: 'm/s', digits: 1}, {key: 'L', label: 'Tầm xa L', unit: 'm', digits: 3}, {key: 'g', label: 'g = 2h·v₀²/L²', unit: 'm/s²', digits: 2}],
    measure: (p, _s, rng) => {
      const L = noisy(p.v0 * Math.sqrt((2 * p.h) / G), 0.008, 0.005, rng);
      return {h: p.h, v0: p.v0, L, g: (2 * p.h * p.v0 ** 2) / (L * L)};
    },
    viewBox: [560, 240],
    scene: (p, _s, last) => {
      const L = last ? last.L : p.v0 * Math.sqrt((2 * p.h) / G);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 40; i++) {
        const x = (L * i) / 40;
        pts.push([80 + x * 130, 40 + (G * (x / p.v0) ** 2) / 2 * 130]);
      }
      return [box(50, 30, 40, 10, '#334155'), ln(50, 40, 50, 40 + p.h * 130, {stroke: C.grey, dash: '3 3'}), ln(40, 40 + p.h * 130, 520, 40 + p.h * 130, {stroke: C.ink, w: 3}), poly(pts, {stroke: C.red, w: 2, close: false}), dot(80 + L * 130, 40 + p.h * 130, 6, C.red), txt(300, 20, `h = ${f(p.h, 1)} m · v₀ = ${f(p.v0, 1)} m/s`, {size: 12}), ...lcd(330, 190, 190, last ? `L = ${f(last.L, 3)} m` : 'L = —')];
    },
    results: (rows) => [
      {key: 'g', label: 'Gia tốc rơi trung bình ḡ', value: mean(rows.map((r) => r.g)), unit: 'm/s²', digits: 2},
      {key: 'dg', label: 'Δg', value: meanAbsDev(rows.map((r) => r.g)), unit: 'm/s²', digits: 2},
    ],
    verdict: (c) => (near(c.results.g, G, 0.6) ? {ok: true, text: `ḡ ≈ ${f(c.results.g)} m/s²: tầm xa đúng công thức L = v₀·√(2h/g).`} : {ok: false, text: `ḡ = ${f(c.results.g)} m/s² lệch: đo thêm ở nhiều độ cao.`}),
    steps: [
      {text: 'Đo ít nhất 6 lần', done: (c) => c.rows.length >= 6},
      {text: 'Dùng ít nhất 3 độ cao khác nhau', done: (c) => c.distinct('h') >= 3},
      {text: 'Dùng ít nhất 2 tốc độ ném khác nhau', done: (c) => c.distinct('v0') >= 2},
    ],
    questions: [{q: 'Thời gian rơi của vật ném ngang phụ thuộc vào:', options: ['Độ cao h', 'Tốc độ ném v₀', 'Khối lượng vật', 'Cả h và v₀'], answer: 0, why: 'Theo phương thẳng đứng vật rơi tự do: t = √(2h/g), không phụ thuộc v₀.'}, safe],
    keywords: /thi nghiem chuyen dong nem ngang|do tam xa cua vat nem ngang|nem ngang (?:do )?tam xa theo do cao/,
    examples: ['thí nghiệm chuyển động ném ngang', 'đo tầm xa của vật ném ngang'],
    script: [setp('v0', 2), setp('h', 0.3), M, setp('h', 0.5), M, setp('h', 0.8), M, setp('v0', 3), setp('h', 0.5), M, setp('h', 1.0), M, setp('v0', 1), M],
  },
  {
    id: 'TRANSFORMER',
    lesson: 'Lí 12, bài 17–18',
    title: 'Thí nghiệm máy biến áp: tỉ số điện áp và số vòng dây',
    goal: 'Đặt điện áp xoay chiều vào cuộn sơ cấp, đo điện áp cuộn thứ cấp và so với tỉ số số vòng dây.',
    hazards: ['Chỉ dùng điện áp xoay chiều thấp (dưới 12 V)', 'Không chạm vào cuộn dây khi bật nguồn'],
    apparatus: 'Lõi sắt hình chữ U, cuộn dây sơ cấp và thứ cấp, nguồn xoay chiều, vôn kế xoay chiều',
    sliders: [{key: 'U1', label: 'Điện áp sơ cấp U₁', unit: 'V', min: 2, max: 12, step: 2, value: 6}],
    choices: [{key: 'ratio', label: 'Số vòng sơ cấp : thứ cấp', value: '1:2', options: [['2:1', '200 : 100 (hạ áp)'], ['1:1', '200 : 200'], ['1:2', '200 : 400 (tăng áp)'], ['1:4', '200 : 800 (tăng áp)']]}],
    columns: [{key: 'k', label: 'N₂/N₁', digits: 2}, {key: 'U1', label: 'U₁', unit: 'V', digits: 1}, {key: 'U2', label: 'U₂', unit: 'V', digits: 2}, {key: 'r', label: 'U₂/U₁', digits: 3}],
    measure: (p, s, rng) => {
      const k = ({'2:1': 0.5, '1:1': 1, '1:2': 2, '1:4': 4} as Record<string, number>)[s.ratio] ?? 1;
      const U2 = Math.max(0.01, noisy(0.97 * k * p.U1, 0.03, 0.01, rng));
      return {k, U1: p.U1, U2, r: U2 / p.U1};
    },
    viewBox: [560, 220],
    scene: (p, s, last) => [box(180, 60, 160, 110, '#CBD5E1', C.ink), box(210, 85, 100, 60, '#F5F5F4', C.ink), ...Array.from({length: 6}, (_, i) => ring(195, 80 + i * 14, 9, C.red, 2)), ...Array.from({length: Math.min(10, Math.round(6 * ({'2:1': 0.5, '1:1': 1, '1:2': 2, '1:4': 4} as Record<string, number>)[s.ratio]))}, (_, i) => ring(325, 70 + i * 9, 9, C.blue, 2)), txt(100, 120, `U₁ = ${f(p.U1, 0)} V`, {size: 13}), txt(445, 120, 'U₂', {size: 13}), ...lcd(330, 175, 190, last ? `U₂ = ${f(last.U2, 2)} V` : 'U₂ = —')],
    chart: {x: 'U1', y: 'U2', xLabel: 'U₁ (V)', yLabel: 'U₂ (V)', fit: false},
    results: (rows) => [
      {key: 'eff', label: 'Trung bình (U₂/U₁)/(N₂/N₁)', value: mean(rows.map((r) => r.r / r.k)), digits: 3},
      {key: 'dr', label: 'Độ lệch', value: meanAbsDev(rows.map((r) => r.r / r.k)), digits: 3},
    ],
    verdict: (c) => (near(c.results.eff, 0.97, 0.04) ? {ok: true, text: `U₂/U₁ ≈ ${f(c.results.eff, 2)}·(N₂/N₁): gần bằng tỉ số vòng dây (hao phí vài %).`} : {ok: false, text: 'Tỉ số chưa ổn định: đo ở nhiều U₁ và nhiều tỉ số vòng.'}),
    steps: [
      {text: 'Đo ít nhất 5 lần', done: (c) => c.rows.length >= 5},
      {text: 'Dùng ít nhất 3 điện áp sơ cấp khác nhau', done: (c) => c.distinct('U1') >= 3},
      {text: 'Đo với ít nhất 2 tỉ số số vòng dây khác nhau', done: (c) => c.distinct('k') >= 2},
    ],
    questions: [{q: 'Máy biến áp tăng áp có:', options: ['N₂ > N₁', 'N₂ < N₁', 'N₂ = N₁', 'Không có cuộn thứ cấp'], answer: 0, why: 'U₂/U₁ ≈ N₂/N₁ nên muốn tăng điện áp thì cuộn thứ cấp nhiều vòng hơn.'}, safe],
    keywords: /thi nghiem may bien ap|ti so dien ap (?:va )?so vong day|do dien ap cuon so cap thu cap/,
    examples: ['thí nghiệm máy biến áp', 'thí nghiệm tỉ số điện áp và số vòng dây của máy biến áp'],
    script: [ch('ratio', '1:2'), setp('U1', 4), M, setp('U1', 8), M, setp('U1', 12), M, ch('ratio', '2:1'), setp('U1', 6), M, ch('ratio', '1:4'), setp('U1', 4), M],
  },
];
export const PHYS_BY_ID: Record<string, PhysExperiment> = Object.fromEntries(PHYS_EXPERIMENTS.map((e) => [e.id, e]));


