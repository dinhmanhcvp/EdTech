/** Theo dõi hai bàn tay bằng camera nhìn từ trên xuống (MediaPipe Hand Landmarker), tải khi người dùng bật camera. */

export type Pt = {x: number; y: number};

// shortcut: tệp wasm và mô hình tải từ CDN nên lần bật đầu cần mạng; lớp học không có mạng thì chép hai thứ này vào public/ và đổi hai hằng dưới.
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/** Khoảng cách đầu ngón cái – đầu ngón trỏ, chia cho cỡ bàn tay (cổ tay → gốc ngón giữa) để không phụ thuộc độ cao tay. */
export const pinchRatio = (p: Pt[]): number => Math.hypot(p[4].x - p[8].x, p[4].y - p[8].y) / (Math.hypot(p[0].x - p[9].x, p[0].y - p[9].y) || 1);
/** Hai ngưỡng (chụm < 0,3; nhả > 0,5) để tay run không làm rơi vật đang cầm. */
export const nextPinch = (was: boolean, ratio: number): boolean => ratio < (was ? 0.5 : 0.3);

export const PAD_DWELL = 0.15;
/**
 * Nút bấm "−" / "+" cạnh núm xoay: tốc độ đổi giá trị (phần của cả thang đo mỗi giây) theo thời gian đã giữ tay trên nút.
 * 0,15 s đầu chưa đổi (đưa tay lướt qua không làm lệch số), sau đó chậm 5 %/giây để chỉnh chính xác, giữ lâu thì nhanh dần tới 50 %/giây.
 * Giá trị đổi theo THỜI GIAN giữ chứ không theo vị trí tay, nên tay run không làm số giật.
 */
export const padRate = (held: number): number => (held < PAD_DWELL ? 0 : 0.05 + 0.45 * Math.min(1, (held - PAD_DWELL) / 1.5) ** 2);

export const PINCH_HOLD = 0.09;
/**
 * Chụm có trễ nhả: chụm thì nhận ngay, nhưng chỉ nhả khi hai ngón đã rời nhau liên tục 90 ms.
 * Nhìn từ trên xuống, đầu ngón cái và ngón trỏ che nhau nên điểm nhận diện nhảy một hai khung hình; không có trễ thì vật đang cầm bị rơi.
 */
export function pinchLatch(): (ratio: number, t: number) => boolean {
  let on = false;
  let openSince = -1;
  return (ratio, t) => {
    if (nextPinch(on, ratio)) {
      on = true;
      openSince = -1;
    } else if (on) {
      if (openSince < 0) openSince = t;
      if (t - openSince >= PINCH_HOLD) on = false;
    }
    return on;
  };
}

/** Khoảng cách màu (CbCr, bỏ qua độ sáng) dưới `SKIN_NEAR` chắc chắn là da, trên `SKIN_FAR` chắc chắn không phải. */
export const SKIN_NEAR = 13;
export const SKIN_FAR = 27;
/**
 * Độ đục 0–1 của một điểm ảnh trong hình bàn tay: `wide`, `core` (0–255) là mặt nạ rộng và mặt nạ lõi dựng từ khớp tay,
 * `d` là khoảng cách màu tới màu da lấy mẫu ở lòng bàn tay. Lõi luôn hiện (không thủng lỗ khi ánh sáng đổi);
 * phần rìa chỉ hiện nếu giống màu da, nên viền hình bám sát ngón tay thật thay vì lẫn nền bàn.
 */
/** Điểm ảnh tối hơn `DARK_CUT` lần độ sáng của da (lấy mẫu ở lòng bàn tay) là nền bàn tối, sáng hơn `DARK_KEEP` lần thì giữ. */
export const DARK_CUT = 0.3;
export const DARK_KEEP = 0.5;
/**
 * `luma` = độ sáng của điểm ảnh chia cho độ sáng da lấy mẫu. Trên bàn ĐEN, màu (CbCr) của nền gần bằng 0 nên khoảng cách màu tới da
 * rơi đúng vào vùng lưng chừng và nền lọt vào viền tay; độ sáng thì tách rất rõ, nên điểm ảnh tối bị bỏ kể cả khi nằm trong lõi mặt nạ.
 */
export const skinAlpha = (wide: number, core: number, d: number, luma = 1): number =>
  wide === 0 ? 0 : Math.max(core / 255, Math.min(1, Math.max(0, (SKIN_FAR - d) / (SKIN_FAR - SKIN_NEAR)))) * (wide / 255) * Math.min(1, Math.max(0, (luma - DARK_CUT) / (DARK_KEEP - DARK_CUT)));

