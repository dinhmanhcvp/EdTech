import type {P, PresetSpec} from './types';

const f1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});
const f2 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 2});
const gauss = (x: number, mu: number, w: number) => Math.exp(-(((x - mu) / w) ** 2));

// ------------------------------------------------------------------ công thức (xuất để kiểm thử)
/** Tăng trưởng tương đối (%) theo lg nồng độ auxin: kích thích quanh cực thuận xo, ức chế khi nồng độ quá cao. */
export const auxinResponse = (x: number, xo: number) => 100 * gauss(x, xo, 1.2) - 100 / (1 + Math.exp(-(x - xo - 2) * 2));
export const OPT_AUXIN = {root: -10, bud: -8, stem: -5};

/** Nồng độ hormone tương đối trong chu kì kinh nguyệt dài len ngày; rụng trứng ngày len − 14. */
export const ovulationDay = (len: number) => len - 14;
export const fsh = (d: number, len: number) => 0.2 + 0.6 * gauss(d, 5, 4) + 0.5 * gauss(d, ovulationDay(len), 1.2);
export const lh = (d: number, len: number) => 0.15 + 1.0 * gauss(d, ovulationDay(len), 0.9);
export const estrogen = (d: number, len: number) => 0.15 + 0.6 * gauss(d, ovulationDay(len) - 1.5, 2.5) + 0.35 * gauss(d, ovulationDay(len) + 7, 3.5);
export const progesterone = (d: number, len: number) => 0.05 + 0.9 * gauss(d, ovulationDay(len) + 7, 3.8);

/** log10 số tế bào theo bốn pha: tiềm phát, lũy thừa, ổn định, suy vong. */
export function bacterialLog(t: number, lag: number, gen: number, logK: number, tDeath: number, logN0 = 4): number {
  if (t <= lag) return logN0;
  const mu = Math.LN2 / gen / Math.LN10;
  const tK = lag + (logK - logN0) / mu;
  if (t <= Math.min(tK, tDeath)) return logN0 + mu * (t - lag);
  const peak = logN0 + mu * (Math.min(tK, tDeath) - lag);
  if (t <= tDeath) return peak;
  return peak - 0.12 * (t - tDeath);
}
export const phaseOfGrowth = (t: number, lag: number, gen: number, logK: number, tDeath: number) => {
  if (t <= lag) return 'tiềm phát';
  const mu = Math.LN2 / gen / Math.LN10;
  const tK = lag + (logK - 4) / mu;
  if (t <= Math.min(tK, tDeath)) return 'lũy thừa';
  return t <= tDeath ? 'cân bằng' : 'suy vong';
};

/** Năng suất tương đối (%) theo liều phân bón: thiếu (hàm bão hòa) rồi độc (giảm). */
export const yieldResponse = (dose: number, km: number, kt: number) => (100 * (dose / (dose + km)) * Math.exp(-((dose / kt) ** 2))) / 0.65;
/** Cường độ hô hấp tương đối theo nhiệt độ và độ ẩm của hạt. */
export const respiration = (T: number, q10: number, water: number) => 100 * water * Math.pow(q10, (T - 20) / 10) / (1 + Math.exp((T - 42) / 2));
/** Phản xạ có điều kiện: học (tăng tiệm cận), rồi tắt dần khi bỏ củng cố từ lần thử ext. */
export function conditioning(n: number, alpha: number, ext: number): number {
  if (n <= ext) return 100 * (1 - Math.exp(-alpha * n));
  return 100 * (1 - Math.exp(-alpha * ext)) * Math.exp(-0.25 * (n - ext));
}
/** Mức phản ứng: kiểu hình (0–100) theo nhiệt độ của ba kiểu gene. */
export const norm = {
  himalaya: (T: number, tc: number) => 100 / (1 + Math.exp((T - tc) / 3)),
  wide: (T: number) => Math.max(0, Math.min(100, 20 + 2 * T)),
  narrow: (T: number) => 50 + 6 * Math.sin(T / 12),
};

