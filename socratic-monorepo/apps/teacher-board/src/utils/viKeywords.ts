// apps/teacher-board/src/utils/viKeywords.ts
/**
 * Nhận ra TÊN mô phỏng viết bằng chữ tiếng Việt, kể cả khi đọc sai dấu hoặc sai vài ký tự
 * (kết quả của bộ nhận dạng cục bộ hay của Vision đều có thể lệch: "khí khổng" → "khikhcng", "con lắc kép" → "con lốc kép").
 * Trả về câu chuẩn để bộ định tuyến hiện có mở đúng mô phỏng.
 */

interface Alias {
  /** câu chuẩn mà `matchInstantStemBlueprint` nhận được */
  canon: string;
  keys: string[];
}

/** bỏ dấu, đ → d, chỉ giữ chữ và số */
export function normalizeVi(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\\[a-z]+/g, '') // lệnh LaTeX như \text, \cot
    .replace(/[^a-z0-9]/g, '');
}

/** gộp các ký tự hay bị nhận nhầm với nhau khi viết tay */
const fold = (s: string) => s.replace(/[1ijt]/g, 'l').replace(/[0cqa]/g, 'o');

const ALIASES: Alias[] = [
  // Toán
  {canon: 'y = x^2 ; y = 2x + 3', keys: ['dothihamso', 'dothinhieuham', 'vedothi']},
  {canon: 'y = 2sin(3x)', keys: ['hamluonggiac', 'daodongdieuhoa', 'songdieuhoa']},
  {canon: 'nguyên hàm của x^3', keys: ['nguyenham', 'tichphan']},
  {canon: 'hình chóp S.ABCD', keys: ['hinhchop', 'hinhlapphuong', 'khoidadien', 'hinhhopchunhat', 'langtru']},
  {canon: 'x^2 + y^2 + z^2 = 9', keys: ['oxyz', 'matcau', 'khonggianoxyz']},
  {canon: 'y = sqrt(x); a = 0; b = 4 tròn xoay', keys: ['tronxoay', 'thetichkhoitronxoay', 'riemann']},
  {canon: 'đường Euler tam giác', keys: ['duongeuler', 'hinhhocdong', 'tamduongtron']},
  {canon: 'x + y <= 6; x >= 0; y >= 0; max 3x+2y', keys: ['quyhoachtuyentinh', 'miennghiem', 'toiuuhoa']},
  {canon: 'x_{n+1} = 3.9 x_n (1 - x_n)', keys: ['mangnhen', 'daytruyhoi', 'honloan']},
  {canon: 'Min=1, Q1=5, Q2=8, Q3=12, Max=20', keys: ['bieudohop', 'tuphanvi', 'boxplot']},
  {canon: "x | -∞ -1 1 +∞\ny' | + 0 - 0 +\ny | -∞ ↗ 3 ↘ -1 ↗ +∞", keys: ['bangbienthien']},
  // Vật lí
  {canon: 'ném xiên v0 = 22 m/s', keys: ['nemxien', 'chuyendongnem', 'nemngang']},
  {canon: 'con lắc đơn', keys: ['conlacdon', 'chukyconlac', 'daodongconlac']},
  {canon: 'mặt phẳng nghiêng có ma sát', keys: ['matphangnghieng', 'masattruot', 'lucmasat', 'vattruot']},
  {canon: 'giao thoa sóng hai nguồn', keys: ['giaothoasong', 'songnuoc', 'giaothoa', 'hainguon', 'songco']},
  {canon: 'mạch RLC cộng hưởng', keys: ['machrlc', 'dienxoaychieu', 'conghuong', 'giandofresnel']},
  {canon: 'chu trình Carnot', keys: ['chutrinhcarnot', 'chutrinhnhiet', 'khilytuong', 'dongconhiet', 'dothipv']},
  {canon: 'chu trình Otto', keys: ['chutrinhotto', 'dongcootto']},
  {canon: 'con lắc kép', keys: ['conlackep', 'honloanconlac', 'conlacdoi', 'conlacphuctap']},
  {canon: 'lực Coriolis', keys: ['luccoriolis', 'coriolis', 'hequychieuquay']},
  {canon: 'nhiễu xạ 5 khe', keys: ['nhieuxa', 'cachtu', 'fraunhofer', 'nhieuxanhieukhe']},
  // Hóa học
  {canon: 'Fe + O2 -> Fe2O3', keys: ['canbangphuongtrinh', 'oxihoakhu', 'phanungoxihoakhu']},
  {canon: 'chuẩn độ HCl bằng NaOH', keys: ['chuando', 'chuandoaxitbazo', 'duongcongph']},
  {canon: 'NH3', keys: ['hinhhocphantu', 'vsepr', 'hinhdangphantu', 'amoniac', 'phantuamoniac']},
  {canon: 'H2O', keys: ['phantunuoc', 'hinhdangphantunuoc']},
  {canon: 'CH4', keys: ['metan', 'phantumetan']},
  {canon: 'CO2', keys: ['cacbondioxit', 'khicacbonic', 'phantuco2']},
  {canon: 'O3', keys: ['phantuozon']},
  {canon: '2NO2 ⇌ N2O4', keys: ['lechatelier', 'chuyendichcanbang', 'canbanghoahoc', 'phanungthuannghich', 'canbangthuannghich', 'nguyenlichuyendichcanbang']},
  {canon: 'Pin Daniell', keys: ['pindaniell', 'pindienhoa', 'pingalvani', 'phuongtrinhnernst', 'nernst']},
  {canon: 'SN2', keys: ['sn2', 'nghichdaowalden', 'phanungthenucleophin']},
  {canon: 'CFT d6', keys: ['truongtinhthe', 'tachmucorbital', 'phucchat', 'phucbatdien', 'tachmucnangluong', 'orbitald']},
  {canon: 'FCC', keys: ['mangtinhthe', 'omang', 'tinhthelapphuong', 'cautructinhthe', 'tinhthekimloai', 'lapphuongtamdien', 'lapphuongtamkhoi', 'tinhthebcc']},
  {canon: 'cyclohexane ghế', keys: ['cyclohexane', 'caudang', 'dongphancaudang']},
  // Sinh học
  {canon: 'quang hợp', keys: ['quanghop', 'quangphan']},
  {canon: 'ADN', keys: ['adn', 'nhandoiadn', 'helicase', 'caucadn', 'cautrucadn', 'cautrucphantuadn', 'phantuadn', 'taibanadn', 'tuynhandoi']},
  {canon: 'P: AaBb × AaBb', keys: ['philaimenden', 'bangpunnett', 'punnett', 'phepmenden', 'laihaicaptinhtrang', 'laimotcaptinhtrang', 'quyluatmenden', 'sodolai', 'laiphantich', 'hoanvigen', 'laitinhtrang']},
  {canon: '0,04AA + 0,32Aa + 0,64aa = 1', keys: ['hardyweinberg', 'canbangdichuyen', 'quanthedichuyen', 'cautrucdichuyen', 'tansoalen', 'tansokieugen']},
  {canon: 'khí khổng', keys: ['khikhong', 'khongkhi', 'thoathoinuoc', 'tebaohatdau', 'dongmokhikhong', 'tebaobaove']},
  {canon: 'thẩm thấu', keys: ['thamthau', 'comnguyensinh', 'apsuatthamthau']},
  {canon: 'Operon Lac', keys: ['operonlac', 'operon', 'dieuhoagen', 'dieuhoabieuhiengen', 'ecoli', 'lactose', 'dieuhoaoperon', 'gen lacz'.replace(' ', '')]},
  {canon: 'chuỗi truyền electron ATP synthase', keys: ['hohaptebao', 'chuoitruyenelectron', 'chuoichuyenelectron', 'timthe', 'atpsynthase', 'chutrinhkrebs', 'krebs', 'tonghopatp', 'photphohoaoxihoa']},
  {canon: 'Lotka-Volterra', keys: ['lotkavolterra', 'conmoithusan', 'quanthehailoai', 'dongthaiquanthe', 'thovasoi', 'conmoivatannthit'.replace('nn','n'), 'vatanthit', 'sinhtruongquanthe', 'matphangpha']},
  {canon: 'GPCR apoptosis', keys: ['truyentintebao', 'gpcr', 'apoptosis', 'chettebao', 'chettheochuongtrinh', 'thuthe', 'camp', 'conduongcamp', 'caspase', 'tinhieutebao']},
];