/** Bộ lọc One Euro: tay đứng yên thì lọc mạnh (hết rung), tay đi nhanh thì lọc nhẹ (không trễ). */
export function oneEuro(minCutoff = 1.2, beta = 8): (x: number, t: number) => number {
  let px = NaN;
  let dx = 0;
  let pt = 0;
  const alpha = (cut: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cut * dt));
  return (x, t) => {
    if (Number.isNaN(px)) {
      px = x;
      pt = t;
      return x;
    }
    const dt = Math.max(t - pt, 1e-3);
    pt = t;
    dx += alpha(1, dt) * ((x - px) / dt - dx);
    px += alpha(minCutoff + beta * Math.abs(dx), dt) * (x - px);
    return px;
  };
}

export const GRACE = 0.45;
export const REGRAB_LOCK = 0.2;
export type Gated = {pts: Pt[]; pinch: boolean; /** 1 = tay thật; < 1 = tay bóng ma đang mờ dần */ alpha: number; event?: 'dock' | 'back'};
/**
 * Cổng chống mất dấu cho MỘT bàn tay (gọi mỗi khung hình camera; `pts` = null khi không thấy tay, `t` tính bằng giây).
 * Mất dấu dưới 450 ms: giữ nguyên trạng thái chụm (vật không rơi), tay trôi thêm một đoạn ngắn theo vận tốc cuối rồi dừng, mờ dần về 40 %.
 * Quá 450 ms: buông (`dock`); cảnh tự đưa vật về chỗ an toàn. Tay quay lại sau đó (`back`): khoá chụm 200 ms để không hất đổ dụng cụ.
 */
export function handGate(): (pts: Pt[] | null, pinch: boolean, t: number) => Gated {
  const TAU = 0.08; // quán tính: tay bóng ma đi tối đa quãng đường của 80 ms cuối
  let last: Pt[] = [];
  let v = {x: 0, y: 0};
  let seenAt = -1e9;
  let backAt = -1e9;
  let held = false;
  let docked = true;
  return (pts, pinch, t) => {
    if (pts) {
      const dt = t - seenAt;
      const back = docked;
      if (back) backAt = t;
      v = last.length && dt > 0 && dt < 0.2 ? {x: (pts[9].x - last[9].x) / dt, y: (pts[9].y - last[9].y) / dt} : {x: 0, y: 0};
      last = pts;
      seenAt = t;
      docked = false;
      held = pinch && t - backAt >= REGRAB_LOCK;
      return {pts, pinch: held, alpha: 1, event: back ? 'back' : undefined};
    }
    const lost = t - seenAt;
    if (docked || lost >= GRACE) {
      const dock = !docked;
      docked = true;
      held = false;
      return {pts: [], pinch: false, alpha: 0, event: dock ? 'dock' : undefined};
    }
    const s = TAU * (1 - Math.exp(-lost / TAU));
    return {pts: last.map((p) => ({x: p.x + v.x * s, y: p.y + v.y * s})), pinch: held, alpha: 1 - 0.6 * (lost / GRACE)};
  };
}

/** Mức cảnh báo [trái, phải, trên, dưới] (0–1) khi điểm chụm của tay tiến vào dải 8 % sát mép màn hình. */
export function edgeGlow(pts: Pt[], margin = 0.08): [number, number, number, number] {
  const x = (pts[4].x + pts[8].x) / 2;
  const y = (pts[4].y + pts[8].y) / 2;
  const k = (d: number) => Math.min(1, Math.max(0, (margin - d) / margin));
  return [k(x), k(1 - x), k(y), k(1 - y)];
}

// shortcut: ba ngưỡng dưới đặt theo hình học bàn tay, chưa chỉnh trên camera thật; chỉnh lại sau buổi thử đầu tiên.
const SLIDE_TOUCH = 0.22; // ngón cái cách trục ngón trỏ dưới 22 % cỡ bàn tay thì coi là đang tì
const SLIDE_MIN_INDEX = 0.5; // ngón trỏ phải duỗi (dài hơn nửa cỡ bàn tay trên ảnh)
export const SLIDE_DWELL = 0.15; // tì đủ lâu mới tính, để động tác đưa ngón vào chụm không bị hiểu nhầm
/**
 * Vi cử chỉ: vị trí đầu ngón cái dọc ngón trỏ (0 = gốc ngón, 1 = đầu ngón) khi ngón cái đang tì lên ngón trỏ duỗi; null khi không tì.
 * Cánh tay đứng yên, chỉ ngón cái di chuyển vài centimet.
 */
export function thumbSlide(p: Pt[]): number | null {
  const ux = p[8].x - p[5].x;
  const uy = p[8].y - p[5].y;
  const tx = p[4].x - p[5].x;
  const ty = p[4].y - p[5].y;
  const len = Math.hypot(ux, uy);
  const size = Math.hypot(p[0].x - p[9].x, p[0].y - p[9].y);
  if (!size || len < SLIDE_MIN_INDEX * size) return null;
  const s = (tx * ux + ty * uy) / (len * len);
  return s >= 0 && s <= 1 && Math.abs(tx * uy - ty * ux) / len < SLIDE_TOUCH * size ? s : null;
}
/**
 * Cộng dồn quãng miết (đơn vị: chiều dài ngón trỏ; gọi mỗi khung hình camera với kết quả `thumbSlide`, `t` tính bằng giây).
 * Tính tương đối nên lúc vừa đặt ngón giá trị không nhảy; nhấc ngón rồi đặt lại ở chỗ khác cũng không nhảy.
 */
