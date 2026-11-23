/**
 * Bài "Trạm tập nội soi" (Sinh, /lab): logic thuần cho hai dụng cụ dài đi qua trocar, ba bài kỹ năng và chấm điểm theo chỉ số thao tác.
 * Cảnh `HandsLaparo3D` chỉ đọc tay / chuột, gọi `lapStep` mỗi khung hình rồi vẽ lại trạng thái.
 * Ngưỡng trong `BENCH` do dự án tự đặt để luyện tập, chưa được kiểm định với phẫu thuật viên.
 */
import {BAND, BAND_HALF, BAND_LEN, MEMB, WINDOW, bandUV, burnCells, clearedIn, newCells, pruneIslands} from './lapDissect';

export type P3 = [number, number, number];
export type LapTaskId = 'touch' | 'transfer' | 'clip' | 'chole';
export type RightTool = 'grasper' | 'clip' | 'scissors' | 'hook';

export const LAP_TASKS: {id: LapTaskId; name: string; goal: string}[] = [
  {id: 'touch', name: 'Định vị hai tay', goal: 'Chạm lần lượt 8 mục tiêu bằng đúng dụng cụ được tô màu.'},
  {id: 'transfer', name: 'Chuyển vòng qua hai tay', goal: 'Nhấc vòng bằng tay trái, chuyển sang tay phải giữa không trung rồi đặt vào chốt bên phải.'},
  {id: 'clip', name: 'Kẹp và cắt ống', goal: 'Tay trái kéo căng ống, tay phải đặt đủ 3 clip rồi cắt giữa hai nhóm clip. Nếu mô chảy máu thì dùng móc đốt cầm máu trước.'},
  {id: 'chole', name: 'Cắt túi mật', goal: 'Ca đủ bốn chặng: mở màng phúc mạc, kẹp cắt ống túi mật, kẹp cắt động mạch, bóc túi mật khỏi giường gan.'},
];
export type CholePhase = 'expose' | 'duct' | 'artery' | 'bed';
export const CHOLE_PHASES: {id: CholePhase; name: string; how: string}[] = [
  {id: 'expose', name: 'Mở phúc mạc, làm lộ cửa sổ an toàn', how: 'Móc đốt: giữ chụm và quét vùng giữa ống và động mạch, không chạm vào hai cấu trúc đó.'},
  {id: 'duct', name: 'Kẹp và cắt ống túi mật', how: 'Tay trái giữ ống ở vòng cam. Đặt đủ 3 clip rồi đổi sang kéo, cắt giữa hai nhóm clip.'},
  {id: 'artery', name: 'Kẹp và cắt động mạch túi mật', how: 'Đặt đủ 3 clip lên động mạch rồi dùng kéo cắt ở đoạn giữa.'},
  {id: 'bed', name: 'Bóc túi mật khỏi giường gan', how: 'Tay trái kéo túi mật, móc đốt quét dọc dải mô nối. Không đốt lấn sang gan.'},
];
export const RIGHT_TOOL_NAME: Record<RightTool, string> = {grasper: 'Kẹp phẫu tích', clip: 'Kìm đặt clip', scissors: 'Kéo nội soi', hook: 'Móc đốt điện'};

// ------------------------------------------------------------------ điểm tựa ở thành bụng
export const TROCARS: [P3, P3] = [[-2.3, 4, 1.6], [2.3, 4, 1.6]];
/** ca cắt túi mật đặt cổng phải ở gần đường giữa để với tới cả đáy túi mật */
export const trocarsOf = (task: LapTaskId): [P3, P3] => (task === 'chole' ? [[-3.1, 4, 1.6], [-1.4, 4, 1.6]] : TROCARS);
/** độ dài phần cán ngoài thành bụng */
export const HANDLE_L = 2;
export const TIP_HIGH = 0.55;
export const TIP_LOW = 0.18;
/** cán lệch (hx, hz) so với trocar thì mũi đi NGƯỢC chiều, nhân theo tỉ lệ phần trong / phần ngoài */
export function tipOf(tr: P3, hx: number, hz: number, tipY: number): P3 {
  const k = (tr[1] - tipY) / HANDLE_L;
  return [tr[0] - hx * k, tipY, tr[2] - hz * k];
}
/** con trỏ (−1…1) → độ lệch của cán; đủ để mỗi tay với qua giữa vùng làm việc */
export const handleOf = (nx: number, ny: number): [number, number] => [nx * 2.1, -ny * 2.1];

const dist = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const distXZ = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

