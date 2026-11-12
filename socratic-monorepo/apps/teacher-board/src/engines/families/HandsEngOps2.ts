import * as THREE from 'three';
import {SIM_BY_ID} from '../../utils/lab/hands/sims';
import {PMSM} from '../../utils/lab/hands/sims/advanced';
import {fmt, fromUnit, toUnit} from '../../utils/lab/hands/sims/types';
import {grips, type Grip, type Lab} from './HandsChemOps3D';
import type {SimLive} from './HandsSims3D';
import {ADVANCED_SCENES} from './HandsSimsAdvanced3D';
import {THPT_SCENES, Z, clamp} from './HandsSimsThpt3D';
import type {handPointers} from './handsKit';
import {V, solid} from './handsModels';
import {dress, loadModel, partOf, place} from './labParts';
import type {Kit} from './Stage3D';

/**
 * Bảy bài Kĩ thuật còn lại (pid, foc, harmonic, fatigue, quadruped, surgery, slam) làm bằng THAO TÁC TRÊN THIẾT BỊ, không còn núm và ổ lắp ở mép bàn.
 * Cảnh vẽ thiết bị vẫn là cảnh cũ (`THPT_SCENES` / `ADVANCED_SCENES`); lớp này thêm các bộ phận điều khiển gắn ngay dưới thiết bị
 * (núm xoay trên bảng điều khiển, công tắc, cần kéo dây cao su, vật chọn thả vào chỗ lắp) và chỉ ghi vào `live.v` / `live.act`.
 * Dải nút − / + ở mép trước bàn (padBank) vẫn có cho mọi tham số liên tục, thanh trượt ở bảng bên vẫn điều khiển cùng một trạng thái.
 * shortcut: tốc độ động cơ (foc, harmonic) là núm chứ chưa phải cần ga như bài turbine; đổi nếu cần ngay trên thân máy.
 */
type Hands = ReturnType<typeof handPointers>;
const LAB = '/models/lab-parts.glb';
const SWEEP = 1.5 * Math.PI; // núm xoay 270°
const LEVER = 0.7; // góc gạt công tắc (rad)
const v3 = new THREE.Vector3();

type Option = {label: string; value: number; color: string};