export function slideTravel(): (s: number | null, t: number) => number {
  let prev: number | null = null;
  let since = 0;
  let total = 0;
  return (s, t) => {
    if (s !== null) {
      if (prev === null) since = t;
      else if (t - since >= SLIDE_DWELL) total += s - prev;
    }
    prev = s;
    return total;
  };
}

/**
 * Nối các mẫu thưa của camera thành chuyển động mượt cho MỘT toạ độ: `sample` khi có mẫu mới, `at` mỗi khung hình màn hình.
 * Giữa hai mẫu, vị trí tiến tiếp theo vận tốc ước lượng (tối đa `lead` giây) rồi trượt về đó, nên vừa mượt vừa không trễ thêm;
 * tay đứng yên thì vận tốc bằng 0 nên không sinh rung.
 */
export function glide(lead = 0.045, rate = 45) {
  let pos = NaN;
  let goal = 0;
  let vel = 0;
  let at = 0;
  return {
    sample(x: number, t: number) {
      if (Number.isNaN(pos)) {
        pos = goal = x;
        vel = 0;
      } else {
        const dt = Math.max(t - at, 1e-3);
        vel = dt > 0.2 ? 0 : vel + 0.5 * ((x - goal) / dt - vel);
        goal = x;
      }
      at = t;
    },
    at(t: number, dt: number) {
      if (Number.isNaN(pos)) return 0;
      pos += (goal + vel * Math.min(Math.max(t - at, 0), lead) - pos) * (1 - Math.exp(-dt * rate));
      return pos;
    },
    reset() {
      pos = NaN;
    },
  };
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
}

/**
 * Mở camera vào `video` và gọi `onHands` mỗi khung hình với tối đa hai bàn tay (21 điểm, toạ độ 0–1 theo khung hình).
 * Thứ tự tay được giữ ổn định giữa các khung hình. Trả về hàm dừng.
 */
export async function startHands(video: HTMLVideoElement, deviceId: string | undefined, onHands: (hands: Pt[][]) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({video: {deviceId: deviceId ? {exact: deviceId} : undefined, width: {ideal: 640}, height: {ideal: 360}, frameRate: {ideal: 30}}});
  const stopCam = () => stream.getTracks().forEach((t) => t.stop());
  try {
    video.srcObject = stream;
    await video.play();
    const {FilesetResolver, HandLandmarker} = await import('@mediapipe/tasks-vision');
    const lm = await HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {baseOptions: {modelAssetPath: MODEL, delegate: 'GPU'}, runningMode: 'VIDEO', numHands: 2});
    let raf = 0;
    let vfc = 0;
    let stopped = false;
    let last = -1;
    let prev: Pt[][] = [];
    // chạy đúng MỘT lần cho mỗi khung hình camera mới: requestVideoFrameCallback báo ngay khi có khung hình (nhịp lấy mẫu đều, tay không khựng);
    // vòng requestAnimationFrame chạy song song làm dự phòng cho trình duyệt không có hoặc không gọi nó với video ẩn
    const byFrame = 'requestVideoFrameCallback' in video;
    const onFrame = () => {
      if (stopped) return;
      vfc = video.requestVideoFrameCallback(onFrame);
      detect();
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      detect();
    };
    const detect = () => {
      if (video.currentTime === last || video.readyState < 2) return;
      last = video.currentTime;
      let hands: Pt[][] = lm.detectForVideo(video, performance.now()).landmarks;
      // MediaPipe có thể đổi thứ tự hai tay giữa các khung hình: ghép theo cổ tay gần nhất với khung trước
      const d = (a: Pt[], b: Pt[]) => Math.hypot(a[0].x - b[0].x, a[0].y - b[0].y);
      if (hands.length === 2 && prev.length === 2 && d(hands[0], prev[1]) + d(hands[1], prev[0]) < d(hands[0], prev[0]) + d(hands[1], prev[1])) hands = [hands[1], hands[0]];
      else if (hands.length === 1 && prev.length === 2 && d(hands[0], prev[1]) < d(hands[0], prev[0])) hands = [[], hands[0]];
      prev = hands.map((h, i) => (h.length ? h : prev[i] ?? []));
      onHands(hands);
    };
    loop();
    if (byFrame) onFrame();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (byFrame) video.cancelVideoFrameCallback(vfc);
      lm.close();
      stopCam();
      video.srcObject = null;
    };
  } catch (e) {
    stopCam();
    throw e;
  }
}