// ------------------------------------------------------------------ bố cục bài
export const TARGETS: {at: P3; hand: 0 | 1}[] = [
  {at: [-1.7, 0.2, -0.8], hand: 0},
  {at: [1.5, 0.2, 0.9], hand: 1},
  {at: [-0.8, 0.2, 1.1], hand: 0},
  {at: [1.9, 0.2, -0.7], hand: 1},
  {at: [-2.1, 0.2, 0.5], hand: 0},
  {at: [0.7, 0.2, -1.1], hand: 1},
  {at: [-0.5, 0.2, -1.2], hand: 0},
  {at: [0.5, 0.2, 1.3], hand: 1},
];
const slots = (x: number): P3[] => [-1, 0, 1].flatMap((r) => [[x - 0.35, 0.14, r * 0.9] as P3, [x + 0.35, 0.14, r * 0.9] as P3]);
export const PEGS_FROM = slots(-1.65);
export const PEGS_GOAL = slots(1.65);
/** cơ quan không được chạm */
export const NO_GO: {at: P3; r: number} = {at: [0, 0.3, -2.45], r: 0.75};
/** ống nằm dọc x ở z = 0 */
export const TUBE_Y = 0.42;
export const TUBE_X: [number, number] = [-2.4, 2.4];
/** chỗ tay trái giữ để kéo căng */
export const ANCHOR: P3 = [-1.5, TUBE_Y, 0];
/** vị trí 3 clip: tay trái kéo túi mật ở bên trái; hai clip ở phía người bệnh (bên phải), một clip ở phía bệnh phẩm */
export const CLIP_X = [0.6, 0.25, -0.75];
export const CUT_X: [number, number] = [-0.5, 0.05];
/** động mạch túi mật chạy song song sau ống (trùng đường trong `lap_anatomy.py`) */
export const ARTERY: [number, number][] = [[3.3, -1.2], [2.1, -0.62], [0.6, -0.5], [-1.0, -0.48], [-2.3, -0.42], [-3.3, -0.5]];
/** tốc độ mất máu khi đứt nhánh mạch (mL/s) và thời gian giữ móc đốt để cầm (s) */
export const BLEED_RATE = 9;
export const COAG_TIME = 0.8;
/** clip trên động mạch: hai ở phía người bệnh, một ở phía túi mật; cắt ở đoạn giữa */
export const ART_CLIP_X = [0.62, 0.3, -0.6];
export const ART_CUT_X: [number, number] = [-0.4, 0.12];

export interface Ring {
  pos: P3;
  holder: 0 | 1 | null;
  /** đã chuyển từ tay trái sang tay phải */
  passed: boolean;
  placed: boolean;
}
export interface LapState {
  task: LapTaskId;
  started: boolean;
  done: boolean;
  /** thời gian tính từ lần chụm đầu tiên (s) */
  t: number;
  /** quãng đường mũi từng dụng cụ */
  path: [number, number];
  /** va chạm cơ quan, rơi vòng, thao tác sai chỗ */
  errors: {collide: number; drop: number; miss: number};
  warn: string;
  prevTips: [P3, P3] | null;
  prevGrip: [boolean, boolean];
  inNoGo: [boolean, boolean];
  target: number;
  rings: Ring[];
  clips: boolean[];
  cut: boolean;
  /** cắt khi chưa đủ clip */
  bled: boolean;
  /** điểm đang chảy máu, `coag` = số giây đã đốt */
  bleed: {at: P3; coag: number} | null;
  /** tổng máu mất (mL) */
  loss: number;
  /** thời gian bật móc đốt (s) */
  burn: number;
  /** mũi móc đốt đang chạm ống */
  onDuct: boolean;
  /** các điểm đã đốt kín: giữ móc tại đó không làm mạch chảy lại */
  sealed: P3[];
  /** ca cắt túi mật: chặng hiện tại, màng phúc mạc, dải nối túi mật với gan (1 = còn), clip và cắt động mạch */
  phase: CholePhase;
  memb: Uint8Array;
  band: Uint8Array;
  artClips: boolean[];
  artCut: boolean;
  /** móc đang lấn vào gan */
  deep: boolean;
}
export const newLap = (task: LapTaskId): LapState => ({
  task,
  started: false,
  done: false,
  t: 0,
  path: [0, 0],
  errors: {collide: 0, drop: 0, miss: 0},
  warn: '',
  prevTips: null,
  prevGrip: [false, false],
  inNoGo: [false, false],
  target: 0,
  rings: PEGS_FROM.map((p) => ({pos: [...p] as P3, holder: null, passed: false, placed: false})),
  clips: CLIP_X.map(() => false),
  cut: false,
  bled: false,
  bleed: null,
  loss: 0,
  burn: 0,
  onDuct: false,
  sealed: [],
  phase: 'expose',
  memb: newCells(MEMB),
  band: newCells(BAND),
  artClips: ART_CLIP_X.map(() => false),
  artCut: false,
  deep: false,
});
export interface LapInput {
  dt: number;
  tips: [P3, P3];
  grip: [boolean, boolean];
  right: RightTool;
  /** cảnh báo mô vừa bị kéo rách tại điểm này */
  tear?: P3 | null;
  /** đường động mạch hiện tại (đã đi theo mô); không có thì dùng vị trí nghỉ */
  arteryNow?: [number, number][];
  /** mũi phải quy về vị trí nghỉ của ống / động mạch để xét đúng chỗ khi mô đang bị kéo lệch */
  ductTip?: P3;
  arteryTip?: P3;
}