// bảng khóa đã chuẩn hóa
const TABLE = ALIASES.flatMap((a) => a.keys.map((k) => ({canon: a.canon, key: normalizeVi(k), foldKey: fold(normalizeVi(k))}))).filter((k) => k.key.length >= 3);

/** khoảng sửa nhỏ nhất của `key` với MỌI đoạn con của `text` (so khớp gần đúng đoạn con); chuẩn hóa theo độ dài khóa */
function approxContains(text: string, key: string): number {
  const n = text.length;
  const m = key.length;
  if (m === 0) return 1;
  let prev = new Array(n + 1).fill(0); // hàng 0 = 0: đoạn con có thể bắt đầu ở bất kỳ đâu
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (key[i - 1] === text[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.min(...prev) / m;
}

/** Chữ có giống một câu văn (không phải công thức)? Dùng để không đưa chữ tiếng Việt vào ô công thức như thể là công thức. */
export function looksLikeWords(s: string): boolean {
  const plain = (s || '').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}^_\\]/g, '');
  const letters = (plain.match(/[A-Za-zÀ-ỹ]/g) || []).length;
  const len = plain.replace(/\s+/g, '').length;
  if (len < 5 || letters < 5) return false;
  const run = /[A-Za-zÀ-ỹ?]{5,}/.test(plain.replace(/\s+/g, ''));
  const mathy = /[=<>]|\\frac|\\sqrt|sqrt\(|\bsin\b|\bcos\b|\btan\b|\blog\b|\blim\b/.test(plain);
  return run && !mathy && letters / len >= 0.6;
}

