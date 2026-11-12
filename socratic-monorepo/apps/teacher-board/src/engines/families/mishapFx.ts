import * as THREE from 'three';
import type {MishapKind} from '../../utils/lab/hands/mishap';
import type {Kit} from './Stage3D';

/**
 * Hiệu ứng 3D của sự cố trong phòng thực hành (xem `utils/lab/hands/mishap.ts`): chập điện (tia lửa, loé sáng, khói), cháy (lửa, khói),
 * nổ (loé sáng, sóng xung kích, lửa văng), acid / kiềm đổ (vũng loang, khói), nước sôi (vũng, hơi nước), điện giật (loé xanh nhấp nháy),
 * gãy (mảnh văng), cháy cách điện (khói đặc, đốm than). Hạt dùng màu đỉnh + trộn cộng nên mờ dần bằng cách tối đi, không cần đổi độ trong suốt từng hạt.
 */
type Sys = {pos: Float32Array; col: Float32Array; vel: Float32Array; life: Float32Array; max: Float32Array; head: number; n: number; pts: THREE.Points; base: THREE.Color; g: number; drag: number; grow: number};
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

function system(k: Kit, n: number, color: string, size: number, g: number, drag: number, grow = 0, additive = true): Sys {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending}));
  pts.frustumCulled = false;
  k.scene.add(pts);
  return {pos, col, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n).fill(1), head: 0, n, pts, base: new THREE.Color(color), g, drag, grow};
}
function emit(s: Sys, count: number, at: THREE.Vector3, speed: number, up: number, life: [number, number], spread = 0.12) {
  for (let c = 0; c < count; c++) {
    const i = s.head;
    s.head = (s.head + 1) % s.n;
    const a = rnd(0, Math.PI * 2);
    const e = rnd(0, 1);
    s.pos.set([at.x + rnd(-spread, spread), at.y + rnd(0, spread), at.z + rnd(-spread, spread)], i * 3);
    s.vel.set([Math.cos(a) * speed * e, rnd(0.4, 1) * up + rnd(0, speed * 0.4), Math.sin(a) * speed * e], i * 3);
    s.max[i] = s.life[i] = rnd(life[0], life[1]);
  }
}
function step(s: Sys, dt: number) {
  let alive = false;
  for (let i = 0; i < s.n; i++) {
    const L = s.life[i];
    if (L <= 0) {
      s.col[i * 3] = s.col[i * 3 + 1] = s.col[i * 3 + 2] = 0;
      continue;
    }
    alive = true;
    s.life[i] = L - dt;
    const f = Math.max(0, L / s.max[i]);
    const damp = Math.exp(-s.drag * dt);
    s.vel[i * 3] *= damp;
    s.vel[i * 3 + 1] = s.vel[i * 3 + 1] * damp - s.g * dt;
    s.vel[i * 3 + 2] *= damp;
    for (let a = 0; a < 3; a++) s.pos[i * 3 + a] += s.vel[i * 3 + a] * dt;
    if (s.pos[i * 3 + 1] < 0.03 && s.g > 0) {
      s.pos[i * 3 + 1] = 0.03;
      s.vel[i * 3 + 1] *= -0.3; // hạt nẩy nhẹ trên mặt bàn
    }
    const w = f * f;
    s.col[i * 3] = s.base.r * w;
    s.col[i * 3 + 1] = s.base.g * w;
    s.col[i * 3 + 2] = s.base.b * w;
  }
  (s.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  (s.pts.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  s.pts.visible = alive;
}

type Run = {kind: MishapKind; at: THREE.Vector3; t: number; dur: number};
type Puddle = {m: THREE.Mesh; t: number; r: number};

export function mishapFx(k: Kit) {
  const flash = new THREE.PointLight('#FFE2B0', 0, 16);
  k.scene.add(flash);
  const sparks = system(k, 220, '#FFC46A', 4, 6, 0.6);
  const fire = system(k, 160, '#FF7A22', 14, -1.6, 1.2);
  const smoke = system(k, 160, '#D4D8E2', 34, -0.35, 0.9);
  const fumes = system(k, 90, '#C6E86A', 20, -0.25, 0.8);
  const steam = system(k, 90, '#DCE6EE', 24, -0.4, 0.8);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FFD9A0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide}));
  ring.position.y = 0.05;
  k.scene.add(ring);
  const puddles: Puddle[] = [];
  const runs: Run[] = [];
  let ringT = 9;
  let ringAt = new THREE.Vector3();
  let ringR = 3;

  const puddle = (at: THREE.Vector3, color: string, r: number) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.6, depthWrite: false}));
    m.position.set(at.x, 0.045, at.z);
    m.scale.setScalar(0.01);
    k.scene.add(m);
    puddles.push({m, t: 0, r});
    if (puddles.length > 6) {
      const old = puddles.shift()!;
      k.scene.remove(old.m);
      old.m.geometry.dispose();
      (old.m.material as THREE.Material).dispose();
    }
  };

  return {
    /** bắt đầu một sự cố ở vị trí `at` (toạ độ cảnh); sự cố cũ vẫn chạy tiếp cho tới khi hết */
    go(kind: MishapKind, at: THREE.Vector3) {
      const p = at.clone();
      const dur = {short: 1.6, fire: 6, explosion: 4, acid: 7, scald: 5, shock: 1.8, break: 2.5, burn: 6}[kind];
      runs.push({kind, at: p, t: 0, dur});
      flash.position.set(p.x, p.y + 0.8, p.z);
      if (kind === 'short' || kind === 'explosion' || kind === 'shock' || kind === 'break') {
        flash.intensity = kind === 'explosion' ? 90 : 40;
        flash.color.set(kind === 'shock' ? '#BFD8FF' : '#FFE2B0');
      }
      if (kind === 'short') emit(sparks, 150, p, 4.5, 3.5, [0.5, 1.2]), emit(smoke, 30, p, 0.5, 0.8, [2, 4]);
      if (kind === 'explosion') {
        emit(sparks, 200, p, 7, 5, [0.6, 1.4]);
        emit(fire, 90, p, 3.2, 2.2, [0.7, 1.6], 0.3);
        emit(smoke, 70, p, 1.4, 1.2, [3, 6], 0.3);
        ringT = 0;
        ringAt = p.clone();
        ringR = 3.4;
      }
      if (kind === 'break') {
        emit(sparks, 90, p, 3.5, 3, [0.5, 1.1]);
        emit(smoke, 20, p, 0.6, 0.6, [2, 4]);
        ringT = 0;
        ringAt = p.clone();
        ringR = 1.4;
      }
      if (kind === 'acid') puddle(p, '#B9E34A', 1.1);
      if (kind === 'scald') puddle(p, '#BFE3F5', 0.95);
    },
    update(dt: number) {
      for (let i = runs.length - 1; i >= 0; i--) {
        const r = runs[i];
        r.t += dt;
        const f = Math.max(0, 1 - r.t / r.dur);
        const at = r.at;
        // phát liên tục theo loại sự cố (tốc độ phát tính theo giây × dt, phần lẻ cộng dồn ngẫu nhiên)
        const rate = (perSec: number) => (Math.random() < perSec * dt - Math.floor(perSec * dt) ? 1 : 0) + Math.floor(perSec * dt);
        if (r.kind === 'short' && r.t < 1.2) {
          emit(sparks, rate(60), at, 4, 3, [0.3, 0.8]);
          flash.intensity = Math.max(flash.intensity, Math.random() < 0.5 ? 14 : 2); // hồ quang nhấp nháy
        }
        if (r.kind === 'shock') {
          flash.intensity = Math.random() < 0.5 ? 26 : 0; // loé xanh nhấp nháy
          if (r.t < 1.2) emit(sparks, rate(40), at, 2.5, 2, [0.2, 0.5]);
        }
        if (r.kind === 'fire') {
          emit(fire, rate(70 * f + 8), at, 0.5, 1.4, [0.5, 1.1], 0.18);
          emit(smoke, rate(18 * f), at.clone().setY(at.y + 0.7), 0.35, 0.9, [2, 4], 0.15);
          flash.intensity = 6 + Math.random() * 6;
          flash.color.set('#FF9A3C');
        }
        if (r.kind === 'explosion' && r.t < 1.5) emit(fire, rate(50 * f), at, 1.2, 1.8, [0.5, 1], 0.3);
        if (r.kind === 'burn') {
          emit(smoke, rate(45 * f + 6), at, 0.4, 1.0, [2.5, 5], 0.15);
          if (r.t < 2.5) emit(sparks, rate(10), at, 1, 1.5, [0.3, 0.7]);
          emit(fire, rate(6 * f), at, 0.3, 0.8, [0.3, 0.6], 0.1); // đốm than
        }
        if (r.kind === 'acid') emit(fumes, rate(22 * f), at, 0.45, 0.9, [2, 4.5], 0.5);
        if (r.kind === 'scald') emit(steam, rate(30 * f), at, 0.5, 1.0, [1.5, 3.5], 0.4);
        if (r.t >= r.dur) runs.splice(i, 1);
      }
      flash.intensity *= Math.exp(-dt * 7);
      if (flash.intensity < 0.05) flash.intensity = 0;
      for (const s of [sparks, fire, smoke, fumes, steam]) step(s, dt);
      ringT += dt;
      const rm = ring.material as THREE.MeshBasicMaterial;
      rm.opacity = ringT < 0.8 ? 0.7 * (1 - ringT / 0.8) : 0;
      ring.position.set(ringAt.x, 0.05, ringAt.z);
      ring.scale.setScalar(0.2 + (ringR * Math.min(ringT, 0.8)) / 0.8);
      for (const q of puddles) {
        q.t += dt;
        q.m.scale.setScalar(q.r * (1 - Math.exp(-q.t * 1.6)));
        (q.m.material as THREE.MeshBasicMaterial).opacity = 0.6 * Math.max(0.35, 1 - q.t / 40);
      }
    },
  };
}

