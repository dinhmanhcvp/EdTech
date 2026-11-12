'use client';

import React, {useContext, Suspense, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {SPECS, allOff, movePart, type AssemblyKind} from '../../utils/lab/hands/assembly';
import {FASTENERS, KITS, TOOLS, allTight, holdingMessage, initialScrews, seated, tightCount} from '../../utils/lab/hands/fasteners';
import {HandsError, edgeGlow, handGate, listCameras, oneEuro, pinchLatch, pinchRatio, skinAlpha, slideTravel, startHands, thumbSlide, type Pt} from '../../utils/lab/hands/handTracker';
import {SAMPLE_MIRRORS, START, trace, type Mirror} from '../../utils/lab/hands/optics';
import {SAMPLE, evaluate, explain, wireKey, type Verdict, type Wire} from '../../utils/lab/hands/threePhase';
import {BTN, BTN_GHOST} from './Controls';
import type {AssemblyLive} from './HandsAssembly3D';
import {CART, GAINS, START_STATE, type Gains} from '../../utils/lab/hands/cartpole';
import {DNA, OVERSTRETCH_X, dnaForce, fitPersistence, settle, type Sample} from '../../utils/lab/hands/tweezers';
import {SIMS, SIM_BY_ID} from '../../utils/lab/hands/sims';
import {GUIDE} from '../../utils/lab/hands/sims/guide';
import {OPS} from '../../utils/lab/hands/sims/ops';
import {microView} from '../../utils/lab/hands/sims/micro';
import {derive, labReducer, newLab, stepsDone} from '../../utils/lab/chem/engine';
import {CHEM_EXPERIMENTS, EXPERIMENT_BY_ID} from '../../utils/lab/chem/experiments';
import {RULES} from '../../utils/lab/chem/rules';
import {propertiesOf} from '../../utils/lab/chem/properties';
import {SUBSTANCES, SUB_BY_ID} from '../../utils/lab/chem/species';
import type {ChemLive} from './HandsChem3D';
import {CHEM_GROUPS} from './HandsChem3D';
import {MicroLens} from './MicroLens';
import {fmt, fromUnit, initial, toUnit, type SimParam} from '../../utils/lab/hands/sims/types';
import type {CartLive} from './HandsCartPole3D';
import type {SimLive} from './HandsSims3D';
import type {OpticsLive} from './HandsOptics3D';
import type {TweezersLive} from './HandsTweezers3D';
import type {HandsLive} from './HandsThreePhase3D';
import {newInput, type HandsInput} from './handsKit';
import {BalanceLab} from './HandsBalanceLab';
import {IncidentCard} from './Incident';
import {MISHAPS, mishapOf} from '../../utils/lab/hands/mishap';
import {LabIdContext, LabManual} from './LabManual';
import {canWebGL} from './SceneLab';

const ThreePhase3D = React.lazy(() => import('./HandsThreePhase3D'));
const Assembly3D = React.lazy(() => import('./HandsAssembly3D'));
const Optics3D = React.lazy(() => import('./HandsOptics3D'));
const Tweezers3D = React.lazy(() => import('./HandsTweezers3D'));
const CartPole3D = React.lazy(() => import('./HandsCartPole3D'));
const Sims3D = React.lazy(() => import('./HandsSims3D'));
const Chem3D = React.lazy(() => import('./HandsChem3D'));
export const EXPERIMENTS = [
  ['three-phase', 'Đấu điện 3 pha'],
  ['motor', 'Tháo lắp động cơ'],
  ['engine', 'Động cơ đốt trong 4 kì'],
  ['robot', 'Lắp ráp robot'],
  ['drone', 'Lắp drone 4 cánh'],
  ['pc', 'Lắp máy tính'],
  ['chem', 'Hóa học tự do'],
  ['balance', 'Cân dòng điện đo B'],
  ['optics', 'Căn chỉnh laser'],
  ['tweezers', 'Kẹp quang kéo DNA'],
  ['cartpole', 'Con lắc ngược'],
] as const;
export type Experiment = (typeof EXPERIMENTS)[number][0] | (typeof SIMS)[number]['id'];
export const ALL_EXPERIMENTS: readonly (readonly [string, string])[] = [...EXPERIMENTS, ...SIMS.map((s) => [s.id, s.name] as const)];

const LIVE_WARNING = 'Cắt aptomat trước khi chạm vào dây: mạch đang có điện!';
const RATED: [number, string][] = [
  [220, 'Δ/Y 220/380 V'],
  [380, 'Δ/Y 380/660 V'],
];
const PILL = (on: boolean) => `min-h-[30px] rounded-full border px-3 font-medium disabled:opacity-50 ${on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/25 bg-white'}`;
const stored = (k: string) => {
  try {
    return localStorage.getItem(`hands-lab-${k}`) === '1';
  } catch {
    return false;
  }
};

const remember = (k: string, v: string) => {
  try {
    localStorage.setItem(`hands-lab-${k}`, v);
  } catch {
    /* chế độ riêng tư: chỉ mất ghi nhớ */
  }
};

const storedNum = (k: string, d: number) => {
  try {
    const v = Number(localStorage.getItem(`hands-lab-${k}`));
    return v >= 0.3 && v <= 1 ? v : d;
  } catch {
    return d;
  }
};
/** Báo lỗi camera bằng tiếng Việt, nêu đúng nguyên nhân và cách xử lí; kèm tên lỗi gốc để dễ tra. */
function camMessage(e: unknown): string {
  const inner = e instanceof HandsError ? e.cause : e;
  const name = inner instanceof Error ? inner.name : '';
  const raw = inner instanceof Error ? `${inner.name}: ${inner.message}` : String(inner);
  if (e instanceof HandsError && e.stage === 'model') return `Không tải được bộ nhận diện tay (lần đầu cần internet để tải tệp từ cdn.jsdelivr.net và storage.googleapis.com; kiểm tra mạng hoặc tường lửa). Chi tiết: ${raw}`;
  if (name === 'NotAllowedError') return 'Trình duyệt chưa cho phép dùng camera: bấm biểu tượng ổ khóa cạnh địa chỉ trang, chọn Camera → Cho phép, rồi tải lại trang.';
  if (name === 'NotFoundError') return 'Không thấy camera nào trên máy: cắm camera rồi thử lại.';
  if (name === 'NotReadableError') return 'Camera đang được ứng dụng hoặc tab khác dùng (Zoom, Meet, ứng dụng Camera, tab /lab khác): đóng chúng rồi bấm lại.';
  return `Không mở được camera hoặc bộ nhận diện tay. Chi tiết: ${raw}`;
}

const PALM = [0, 1, 2, 5, 9, 13, 17];
const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
/**
 * Vẽ BÀN TAY THẬT từ camera lên lớp phủ trên cảnh 3D (như nhìn tay mình qua màn hình tủ thao tác cách ly):
 * mặt nạ dựng từ 21 điểm của mỗi tay (lòng bàn tay, các ngón, một đoạn cẳng tay), rồi chỉ giữ phần ảnh camera nằm trong mặt nạ.
 * Phép đặt ảnh trùng với phép đặt con trỏ tay (vùng giữa 80 % khung hình phủ kín màn hình).
 */
let work: {v: HTMLCanvasElement; m: HTMLCanvasElement} | null = null;
let ghostCanvas: HTMLCanvasElement | null = null;
/** các ống quanh khớp tay: lòng bàn tay, năm ngón, một đoạn cẳng tay; `k` nhân bề rộng */
function handTubes(c: CanvasRenderingContext2D, q: number[][], k: number) {
  const hand = Math.hypot(q[0][0] - q[9][0], q[0][1] - q[9][1]);
  const chain = (ids: number[], width: number, fill = false) => {
    c.lineWidth = hand * width * k;
    c.beginPath();
    ids.forEach((i, n) => (n ? c.lineTo(q[i][0], q[i][1]) : c.moveTo(q[i][0], q[i][1])));
    if (fill) {
      c.closePath();
      c.fill();
    }
    c.stroke();
  };
  chain(PALM, 0.3, true);
  for (const f of FINGERS) chain(f, 0.26);
  c.lineWidth = hand * 0.7 * k;
  c.beginPath();
  c.moveTo(q[0][0], q[0][1]);
  c.lineTo(q[0][0] + (q[0][0] - q[9][0]) * 1.8, q[0][1] + (q[0][1] - q[9][1]) * 1.8);
  c.stroke();
}
/**
 * Vẽ hình tay thật ở đủ độ phân giải màn hình. Mỗi tay: cắt vùng ảnh camera quanh tay, tính độ đục từng điểm ảnh
 * (mặt nạ khớp tay × giống màu da lấy mẫu ở lòng bàn tay, xem `skinAlpha`) để viền bám sát ngón tay thật,
 * rồi vẽ lên lớp phủ kèm bóng đổ mềm xuống cảnh. Hình tay thu nhỏ quanh ĐIỂM CHỤM theo `size` nên điểm chụm vẫn trùng con trỏ;
 * con trỏ (vòng tròn, đặc lại khi chụm) vẽ trên cùng để không bị hình tay che.
 */
function paintHands(cv: HTMLCanvasElement, video: HTMLVideoElement, hands: Pt[][], flipX: boolean, flipY: boolean, ghosts: {pts: Pt[]; alpha: number}[], size: number, opt: {skin: boolean; pinch: boolean[]}) {
  const dpr = 1; // lớp phủ toàn màn hình vẽ lại mỗi khung hình camera: ảnh tay chỉ rộng 640 px nên vẽ ở 2× chỉ tốn thời gian
  const W = Math.round(cv.clientWidth * dpr);
  const H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) Object.assign(cv, {width: W, height: H});
  const main = cv.getContext('2d');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!main || !vw) return;
  work ??= {v: document.createElement('canvas'), m: document.createElement('canvas')};
  const vc = work.v.getContext('2d', {willReadFrequently: true})!;
  const mc = work.m.getContext('2d', {willReadFrequently: true})!;
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.globalCompositeOperation = 'source-over';
  main.clearRect(0, 0, W, H);
  main.imageSmoothingQuality = 'high';
  const cursors: [number, number, boolean][] = [];
  hands.forEach((h, n) => {
    if (h.length !== 21) return;
    // ---- vùng cắt quanh tay, tính theo điểm ảnh của camera
    const q = h.map((p) => [p.x * vw, p.y * vh]);
    const hand = Math.hypot(q[0][0] - q[9][0], q[0][1] - q[9][1]);
    const arm = [q[0][0] + (q[0][0] - q[9][0]) * 1.8, q[0][1] + (q[0][1] - q[9][1]) * 1.8];
    const pad = hand * 0.5;
    const xs = [...q.map((p) => p[0]), arm[0]];
    const ys = [...q.map((p) => p[1]), arm[1]];
    const bx = Math.max(0, Math.floor(Math.min(...xs) - pad));
    const by = Math.max(0, Math.floor(Math.min(...ys) - pad));
    const cw = Math.min(vw, Math.ceil(Math.max(...xs) + pad)) - bx;
    const ch = Math.min(vh, Math.ceil(Math.max(...ys) + pad)) - by;
    if (cw < 8 || ch < 8) return;
    for (const c of [work!.v, work!.m]) if (c.width !== cw || c.height !== ch) Object.assign(c, {width: cw, height: ch});
    vc.drawImage(video, bx, by, cw, ch, 0, 0, cw, ch);
    const local = q.map(([x, y]) => [x - bx, y - by]);
    // kênh đỏ = mặt nạ rộng, kênh lục = lõi
    mc.clearRect(0, 0, cw, ch);
    mc.lineCap = mc.lineJoin = 'round';
    mc.fillStyle = mc.strokeStyle = '#FF0000';
    handTubes(mc, local, opt.skin ? 1.3 : 1);
    mc.globalCompositeOperation = 'lighter';
    mc.fillStyle = mc.strokeStyle = '#00FF00';
    handTubes(mc, local, opt.skin ? 0.55 : 1);
    mc.globalCompositeOperation = 'source-over';
    const img = vc.getImageData(0, 0, cw, ch);
    const px = img.data;
    const mk = mc.getImageData(0, 0, cw, ch).data;
    // màu da lấy mẫu ở lòng bàn tay và gốc các ngón (Cb, Cr: không phụ thuộc độ sáng)
    let rb = 0;
    let rr = 0;
    let ry = 0;
    let cnt = 0;
    for (const [x, y] of [local[0], local[5], local[9], local[13], local[17], [(local[0][0] + local[9][0]) / 2, (local[0][1] + local[9][1]) / 2], [(local[5][0] + local[17][0]) / 2, (local[5][1] + local[17][1]) / 2]]) {
      const i = (Math.min(ch - 1, Math.max(0, Math.round(y))) * cw + Math.min(cw - 1, Math.max(0, Math.round(x)))) * 4;
      rb += -0.169 * px[i] - 0.331 * px[i + 1] + 0.5 * px[i + 2];
      rr += 0.5 * px[i] - 0.419 * px[i + 1] - 0.081 * px[i + 2];
      ry += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      cnt++;
    }
    rb /= cnt;
    rr /= cnt;
    ry = Math.max(1, ry / cnt);
    // cẳng tay mờ dần về phía khuỷu (thường là tay áo, và hình tay không nên bị cắt cụt một nhát)
    const ux = (local[0][0] - local[9][0]) / hand;
    const uy = (local[0][1] - local[9][1]) / hand;
    const armLen = hand * 1.8;
    for (let y = 0, i = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++, i += 4) {
        const wide = mk[i];
        if (!wide) {
          px[i + 3] = 0;
          continue;
        }
        const cb = -0.169 * px[i] - 0.331 * px[i + 1] + 0.5 * px[i + 2];
        const cr = 0.5 * px[i] - 0.419 * px[i + 1] - 0.081 * px[i + 2];
        let a = skinAlpha(wide, mk[i + 1], opt.skin ? Math.hypot(cb - rb, cr - rr) : 0, opt.skin ? (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / ry : 1);
        const s = ((x - local[0][0]) * ux + (y - local[0][1]) * uy) / armLen;
        if (s > 0.2) a *= Math.max(0, 1 - (s - 0.2) / 0.8);
        px[i + 3] = a * 255;
      }
    }
    vc.putImageData(img, 0, 0);
    // ---- đặt lên màn hình: cùng phép đặt với con trỏ tay (80 % giữa khung hình phủ kín màn hình), thu nhỏ quanh điểm chụm
    const at = (p: number[]) => [W * (0.5 + sx * (p[0] / vw - 0.5) * 1.25), H * (0.5 + sy * (p[1] / vh - 0.5) * 1.25)];
    const t4 = at(q[4]);
    const t8 = at(q[8]);
    const cx = (t4[0] + t8[0]) / 2;
    const cy = (t4[1] + t8[1]) / 2;
    const A = (sx * 1.25 * W * size) / vw;
    const D = (sy * 1.25 * H * size) / vh;
    main.setTransform(A, 0, 0, D, cx * (1 - size) + size * W * (0.5 - sx * 0.625), cy * (1 - size) + size * H * (0.5 - sy * 0.625));
    main.shadowColor = 'rgba(4, 6, 24, 0.55)';
    main.shadowBlur = 16 * dpr;
    main.shadowOffsetY = 9 * dpr;
    main.drawImage(work!.v, bx, by);
    main.shadowColor = 'transparent';
    cursors.push([cx, cy, !!opt.pinch[n]]);
  });
  // ---- tay bóng ma (vừa mất dấu): bóng trắng khói mờ dần ở vị trí ngoại suy, để người dùng thấy hệ thống vẫn đang giữ vật
  if (ghosts.length) {
    ghostCanvas ??= document.createElement('canvas');
    if (ghostCanvas.width !== W || ghostCanvas.height !== H) Object.assign(ghostCanvas, {width: W, height: H});
    const g = ghostCanvas.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    g.lineCap = g.lineJoin = 'round';
    g.fillStyle = g.strokeStyle = '#E6ECF2';
    for (const gh of ghosts) {
      const q = gh.pts.map((p) => [W * p.x, H * p.y]);
      const cx = (q[4][0] + q[8][0]) / 2;
      const cy = (q[4][1] + q[8][1]) / 2;
      g.globalAlpha = gh.alpha * 0.5;
      handTubes(g, q.map(([x, y]) => [cx + (x - cx) * size, cy + (y - cy) * size]), 1);
    }
    g.globalAlpha = 1;
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.filter = `blur(${2 * dpr}px)`;
    main.drawImage(ghostCanvas, 0, 0);
    main.filter = 'none';
  }
  // ---- con trỏ: vòng trắng viền tối ở điểm chụm; chụm thì thu nhỏ và đặc lại
  main.setTransform(1, 0, 0, 1, 0, 0);
  for (const [x, y, down] of cursors) {
    const r = (down ? 7 : 12) * dpr;
    main.beginPath();
    main.arc(x, y, r, 0, Math.PI * 2);
    main.lineWidth = 5 * dpr;
    main.strokeStyle = 'rgba(14, 16, 48, 0.75)';
    main.stroke();
    main.lineWidth = 2.5 * dpr;
    main.strokeStyle = down ? '#FF7A3D' : '#FBF9F4';
    main.stroke();
    if (down) {
      main.fillStyle = '#FF7A3D';
      main.fill();
    }
  }
}

