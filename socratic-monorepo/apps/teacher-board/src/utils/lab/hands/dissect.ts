/**
 * Bài mổ / quan sát cấu tạo của môn Sinh ở phòng thực hành /lab: ếch, tim lợn, cá, hoa, mô hình bán thân người.
 * Mỗi bài là dữ liệu (`DissectSpec`): các bước làm theo thứ tự (ghim, cắt theo đường, kẹp mở lớp, nhỏ thuốc, chỉ tên cơ quan) trên mẫu Blender
 * `public/models/dissect-parts.glb` (`tools/lab-models/dissect_parts.py`; tên nút `<MẪU>_o_<cơ quan>`, `<MẪU>_f_<vạt>`).
 * Logic thuần (`dissectReducer`, `cutAdvance`) để chuột, ngón tay, tay qua webcam và nút trên bảng đi cùng một đường và kiểm được bằng test.
 * Toạ độ (x, z) trên mặt khay theo cảnh three.js: x sang phải, z về phía người nhìn.
 */

export type ToolId = 'scalpel' | 'scissors' | 'forceps' | 'pin' | 'dropper';
export const TOOLS: ToolId[] = ['scalpel', 'scissors', 'forceps', 'pin', 'dropper'];
export const TOOL_NAME: Record<ToolId, string> = {scalpel: 'Dao mổ', scissors: 'Kéo', forceps: 'Kẹp', pin: 'Kim ghim', dropper: 'Ống nhỏ giọt'};

export interface Organ {
  name: string;
  /** cấu tạo và chức năng: hiện trên thẻ ngay cạnh cơ quan */
  fn: string;
  /** đi theo một lớp mở được (động mạch vành trên nửa trước của tim, bao phấn theo nhị) */
  on?: string;
  /** tên nút trong GLB khi khác `<MẪU>_o_<id>` (cánh hoa chính là lớp tách ra được) */
  mesh?: string;
}
/** lớp mở được: quay quanh gốc (bản lề) theo `axis`, `angle` (rad); hoặc nhấc ra: dời `move`, co `scale`, mờ dần `fade` */
export interface Flap {
  label: string;
  axis?: [number, number, number];
  angle?: number;
  move?: [number, number, number];
  scale?: number;
  fade?: boolean;
}
interface StepText {
  do: string;
  why: string;
  see: string;
}
export type DStep =
  | (StepText & {kind: 'pin'; targets: [number, number][]})
  | (StepText & {kind: 'cut'; tool: 'scalpel' | 'scissors'; path: [number, number][]})
  | (StepText & {kind: 'open'; flaps: string[]})
  | (StepText & {kind: 'drop'; organ: string; drug: string})
  | (StepText & {kind: 'name'; organs: string[]});
export interface DissectSpec {
  id: string;
  name: string;
  lesson: string;
  /** tiền tố tên nút trong GLB */
  model: 'FROG' | 'PIG' | 'FISH' | 'FLOWER' | 'HUMAN';
  goal: string;
  safety: string;
  organs: Record<string, Organ>;
  flaps: Record<string, Flap>;
  steps: DStep[];
  conclude: string;
  /** nhịp tim (lần/phút) trước và sau khi nhỏ thuốc, cho mẫu còn sống (ếch) */
  beat?: [number, number];
}

/** dụng cụ bước này cần; bước chỉ tên thì dùng ngón tay hay dụng cụ nào cũng được */
export function toolOf(s: DStep): ToolId | null {
  return s.kind === 'pin' ? 'pin' : s.kind === 'cut' ? s.tool : s.kind === 'open' ? 'forceps' : s.kind === 'drop' ? 'dropper' : null;
}

export interface DissectState {
  tool: ToolId | null;
  /** chỉ số các đích ghim đã cắm, theo bước */
  pins: Record<number, number[]>;
  /** phần đã cắt (0–1 chiều dài đường), theo bước */
  cut: Record<number, number>;
  /** độ mở của từng lớp (0 đóng – 1 mở hẳn) */
  open: Record<string, number>;
  named: string[];
  drops: number;
  warn: string;
}
export const newDissect = (): DissectState => ({tool: null, pins: {}, cut: {}, open: {}, named: [], drops: 0, warn: ''});