// ---------------------------------------------------------------- âm thanh tổng hợp (Web Audio), nhỏ và ngắn
let ctx: AudioContext | null = null;
export function mishapSound(kind: MishapKind): void {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    const noise = (dur: number, type: BiquadFilterType, freq: number, gain: number, delay = 0) => {
      const buf = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * dur), ctx!.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
      const src = ctx!.createBufferSource();
      src.buffer = buf;
      const f = ctx!.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx!.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(ctx!.destination);
      src.start(t0 + delay);
    };
    const tone = (from: number, to: number, dur: number, gain: number, wave: OscillatorType = 'sine') => {
      const o = ctx!.createOscillator();
      o.type = wave;
      o.frequency.setValueAtTime(from, t0);
      o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      const g = ctx!.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    };
    if (kind === 'explosion') (noise(1.1, 'lowpass', 500, 0.5), tone(110, 30, 0.9, 0.35));
    else if (kind === 'short') [0, 0.07, 0.19, 0.3].forEach((d) => noise(0.12, 'highpass', 2500, 0.22, d));
    else if (kind === 'fire') noise(1.6, 'lowpass', 900, 0.18);
    else if (kind === 'acid' || kind === 'scald') noise(2, 'highpass', 4200, 0.07);
    else if (kind === 'shock') tone(100, 95, 0.7, 0.12, 'sawtooth');
    else if (kind === 'break') (noise(0.25, 'bandpass', 1800, 0.3), tone(900, 120, 0.2, 0.15, 'square'));
    else noise(1.2, 'bandpass', 1200, 0.1); // burn: lách tách
  } catch {
    /* không có âm thanh: bỏ qua */
  }
}