/** bộ dựng điều khiển: mỗi hàm thêm một bộ cầm vào `list` và một hàm vẽ lại vào `ups` */
function controls(k: Kit, P: Hands, live: SimLive) {
  const spec = SIM_BY_ID[live.id];
  const list: Grip[] = [];
  const ups: (() => void)[] = [];
  const hold: {G: ReturnType<typeof grips> | null} = {G: null};
  const lib = loadModel(LAB).catch(() => null);
  const param = (id: string) => spec.params.find((p) => p.id === id)!;
  const plain: THREE.Object3D[] = []; // hình khối tạm: ẩn khi mô hình Blender tải xong
  const swap = (fn: (lib: THREE.Group) => boolean) => void lib.then((l) => l && fn(l) && undefined);
  const panel = (w: number, d: number, x: number, z: number, title: string) => {
    solid(k.scene, new THREE.BoxGeometry(w, 0.05, d), '#23272E', {rough: 0.5, x, y: 0.025, z});
    k.label(title)(V(x, 0.15, z + d / 2 + 0.15));
  };

  /** núm xoay trên bảng điều khiển: đưa tay vòng quanh núm (góc trên mặt bàn); chuột: kéo vòng quanh núm */
  const dial = (id: string, x: number, z: number, title: string) => {
    const p = param(id);
    const c = V(x, 0.2, z);
    const base = solid(k.scene, new THREE.CylinderGeometry(0.44, 0.47, 0.03, 32), '#2A2E66', {x, y: 0.015, z});
    const cap = solid(k.scene, new THREE.CylinderGeometry(0.2, 0.22, 0.2, 28), '#E3B341', {x, y: 0.18, z});
    solid(cap, new THREE.BoxGeometry(0.05, 0.05, 0.17), '#1D1B16', {y: 0.12, z: -0.09});
    const tag = k.label(title);
    swap((l) => {
      place(k.scene, l, 'KnobDial', [x, 0, z], [base]);
      dress(cap, partOf(l, 'KnobCap'));
      return true;
    });
    const angle = (ptr: {ndc: THREE.Vector2}) => {
      const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
      return Math.atan2(at.z - z, at.x - x);
    };
    let a0 = 0;
    list.push({
      at: () => c,
      down: (ptr) => (a0 = angle(ptr)),
      hold: (ptr) => {
        const a = angle(ptr);
        let da = a - a0;
        da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
        a0 = a;
        live.set(id, fromUnit(p, clamp(toUnit(p, live.v[id]) + da / SWEEP, 0, 1)));
      },
    });
    const g = list[list.length - 1];
    ups.push(() => {
      cap.rotation.y = -(-SWEEP / 2 + toUnit(p, live.v[id]) * SWEEP);
      (cap.material as THREE.MeshStandardMaterial).color.set(hold.G?.by(g) ? '#D9481C' : '#E3B341');
      tag(V(x, 0.6, z + 0.55), undefined, `${title}: ${fmt(p, live.v[id])}`);
    });
  };

  /** công tắc dao: cầm cần gạt sang bên kia (sang trái = đóng) */
  const flip = (x: number, z: number, title: string, isOn: () => boolean, set: (on: boolean) => void) => {
    const SW = V(x, 0.2, z);
    const lever = new THREE.Group();
    lever.position.copy(SW);
    k.scene.add(lever);
    const parts = [
      solid(k.scene, new THREE.BoxGeometry(1.1, 0.08, 1.7), '#2A2E66', {x, y: 0.04, z: z - 0.35}),
      solid(lever, new THREE.BoxGeometry(0.07, 0.07, 0.85), '#B9BEC5', {z: -0.42}),
    ];
    const tip = solid(lever, new THREE.SphereGeometry(0.13, 16, 12), '#D9481C', {z: -0.85});
    const lamp = solid(k.scene, new THREE.SphereGeometry(0.09, 16, 12), '#55524B', {x: x + 0.5, y: 0.12, z: z + 0.4});
    k.label(title)(V(x, 0.6, z + 0.75));
    k.label('BẬT', '#35C46A')(V(x - 0.5, 0.25, z - 0.8));
    swap((l) => {
      const base = place(k.scene, l, 'SwitchBase', [x, 0, z], [parts[0]]);
      const lv = partOf(l, 'SwitchLever');
      if (lv) {
        lever.add(lv.obj);
        (parts[1].material as THREE.Material).visible = false;
        (tip.material as THREE.Material).visible = false;
      }
      return !!base;
    });
    let angle = isOn() ? LEVER : -LEVER;
    let held = false;
    const at = V();
    list.push({
      at: () => tip.getWorldPosition(at),
      down: () => (held = true),
      hold: (ptr) => {
        const p = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
        angle = clamp(Math.atan2(-(p.x - SW.x), -(p.z - SW.z)), -LEVER, LEVER);
      },
      up: () => {
        held = false;
        const next = angle > 0;
        if (next !== isOn()) set(next);
      },
    });
    ups.push(() => {
      if (!held) angle += ((isOn() ? LEVER : -LEVER) - angle) * 0.3;
      lever.rotation.y = angle;
      (lamp.material as THREE.MeshStandardMaterial).color.set(isOn() ? '#35C46A' : '#55524B');
      (lamp.material as THREE.MeshStandardMaterial).emissive.set(isOn() ? '#1E9E4D' : '#000000');
    });
  };

  /** cần kéo dây cao su: kéo về bên trái rồi buông; độ kéo 0…1 đưa cho `release` */
  const pull = (x0: number, z: number, color: string, title: string, release: (amount: number) => void) => {
    const rest = V(x0 - 0.15, 0.17, z);
    const rail = solid(k.scene, new THREE.BoxGeometry(1.5, 0.05, 0.12), '#3A3E7A', {x: x0 - 0.75, y: 0.05, z});
    const handle = solid(k.scene, new THREE.BoxGeometry(0.2, 0.24, 0.4), color, {x: rest.x, y: rest.y, z});
    const band = solid(k.scene, new THREE.BoxGeometry(1, 0.04, 0.04), '#C8722A', {x: x0, y: 0.2, z});
    k.label(title)(V(x0 - 0.75, 0.5, z + 0.45));
    swap((l) => {
      place(k.scene, l, 'PullRail', [x0 - 0.75, 0, z], [rail]);
      dress(handle, partOf(l, 'PullHandle'))?.mats.forEach((m) => m.color.set(color));
      return true;
    });
    let amount = 0;
    let held = false;
    list.push({
      at: () => handle.position,
      down: () => (held = true),
      hold: (ptr) => (amount = clamp((rest.x - P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3).x) / 1.1, 0, 1)),
      up: () => {
        held = false;
        if (amount > 0.1) release(amount);
      },
    });
    ups.push(() => {
      if (!held) amount *= 0.55; // buông tay: cần bật về
      handle.position.x = rest.x - amount * 1.1;
      const len = Math.max(0.05, x0 - handle.position.x - 0.1);
      band.scale.x = len;
      band.position.x = x0 - len / 2;
    });
  };

  /** vật chọn: cầm thả vào chỗ lắp (hoặc nhấp nhanh) để chọn; đang chọn thì nằm ở chỗ lắp, còn lại về khay */
  const tokens = (title: string, options: Option[], home: [number, number], dx: number, socket: THREE.Vector3, get: () => number, set: (v: number) => void) => {
    k.label(`${title}: thả vào chỗ lắp, hoặc chạm để chọn`)(V(home[0] + ((options.length - 1) * dx) / 2, 0.15, home[1] - 0.45));
    options.forEach((o, i) => {
      const hm = V(home[0] + i * dx, 0.1, home[1]);
      const m = solid(k.scene, new THREE.CylinderGeometry(0.15, 0.15, 0.2, 20), o.color, {x: hm.x, y: hm.y, z: hm.z});
      k.label(o.label)(V(hm.x, 0.5, hm.z + 0.3));
      let skin: ReturnType<typeof partOf> = null;
      swap((l) => {
        skin = dress(m, partOf(l, 'Token'));
        skin?.mats.forEach((s) => s.color.set(o.color));
        return true;
      });
      let x = 0;
      let y = 0;
      let moved = false;
      const g: Grip = {
        at: () => m.position,
        down: (ptr) => {
          x = ptr.ndc.x;
          y = ptr.ndc.y;
          moved = false;
        },
        hold: (ptr) => (moved ||= Math.hypot(ptr.ndc.x - x, ptr.ndc.y - y) > 0.03),
        up: (ptr) => {
          if (!moved || P.distAt(ptr.ndc.x, ptr.ndc.y, socket) < 0.2) set(o.value);
        },
      };
      list.push(g);
      ups.push(() => {
        const cur = options.reduce((b, q, j) => (Math.abs(q.value - get()) < Math.abs(options[b].value - get()) ? j : b), 0) === i;
        const ptr = hold.G?.by(g);
        m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.5, v3) : cur ? socket : hm, ptr ? 0.5 : cur ? 0.7 : 0.22);
        const glow = cur ? '#5A2408' : '#000000';
        (m.material as THREE.MeshStandardMaterial).emissive.set(glow);
        skin?.mats.forEach((s) => s.emissive.set(glow));
      });
    });
  };

  return {list, ups, hold, dial, flip, pull, tokens, panel, plain};
}
type B = ReturnType<typeof controls>;

