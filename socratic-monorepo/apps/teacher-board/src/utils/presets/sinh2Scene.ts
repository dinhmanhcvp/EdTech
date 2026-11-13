import type {P, PresetSpec, Shape} from './types';
import {C, arrow, box, dot, f1, f2, gauss, ln, poly, rad, ring, seeded, txt} from './sceneKit';
import {AA_CLASS, AA_NAME, classifyMutation, mutate, translate, transcribe, type MutationKind} from './sinhData';

// ------------------------------------------------------------------ công thức (xuất để kiểm thử)
/** Hình lập phương cạnh L: diện tích S = 6L², thể tích V = L³, tỉ lệ S/V = 6/L. */
export const surfaceToVolume = (L: number) => 6 / L;
export const energyAt = (e0: number, eff: number, level: number) => e0 * Math.pow(eff / 100, level);
/** DDT (hoặc chất độc bền) phóng đại ×10 mỗi bậc dinh dưỡng. */
export const bioAccumulation = (c0: number, level: number, factor = 10) => c0 * Math.pow(factor, level);

export interface Cross {
  geno: string;
  affected: number;
  son: number;
  daughter: number;
}
/** Xác suất con mắc bệnh theo kiểu di truyền và phép lai (1–4). */
export function offspring(mode: string, cross: string): Cross {
  if (mode === 'xr') {
    const table: Record<string, {m: string[]; f: string[]; geno: string}> = {
      c1: {m: ['A', 'a'], f: ['A'], geno: 'XᴬXᵃ × XᴬY'},
      c2: {m: ['A', 'a'], f: ['a'], geno: 'XᴬXᵃ × XᵃY'},
      c3: {m: ['A'], f: ['a'], geno: 'XᴬXᴬ × XᵃY'},
      c4: {m: ['a'], f: ['A'], geno: 'XᵃXᵃ × XᴬY'},
    };
    const t = table[cross] ?? table.c1;
    const son = t.m.filter((x) => x === 'a').length / t.m.length;
    const dau = (t.m.filter((x) => x === 'a').length / t.m.length) * (t.f.filter((x) => x === 'a').length / t.f.length);
    return {geno: t.geno, son, daughter: dau, affected: (son + dau) / 2};
  }
  const table: Record<string, {a: string[]; b: string[]; geno: string}> = {
    c1: {a: ['A', 'a'], b: ['A', 'a'], geno: 'Aa × Aa'},
    c2: {a: ['A', 'a'], b: ['a'], geno: 'Aa × aa'},
    c3: {a: ['A'], b: ['a'], geno: 'AA × aa'},
    c4: {a: ['a'], b: ['a'], geno: 'aa × aa'},
  };
  const t = table[cross] ?? table.c1;
  let aff = 0;
  let tot = 0;
  for (const x of t.a) for (const y of t.b) {
    tot++;
    const isAffected = mode === 'ar' ? x === 'a' && y === 'a' : x === 'A' || y === 'A';
    if (isAffected) aff++;
  }
  return {geno: t.geno, affected: aff / tot, son: aff / tot, daughter: aff / tot};
}

/** Wright–Fisher: dãy tần số allele qua các thế hệ (hạt giống cố định), có chọn lọc s và di nhập m. */
export function driftPath(N: number, p0: number, s: number, m: number, gens: number, seed: number): number[] {
  const rng = seeded(seed);
  const out = [p0];
  let p = p0;
  for (let g = 0; g < gens; g++) {
    const sel = (p * (1 + s)) / (1 + s * p);
    const mig = (1 - m) * sel + m * 0.5;
    const sd = Math.sqrt((mig * (1 - mig)) / N);
    p = Math.max(0, Math.min(1, Math.round(N * (mig + sd * gauss(rng))) / N));
    out.push(p);
  }
  return out;
}
export const expectedPath = (p0: number, s: number, m: number, gens: number): number[] => {
  const out = [p0];
  let p = p0;
  for (let g = 0; g < gens; g++) {
    const sel = (p * (1 + s)) / (1 + s * p);
    p = (1 - m) * sel + m * 0.5;
    out.push(p);
  }
  return out;
};

const CODON_W = 62;
const aaColor = (a: string) => ({nonpolar: '#FDE68A', polar: '#BBF7D0', acidic: '#FCA5A5', basic: '#BFDBFE', stop: '#D6D3D1'}[AA_CLASS[a] ?? 'stop']);

