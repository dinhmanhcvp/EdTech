import type {P, PresetSpec, ProcessItem, S, TableCell} from './types';
import {AA_CLASS, AA_FULL, AA_NAME, CODONS} from './sinhData';

const box = (id: string, x: number, y: number, w: number, h: number, fill: string, label: string, from: number, frames?: ProcessItem['frames']): ProcessItem => ({id, kind: 'rect', w, h, fill, stroke: '#44403C', label, frames: frames ?? [{at: from, x, y}]});
const txt = (id: string, label: string, frames: ProcessItem['frames'], fill = '#1C1917'): ProcessItem => ({id, kind: 'text', fill, label, frames});

// ------------------------------------------------------------------ lai và di truyền (xuất để kiểm thử)
/** Tần số kiểu hình sau phép lai phân tích dị hợp tử đều AB/ab × ab/ab: liên kết hoàn toàn khi f = 0, hoán vị gene tần số f. */
export const testcrossFreq = (f: number): [number, number, number, number] => [(1 - f) / 2, (1 - f) / 2, f / 2, f / 2];
export const MENDEL_THEORY: Record<string, {labels: string[]; probs: (f: number) => number[]; name: string; draw: (rng: () => number, f: number) => number}> = {
  incomplete: {name: 'Trội không hoàn toàn Aa × Aa', labels: ['Đỏ (AA)', 'Hồng (Aa)', 'Trắng (aa)'], probs: () => [0.25, 0.5, 0.25], draw: (r) => {
    const x = r() < 0.5 ? 1 : 0;
    const y = r() < 0.5 ? 1 : 0;
    return x + y === 2 ? 0 : x + y === 1 ? 1 : 2;
  }},
  codominance: {name: 'Đồng trội IᴬIᴮ × ii (nhóm máu)', labels: ['Nhóm máu A', 'Nhóm máu B'], probs: () => [0.5, 0.5], draw: (r) => (r() < 0.5 ? 0 : 1)},
  abo: {name: 'Nhóm máu IᴬIᴮ × IᴬIᴮ (AB × AB)', labels: ['Nhóm A', 'Nhóm AB', 'Nhóm B'], probs: () => [0.25, 0.5, 0.25], draw: (r) => {
    const x = r() < 0.5 ? 1 : 0;
    const y = r() < 0.5 ? 1 : 0;
    return x + y === 2 ? 0 : x + y === 1 ? 1 : 2;
  }},
  dihybrid: {name: 'Phân li độc lập AaBb × AaBb', labels: ['Trội–Trội (A-B-)', 'Trội–lặn (A-bb)', 'lặn–Trội (aaB-)', 'lặn–lặn (aabb)'], probs: () => [9 / 16, 3 / 16, 3 / 16, 1 / 16], draw: (r) => {
    const a = r() < 0.75;
    const b = r() < 0.75;
    return a && b ? 0 : a ? 1 : b ? 2 : 3;
  }},
  linked: {name: 'Hoán vị f: AB/ab × ab/ab', labels: ['AB (kiểu hình bố mẹ)', 'ab (kiểu hình bố mẹ)', 'Ab (tái tổ hợp)', 'aB (tái tổ hợp)'], probs: (f) => testcrossFreq(f), draw: (r, f) => {
    const u = r();
    const p = testcrossFreq(f);
    return u < p[0] ? 0 : u < p[0] + p[1] ? 1 : u < p[0] + p[1] + p[2] ? 2 : 3;
  }},
  xlinked: {name: 'Liên kết X: XᴬXᵃ × XᴬY', labels: ['Con gái bình thường', 'Con trai bình thường', 'Con trai mắc bệnh'], probs: () => [0.5, 0.25, 0.25], draw: (r) => {
    const u = r();
    return u < 0.5 ? 0 : u < 0.75 ? 1 : 2;
  }},
};
const MENDEL_COLORS = ['#EF4444', '#FB923C', '#FACC15', '#22C55E'];

/** Di truyền tế bào chất: kiểu hình con luôn theo mẹ (Correns). */
export const cytoplasmic = (mother: 'green' | 'variegated' | 'white', r: () => number): 'green' | 'variegated' | 'white' => {
  void r;
  return mother;
};