const make =
  (scene: (c: {k: Kit; live: SimLive}) => (now: number, dt: number) => string, build: (b: B, c: {k: Kit; P: Hands; live: SimLive}) => void): Lab =>
  ({k, P, live}) => {
    const b = controls(k, P, live);
    const run = scene({k, live});
    build(b, {k, P, live});
    const G = grips(P, b.list);
    b.hold.G = G;
    return {
      grab: G.grab,
      step(now, dt) {
        G.step(dt);
        b.ups.forEach((u) => u());
        return run(now, dt);
      },
    };
  };

const mk = (labels: string[], values: number[], colors: string[]): Option[] => labels.map((label, i) => ({label, value: values[i], color: colors[i]}));

// ------------------------------------------------------------------ xe tự cân bằng PID: ba núm trên bộ điều khiển, kéo cần để đẩy xe
const pidLab = make(THPT_SCENES.pid, (b, {live}) => {
  b.panel(4.2, 1.3, -1.9, 1.0, 'Bộ điều khiển PID');
  b.dial('kp', -3.2, 1.0, 'K_p');
  b.dial('ki', -1.9, 1.0, 'K_i');
  b.dial('kd', -0.6, 1.0, 'K_d');
  b.pull(3.75, 0.9, '#D9481C', 'Đẩy xe: kéo cần rồi buông', () => live.act('push'));
});