/** khoảng cách trên mặt xz tới đường động mạch */
export function arteryDist(p: P3, path: [number, number][] = ARTERY): number {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, az] = path[i];
    const ux = path[i + 1][0] - ax;
    const uz = path[i + 1][1] - az;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * ux + (p[2] - az) * uz) / (ux * ux + uz * uz || 1)));
    best = Math.min(best, Math.hypot(p[0] - ax - ux * t, p[2] - az - uz * t));
  }
  return best;
}

/** chảy máu, cầm máu và tổn thương do dụng cụ năng lượng ở bài kẹp cắt */
function stepField(n: LapState, inp: LapInput, pressed: boolean[]) {
  const tip = inp.tips[1];
  const hookOn = inp.right === 'hook' && inp.grip[1];
  if (inp.tear && !n.bleed) {
    n.bleed = {at: [...inp.tear], coag: 0};
    n.errors.miss++;
    n.warn = 'Kéo quá mạnh làm rách mô: dùng móc đốt cầm máu.';
  }
  // cắt đúng đoạn sau khi đủ clip là thao tác dự kiến, không phải tai biến
  const aTip = inp.arteryTip ?? tip;
  const planned = n.task === 'chole' && n.phase === 'artery' && inp.right === 'scissors' && n.artClips.every(Boolean) && aTip[0] >= ART_CUT_X[0] && aTip[0] <= ART_CUT_X[1];
  if (!n.bleed && !n.artCut && !planned && (hookOn || (inp.right === 'scissors' && pressed[1])) && arteryDist(tip, inp.arteryNow) < 0.11 && !n.sealed.some((q) => dist(q, tip) < 0.45)) {
    n.bleed = {at: [...tip], coag: 0};
    n.errors.collide++;
    n.warn = 'Chạm động mạch túi mật, máu đang chảy: giữ móc đốt vào chỗ chảy để cầm.';
  }
  if (hookOn) n.burn += inp.dt;
  const dTip = inp.ductTip ?? tip;
  const onDuct = hookOn && !n.cut && Math.abs(dTip[2]) < 0.13 && dTip[0] > TUBE_X[0] && dTip[0] < TUBE_X[1];
  if (onDuct && !n.onDuct) {
    n.errors.miss++;
    n.warn = 'Móc đốt chạm vào ống có thể gây bỏng ống mật.';
  }
  n.onDuct = onDuct;
  if (n.bleed) {
    n.loss += BLEED_RATE * inp.dt;
    if (hookOn && dist(tip, n.bleed.at) < 0.34) {
      n.bleed = {...n.bleed, coag: n.bleed.coag + inp.dt};
      if (n.bleed.coag >= COAG_TIME) {
        n.sealed = [...n.sealed, n.bleed.at];
        n.bleed = null;
        n.warn = '';
      }
    }
  }
}

function stepTouch(n: LapState, inp: LapInput, pressed: boolean[]) {
  const g = TARGETS[n.target];
  for (const h of [0, 1] as const) {
    if (!pressed[h] || distXZ(inp.tips[h], g.at) > 0.34) continue;
    if (h !== g.hand) {
      n.errors.miss++;
      n.warn = `Mục tiêu này dành cho tay ${g.hand ? 'phải' : 'trái'}.`;
      continue;
    }
    n.target++;
    n.warn = '';
    if (n.target >= TARGETS.length) n.done = true;
    return;
  }
}