export const SINH2_CURVE_PRESETS: Record<string, PresetSpec> = {
  BIO_PLANT_GROWTH: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Hormone thực vật: tác dụng của auxin phụ thuộc nồng độ và cơ quan',
    question: 'Vì sao cùng một nồng độ auxin có thể kích thích rễ nhưng ức chế thân, hoặc ngược lại? Nồng độ nào là cực thuận cho từng cơ quan?',
    keywords: /hormone thuc vat|phytohormone|nong do auxin|auxin va gibberellin|cytokinin|ethylene|acid abscisic|uu the ngon|sinh truong va phat trien o thuc vat|quang chu k[yi]/,
    examples: ['hormone thực vật', 'nồng độ auxin', 'cytokinin', 'ưu thế ngọn', 'quang chu kì'],
    data: {
      xLabel: 'lg nồng độ auxin (mol/L)',
      yLabel: 'sinh trưởng so với đối chứng (%)',
      xRange: [-12, -1],
      yRange: [-110, 110],
      params: [],
      curves: [
        {id: 'root', label: 'Rễ (cực thuận ≈ 10⁻¹⁰ M)', color: '#92400E', fn: (x) => auxinResponse(x, OPT_AUXIN.root)},
        {id: 'bud', label: 'Chồi (≈ 10⁻⁸ M)', color: '#16A34A', fn: (x) => auxinResponse(x, OPT_AUXIN.bud)},
        {id: 'stem', label: 'Thân (≈ 10⁻⁵ M)', color: '#2563EB', fn: (x) => auxinResponse(x, OPT_AUXIN.stem)},
        {id: 'zero', label: 'Đối chứng', color: '#A8A29E', dashed: true, fn: () => 0},
      ],
      readouts: [
        {label: 'Nồng độ cực thuận rễ · chồi · thân', value: () => '10⁻¹⁰ · 10⁻⁸ · 10⁻⁵ mol/L'},
        {label: 'Ứng dụng', value: () => 'auxin tổng hợp ra rễ cho cành giâm, tạo quả không hạt; gibberellin kích thích nảy mầm; cytokinin phân chia tế bào; ethylene chín quả; ABA đóng khí khổng, ngủ hạt'},
      ],
      note: 'Nồng độ cao ức chế cả ba cơ quan. Rễ nhạy với auxin hơn thân hàng nghìn lần nên auxin dồn xuống mặt dưới rễ nằm ngang ức chế phía đó, làm rễ uốn xuống.',
    },
  },

  BIO_HUMAN_REPRODUCTION: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Chu kì kinh nguyệt và điều hòa bằng hormone',
    question: 'Hormone nào tăng vọt gây rụng trứng, và hormone nào duy trì niêm mạc tử cung sau rụng trứng? Vì sao nếu không có thụ tinh thì kinh nguyệt xảy ra?',
    keywords: /chu k[yi] kinh nguyet|kinh nguyet|rung trung|hormone sinh duc|\bfsh\b|\blh\b|estrogen|progesterone|sinh tinh|sinh trung|tranh thai|thu tinh o nguoi/,
    examples: ['chu kì kinh nguyệt', 'rụng trứng', 'hormone FSH LH', 'estrogen và progesterone', 'sinh tinh sinh trứng'],
    data: {
      xLabel: 'ngày của chu kì',
      yLabel: 'nồng độ hormone tương đối',
      xRange: (p: P) => [0, p.len],
      yRange: [0, 1.4],
      params: [{key: 'len', label: 'Độ dài chu kì', unit: 'ngày', min: 24, max: 35, step: 1, value: 28}],
      curves: [
        {id: 'fsh', label: 'FSH', color: '#2563EB', fn: (x, p) => fsh(x, p.len)},
        {id: 'lh', label: 'LH', color: '#EA580C', fn: (x, p) => lh(x, p.len)},
        {id: 'est', label: 'Estrogen', color: '#DB2777', fn: (x, p) => estrogen(x, p.len)},
        {id: 'pro', label: 'Progesterone', color: '#16A34A', fn: (x, p) => progesterone(x, p.len)},
      ],
      readouts: [
        {label: 'Ngày rụng trứng (đỉnh LH) = độ dài chu kì − 14', value: (p: P) => `ngày ${ovulationDay(p.len)}`},
        {label: 'Pha nang · pha hoàng thể', value: (p: P) => `ngày 1–${ovulationDay(p.len) - 1} · ngày ${ovulationDay(p.len) + 1}–${p.len} (luôn khoảng 14 ngày)`},
        {label: 'Sự kiện', value: () => 'LH tăng vọt → rụng trứng; progesterone duy trì niêm mạc; nếu không thụ tinh hoàng thể thoái hóa, hormone giảm, niêm mạc bong (kinh nguyệt)'},
      ],
      note: 'Estrogen tăng làm dày niêm mạc và gây phản hồi dương lên LH; sau rụng trứng progesterone cao ức chế FSH và LH (điều hòa ngược âm).',
    },
  },

  BIO_MICROBE_LAB: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Sinh trưởng của quần thể vi khuẩn: bốn pha',
    question: 'Quần thể vi khuẩn trải qua những pha nào trong môi trường nuôi cấy không liên tục và vì sao pha lũy thừa dừng lại? Thời gian thế hệ ngắn có ý nghĩa gì?',
    keywords: /sinh truong cua vi khuan|pha tiem phat|pha luy thua|nuoi cay vi sinh vat|thoi gian the he|kich thuoc quan the vi sinh vat|nhuom gram|khang sinh do/,
    examples: ['sinh trưởng của vi khuẩn', 'pha tiềm phát pha lũy thừa', 'nuôi cấy vi sinh vật', 'thời gian thế hệ'],
    data: {
      xLabel: 'thời gian nuôi cấy (giờ)',
      yLabel: 'lg số tế bào / mL',
      xRange: [0, 48],
      yRange: [3, 11],
      params: [
        {key: 'lag', label: 'Thời gian tiềm phát', unit: 'giờ', min: 0, max: 8, step: 0.5, value: 2},
        {key: 'gen', label: 'Thời gian thế hệ', unit: 'giờ', min: 0.3, max: 3, step: 0.1, value: 0.5},
        {key: 'logK', label: 'Sức chứa tối đa (lg)', min: 8, max: 10, step: 0.1, value: 9},
        {key: 'td', label: 'Bắt đầu suy vong', unit: 'giờ', min: 20, max: 44, step: 1, value: 30},
      ],
      curves: [{id: 'n', label: 'lg N(t)', color: '#2563EB', fn: (t, p) => bacterialLog(t, p.lag, p.gen, p.logK, p.td)}],
      readouts: [
        {label: 'Số lần phân chia trong pha lũy thừa (từ 10⁴ đến sức chứa)', value: (p: P) => f1((p.logK - 4) / Math.log10(2))},
        {label: 'Pha tại giờ thứ 12', value: (p: P) => phaseOfGrowth(12, p.lag, p.gen, p.logK, p.td)},
        {label: 'Số tế bào sau 12 giờ', value: (p: P) => `10^${f1(bacterialLog(12, p.lag, p.gen, p.logK, p.td))} tế bào/mL`},
      ],
      note: 'Pha tiềm phát: thích nghi. Pha lũy thừa: phân chia với tốc độ tối đa N = N₀·2ⁿ. Pha cân bằng: số sinh ra bằng số chết do cạn dinh dưỡng và tích lũy chất độc. Pha suy vong: số chết vượt số sinh.',
    },
  },

  BIO_MINERAL_NUTRITION: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Dinh dưỡng khoáng: thiếu, đủ và thừa phân bón',
    question: 'Vì sao bón quá nhiều phân bón lại làm giảm năng suất, và vì sao cây thiếu khoáng sinh trưởng kém? Vùng nồng độ nào là thích hợp?',
    keywords: /dinh duong khoang|nguyen to khoang|thieu khoang|lieu luong phan bon|phan bon|nguyen to dai luong|nguyen to vi luong|trieu chung thieu/,
    examples: ['dinh dưỡng khoáng', 'liều lượng phân bón', 'triệu chứng thiếu khoáng', 'nguyên tố đại lượng và vi lượng'],
    data: {
      xLabel: 'liều phân bón (kg/ha)',
      yLabel: 'năng suất tương đối (%)',
      xRange: [0, 300],
      yRange: [0, 110],
      params: [
        {key: 'km', label: 'Nhu cầu: liều cho nửa năng suất', unit: 'kg/ha', min: 5, max: 100, step: 5, value: 30},
        {key: 'kt', label: 'Ngưỡng gây độc', unit: 'kg/ha', min: 80, max: 300, step: 10, value: 200},
      ],
      curves: [
        {id: 'y', label: 'Cây đang xét', color: '#16A34A', fn: (x, p) => yieldResponse(x, p.km, p.kt)},
        {id: 'ref', label: 'Cây khác (nhu cầu thấp)', color: '#A8A29E', dashed: true, fn: (x) => yieldResponse(x, 10, 120)},
      ],
      readouts: [
        {label: 'Liều tối ưu (năng suất cao nhất)', value: (p: P) => {
          let best = 0;
          let bx = 0;
          for (let x = 0; x <= 300; x += 1) if (yieldResponse(x, p.km, p.kt) > best) [best, bx] = [yieldResponse(x, p.km, p.kt), x];
          return `${f1(bx)} kg/ha (đạt ${f1(best)} %)`;
        }},
        {label: 'Vùng', value: () => 'thiếu: năng suất tăng nhanh theo liều; đủ: gần cực đại; thừa: độc, năng suất giảm, gây ô nhiễm'},
      ],
      note: 'Nguyên tố đại lượng (N, P, K, Ca, Mg, S) cần nhiều; vi lượng (Fe, Mn, B, Zn, Cu, Mo) cần rất ít nhưng không thể thiếu. Bón đúng loại, đúng lượng, đúng lúc.',
    },
  },

  BIO_PLANT_RESPIRATION: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Hô hấp ở thực vật và các yếu tố ảnh hưởng',
    question: 'Vì sao hạt khô hô hấp rất yếu còn hạt đang nảy mầm hô hấp mạnh? Nhiệt độ ảnh hưởng đến cường độ hô hấp thế nào và đến mức nào thì giảm?',
    keywords: /ho hap o thuc vat|ho hap hieu khi o thuc vat|cuong do ho hap|bao quan nong san|hat nay mam|yeu to anh huong den ho hap|ho hap sang/,
    examples: ['hô hấp ở thực vật', 'cường độ hô hấp', 'bảo quản nông sản', 'hạt nảy mầm'],
    data: {
      xLabel: 'nhiệt độ (°C)',
      yLabel: 'cường độ hô hấp tương đối',
      xRange: [0, 50],
      yRange: [0, 260],
      params: [
        {key: 'q10', label: 'Hệ số nhiệt độ Q₁₀', min: 1.5, max: 3, step: 0.1, value: 2},
        {key: 'w', label: 'Độ ẩm của hạt (tỉ lệ)', min: 0.1, max: 1, step: 0.05, value: 1},
      ],
      curves: [
        {id: 'r', label: 'Hô hấp', color: '#EA580C', fn: (x, p) => respiration(x, p.q10, p.w)},
        {id: 'dry', label: 'Hạt khô (bảo quản)', color: '#A8A29E', dashed: true, fn: (x, p) => respiration(x, p.q10, 0.1)},
      ],
      readouts: [
        {label: 'Tăng từ 20 °C lên 30 °C', value: (p: P) => `gấp ${f2(respiration(30, p.q10, p.w) / respiration(20, p.q10, p.w))} lần`},
        {label: 'Nhiệt độ hô hấp mạnh nhất', value: (p: P) => {
          let best = 0;
          let bx = 0;
          for (let x = 0; x <= 50; x += 0.5) if (respiration(x, p.q10, p.w) > best) [best, bx] = [respiration(x, p.q10, p.w), x];
          return `${f1(bx)} °C`;
        }},
        {label: 'Bảo quản', value: () => 'giữ hạt khô, nhiệt độ thấp, giảm O₂ và tăng CO₂ để hô hấp yếu'},
      ],
      note: 'Hô hấp tăng theo nhiệt độ rồi giảm nhanh khi enzyme biến tính (khoảng 40–45 °C). Hạt khô có rất ít nước nên hô hấp yếu; hạt hút nước hô hấp tăng vọt.',
    },
  },

  BIO_ANIMAL_BEHAVIOR: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Học tập ở động vật: phản xạ có điều kiện của Pavlov',
    question: 'Làm sao một kích thích trung tính như tiếng chuông trở thành tín hiệu gây tiết nước bọt ở chó? Điều gì xảy ra khi ngừng củng cố bằng thức ăn?',
    keywords: /phan xa co dieu kien|phan xa khong dieu kien|pavlov|tap tinh cua dong vat|hoc tap o dong vat|in vet|pheromone|di cu cua dong vat|tap tinh bam sinh/,
    examples: ['phản xạ có điều kiện', 'thí nghiệm Pavlov', 'tập tính của động vật', 'học tập ở động vật', 'pheromone'],
    data: {
      xLabel: 'số lần ghép cặp chuông – thức ăn',
      yLabel: 'tỉ lệ chó tiết nước bọt khi chỉ có chuông (%)',
      xRange: [0, 40],
      yRange: [0, 105],
      params: [
        {key: 'alpha', label: 'Tốc độ học', min: 0.05, max: 0.4, step: 0.01, value: 0.18},
        {key: 'ext', label: 'Ngừng củng cố từ lần thứ', min: 10, max: 30, step: 1, value: 20},
      ],
      curves: [
        {id: 'resp', label: 'Phản ứng với chuông', color: '#2563EB', fn: (x, p) => conditioning(x, p.alpha, p.ext)},
        {id: 'reward', label: 'Mốc 90 %', color: '#A8A29E', dashed: true, fn: () => 90},
      ],
      readouts: [
        {label: 'Số lần ghép cặp để đạt 90 %', value: (p: P) => String(Math.ceil(Math.log(0.1) / -p.alpha))},
        {label: 'Phản ứng khi ngừng củng cố', value: () => 'giảm dần (tắt dần), nhưng có thể hồi phục khi lặp lại ghép cặp'},
      ],
      note: 'Phản xạ không điều kiện là bẩm sinh (thức ăn → tiết nước bọt). Phản xạ có điều kiện hình thành qua học tập, nhờ liên kết thần kinh mới giữa trung khu thính giác và trung khu tiết nước bọt.',
    },
  },

  BIO_REACTION_NORM: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Mức phản ứng của kiểu gene với nhiệt độ',
    question: 'Vì sao cùng một kiểu gene nhưng kiểu hình có thể khác nhau ở các môi trường khác nhau? Mức phản ứng rộng và hẹp khác nhau thế nào về khả năng thích nghi?',
    keywords: /muc phan ung|kieu hinh va moi truong|tho himalaya|thuong bien|anh huong cua moi truong len bieu hien gene|di truyen va moi truong/,
    examples: ['mức phản ứng', 'thỏ Himalaya', 'thường biến', 'kiểu hình và môi trường'],
    data: {
      xLabel: 'nhiệt độ môi trường (°C)',
      yLabel: 'mức biểu hiện kiểu hình (0–100)',
      xRange: [0, 40],
      yRange: [0, 105],
      params: [{key: 'tc', label: 'Nhiệt độ chuyển màu lông (thỏ Himalaya)', unit: '°C', min: 15, max: 30, step: 1, value: 25}],
      curves: [
        {id: 'him', label: 'Thỏ Himalaya (độ đậm lông)', color: '#1C1917', fn: (x, p) => norm.himalaya(x, p.tc)},
        {id: 'wide', label: 'Kiểu gene có mức phản ứng rộng', color: '#16A34A', fn: (x) => norm.wide(x)},
        {id: 'narrow', label: 'Kiểu gene có mức phản ứng hẹp', color: '#2563EB', fn: (x) => norm.narrow(x)},
      ],
      readouts: [
        {label: 'Lông thỏ ở 10 °C · 35 °C', value: (p: P) => `đậm ${f1(norm.himalaya(10, p.tc))} · ${f1(norm.himalaya(35, p.tc))}`},
        {label: 'Kết luận', value: () => 'kiểu hình = kiểu gene + môi trường; kiểu gene quy định mức phản ứng (khoảng biến thiên của kiểu hình)'},
      ],
      note: 'Thỏ Himalaya có enzyme tạo sắc tố chỉ hoạt động ở nhiệt độ thấp nên tai, mõm, chân, đuôi sẫm màu. Thường biến không di truyền được vì kiểu gene không đổi.',
    },
  },
};
