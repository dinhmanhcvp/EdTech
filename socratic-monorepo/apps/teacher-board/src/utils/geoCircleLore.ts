/**
 * Dựng hình các đề đường tròn (đề tuyển sinh lớp 10): điểm trên cung, dây, đường kính, cát tuyến, tiếp tuyến, giao điểm với đường tròn,
 * phân giác, đường vuông góc/song song qua một điểm… Mỗi điểm mới có CÔNG THỨC theo các điểm gốc (GeoDef) nên kéo đỉnh thì cả hình theo.
 * Đọc câu theo từng câu (không tách ở dấu phẩy) và chạy nhiều vòng để điểm dựng sau dùng được điểm dựng trước.
 */
import {add, len, mul, norm, sub, type V3} from './solids';
import type {GeoCircle, GeoDef} from './geometryProblem';

export interface LoreApi {
  P: (n: string) => V3 | undefined;
  has: (n: string) => boolean;
  define: (name: string, p: V3, note: string) => void;
  setDef: (name: string, d: GeoDef) => void;
  addAux: (a: string, b: string) => void;
  markLoose: (n: string) => void;
  /** đường tròn chính của đề (đường tròn đầu tiên) */
  circle: () => GeoCircle | undefined;
  /** tên điểm tâm đường tròn */
  centerName: (c: GeoCircle) => string | undefined;
  /** điểm có tên nằm trên đường tròn (để lấy bán kính theo công thức); '' nếu chưa có */
  onCircle: (c: GeoCircle) => string;
  /** đường tròn chưa gắn điểm nào thì gắn vào điểm `n` (đường tròn đi qua n, tâm giữ nguyên) */
  bind: (c: GeoCircle, n: string) => void;
  notes: string[];
  ignored: string[];
}

const N = "([A-Z]'?)";
const deg = (d: number) => (d * Math.PI) / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ang = (O: V3, p: V3) => Math.atan2(p[1] - O[1], p[0] - O[0]);
const onC = (c: GeoCircle, a: number): V3 => [c.center[0] + c.r * Math.cos(a), c.center[1] + c.r * Math.sin(a), 0];
const SLOT_FULL = [118, 62, 152, 28, 100, 80, 135, 45];
const SLOT_LOWER = [235, 305, 260, 215, 285];