export const SINH2_SCENE_PRESETS: Record<string, PresetSpec> = {
  BIO_SCALE_CELL_TYPES: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Tế bào nhân sơ, nhân thực và tỉ lệ diện tích trên thể tích',
    question: 'Vì sao hầu hết tế bào đều rất nhỏ? Tế bào nhân sơ khác tế bào nhân thực ở những điểm nào về kích thước và cấu tạo?',
    keywords: /te bao nhan so|te bao nhan thuc|ti le dien tich tren the tich|ti le s\/v|cap do to chuc cua the gioi song|kinh hien vi/,
    examples: ['tế bào nhân sơ', 'tỉ lệ diện tích trên thể tích', 'cấp độ tổ chức của thế giới sống'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Nội dung', value: 'types', options: [['types', 'Nhân sơ và nhân thực'], ['sv', 'Tỉ lệ S/V']]}],
      sliders: [{key: 'L', label: 'Cạnh tế bào (hình lập phương)', unit: 'µm', min: 1, max: 20, step: 1, value: 5}],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'sv') {
          const sizes = [p.L, p.L * 2];
          sizes.forEach((L, i) => {
            const side = Math.min(160, L * 12);
            const x = 80 + i * 240;
            const y = 260 - side;
            out.push(box(x, y, side, side, i === 0 ? '#BFDBFE' : '#FDE68A', C.ink), txt(x + side / 2, 285, `L = ${f1(L)} µm`, {size: 12, bold: true}), txt(x + side / 2, y - 8, `S/V = ${f2(surfaceToVolume(L))}`, {size: 13, fill: C.red, bold: true}));
          });
          out.push(txt(280, 24, 'Tế bào lớn gấp đôi: S/V giảm một nửa', {size: 13}));
          return out;
        }
        // nhân sơ
        out.push({t: 'path', d: 'M50 150 a70 45 0 1 0 140 0 a70 45 0 1 0 -140 0 Z', fill: '#FEF3C7', stroke: '#A16207', w: 3});
        out.push({t: 'path', d: 'M90 140 q10 -18 22 0 t24 0 q-8 18 -22 6 t-24 -6 Z', fill: 'none', stroke: C.purple, w: 2.4}, ring(150, 168, 7, C.blue, 2), txt(120, 125, 'vùng nhân', {size: 10, fill: C.purple}), txt(150, 190, 'plasmid', {size: 10, fill: C.blue}));
        for (let i = 0; i < 8; i++) out.push(dot(75 + (i % 4) * 28, 160 + Math.floor(i / 4) * 16, 3, C.green));
        out.push(ln(52, 150, 20, 175, {stroke: C.ink, w: 2}), txt(120, 230, 'NHÂN SƠ 1–5 µm · chưa có màng nhân · 70S', {size: 11, bold: true}));
        // nhân thực
        out.push({t: 'circle', cx: 400, cy: 150, r: 85, fill: '#DCFCE7', stroke: '#15803D', w: 3}, {t: 'circle', cx: 400, cy: 140, r: 32, fill: '#E9D5FF', stroke: C.purple, w: 2.5}, txt(400, 144, 'nhân', {size: 11, fill: C.purple, bold: true}));
        [[350, 190], [440, 195], [445, 110], [360, 105]].forEach(([x, y], i) => out.push({t: 'path', d: `M${x - 14} ${y} a14 8 0 1 0 28 0 a14 8 0 1 0 -28 0 Z`, fill: i % 2 ? '#FCA5A5' : '#FDBA74', stroke: C.ink, w: 1.4}));
        out.push(txt(400, 255, 'NHÂN THỰC 10–100 µm · có màng nhân', {size: 11, bold: true}), txt(400, 275, 'ribosome 80S', {size: 10, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Diện tích · thể tích · S/V của cạnh L', value: (p) => `${f1(6 * p.L * p.L)} µm² · ${f1(p.L ** 3)} µm³ · ${f2(surfaceToVolume(p.L))} µm⁻¹`},
        {label: 'Khi L tăng gấp đôi', value: (p) => `S tăng 4 lần, V tăng 8 lần: S/V ${f2(surfaceToVolume(p.L))} → ${f2(surfaceToVolume(2 * p.L))}`},
        {label: 'Ý nghĩa', value: () => 'tế bào nhỏ có S/V lớn nên trao đổi chất với môi trường nhanh và hiệu quả'},
      ],
      note: 'Tế bào nhân sơ (vi khuẩn, vi khuẩn cổ) nhỏ hơn và chưa có nhân hoàn chỉnh; tế bào nhân thực (động vật, thực vật, nấm, nguyên sinh vật) có hệ thống màng và bào quan chuyên hóa.',
    },
  },

  BIO_BIOMOLECULES: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Các phân tử sinh học: nước, phospholipid, protein, nucleic acid',
    question: 'Liên kết hydrogen giữa các phân tử nước tạo nên tính chất nào? Cấu trúc bậc 1, 2, 3, 4 của protein khác nhau thế nào và vì sao các bậc đó quyết định chức năng?',
    keywords: /lien ket hydrogen giua cac phan tu nuoc|phan tu sinh hoc|phospholipid|cau truc bac (?:1|2|3|4|mot|hai|ba|bon) cua protein|cau truc protein|nucleotide|dai phan tu sinh hoc|cau truc cua nuoc/,
    examples: ['phân tử sinh học', 'cấu trúc của nước', 'phospholipid', 'cấu trúc bậc 4 của protein', 'nucleotide'],
    data: {
      viewBox: [560, 300],
      choices: [{key: 'm', label: 'Phân tử', value: 'protein', options: [['water', 'Nước'], ['lipid', 'Phospholipid'], ['protein', 'Protein'], ['nucleic', 'Nucleic acid']]}],
      sliders: [{key: 'lvl', label: 'Bậc cấu trúc protein', min: 1, max: 4, step: 1, value: 2}],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        if (s.m === 'water') {
          const mol = (x: number, y: number, a: number) => {
            const h1: [number, number] = [x + 38 * Math.cos(rad(a + 52)), y + 38 * Math.sin(rad(a + 52))];
            const h2: [number, number] = [x + 38 * Math.cos(rad(a - 52)), y + 38 * Math.sin(rad(a - 52))];
            out.push(ln(x, y, h1[0], h1[1], {stroke: C.ink, w: 3}), ln(x, y, h2[0], h2[1], {stroke: C.ink, w: 3}), dot(h1[0], h1[1], 9, '#E7E5E4'), dot(h2[0], h2[1], 9, '#E7E5E4'), dot(x, y, 16, C.red), txt(x, y + 5, 'O', {fill: '#fff', bold: true}));
            return [h1, h2];
          };
          const a = mol(190, 130, 20);
          const b = mol(360, 110, 170);
          const c = mol(280, 220, 80);
          out.push(ln(a[0][0], a[0][1], b[0][0], b[0][1] + 8, {stroke: C.blue, dash: '4 4', w: 2}), ln(c[1][0], c[1][1], a[1][0], a[1][1] + 10, {stroke: C.blue, dash: '4 4', w: 2}), ln(b[1][0], b[1][1], c[0][0], c[0][1], {stroke: C.blue, dash: '4 4', w: 2}));
          out.push(txt(280, 280, 'đường đứt: liên kết hydrogen giữa H (δ+) của phân tử này và O (δ−) của phân tử khác', {size: 11, fill: C.blue}));
          return out;
        }
        if (s.m === 'lipid') {
          for (let i = 0; i < 12; i++) {
            const x = 60 + i * 38;
            out.push(dot(x, 90, 9, C.blue), dot(x, 210, 9, C.blue), ln(x - 3, 99, x - 3, 150, {stroke: C.orange, w: 2.4}), ln(x + 3, 99, x + 3, 150, {stroke: C.orange, w: 2.4}), ln(x - 3, 201, x - 3, 150, {stroke: C.orange, w: 2.4}), ln(x + 3, 201, x + 3, 150, {stroke: C.orange, w: 2.4}));
          }
          out.push(txt(280, 60, 'ngoài tế bào (nước)', {size: 11, fill: C.blue}), txt(280, 150, 'đuôi acid béo kị nước', {size: 12, fill: C.orange, bold: true}), txt(280, 250, 'trong tế bào (nước) — đầu phosphate ưa nước hướng ra hai phía', {size: 11, fill: C.blue}));
          return out;
        }
        if (s.m === 'protein') {
          const lvl = Math.round(p.lvl);
          if (lvl === 1) for (let i = 0; i < 14; i++) out.push(ln(60 + i * 30, 150, 90 + i * 30, 150, {stroke: C.grey, w: 2}), dot(60 + i * 30, 150, 11, ['#FCA5A5', '#93C5FD', '#FDE68A', '#86EFAC'][i % 4]));
          if (lvl === 2) {
            const pts: [number, number][] = Array.from({length: 120}, (_, i) => [60 + i * 3.8, 150 + 38 * Math.sin(i / 3.2)]);
            out.push(poly(pts, {stroke: C.blue, w: 5, close: false}), txt(280, 230, 'xoắn α (liên kết H: –CO···HN–)', {size: 11}));
          }
          if (lvl === 3) {
            const pts: [number, number][] = Array.from({length: 160}, (_, i) => [280 + (60 + i * 0.4) * Math.cos(i / 6) * 0.9, 150 + (40 + i * 0.3) * Math.sin(i / 6) * 0.9]);
            out.push(poly(pts, {stroke: C.purple, w: 4, close: false}), txt(280, 285, 'cuộn gấp không gian ba chiều (liên kết disulfide, ion, kị nước)', {size: 11}));
          }
          if (lvl === 4) for (let i = 0; i < 4; i++) {
            const cx = 190 + (i % 2) * 180;
            const cy = 110 + Math.floor(i / 2) * 100;
            out.push({t: 'circle', cx, cy, r: 42, fill: ['#FCA5A5', '#93C5FD', '#FCA5A5', '#93C5FD'][i], o: 0.75, stroke: C.ink, w: 1.6}, txt(cx, cy + 4, i < 2 ? 'α' : 'β', {size: 16, bold: true}));
          }
          out.push(txt(280, 30, ['', 'BẬC 1: trình tự amino acid', 'BẬC 2: xoắn α, gấp nếp β', 'BẬC 3: cấu trúc không gian của một chuỗi', 'BẬC 4: nhiều chuỗi polypeptide (hemoglobin: 4 chuỗi)'][lvl], {size: 13, bold: true}));
          return out;
        }
        // nucleic
        const pairs: [string, string, number][] = [['A', 'T', 2], ['G', 'C', 3], ['T', 'A', 2], ['C', 'G', 3], ['A', 'T', 2]];
        out.push(ln(80, 50, 80, 260, {stroke: C.grey, w: 4}), ln(480, 50, 480, 260, {stroke: C.grey, w: 4}));
        pairs.forEach(([a, b, n], i) => {
          const y = 70 + i * 42;
          out.push(box(88, y - 14, 36, 28, '#BFDBFE', C.blue), txt(106, y + 5, a, {bold: true}), box(436, y - 14, 36, 28, '#FDE68A', C.orange), txt(454, y + 5, b, {bold: true}));
          for (let k = 0; k < n; k++) out.push(ln(128, y - 6 + k * 8, 432, y - 6 + k * 8, {stroke: C.red, dash: '3 4', w: 1.4}));
          out.push(txt(280, y - 10, `${n} liên kết hydrogen`, {size: 10, fill: C.red}));
        });
        return out;
      },
      readouts: [
        {label: 'Đặc điểm', value: (p, _t, s) => ({
          water: 'phân tử phân cực, tạo liên kết hydrogen: nhiệt dung riêng lớn, sức căng bề mặt, dung môi tốt',
          lipid: 'lớp kép phospholipid là khung của màng sinh chất, đầu ưa nước quay ra ngoài, đuôi kị nước quay vào trong',
          protein: ['', 'chuỗi tuyến tính các amino acid nối bằng liên kết peptide', 'xoắn α hoặc gấp nếp β, bền nhờ liên kết hydrogen', 'chuỗi cuộn gấp tạo hình dạng đặc trưng, quyết định chức năng', 'nhiều chuỗi polypeptide liên kết với nhau'][Math.round(p.lvl)],
          nucleic: 'A = T (2 liên kết H) và G ≡ C (3 liên kết H) theo nguyên tắc bổ sung; RNA dùng U thay T',
        }[s.m] ?? '')},
      ],
      note: 'Protein biến tính (đun nóng, thay đổi pH) mất cấu trúc không gian nên mất chức năng dù trình tự amino acid không đổi.',
    },
  },

  BIO_MEMBRANE_TRANSPORT: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Vận chuyển các chất qua màng sinh chất',
    question: 'Chất nào đi qua màng không tốn năng lượng và chất nào cần ATP? Vì sao vận chuyển chủ động có thể đưa chất đi ngược chiều gradient nồng độ?',
    keywords: /van chuyen (?:cac chat )?qua mang|khuech tan tang cuong|van chuyen chu dong|van chuyen thu dong|bom natri|kenh protein|mang khảm dong|gradient nong do/,
    examples: ['vận chuyển các chất qua màng', 'khuếch tán tăng cường', 'vận chuyển chủ động', 'bơm natri kali'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'm', label: 'Cách vận chuyển', value: 'passive', options: [['passive', 'Khuếch tán qua lớp kép'], ['facil', 'Khuếch tán tăng cường (kênh)'], ['active', 'Vận chuyển chủ động (bơm)']]}],
      sliders: [
        {key: 'out', label: 'Nồng độ ngoài tế bào', min: 1, max: 10, step: 1, value: 8},
        {key: 'in', label: 'Nồng độ trong tế bào', min: 1, max: 10, step: 1, value: 2},
      ],
      toggles: [{key: 'atp', label: 'Có ATP', value: true}],
      time: {max: 6, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        for (let i = 0; i < 13; i++) out.push(dot(50 + i * 38, 160, 10, '#93C5FD'), ln(50 + i * 38, 170, 50 + i * 38, 188, {stroke: C.orange, w: 2}));
        if (s.m !== 'passive') out.push(box(260, 146, 40, 52, s.m === 'facil' ? '#D9F99D' : '#FBCFE8', C.ink), txt(280, 176, s.m === 'facil' ? 'kênh' : 'bơm', {size: 12, bold: true}));
        const rng = seeded(8);
        const place = (n: number, y0: number, y1: number, col: string) => {
          for (let i = 0; i < n; i++) out.push(dot(60 + rng() * 440 + 12 * Math.sin(t * 2 + i), y0 + rng() * (y1 - y0) + 8 * Math.cos(t * 2.3 + i), 5, col));
        };
        place(Math.round(p.out) * 2, 30, 135, C.red);
        place(Math.round(p.in) * 2, 215, 300, C.red);
        const grad = p.out - p.in;
        const passiveDir = Math.sign(grad);
        const dir = s.m === 'active' ? (p.atp === 1 ? -passiveDir || 1 : 0) : passiveDir;
        const n = Math.min(6, Math.abs(Math.round(grad)));
        if (dir !== 0) for (let i = 0; i < n; i++) {
          const u = (((t / 3 + i / n) % 1) + 1) % 1;
          const y = dir > 0 ? 130 + u * 100 : 230 - u * 100;
          out.push(dot(280 + (s.m === 'passive' ? ((i * 37) % 300) - 150 : 0), y, 5.5, C.green));
        }
        if (s.m === 'active' && p.atp === 1) out.push(txt(440, 175, 'ATP → ADP + Pi', {size: 11, fill: C.orange, bold: true}));
        out.push(txt(40, 22, 'NGOÀI', {size: 10, anchor: 'start', fill: C.grey}), txt(40, 312, 'TRONG', {size: 10, anchor: 'start', fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Chiều chuyển động thực', value: (p, _t, s) => {
          const g = p.out - p.in;
          if (s.m === 'active') return p.atp === 1 ? (g === 0 ? 'cân bằng' : g > 0 ? 'đi vào trong, ngược chiều gradient (cần ATP)' : 'đi ra ngoài, ngược chiều gradient (cần ATP)') : 'không vận chuyển được khi thiếu ATP';
          return g === 0 ? 'cân bằng động, không có dòng thực' : g > 0 ? 'từ ngoài vào trong (xuôi gradient)' : 'từ trong ra ngoài (xuôi gradient)';
        }},
        {label: 'Tiêu tốn năng lượng', value: (_p, _t, s) => (s.m === 'active' ? 'có (ATP)' : 'không (thụ động)')},
        {label: 'Chất điển hình', value: (_p, _t, s) => ({passive: 'O₂, CO₂, phân tử kị nước nhỏ', facil: 'glucose, ion qua kênh hoặc protein mang', active: 'bơm Na⁺–K⁺: đưa 3 Na⁺ ra, 2 K⁺ vào'}[s.m] ?? '')},
      ],
      note: 'Khuếch tán (thụ động): chất đi từ nơi nồng độ cao đến nơi nồng độ thấp. Vận chuyển chủ động dùng ATP để đưa chất từ nơi nồng độ thấp đến nơi nồng độ cao.',
    },
  },

  BIO_PLANT_TROPISM: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Hướng động ở thực vật và vai trò của auxin',
    question: 'Vì sao ngọn cây uốn cong về phía có ánh sáng? Auxin phân bố thế nào ở hai bên thân và rễ cây khi đặt nằm ngang?',
    keywords: /huong dong|huong sang|huong trong luc|huong nuoc|huong hoa|auxin va huong dong|\bung dong\b|cay trinh nu/,
    examples: ['hướng động', 'hướng sáng', 'hướng trọng lực'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Kích thích', value: 'photo', options: [['photo', 'Ánh sáng một phía'], ['grav', 'Trọng lực (đặt nằm ngang)']]}],
      sliders: [{key: 'ang', label: 'Hướng ánh sáng (so với phương thẳng đứng)', unit: '°', min: -80, max: 80, step: 5, value: 60}],
      toggles: [{key: 'tip', label: 'Còn đỉnh ngọn (tạo auxin)', value: true}],
      time: {max: 8, label: 'Thời gian sinh trưởng', unit: 'ngày'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        const grow = 1 - Math.exp(-t / 2.5);
        if (s.mode === 'photo') {
          const theta = p.tip === 1 ? (rad(p.ang) * 0.9) * grow : 0;
          const L = 190;
          const pts: [number, number][] = [];
          let x = 280;
          let y = 270;
          for (let i = 0; i <= 40; i++) {
            pts.push([x, y]);
            const a = theta * (i / 40);
            x += (L / 40) * Math.sin(a);
            y -= (L / 40) * Math.cos(a);
          }
          out.push(ln(200, 272, 360, 272, {stroke: '#92400E', w: 6}), poly(pts, {stroke: C.green, w: 14, close: false}));
          const tip = pts[pts.length - 1];
          out.push(dot(tip[0], tip[1], 9, '#4D7C0F'));
          const sx = 280 + 220 * Math.sin(rad(p.ang));
          const sy = 100 - 40 * Math.cos(rad(p.ang));
          out.push(dot(sx, sy, 18, '#FBBF24'), arrow(sx - 20 * Math.sin(rad(p.ang)), sy + 20, sx - 70 * Math.sin(rad(p.ang)), sy + 70, '#F59E0B', 3));
          if (p.tip === 1) for (let i = 0; i < 9; i++) {
            const k = (i + 1) / 10;
            const q = pts[Math.round(k * 40)];
            const shaded = Math.sign(p.ang) === 0 ? 0 : -Math.sign(p.ang);
            out.push(dot(q[0] + shaded * 11, q[1], 3.2, C.orange), dot(q[0] - shaded * 11, q[1], 1.8, C.orange));
          }
        } else {
          const bend = rad(75) * grow;
          const shoot: [number, number][] = [];
          const root: [number, number][] = [];
          for (let i = 0; i <= 30; i++) {
            const a = (bend * i) / 30;
            shoot.push([280 + i * 5.5 * Math.cos(a) * 1.0, 160 - i * 5.5 * Math.sin(a)]);
            root.push([280 - i * 4 * Math.cos(a), 160 + i * 4 * Math.sin(a)]);
          }
          out.push(poly(shoot, {stroke: C.green, w: 12, close: false}), poly(root, {stroke: '#92400E', w: 8, close: false}), dot(280, 160, 10, '#FDE68A'));
          out.push(arrow(500, 60, 500, 110, C.grey, 3), txt(500, 130, 'trọng lực', {size: 10, fill: C.grey}));
          for (let i = 0; i < 5; i++) out.push(dot(300 + i * 24, 190 - i * (6 + 10 * grow), 3, C.orange));
        }
        return out;
      },
      readouts: [
        {label: 'Auxin tập trung ở', value: (p, _t, s) => (s.mode === 'photo' ? (p.tip === 1 ? (p.ang === 0 ? 'hai bên đều nhau' : 'phía được che tối, ngược phía ánh sáng') : 'không có (đã cắt đỉnh sinh trưởng)') : 'mặt dưới của thân và rễ')},
        {label: 'Kết quả', value: (p, _t, s) => (s.mode === 'photo' ? (p.tip === 1 ? 'thân uốn về phía ánh sáng (hướng sáng dương)' : 'thân không uốn cong') : 'thân mọc lên (hướng trọng lực âm), rễ mọc xuống (hướng trọng lực dương)')},
        {label: 'Vì sao', value: (_p, _t, s) => (s.mode === 'photo' ? 'auxin kích thích tế bào thân dãn dài: bên nhiều auxin dài nhanh hơn nên uốn về bên ít auxin' : 'rễ rất nhạy với auxin: nồng độ cao ở mặt dưới ức chế dãn dài, thân thì ngược lại')},
      ],
      note: 'Auxin (IAA) tạo ở đỉnh sinh trưởng và vận chuyển xuống. Thí nghiệm của Darwin: cắt hoặc che đỉnh chồi mầm thì không uốn về phía sáng.',
    },
  },

  BIO_TRANSCRIPTION_TRANSLATION: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Phiên mã, dịch mã và đột biến gene',
    question: 'Từ trình tự mạch gốc DNA ta suy ra mRNA, anticodon của tRNA và chuỗi amino acid thế nào? Đột biến thay thế, thêm hoặc mất một cặp nucleotide ảnh hưởng ra sao tới protein?',
    keywords: /phien ma|dich ma|ma di truyen|bo ba ma hoa|codon|anticodon|dot bien gene|dot bien diem|dot bien dich khung|mach goc/,
    examples: ['phiên mã', 'dịch mã', 'mã di truyền', 'đột biến gene', 'bộ ba mã hóa'],
    data: {
      viewBox: [560, 380],
      texts: [{key: 'dna', label: 'Mạch gốc 3′→5′', value: 'TACGGACTTAAAATT', maxLength: 24}],
      choices: [
        {key: 'kind', label: 'Đột biến', value: 'none', options: [['none', 'Không'], ['sub', 'Thay thế một cặp'], ['ins', 'Thêm một cặp'], ['del', 'Mất một cặp']]},
        {key: 'base', label: 'Nucleotide thay/thêm', value: 'A', options: [['A', 'A'], ['T', 'T'], ['G', 'G'], ['C', 'C']]},
      ],
      sliders: [{key: 'pos', label: 'Vị trí đột biến (tính từ 3′)', min: 1, max: 24, step: 1, value: 4}],
      draw: (p, _t, s) => {
        const clean = s.dna.toUpperCase().replace(/[^ATGC]/g, '').slice(0, 24);
        const mutated = mutate(clean, s.kind as MutationKind, Math.round(p.pos), s.base);
        const out: Shape[] = [];
        const panel = (dna: string, y0: number, title: string, other?: string) => {
          const mrna = transcribe(dna);
          const aa = translate(mrna);
          const n = Math.min(8, Math.ceil(dna.length / 3));
          out.push(txt(20, y0, title, {size: 12, bold: true, anchor: 'start'}), txt(20, y0 + 32, 'mạch gốc', {size: 10, anchor: 'start', fill: C.grey}), txt(20, y0 + 62, 'mRNA', {size: 10, anchor: 'start', fill: C.grey}), txt(20, y0 + 92, 'anticodon', {size: 10, anchor: 'start', fill: C.grey}), txt(20, y0 + 122, 'amino acid', {size: 10, anchor: 'start', fill: C.grey}));
          const base = other ? transcribe(other) : mrna;
          for (let c = 0; c < n; c++) {
            const x = 90 + c * CODON_W;
            const tpl = dna.slice(3 * c, 3 * c + 3);
            const cod = mrna.slice(3 * c, 3 * c + 3);
            const diff = other !== undefined && cod !== base.slice(3 * c, 3 * c + 3);
            const startIdx = mrna.indexOf('AUG');
            const aaIdx = startIdx >= 0 && 3 * c >= startIdx && (3 * c - startIdx) % 3 === 0 ? (3 * c - startIdx) / 3 : -1;
            const a = aaIdx >= 0 ? aa[aaIdx] : undefined;
            out.push(box(x, y0 + 18, CODON_W - 6, 22, '#E0F2FE', diff ? C.red : C.blue), txt(x + (CODON_W - 6) / 2, y0 + 34, tpl, {size: 12}), box(x, y0 + 48, CODON_W - 6, 22, '#FEF3C7', diff ? C.red : C.orange), txt(x + (CODON_W - 6) / 2, y0 + 64, cod, {size: 12, bold: true}), box(x, y0 + 78, CODON_W - 6, 22, '#F5F5F4', C.grey), txt(x + (CODON_W - 6) / 2, y0 + 94, tpl.replace(/T/g, 'U'), {size: 12}));
            if (a) out.push(box(x, y0 + 108, CODON_W - 6, 24, aaColor(a), diff ? C.red : C.ink), txt(x + (CODON_W - 6) / 2, y0 + 125, AA_NAME[a], {size: 12, bold: true}));
          }
        };
        panel(clean, 18, 'Gene bình thường');
        if (s.kind !== 'none') panel(mutated, 196, 'Gene sau đột biến', clean);
        return out;
      },
      readouts: [
        {label: 'Chuỗi polypeptide bình thường', value: (_p, _t, s) => translate(transcribe(s.dna.toUpperCase().replace(/[^ATGC]/g, '').slice(0, 24))).map((a) => AA_NAME[a]).join(' – ') || 'chưa có AUG'},
        {label: 'Sau đột biến', value: (p, _t, s) => {
          const clean = s.dna.toUpperCase().replace(/[^ATGC]/g, '').slice(0, 24);
          return translate(transcribe(mutate(clean, s.kind as MutationKind, Math.round(p.pos), s.base))).map((a) => AA_NAME[a]).join(' – ') || '—';
        }},
        {label: 'Loại đột biến', value: (p, _t, s) => {
          const clean = s.dna.toUpperCase().replace(/[^ATGC]/g, '').slice(0, 24);
          return classifyMutation(translate(transcribe(clean)), translate(transcribe(mutate(clean, s.kind as MutationKind, Math.round(p.pos), s.base))), s.kind as MutationKind);
        }},
      ],
      note: 'mRNA bổ sung với mạch gốc (A–U, T–A, G–C, C–G). Dịch mã bắt đầu từ AUG (Met) và kết thúc ở UAA, UAG hoặc UGA. Thêm hoặc mất một cặp nucleotide làm dịch khung đọc.',
    },
  },

  BIO_CHROMOSOME: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Đột biến cấu trúc và số lượng nhiễm sắc thể',
    question: 'Bốn dạng đột biến cấu trúc NST làm thay đổi trình tự các gene như thế nào? Thể lệch bội khác thể đa bội ở điểm nào?',
    keywords: /dot bien (?:cau truc )?(?:nst|nhiem sac the)|mat doan|lap doan|dao doan|chuyen doan|the lech boi|da boi|the ba|the mot|hoi chung down|bo nhiem sac the/,
    examples: ['đột biến cấu trúc nhiễm sắc thể', 'mất đoạn lặp đoạn đảo đoạn chuyển đoạn', 'thể lệch bội', 'đa bội', 'hội chứng Down'],
    data: {
      viewBox: [560, 300],
      choices: [{key: 'k', label: 'Dạng đột biến', value: 'inv', options: [['del', 'Mất đoạn'], ['dup', 'Lặp đoạn'], ['inv', 'Đảo đoạn'], ['trans', 'Chuyển đoạn tương hỗ'], ['tri', 'Thể ba (2n + 1)'], ['mono', 'Thể một (2n − 1)'], ['tri3', 'Tam bội (3n)'], ['tetra', 'Tứ bội (4n)']]}],
      draw: (_p, _t, s) => {
        const out: Shape[] = [];
        const colors = ['#FCA5A5', '#FDBA74', '#FDE68A', '#BEF264', '#7DD3FC', '#C4B5FD', '#F9A8D4', '#99F6E4'];
        const bar = (genes: string, x: number, y: number) => {
          [...genes].forEach((g, i) => {
            out.push(box(x + i * 38, y, 36, 28, colors[(g.charCodeAt(0) - 65) % colors.length], C.ink), txt(x + i * 38 + 18, y + 19, g, {size: 13, bold: true}));
          });
        };
        const struct = ['del', 'dup', 'inv', 'trans'];
        if (struct.includes(s.k)) {
          const r = STRUCT[s.k];
          out.push(txt(30, 40, 'Trước đột biến', {size: 11, anchor: 'start', fill: C.grey}));
          bar(r.before[0], 30, 50);
          if (r.before[1]) bar(r.before[1], 330, 50);
          out.push(arrow(280, 100, 280, 140, C.red, 3), txt(30, 168, 'Sau đột biến', {size: 11, anchor: 'start', fill: C.grey}));
          bar(r.after[0], 30, 178);
          if (r.after[1]) bar(r.after[1], 330, 178);
          return out;
        }
        const copies = {tri: [2, 2, 3], mono: [2, 2, 1], tri3: [3, 3, 3], tetra: [4, 4, 4]}[s.k] ?? [2, 2, 2];
        const heights = [110, 80, 54];
        copies.forEach((n, type) => {
          for (let c = 0; c < n; c++) {
            const x = 80 + type * 160 + c * 24;
            out.push(box(x, 220 - heights[type], 12, heights[type], colors[type], C.ink), dot(x + 6, 220 - heights[type] / 2, 2.5, C.ink));
          }
          out.push(txt(80 + type * 160 + (n * 24) / 2, 245, `cặp ${type + 1}: ${n} chiếc`, {size: 11}));
        });
        out.push(txt(280, 30, `${copies.reduce((a, b) => a + b, 0)} nhiễm sắc thể (bình thường 2n = 6)`, {size: 14, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Hậu quả', value: (_p, _t, s) => ({del: 'mất gene, thường gây hại (ví dụ mất đoạn nhỏ NST 21 hoặc 22 ở người gây ung thư máu)', dup: 'tăng số lượng gene, có thể làm tăng cường hoặc giảm sức sống (ví dụ lặp đoạn ở lúa mạch)', inv: 'đổi vị trí gene trên NST, ít mất vật chất di truyền, góp phần hình thành loài mới', trans: 'trao đổi đoạn giữa hai NST không tương đồng, có thể gây bệnh hoặc giảm khả năng sinh sản', tri: 'một cặp có 3 chiếc: ví dụ hội chứng Down (3 NST số 21)', mono: 'một cặp chỉ còn 1 chiếc: ví dụ hội chứng Turner (XO)', tri3: 'ba bộ NST đơn bội, thường bất thụ (dưa hấu không hạt)', tetra: 'bốn bộ NST đơn bội, cơ quan sinh dưỡng lớn (cây trồng tứ bội)'}[s.k] ?? '')},
        {label: 'Loại', value: (_p, _t, s) => (['del', 'dup', 'inv', 'trans'].includes(s.k) ? 'đột biến cấu trúc NST' : ['tri', 'mono'].includes(s.k) ? 'đột biến lệch bội (thay đổi một vài cặp)' : 'đột biến đa bội (thay đổi cả bộ NST)')},
      ],
      note: 'Đột biến cấu trúc làm thay đổi trình tự hoặc số lượng gene trên NST; đột biến số lượng làm thay đổi số NST của tế bào.',
    },
  },

  BIO_PEDIGREE: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Phả hệ và xác suất con mắc bệnh di truyền',
    question: 'Từ kiểu gene của bố mẹ, xác suất sinh con mắc bệnh là bao nhiêu khi bệnh do gene lặn, gene trội trên NST thường hay gene lặn liên kết X? Vì sao bệnh liên kết X lặn gặp ở nam nhiều hơn?',
    keywords: /pha he|xac suat sinh con bi benh|di truyen lien ket gioi tinh|benh di truyen|tu van di truyen|gene tren nst x|benh mau kho dong|mu mau/,
    examples: ['phả hệ', 'xác suất sinh con bị bệnh', 'di truyền liên kết giới tính', 'bệnh máu khó đông'],
    data: {
      viewBox: [560, 320],
      choices: [
        {key: 'mode', label: 'Kiểu di truyền bệnh', value: 'ar', options: [['ar', 'Gene lặn trên NST thường'], ['ad', 'Gene trội trên NST thường'], ['xr', 'Gene lặn liên kết NST X']]},
        {key: 'cross', label: 'Phép lai', value: 'c1', options: [['c1', 'Phép lai 1'], ['c2', 'Phép lai 2'], ['c3', 'Phép lai 3'], ['c4', 'Phép lai 4']]},
      ],
      draw: (_p, _t, s) => {
        const r = offspring(s.mode, s.cross);
        const out: Shape[] = [];
        out.push(box(190, 40, 44, 44, '#FFFFFF', C.ink), ring(350, 62, 22, C.ink, 2), txt(212, 100, 'bố', {size: 11}), txt(350, 100, 'mẹ', {size: 11}), ln(234, 62, 328, 62, {stroke: C.ink, w: 2}), ln(280, 62, 280, 135, {stroke: C.ink, w: 2}), ln(80, 135, 480, 135, {stroke: C.ink, w: 2}));
        const aff = (sex: 'son' | 'dau', i: number) => i < Math.round(4 * (sex === 'son' ? r.son : r.daughter));
        for (let i = 0; i < 8; i++) {
          const sex = i < 4 ? 'son' : 'dau';
          const k = i % 4;
          const x = 80 + (i < 4 ? 0 : 200) + k * 50;
          const y = 160;
          const filled = aff(sex, k);
          out.push(ln(x + 17, 135, x + 17, y, {stroke: C.ink, w: 1.6}));
          if (sex === 'son') out.push(box(x, y, 34, 34, filled ? '#1C1917' : '#FFFFFF', C.ink));
          else out.push({t: 'circle', cx: x + 17, cy: y + 17, r: 17, fill: filled ? '#1C1917' : '#FFFFFF', stroke: C.ink, w: 1.8});
        }
        out.push(txt(160, 225, 'con trai (hình vuông)', {size: 11}), txt(360, 225, 'con gái (hình tròn)', {size: 11}), txt(280, 262, 'tô đen = mắc bệnh (4 con mỗi giới)', {size: 11, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Kiểu gene bố mẹ', value: (_p, _t, s) => offspring(s.mode, s.cross).geno},
        {label: 'Xác suất con trai · con gái mắc bệnh', value: (_p, _t, s) => {
          const r = offspring(s.mode, s.cross);
          return `${f1(100 * r.son)} % · ${f1(100 * r.daughter)} %`;
        }},
        {label: 'Xác suất một đứa con bất kì mắc bệnh', value: (_p, _t, s) => `${f1(100 * offspring(s.mode, s.cross).affected)} %`},
      ],
      note: 'Bệnh lặn trên NST thường: cần aa. Bệnh trội: chỉ cần một allele A. Bệnh lặn liên kết X: con trai chỉ có một X nên chỉ cần Xᵃ là mắc bệnh, vì thế gặp ở nam nhiều hơn nữ.',
    },
  },

  BIO_POPULATION_EVOLUTION: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Các nhân tố tiến hóa: phiêu bạt di truyền, chọn lọc, di nhập',
    question: 'Quần thể nhỏ và quần thể lớn khác nhau thế nào về mức dao động ngẫu nhiên của tần số allele? Chọn lọc tự nhiên và dòng gene làm tần số allele thay đổi theo hướng nào?',
    keywords: /nhan to tien hoa|phieu bat di truyen|yeu to ngau nhien|chon loc tu nhien|dong gene|di nhap gene|giao phoi can huyet|tan so allele cua quan the|hieu ung sang lap/,
    examples: ['nhân tố tiến hóa', 'phiêu bạt di truyền', 'chọn lọc tự nhiên', 'dòng gene', 'tần số allele của quần thể'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'N', label: 'Kích thước quần thể N', min: 10, max: 1000, step: 10, value: 50},
        {key: 'p0', label: 'Tần số allele A ban đầu', min: 0.1, max: 0.9, step: 0.05, value: 0.5},
        {key: 's', label: 'Hệ số chọn lọc ưu thế cho A (s)', min: -0.3, max: 0.3, step: 0.01, value: 0},
        {key: 'm', label: 'Tỉ lệ di nhập m (nguồn có tần số 0,5)', min: 0, max: 0.2, step: 0.01, value: 0},
      ],
      draw: (p) => {
        const G = 100;
        const X = (g: number) => 50 + (g / G) * 470;
        const Y = (v: number) => 280 - v * 240;
        const out: Shape[] = [ln(50, 280, 520, 280, {stroke: C.ink, w: 1.4}), ln(50, 280, 50, 40, {stroke: C.ink, w: 1.4}), txt(285, 305, 'thế hệ', {size: 11}), txt(24, 160, 'tần số allele A', {size: 11, rot: -90})];
        [0, 0.5, 1].forEach((v) => out.push(txt(44, Y(v) + 4, String(v), {size: 10, anchor: 'end'}), ln(50, Y(v), 520, Y(v), {stroke: C.light, w: 0.8})));
        const cols = [C.blue, C.red, C.green, C.orange, C.purple];
        cols.forEach((c, i) => out.push(poly(driftPath(p.N, p.p0, p.s, p.m, G, i + 3).map((v, g) => [X(g), Y(v)] as [number, number]), {stroke: c, w: 1.8, close: false})));
        out.push(poly(expectedPath(p.p0, p.s, p.m, G).map((v, g) => [X(g), Y(v)] as [number, number]), {stroke: C.ink, w: 2.6, dash: '6 4', close: false}));
        return out;
      },
      readouts: [
        {label: 'Số trong 5 quần thể đã cố định (A = 0 hoặc 1) ở thế hệ 100', value: (p) => String([3, 4, 5, 6, 7].filter((sd) => {
          const last = driftPath(p.N, p.p0, p.s, p.m, 100, sd).slice(-1)[0];
          return last === 0 || last === 1;
        }).length)},
        {label: 'Tần số A trung bình sau 100 thế hệ · giá trị kì vọng (không phiêu bạt)', value: (p) => {
          const mean = [3, 4, 5, 6, 7].map((sd) => driftPath(p.N, p.p0, p.s, p.m, 100, sd).slice(-1)[0]).reduce((a, b) => a + b, 0) / 5;
          return `${f2(mean)} · ${f2(expectedPath(p.p0, p.s, p.m, 100).slice(-1)[0])}`;
        }},
      ],
      note: 'Đường đứt đen là diễn biến kì vọng khi chỉ có chọn lọc và di nhập. Năm đường màu là năm quần thể có phiêu bạt di truyền: N càng nhỏ dao động càng mạnh và allele càng dễ mất hoặc cố định.',
    },
  },

  BIO_FOOD_WEB_ENERGY: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Dòng năng lượng qua các bậc dinh dưỡng và phóng đại sinh học',
    question: 'Vì sao chuỗi thức ăn thường chỉ có 4–5 bậc dinh dưỡng? Chất độc bền như DDT có nồng độ thay đổi thế nào khi đi lên các bậc cao của chuỗi?',
    keywords: /thap sinh thai|hieu suat sinh thai|bac dinh duong|chuoi thuc an|luoi thuc an|phong dai sinh hoc|quy tac 10|dong nang luong trong he sinh thai|ddt/,
    examples: ['tháp sinh thái', 'hiệu suất sinh thái', 'bậc dinh dưỡng', 'chuỗi thức ăn', 'phóng đại sinh học'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'e0', label: 'Năng lượng của sinh vật sản xuất', unit: 'kcal', min: 1000, max: 100000, step: 1000, value: 10000},
        {key: 'eff', label: 'Hiệu suất chuyển hóa giữa hai bậc', unit: '%', min: 5, max: 20, step: 1, value: 10},
      ],
      toggles: [{key: 'ddt', label: 'Hiện DDT (×10 mỗi bậc)', value: false}],
      draw: (p) => {
        const names = ['Sinh vật sản xuất', 'Tiêu thụ bậc 1', 'Tiêu thụ bậc 2', 'Tiêu thụ bậc 3', 'Tiêu thụ bậc 4'];
        const out: Shape[] = [];
        for (let i = 0; i < 5; i++) {
          const e = energyAt(p.e0, p.eff, i);
          const w = Math.max(18, 380 * Math.pow(e / p.e0, 0.28));
          const y = 250 - i * 48;
          out.push(box(280 - w / 2, y, w, 40, ['#86EFAC', '#BEF264', '#FDE68A', '#FDBA74', '#FCA5A5'][i], C.ink), txt(280, y + 16, names[i], {size: 11, bold: true}), txt(280, y + 31, `${e >= 100 ? Math.round(e).toLocaleString('vi-VN') : f1(e)} kcal`, {size: 11}));
          if (p.ddt === 1) out.push(txt(500, y + 25, `${f2(bioAccumulation(0.04, i))} ppm`, {size: 11, fill: C.red, bold: true}));
        }
        out.push(txt(280, 24, 'bề rộng ∝ năng lượng (thang nén)', {size: 10, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Năng lượng ở bậc 1 · 2 · 3 · 4', value: (p) => [1, 2, 3, 4].map((i) => `${f1(energyAt(p.e0, p.eff, i))}`).join(' · ') + ' kcal'},
        {label: 'Phần năng lượng sản xuất còn lại ở bậc 4', value: (p) => `${(100 * Math.pow(p.eff / 100, 4)).toExponential(1)} %`},
        {label: 'DDT ở bậc 4 so với sinh vật sản xuất', value: () => `×${bioAccumulation(1, 4).toLocaleString('vi-VN')} lần`},
      ],
      note: 'Hiệu suất sinh thái trung bình khoảng 10 % (quy tắc 10 %): phần còn lại mất đi qua hô hấp, nhiệt và chất thải, nên khó có nhiều hơn 5 bậc. Chất độc bền tích lũy làm sinh vật bậc cao chịu nồng độ lớn nhất.',
    },
  },
};

export const STRUCT: Record<string, {before: string[]; after: string[]}> = {
  del: {before: ['ABCDEFG'], after: ['ABDEFG']},
  dup: {before: ['ABCDEFG'], after: ['ABCBCDEFG']},
  inv: {before: ['ABCDEFG'], after: ['ABEDCFG']},
  trans: {before: ['ABCDEF', 'UVWXYZ'], after: ['ABCXYZ', 'UVWDEF']},
};
export type {P};