/** bước chỉ để quan sát (gọi tên cơ quan): không bắt buộc, không tính là bước đang làm */
export const optionalStep = (s: DStep): boolean => s.kind === 'name';
export function stepDone(spec: DissectSpec, st: DissectState, i: number): boolean {
  const s = spec.steps[i];
  switch (s.kind) {
    case 'pin':
      return (st.pins[i]?.length ?? 0) >= s.targets.length;
    case 'cut':
      return (st.cut[i] ?? 0) >= 1;
    case 'open':
      return s.flaps.every((f) => (st.open[f] ?? 0) >= 1);
    case 'drop':
      return st.drops > 0;
    case 'name':
      // gọi tên cơ quan là phần QUAN SÁT tự do (thẻ tên + chức năng hiện khi trỏ / giữ tay trên cơ quan), không chặn bước sau
      return true;
  }
}
/** bước đang làm = bước đầu tiên chưa xong; bằng số bước khi đã xong hết */
export function current(spec: DissectSpec, st: DissectState): number {
  const i = spec.steps.findIndex((_, n) => !stepDone(spec, st, n));
  return i < 0 ? spec.steps.length : i;
}
/** cơ quan đã lộ ra (bước chỉ tên nó đã tới) thì mới chỉ vào được */
export function reachable(spec: DissectSpec, st: DissectState, organ: string): boolean {
  const cur = current(spec, st);
  return spec.steps.some((s, i) => s.kind === 'name' && i <= cur && s.organs.includes(organ));
}
export const beatRate = (spec: DissectSpec, st: DissectState): number => (spec.beat ? spec.beat[st.drops > 0 ? 1 : 0] : 0);

export type DAction =
  | {t: 'tool'; tool: ToolId | null}
  | {t: 'pin'; i: number}
  | {t: 'cut'; s: number}
  | {t: 'open'; flap: string; v: number}
  | {t: 'drop'}
  | {t: 'name'; organ: string}
  /** chạm đúng chỗ của bước đang làm nhưng cầm sai dụng cụ */
  | {t: 'wrong'}
  | {t: 'reset'};

const needTool = (spec: DissectSpec, i: number) => {
  const t = toolOf(spec.steps[i]);
  return t ? `Cầm ${TOOL_NAME[t].toLowerCase()} để làm bước này: ${spec.steps[i].do.toLowerCase()}.` : '';
};

export function dissectReducer(spec: DissectSpec, st: DissectState, a: DAction): DissectState {
  if (a.t === 'reset') return newDissect();
  if (a.t === 'tool') return {...st, tool: a.tool, warn: ''};
  const cur = current(spec, st);
  const step = spec.steps[cur];
  if (a.t === 'name') {
    if (!spec.organs[a.organ]) return st;
    if (!reachable(spec, st, a.organ)) return {...st, warn: 'Chưa nhìn rõ bộ phận này: làm xong các bước trước đã.'};
    return st.named.includes(a.organ) ? {...st, warn: ''} : {...st, named: [...st.named, a.organ], warn: ''};
  }
  if (a.t === 'wrong') return step ? {...st, warn: needTool(spec, cur)} : st;
  if (!step) return st;
  const kind = a.t === 'pin' ? 'pin' : a.t === 'cut' ? 'cut' : a.t === 'open' ? 'open' : 'drop';
  if (step.kind !== kind) return {...st, warn: `Chưa tới lúc này. Bước ${cur + 1}: ${step.do}.`};
  if (st.tool !== toolOf(step)) return {...st, warn: needTool(spec, cur)};
  switch (a.t) {
    case 'pin': {
      const have = st.pins[cur] ?? [];
      if (step.kind !== 'pin' || a.i < 0 || a.i >= step.targets.length || have.includes(a.i)) return st;
      return {...st, pins: {...st.pins, [cur]: [...have, a.i]}, warn: ''};
    }
    case 'cut': {
      const s = a.s >= 0.97 ? 1 : Math.max(0, Math.min(1, a.s));
      return s > (st.cut[cur] ?? 0) ? {...st, cut: {...st.cut, [cur]: s}, warn: ''} : st;
    }
    case 'open':
      if (step.kind !== 'open' || !step.flaps.includes(a.flap)) return st;
      return {...st, open: {...st.open, [a.flap]: a.v >= 0.98 ? 1 : Math.max(0, a.v)}, warn: ''};
    case 'drop':
      return {...st, drops: st.drops + 1, warn: ''};
  }
}

// ------------------------------------------------------------------ chỗ đặt nhãn ✓
/** khoảng x (thế giới) dọc mép sau khay để xếp nhãn ✓, và các hàng z (hàng đầu gần mẫu nhất) */
export const TAG_X: [number, number] = [-2.2, 2.4];
const TAG_ROWS2 = [-1.8, -1.45];
const TAG_ROWS3 = [-1.8, -1.45, -2.15];
/**
 * Chỗ (x, z) cho `n` nhãn ✓ đã sắp theo x của cơ quan, quanh tâm `mid`: cách đều 0,85 khi đủ chỗ; nhiều nhãn thì khít lại cho vừa mép khay
 * và xếp ba hàng so le để nhãn cùng hàng vẫn cách nhau ≥ 1,3 (nhãn dài nhất rộng ≈ 1,2 ở góc nhìn hẹp nhất): không nhãn nào chồng hay bị ẩn vì chật.
 */