function stepTransfer(n: LapState, inp: LapInput, pressed: boolean[]) {
  n.rings = n.rings.map((r) => ({...r, pos: r.holder === null ? r.pos : ([...inp.tips[r.holder]] as P3)}));
  for (const h of [0, 1] as const) {
    if (pressed[h] && !n.rings.some((r) => r.holder === h)) {
      const other = h === 0 ? 1 : 0;
      const handed = n.rings.find((r) => r.holder === other && dist(inp.tips[h], r.pos) < 0.48);
      if (handed) {
        handed.holder = h;
        if (h === 1) handed.passed = true;
        n.warn = '';
        continue;
      }
      let best: Ring | null = null;
      let bd = 0.36;
      for (const r of n.rings) {
        if (r.holder !== null || r.placed) continue;
        const d = distXZ(inp.tips[h], r.pos);
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
      if (best) best.holder = h;
    }
    if (!inp.grip[h] && n.prevGrip[h]) {
      const r = n.rings.find((q) => q.holder === h);
      if (!r) continue;
      const free = PEGS_GOAL.find((g) => distXZ(g, inp.tips[h]) < 0.38 && !n.rings.some((q) => q.placed && distXZ(q.pos, g) < 0.05));
      r.holder = null;
      if (free && h === 1 && r.passed) {
        r.pos = [...free] as P3;
        r.placed = true;
        n.warn = '';
      } else {
        r.pos = [inp.tips[h][0], 0.14, inp.tips[h][2]];
        r.passed = false;
        n.errors.drop++;
        n.warn = free ? 'Phải chuyển vòng sang tay phải rồi mới đặt vào chốt.' : 'Vòng rơi: nhấc lại bằng tay trái.';
      }
    }
  }
  if (n.rings.every((r) => r.placed)) n.done = true;
}

function stepClip(n: LapState, inp: LapInput, pressed: boolean[]) {
  stepField(n, inp, pressed);
  if (!pressed[1] || inp.right === 'grasper' || inp.right === 'hook') return;
  const tip = inp.ductTip ?? inp.tips[1];
  if (Math.abs(tip[2]) > 0.3 || tip[0] < TUBE_X[0] || tip[0] > TUBE_X[1]) return;
  if (n.bleed) {
    n.warn = 'Đang chảy máu: cầm máu bằng móc đốt trước khi kẹp hoặc cắt.';
    return;
  }
  if (!inp.grip[0] || distXZ(inp.tips[0], ANCHOR) > 0.6) {
    n.warn = 'Tay trái giữ ống ở vòng cam để kéo căng trước.';
    return;
  }
  if (inp.right === 'clip') {
    const i = CLIP_X.findIndex((x, j) => !n.clips[j] && Math.abs(tip[0] - x) < 0.2);
    if (i < 0) {
      n.errors.miss++;
      n.warn = 'Clip lệch vị trí: đặt đúng vạch vàng.';
      return;
    }
    n.clips = n.clips.map((c, j) => c || j === i);
    n.warn = '';
    return;
  }
  if (tip[0] < CUT_X[0] || tip[0] > CUT_X[1]) {
    n.errors.miss++;
    n.warn = 'Cắt lệch: chỉ cắt ở đoạn giữa hai nhóm clip.';
    return;
  }
  n.cut = true;
  n.bled = !n.clips.every(Boolean);
  // ca cắt túi mật còn các chặng sau, trừ khi vừa làm rò ống
  n.done = n.task === 'clip' || n.bled;
  n.warn = n.bled ? 'Cắt khi chưa đủ clip: ống rò và chảy máu.' : '';
}

function stepArtery(n: LapState, inp: LapInput, pressed: boolean[]) {
  if (!pressed[1] || (inp.right !== 'clip' && inp.right !== 'scissors')) return;
  const tip = inp.arteryTip ?? inp.tips[1];
  if (arteryDist(tip) > 0.2) return;
  if (n.bleed) {
    n.warn = 'Đang chảy máu: cầm máu bằng móc đốt trước khi kẹp hoặc cắt.';
    return;
  }
  if (inp.right === 'clip') {
    const i = ART_CLIP_X.findIndex((x, j) => !n.artClips[j] && Math.abs(tip[0] - x) < 0.16);
    if (i < 0) {
      n.errors.miss++;
      n.warn = 'Clip lệch vị trí: đặt đúng vạch vàng trên động mạch.';
      return;
    }
    n.artClips = n.artClips.map((c, j) => c || j === i);
    n.warn = '';
    return;
  }
  if (tip[0] < ART_CUT_X[0] || tip[0] > ART_CUT_X[1]) {
    n.errors.miss++;
    n.warn = 'Cắt lệch: chỉ cắt ở đoạn giữa các clip.';
    return;
  }
  n.artCut = true;
  n.phase = 'bed';
  n.warn = '';
}

function stepChole(n: LapState, inp: LapInput, pressed: boolean[]) {
  if (n.phase === 'duct') {
    stepClip(n, inp, pressed);
    if (n.cut && !n.done) {
      n.phase = 'artery';
      n.warn = '';
    }
    return;
  }
  stepField(n, inp, pressed);
  const tip = inp.tips[1];
  const hookOn = inp.right === 'hook' && inp.grip[1] && !n.bleed;
  if (n.phase === 'expose') {
    if (hookOn) {
      const next = burnCells(n.memb, MEMB, tip[0], tip[2], 0.13);
      if (next !== n.memb) n.memb = pruneIslands(next, MEMB);
      if (clearedIn(n.memb, MEMB, WINDOW) >= 0.85) {
        n.phase = 'duct';
        n.warn = '';
      }
    }
  } else if (n.phase === 'artery') stepArtery(n, inp, pressed);
  else {
    const [u, v] = bandUV(tip[0], tip[2]);
    const inBed = u > -0.2 && u < BAND_LEN + 0.2;
    const deep = hookOn && inBed && v > BAND_HALF + 0.09 && v < 0.8;
    if (deep && !n.deep) {
      n.errors.miss++;
      n.bleed = {at: [...tip], coag: 0};
      n.warn = 'Móc đốt lấn vào nhu mô gan, gan đang rỉ máu: cầm máu rồi đốt sát thành túi mật.';
    }
    n.deep = deep;
    if (hookOn && !deep && inBed) {
      n.band = burnCells(n.band, BAND, u, v, 0.11);
      if (clearedIn(n.band, BAND) >= 0.92) {
        n.done = true;
        n.warn = '';
      }
    }
  }
}

/** một khung hình: cộng thời gian và quãng đường, phát hiện va chạm, chạy luật của bài */
export function lapStep(s: LapState, inp: LapInput): LapState {
  if (s.done) return s;
  const pressed = [inp.grip[0] && !s.prevGrip[0], inp.grip[1] && !s.prevGrip[1]];
  const started = s.started || pressed[0] || pressed[1];
  const n: LapState = {...s, started, t: started ? s.t + inp.dt : 0, path: [...s.path], errors: {...s.errors}, prevTips: inp.tips};
  if (started && s.prevTips)
    for (const h of [0, 1] as const) {
      const d = dist(inp.tips[h], s.prevTips[h]);
      // bỏ rung nhỏ của camera tay
      if (d > 0.004) n.path[h] += d;
    }
  const inside = inp.tips.map((p) => dist(p, NO_GO.at) < NO_GO.r) as [boolean, boolean];
  if ((inside[0] && !s.inNoGo[0]) || (inside[1] && !s.inNoGo[1])) {
    n.errors.collide++;
    n.warn = 'Dụng cụ chạm vào cơ quan lân cận.';
  }
  n.inNoGo = inside;
  if (s.task === 'touch') stepTouch(n, inp, pressed);
  else if (s.task === 'transfer') stepTransfer(n, inp, pressed);
  else if (s.task === 'chole') stepChole(n, inp, pressed);
  else stepClip(n, inp, pressed);
  n.prevGrip = inp.grip;
  return n;
}

// ------------------------------------------------------------------ chấm điểm
/** mức mục tiêu tự đặt của từng bài: thời gian (s) và tổng quãng đường hai mũi */
export const BENCH: Record<LapTaskId, {time: number; path: number}> = {
  touch: {time: 60, path: 34},
  transfer: {time: 180, path: 90},
  clip: {time: 90, path: 30},
  chole: {time: 360, path: 150},
};
export const PASS_SCORE = 70;
export interface LapScore {
  total: number;
  time: number;
  economy: number;
  safety: number;
  pass: boolean;
}
/** đạt mức mục tiêu = đủ điểm phần đó; gấp đôi mức mục tiêu = 0 */
export function lapScore(s: LapState): LapScore {
  const b = BENCH[s.task];
  const part = (v: number, goal: number) => Math.max(0, Math.min(1, 2 - v / goal));
  const time = Math.round(30 * part(s.t, b.time));
  const economy = Math.round(30 * part(s.path[0] + s.path[1], b.path));
  const safety = s.bled ? 0 : Math.max(0, 40 - 8 * s.errors.collide - 5 * s.errors.drop - 4 * s.errors.miss - Math.min(12, Math.floor(s.loss / 5)));
  const total = time + economy + safety;
  return {total, time, economy, safety, pass: s.done && !s.bled && total >= PASS_SCORE};
}