// ------------------------------------------------------------------ cytochrome C và sinh học tiến hóa
const CYTC: [string, string, number, string][] = [
  ['Người', 'Homo sapiens', 0, 'vượn người'],
  ['Tinh tinh', 'Pan troglodytes', 0, 'vượn người'],
  ['Khỉ Rhesus', 'Macaca mulatta', 1, 'khỉ'],
  ['Chó', 'Canis lupus', 10, 'thú'],
  ['Ngựa', 'Equus caballus', 12, 'thú'],
  ['Gà', 'Gallus gallus', 13, 'chim'],
  ['Rùa', 'Chrysemys', 15, 'bò sát'],
  ['Ếch', 'Rana', 18, 'lưỡng cư'],
  ['Cá ngừ', 'Thunnus', 21, 'cá'],
  ['Ruồi giấm', 'Drosophila', 25, 'côn trùng'],
  ['Nấm men', 'Saccharomyces', 44, 'nấm'],
];

export const SINH2_MISC_PRESETS: Record<string, PresetSpec> = {
  BIO_METABOLISM_PATHWAYS: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Đường phân và lên men',
    question: 'Khi không có O₂, tế bào tái tạo NAD⁺ để đường phân tiếp tục bằng cách nào? Vì sao lên men chỉ thu được rất ít ATP so với hô hấp hiếu khí?',
    keywords: /duong phan|len men|lactic|len men ruou|hieu qua nang luong cua len men|pyruvate|glycolysis/,
    examples: ['đường phân', 'lên men', 'lên men lactic', 'lên men rượu', 'pyruvate'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Glucose đi vào', body: 'Một phân tử glucose (6 C) vào tế bào chất. Hai ATP được dùng để hoạt hóa (phosphoryl hóa) glucose.'},
        {title: 'Đường phân', body: 'Glucose 6C được tách thành 2 pyruvate (3 C); tạo 4 ATP (thu thuần 2 ATP) và 2 NADH.'},
        {title: 'Không có O₂: NADH phải bị oxi hóa trở lại', body: 'Để đường phân tiếp tục cần tái tạo NAD⁺. Pyruvate (hoặc dẫn xuất) nhận electron từ NADH.'},
        {title: 'Lên men lactic', body: 'Pyruvate + NADH → lactate + NAD⁺ (vi khuẩn lactic, tế bào cơ khi thiếu O₂). Làm sữa chua, muối chua.'},
        {title: 'Lên men rượu', body: 'Pyruvate → acetaldehyde + CO₂, rồi acetaldehyde + NADH → ethanol + NAD⁺ (nấm men). Làm rượu, bia, bột nở bánh mì.'},
      ],
      items: [
        box('glu', 40, 100, 100, 60, '#FDE68A', 'Glucose (6C)', 0, [{at: 0, x: 40, y: 100}, {at: 1, x: 40, y: 100, o: 0.25}]),
        txt('atp', '2 ATP dùng · 4 ATP tạo', [{at: 1, x: 90, y: 60}], '#B45309'),
        box('pyr1', 210, 70, 100, 44, '#BBF7D0', 'Pyruvate', 1),
        box('pyr2', 210, 130, 100, 44, '#BBF7D0', 'Pyruvate', 1),
        txt('nadh', '2 NADH', [{at: 1, x: 260, y: 200}, {at: 2, x: 260, y: 200, label: 'NADH → NAD⁺'}], '#6D28D9'),
        box('lac', 420, 70, 150, 44, '#FBCFE8', 'Lactate (lactic)', 3),
        box('eth', 420, 160, 150, 44, '#DDD6FE', 'Ethanol + CO₂ (rượu)', 4),
        txt('net', 'thu thuần 2 ATP', [{at: 2, x: 480, y: 250}], '#166534'),
      ],
      note: 'Hiệu suất năng lượng: lên men thu 2 ATP/glucose, hô hấp hiếu khí thu khoảng 30–32 ATP/glucose. Lên men không cần O₂ và diễn ra ở tế bào chất.',
    },
  },

  BIO_ANIMAL_DEVELOPMENT: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Biến thái hoàn toàn và không hoàn toàn ở côn trùng',
    question: 'Biến thái hoàn toàn khác biến thái không hoàn toàn ở điểm nào? Hormone nào điều khiển lột xác và biến thái?',
    keywords: /bien thai|lot xac|sinh truong va phat trien o dong vat|ecdysone|hormone juvenile|nhong|au trung|sau non/,
    examples: ['biến thái', 'biến thái hoàn toàn', 'lột xác', 'sinh trưởng và phát triển ở động vật'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Trứng', body: 'Trứng được đẻ vào môi trường thích hợp (bướm đẻ trên lá cây thức ăn của sâu).'},
        {title: 'Ấu trùng (sâu)', body: 'Ăn rất nhiều, lột xác nhiều lần; hình dạng và lối sống khác hẳn con trưởng thành. Hormone juvenile (JH) giữ trạng thái ấu trùng.'},
        {title: 'Nhộng', body: 'Ngừng ăn, cơ thể cải tổ hoàn toàn bên trong kén. Ở biến thái không hoàn toàn (châu chấu, gián) không có giai đoạn nhộng.'},
        {title: 'Con trưởng thành', body: 'Khi JH giảm và ecdysone tăng, nhộng hóa thành bướm có cánh, sinh sản.'},
      ],
      items: [
        box('egg', 40, 100, 100, 60, '#FEF9C3', 'Trứng', 0),
        txt('a1', '→', [{at: 1, x: 160, y: 130}]),
        box('larva', 180, 90, 120, 80, '#BEF264', 'Ấu trùng (sâu)', 1),
        txt('a2', '→', [{at: 2, x: 320, y: 130}]),
        box('pupa', 340, 100, 100, 60, '#D6D3D1', 'Nhộng', 2),
        txt('a3', '→', [{at: 3, x: 460, y: 130}]),
        box('adult', 480, 90, 120, 80, '#F9A8D4', 'Con trưởng thành', 3),
        txt('hormone', 'JH cao → ấu trùng', [{at: 1, x: 240, y: 220, label: 'JH cao, ecdysone → lột xác'}, {at: 2, x: 390, y: 220, label: 'JH giảm → nhộng'}, {at: 3, x: 540, y: 220, label: 'JH rất thấp → trưởng thành'}], '#9A3412'),
      ],
      note: 'Biến thái không hoàn toàn: trứng → ấu trùng giống con trưởng thành nhưng nhỏ hơn → trưởng thành, ấu trùng lột xác dần dần. Ứng dụng: dùng hormone điều khiển nuôi tằm, diệt côn trùng gây hại.',
    },
  },

  BIO_ORIGIN_OF_LIFE: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Nguồn gốc sự sống: Miller–Urey, tế bào nguyên thủy và nội cộng sinh',
    question: 'Thí nghiệm của Miller chứng minh điều gì về sự hình thành chất hữu cơ trên Trái Đất nguyên thủy? Ti thể và lục lạp có nguồn gốc từ đâu theo thuyết nội cộng sinh?',
    keywords: /nguon goc su song|thi nghiem miller|miller ?-? ?urey|tien hoa hoa hoc|noi cong sinh|te bao so khai|protocell|nien bieu dia chat|phat sinh loai nguoi/,
    examples: ['nguồn gốc sự sống', 'thí nghiệm Miller', 'tiến hóa hóa học', 'thuyết nội cộng sinh', 'niên biểu địa chất'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Khí quyển nguyên thủy', body: 'Khí quyển giàu CH₄, NH₃, H₂, hơi nước, ít O₂; năng lượng từ tia lửa điện, tia cực tím, núi lửa.'},
        {title: 'Miller–Urey (1953)', body: 'Mô phỏng khí quyển trong bình kín có tia lửa điện: tạo ra amino acid và các hợp chất hữu cơ đơn giản từ chất vô cơ.'},
        {title: 'Đại phân tử và tế bào sơ khai', body: 'Monomer trùng hợp thành protein, RNA (RNA vừa mang thông tin vừa xúc tác); các giọt có màng lipid bao tạo tế bào sơ khai.'},
        {title: 'Tế bào nhân sơ đầu tiên', body: 'Khoảng 3,5 tỉ năm trước; tế bào quang hợp làm tăng O₂ trong khí quyển, mở đường cho sinh vật hiếu khí.'},
        {title: 'Nội cộng sinh', body: 'Tế bào nhân sơ lớn nuốt vi khuẩn hiếu khí (thành ti thể) và vi khuẩn lam (thành lục lạp), sống cộng sinh lâu dài tạo tế bào nhân thực (khoảng 2 tỉ năm trước).'},
      ],
      items: [
        box('atm', 30, 40, 160, 70, '#E0F2FE', 'CH₄ NH₃ H₂ H₂O', 0, [{at: 0, x: 30, y: 40}, {at: 2, x: 30, y: 40, o: 0.3}]),
        box('spark', 230, 40, 150, 70, '#FEF08A', 'tia lửa điện', 1),
        box('aa', 420, 40, 170, 70, '#BBF7D0', 'amino acid, đường, base', 1),
        box('poly', 130, 150, 190, 70, '#FDBA74', 'protein, RNA', 2),
        box('proto', 350, 150, 200, 70, '#FBCFE8', 'tế bào sơ khai (màng lipid)', 2),
        txt('cyan', 'quang hợp → O₂', [{at: 3, x: 320, y: 255}], '#166534'),
        txt('endo', 'nội cộng sinh → ti thể, lục lạp', [{at: 4, x: 320, y: 255}], '#9A3412'),
      ],
      note: 'Bằng chứng nội cộng sinh: ti thể và lục lạp có màng kép, DNA vòng riêng, ribosome 70S giống vi khuẩn và tự nhân đôi. Loài người (Homo sapiens) xuất hiện cách đây khoảng 300 000 năm.',
    },
  },

  BIO_SUCCESSION_CYCLES: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Chu trình nitrogen và diễn thế sinh thái',
    question: 'Nitrogen trong khí quyển được cây hấp thụ nhờ những quá trình nào và trở lại khí quyển ra sao? Vì sao diễn thế nguyên sinh bắt đầu từ môi trường chưa có sinh vật?',
    keywords: /chu trinh nito|chu trinh nitrogen|co dinh dam|nitrate? hoa|phan nitrate? hoa|chu trinh sinh dia hoa|dien the sinh thai|dien the nguyen sinh|phu duong/,
    examples: ['chu trình nitrogen', 'cố định đạm', 'nitrate hóa', 'diễn thế sinh thái', 'phú dưỡng'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'N₂ trong khí quyển', body: 'Chiếm khoảng 78 % khí quyển nhưng thực vật không hấp thụ trực tiếp được.'},
        {title: 'Cố định đạm', body: 'Vi khuẩn cố định đạm (Rhizobium cộng sinh ở rễ cây họ Đậu, Azotobacter sống tự do) và sấm sét chuyển N₂ thành NH₄⁺.'},
        {title: 'Nitrate hóa', body: 'Nitrosomonas chuyển NH₄⁺ thành NO₂⁻, rồi Nitrobacter chuyển NO₂⁻ thành NO₃⁻; cây hấp thụ NO₃⁻ và NH₄⁺ tạo protein.'},
        {title: 'Amon hóa', body: 'Xác sinh vật và chất thải bị vi sinh vật phân giải, giải phóng NH₄⁺ trở lại đất.'},
        {title: 'Phản nitrate hóa', body: 'Vi khuẩn kị khí chuyển NO₃⁻ thành N₂ trả về khí quyển, khép kín chu trình.'},
      ],
      items: [
        box('atm', 220, 20, 200, 50, '#E0F2FE', 'N₂ khí quyển', 0),
        box('fix', 40, 120, 160, 50, '#FDE68A', 'Cố định đạm → NH₄⁺', 1),
        box('nit', 240, 120, 160, 50, '#BBF7D0', 'Nitrate hóa → NO₃⁻', 2),
        box('plant', 440, 120, 160, 50, '#86EFAC', 'Thực vật, động vật', 2),
        box('amm', 240, 210, 160, 50, '#FDBA74', 'Amon hóa (xác, chất thải)', 3),
        box('den', 440, 210, 160, 50, '#FCA5A5', 'Phản nitrate hóa → N₂', 4),
        txt('dien', 'Diễn thế → quần xã đỉnh cực', [{at: 4, x: 320, y: 290}], '#9A3412'),
      ],
      note: 'Diễn thế nguyên sinh: từ môi trường trống (đá trần) → địa y → rêu → cỏ → cây bụi → rừng (quần xã đỉnh cực). Phú dưỡng do dư N, P làm tảo nở hoa, thiếu O₂ khi tảo chết và bị phân hủy.',
    },
  },

  BIO_MENDEL_EXTENDED: {
    family: 'TRIAL_LAB',
    engine: 'BIOLOGY',
    title: 'Các quy luật di truyền mở rộng: trội không hoàn toàn, đồng trội, liên kết và hoán vị gene',
    question: 'Tỉ lệ kiểu hình thay đổi thế nào khi trội không hoàn toàn, khi hai gene liên kết, khi có hoán vị gene tần số f? Vì sao con trai mắc bệnh liên kết X lặn nhiều hơn?',
    keywords: /troi khong hoan toan|dong troi|lien ket gene|hoan vi gene|lien ket hoan toan|phan li doc lap|lai phan tich|quy luat di truyen|nhom mau abo/,
    examples: ['trội không hoàn toàn', 'đồng trội', 'liên kết gene và hoán vị gene', 'phân li độc lập', 'nhóm máu ABO'],
    data: {
      choices: [{key: 'cross', label: 'Phép lai', value: 'dihybrid', options: Object.entries(MENDEL_THEORY).map(([k, v]) => [k, v.name] as [string, string])}],
      sliders: [{key: 'f', label: 'Tần số hoán vị gene f (phép lai liên kết)', min: 0, max: 0.5, step: 0.01, value: 0.2}],
      outcomes: (_p: P, s: S) => (MENDEL_THEORY[s.cross] ?? MENDEL_THEORY.dihybrid).labels.map((label, i) => ({label, color: MENDEL_COLORS[i % 4]})),
      theory: (p: P, s: S) => (MENDEL_THEORY[s.cross] ?? MENDEL_THEORY.dihybrid).probs(p.f),
      trial: (rng, p, s) => (MENDEL_THEORY[s.cross] ?? MENDEL_THEORY.dihybrid).draw(rng, p.f),
      unit: 'cá thể',
      note: 'Phân li độc lập: 9:3:3:1. Liên kết hoàn toàn cho tỉ lệ như một cặp gene (1:1 ở lai phân tích). Hoán vị với tần số f tạo giao tử tái tổ hợp mỗi loại f/2, giao tử liên kết mỗi loại (1 − f)/2.',
    },
  },

  BIO_CYTOPLASMIC_INHERITANCE: {
    family: 'TRIAL_LAB',
    engine: 'BIOLOGY',
    title: 'Di truyền tế bào chất (thí nghiệm của Correns)',
    question: 'Vì sao kiểu hình của con luôn giống mẹ khi gene nằm ở lục lạp hay ti thể? Phép lai thuận và lai nghịch cho kết quả khác nhau nói lên điều gì?',
    keywords: /di truyen te bao chat|di truyen ngoai nhan|correns|di truyen theo me|gene ngoai nhan|gene o luc lap|gene o ti the|lai thuan nghich/,
    examples: ['di truyền tế bào chất', 'thí nghiệm của Correns', 'di truyền theo mẹ', 'gene ngoài nhân', 'lai thuận nghịch'],
    data: {
      choices: [{key: 'mother', label: 'Cây làm mẹ (cho trứng)', value: 'variegated', options: [['green', 'Lá xanh'], ['variegated', 'Lá đốm'], ['white', 'Lá trắng']]}],
      outcomes: () => [{label: 'Con lá xanh', color: '#22C55E'}, {label: 'Con lá đốm', color: '#A3E635'}, {label: 'Con lá trắng', color: '#E7E5E4'}],
      theory: (_p: P, s: S) => (s.mother === 'green' ? [1, 0, 0] : s.mother === 'white' ? [0, 0, 1] : [0, 1, 0]),
      trial: (rng, _p, s) => {
        const m = cytoplasmic(s.mother as 'green' | 'variegated' | 'white', rng);
        return m === 'green' ? 0 : m === 'variegated' ? 1 : 2;
      },
      unit: 'hạt',
      note: 'Hợp tử nhận gần như toàn bộ tế bào chất (ti thể, lục lạp) từ trứng của mẹ nên con luôn mang kiểu hình của mẹ, không phụ thuộc cây bố; kết quả lai thuận và lai nghịch khác nhau.',
    },
  },

  BIO_GENETIC_CODE_TABLE: {
    family: 'TABLE_LAB',
    engine: 'BIOLOGY',
    title: 'Bảng mã di truyền (64 codon)',
    question: 'Vì sao nhiều codon cùng mã hóa một amino acid (tính thoái hóa) mà mỗi codon chỉ mã hóa một amino acid (tính đặc hiệu)? Codon nào mở đầu và codon nào kết thúc dịch mã?',
    keywords: /bang ma di truyen|tinh thoai hoa cua ma di truyen|ma bo ba|codon mo dau|ma ket thuc/,
    examples: ['bảng mã di truyền', 'tính thoái hóa của mã di truyền', 'codon mở đầu', 'mã kết thúc'],
    data: {
      cols: 4,
      rows: 16,
      dense: true,
      groups: [
        {id: 'nonpolar', label: 'Amino acid không phân cực', color: '#FDE68A'},
        {id: 'polar', label: 'Phân cực không tích điện', color: '#BBF7D0'},
        {id: 'acidic', label: 'Acid (tích điện âm)', color: '#FCA5A5'},
        {id: 'basic', label: 'Base (tích điện dương)', color: '#BFDBFE'},
        {id: 'stop', label: 'Mã kết thúc', color: '#D6D3D1'},
      ],
      propDefs: [
        {key: 'aa', label: 'Amino acid'},
        {key: 'cls', label: 'Tính chất'},
      ],
      cells: CODONS.map((c, i): TableCell => ({
        id: c.codon,
        label: c.codon,
        sub: AA_NAME[c.aa],
        row: Math.floor(i / 4),
        col: i % 4,
        group: AA_CLASS[c.aa],
        title: `${c.codon} → ${AA_NAME[c.aa]} (${AA_FULL[c.aa]})`,
        body: c.codon === 'AUG' ? 'Codon mở đầu, mã hóa methionine.' : c.aa === '*' ? 'Mã kết thúc, không mã hóa amino acid.' : undefined,
        props: {aa: AA_NAME[c.aa], cls: AA_CLASS[c.aa]},
      })),
      note: 'Mỗi dòng ba ô cuối là các codon cùng hai nucleotide đầu. 61 codon mã hóa 20 amino acid (thoái hóa), 3 codon kết thúc (UAA, UAG, UGA), AUG vừa mở đầu vừa mã hóa Met.',
    },
  },

  BIO_EVIDENCE_PHYLOGENY: {
    family: 'TABLE_LAB',
    engine: 'BIOLOGY',
    title: 'Bằng chứng phân tử: cytochrome C và quan hệ họ hàng',
    question: 'Số amino acid khác nhau trong cytochrome C của hai loài cho biết điều gì về mức độ gần gũi tiến hóa? Vì sao người gần tinh tinh hơn gần nấm men?',
    keywords: /cytochrome ?c|bang chung phan tu|quan he ho hang|cay phat sinh|bang chung tien hoa|hoa thach|dong ho phan tu|co quan tuong dong|co quan thoai hoa/,
    examples: ['cytochrome C', 'bằng chứng phân tử', 'quan hệ họ hàng giữa các loài', 'cây phát sinh chủng loại', 'cơ quan thoái hóa'],
    data: {
      cols: 4,
      rows: 3,
      groups: [
        {id: 'vuon', label: 'Vượn người / khỉ', color: '#FDE68A'},
        {id: 'thu', label: 'Thú', color: '#FDBA74'},
        {id: 'chim', label: 'Chim, bò sát, lưỡng cư', color: '#BBF7D0'},
        {id: 'khac', label: 'Cá, côn trùng, nấm', color: '#BFDBFE'},
      ],
      propDefs: [
        {key: 'diff', label: 'Số amino acid khác người', numeric: true},
        {key: 'sci', label: 'Tên khoa học'},
        {key: 'cls', label: 'Nhóm'},
      ],
      cells: CYTC.map(([name, sci, diff, cls], i): TableCell => ({
        id: `s${i}`,
        label: name,
        sub: `khác ${diff}`,
        row: Math.floor(i / 4),
        col: i % 4,
        group: ['vượn người', 'khỉ'].includes(cls) ? 'vuon' : cls === 'thú' ? 'thu' : ['chim', 'bò sát', 'lưỡng cư'].includes(cls) ? 'chim' : 'khac',
        title: `${name} (${sci}): khác ${diff} amino acid so với người`,
        body: diff === 0 ? 'Chuỗi cytochrome C (104 amino acid) giống hệt người.' : `Khác người ${diff}/104 amino acid; càng ít khác biệt càng gần nhau về tiến hóa.`,
        props: {diff, sci, cls},
      })),
      note: 'Cytochrome C là protein của chuỗi truyền electron có ở mọi sinh vật hiếu khí; số sai khác tăng theo thời gian tách khỏi tổ tiên chung (đồng hồ phân tử). Bằng chứng khác: hóa thạch, giải phẫu so sánh (cơ quan tương đồng, thoái hóa), phôi sinh học.',
    },
  },
};