export interface ViMatch {
  canon: string;
  key: string;
  /** 0 = trùng khớp hoàn toàn, càng lớn càng lệch */
  distance: number;
}

/**
 * Tìm tên mô phỏng gần nhất trong chữ. Chấp nhận lệch tới ~1/4 độ dài khóa (khóa ngắn thì phải khớp hầu như chính xác),
 * và phải hơn rõ rệt tên mô phỏng khác để tránh mở nhầm.
 */
export function matchViName(text: string): ViMatch | null {
  const n = normalizeVi(text);
  if (n.length < 4) return null;
  const nf = fold(n);
  const scored = TABLE.map((t) => {
    const lim = t.key.length <= 5 ? 0 : t.key.length <= 8 ? 0.2 : 0.3;
    const d1 = approxContains(n, t.key);
    const d2 = t.key.length >= 9 ? approxContains(nf, t.foldKey) + 0.04 : 9; // gộp ký tự hay nhầm chỉ dùng cho khóa dài (khóa ngắn dễ khớp nhầm)
    const d = Math.min(d1, d2);
    return {t, d, lim};
  }).filter((x) => x.d <= x.lim + 1e-9);
  if (!scored.length) return null;
  // khóa dài hơn (cụ thể hơn) thắng khi độ lệch tương đương: "con lac kep" thắng "con lac"
  scored.sort((a, b) => a.d - b.d || b.t.key.length - a.t.key.length);
  const best = scored[0];
  const rival = scored.find((x) => x.t.canon !== best.t.canon);
  if (rival && rival.d - best.d < 0.05 && rival.t.key.length >= best.t.key.length) return null;
  return {canon: best.t.canon, key: best.t.key, distance: best.d};
}
