import type {P, PresetSpec} from './types';

const f1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});
const f2 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 2});
const R = 8.314;

// ------------------------------------------------------------------ enthalpy và năng lượng hoạt hóa
/** Năng lượng thế (kJ/mol) theo tọa độ phản ứng x ∈ [0, 1]: chất đầu 0, sản phẩm ΔH, đỉnh rào Ea. */
export function energyProfile(x: number, Ea: number, dH: number): number {
  const peak = Math.max(Ea, dH, 0.01);
  const s = 3 * x * x - 2 * x ** 3;
  const h = peak - dH / 2;
  return dH * s + h * Math.pow(4 * x * (1 - x), 2);
}
/** Hằng số tốc độ Arrhenius k = A·exp(−Ea/RT), A = 1e6 s⁻¹ (mô hình bậc một). */
export const arrhenius = (EakJ: number, T: number) => 1e6 * Math.exp((-EakJ * 1000) / (R * T));
/** log10 Q(t) tiến về log10 K theo hàm mũ: mô tả hệ chuyển dịch tới cân bằng. */
export const logQ = (t: number, logK: number, logQ0: number, tau = 3) => logK + (logQ0 - logK) * Math.exp(-t / tau);
/** pH của dung dịch acid yếu HA nồng độ C (mol/L), hằng số pKa (xấp xỉ ½(pKa − lg C), kẹp ≤ 7). */
export const weakAcidPH = (pKa: number, logC: number) => Math.min(7, 0.5 * (pKa - logC));
export const strongAcidPH = (logC: number) => -logC;
export const bufferPH = (pKa: number, ratio: number) => pKa + Math.log10(ratio);
/** Điện tích thực của amino acid không có nhóm R phân li, tại pH cho trước. */
export const aminoCharge = (pH: number, pKa1: number, pKa2: number) => 1 / (1 + Math.pow(10, pH - pKa1)) - 1 / (1 + Math.pow(10, pKa2 - pH));
export const isoelectric = (pKa1: number, pKa2: number) => (pKa1 + pKa2) / 2;

// ------------------------------------------------------------------ nhiệt độ sôi theo họ hợp chất
const BP: Record<string, number[]> = {
  alkane: [-162, -89, -42, -1, 36, 69, 98, 126, 151, 174],
  aldehyde: [-19, 20, 49, 75, 103, 131],
  alcohol: [65, 78, 97, 118, 138, 157, 176, 195],
  acid: [101, 118, 141, 164, 186, 205, 223, 239],
};
export function boilingPoint(family: keyof typeof BP, n: number): number {
  const a = BP[family];
  const i = n - 1;
  if (i < 0 || i > a.length - 1) return NaN;
  const lo = Math.floor(i);
  const hi = Math.min(a.length - 1, lo + 1);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}