// ------------------------------------------------------------------ FOC: kéo mũi tên dòng trên đồ thị d–q, núm tốc độ, công tắc contactor
const CX = 1.3;
const R = 1.15;
const focLab = make(ADVANCED_SCENES.foc, (b, {k, P, live}) => {
  const tip = V();
  const at = () => tip.set(CX + clamp(live.v.id / PMSM.Imax, -1, 0) * R, 0.09, Z - clamp(live.v.iq / PMSM.Imax, 0, 1) * R);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 10, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FF9A4D', depthTest: false, transparent: true}));
  ring.renderOrder = 4;
  k.scene.add(ring);
  k.label('Kéo mũi tên dòng: sang trái = i_d âm, lên = i_q')(V(CX, 0.1, Z + 1.55));
  b.list.push({
    at,
    hold: (ptr) => {
      const p = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.09, v3);
      live.set('id', Math.round(clamp((p.x - CX) / R, -1, 0) * PMSM.Imax));
      live.set('iq', Math.round(clamp((Z - p.z) / R, 0, 1) * PMSM.Imax));
    },
  });
  b.ups.push(() => ring.position.copy(at()));
  b.dial('rpm', -2.4, 1.0, 'Tốc độ');
  let on = false;
  b.flip(3.0, 1.0, 'Contactor', () => on, (next) => {
    on = next;
    live.act(on ? 'start' : 'stop');
  });
});

// ------------------------------------------------------------------ Harmonic Drive: thả bánh mềm vào tâm vành, núm tốc độ và tải
const harmonicLab = make(ADVANCED_SCENES.harmonic, (b, {live}) => {
  const zf = [120, 160, 200, 240, 300, 320];
  b.tokens('Bánh mềm (số răng)', mk(zf.map(String), zf, zf.map(() => '#8A93A6')), [-3.3, 1.7], 0.55, V(0, 0.45, Z), () => live.v.zf, (v) => live.set('zf', v));
  b.panel(3.4, 1.3, 2.0, 1.0, 'Động cơ dẫn động');
  b.dial('rpm', 1.4, 1.0, 'Tốc độ động cơ');
  b.dial('load', 2.7, 1.0, 'Mô-men tải');
});