/** Viết lại các câu nhiều điểm/nhiều mệnh đề thành các mệnh đề đơn mà bộ dựng hiểu; chạy trước khi tách câu. */
export function expandLore(t0: string): string {
  let t = t0.replace(/([A-Za-z0-9')])\s*\.\s*([A-Z]'?)(?=\s+(?:là|thuộc|nằm|cắt)(?![\p{L}]))/gu, '$1; $2').replace(/([A-Za-z0-9')])\.([A-ZĐ][a-zà-ỹ])/gu, '$1; $2');
  t = t.replace(/[Qq]ua\s*([A-Z]'?)\s*(?:kẻ|vẽ)\s*[Tt]iếp tuyến\s*(?:với|của)\s*(?:nửa\s*)?(?:đường tròn\s*)?\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\)\s*,?\s*(?:nó\s*)?cắt\s*(?:tia\s*|đường thẳng\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, '$3 là giao tiếp tuyến tại $1 với $2');
  // đường cao: "hai đường cao BE và CF của tam giác ABC cắt nhau tại H", "AD, BE, CF là ba đường cao cắt nhau tại H"
  const cev = (list: string, tri: string | undefined, h: string | undefined) => {
    const segs = list.match(/[A-Z]'?[A-Z]'?/g) ?? [];
    return [...segs.map((s) => `đường cao ${s}`), ...(h ? [`${h} là trực tâm${tri ? ` tam giác ${tri}` : ''}`] : [])].join('; ');
  };
  t = t.replace(/(?:(?:các|hai|ba)\s*)?đường cao\s*((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)+[A-Z]'?[A-Z]'?)\s*(?:của\s*(?:tam giác|∆|△)?\s*([A-Z]{3}))?\s*(?:cắt nhau\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?/gu, (_m, l: string, tri?: string, h?: string) => cev(l, tri, h));
  t = t.replace(/((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)+[A-Z]'?[A-Z]'?)\s*là\s*(?:ba|hai|các|[23])\s*đường cao\s*(?:của\s*(?:tam giác|∆|△)?\s*([A-Z]{3}))?\s*(?:cắt nhau\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?/gu, (_m, l: string, tri?: string, h?: string) => cev(l, tri, h));
  t = t.replace(/(?<![\p{L}A-Z'])([A-Z]'?[A-Z]'?)\s*là\s*(?:một\s*)?đường cao/gu, 'đường cao $1');
  t = t.replace(/(?:[Đđ]ường\s*)?phân giác\s*(?:trong\s*)?góc\s*([A-Z])([A-Z])([A-Z])\s*cắt\s*(?:các\s*)?(?:cạnh\s*|tia\s*)?([A-Z])([A-Z])\s*(?:,|và)\s*(?:cạnh\s*|tia\s*)?([A-Z])([A-Z])\s*(?:lần lượt\s*|theo thứ tự\s*)?(?:tại|ở)\s*([A-Z])\s*(?:,|và)\s*([A-Z])/gu, '$8 là giao phân giác góc $1$2$3 với $4$5; $9 là giao phân giác góc $1$2$3 với $6$7');
  t = t.replace(/(?:[Đđ]ường thẳng\s*)?(?:đi\s*)?qua\s*([A-Z]'?)\s*(?:kẻ\s*)?(?:đường thẳng\s*)?(?:,|và)?\s*(vuông góc|song song)\s*(?:với\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)?\s*cắt\s*(?:các\s*)?(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|cạnh\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|cạnh\s*)?([A-Z]'?[A-Z]'?)\s*(?:lần lượt\s*|theo thứ tự\s*)?(?:tại|ở)\s*(?:các\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:,|và)\s*([A-Z]'?)(?![A-Za-z'])/gu, '$1 kẻ $2 $3 cắt $4 tại $6; $1 kẻ $2 $3 cắt $5 tại $7');
  // "cắt AB, AC lần lượt tại E và D" → "cắt AB tại E; cắt AC tại D"
  t = t.replace(/cắt\s*(?:các\s*)?(?:cạnh\s*|tia\s*|đường thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)\s*(?:cạnh\s*|tia\s*|đường thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:lần lượt\s*|theo thứ tự\s*)?(?:tại|ở)\s*(?:các\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:,|và)\s*([A-Z]'?)(?![A-Za-z'])/gu, 'cắt $1 tại $3; cắt $2 tại $4');
  t = t.replace(/(?:[Kk]ẻ\s*|[Vv]ẽ\s*)?([A-Z]'?)([A-Z]'?)\s*là\s*(?:một\s*)?tiếp tuyến\s*của/gu, 'kẻ tiếp tuyến $1$2 với');
  t = t.replace(/(?:[Vv]ẽ\s*)?(?:tia\s*)?([A-Z]'?)x\s*là\s*(?:một\s*)?tiếp tuyến\s*(?:của\s*(?:nửa\s*)?(?:đường tròn\s*)?(?:\(\s*[A-Z]'?\s*[^)]*\)\s*)?)?(?:tại\s*\1)?\s*,?\s*\1x\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, '$3 là giao tiếp tuyến tại $1 với $2');
  t = t.replace(/([A-Z]'?)([A-Z]'?)\s*(?:,|và)\s*\1([A-Z]'?)\s*là\s*(?:hai\s*)?tiếp tuyến\s*(?:cắt nhau\s*(?:tại|ở)\s*\1)?/gu, 'tiếp tuyến $1$2, $1$3');
  t = t.replace(/(?<![\p{L}A-Z'])([A-Z]'?)([A-Z]'?)\s*là\s*(?:một\s*)?tiếp tuyến(?!\s*(?:của|tại|với))/gu, 'kẻ tiếp tuyến $1$2 với đường tròn');
  // chân đường vuông góc / hình chiếu (một hoặc hai điểm)
  t = t.replace(/((?:[A-Z]'?\s*(?:,|và)\s*)+[A-Z]'?)\s*(?:lần lượt\s*)?là\s*(?:các\s*)?(?:chân|hình chiếu)\s*(?:vuông góc\s*)?(?:của\s*)?(?:các\s*)?(?:đường vuông góc\s*)?(?:kẻ\s*)?(?:từ\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:đến|lên|trên|xuống)\s*(?:các\s*)?(?:đường thẳng\s*)?((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*(?:đường thẳng\s*)?)+[A-Z]'?[A-Z]'?)/gu, (m0, ns: string, from: string, ls: string) => {
    const a = ns.match(/[A-Z]'?/g) ?? [];
    const b = ls.match(/[A-Z]'?[A-Z]'?/g) ?? [];
    return a.length === b.length ? a.map((n, i) => `${n} là hình chiếu của ${from} lên ${b[i]}`).join('; ') : m0;
  });
  t = t.replace(/([A-Z]'?)\s*là\s*(?:hình chiếu\s*vuông góc|chân\s*(?:của\s*)?(?:đường\s*)?vuông góc)\s*(?:của\s*)?(?:kẻ\s*|hạ\s*)?(?:từ\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:đến|xuống|lên|trên)\s*(?:đường thẳng\s*)?([A-Z]'?[A-Z]'?)/gu, '$1 là hình chiếu của $2 lên $3');
  // đường tròn ngoại tiếp: "tâm O của đường tròn ngoại tiếp tứ giác BFEC"
  t = t.replace(/tâm\s*([A-Z]'?)\s*của\s*đường tròn\s*ngoại tiếp\s*(?:tứ giác|tam giác)\s*([A-Z]{3,4})/gu, (_m, o: string, ns: string) => `${o} là tâm đường tròn ngoại tiếp ${ns.length === 4 ? 'tứ giác' : 'tam giác'} ${ns}`);
  t = t.replace(/trung điểm\s*([A-Z]'?)\s*của\s*(?:đoạn thẳng\s*|dây\s*)?([A-Z]'?[A-Z]'?)(?![A-Za-z'])/gu, '$1 là trung điểm $2');
  t = t.replace(/hai\s*đường kính\s*([A-Z]'?[A-Z]'?)\s*(?:,|và)\s*([A-Z]'?[A-Z]'?)\s*vuông góc(?:\s*(?:tại|ở)\s*[A-Z]'?)?/gu, 'đường kính $1; đường kính $2 vuông góc đường kính $1');
  t = t.replace(/(?<=(?:[Kk]ẻ|[Vv]ẽ|[Qq]ua[^.;]{0,30})\s*)đường kính\s*([A-Z]'?[A-Z]'?)\s*(?:của\s*(?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?\s*)?cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|cạnh\s*|dây(?:\s*cung)?\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, 'đường kính $1; $1 giao $2 tại $3');
  t = t.replace(/([A-Z]'?)\s*là\s*giao điểm\s*(?:thứ\s*(?:hai|2)\s*)?(?:của\s*)?(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:và|với)\s*(?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?/gu, '$2 cắt đường tròn tại điểm thứ hai $1');
  // giao điểm của hai đường: nhiều cách nói → "XY giao ZW tại P"
  t = t.replace(/([A-Z]'?)\s*(?:,|và)\s*([A-Z]'?)\s*lần lượt là\s*(?:các\s*)?giao điểm của\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:với|và)\s*(?:đường thẳng\s*|tia\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)\s*(?:đường thẳng\s*|tia\s*)?([A-Z]'?[A-Z]'?)/gu, '$3 giao $4 tại $1; $3 giao $5 tại $2');
  t = t.replace(/(?:giao điểm\s*(?:của\s*)?)(?:hai\s*)?(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:với|và|,)\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)(?![A-Za-z'])/gu, '$1 giao $2');
  t = t.replace(/(?:(?:hai\s*)?(?:đường thẳng|tia|đoạn thẳng|đoạn|dây cung|dây)\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)\s*(?:(?:đường thẳng|tia|đoạn thẳng|đoạn|dây cung|dây)\s*)?([A-Z]'?[A-Z]'?)\s*(?:là hai (?:dây cung|dây|đường thẳng)\s*)?cắt nhau\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)/gu, '$1 giao $2 tại $3');
  t = t.replace(/(?<![\p{L}A-Z'])(?:(?:đường thẳng|tia|đoạn thẳng|đoạn)\s*)?([A-Z]'?[A-Z]'?)\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|đoạn\s*|cạnh\s*)?[A-Z]'?[A-Z]'?\s*(?:tại|ở)\s*(?:điểm\s*)?[A-Z]'?\s*(?:,|và)\s*cắt\s*((?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?)\s*(?:tại|ở)\s*(?:điểm\s*)?(?:thứ\s*(?:hai|2)\s*)?(?:là\s*)?([A-Z]'?)(?![A-Za-z'])/gu, (m0, xy: string, circ: string, q: string) => `${m0}; ${xy} cắt ${circ} tại ${q}`);
  t = t.replace(/(?<!(?:vuông góc|song song|đường kính)\s*(?:với\s*)?)(?<![\p{L}A-Z'])(?:(?:đường thẳng|tia|đoạn thẳng|đoạn)\s*)?([A-Z]'?[A-Z]'?)\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|đoạn\s*|cạnh\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, '$1 giao $2 tại $3');
  // tiếp tuyến tại một điểm cắt đường thẳng / cắt nhau
  t = t.replace(/(?:[Cc]ác\s*)?[Tt]iếp tuyến\s*(?:với|của)?\s*(?:đường tròn\s*\(\s*[A-Z]'?\s*\)\s*|nửa đường tròn\s*\(\s*[A-Z]'?\s*\)\s*)?tại\s*(?:các\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:,|và)\s*([A-Z]'?)\s*(?:cắt nhau\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))/gu, '$3 là giao tiếp tuyến tại $1 và tại $2');
  t = t.replace(/[Tt]iếp tuyến\s*(?:với|của)?\s*(?:đường tròn\s*\(\s*[A-Z]'?\s*\)\s*|nửa đường tròn\s*\(\s*[A-Z]'?\s*\)\s*)?tại\s*(?:điểm\s*)?([A-Z]'?)\s*(?:của\s*(?:nửa\s*)?(?:đường tròn\s*)?(?:\(\s*[A-Z]'?\s*\))?\s*)?cắt\s*tiếp tuyến\s*tại\s*([A-Z]'?)\s*(?:và\s*(?:tại\s*)?([A-Z]'?))?\s*(?:của\s*(?:nửa\s*)?(?:đường tròn\s*)?(?:\(\s*[A-Z]'?\s*\))?\s*)?(?:lần lượt\s*)?(?:tại|ở)\s*([A-Z]'?)\s*(?:và\s*([A-Z]'?))?/gu, (_m, t0: string, a: string, b: string | undefined, p: string, q: string | undefined) => (b && q ? `${p} là giao tiếp tuyến tại ${t0} và tại ${a}; ${q} là giao tiếp tuyến tại ${t0} và tại ${b}` : `${p} là giao tiếp tuyến tại ${t0} và tại ${a}`));
  t = t.replace(/[Tt]iếp tuyến\s*(?:với|của)?\s*(?:(?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?\s*)?tại\s*(?:điểm\s*)?([A-Z]'?)\s*(?:(?:của|với)\s*(?:nửa\s*)?(?:đường tròn\s*)?(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?\s*)?,?\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, '$3 là giao tiếp tuyến tại $1 với $2');
  // đường thẳng qua P vuông góc/song song XY cắt UV tại Q
  t = t.replace(/(?:[Đđ]ường thẳng\s*)?(?:đi\s*)?qua\s*([A-Z]'?)\s*(?:kẻ\s*)?(?:đường thẳng\s*)?(?:,|và)?\s*(vuông góc|song song)\s*(?:với\s*)?([A-Z]'?[A-Z]'?)\s*(?:,|và)?\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|cạnh\s*|các tia\s*)?([A-Z]'?[A-Z]'?)\s*(?:,\s*)?(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?:\s*,\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|đoạn\s*|cạnh\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?(?![A-Za-z'])/gu, (_m, p: string, kind: string, ab: string, uv: string, q: string, uv2?: string, q2?: string) => `${p} kẻ ${kind} ${ab} cắt ${uv} tại ${q}${uv2 && q2 ? `; ${p} kẻ ${kind} ${ab} cắt ${uv2} tại ${q2}` : ''}`);
  t = t.replace(/(?:[Đđ]ường thẳng\s*)?vuông góc\s*(?:với\s*)?([A-Z]'?[A-Z]'?)\s*tại\s*([A-Z]'?)\s*cắt\s*(?:đường thẳng\s*|tia\s*|đoạn thẳng\s*|cạnh\s*)?([A-Z]'?[A-Z]'?)\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/gu, '$2 kẻ vuông góc $1 cắt $3 tại $4');
  return t;
}

interface State {
  slot: number;
  lower: number;
}

/** Chạy một vòng dựng trên các câu; trả về số điểm mới tạo ra. */
export function runCircleLore(api: LoreApi, sentences: string[], st: State): number {
  const {P, has, define, setDef, addAux, markLoose} = api;
  let made = 0;
  const mk = (name: string, p: V3, note: string, def?: GeoDef) => {
    if (has(name)) return;
    define(name, p, note);
    if (def) setDef(name, def);
    if (has(name)) made++;
  };
  const circ = () => api.circle();
  const O = () => {
    const c = circ();
    return c ? api.centerName(c) : undefined;
  };
  const rad = (c: GeoCircle) => {
    const q = api.onCircle(c);
    return {q, r: q ? 0 : c.r};
  };

  // đầu mút của đường kính sẽ dựng ("kẻ đường kính CD"): vị trí do đường kính quyết định, không đặt theo "C thuộc cung nhỏ AB"
  const tanPts = new Set<string>();
  for (const s1 of sentences) for (const tm of s1.matchAll(/tiếp tuyến\s*(?:thứ\s*(?:hai|2)\s*)?([A-Z]'?)([A-Z]'?)(?:\s*(?:,|và)?\s*\1([A-Z]'?))?/gu)) [tm[2], tm[3]].forEach((n) => n && tanPts.add(n));
  const diaEnds = new Set<string>();
  for (const s1 of sentences) for (const dm of s1.matchAll(/đường kính\s*([A-Z]'?)([A-Z]'?)(?![A-Za-z'])/gu)) if (!(api.has(dm[1]) && api.has(dm[2]))) diaEnds.add(dm[1]).add(dm[2]);
  for (const s0 of sentences) {
    // bỏ phần yêu cầu chứng minh/tính (đến ý kế tiếp a/, b), c/ nếu đề viết liền một dòng)
    const s = s0.replace(/(?:Chứng minh|chứng minh|CM rằng|Tính |Tìm |Xác định vị trí)[\s\S]*?(?=\s[a-e]\s*[/)]\s|$)/gu, ' ').trim();
    if (!s) continue;
    let r: RegExpExecArray | null;
    const c = circ();
    const o = O();
    const oP = o ? P(o) : undefined;

    // ---- điểm trên cung / đường tròn
    if (c && oP) {
      const ARC = String.raw`(?:cung\s*(nhỏ|lớn)?\s*([A-Z])([A-Z])\s*(nhỏ|lớn)?|nửa\s*đường tròn|đường tròn)`;
      const place = (X: string, arc: RegExpExecArray | null, off: number) => {
        if (has(X) || diaEnds.has(X)) return;
        const XN = X;
        const [kind, e1, e2, kind2] = arc ? [arc[off], arc[off + 1], arc[off + 2], arc[off + 3]] : [undefined, undefined, undefined, undefined];
        const k = (kind ?? kind2) as string | undefined;
        let a: number;
        if (e1 && e2 && has(e1) && has(e2)) {
          const a1 = ang(oP, P(e1)!);
          let d = wrap(ang(oP, P(e2)!) - a1);
          if (k === 'lớn') d -= Math.sign(d || 1) * 2 * Math.PI;
          a = a1 + d * [0.4, 0.62, 0.3, 0.72][st.slot++ % 4];
        } else if ((r = new RegExp(String.raw`sao cho\s*([A-Z])${XN}\s*=\s*R(?![\p{L}\d])`, 'u').exec(s)) && has(r[1]) && c.r > 0) {
          // "lấy điểm A sao cho BA = R": dây bằng bán kính nên cung 60° tính từ B, về phía nửa trên
          const a1 = ang(oP, P(r[1])!);
          a = Math.sin(a1 + deg(60)) >= Math.sin(a1 - deg(60)) ? a1 + deg(60) : a1 - deg(60);
        } else if (/nửa/.test(arc?.[0] ?? '')) a = deg(SLOT_FULL[st.slot++ % SLOT_FULL.length]);
        else a = deg(SLOT_FULL[st.slot++ % SLOT_FULL.length]);
        const p = onC({...c, center: oP}, a);
        const q = api.onCircle(c);
        mk(X, p, `${X} thuộc ${arc?.[0] ?? 'đường tròn'}`);
        if (has(X)) {
          markLoose(X);
          if (!q) api.bind(c, X);
        }
      };
      const re1 = new RegExp(String.raw`(?<![\p{L}A-Z'])([A-Z]'?)\s*(?:là\s*(?:một\s*)?điểm\s*)?(?:bất\s*kì\s*|bất\s*kỳ\s*|tùy\s*ý\s*)?(?:thuộc|nằm\s*trên|trên)\s*${ARC}`, 'u');
      if ((r = re1.exec(s)) && !/tiếp tuyến|tia\s*[A-Z]x|[A-Z]x\b/.test(r[0]) && !has(r[1]) && !/^(?:tiếp|đường|nửa|cung|dây|cạnh)/.test(r[1])) place(r[1], r, 2);
      const re2 = new RegExp(String.raw`(?:Trên|trên)\s*${ARC}\s*(?:\([^)]*\)\s*)?[^.;]*?(?:lấy|chọn)\s*(?:điểm\s*)?([A-Z]'?)`, 'u');
      if ((r = re2.exec(s)) && !has(r[5])) place(r[5], r, 1);
    }

    // ---- "C ∈ (O)", "C thuộc (O)": điểm trên đường tròn
    if (c && oP && (r = /(?<![\p{L}A-Z'])([A-Z]'?)\s*thuộc\s*\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\)/u.exec(s)) && !has(r[1])) {
      const a = deg(SLOT_FULL[st.slot++ % SLOT_FULL.length]);
      mk(r[1], onC({...c, center: oP}, a), `${r[1]} thuộc đường tròn`);
      if (has(r[1])) markLoose(r[1]);
    }

    // ---- "bán kính CO vuông góc với AB": C là đầu mút bán kính vuông góc đường kính AB (O là tâm)
    if (c && o && oP && (r = new RegExp(String.raw`[Bb]án kính\s*([A-Z]'?)${o}\s*vuông góc\s*(?:với\s*)?([A-Z]'?)([A-Z]'?)`, 'u').exec(s)) && !has(r[1]) && has(r[2]) && has(r[3])) {
      const { q, r: rr } = rad(c);
      const u = norm(sub(P(r[3])!, P(r[2])!));
      mk(r[1], add(oP, mul([-u[1], u[0], 0], c.r)), `bán kính ${r[1]}${o} vuông góc ${r[2]}${r[3]}`, {k: 'rad', o, q, r: rr, mode: 'perp', a: r[2], b: r[3], f: 1});
      if (has(r[1])) addAux(r[1], o);
    }

    // ---- điểm chính giữa cung
    if (c && oP && (r = new RegExp(String.raw`(?:${N}\s*là\s*điểm\s*chính\s*giữa\s*(?:của\s*)?|điểm\s*chính\s*giữa\s*${N}\s*của\s*)cung\s*(nhỏ|lớn)?\s*([A-Z])([A-Z])\s*(nhỏ|lớn)?`, 'u').exec(s) ?? null) && !has(r[1] ?? r[2]) && has(r[4]) && has(r[5])) {
      const nm = r[1] ?? r[2];
      const f = (r[3] ?? r[6]) === 'lớn' ? -1 : 1;
      mk(nm, add(oP, mul(norm(sub(mul(add(P(r[4])!, P(r[5])!), 0.5), oP)), c.r * f)), `${nm} là điểm chính giữa cung ${r[4]}${r[5]}`, {k: 'rad', o: o!, ...rad(c), mode: 'mid', a: r[4], b: r[5], f});
      if (has(nm)) markLoose(nm);
    }

    // ---- dây cung: "dây CD cố định", "dây BC" (hai đầu mới, đặt ở nửa dưới của đường tròn)
    if (c && oP && (r = /(?<![\p{L}])[Dd]ây(?:\s*cung)?\s*([A-Z])([A-Z])(?![A-Za-z'])/u.exec(s)) && !/vuông góc/.test(s)) {
      const [a1, a2] = [r[1], r[2]];
      if (!has(a1) && !has(a2)) {
        const k = st.lower++;
        mk(a1, onC({...c, center: oP}, deg(SLOT_LOWER[(k * 2) % SLOT_LOWER.length] - (k ? 10 : 0))), `dây ${a1}${a2}`);
        mk(a2, onC({...c, center: oP}, deg(SLOT_LOWER[(k * 2 + 1) % SLOT_LOWER.length] + (k ? 10 : 0))), `dây ${a1}${a2}`);
        for (const n of [a1, a2]) if (has(n)) markLoose(n);
        if (has(a1) && !api.onCircle(c)) api.bind(c, a1);
        addAux(a1, a2);
      } else if (has(a1) !== has(a2)) {
        const [e, nw] = has(a1) ? [a1, a2] : [a2, a1];
        mk(nw, onC({...c, center: oP}, ang(oP, P(e)!) + deg(110)), `dây ${a1}${a2}`);
        if (has(nw)) markLoose(nw);
        addAux(a1, a2);
      }
    }

    // ---- đường kính
    if (c && oP && o) {
      for (const dm of s.matchAll(/đường kính\s*([A-Z]'?)([A-Z]'?)(?![A-Za-z'])/gu)) {
        const [x, y] = [dm[1], dm[2]];
        if (has(x) && has(y)) continue;
        const { q, r: rr } = rad(c);
        if (has(x) !== has(y)) {
          const [e, nw] = has(x) ? [x, y] : [y, x];
          mk(nw, sub(mul(oP, 2), P(e)!), `${x}${y} là đường kính`, {k: 'refp', p: e, o});
          addAux(x, y);
          continue;
        }
        // đường kính vuông góc với một dây có sẵn: một đầu về phía cung nhỏ (hoặc lớn) của dây, chân là hình chiếu của tâm lên dây
        const cp = /vuông góc\s*(?:với\s*)?[Dd]ây(?:\s*cung)?\s*([A-Z]'?)([A-Z]'?)(?:\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?/u.exec(s);
        if (cp && has(cp[1]) && has(cp[2])) {
          const big = new RegExp(String.raw`${x}\s*(?:\([^)]*\)\s*)?thuộc\s*cung\s*(?:lớn|[A-Z]{2}\s*lớn)`, 'u').test(s0) ? -1 : 1;
          mk(x, add(oP, mul(norm(sub(mul(add(P(cp[1])!, P(cp[2])!), 0.5), oP)), c.r * big)), `${x}${y} là đường kính vuông góc dây ${cp[1]}${cp[2]}`, {k: 'rad', o, q, r: rr, mode: 'mid', a: cp[1], b: cp[2], f: big});
          if (has(x)) {
            mk(y, sub(mul(oP, 2), P(x)!), `${x}${y} là đường kính`, {k: 'refp', p: x, o});
            addAux(x, y);
            if (cp[3] && !has(cp[3])) {
              const A1 = P(cp[1])!;
              const dd = sub(P(cp[2])!, A1);
              mk(cp[3], add(A1, mul(dd, ((oP[0] - A1[0]) * dd[0] + (oP[1] - A1[1]) * dd[1]) / (dd[0] * dd[0] + dd[1] * dd[1]))), `${cp[3]} là giao ${x}${y} và ${cp[1]}${cp[2]}`, {k: 'foot', p: o, a: cp[1], b: cp[2]});
            }
          }
          continue;
        }
        // cả hai mới: vuông góc với đường kính có sẵn, đi qua trung điểm một dây, hoặc đặt tự do
        const per = /vuông góc\s*(?:với\s*)?(?:đường kính\s*)?([A-Z]'?)([A-Z]'?)(?![A-Za-z'])/u.exec(s);
        const thr = new RegExp(String.raw`[Qq]ua\s*([A-Z]'?)\s*,?\s*(?:kẻ|vẽ)\s*đường kính\s*${x}${y}`, 'u').exec(s);
        // điều kiện chưa dựng xong (vd. N là trung điểm một dây ở câu sau): đợi vòng sau thay vì đặt tạm
        if ((thr && !has(thr[1])) || (per && !(has(per[1]) && has(per[2])) && per[1] !== x && per[1] !== y) || tanPts.has(x) || tanPts.has(y)) continue;
        if (per && has(per[1]) && has(per[2]) && per[1] !== x && per[1] !== y) {
          const u = norm(sub(P(per[2])!, P(per[1])!));
          mk(x, add(oP, mul([-u[1], u[0], 0], c.r)), `${x}${y} là đường kính vuông góc ${per[1]}${per[2]}`, {k: 'rad', o, q, r: rr, mode: 'perp', a: per[1], b: per[2], f: 1});
        } else if (thr && has(thr[1])) {
          mk(x, add(oP, mul(norm(sub(P(thr[1])!, oP)), c.r)), `${x}${y} là đường kính qua ${thr[1]}`, {k: 'rad', o, q, r: rr, mode: 'to', a: thr[1], b: '', f: 1});
        } else {
          mk(x, onC({...c, center: oP}, deg(SLOT_FULL[st.slot++ % SLOT_FULL.length])), `${x}${y} là đường kính`);
          if (has(x)) {
            markLoose(x);
            if (!q) api.bind(c, x);
          }
        }
        if (has(x)) mk(y, sub(mul(oP, 2), P(x)!), `${x}${y} là đường kính`, {k: 'refp', p: x, o});
        if (has(x) && has(y)) addAux(x, y);
      }
    }

    // ---- dây vuông góc với đường kính: "dây CD vuông góc với AB tại I (I nằm giữa A và O)"
    if (c && oP && o) {
      const a1 = /[Dd]ây(?:\s*cung)?\s*([A-Z])([A-Z])\s*vuông góc\s*(?:với\s*)?(?:đường kính\s*)?([A-Z])([A-Z])(?:\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?/u.exec(s);
      const a2 = /đường kính\s*([A-Z])([A-Z])\s*vuông góc\s*(?:với\s*)?[Dd]ây(?:\s*cung)?\s*([A-Z])([A-Z])(?:\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?))?/u.exec(s);
      const g = a1 ? {x: a1[1], y: a1[2], u: a1[3], v: a1[4], z: a1[5]} : a2 ? {x: a2[3], y: a2[4], u: a2[1], v: a2[2], z: a2[5]} : null;
      if (g && has(g.u) && has(g.v) && !has(g.x) && !has(g.y)) {
        const bt = /([A-Z]'?)\s*nằm\s*giữa\s*([A-Z]'?)\s*và\s*([A-Z]'?)/u.exec(s);
        let dd = -0.4;
        if (bt) dd = [bt[2], bt[3]].includes(g.u) ? -0.45 : [bt[2], bt[3]].includes(g.v) ? 0.45 : -0.4;
        const u = norm(sub(P(g.v)!, P(g.u)!));
        const h = add(oP, mul(u, dd * c.r));
        const half = Math.sqrt(Math.max(0, c.r * c.r * (1 - dd * dd)));
        const nrm: V3 = [-u[1], u[0], 0];
        const { q, r: rr } = rad(c);
        const def = (f: number): GeoDef => ({k: 'chd', o, q, r: rr, a: g.u, b: g.v, d: dd, f});
        mk(g.x, add(h, mul(nrm, half)), `dây ${g.x}${g.y} vuông góc ${g.u}${g.v}`, def(1));
        mk(g.y, add(h, mul(nrm, -half)), `dây ${g.x}${g.y} vuông góc ${g.u}${g.v}`, def(-1));
        if (g.z) mk(g.z, h, `${g.z} là giao ${g.x}${g.y} và ${g.u}${g.v}`, def(0));
        addAux(g.x, g.y);
        if (g.z) {
          addAux(g.u, g.v);
        }
      }
    }

    // ---- cát tuyến: "ABC là cát tuyến", "ABC, ADE là hai cát tuyến", "cát tuyến MPQ"; "đường thẳng qua A cắt (O) tại B và C"
    if (c && oP && o) {
      const secs: [string, string, string][] = [];
      const two = /([A-Z])([A-Z])([A-Z])\s*,\s*\1([A-Z])([A-Z])\s*là\s*hai\s*cát tuyến/u.exec(s);
      if (two) secs.push([two[1], two[2], two[3]], [two[1], two[4], two[5]]);
      else if ((r = /(?:cát tuyến\s*([A-Z])([A-Z])([A-Z])|([A-Z])([A-Z])([A-Z])\s*là\s*(?:một\s*)?cát tuyến)/u.exec(s))) secs.push(r[1] ? [r[1], r[2], r[3]] : [r[4], r[5], r[6]]);
      else if ((r = /đường thẳng\s*(?:đi\s*)?qua\s*([A-Z])\s*cắt\s*(?:đường tròn\s*)?(?:\(\s*[A-Z]\s*(?:[;,][^)]*)?\)\s*)?tại\s*(?:hai\s*điểm\s*)?([A-Z])\s*(?:,|và)\s*([A-Z])/u.exec(s))) secs.push([r[1], r[2], r[3]]);
      secs.forEach(([a, p1, p2], k) => {
        if (!has(a)) {
          // điểm ngoài đường tròn
          const out = add(oP, [-2.3 * c.r * Math.cos(deg(12)), -0.45 * c.r, 0]);
          mk(a, out, `${a} ở ngoài đường tròn`);
        }
        if (!has(a)) return;
        const { q, r: rr } = rad(c);
        const dg = k === 0 ? 14 : -16;
        const A0 = P(a)!;
        const dirA = ang(A0, oP) + deg(dg);
        const dx = Math.cos(dirA);
        const dy = Math.sin(dirA);
        const fx = A0[0] - oP[0];
        const fy = A0[1] - oP[1];
        const b = 2 * (fx * dx + fy * dy);
        const disc = b * b - 4 * (fx * fx + fy * fy - c.r * c.r);
        if (disc <= 0) return;
        const t1 = (-b - Math.sqrt(disc)) / 2;
        const t2 = (-b + Math.sqrt(disc)) / 2;
        mk(p1, [A0[0] + dx * t1, A0[1] + dy * t1, 0], `${a}${p1}${p2} là cát tuyến`, {k: 'lcint', o, q, r: rr, a, b: o, deg: dg, w: 1});
        mk(p2, [A0[0] + dx * t2, A0[1] + dy * t2, 0], `${a}${p1}${p2} là cát tuyến`, {k: 'lcint', o, q, r: rr, a, b: o, deg: dg, w: 2});
        if (has(p1) && has(p2)) {
          addAux(a, p1);
          addAux(p1, p2);
        }
      });
    }

    // ---- "trên tia đối của tia AB lấy điểm C": C nằm ngoài đoạn AB, phía A
    if ((r = /(?:Trên|trên)\s*tia đối của tia\s*([A-Z])([A-Z])\s*(?:lấy|chọn)\s*(?:điểm\s*)?([A-Z]'?)/u.exec(s)) && has(r[1]) && has(r[2]) && !has(r[3])) {
      mk(r[3], add(P(r[1])!, mul(sub(P(r[1])!, P(r[2])!), 0.55)), `${r[3]} thuộc tia đối của tia ${r[1]}${r[2]}`, {k: 'seg', a: r[2], b: r[1], t: 1.55});
      if (has(r[3])) addAux(r[1], r[3]);
    }

    // ---- hai dây cắt nhau: "BC, DE là hai dây cung cắt nhau tại A" (đã được viết lại thành "BC giao DE tại A")
    if (c && oP && (r = /(?:Biết\s*)?([A-Z])([A-Z])\s*giao\s*([A-Z])([A-Z])\s*tại\s*([A-Z])(?![A-Za-z'])/u.exec(s)) && /dây/.test(s0) && [r[1], r[2], r[3], r[4]].every((n) => !has(n))) {
      const pl: [string, number][] = [[r[1], 205], [r[2], 25], [r[3], 125], [r[4], 305]];
      for (const [n, a] of pl) mk(n, onC({...c, center: oP}, deg(a)), `dây ${r[1]}${r[2]}, ${r[3]}${r[4]}`);
      const X = lineX(P(r[1])!, P(r[2])!, P(r[3])!, P(r[4])!);
      if (X) mk(r[5], X, `${r[5]} là giao hai dây`, {k: 'inter', a: r[1], b: r[2], c: r[3], d: r[4]});
      for (const n of [r[1], r[2], r[3], r[4]]) if (has(n)) markLoose(n);
      addAux(r[1], r[2]);
      addAux(r[3], r[4]);
    }

    // ---- tiếp điểm kẻ từ điểm ngoài: giữ cho bộ dựng cũ; điểm ngoài ở xa chưa có thì đặt
    if (c && oP && (r = /(?:[Tt]ừ|[Qq]ua)\s*(?:một\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:cố định\s*)?(?:nằm\s*|ở\s*)?(?:bên\s*)?(?:ngoài|kẻ)/u.exec(s)) && !has(r[1]) && /ngoài/.test(s)) {
      mk(r[1], add(oP, [2.4 * c.r, 0.1 * c.r, 0]), `${r[1]} ở ngoài đường tròn`);
    }

    // ---- "tiếp tuyến AB, AC" mà A chưa có: A là điểm ngoài đường tròn
    if (c && oP && (r = /tiếp tuyến\s*([A-Z]'?)([A-Z]'?)\s*(?:,|và)?\s*\1([A-Z]'?)/u.exec(s)) && !has(r[1])) mk(r[1], add(oP, [2.3 * c.r, 0.15 * c.r, 0]), `${r[1]} ở ngoài đường tròn`);

    // ---- "O' đối xứng với O qua BC" / "qua điểm I"
    if ((r = /(?<![\p{L}A-Z])([A-Z]'?)\s*đối xứng\s*với\s*([A-Z]'?)\s*qua\s*(?:đường thẳng\s*|điểm\s*)?([A-Z]'?)([A-Z]'?)?(?![A-Za-z'])/u.exec(s)) && !has(r[1]) && has(r[2])) {
      if (r[4] && has(r[3]) && has(r[4])) {
        const A1 = P(r[3])!;
        const dd = sub(P(r[4])!, A1);
        const f = add(A1, mul(dd, ((P(r[2])![0] - A1[0]) * dd[0] + (P(r[2])![1] - A1[1]) * dd[1]) / (dd[0] * dd[0] + dd[1] * dd[1])));
        mk(r[1], sub(mul(f, 2), P(r[2])!), `${r[1]} đối xứng ${r[2]} qua ${r[3]}${r[4]}`, {k: 'refl', p: r[2], a: r[3], b: r[4]});
      } else if (!r[4] && has(r[3])) mk(r[1], sub(mul(P(r[3])!, 2), P(r[2])!), `${r[1]} đối xứng ${r[2]} qua ${r[3]}`, {k: 'refp', p: r[2], o: r[3]});
    }

    // ---- tiếp tuyến Ax tại A, điểm P trên Ax
    if (c && oP && o && (r = /([A-Z]'?)\s*(?:bất\s*kì\s*|bất\s*kỳ\s*)?(?:trên|thuộc)\s*(?:tia\s*|tiếp tuyến\s*)?([A-Z])x/u.exec(s)) && !has(r[1]) && has(r[2])) {
      const { q, r: rr } = rad(c);
      const f = /AP\s*>\s*R/.test(s) ? 1.5 : 1.35;
      const t = P(r[2])!;
      const u = norm(sub(t, oP));
      mk(r[1], add(t, mul([-u[1], u[0], 0], f * c.r * (t[0] < oP[0] ? -1 : 1))), `${r[1]} thuộc tiếp tuyến tại ${r[2]}`, {k: 'tanpt', o, t: r[2], f: f * (t[0] < oP[0] ? -1 : 1), q, r: rr});
      if (has(r[1])) addAux(r[2], r[1]);
    }

    // ---- tiếp tuyến tại hai điểm cắt nhau: "D là giao tiếp tuyến tại B và tại C"
    if (c && o && (r = /([A-Z]'?)\s*là giao tiếp tuyến tại\s*([A-Z]'?)\s*và\s*tại\s*([A-Z]'?)/u.exec(s)) && !has(r[1]) && has(r[2]) && has(r[3])) {
      const tx = (T: V3): V3 => [T[0] - (T[1] - oP![1]), T[1] + (T[0] - oP![0]), 0];
      const X = oP ? lineX(P(r[2])!, tx(P(r[2])!), P(r[3])!, tx(P(r[3])!)) : null;
      if (X) {
        mk(r[1], X, `${r[1]} là giao hai tiếp tuyến tại ${r[2]} và ${r[3]}`, {k: 'tt', o, t: r[2], u: r[3]});
        if (has(r[1])) {
          addAux(r[2], r[1]);
          addAux(r[3], r[1]);
        }
      }
    }

    // ---- "X giao ZW tại P" khi một đường là đường thẳng đi qua điểm mới...: để vòng dựng cũ xử lý
    // ---- đường thẳng cắt đường tròn tại điểm thứ hai: "AH giao (O) tại D", "MD cắt (O) tại C khác D"
    if (c && o && oP && (r = /(?:[Tt]ia|[Đđ]oạn thẳng|[Đđ]ường thẳng)?\s*([A-Z]'?)([A-Z]'?)\s*(?:cắt|giao)\s*(?:(?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\)|tâm\s*[A-Z]'?)?|\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))\s*(?:tại|ở)\s*(?:điểm\s*)?(?:thứ\s*(?:hai|2)\s*(?:là\s*)?)?([A-Z]'?)(?![A-Za-z'])/u.exec(s)) && !has(r[3]) && has(r[1]) && has(r[2])) {
      const [a, b] = [r[1], r[2]];
      const onc = (n: string) => Math.abs(len(sub(P(n)!, oP)) - c.r) < 1e-6;
      const outside = (n: string) => len(sub(P(n)!, oP)) > c.r * 1.0001;
      const ex = onc(a) ? a : onc(b) ? b : outside(b) && !outside(a) ? `~${b}` : outside(a) && !outside(b) ? `~${a}` : '';
      const A0 = P(a)!;
      const d0 = norm(sub(P(b)!, A0));
      const f = sub(A0, oP);
      const bb = 2 * (f[0] * d0[0] + f[1] * d0[1]);
      const disc = bb * bb - 4 * (f[0] * f[0] + f[1] * f[1] - c.r * c.r);
      if (disc > 1e-12) {
        const ts = [(-bb - Math.sqrt(disc)) / 2, (-bb + Math.sqrt(disc)) / 2].map((t) => add(A0, mul(d0, t)));
        const near = ex.startsWith('~');
        const exP = ex ? P(near ? ex.slice(1) : ex) : undefined;
        const pick = exP ? ts.reduce((u, v) => ((len(sub(v, exP)) > len(sub(u, exP))) !== near ? v : u)) : ts[0];
        const { q, r: rr } = rad(c);
        mk(r[3], pick, `${r[3]} là giao điểm thứ hai của ${a}${b} với đường tròn`, {k: 'lcx', o, q, r: rr, a, b, ex});
        if (has(r[3])) {
          addAux(a, b);
          addAux(ex === a ? b : a, r[3]);
        }
      }
    }

    // ---- một tiếp tuyến kẻ từ điểm ngoài: "kẻ tiếp tuyến DE với nửa đường tròn (O) (E là tiếp điểm)"
    if (c && o && oP && (r = /tiếp tuyến\s*(?:thứ\s*(?:hai|2)\s*)?([A-Z]'?)([A-Z]'?)(?=\s*(?:với|của|tới|\(|,|$))/u.exec(s)) && has(r[1]) && !has(r[2]) && len(sub(P(r[1])!, oP)) > c.r * 1.01) {
      const q = api.onCircle(c);
      if (q) {
        const pick = (w: 1 | -1): V3 => {
          const dd = len(sub(P(r![1])!, oP));
          const u = norm(sub(P(r![1])!, oP));
          const al = Math.acos(c.r / dd);
          const v: V3 = [-u[1], u[0], 0];
          return add(oP, mul(add(mul(u, Math.cos(al)), mul(v, w * Math.sin(al))), c.r));
        };
        const w: 1 | -1 = (() => {
          const p1 = pick(1);
          return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'T'].some((n) => has(n) && len(sub(P(n)!, p1)) < 1e-6) ? -1 : 1;
        })();
        mk(r[2], pick(w), `${r[2]} là tiếp điểm của tiếp tuyến kẻ từ ${r[1]}`, {k: 'tan', p: r[1], o, q, w});
        if (has(r[2])) addAux(r[1], r[2]);
      }
    }

    // ---- đường vuông góc cắt đường tròn: "Kẻ KM vuông góc AB cắt AB tại M, cắt đường tròn (O) tại N" (N ở bên kia AB so với K)
    if (c && o && oP && (r = /([A-Z]'?)([A-Z]'?)\s*vuông góc[^.;]*?cắt\s*(?:(?:nửa\s*)?đường tròn\s*(?:\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))?|\(\s*[A-Z]'?\s*(?:[;,][^)]*)?\))\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Za-z'])/u.exec(s)) && has(r[1]) && has(r[2]) && !has(r[3])) {
      const k = r[1];
      const A0 = P(k)!;
      const d0 = norm(sub(P(r[2])!, A0));
      const f = sub(A0, oP);
      const bb = 2 * (f[0] * d0[0] + f[1] * d0[1]);
      const disc = bb * bb - 4 * (f[0] * f[0] + f[1] * f[1] - c.r * c.r);
      if (disc > 1e-12) {
        const ts = [(-bb - Math.sqrt(disc)) / 2, (-bb + Math.sqrt(disc)) / 2].map((t) => add(A0, mul(d0, t)));
        const pick = len(sub(ts[0], A0)) > len(sub(ts[1], A0)) ? ts[0] : ts[1];
        const { q, r: rr } = rad(c);
        mk(r[3], pick, `${r[3]} là giao của ${k}${r[2]} với đường tròn`, {k: 'lcx', o, q, r: rr, a: k, b: r[2], ex: k});
        if (has(r[3])) addAux(r[2], r[3]);
      }
    }

    // ---- đường tròn ngoại tiếp tam giác XYZ cắt đường thẳng AB tại E: tâm ẩn (#cXYZ), E = giao điểm thứ hai
    if ((r = /đường tròn\s*ngoại tiếp\s*(?:tam giác\s*)?([A-Z])([A-Z])([A-Z])\s*cắt\s*([A-Z])([A-Z])\s*(?:tại|ở)\s*(?:điểm\s*)?([A-Z])(?![A-Za-z'])/u.exec(s)) && [r[1], r[2], r[3], r[4], r[5]].every(has) && !has(r[6])) {
      const [x, y, z] = [r[1], r[2], r[3]];
      const [X0, Y0, Z0] = [P(x)!, P(y)!, P(z)!];
      const ca = sub(X0, Z0);
      const cb = sub(Y0, Z0);
      const den = 2 * (ca[0] * cb[1] - ca[1] * cb[0]);
      if (Math.abs(den) > 1e-9) {
        const hid = `#c${x}${y}${z}`;
        const ux = (cb[1] * (ca[0] * ca[0] + ca[1] * ca[1]) - ca[1] * (cb[0] * cb[0] + cb[1] * cb[1])) / den;
        const uy = (ca[0] * (cb[0] * cb[0] + cb[1] * cb[1]) - cb[0] * (ca[0] * ca[0] + ca[1] * ca[1])) / den;
        const cen: V3 = [Z0[0] + ux, Z0[1] + uy, 0];
        if (!has(hid)) mk(hid, cen, `tâm đường tròn ngoại tiếp ${x}${y}${z}`, {k: 'calc', f: 'circum', n: [x, y, z]});
        const rr0 = len(sub(X0, cen));
        const A0 = P(r[4])!;
        const d0 = norm(sub(P(r[5])!, A0));
        const f = sub(A0, cen);
        const bb = 2 * (f[0] * d0[0] + f[1] * d0[1]);
        const disc = bb * bb - 4 * (f[0] * f[0] + f[1] * f[1] - rr0 * rr0);
        const ex = [r[4], r[5]].find((n) => Math.abs(len(sub(P(n)!, cen)) - rr0) < 1e-6) ?? '';
        if (disc > 1e-12 && has(hid)) {
          const ts = [(-bb - Math.sqrt(disc)) / 2, (-bb + Math.sqrt(disc)) / 2].map((t) => add(A0, mul(d0, t)));
          const pick = ex ? (len(sub(ts[0], P(ex)!)) > len(sub(ts[1], P(ex)!)) ? ts[0] : ts[1]) : ts[0];
          mk(r[6], pick, `${r[6]} là giao điểm của ${r[4]}${r[5]} với đường tròn ngoại tiếp ${x}${y}${z}`, {k: 'lcx', o: hid, q: x, a: r[4], b: r[5], ex});
          if (has(r[6])) addAux(r[4], r[6]);
        }
      }
    }

    // ---- "lấy điểm D trên cạnh AC sao cho AD = AB": D nằm trên tia AC, cách A đoạn bằng AB
    if ((r = /([A-Z]'?)\s*(?:thuộc|trên)\s*(?:cạnh|tia|đoạn thẳng|đoạn)?\s*([A-Z])([A-Z])\s*sao cho\s*([A-Z])([A-Z])\s*=\s*([A-Z])([A-Z])(?![A-Za-z'])/u.exec(s)) && !has(r[1]) && [r[2], r[3], r[6], r[7]].every(has) && [r[4], r[5]].includes(r[1]) && [r[4], r[5]].includes(r[2]) && !(([r[6], r[7]] as string[]).every((n) => n === r![2] || n === r![3]))) {
      const D = r[1];
      const A0 = P(r[2])!;
      mk(D, add(A0, mul(norm(sub(P(r[3])!, A0)), len(sub(P(r[6])!, P(r[7])!)))), `${D} thuộc ${r[2]}${r[3]}, ${r[2]}${D} = ${r[6]}${r[7]}`, {k: 'pdist', a: r[2], c: r[3], r: r[6], s: r[7]});
      if (has(D)) addAux(r[2], D);
    }

    // ---- phân giác góc XYZ cắt AB, AC tại M, N
    if ((r = /([A-Z]'?)\s*là giao phân giác góc\s*([A-Z])([A-Z])([A-Z])\s*với\s*([A-Z])([A-Z])/u.exec(s)) && !has(r[1]) && [r[2], r[3], r[4], r[5], r[6]].every(has)) {
      const [nm, x, v, z, p, q] = [r[1], r[2], r[3], r[4], r[5], r[6]];
      const dir = add(norm(sub(P(x)!, P(v)!)), norm(sub(P(z)!, P(v)!)));
      const X = lineX(P(v)!, add(P(v)!, dir), P(p)!, P(q)!);
      if (X) {
        mk(nm, X, `${nm} là giao của phân giác góc ${x}${v}${z} với ${p}${q}`, {k: 'bisx', v, a: x, c: z, p, q});
        if (has(nm)) addAux(v, nm);
      }
    }

    // ---- đường thẳng qua P song song/vuông góc XY cắt UV tại Q (expandLore viết lại thành "P kẻ song song|vuông góc XY cắt UV tại Q")
    for (const m2 of s.matchAll(/([A-Z]'?)\s*kẻ\s*(song song|vuông góc)\s*([A-Z]'?)([A-Z]'?)\s*cắt\s*([A-Z]'?)([A-Z]'?)\s*tại\s*([A-Z]'?)(?![A-Za-z'])/gu)) {
      const [, p, kind, a, b, u, v, qn] = m2;
      if (!has(p) || !has(a) || !has(b) || !has(u) || !has(v) || has(qn)) continue;
      const d = sub(P(b)!, P(a)!);
      const dir: V3 = kind === 'song song' ? d : [-d[1], d[0], 0];
      const X = lineX(P(p)!, add(P(p)!, dir), P(u)!, P(v)!);
      if (!X) continue;
      mk(qn, X, `${qn} là giao của đường qua ${p} ${kind} ${a}${b} với ${u}${v}`, {k: 'll', p, a, b, r: kind === 'song song' ? 'par' : 'perp', q: u, c: u, d: v, s: 'par'});
      if (has(qn)) addAux(p, qn);
    }
  }
  return made;
}

const lineX = (p1: V3, p2: V3, p3: V3, p4: V3): V3 | null => {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-12) return null;
  const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t, 0];
};
export const newLoreState = (): State => ({slot: 0, lower: 0});