export const HOA_CURVE_PRESETS: Record<string, PresetSpec> = {
  CHEM_ENERGETICS: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'Giản đồ năng lượng: enthalpy phản ứng và năng lượng hoạt hóa',
    question: 'Phản ứng tỏa nhiệt và thu nhiệt khác nhau thế nào trên giản đồ năng lượng? Chất xúc tác làm thay đổi đại lượng nào và không làm thay đổi đại lượng nào?',
    keywords: /gian do nang luong|enthalpy|bien thien enthalpy|phan ung toa nhiet|phan ung thu nhiet|nang luong hoat hoa|dinh luat hess|nhiet cua phan ung|nhiet luong ke/,
    examples: ['giản đồ năng lượng', 'biến thiên enthalpy', 'phản ứng tỏa nhiệt và thu nhiệt', 'năng lượng hoạt hóa'],
    data: {
      xLabel: 'tiến trình phản ứng',
      yLabel: 'năng lượng (kJ/mol)',
      xRange: [0, 1],
      yRange: [-150, 300],
      params: [
        {key: 'Ea', label: 'Năng lượng hoạt hóa Ea', unit: 'kJ/mol', min: 20, max: 250, step: 5, value: 120},
        {key: 'dH', label: 'Biến thiên enthalpy ΔH', unit: 'kJ/mol', min: -150, max: 150, step: 5, value: -90},
        {key: 'cat', label: 'Chất xúc tác giảm Ea đi', unit: 'kJ/mol', min: 0, max: 100, step: 5, value: 0},
      ],
      curves: [
        {id: 'plain', label: 'Không xúc tác', color: '#2563EB', fn: (x, p) => energyProfile(x, p.Ea, p.dH)},
        {id: 'cat', label: 'Có xúc tác', color: '#16A34A', dashed: true, fn: (x, p) => energyProfile(x, Math.max(p.Ea - p.cat, Math.max(p.dH, 0) + 1), p.dH)},
      ],
      readouts: [
        {label: 'Loại phản ứng', value: (p: P) => (p.dH < 0 ? 'tỏa nhiệt (ΔH < 0): sản phẩm bền hơn chất đầu' : p.dH > 0 ? 'thu nhiệt (ΔH > 0): sản phẩm kém bền hơn' : 'ΔH = 0')},
        {label: 'Ea thuận · Ea nghịch = Ea − ΔH', value: (p: P) => `${f1(p.Ea)} · ${f1(p.Ea - p.dH)} kJ/mol`},
        {label: 'Ea khi có xúc tác · ΔH', value: (p: P) => `${f1(Math.max(p.Ea - p.cat, Math.max(p.dH, 0) + 1))} kJ/mol · ΔH không đổi (${f1(p.dH)})`},
      ],
      note: 'Xúc tác chỉ hạ năng lượng hoạt hóa (phản ứng nhanh hơn) mà không thay đổi ΔH và không làm chuyển dịch cân bằng. ΔH = Σ Eb(chất đầu) − Σ Eb(sản phẩm).',
    },
  },

  CHEM_KINETICS: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'Tốc độ phản ứng: nhiệt độ, xúc tác và phương trình Arrhenius',
    question: 'Vì sao tăng nhiệt độ hoặc dùng xúc tác làm nồng độ chất đầu giảm nhanh hơn? Tăng 10 °C thì tốc độ thường tăng khoảng mấy lần?',
    keywords: /thuyet va cham|arrhenius|he so nhiet do|van'?t hoff|hang so toc do|chu ki ban huy cua phan ung/,
    examples: ['thuyết va chạm', 'hệ số nhiệt độ Van’t Hoff', 'hằng số tốc độ k', 'chu kì bán hủy của phản ứng'],
    data: {
      xLabel: 'thời gian t (s)',
      yLabel: 'nồng độ chất đầu (% so với ban đầu)',
      xRange: (p: P) => [0, 5 / arrhenius(p.Ea - p.cat, p.T)],
      yRange: [0, 105],
      params: [
        {key: 'T', label: 'Nhiệt độ', unit: 'K', min: 280, max: 400, step: 5, value: 300},
        {key: 'Ea', label: 'Năng lượng hoạt hóa', unit: 'kJ/mol', min: 30, max: 90, step: 2, value: 50},
        {key: 'cat', label: 'Xúc tác giảm Ea', unit: 'kJ/mol', min: 0, max: 20, step: 1, value: 0},
      ],
      curves: [
        {id: 'now', label: 'Điều kiện đang chọn', color: '#2563EB', fn: (t, p) => 100 * Math.exp(-arrhenius(p.Ea - p.cat, p.T) * t)},
        {id: 'ref', label: 'Chuẩn (300 K, Ea = 50, không xúc tác)', color: '#A8A29E', dashed: true, fn: (t, p) => 100 * Math.exp(-arrhenius(50, 300) * t)},
      ],
      readouts: [
        {label: 'Hằng số tốc độ k', value: (p: P) => `${arrhenius(p.Ea - p.cat, p.T).toExponential(2)} s⁻¹`},
        {label: 'Chu kì bán hủy t½ = ln2/k', value: (p: P) => `${f2(Math.LN2 / arrhenius(p.Ea - p.cat, p.T))} s`},
        {label: 'Nhanh gấp bao nhiêu lần so với chuẩn', value: (p: P) => `${f1(arrhenius(p.Ea - p.cat, p.T) / arrhenius(50, 300))} lần; tăng 10 K gấp ≈ ${f2(arrhenius(p.Ea, p.T + 10) / arrhenius(p.Ea, p.T))} lần`},
      ],
      note: 'k = A·e^(−Ea/RT): tăng T làm nhiều phân tử đạt năng lượng hoạt hóa; giảm Ea (xúc tác) cũng làm k tăng theo hàm mũ. Quy tắc van’t Hoff: tăng 10 °C tốc độ tăng 2–4 lần.',
    },
  },

  CHEM_EQUILIBRIUM_GENERAL: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'Cân bằng hóa học tổng quát: thương số phản ứng Q so với hằng số K',
    question: 'So sánh Q với K cho ta biết chiều dịch chuyển của phản ứng thế nào? Vì sao Q luôn tiến về K và dừng lại ở đó?',
    keywords: /hang so can bang|thuong so phan ung|kc cua phan ung|so sanh q va k|tong hop amoniac|haber/,
    examples: ['hằng số cân bằng', 'thương số phản ứng Q', 'quá trình Haber tổng hợp ammonia'],
    data: {
      xLabel: 'thời gian (đơn vị tùy ý)',
      yLabel: 'lg Q (đường xanh) và lg K (đường đứt)',
      xRange: [0, 15],
      yRange: [-3, 3],
      params: [
        {key: 'logK', label: 'lg K của phản ứng', min: -2, max: 2, step: 0.1, value: 1},
        {key: 'logQ0', label: 'lg Q lúc đầu', min: -2.5, max: 2.5, step: 0.1, value: -2},
      ],
      curves: [
        {id: 'q', label: 'lg Q(t)', color: '#2563EB', fn: (t, p) => logQ(t, p.logK, p.logQ0)},
        {id: 'k', label: 'lg K', color: '#E11D48', dashed: true, fn: (_t, p) => p.logK},
      ],
      readouts: [
        {label: 'K · Q ban đầu', value: (p: P) => `${f2(Math.pow(10, p.logK))} · ${f2(Math.pow(10, p.logQ0))}`},
        {label: 'Chiều phản ứng', value: (p: P) => (Math.abs(p.logQ0 - p.logK) < 0.05 ? 'đang ở trạng thái cân bằng (Q = K)' : p.logQ0 < p.logK ? 'Q < K: phản ứng diễn ra theo chiều thuận' : 'Q > K: phản ứng diễn ra theo chiều nghịch')},
        {label: 'Haber: N₂ + 3H₂ ⇌ 2NH₃', value: () => 'ΔH < 0: K giảm khi tăng nhiệt độ; tăng áp suất dịch chuyển về phía ít mol khí hơn (tạo NH₃)'},
      ],
      note: 'Q = [C]^c[D]^d / [A]^a[B]^b tính với nồng độ tại một thời điểm; K là giá trị Q ở trạng thái cân bằng, chỉ phụ thuộc nhiệt độ.',
    },
  },

  CHEM_ACID_BASE: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'pH của acid mạnh, acid yếu và dung dịch đệm',
    question: 'Vì sao pha loãng acid yếu làm pH tăng chậm hơn acid mạnh? Dung dịch đệm giữ pH ổn định nhờ cặp acid–base liên hợp như thế nào?',
    keywords: /thang ph\b|do ph\b|acid yeu|axit yeu|acid manh|dung dich dem|hang so phan li acid|\bpka\b|su dien li/,
    examples: ['thang pH', 'acid yếu', 'dung dịch đệm', 'hằng số phân li acid pKa'],
    data: {
      xLabel: 'lg C (nồng độ acid, mol/L)',
      yLabel: 'pH',
      xRange: [-6, 0],
      yRange: [0, 8],
      params: [
        {key: 'pKa', label: 'pKa của acid yếu', min: 2, max: 10, step: 0.1, value: 4.76},
        {key: 'ratio', label: 'Tỉ lệ [A⁻]/[HA] của dung dịch đệm', min: 0.1, max: 10, step: 0.1, value: 1},
      ],
      curves: [
        {id: 'strong', label: 'Acid mạnh (pH = −lg C)', color: '#E11D48', fn: (x) => strongAcidPH(x)},
        {id: 'weak', label: 'Acid yếu: pH ≈ ½(pKa − lg C)', color: '#2563EB', fn: (x, p) => weakAcidPH(p.pKa, x)},
        {id: 'buffer', label: 'Đệm: pH = pKa + lg([A⁻]/[HA])', color: '#16A34A', dashed: true, fn: (_x, p) => bufferPH(p.pKa, p.ratio)},
      ],
      readouts: [
        {label: 'pH acid yếu 0,1 M', value: (p: P) => f2(weakAcidPH(p.pKa, -1))},
        {label: 'pH dung dịch đệm', value: (p: P) => f2(bufferPH(p.pKa, p.ratio))},
        {label: 'Phần trăm phân li của acid yếu 0,1 M', value: (p: P) => `${f2((100 * Math.pow(10, -weakAcidPH(p.pKa, -1))) / 0.1)} %`},
      ],
      note: 'Đệm bền nhất khi [A⁻] ≈ [HA] (pH ≈ pKa). Thêm ít acid hoặc base mạnh vào dung dịch đệm làm pH thay đổi rất nhỏ. Với acid rất loãng nước cũng góp H⁺ nên pH không vượt 7.',
    },
  },

  CHEM_BOILING_POINTS: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'Nhiệt độ sôi của alkane, aldehyde, alcohol và acid carboxylic',
    question: 'Vì sao alcohol và acid carboxylic sôi cao hơn nhiều so với alkane có số nguyên tử C tương đương? Nhiệt độ sôi biến thiên thế nào khi tăng số nguyên tử carbon?',
    keywords: /nhiet do soi (?:cua )?(?:alkane|ancol|alcohol|acid|axit|hop chat huu co|cac chat)|lien ket hydrogen giua cac phan tu|so sanh nhiet do soi|day dong dang/,
    examples: ['nhiệt độ sôi của alcohol', 'so sánh nhiệt độ sôi', 'liên kết hydrogen giữa các phân tử'],
    data: {
      xLabel: 'số nguyên tử carbon n',
      yLabel: 'nhiệt độ sôi (°C)',
      xRange: [1, 8],
      yRange: [-180, 260],
      params: [],
      curves: [
        {id: 'alkane', label: 'Alkane CₙH₂ₙ₊₂', color: '#A8A29E', fn: (x) => boilingPoint('alkane', x)},
        {id: 'aldehyde', label: 'Aldehyde', color: '#EA580C', fn: (x) => boilingPoint('aldehyde', x)},
        {id: 'alcohol', label: 'Alcohol no, đơn chức', color: '#2563EB', fn: (x) => boilingPoint('alcohol', x)},
        {id: 'acid', label: 'Acid carboxylic', color: '#E11D48', fn: (x) => boilingPoint('acid', x)},
      ],
      readouts: [
        {label: 'Ở n = 3: alkane · aldehyde · alcohol · acid', value: () => `${boilingPoint('alkane', 3)} · ${boilingPoint('aldehyde', 3)} · ${boilingPoint('alcohol', 3)} · ${boilingPoint('acid', 3)} °C`},
        {label: 'Quy luật', value: () => 'acid > alcohol > aldehyde > alkane; trong mỗi dãy nhiệt độ sôi tăng theo n'},
      ],
      note: 'Alcohol và acid tạo liên kết hydrogen giữa các phân tử (acid còn tạo dạng dimer) nên cần nhiều năng lượng để tách phân tử; alkane chỉ có lực van der Waals yếu.',
    },
  },

  CHEM_AMINO_PROTEIN: {
    family: 'CURVE_LAB',
    engine: 'CHEMISTRY',
    title: 'Amino acid: điện tích theo pH và điểm đẳng điện',
    question: 'Amino acid mang điện tích gì ở pH thấp, pH cao và tại pH nào nó không di chuyển trong điện trường? Điều đó dùng để tách các amino acid như thế nào?',
    keywords: /amino acid|axit amin|diem dang dien|dien di|lien ket peptide|peptide\b|protein\b|ion luong cuc/,
    examples: ['amino acid', 'điểm đẳng điện', 'điện di amino acid', 'liên kết peptide', 'protein'],
    data: {
      xLabel: 'pH của dung dịch',
      yLabel: 'điện tích thực của amino acid',
      xRange: [0, 14],
      yRange: [-1.2, 1.2],
      params: [
        {key: 'pKa1', label: 'pKa₁ (nhóm –COOH)', min: 1.5, max: 3.5, step: 0.05, value: 2.34},
        {key: 'pKa2', label: 'pKa₂ (nhóm –NH₃⁺)', min: 8.5, max: 11, step: 0.05, value: 9.6},
        {key: 'pH', label: 'pH để xét hướng điện di', min: 0, max: 14, step: 0.1, value: 7},
      ],
      curves: [
        {id: 'q', label: 'Điện tích thực', color: '#2563EB', fn: (x, p) => aminoCharge(x, p.pKa1, p.pKa2)},
        {id: 'zero', label: 'Trung hòa điện', color: '#A8A29E', dashed: true, fn: () => 0},
      ],
      readouts: [
        {label: 'Điểm đẳng điện pI = (pKa₁ + pKa₂)/2', value: (p: P) => f2(isoelectric(p.pKa1, p.pKa2))},
        {label: 'Ở pH đã chọn điện tích thực', value: (p: P) => f2(aminoCharge(p.pH, p.pKa1, p.pKa2))},
        {label: 'Hướng điện di', value: (p: P) => (Math.abs(p.pH - isoelectric(p.pKa1, p.pKa2)) < 0.3 ? 'gần như không di chuyển (ion lưỡng cực)' : p.pH < isoelectric(p.pKa1, p.pKa2) ? 'về phía cực âm (mang điện dương)' : 'về phía cực dương (mang điện âm)')},
      ],
      note: 'Glycine: pKa₁ = 2,34; pKa₂ = 9,60 nên pI ≈ 5,97. Ở pI amino acid chủ yếu là ion lưỡng cực H₃N⁺–CH₂–COO⁻.',
    },
  },
};