let audio: AudioContext | null = null;
/** Tiếng báo ngắn: trầm khi hệ thống buông vật vì mất dấu tay, thanh khi bắt lại được tay. */
function tone(freq: number) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    g.gain.setValueAtTime(0.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + 0.18);
    o.frequency.value = freq;
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.2);
  } catch {
    /* không có âm thanh: bỏ qua */
  }
}
const UI = 'button, a, label, select, input';
const OUTLINE = '2px solid #D9481C';

/**
 * Khung chung của mọi bài thực hành tay: sân khấu 3D (toàn màn hình được), camera nhìn từ trên xuống → hai bàn tay,
 * chuột / cảm ứng thay tay, và cột điều khiển bên phải (`children` = phần riêng của từng bài).
 */
const HandsShell: React.FC<{hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode; hud?: React.ReactNode; lens?: React.ReactNode}> = ({hint, render, children, hud, lens}) => {
  const input = useRef(newInput()).current;
  const [gl, setGl] = useState(false);
  const [cam, setCam] = useState<'off' | 'loading' | 'on'>('off');
  const [camError, setCamError] = useState('');
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState('');
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [open, setOpen] = useState(true);
  const labId = useContext(LabIdContext);
  const [tab, setTab] = useState<'do' | 'guide'>('do');
  const [bones, setBones] = useState(false);
  input.skeleton = bones;
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const stop = useRef<(() => void) | null>(null);
  const [size, setSizeState] = useState(0.6);
  const handSize = useRef(size);
  handSize.current = size;
  const [skin, setSkin] = useState(true);
  const skinCut = useRef(skin);
  skinCut.current = skin;
  const flips = useRef({flipX, flipY});
  flips.current = {flipX, flipY};

  useEffect(() => {
    if (canWebGL()) setGl(true);
    // đọc cài đặt đã lưu SAU khi hydrate: đọc trong useState làm bản dựng phía máy chủ và phía trình duyệt lệch nhau
    setFlipX(stored('flipX'));
    setFlipY(stored('flipY'));
    setSizeState(storedNum('size', 0.6));
    // đổi bài (kể cả đổi bằng tay) dựng lại khung này: camera đang bật thì tự bật lại, không bắt người dùng với tới chuột
    if (stored('cam')) {
      let id = '';
      try {
        id = localStorage.getItem('hands-lab-camId') ?? '';
      } catch {
        /* dùng camera mặc định */
      }
      setCamId(id);
      void startCam(id);
    }
    return () => {
      runId.current++;
      stop.current?.();
    };
  }, []);

  const startCam = async (deviceId = camId) => {
    stop.current?.();
    stop.current = null;
    if (!video.current) return;
    setCam('loading');
    setCamError('');
    const filters = [0, 1].map(() => Array.from({length: 42}, () => oneEuro(0.9, 14)));
    // độ sâu (z) nhiễu hơn x, y nhiều: lọc mạnh hơn; chỉ dùng cho góc nghiêng cổ tay (`palmRoll`)
    const zFilters = [0, 1].map(() => Array.from({length: 21}, () => oneEuro(0.5, 5)));
    // lọc riêng cho hình tay (toạ độ camera): cắt rung nhưng bám sát tay đi nhanh để mặt nạ không trễ so với ảnh
    const maskFilters = [0, 1].map(() => Array.from({length: 42}, () => oneEuro(2.5, 25)));
    const gates = [0, 1].map(() => handGate());
    const raised = [false, false]; // chụm thô của khung trước, để bắt đúng lúc vừa chụm
    const latch = [0, 1].map(() => pinchLatch());
    const onUi = [false, false];
    const travel = [0, 1].map(() => slideTravel());
    const hovered: (HTMLElement | null)[] = [null, null];
    const run = ++runId.current;
    try {
      const halt = await startHands(video.current, deviceId || undefined, (hands) => {
        const t = performance.now() / 1000;
        const {flipX: fx, flipY: fy} = flips.current;
        const glow = [0, 0, 0, 0];
        const ghosts: {pts: Pt[]; alpha: number}[] = [];
        input.hands = [0, 1].map((i) => {
          const raw = hands[i]?.length === 21 ? hands[i] : null;
          // vùng giữa 80 % khung hình camera phủ kín bàn ảo: tay không phải với ra sát mép ảnh, nơi nhận diện kém
          const map = (v: number, flip: boolean) => 0.5 + ((flip ? 1 - v : v) - 0.5) * 1.25;
          const pinched = !!raw && latch[i](pinchRatio(raw), t);
          const g = gates[i](raw && raw.map((p, j) => ({x: filters[i][j * 2](map(p.x, fx), t), y: filters[i][j * 2 + 1](map(p.y, fy), t), z: p.z === undefined ? undefined : zFilters[i][j](p.z, t)})), pinched, t);
          if (g.event === 'dock') {
            filters[i] = Array.from({length: 42}, () => oneEuro(0.9, 14));
            zFilters[i] = Array.from({length: 21}, () => oneEuro(0.5, 5));
          }
          if (g.event) tone(g.event === 'dock' ? 180 : 880);
          if (g.alpha > 0 && g.alpha < 1) ghosts.push(g);
          // chụm vào nút trên màn hình = bấm nút đó: đổi bài, làm lại, đấu mẫu… mà không phải rút tay ra cầm chuột
          let el: HTMLElement | null = null;
          if (raw) {
            edgeGlow(g.pts).forEach((v, n) => (glow[n] = Math.max(glow[n], v)));
            el = document.elementFromPoint?.(((g.pts[4].x + g.pts[8].x) / 2) * window.innerWidth, ((g.pts[4].y + g.pts[8].y) / 2) * window.innerHeight)?.closest<HTMLElement>(UI) ?? null;
            if (!raised[i]) {
              // lần chụm bắt đầu trên nút thì không cầm vật trong cảnh nằm sau bảng; đang kéo vật ngang qua bảng thì vẫn giữ
              onUi[i] = !!el && pinched;
              if (onUi[i] && g.pinch) el!.click();
            }
            raised[i] = pinched;
          }
          if (el !== hovered[i]) {
            if (hovered[i]?.style.outline === OUTLINE) hovered[i]!.style.outline = '';
            if (el) el.style.outline = OUTLINE;
            hovered[i] = el;
          }
          return {pts: g.pts, pinch: g.pinch && !onUi[i], slide: travel[i](raw && !pinched && !el ? thumbSlide(g.pts) : null, t)};
        });
        const shown = [0, 1].map((i) => {
          const h = hands[i];
          if (h?.length !== 21) {
            maskFilters[i] = Array.from({length: 42}, () => oneEuro(2.5, 25));
            return [] as Pt[];
          }
          return h.map((q, j) => ({x: maskFilters[i][j * 2](q.x, t), y: maskFilters[i][j * 2 + 1](q.y, t)}));
        });
        if (overlay.current && video.current) paintHands(overlay.current, video.current, shown, fx, fy, ghosts, handSize.current, {skin: skinCut.current, pinch: input.hands.map((h) => h.pinch)});
        if (vignette.current) vignette.current.style.boxShadow = glow.map((v, n) => `inset ${n === 0 ? 90 : n === 1 ? -90 : 0}px ${n === 2 ? 90 : n === 3 ? -90 : 0}px 90px -60px rgba(240,170,50,${(v * 0.9).toFixed(2)})`).join(',');
      });
      // khung đã gỡ hoặc đã có lần bật mới hơn trong lúc chờ: tắt ngay, không để camera chạy ngầm
      if (run !== runId.current) return halt();
      stop.current = halt;
      setCam('on');
      remember('cam', '1');
      // lưu mã camera THẬT đang dùng (không phải mã cũ đã hỏng, nếu đã phải rơi về camera mặc định)
      const realId = (video.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId ?? '';
      remember('camId', realId);
      setCamId(realId);
      setCams(await listCameras());
    } catch (e) {
      setCam('off');
      setCamError(camMessage(e));
    }
  };
  const stopCam = () => {
    stop.current?.();
    stop.current = null;
    input.hands = newInput().hands;
    overlay.current?.getContext('2d')?.reset();
    if (vignette.current) vignette.current.style.boxShadow = '';
    remember('cam', '0');
    setCam('off');
  };
  const setFlip = (k: 'flipX' | 'flipY', v: boolean) => {
    (k === 'flipX' ? setFlipX : setFlipY)(v);
    remember(k, v ? '1' : '0');
  };
  /** `down` bỏ trống = chỉ di chuyển. Nhấn/nhả xếp hàng để cảnh xử lí mỗi khung hình một sự kiện: chạm rất nhanh vẫn không mất. */
  const mouseAt = (e: React.PointerEvent, down?: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    const m = input.mouse;
    const at = {x: ((e.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((e.clientY - r.top) / r.height) * 2};
    m.active = true;
    if (down === undefined && !m.queue.length) Object.assign(m, at);
    else m.queue.push({...at, down: down ?? m.queue[m.queue.length - 1].down});
    return at;
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0E1030]" data-testid="hands-lab">
      {gl ? (
        <div
          className="absolute inset-0"
          onPointerDownCapture={(e) => {
            const p = mouseAt(e);
            if (input.grab(p.x, p.y)) {
              mouseAt(e, true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={(e) => mouseAt(e)}
          onPointerUp={(e) => mouseAt(e, false)}
          onPointerCancel={() => Object.assign(input.mouse, {down: false, active: false, queue: []})}
          onPointerLeave={() => (input.mouse.active = false)}
        >
          <Suspense fallback={null}>{render(input, () => setGl(false))}</Suspense>
        </div>
      ) : (
        <p className="absolute left-6 top-24 max-w-md rounded-2xl border border-white/20 bg-white/10 px-4 py-6 text-xs leading-relaxed text-[#E8E6F5]">Thiết bị này không dựng được cảnh 3D (cần WebGL 2). Vẫn có thể làm bài bằng các nút bên cạnh để xem kết quả.<button type="button" data-testid="gl-retry" onClick={() => setGl(canWebGL())} className="mt-3 block min-h-[44px] rounded-full border border-white/40 px-5 font-semibold text-[#FBF9F4]">Thử lại</button><span className="mt-2 block opacity-70">Nếu vẫn không được: đóng bớt tab đang dùng 3D, bật tăng tốc phần cứng của trình duyệt (Cài đặt → Hệ thống), rồi tải lại trang.</span></p>
      )}

      {hud && <div className="pointer-events-none absolute left-1/2 top-16 z-10 flex w-[min(720px,calc(100vw-420px))] -translate-x-1/2 flex-wrap justify-center gap-1.5">{hud}</div>}
      {lens}
      <aside className="absolute right-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] w-[min(340px,calc(100vw-2rem))] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-white/30 bg-[#FBF9F4]/90 p-3.5 text-xs tabular-nums text-[#1D1B16] shadow-2xl backdrop-blur [&_button]:min-h-[44px] [&_input[type=range]]:h-7">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="self-end font-medium underline-offset-2 hover:underline">
          {open ? 'Thu gọn bảng' : 'Mở bảng điều khiển'}
        </button>
        <div className={open ? 'flex flex-col gap-2.5' : 'hidden'}>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-[#1D1B16]/[.07] p-1">
          {([['do', 'Thao tác'], ['guide', 'Hướng dẫn']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" data-testid={`lab-panel-${k}`} aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 font-semibold ${tab === k ? 'bg-white text-[#1D1B16] shadow-sm' : 'text-[#4B473D]'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* phần thao tác chỉ ẩn đi (không gỡ) để giữ nguyên trạng thái thí nghiệm khi đọc hướng dẫn */}
        <div className={tab === 'do' ? 'contents' : 'hidden'}>{children}</div>
        {tab === 'guide' && <LabManual id={labId} />}
        <div className="mt-1 flex flex-col gap-2 border-t border-[#1D1B16]/10 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" data-testid="hands-camera" disabled={cam === 'loading'} onClick={() => (cam === 'on' ? stopCam() : startCam())} className={BTN_GHOST}>
              {cam === 'on' ? 'Tắt camera tay' : cam === 'loading' ? 'Đang mở camera…' : 'Bật camera tay'}
            </button>
            <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className={BTN_GHOST}>
              Toàn màn hình
            </button>
          </div>
          {camError && <p role="alert" className="text-[#C4261A]">{camError}</p>}
          {/* video khi tắt vẫn có khung hiển thị (cao 0) chứ không display:none, vì một số trình duyệt không giải mã video bị ẩn hẳn */}
          <div aria-hidden={cam !== 'on'} className={cam === 'on' ? 'flex flex-col gap-2' : 'h-0 overflow-hidden opacity-0'}>
            {cams.length > 1 && (
              <select aria-label="Chọn camera" value={camId} onChange={(e) => { setCamId(e.target.value); void startCam(e.target.value); }} className="min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-2">
                <option value="">Camera mặc định</option>
                {cams.map((c, i) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-3">
              {([['flipX', 'Lật trái–phải', flipX], ['flipY', 'Lật trên–dưới', flipY]] as const).map(([k, label, v]) => (
                <label key={k} className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={v} onChange={(e) => setFlip(k, e.target.checked)} />
                  {label}
                </label>
              ))}
              <label className="flex w-full items-center gap-2">
                <span className="shrink-0">Cỡ tay {Math.round(size * 100)} %</span>
                <input
                  data-testid="hands-size"
                  type="range"
                  min={30}
                  max={100}
                  value={Math.round(size * 100)}
                  className="flex-1"
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setSizeState(v);
                    try {
                      localStorage.setItem('hands-lab-size', String(v));
                    } catch {
                      /* chế độ riêng tư: chỉ mất ghi nhớ */
                    }
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={bones} onChange={(e) => setBones(e.target.checked)} />
                Hiện khung xương tay
              </label>
              <label className="inline-flex items-center gap-1.5" title="Tắt nếu đeo găng, hoặc nếu hình tay bị thủng lỗ do ánh sáng màu">
                <input data-testid="hands-skin" type="checkbox" checked={skin} onChange={(e) => setSkin(e.target.checked)} />
                Cắt hình tay sát theo màu da
              </label>
            </div>
            <video ref={video} muted playsInline className="w-full rounded-xl border border-[#1D1B16]/15 bg-black" style={{transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`}} />
            <p className="leading-relaxed text-[#4B473D]">Camera đặt cố định phía trên, nhìn thẳng xuống mặt bàn trống; bàn tay thật hiện ngay trong phòng. Đưa tay sang phải mà hình tay chạy sang trái thì bật “Lật trái–phải”; tương tự với trên–dưới. Chụm ngón vào một nút trên màn hình (viền cam) để bấm nút đó. Núm xoay nào cũng có hai nút tròn − và + ngay cạnh: giữ ngón tay trên nút (không cần chụm) để đổi giá trị, giữ lâu thì đổi nhanh dần. Tay ra sát mép thì mép màn hình sáng vàng; tay bị che dưới nửa giây thì vật đang cầm vẫn được giữ.</p>
          </div>
          <p className="leading-relaxed text-[#4B473D]">{hint} Không có camera thì dùng chuột hoặc chạm.</p>
        </div>
        </div>
      </aside>
      {/* trên cả bảng điều khiển và thanh chọn bài: tay thật vẫn thấy được khi đưa tới bấm nút */}
      <canvas ref={overlay} className="pointer-events-none absolute inset-0 z-30 h-full w-full" />
      <div ref={vignette} className="pointer-events-none absolute inset-0 z-30" />
    </div>
  );
};

const Task: React.FC<{children: React.ReactNode}> = ({children}) => (
  <p className="leading-relaxed text-[#4B473D]">
    <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ</b>
    {children}
  </p>
);
const Warning: React.FC<{testid: string; text: string}> = ({testid, text}) =>
  text ? (
    <p data-testid={testid} role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 font-medium text-[#C4261A]">
      {text}
    </p>
  ) : null;

// ------------------------------------------------------------------ đấu động cơ 3 pha
const ThreePhaseLab: React.FC = () => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [on, setOn] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [rated, setRated] = useState(220);
  const [warn, setWarn] = useState('');
  const st = useRef({wires, on, rated});
  st.current = {wires, on, rated};
  // hậu quả đấu sai: chập pha, vỏ mang điện, quá áp làm cháy cuộn dây
  const wrong = verdict?.kind === 'short' ? 'electric-short' : verdict?.kind === 'live_frame' ? 'electric-frame' : verdict?.kind === 'run' && verdict.load === 'over' && !on ? 'electric-over' : null;
  const [ack, setAck] = useState<string | null>(null);
  useEffect(() => {
    if (!wrong) setAck(null);
  }, [wrong]);
  const edit = (fn: (w: Wire[]) => Wire[]) => {
    if (st.current.on) return setWarn(LIVE_WARNING);
    setWarn('');
    setVerdict(null);
    setWires(fn);
  };
  const toggle = () => {
    setWarn('');
    if (st.current.on) {
      setOn(false);
      setVerdict(null);
      return;
    }
    const v = evaluate(st.current.wires, st.current.rated);
    setVerdict(v);
    if (v.kind === 'short' || v.kind === 'live_frame') live.current.tripAt = performance.now();
    else setOn(true);
  };
  const live = useRef<HandsLive>({
    wires,
    on,
    verdict,
    tripAt: -1e9,
    connect: (a, b) => edit((w) => (w.some((x) => wireKey(...x) === wireKey(a, b)) ? w : [...w, [a, b]])),
    remove: (key) => edit((w) => w.filter((x) => wireKey(...x) !== key)),
    toggle: () => toggle(),
  });
  Object.assign(live.current, {wires, on, verdict, toggle});
  // quá áp: động cơ chạy vài giây rồi rơ-le nhiệt cắt
  useEffect(() => {
    if (!on || verdict?.kind !== 'run' || verdict.load !== 'over') return;
    const h = setTimeout(() => {
      setOn(false);
      live.current.tripAt = performance.now();
    }, 4500);
    return () => clearTimeout(h);
  }, [on, verdict]);
  const shown = verdict ? explain(verdict) : null;

  return (
    <HandsShell hint="Chụm ngón cái và ngón trỏ vào một cọc, kéo tới cọc khác rồi nhả để nối dây. Chụm vào hạt trắng giữa dây để gỡ, vào cần aptomat để đóng hoặc cắt." render={(input, onFail) => <ThreePhase3D input={input} live={live.current} onFail={onFail} />} lens={<IncidentCard m={wrong && wrong !== ack ? MISHAPS[wrong] : null} onClose={() => setAck(wrong)} onReset={() => { setWires([]); setOn(false); setVerdict(null); setWarn(''); }} />}>
      <Task>Lưới điện 3 pha 380 V. Đấu dây để động cơ chạy đúng định mức, nối đất vỏ máy, rồi đóng aptomat.</Task>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[#4B473D]">Nhãn động cơ</span>
        {RATED.map(([v, label]) => (
          <button key={v} type="button" disabled={on} aria-pressed={rated === v} onClick={() => { setRated(v); setVerdict(null); }} className={PILL(rated === v)}>
            {label}
          </button>
        ))}
      </div>
      <div data-testid="hands-status" data-ok={!!shown?.ok && on} className={`rounded-xl px-3 py-2 leading-relaxed ${shown?.ok ? 'bg-[#1F7A4D]/[.09]' : shown?.danger ? 'bg-[#C4261A]/[.08]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${shown?.ok ? 'text-[#1F7A4D]' : shown?.danger ? 'text-[#C4261A]' : ''}`}>{shown ? shown.head : 'Aptomat đang cắt: an toàn để đấu dây'}</b>
        {shown ? shown.body : 'Nối xong thì đóng aptomat để thử.'}
        {shown && !on && verdict?.kind === 'run' && ' Rơ-le nhiệt đã cắt mạch.'}
      </div>
      <Warning testid="hands-warning" text={warn} />
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="hands-breaker" onClick={toggle} className={BTN}>
          {on ? 'Cắt aptomat' : 'Đóng aptomat'}
        </button>
        <button type="button" data-testid="hands-clear" onClick={() => edit(() => [])} className={BTN_GHOST}>
          Gỡ hết dây
        </button>
        <span data-testid="hands-wires" className="text-[#4B473D]">
          Đã đấu {wires.length} dây
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[#4B473D]">Đấu mẫu</span>
        {([['star', 'Sao'], ['delta', 'Tam giác'], ['short', 'Ngắn mạch']] as const).map(([k, label]) => (
          <button key={k} type="button" data-testid={`hands-sample-${k}`} onClick={() => edit(() => SAMPLE[k])} className={`${BTN_GHOST} !min-h-[30px] !px-3`}>
            {label}
          </button>
        ))}
      </div>
    </HandsShell>
  );
};

// ------------------------------------------------------------------ tháo lắp (động cơ, robot)
const AssemblyLab: React.FC<{kind: AssemblyKind}> = ({kind}) => {
  const spec = SPECS[kind];
  const fresh = () => (spec.start === 'apart' ? allOff(spec) : new Set<string>());
  const [off, setOff] = useState<ReadonlySet<string>>(fresh);
  // bài tháo: phải tháo rời hết rồi lắp lại mới tính là xong
  const [wasApart, setWasApart] = useState(spec.start === 'apart');
  const [warn, setWarn] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [names, setNames] = useState(false);
  // vít / bu-lông / phe giữ từng chi tiết (true = đang siết chặt) và dụng cụ đang cầm
  const [screws, setScrews] = useState<Record<string, boolean[]>>(() => initialScrews(kind, spec));
  const [tool, setTool] = useState<{name: string; use: string; hint: string} | null>(null);
  const done = wasApart && off.size === 0 && allTight(kind, screws);
  const live = useRef<AssemblyLive>({
    screws,
    setScrew: (id, idx, tight) => {
      live.current.screws = {...live.current.screws, [id]: (live.current.screws[id] ?? []).map((v, j) => (j === idx ? tight : v))};
      setScrews(live.current.screws);
    },
    warn: (text, mistake = false) => {
      setWarn(text);
      if (mistake) setMistakes((m) => m + 1);
    },
    tool: setTool,
    kind,
    spec,
    off,
    names,
    run: done,
    focus: setFocus,
    attempt: (id) => {
      const wasOff = live.current.off.has(id);
      // còn vít / bu-lông giữ thì không nhấc được: phải nới hết bằng dụng cụ đúng
      const held = wasOff ? null : holdingMessage(kind, id, live.current.screws[id]);
      if (held) {
        setWarn(held);
        setMistakes((m) => m + 1);
        return false;
      }
      const r = movePart(spec, live.current.off, id);
      if ('blocked' in r) {
        setWarn(`Chưa được: phải ${live.current.off.has(id) ? 'lắp' : 'tháo'} ${r.blocked.join(', ')} trước.`);
        setMistakes((m) => m + 1);
        return false;
      }
      live.current.off = r.off; // cảnh 3D đọc ngay trong khung hình này, không chờ React
      setOff(r.off);
      setWarn('');
      const lock = seated(FASTENERS[kind][id]);
      if (wasOff && lock) {
        // chi tiết vừa đặt vào chỗ: vít còn lỏng (trừ chi tiết ép vào), phải siết đủ mới tính là xong
        live.current.screws = {...live.current.screws, [id]: lock};
        setScrews(live.current.screws);
      }
      if (r.off.size === spec.parts.length) setWasApart(true);
      return true;
    },
  });
  Object.assign(live.current, {off, names, run: done, screws});
  const reset = () => {
    live.current.screws = initialScrews(kind, spec);
    setScrews(live.current.screws);
    setTool(null);
    setOff(fresh());
    setWasApart(spec.start === 'apart');
    setWarn('');
    setMistakes(0);
  };
  const setAllScrews = (tight: boolean) => {
    // chỉ chi tiết đang lắp mới có vít để siết; chi tiết nằm trên khay thì vít đã rời
    live.current.screws = Object.fromEntries(Object.entries(live.current.screws).map(([id, s]) => [id, s.map(() => tight && !live.current.off.has(id))]));
    setScrews(live.current.screws);
    setWarn('');
  };
  const shownPart = spec.parts.find((p) => p.id === focus);
  const n = spec.parts.length;

  return (
    <HandsShell hint="Chụm ngón cái và ngón trỏ vào một chi tiết để nhấc, kéo ra khay hoặc đưa về đúng vị trí (vòng cam) rồi nhả." render={(input, onFail) => <Assembly3D input={input} live={live.current} onFail={onFail} />}>
      <Task>{spec.task} Mỗi chi tiết được giữ bằng vít, bu-lông hay phe: chọn đúng dụng cụ trong hộp, vặn hết ra mới nhấc được; lắp lại thì đặt vào chỗ rồi siết đủ.</Task>
      <div data-testid="asm-status" data-done={done} className={`rounded-xl px-3 py-2 leading-relaxed ${done ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${done ? 'text-[#1F7A4D]' : ''}`}>{done ? 'Hoàn thành' : wasApart && spec.start === 'built' ? `Đang lắp lại: ${n - off.size}/${n} chi tiết` : spec.start === 'built' ? `Đang tháo: ${off.size}/${n} chi tiết` : `Đang lắp: ${n - off.size}/${n} chi tiết`}</b>
        {done ? spec.done : `Số lần sai thứ tự: ${mistakes}`}
      </div>
      <p data-testid="asm-screws" className="text-[#4B473D]">
        Vít, bu-lông đang siết: {Object.values(screws).reduce((a, s) => a + tightCount(s), 0)}/{Object.values(screws).reduce((a, s) => a + s.length, 0)}
      </p>
      {tool && (
        <p data-testid="asm-tool" className="rounded-xl border border-[#D9481C]/40 bg-white px-3 py-2 leading-relaxed text-[#4B473D]">
          <b className="block font-semibold text-[#1D1B16]">Đang cầm: {tool.name}</b>
          Dùng cho {tool.use}.<span className="mt-1 block text-[#D9481C]">{tool.hint}</span>
        </p>
      )}
      <details data-testid="asm-kit" className="rounded-xl border border-[#1D1B16]/10 bg-white/60 px-3 py-2">
        <summary className="cursor-pointer font-semibold">Hộp dụng cụ ({KITS[kind].length} món)</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#4B473D]">
          {KITS[kind].map((id) => (
            <li key={id}>
              <b>{TOOLS[id].name}</b>: {TOOLS[id].use}
            </li>
          ))}
        </ul>
      </details>
      <Warning testid="asm-warning" text={warn} />
      {shownPart && (
        <p data-testid="asm-info" className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2 leading-relaxed text-[#4B473D]">
          <b className="block font-semibold text-[#1D1B16]">{shownPart.name}</b>
          {shownPart.info}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {spec.parts.map((p) => (
          <button key={p.id} type="button" data-testid={`asm-part-${p.id}`} aria-pressed={!off.has(p.id)} title={off.has(p.id) ? 'Đang ở khay: bấm để lắp' : 'Đang lắp: bấm để tháo'} onClick={() => { setFocus(p.id); live.current.attempt(p.id); }} className={PILL(!off.has(p.id))}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" data-testid="asm-reset" onClick={reset} className={BTN_GHOST}>
          Làm lại
        </button>
        {/* lối tắt khi chưa có camera hoặc để xem mẫu: không thay cho việc tập dùng dụng cụ */}
        <button type="button" data-testid="asm-loosen-all" onClick={() => setAllScrews(false)} className={BTN_GHOST}>
          Nới hết vít (xem mẫu)
        </button>
        <button type="button" data-testid="asm-tighten-all" onClick={() => setAllScrews(true)} className={BTN_GHOST}>
          Siết hết vít (xem mẫu)
        </button>
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} />
          Hiện tên chi tiết
        </label>
      </div>
    </HandsShell>
  );
};

// ------------------------------------------------------------------ căn chỉnh laser bằng gương
const DEG = Math.PI / 180;
const OpticsLab: React.FC = () => {
  const [mirrors, setMirrors] = useState<Mirror[]>(START);
  const live = useRef<OpticsLive>({
    mirrors,
    set: (i, m) => {
      // cảnh 3D đọc ngay trong khung hình này, không chờ React
      live.current.mirrors = live.current.mirrors.map((x, j) => (j === i ? m : x));
      setMirrors(live.current.mirrors);
    },
  });
  live.current.mirrors = mirrors;
  const tr = trace(mirrors);
  const length = tr.path.reduce((sum, q, i) => (i ? sum + Math.hypot(q[0] - tr.path[i - 1][0], q[1] - tr.path[i - 1][1]) : 0), 0);
  const used = new Set(tr.bounces.map((b) => b.mirror)).size;

  return (
    <HandsShell hint="Chụm vào thân gương để dời, chụm vào núm vàng ở đầu gương rồi kéo để xoay." render={(input, onFail) => <Optics3D input={input} live={live.current} onFail={onFail} />}>
      <Task>Vách đen chắn đường thẳng từ laser tới đầu thu. Dùng gương phẳng dẫn tia vòng qua vách, đi vào đúng trục ống của đầu thu (lệch không quá 6°). Thử thách: chỉ dùng 2 gương.</Task>
      <div data-testid="optics-status" data-ok={tr.aligned} className={`rounded-xl px-3 py-2 leading-relaxed ${tr.aligned ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${tr.aligned ? 'text-[#1F7A4D]' : ''}`}>{tr.aligned ? `Đạt với ${used} gương: đầu thu nhận đủ tín hiệu` : tr.hit ? `Tia chạm miệng ống nhưng lệch trục ${tr.off.toFixed(1)}°` : 'Tia chưa tới đầu thu'}</b>
        Tia phản xạ {tr.bounces.length} lần, đi {length.toFixed(2)} m. Ở mỗi gương, góc phản xạ bằng góc tới.
      </div>
      {mirrors.map((m, i) => {
        const b = tr.bounces.find((x) => x.mirror === i);
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-[150px] text-[#4B473D]">
              Gương {i + 1}: {b ? `góc tới ${b.deg.toFixed(1)}°` : 'tia chưa chạm'}
            </span>
            {([[-1, '−1°'], [-0.1, '−0,1°'], [0.1, '+0,1°'], [1, '+1°']] as const).map(([d, label]) => (
              <button key={d} type="button" aria-label={`Xoay gương ${i + 1} ${label}`} onClick={() => live.current.set(i, {...m, a: m.a + d * DEG})} className={`${BTN_GHOST} !min-h-[28px] !px-2`}>
                {label}
              </button>
            ))}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="optics-sample" onClick={() => setMirrors(SAMPLE_MIRRORS)} className={BTN_GHOST}>
          Xếp mẫu 3 gương
        </button>
        <button type="button" data-testid="optics-reset" onClick={() => setMirrors(START)} className={BTN_GHOST}>
          Làm lại
        </button>
      </div>
    </HandsShell>
  );
};

// ------------------------------------------------------------------ kẹp quang học kéo DNA
const noisy = (f: number, n: number) => {
  const a = Math.sin(n * 91.7 + 3.1) * 43758.5453;
  return Math.max(0, f * (1 + 0.05 * ((a - Math.floor(a)) * 2 - 1)) + 0.02 * (Math.sin(n * 12.9898) * 2 - 1) * 0.5);
};
const TweezersLab: React.FC = () => {
  const [trap, setTrap] = useState(0);
  const [noise, setNoise] = useState(true);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [fit, setFit] = useState<number | null>(null);
  const [overstretched, setOverstretched] = useState(false);
  const live = useRef<TweezersLive>({
    trap,
    noise,
    set: (nm) => {
      live.current.trap = nm;
      setTrap(nm);
    },
  });
  Object.assign(live.current, {noise});
  live.current.trap = trap;
  const s = settle(trap);
  if (s.force >= DNA.overstretch - 0.5 && !overstretched) setOverstretched(true);
  const record = () => setSamples((a) => [...a, {x: s.x, f: noisy(s.force, a.length + 1)}]);
  const inWlc = samples.filter((q) => q.x < OVERSTRETCH_X * 0.98 && q.f > 0.05).length;
  const P = fit ?? NaN;
  const ok = fit !== null && fit > 40 && fit < 60 && overstretched;
  // đồ thị: x ∈ [0, 1,9·L] µm, F ∈ [0, 80] pN
  const W = 300;
  const H = 150;
  const px = (x: number) => (x / (1.9 * DNA.L)) * W;
  const py = (f: number) => H - (Math.min(f, 80) / 80) * H;
  const curve = Array.from({length: 120}, (_, i) => {
    const x = (i / 119) * 1.9 * DNA.L;
    return `${px(x).toFixed(1)},${py(dnaForce(x)).toFixed(1)}`;
  }).join(' ');

  return (
    <HandsShell hint="Chụm vào vòng đỏ (tâm bẫy laser) rồi kéo sang phải: hạt kéo sợi DNA. Thanh trượt đặt tâm bẫy chính xác." render={(input, onFail) => <Tweezers3D input={input} live={live.current} onFail={onFail} />}>
      <Task>Kéo sợi DNA λ (16,5 µm), ghi ít nhất 6 điểm lực–độ giãn trong vùng chuỗi mềm, bấm "Khớp P" để ước lượng độ dài persistence, rồi kéo tiếp qua 65 pN để thấy DNA bị kéo giãn quá mức.</Task>
      <div data-testid="tw-status" data-ok={ok} className={`rounded-xl px-3 py-2 leading-relaxed ${ok ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${ok ? 'text-[#1F7A4D]' : ''}`}>{ok ? `Đạt: P ≈ ${P.toFixed(0)} nm, đã thấy quá kéo giãn` : `Lực ${s.force.toFixed(2)} pN · độ giãn ${(s.x / 1000).toFixed(2)} µm`}</b>
        Đã ghi {samples.length} điểm ({inWlc} trong vùng chuỗi mềm){fit !== null ? ` · P khớp được ≈ ${P.toFixed(0)} nm` : ''}
        {overstretched ? ' · đã vượt vùng quá kéo giãn' : ''}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[#4B473D]">Vị trí tâm bẫy: {(trap / 1000).toFixed(2)} µm</span>
        <input data-testid="tw-trap" type="range" min={0} max={Math.round(1.9 * DNA.L)} step={50} value={Math.round(trap)} onChange={(e) => live.current.set(Number(e.target.value))} />
      </label>
      <svg viewBox={`-30 -8 ${W + 40} ${H + 24}`} className="w-full rounded-xl bg-white" role="img" aria-label="Đồ thị lực theo độ giãn">
        <polyline points={curve} fill="none" stroke="#C9CED6" strokeWidth={2} />
        {samples.map((q, i) => (
          <circle key={i} cx={px(q.x)} cy={py(q.f)} r={3} fill="#2459C9" />
        ))}
        <circle cx={px(s.x)} cy={py(s.force)} r={4.5} fill="#D9481C" />
        <line x1={0} x2={W} y1={py(DNA.overstretch)} y2={py(DNA.overstretch)} stroke="#C4261A" strokeDasharray="4 3" />
        <text x={W - 2} y={py(DNA.overstretch) - 3} fontSize={9} textAnchor="end" fill="#C4261A">65 pN</text>
        <text x={0} y={H + 12} fontSize={9} fill="#4B473D">0</text>
        <text x={W} y={H + 12} fontSize={9} textAnchor="end" fill="#4B473D">độ giãn → 31 µm</text>
        <text x={-4} y={8} fontSize={9} textAnchor="end" fill="#4B473D">F</text>
      </svg>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="tw-record" onClick={record} className={BTN}>Ghi điểm</button>
        <button type="button" data-testid="tw-fit" disabled={inWlc < 6} onClick={() => setFit(fitPersistence(samples))} className={`${BTN_GHOST} disabled:opacity-50`}>Khớp P</button>
        <button type="button" data-testid="tw-reset" onClick={() => { setSamples([]); setFit(null); setOverstretched(false); live.current.set(0); }} className={BTN_GHOST}>Làm lại</button>
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={noise} onChange={(e) => setNoise(e.target.checked)} />
          Chuyển động Brown
        </label>
      </div>
      <p className="leading-relaxed text-[#4B473D]">Các điểm ghi có nhiễu đo ~5 %; đường xám là mô hình chuỗi mềm (P = 50 nm), không phải số đo thật.</p>
    </HandsShell>
  );
};

// ------------------------------------------------------------------ con lắc ngược trên xe
const CartPoleLab: React.FC = () => {
  const [auto, setAuto] = useState(true);
  const [gains, setGains] = useState<Gains>(GAINS);
  const [, tick] = useState(0);
  const live = useRef<CartLive>({
    state: {...START_STATE},
    auto,
    gains,
    xref: 0,
    held: 0,
    fell: false,
    kick: 0,
    reset: () => {
      Object.assign(live.current, {state: {...START_STATE}, xref: 0, held: 0, fell: false, kick: 0});
      tick((n) => n + 1);
    },
  });
  Object.assign(live.current, {auto, gains});
  useEffect(() => {
    const h = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(h);
  }, []);
  const L = live.current;
  const ok = !L.fell && L.held >= 10;
  const th = (L.state.th * 180) / Math.PI;

  return (
    <HandsShell hint="Chụm vào vòng xanh (khi bộ điều khiển bật) hoặc vào xe (khi tắt) rồi kéo." render={(input, onFail) => <CartPole3D input={input} live={live.current} onFail={onFail} />}>
      <Task>Giữ cột đứng thẳng ít nhất 10 s. Tắt bộ điều khiển để tự điều khiển bằng tay (khó!), bật lại rồi giảm kθ để thấy hệ mất ổn định, rồi tìm bộ hệ số vẫn đứng được dưới cú đẩy.</Task>
      <div data-testid="cp-status" data-ok={ok} data-fell={L.fell} className={`rounded-xl px-3 py-2 leading-relaxed ${ok ? 'bg-[#1F7A4D]/[.09]' : L.fell ? 'bg-[#C4261A]/[.08]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${ok ? 'text-[#1F7A4D]' : L.fell ? 'text-[#C4261A]' : ''}`}>{L.fell ? 'Cột đã ngã' : ok ? `Đạt: đứng ${L.held.toFixed(1)} s` : `Đứng ${L.held.toFixed(1)} s`}</b>
        θ = {th.toFixed(1)}° · x = {L.state.x.toFixed(2)} m · tổng lực phản hồi u = kx·(x−x_ref) + kv·v + kθ·θ + kω·ω
      </div>
      <label className="inline-flex items-center gap-1.5">
        <input data-testid="cp-auto" type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        Bộ điều khiển phản hồi
      </label>
      {([['kx', 'kx (vị trí xe)', 0, 10, 0.5], ['kv', 'kv (vận tốc xe)', 0, 10, 0.5], ['kth', 'kθ (góc cột)', 0, 80, 1], ['kw', 'kω (tốc độ góc)', 0, 15, 0.5]] as const).map(([key, label, min, max, st]) => (
        <label key={key} className="flex flex-col gap-0.5">
          <span className="text-[#4B473D]">{label}: {gains[key]}</span>
          <input data-testid={`cp-${key}`} type="range" min={min} max={max} step={st} value={gains[key]} onChange={(e) => setGains({...gains, [key]: Number(e.target.value)})} />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="cp-kick" disabled={L.fell} onClick={() => { live.current.kick = 0.25; }} className={BTN}>Đẩy cột</button>
        <button type="button" data-testid="cp-reset" onClick={() => live.current.reset()} className={BTN_GHOST}>Làm lại</button>
      </div>
      <p className="leading-relaxed text-[#4B473D]">Khối lượng xe {CART.M} kg, cột {CART.m} kg dài {CART.l * 2} m; xe chạy trên ray ±{CART.rail} m.</p>
    </HandsShell>
  );
};

/**
 * Dải số đo trực tiếp ở đỉnh màn hình (học từ HUD phản ứng của các phòng thí nghiệm ảo đã bóc tách), vẽ bằng nhãn viên thuốc của hệ thống:
 * nền chàm, chấm màu, chữ số đơn cách đều cột để số nhảy liên tục mà khung không giật.
 */
const LiveHud: React.FC<{ok: boolean; head: string; items: (readonly [string, string])[]}> = ({ok, head, items}) => (
  <>
    <span data-testid="lab-hud" className="rounded-full border border-white/20 bg-[#11143A]/85 px-3 py-1 text-[12px] font-semibold text-[#E8E6F5] shadow-sm backdrop-blur">
      <i className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{background: ok ? '#35C46A' : '#D9481C'}} />
      {head}
    </span>
    {items.map(([k, val]) => (
      <span key={k} className="rounded-full border border-white/20 bg-[#11143A]/85 px-3 py-1 text-[11px] text-[#E8E6F5]/80 shadow-sm backdrop-blur">
        {k} <b className="ml-1 inline-block min-w-[7ch] text-right font-mono font-semibold tabular-nums text-[#FBF9F4]">{val}</b>
      </span>
    ))}
  </>
);

// ------------------------------------------------------------------ bài mô phỏng điều khiển bằng thanh trượt 3D (SIMS)
const SimLab: React.FC<{id: string}> = ({id}) => {
  const spec = SIM_BY_ID[id];
  const [v, setV] = useState(() => initial(spec));
  const live = useRef<SimLive>({
    id,
    v,
    set: (pid, x) => {
      live.current.v = {...live.current.v, [pid]: x};
      setV(live.current.v);
    },
    events: {},
    act: (aid) => {
      live.current.events[aid] = (live.current.events[aid] ?? 0) + 1;
      setPressed((n) => n + 1);
    },
  });
  live.current.v = v;
  const verdict = spec.evaluate(v);
  // thẻ sự cố: do tham số (phát hiện thuần, chạy cả khi không có WebGL) hoặc do sự kiện trong cảnh (rót đổ, thả kim loại nổ…)
  const [incident, setIncident] = useState<string | null>(null);
  // đặt lại thí nghiệm = dựng lại cảnh 3D (xoá vũng hóa chất, hiệu ứng, vị trí vật đã kéo) chứ không chỉ trả các tham số về ban đầu
  const [epoch, setEpoch] = useState(0);
  live.current.report = setIncident;
  const hazard = mishapOf(id, v);
  useEffect(() => {
    if (hazard) setIncident(hazard);
  }, [hazard]);
  const guide = GUIDE[id];
  const [why, setWhy] = useState(false);
  const [, setPressed] = useState(0);
  const micro = microView(id, v);
  const slide = (p: SimParam) => (
    <label key={p.id} className="flex flex-col gap-0.5">
      <span className="text-[#4B473D]">
        {p.label}: {fmt(p, v[p.id])}
      </span>
      <input data-testid={`sim-${p.id}`} type="range" min={0} max={1000} value={Math.round(toUnit(p, v[p.id]) * 1000)} onChange={(e) => live.current.set(p.id, fromUnit(p, Number(e.target.value) / 1000))} />
    </label>
  );
  return (
    <HandsShell hint="Chụm vào con trượt trên các ray ở phía trước bàn rồi kéo sang trái hoặc phải. Chỉnh tinh con trượt màu cam (cái vừa cầm): duỗi ngón trỏ, miết ngón cái dọc ngón trỏ, tay để yên." render={(input, onFail) => <Sims3D key={epoch} input={input} live={live.current} onFail={onFail} />} lens={<>{micro && <MicroLens view={micro} />}<IncidentCard m={incident ? MISHAPS[incident] : null} onClose={() => setIncident(null)} onReset={() => {
          live.current.events = {};
          setV(initial(spec));
          setEpoch((e) => e + 1);
        }} /></>} hud={<LiveHud ok={verdict.ok} head={verdict.head} items={spec.params.map((p) => [p.label, fmt(p, v[p.id])])} />}>
      <Task>{spec.task}</Task>
      {guide && (
        <div data-testid="sim-guide" className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2 leading-relaxed text-[#4B473D]">
          <p>
            <b className="text-[#1D1B16]">Tự tay thử · </b>
            {guide.tryIt}
          </p>
          <p>
            <b className="text-[#1D1B16]">Em sẽ thấy · </b>
            {guide.see}
          </p>
          {why ? (
            <p data-testid="sim-why" className="mt-1 rounded-lg bg-[#1D1B16]/[.05] px-2 py-1.5 text-[#1D1B16]">
              <b>Kết luận · </b>
              {guide.why}
            </p>
          ) : (
            <button type="button" data-testid="sim-reveal" onClick={() => setWhy(true)} className="mt-1 font-medium text-[#2459C9] underline-offset-2 hover:underline">
              Xem kết luận
            </button>
          )}
        </div>
      )}
      <div data-testid="sim-status" data-ok={verdict.ok} className={`rounded-xl px-3 py-2 leading-relaxed ${verdict.ok ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${verdict.ok ? 'text-[#1F7A4D]' : ''}`}>{verdict.head}</b>
        {verdict.lines.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </div>
      {spec.params.map(slide)}
      {(OPS[id]?.actions ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="sim-actions">
          {OPS[id]!.actions!.map((a) => (
            <button key={a.id} type="button" data-testid={`sim-act-${a.id}`} onClick={() => live.current.act(a.id)} className={BTN}>
              {a.label} <span className="ml-1.5 font-mono tabular-nums opacity-70">×{live.current.events[a.id] ?? 0}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <button type="button" data-testid="sim-sample" onClick={() => setV(spec.solution)} className={BTN_GHOST}>
          Đặt giá trị mẫu
        </button>
        <button type="button" data-testid="sim-reset" onClick={() => { live.current.events = {}; setV(initial(spec)); setEpoch((e) => e + 1); }} className={BTN_GHOST}>
          Làm lại
        </button>
      </div>
    </HandsShell>
  );
};

// ------------------------------------------------------------------ bàn hóa học tự do (toàn bộ chất, dụng cụ và 33 bài của CSDL phản ứng)
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
const ChemLab: React.FC = () => {
  const [lab, dispatch] = useReducer(labReducer, undefined, newLab);
  const [group, setGroup] = useState<string>('Acid');
  const [exp, setExp] = useState('');
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(10);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [sub, setSub] = useState('hcl');
  const [target, setTarget] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const amountsRef = useRef(amounts);
  amountsRef.current = amounts;
  const live = useRef<ChemLive>({
    lab,
    dispatch,
    group,
    setGroup,
    amountOf: (id) => amountsRef.current[id] ?? SUB_BY_ID[id].amounts[Math.min(1, SUB_BY_ID[id].amounts.length - 1)].value,
    scale,
    active,
    setActive,
  });
  Object.assign(live.current, {lab, group, scale, active});
  const [incident, setIncident] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0); // đặt lại: dựng lại cảnh 3D để xoá vũng axit, bọt, vị trí chai và ống
  live.current.report = setIncident;
  const e = exp ? EXPERIMENT_BY_ID[exp] : undefined;
  const ds = useMemo(() => lab.vessels.map(derive), [lab]);
  const done = useMemo(() => (e ? stepsDone(e, lab) : []), [e, lab]);
  const equations = useMemo(() => {
    const ids = new Set<string>();
    lab.vessels.forEach((v) => v.fired.forEach((f) => ids.add(f)));
    return [...ids].map((r) => RULE_BY_ID.get(r)?.eq).filter(Boolean) as string[];
  }, [lab]);
  const s0 = SUB_BY_ID[sub];
  const props = useMemo(() => propertiesOf(sub), [sub]);
  /** các chất có thể cho vào cùng (rút từ chính cơ sở dữ liệu phản ứng): chỉ là lối tắt thao tác, thông tin nằm trên chất trong cảnh */
  const partners = useMemo(() => [...new Map((propertiesOf(sub)?.reactions ?? []).flatMap((r) => r.partners).map((q) => [q.id, q])).values()], [sub]);
  /** thử ngay một cặp: cho chất đang chọn rồi chất cặp vào ống đang chọn */
  const tryWith = (partner: string) => {
    dispatch({type: 'add', v: active, sub, amount});
    const p = SUB_BY_ID[partner];
    dispatch({type: 'add', v: active, sub: partner, amount: p.amounts[Math.min(1, p.amounts.length - 1)].value});
  };
  const amount = amounts[sub] ?? s0.amounts[Math.min(1, s0.amounts.length - 1)].value;
  const av = lab.vessels[active];
  const reset = () => {
    dispatch({type: 'reset'});
    setAnswers({});
    setEpoch((e) => e + 1);
  };
  const correct = e ? e.questions.filter((q, i) => answers[`${e.id}:${i}`] === q.answer).length : 0;
  return (
    <HandsShell
      hint="Chọn nhóm hóa chất ở dải màu trước kệ, chụm vào chai rồi kéo tới ống, giữ để rót. Chụm vào ống để nhấc ra thùng thải, vào vòng vàng ở miệng ống để kéo ống dẫn khí, vào đèn cồn để đun."
      render={(input, onFail) => <Chem3D key={epoch} input={input} live={live.current} onFail={onFail} />}
      lens={<IncidentCard m={incident ? MISHAPS[incident] : null} onClose={() => setIncident(null)} onReset={reset} />}
      hud={<LiveHud ok={!lab.violations.length} head={lab.violations.length ? `${lab.violations.length} vi phạm an toàn` : lab.goggles ? 'Đã đeo kính bảo hộ' : 'Chưa đeo kính bảo hộ'} items={[['Đồng hồ', `${lab.clock.toFixed(0)} s`], ['Tua nhanh', `×${scale}`], [av.id, `${ds[active].temp.toFixed(0)} °C${ds[active].ph !== null ? ` · pH ${ds[active].ph!.toFixed(1)}` : ''}`]]} />}
    >
      <Task>{e ? e.goal : `Bàn tự do: ${SUBSTANCES.length} hóa chất, ống nghiệm, cốc, đèn cồn, ống dẫn khí, thùng thải. Tự chọn chất để thử mọi phản ứng trong cơ sở dữ liệu (${RULES.length} luật), hoặc chọn một bài thí nghiệm có bước kiểm tra.`}</Task>
      <label className="flex flex-col gap-1">
        <span className="text-[#4B473D]">Bài thí nghiệm</span>
        <select data-testid="chem3d-experiment" value={exp} onChange={(ev) => { setExp(ev.target.value); reset(); }} className="min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-2">
          <option value="">Tự do: không theo bài</option>
          {CHEM_EXPERIMENTS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.lesson}: {x.title}
            </option>
          ))}
        </select>
      </label>
      {e && e.hazards.length > 0 && <p className="text-[#C4261A]">An toàn: {e.hazards.join('; ')}.</p>}
      <div className="flex flex-wrap gap-1.5">
        {CHEM_GROUPS.map((g) => (
          <button key={g} type="button" data-testid={`chem3d-group-${g}`} aria-pressed={group === g} onClick={() => setGroup(g)} className={PILL(group === g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#1D1B16]/15 bg-white p-2">
        <select data-testid="chem3d-sub" value={sub} onChange={(ev) => setSub(ev.target.value)} className="min-h-[44px] w-full rounded-[10px] border border-[#1D1B16]/25 bg-white px-2">
          {SUBSTANCES.filter((s) => s.group === group).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select data-testid="chem3d-amount" value={amount} onChange={(ev) => setAmounts((a) => ({...a, [sub]: Number(ev.target.value)}))} className="min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-1">
          {s0.amounts.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <select data-testid="chem3d-vessel" value={active} onChange={(ev) => setActive(Number(ev.target.value))} className="min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-1">
          {lab.vessels.map((v, i) => (
            <option key={v.id} value={i}>
              {v.id}
            </option>
          ))}
        </select>
        <button type="button" data-testid="chem3d-add" onClick={() => dispatch({type: 'add', v: active, sub, amount})} className={BTN}>
          Cho vào
        </button>
      </div>
      <p className="text-[#4B473D]">Chọn ở đây khi không có camera; có camera thì rót bằng tay thẳng từ kệ.</p>
      {partners.length > 0 && (
        <div data-testid="chem3d-partners" className="flex max-h-36 flex-wrap items-center gap-1.5 overflow-auto">
          <span className="text-[#4B473D]">Thử {s0.label} với</span>
          {partners.map((p) => (
            <button key={p.id} type="button" data-testid={`chem3d-try-${p.id}`} onClick={() => tryWith(p.id)} className="min-h-[36px] rounded-full border border-[#1D1B16]/25 bg-white px-2.5 font-medium hover:bg-[#FBF9F4]">
              {p.label}
            </button>
          ))}
        </div>
      )}
      <p className="text-[#4B473D]">Tính chất vật lí, hóa học và phản ứng hiện ngay trên chai (trỏ vào hoặc cầm chai) và trên ống đang phản ứng trong cảnh 3D.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="chem3d-goggles" aria-pressed={lab.goggles} onClick={() => dispatch({type: 'goggles', on: !lab.goggles})} className={PILL(lab.goggles)}>
          {lab.goggles ? 'Đã đeo kính' : 'Đeo kính bảo hộ'}
        </button>
        <button type="button" data-testid="chem3d-heat" onClick={() => dispatch({type: 'heat', v: active})} className={BTN_GHOST}>
          Đun {av.id}
        </button>
        <button type="button" data-testid="chem3d-discard" onClick={() => dispatch({type: 'discard', v: active})} className={BTN_GHOST}>
          Đổ bỏ
        </button>
        <button type="button" data-testid="chem3d-light" aria-pressed={av.light} onClick={() => dispatch({type: 'light', v: active, on: !av.light})} className={PILL(av.light)}>
          Chiếu sáng
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[#4B473D]">Dẫn khí sang</span>
        <select data-testid="chem3d-gas-to" value={target} onChange={(ev) => setTarget(Number(ev.target.value))} className="min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-1">
          {lab.vessels.map((v, i) => (i === active ? null : <option key={v.id} value={i}>{v.id}</option>))}
        </select>
        <button type="button" data-testid="chem3d-transfer" onClick={() => dispatch({type: 'transferGas', v: active, to: target === active ? (active + 1) % lab.vessels.length : target})} className={BTN_GHOST}>
          Dẫn
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[#4B473D]">Tua nhanh</span>
        {[1, 10, 60].map((x) => (
          <button key={x} type="button" data-testid={`chem3d-scale-${x}`} aria-pressed={scale === x} onClick={() => setScale(x)} className={PILL(scale === x)}>
            ×{x}
          </button>
        ))}
        <button type="button" data-testid="chem3d-wait" onClick={() => dispatch({type: 'wait', seconds: 30})} className={BTN_GHOST}>
          Chờ 30 s
        </button>
      </div>
      <div data-testid="chem3d-readout" className="rounded-xl bg-[#1D1B16]/[.05] px-3 py-2 leading-relaxed">
        <b className="block font-semibold">{av.id}: {ds[active].volumeMl.toFixed(1)} mL · {ds[active].temp.toFixed(0)} °C · pH {ds[active].ph === null ? '—' : ds[active].ph!.toFixed(1)}</b>
        Mùi: {ds[active].smell.length ? ds[active].smell.join(', ') : 'không'} · Đèn thử dẫn điện: {Math.round(ds[active].conducts * 100)} %
      </div>
      <div data-testid="chem3d-log" className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2">
        <b>Nhật kí hiện tượng</b>
        {lab.log.length === 0 ? (
          <p className="text-[#4B473D]">Chưa có thao tác.</p>
        ) : (
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto">
            {[...lab.log].reverse().slice(0, 30).map((l, i) => (
              <li key={`${l.t}-${i}`}>
                <span className="text-[#4B473D]">{l.t.toFixed(0)} s · {lab.vessels[l.v].id}:</span> {l.text}
              </li>
            ))}
          </ul>
        )}
        {equations.length > 0 && (
          <ul data-testid="chem3d-equations" className="mt-2 space-y-0.5 font-mono text-[11px]">
            {equations.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
        {lab.violations.length > 0 && (
          <ul data-testid="chem3d-violations" className="mt-2 space-y-0.5 text-[#C4261A]">
            {lab.violations.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
      </div>
      {e && (
        <div data-testid="chem3d-steps" className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2">
          <b>Các bước ({done.filter(Boolean).length}/{e.steps.length})</b>
          <ul className="mt-1 space-y-1">
            {e.steps.map((st, i) => (
              <li key={st.text} data-testid={`chem3d-step-${i}`} data-done={done[i] ? '1' : '0'} className={done[i] ? 'text-[#1F7A4D]' : ''}>
                {done[i] ? '✓' : '○'} {st.text}
              </li>
            ))}
          </ul>
          <b className="mt-2 block">Câu hỏi sau thí nghiệm</b>
          {e.questions.map((q, qi) => {
            const key = `${e.id}:${qi}`;
            const picked = answers[key];
            return (
              <div key={key} className="mt-1">
                <p>{q.q}</p>
                <div className="flex flex-wrap gap-1">
                  {q.options.map((o, oi) => (
                    <button key={o} type="button" data-testid={`chem3d-q-${qi}-opt-${oi}`} onClick={() => setAnswers((a) => ({...a, [key]: oi}))} className={PILL(picked === oi)}>
                      {o}
                    </button>
                  ))}
                </div>
                {picked !== undefined && (
                  <p className={picked === q.answer ? 'text-[#1F7A4D]' : 'text-[#C4261A]'}>
                    {picked === q.answer ? 'Đúng. ' : 'Chưa đúng. '}
                    {q.why}
                  </p>
                )}
              </div>
            );
          })}
          <p data-testid="chem3d-report" className="mt-2 text-[#4B473D]">
            Báo cáo: {done.filter(Boolean).length}/{e.steps.length} bước · {correct}/{e.questions.length} câu đúng · {lab.violations.length} vi phạm an toàn
          </p>
        </div>
      )}
      <div className="flex gap-1.5">
        {e && (
          <button type="button" data-testid="chem3d-sample" onClick={() => { dispatch({type: 'reset'}); for (const a of e.script) dispatch(a); }} className={BTN_GHOST}>
            Xem thao tác mẫu
          </button>
        )}
        <button type="button" data-testid="chem3d-reset" onClick={reset} className={BTN_GHOST}>
          Làm lại
        </button>
      </div>
    </HandsShell>
  );
};

/** Phòng thực hành ảo điều khiển bằng hai bàn tay thật (camera nhìn từ trên xuống) hoặc chuột / cảm ứng. */
export const HandsLab: React.FC<{experiment?: Experiment}> = ({experiment = 'three-phase'}) => (
  <LabIdContext.Provider value={experiment}>
    {experiment in SIM_BY_ID ? <SimLab key={experiment} id={experiment} /> : experiment === 'chem' ? <ChemLab /> : experiment === 'balance' ? <BalanceLab Shell={HandsShell} /> : experiment === 'three-phase' ? <ThreePhaseLab /> : experiment === 'optics' ? <OpticsLab /> : experiment === 'tweezers' ? <TweezersLab /> : experiment === 'cartpole' ? <CartPoleLab /> : <AssemblyLab key={experiment} kind={experiment as AssemblyKind} />}
  </LabIdContext.Provider>
);