// ------------------------------------------------------------------ thử mỏi: chọn vật liệu và vết cắt trên mẫu, núm tải
const fatigueLab = make(ADVANCED_SCENES.fatigue, (b, {live}) => {
  b.tokens('Vật liệu', mk(['Nhôm', 'Thép', 'Titan'], [1, 2, 3], ['#C9CED6', '#8A93A6', '#6B7380']), [-3.4, 1.0], 0.5, V(1.0, 0.45, Z), () => live.v.alloy, (v) => live.set('alloy', v));
  const a0 = [0.5, 1, 2, 3, 5];
  b.tokens('Vết cắt ban đầu (mm)', mk(a0.map(String), a0, a0.map(() => '#C4261A')), [-1.4, 1.0], 0.5, V(-1.4, 0.45, Z), () => live.v.a0, (v) => live.set('a0', v));
  b.panel(1.6, 1.3, 2.7, 1.0, 'Tải lặp');
  b.dial('ds', 2.7, 1.0, 'Δσ');
});

// ------------------------------------------------------------------ robot bốn chân: đặt tấm sàn dưới chân, vặn chiều cao thân, kéo búa đạp
const SPOT = V(0.7, 0.07, Z + 0.2);
const quadrupedLab = make(ADVANCED_SCENES.quadruped, (b, {live}) => {
  b.tokens('Tấm sàn', mk(['Băng', 'Ướt', 'Gỗ', 'Nhám'], [0.05, 0.3, 0.5, 0.9], ['#7FD4FF', '#2459C9', '#7A5C3A', '#4A4F5C']), [-3.4, 1.0], 0.55, SPOT, () => live.v.mu, (v) => live.set('mu', v));
  b.dial('h', 0.2, 1.0, 'Chiều cao thân');
  b.pull(3.75, 0.9, '#D9481C', 'Búa đạp: kéo càng xa, lực càng lớn', (amount) => {
    live.set('F', Math.round(amount * 200));
    live.act('kick');
  });
});

// ------------------------------------------------------------------ robot phẫu thuật: hai núm trên bảng điều khiển cần, cắm cáp vào bộ đẩy ống thông
const surgeryLab = make(ADVANCED_SCENES.surgery, (b, {live}) => {
  b.panel(3.4, 1.3, -2.3, 1.0, 'Bảng điều khiển cần của bác sĩ');
  b.dial('K', -3.0, 1.0, 'Tỉ lệ thu nhỏ');
  b.dial('filt', -1.7, 1.0, 'Bộ lọc run');
  b.tokens('Cáp truyền', mk(['Cáp quang', 'Wi-Fi', '4G', 'Vệ tinh'], [20, 60, 120, 200], ['#2E9B57', '#2459C9', '#E3B341', '#C4261A']), [-0.4, 1.8], 0.6, V(-3.38, 0.12, Z + 0.75), () => live.v.delay, (v) => live.set('delay', v));
});

// ------------------------------------------------------------------ SLAM: công tắc đóng vòng lặp, mô-đun encoder, núm chiều dài vòng và điểm đặc trưng
const slamLab = make(ADVANCED_SCENES.slam, (b, {live}) => {
  b.flip(3.0, 1.0, 'Đóng vòng lặp', () => live.v.closure >= 0.5, (on) => live.set('closure', on ? 1 : 0));
  b.panel(3.4, 1.3, -1.0, 1.0, 'Bộ xử lí bản đồ');
  b.dial('L', -1.7, 1.0, 'Chiều dài vòng');
  b.dial('feats', -0.4, 1.0, 'Điểm đặc trưng');
  b.tokens('Encoder bánh xe', mk(['Tốt', 'Khá', 'Kém', 'Rất kém'], [0.5, 1.5, 3, 5], ['#2E9B57', '#E3B341', '#D9481C', '#C4261A']), [-3.3, 1.8], 0.5, V(-3.0, 0.2, Z + 1.0), () => live.v.drift, (v) => live.set('drift', v));
});

export const ENG2_LABS: Record<string, Lab> = {pid: pidLab, foc: focLab, harmonic: harmonicLab, fatigue: fatigueLab, quadruped: quadrupedLab, surgery: surgeryLab, slam: slamLab};