export function tagSlots(n: number, mid: number): [number, number][] {
  const span = TAG_X[1] - TAG_X[0];
  const step = n > 1 ? Math.min(0.85, span / (n - 1)) : 0;
  const rows = step * 2 >= 1.3 || n <= 2 ? TAG_ROWS2 : TAG_ROWS3;
  const x0 = Math.max(TAG_X[0], Math.min(TAG_X[1] - (n - 1) * step, mid - ((n - 1) * step) / 2));
  return Array.from({length: n}, (_, i) => [x0 + i * step, rows[i % rows.length]]);
}

// ------------------------------------------------------------------ bám đường cắt
const segLen = (p: [number, number][]) => p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1]));
export const pathLength = (p: [number, number][]) => segLen(p).reduce((a, b) => a + b, 0);
/** điểm ở phần `u` (0–1) chiều dài đường */
export function pointAt(p: [number, number][], u: number): [number, number] {
  const L = segLen(p);
  let left = Math.max(0, Math.min(1, u)) * L.reduce((a, b) => a + b, 0);
  for (let i = 0; i < L.length; i++) {
    if (left <= L[i] || i === L.length - 1) {
      const t = L[i] ? Math.min(1, left / L[i]) : 0;
      return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t];
    }
    left -= L[i];
  }
  return p[p.length - 1];
}
/**
 * Lưỡi dao bám đường cắt: tìm điểm gần nhất trên đường trong đoạn [0, đã cắt + `ahead`] (không nhảy cóc ra xa phía trước);
 * nếu cách tay không quá `tol` thì phần đã cắt tiến tới điểm đó. Tay rung hay đi lệch nhẹ vẫn cắt đúng đường: dễ làm bằng tay qua webcam.
 * Trả `s` = phần đã cắt mới, `d` = khoảng cách từ tay tới đường, `at` = chỗ đặt lưỡi dao.
 */
export function cutAdvance(path: [number, number][], prog: number, x: number, z: number, tol = 0.4, ahead = 0.6): {s: number; d: number; at: [number, number]} {
  const L = segLen(path);
  const total = L.reduce((a, b) => a + b, 0) || 1;
  const limit = prog * total + ahead;
  let best = {sAbs: 0, d: Infinity, at: path[0]};
  let acc = 0;
  for (let i = 0; i < L.length; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const len = L[i] || 1e-9;
    let t = ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (len * len);
    t = Math.max(0, Math.min(1, t, (limit - acc) / len));
    if (t >= 0) {
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = {sAbs: acc + t * len, d, at: [px, pz]};
    }
    acc += len;
    if (acc > limit) break;
  }
  const s = best.d <= tol ? Math.max(prog, best.sAbs / total) : prog;
  return {s, d: best.d, at: best.at};
}

// ------------------------------------------------------------------ năm bài
const ell = (cx: number, cz: number, rx: number, rz: number, from: number, to: number, n = 9): [number, number][] =>
  Array.from({length: n}, (_, i) => {
    const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
    return [+(cx + rx * Math.cos(a)).toFixed(3), +(cz + rz * Math.sin(a)).toFixed(3)];
  });

export const DISSECTIONS: DissectSpec[] = [
  {
    id: 'dissect-frog',
    name: 'Mổ ếch quan sát tim và nội quan',
    lesson: 'Sinh 11, bài 11 (hoạt động của tim ếch)',
    model: 'FROG',
    goal: 'Mổ ếch (đã gây mê) đúng trình tự: ghim, cắt theo đường giữa bụng, lật vạt, ghim vạt; gọi tên tim, phổi, gan, dạ dày, ruột; nhỏ adrenaline lên tim và so sánh nhịp tim trước và sau.',
    safety: 'Ếch đã được gây mê sâu theo đúng quy định; đeo găng tay; mũi kéo luôn hướng lên để không chọc thủng nội quan; rửa và lau khô dụng cụ sau khi mổ.',
    beat: [42, 70],
    organs: {
      heart: {name: 'Tim', fn: 'Tim ếch có 3 ngăn (2 tâm nhĩ, 1 tâm thất). Vẫn tự co bóp nhịp nhàng sau khi mổ nhờ hệ dẫn truyền tự động của tim.'},
      lung: {name: 'Phổi', fn: 'Hai túi mỏng có ít vách ngăn, trao đổi khí còn kém; ếch hô hấp thêm qua da ẩm.'},
      liver: {name: 'Gan', fn: 'Màu nâu đỏ, 3 thùy: tiết mật giúp tiêu hóa mỡ, dự trữ glycogen, khử độc.'},
      stomach: {name: 'Dạ dày', fn: 'Túi cơ dài bên trái cơ thể: co bóp và tiết dịch vị tiêu hóa protein.'},
      intestine: {name: 'Ruột', fn: 'Ống dài cuộn khúc: tiêu hóa tiếp và hấp thụ chất dinh dưỡng vào máu.'},
    },
    flaps: {left: {label: 'vạt bụng trái', axis: [1, 0, 0], angle: -2.9}, right: {label: 'vạt bụng phải', axis: [1, 0, 0], angle: 2.9}},
    steps: [
      {kind: 'pin', do: 'Ghim bốn chân ếch (nằm ngửa) xuống khay sáp', why: 'Mẫu cố định thì đường cắt mới thẳng và các lớp không trượt; ghim chếch ra ngoài để da bụng căng.', see: 'Bốn kim ghim cắm ở hai bàn tay và hai bàn chân.', targets: [[-0.95, -1.02], [-0.95, 1.02], [2.05, -0.92], [2.05, 0.92]]},
      {kind: 'cut', tool: 'scissors', do: 'Dùng kéo cắt da và cơ bụng dọc đường giữa, từ dưới bụng lên tới ngực', why: 'Đường giữa bụng ít mạch máu nên ít chảy máu; cắt nông, mũi kéo hướng lên để không cắt vào nội quan.', see: 'Vạch chấm đổi thành đường cắt đỏ chạy hết chiều dài bụng.', path: [[0.7, 0], [0.2, 0], [-0.3, 0], [-0.62, 0]]},
      {kind: 'open', flaps: ['left', 'right'], do: 'Dùng kẹp lật hai vạt da–cơ sang hai bên', why: 'Lật vạt để lộ khoang cơ thể; kẹp giữ mép vạt chứ không bóp vào nội quan.', see: 'Hai vạt nằm ngửa ra hai bên, thấy tim đang đập ở phía ngực.'},
      {kind: 'pin', do: 'Ghim hai vạt xuống khay', why: 'Ghim vạt để khoang bụng mở sẵn, hai tay rảnh để quan sát và làm tiếp.', see: 'Mỗi vạt có một kim ghim giữ.', targets: [[0.05, -0.64], [0.05, 0.64]]},
      {kind: 'name', organs: ['heart', 'lung', 'liver', 'stomach', 'intestine'], do: 'Chỉ vào từng cơ quan để gọi tên và đọc chức năng', why: 'Nhận ra vị trí tương đối của các cơ quan: tim ở ngực, gan phủ phía trên, dạ dày bên trái, ruột cuộn phía dưới.', see: 'Thẻ tên hiện trên từng cơ quan, cơ quan đã gọi tên có dấu ✓.'},
      {kind: 'drop', organ: 'heart', drug: 'adrenaline 0,01 %', do: 'Nhỏ adrenaline lên tim rồi so sánh nhịp tim', why: 'Adrenaline tác động giống thần kinh giao cảm: làm tim đập nhanh và mạnh hơn. So sánh với nhịp đếm được trước khi nhỏ.', see: 'Nhịp tim trên thẻ tăng từ khoảng 42 lên khoảng 70 lần/phút.'},
    ],
    conclude: 'Ếch có tim 3 ngăn, phổi đơn giản (hô hấp thêm qua da). Tim tách khỏi điều khiển của não vẫn tự co bóp nhờ hệ dẫn truyền tự động; adrenaline làm tăng nhịp và lực co tim.',
  },
  {
    id: 'dissect-heart',
    name: 'Mổ tim lợn quan sát buồng tim và van tim',
    lesson: 'Sinh 11, bài 9–11 (tuần hoàn ở động vật)',
    model: 'PIG',
    goal: 'Quan sát mặt ngoài tim lợn (mạch máu lớn, động mạch vành), cắt đứng ngang qua bốn ngăn, lật nửa trước, ghim lại; gọi tên bốn ngăn, vách ngăn và hai van nhĩ–thất; so sánh độ dày thành các ngăn.',
    safety: 'Tim lợn mua ở chợ, còn tươi; đeo găng tay; dao mổ rất sắc: rạch xa tay giữ mẫu; rửa sạch khay và dụng cụ.',
    organs: {
      aorta: {name: 'Động mạch chủ', fn: 'Thành dày, đàn hồi; đưa máu giàu O₂ từ tâm thất trái đi nuôi khắp cơ thể.'},
      pa: {name: 'Động mạch phổi', fn: 'Đưa máu nghèo O₂ từ tâm thất phải lên phổi; chia hai nhánh cho hai phổi.'},
      vc: {name: 'Tĩnh mạch chủ', fn: 'Thành mỏng, dễ xẹp; đưa máu nghèo O₂ từ cơ thể về tâm nhĩ phải.'},
      coronary: {name: 'Động mạch vành', fn: 'Chạy trong rãnh trên mặt tim, nuôi chính cơ tim. Tắc động mạch vành gây nhồi máu cơ tim.', on: 'front'},
      ra: {name: 'Tâm nhĩ phải', fn: 'Thành mỏng; nhận máu nghèo O₂ từ tĩnh mạch chủ rồi đẩy xuống tâm thất phải.'},
      la: {name: 'Tâm nhĩ trái', fn: 'Nhận máu giàu O₂ từ tĩnh mạch phổi rồi đẩy xuống tâm thất trái.'},
      rv: {name: 'Tâm thất phải', fn: 'Thành mỏng hơn thất trái: chỉ bơm máu lên phổi, quãng ngắn, áp lực thấp.'},
      lv: {name: 'Tâm thất trái', fn: 'Thành dày nhất (gấp khoảng 3 lần thất phải) vì phải bơm máu đi khắp cơ thể với áp lực cao.'},
      septum: {name: 'Vách liên thất', fn: 'Ngăn hoàn toàn hai tâm thất nên máu giàu O₂ và máu nghèo O₂ không trộn lẫn.'},
      tricuspid: {name: 'Van ba lá', fn: 'Van nhĩ–thất phải: dây chằng nối cơ nhú giữ van không bị lật lên tâm nhĩ khi tâm thất co.'},
      mitral: {name: 'Van hai lá', fn: 'Van nhĩ–thất trái: chỉ cho máu đi một chiều từ tâm nhĩ xuống tâm thất.'},
    },
    flaps: {front: {label: 'nửa trước của tim', axis: [1, 0, 0], angle: -Math.PI, move: [0, 0, 0.55]}},
    steps: [
      {kind: 'name', organs: ['aorta', 'pa', 'vc', 'coronary'], do: 'Quan sát mặt ngoài: chỉ các mạch máu lớn và động mạch vành', why: 'Động mạch có thành dày và chắc, tĩnh mạch thành mỏng, xẹp; rãnh có động mạch vành cho biết mặt trước của tim.', see: 'Bốn thẻ tên hiện trên mạch máu, có dấu ✓.'},
      {kind: 'cut', tool: 'scalpel', do: 'Dùng dao mổ rạch theo vạch chấm quanh mép tim', why: 'Mặt cắt đứng ngang (song song mặt trước) đi qua cả bốn ngăn nên thấy cùng lúc hai nhĩ, hai thất và các van.', see: 'Đường rạch đỏ chạy quanh mép tim từ đáy, qua mỏm tim.', path: [[-1.22, -0.12], [-1.28, 0.45], [-1.12, 1.02], [-0.5, 1.06], [0.3, 0.98], [0.92, 0.66], [1.22, 0.36], [1.24, 0.08]]},
      {kind: 'open', flaps: ['front'], do: 'Dùng kẹp lật nửa trước của tim sang bên', why: 'Lật như mở một cuốn sách để hai nửa đối xứng nhau, mỗi ngăn tim có hai nửa.', see: 'Nửa trước nằm ngửa bên cạnh, mặt cắt lộ ra bốn khoang.'},
      {kind: 'pin', do: 'Ghim nửa đã lật xuống khay', why: 'Ghim giữ hai nửa mở phẳng để quan sát và so sánh độ dày thành.', see: 'Hai kim ghim giữ nửa trước của tim.', targets: [[-0.4, -1.15], [0.55, -1.0]]},
      {kind: 'name', organs: ['ra', 'la', 'rv', 'lv', 'septum', 'tricuspid', 'mitral'], do: 'Chỉ bốn ngăn tim, vách ngăn và hai van nhĩ–thất', why: 'So sánh: thành tâm thất dày hơn tâm nhĩ, thất trái dày nhất; van nhĩ–thất có dây chằng nối với cơ nhú.', see: 'Thẻ tên trên từng ngăn và van; nhìn mặt cắt thấy thành thất trái dày gấp mấy lần thất phải.'},
    ],
    conclude: 'Tim có 4 ngăn: 2 tâm nhĩ thành mỏng nhận máu, 2 tâm thất thành dày bơm máu; tâm thất trái dày nhất vì bơm máu đi khắp cơ thể. Van nhĩ–thất và van động mạch giữ máu đi một chiều; vách ngăn tách máu giàu O₂ và nghèo O₂.',
  },
  {
    id: 'dissect-fish',
    name: 'Mổ cá quan sát mang và nội quan',
    lesson: 'Sinh 11, bài 8–9 (hô hấp, tuần hoàn ở động vật)',
    model: 'FISH',
    goal: 'Mở nắp mang quan sát mang; cắt thành bụng theo đường chấm, lật vạt, ghim; gọi tên tim, gan, ruột, bóng hơi, thận, tuyến sinh dục; giải thích vì sao mang trao đổi khí hiệu quả trong nước.',
    safety: 'Cá tươi (cá chép, cá rô phi); đeo găng tay; cắt nông, mũi kéo hướng lên để không làm vỡ ruột và mật; rửa sạch khay.',
    organs: {
      gill: {name: 'Mang', fn: 'Bốn đôi cung mang, mỗi cung nhiều lá mang mỏng dày đặc mao mạch. Nước chảy ngược chiều dòng máu nên máu lấy được khoảng 80 % O₂ trong nước.'},
      heart: {name: 'Tim', fn: 'Tim cá 2 ngăn (1 tâm nhĩ, 1 tâm thất): tuần hoàn đơn, máu qua tim là máu nghèo O₂ rồi đi thẳng lên mang.'},
      liver: {name: 'Gan', fn: 'Màu nâu đỏ: tiết mật, dự trữ chất; gan cá giàu dầu.'},
      intestine: {name: 'Ruột', fn: 'Ống tiêu hóa uốn khúc: tiêu hóa và hấp thụ thức ăn.'},
      bladder: {name: 'Bóng hơi', fn: 'Túi khí màu trắng bạc: thay đổi lượng khí để cá chìm nổi ở độ sâu mong muốn.'},
      kidney: {name: 'Thận', fn: 'Dải đỏ sẫm sát cột sống: lọc máu, tạo nước tiểu.'},
      gonad: {name: 'Tuyến sinh dục', fn: 'Buồng trứng (cá cái) hoặc tinh hoàn (cá đực).'},
    },
    flaps: {gill: {label: 'nắp mang', axis: [0, 0, 1], angle: 1.9}, wall: {label: 'thành bụng', axis: [1, 0, 0], angle: -2.9}},
    steps: [
      {kind: 'open', flaps: ['gill'], do: 'Dùng kẹp nâng nắp mang lên', why: 'Nắp mang che và bảo vệ mang; khi cá thở, miệng và nắp mang đóng mở nhịp nhàng để bơm nước qua mang.', see: 'Nắp mang dựng lên, lộ các cung mang đỏ tươi.'},
      {kind: 'name', organs: ['gill'], do: 'Chỉ vào mang, quan sát cung mang và lá mang', why: 'Lá mang mỏng, rất nhiều và dày đặc mao mạch nên diện tích trao đổi khí rất lớn.', see: 'Thẻ "Mang" hiện trên các cung mang.'},
      {kind: 'cut', tool: 'scissors', do: 'Dùng kéo cắt thành bụng theo vạch chấm: từ phía đuôi, dọc bụng, lên tới sau nắp mang', why: 'Cắt vòng ba cạnh và giữ cạnh phía lưng làm bản lề để lật được vạt mà không cắt vào nội quan.', see: 'Đường cắt đỏ chạy hết vạch chấm quanh sườn cá.', path: ell(0.25, 0.06, 0.68, 0.28, -40, 220, 10)},
      {kind: 'open', flaps: ['wall'], do: 'Dùng kẹp lật vạt thành bụng lên phía lưng', why: 'Lật vạt lộ khoang bụng; kẹp ở mép vạt để không bóp vỡ bóng hơi và ruột.', see: 'Vạt nằm ngửa về phía lưng, thấy bóng hơi trắng bạc và các nội quan.'},
      {kind: 'pin', do: 'Ghim vạt thành bụng xuống khay', why: 'Ghim vạt để khoang bụng mở sẵn khi quan sát.', see: 'Hai kim ghim giữ vạt.', targets: [[0.0, -0.72], [0.55, -0.7]]},
      {kind: 'name', organs: ['heart', 'liver', 'intestine', 'bladder', 'kidney', 'gonad'], do: 'Chỉ vào từng nội quan để gọi tên và đọc chức năng', why: 'Tim nằm ngay sau mang (máu từ tim lên thẳng mang), bóng hơi nằm sát lưng, thận dọc cột sống.', see: 'Thẻ tên trên từng nội quan, có dấu ✓.'},
    ],
    conclude: 'Cá hô hấp bằng mang: lá mang mỏng, nhiều mao mạch, dòng nước ngược chiều dòng máu nên lấy O₂ hiệu quả. Tim 2 ngăn, tuần hoàn đơn. Bóng hơi giúp cá chìm nổi.',
  },
  {
    id: 'dissect-flower',
    name: 'Quan sát cấu tạo hoa (tách và cắt bầu nhụy)',
    lesson: 'Sinh 11, bài 26 (sinh sản ở thực vật, thụ phấn)',
    model: 'FLOWER',
    goal: 'Tách lần lượt cánh hoa, đài hoa, nhị; gọi tên các bộ phận của hoa; cắt dọc bầu nhụy để thấy noãn bên trong.',
    safety: 'Dùng hoa tươi (hoa bưởi, hoa dâm bụt); dao mổ sắc: cắt trên đế xốp, tay giữ hoa ở xa lưỡi dao.',
    organs: {
      petal: {name: 'Cánh hoa (tràng)', fn: 'Màu sắc và mùi hương hấp dẫn côn trùng đến thụ phấn.', mesh: 'f_petals'},
      sepal: {name: 'Đài hoa', fn: 'Lá đài màu xanh, bao bọc và bảo vệ nụ hoa.', mesh: 'f_sepals'},
      receptacle: {name: 'Đế hoa', fn: 'Nơi các bộ phận của hoa đính vào; ở một số cây phát triển thành phần thịt của quả.'},
      anther: {name: 'Bao phấn', fn: 'Chứa hạt phấn; hạt phấn mang giao tử đực.', on: 'stamens'},
      filament: {name: 'Chỉ nhị', fn: 'Nâng bao phấn lên cao để phát tán hạt phấn.', on: 'stamens'},
      stigma: {name: 'Đầu nhụy', fn: 'Có chất dính để giữ hạt phấn khi thụ phấn.'},
      style: {name: 'Vòi nhụy', fn: 'Ống phấn mọc xuyên qua vòi nhụy để đưa giao tử đực tới noãn.'},
      ovary: {name: 'Bầu nhụy', fn: 'Chứa noãn; sau thụ tinh phát triển thành quả.'},
      ovule: {name: 'Noãn', fn: 'Chứa túi phôi có tế bào trứng; sau thụ tinh phát triển thành hạt.'},
    },
    flaps: {
      petals: {label: 'các cánh hoa', move: [-1.12, -0.22, 0.85], scale: 0.7},
      sepals: {label: 'các lá đài', move: [-1.75, -0.25, -0.95], scale: 0.8},
      stamens: {label: 'các nhị', axis: [1, 0, 0], angle: 1.35, move: [1.5, 0.05, 0.85]},
      pistil: {label: 'nửa trước bầu nhụy', axis: [1, 0, 0], angle: 1.45},
    },
    steps: [
      {kind: 'name', organs: ['petal'], do: 'Quan sát hoa nguyên vẹn: chỉ vào cánh hoa', why: 'Đếm số cánh và nhìn màu sắc trước khi tách: đặc điểm này dùng để nhận dạng loài hoa.', see: 'Thẻ "Cánh hoa (tràng)" hiện trên cánh.'},
      {kind: 'open', flaps: ['petals'], do: 'Dùng kẹp tách các cánh hoa, xếp ra giấy', why: 'Tách từ ngoài vào trong, giữ nguyên các bộ phận bên trong để quan sát tiếp.', see: 'Năm cánh hoa nằm trên khay bên trái, lộ đài hoa và nhị.'},
      {kind: 'name', organs: ['sepal', 'receptacle'], do: 'Chỉ vào đài hoa và đế hoa', why: 'Đài là vòng ngoài cùng, đế hoa là phần phình ở đầu cuống mang tất cả các vòng.', see: 'Thẻ tên trên đài và đế hoa.'},
      {kind: 'open', flaps: ['sepals'], do: 'Dùng kẹp tách đài hoa', why: 'Bỏ đài để thấy rõ chỗ nhị và nhụy đính trên đế hoa.', see: 'Các lá đài nằm trên khay, chỉ còn nhị và nhụy.'},
      {kind: 'name', organs: ['anther', 'filament', 'stigma', 'style', 'ovary'], do: 'Chỉ vào các phần của nhị và nhụy', why: 'Nhị (bao phấn + chỉ nhị) là cơ quan sinh sản đực, nhụy (đầu, vòi, bầu) là cơ quan sinh sản cái: hoa có cả hai là hoa lưỡng tính.', see: 'Năm thẻ tên trên nhị và nhụy.'},
      {kind: 'open', flaps: ['stamens'], do: 'Dùng kẹp tách các nhị ra', why: 'Bỏ nhị để dao cắt bầu nhụy không vướng.', see: 'Chùm nhị nằm trên khay bên phải, chỉ còn nhụy trên đế hoa.'},
      {kind: 'cut', tool: 'scalpel', do: 'Dùng dao mổ cắt dọc bầu nhụy theo vạch chấm', why: 'Cắt dọc qua giữa bầu nhụy chia đôi các ô bầu nên thấy được noãn đính bên trong.', see: 'Đường cắt đỏ chạy ngang qua bầu nhụy.', path: [[-0.26, 0], [0, 0], [0.26, 0]]},
      {kind: 'open', flaps: ['pistil'], do: 'Dùng kẹp tách nửa trước của nhụy', why: 'Mở mặt cắt để nhìn vào trong các ô bầu.', see: 'Mặt cắt lộ hai ô bầu có các noãn trắng.'},
      {kind: 'name', organs: ['ovule'], do: 'Chỉ vào noãn', why: 'Mỗi noãn sau khi được thụ tinh sẽ thành một hạt, bầu nhụy thành quả: số noãn liên quan tới số hạt trong quả.', see: 'Thẻ "Noãn" hiện trên các noãn.'},
    ],
    conclude: 'Hoa lưỡng tính gồm đế hoa, đài, tràng, nhị (bao phấn, chỉ nhị) và nhụy (đầu, vòi, bầu nhụy chứa noãn). Sau thụ phấn và thụ tinh, noãn thành hạt, bầu nhụy thành quả.',
  },
  {
    id: 'dissect-human',
    name: 'Mổ mô hình cơ thể người quan sát nội quan',
    lesson: 'Sinh 11, chương 1 (tiêu hóa, hô hấp, tuần hoàn ở người)',
    model: 'HUMAN',
    goal: 'Trên mô hình giải phẫu bán thân: rạch đường giữa ngực–bụng, lật và ghim hai vạt da–cơ, gọi tên cơ quan ổ bụng; nhấc lồng ngực, gọi tên tim, phổi, cơ hoành; nêu vị trí tương đối của các cơ quan.',
    safety: 'Đây là mô hình giải phẫu học tập (các lớp tháo lắp được), không phải cơ thể thật; các thao tác mô phỏng trình tự mở khoang cơ thể để quan sát.',
    organs: {
      liver: {name: 'Gan', fn: 'Cơ quan lớn nhất ổ bụng, nằm bên phải dưới cơ hoành: tiết mật, chuyển hóa đường và đạm, khử độc.'},
      stomach: {name: 'Dạ dày', fn: 'Bên trái, dưới cơ hoành: co bóp nghiền trộn thức ăn, tiết HCl và pepsin tiêu hóa protein.'},
      smallint: {name: 'Ruột non', fn: 'Dài 5–7 m, lớp niêm mạc có lông ruột: nơi tiêu hóa và hấp thụ chất dinh dưỡng chủ yếu.'},
      largeint: {name: 'Ruột già', fn: 'Khung quanh ruột non: hấp thụ lại nước, tạo và thải phân.'},
      heart: {name: 'Tim', fn: 'Nằm giữa hai phổi, mỏm tim lệch trái: bơm máu theo vòng tuần hoàn lớn và vòng tuần hoàn nhỏ.'},
      lung: {name: 'Phổi', fn: 'Hàng trăm triệu phế nang có mao mạch bao quanh: trao đổi O₂ và CO₂ với máu.'},
      diaphragm: {name: 'Cơ hoành', fn: 'Tấm cơ ngăn khoang ngực với khoang bụng; co xuống làm lồng ngực rộng ra, không khí đi vào phổi.'},
    },
    flaps: {left: {label: 'vạt da–cơ trái', axis: [1, 0, 0], angle: -2.9}, right: {label: 'vạt da–cơ phải', axis: [1, 0, 0], angle: 2.9}, ribs: {label: 'lồng ngực', move: [0, 0.9, 0], fade: true}},
    steps: [
      {kind: 'cut', tool: 'scalpel', do: 'Dùng dao mổ rạch theo đường giữa ngực – bụng', why: 'Đường giữa là chỗ các cơ thành bụng gặp nhau, ít mạch máu; rạch dọc từ ngực tới bụng mở được cả hai khoang.', see: 'Đường rạch đỏ chạy hết vạch chấm từ cổ xuống bụng.', path: [[-1.4, 0], [-0.5, 0], [0.4, 0], [1.25, 0]]},
      {kind: 'open', flaps: ['left', 'right'], do: 'Dùng kẹp lật hai vạt da–cơ sang hai bên', why: 'Lật vạt lộ khoang bụng; lồng ngực bằng xương vẫn còn che khoang ngực.', see: 'Hai vạt lật ra hai bên, thấy lồng ngực, gan, dạ dày, ruột.'},
      {kind: 'pin', do: 'Ghim hai vạt sang hai bên', why: 'Giữ khoang mở sẵn, không phải giữ vạt bằng tay khi quan sát.', see: 'Mỗi vạt có một kim ghim.', targets: [[-0.1, -1.18], [-0.1, 1.18]]},
      {kind: 'name', organs: ['liver', 'stomach', 'smallint', 'largeint'], do: 'Chỉ vào các cơ quan trong khoang bụng', why: 'Gan bên phải, dạ dày bên trái, ruột già như khung bao quanh ruột non (bên phải người là bên gần em, vì người nằm ngửa, đầu bên trái).', see: 'Bốn thẻ tên trong ổ bụng, có dấu ✓.'},
      {kind: 'open', flaps: ['ribs'], do: 'Dùng kẹp nhấc lồng ngực ra', why: 'Lồng ngực (xương ức, xương sườn) bảo vệ tim và phổi; nhấc ra mới thấy khoang ngực.', see: 'Lồng ngực được nhấc lên và cất đi, lộ tim, hai phổi, cơ hoành.'},
      {kind: 'name', organs: ['heart', 'lung', 'diaphragm'], do: 'Chỉ vào tim, phổi và cơ hoành', why: 'Tim nằm giữa hai phổi, hơi lệch trái; cơ hoành ngăn khoang ngực và khoang bụng.', see: 'Ba thẻ tên trong khoang ngực.'},
    ],
    conclude: 'Khoang ngực (tim, phổi, được lồng ngực bảo vệ) và khoang bụng (gan, dạ dày, ruột) ngăn cách bởi cơ hoành. Gan bên phải, dạ dày bên trái, ruột già bao quanh ruột non; tim nằm giữa hai phổi, lệch trái.',
  },
];
export const DISSECT_BY_ID: Record<string, DissectSpec> = Object.fromEntries(DISSECTIONS.map((d) => [d.id, d]));
