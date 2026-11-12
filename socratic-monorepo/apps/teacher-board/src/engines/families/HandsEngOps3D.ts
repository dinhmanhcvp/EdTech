import * as THREE from 'three';
import {GASES, brayton, schmidt, stirling} from '../../utils/lab/hands/sims/advanced';
import {differential} from '../../utils/lab/hands/sims/thptPhys';
import {grips, tint, type Grip, type Lab} from './HandsChemOps3D';
import {Z, board, box, clamp, glow, path, yCyl} from './HandsSimsThpt3D';
import {V, solid, xCyl} from './handsModels';
import {glassify, loadModel, partOf} from './labParts';
import {setLine} from './Stage3D';

/**
 * Ba bài Kĩ thuật có CẤU TẠO MÁY dựng bằng Blender (`eng-parts.glb`, kịch bản `tools/lab-models/eng_parts.py`) và điều khiển bằng
 * chính cơ cấu của máy: vi sai (xoay vô lăng, gạt cần khóa, đổi mặt đường dưới bánh xe), động cơ phản lực cắt bổ (đẩy cần ga, vặn van nhiên liệu),
 * động cơ Stirling (đưa đèn khò lại gần chụp nóng, bơm tay nạp khí, giữ van xả, đổi bình khí).
 * shortcut: chưa có hình khối thay thế khi tệp mô hình tải lỗi (cảnh chỉ còn nhãn và bảng bên), thêm nếu cần chạy không có mạng nội bộ.
 */
const ENG = '/models/eng-parts.glb';
const v3 = new THREE.Vector3();
/** gắn bản sao một bộ phận vào `parent` khi thư viện về; trả hàm để cảnh xếp nhiều bộ phận trong một lần tải */
const builder = (lib: THREE.Object3D) => (name: string, parent: THREE.Object3D, at: [number, number, number] = [0, 0, 0]) => {
  const sk = partOf(lib, name);
  if (!sk) return null;
  glassify(sk.obj);
  sk.obj.position.set(...at);
  parent.add(sk.obj);
  return sk;
};
const group = (parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

// ------------------------------------------------------------------ bộ vi sai ô tô
const ROADS = [
  {mu: 0.1, name: 'Bùn', color: '#6B4A2B'},
  {mu: 0.35, name: 'Sỏi', color: '#A9A18F'},
  {mu: 0.8, name: 'Nhựa khô', color: '#3B3F4A'},
];
const differentialLab: Lab = ({k, P, live}) => {
  const Y = 0.85;
  const axle = group(k.scene, 0, Y, Z);
  const right = group(axle);
  const leftFlip = group(axle);
  leftFlip.rotation.y = Math.PI;
  const left = group(leftFlip);
  const cage = group(axle);
  const spiders = [0.3, -0.3].map((z) => {
    const hold = group(cage, 0, 0, z);
    if (z < 0) hold.rotation.y = Math.PI;
    return group(hold);
  });
  const pinion = group(k.scene, 0.27, Y, Z - 0.74);
  // vô lăng nghiêng về phía người làm; cần khóa xoay quanh chốt
  const WHEEL = V(1.9, 0.95, 1.2);
  const column = group(k.scene, WHEEL.x, WHEEL.y, WHEEL.z);
  column.rotation.x = -0.95;
  const steer = group(column);
  const PIVOT = V(0.2, 0.2, 1.3);
  const lever = group(k.scene, PIVOT.x, PIVOT.y, PIVOT.z);
  const SPOT = V(-2.1, 0.03, Z);
  const roads = ROADS.map((r, i) => {
    const home = V(-3.5 + i * 1.0, 0.03, 1.4);
    const m = solid(k.scene, box(0.8, 0.06, 0.8), r.color, {rough: 0.95, x: home.x, y: home.y, z: home.z});
    k.label(r.name)(V(home.x, 0.3, home.z + 0.55));
    return {...r, home, m};
  });
  k.label('Mặt đường: đặt dưới bánh trái')(V(-2.5, 0.12, 0.8));
  k.label('Vô lăng: xoay sang trái để vào cua')(V(WHEEL.x, 1.75, WHEEL.z));
  k.label('MỞ')(V(PIVOT.x - 0.55, 0.5, PIVOT.z));
  k.label('KHÓA')(V(PIVOT.x + 0.6, 0.5, PIVOT.z));
  k.label('Vành chậu + vỏ vi sai')(V(0.5, 2.0, Z));
  k.label('Bánh răng hành tinh', '#D9481C')(V(0, 0.25, Z + 0.75));
  const tags = [k.label('Bánh trái'), k.label('Bánh phải'), k.label('Cần khóa vi sai')];
  loadModel(ENG)
    .then((lib) => {
      const put = builder(lib);
      put('AxleStand', k.scene, [0, 0, Z]);
      for (const g of [left, right]) {
        put('HalfShaft', g);
        put('Wheel', g, [2.12, 0, 0]);
      }
      put('DiffCage', cage);
      spiders.forEach((s) => put('Spider', s));
      put('DrivePinion', pinion);
      put('SteeringColumn', column);
      put('SteeringWheel', steer);
      put('LockBase', k.scene, [PIVOT.x, PIVOT.y, PIVOT.z]);
      put('LockLever', lever);
    })
    .catch(() => undefined);

  const LOG = Math.log(0.04); // R = 100 m (thẳng) … 4 m (đánh hết lái)
  const steerOf = () => clamp(Math.log(live.v.R / 100) / LOG, 0, 1);
  const angleAt = (ptr: {ndc: THREE.Vector2}) => {
    v3.copy(WHEEL).project(k.camera);
    return Math.atan2(ptr.ndc.y - v3.y, (ptr.ndc.x - v3.x) * k.camera.aspect);
  };
  let a0 = 0;
  const steerGrip: Grip = {
    at: () => WHEEL,
    down: (ptr) => (a0 = angleAt(ptr)),
    hold: (ptr) => {
      const a = angleAt(ptr);
      let da = a - a0;
      da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
      a0 = a;
      live.set('R', Math.round(100 * Math.exp(LOG * clamp(steerOf() + da / 2.4, 0, 1))));
    },
  };
  let lean: number | null = null;
  const knob = V();
  const leverGrip: Grip = {
    at: () => knob.set(PIVOT.x + Math.sin(-lever.rotation.z) * 0.74, PIVOT.y + Math.cos(lever.rotation.z) * 0.74, PIVOT.z),
    hold: (ptr) => (lean = clamp((P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.9, v3).x - PIVOT.x) / 0.5, -1, 1)),
    up: () => {
      if (lean !== null) live.set('lock', lean > 0 ? 1 : 0);
      lean = null;
    },
  };
  const roadGrips = roads.map(
    (r): Grip => ({
      at: () => r.m.position,
      up: (ptr) => {
        if (ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, v3.copy(SPOT).setY(0.3)) < 0.3) live.set('mu', r.mu);
      },
    }),
  );
  const G = grips(P, [steerGrip, leverGrip, ...roadGrips]);
  const a = [0, 0, 0, 0];
  return {
    grab: G.grab,
    step(_now, dt) {
      G.step(dt);
      const d = differential(live.v.R, live.v.mu, live.v.lock);
      a[0] += d.wl * dt * 2.5;
      a[1] += d.wr * dt * 2.5;
      a[2] += dt * 2.5;
      a[3] += (d.wr - d.wl) * dt * 4;
      left.rotation.x = -a[0]; // bên trái là bản quay 180° nên đổi dấu để hai bánh cùng lăn tới
      right.rotation.x = a[1];
      cage.rotation.x = a[2];
      spiders.forEach((s, i) => (s.rotation.z = i ? -a[3] : a[3]));
      pinion.rotation.z = a[2] * 4;
      steer.rotation.z = steerOf() * 2.4;
      lever.rotation.z += ((lean !== null ? -lean * 0.6 : d.locked ? -0.6 : 0.6) - lever.rotation.z) * 0.4;
      const on = ROADS.reduce((best, r, i) => (Math.abs(r.mu - live.v.mu) < Math.abs(ROADS[best].mu - live.v.mu) ? i : best), 0);
      let hint = '';
      roads.forEach((r, i) => {
        const ptr = G.by(roadGrips[i]);
        r.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.5, v3) : i === on ? SPOT : r.home, ptr ? 0.5 : 0.25);
        r.m.scale.setScalar(!ptr && i === on ? 1.7 : 1);
        if (ptr) hint = `Đặt tấm "${r.name}" xuống dưới bánh trái rồi buông tay`;
      });
      tags[0](V(-2.1, 1.9, Z), undefined, `Bánh trái ×${d.wl.toFixed(2)} · ${ROADS[on].name.toLowerCase()}`);
      tags[1](V(2.1, 1.9, Z), undefined, `Bánh phải ×${d.wr.toFixed(2)}`);
      tags[2](V(PIVOT.x, 1.3, PIVOT.z), undefined, `Cần khóa vi sai: ${d.locked ? 'KHÓA' : 'mở'}`);
      if (G.by(steerGrip)) hint = `Đang đánh lái: bán kính cua ${live.v.R.toFixed(0)} m`;
      if (G.by(leverGrip)) hint = 'Gạt cần sang phải để khóa vi sai, sang trái để mở';
      return `${hint || `${d.locked ? 'Vi sai KHÓA' : 'Vi sai mở'} · ${d.stuck ? 'xe sa lầy: bánh trái quay tít, bánh phải đứng yên' : 'xe chạy'} · bán kính cua ${live.v.R.toFixed(0)} m`}\nBánh răng hành tinh (đỏ, có vạch trắng) chỉ tự xoay khi hai bánh xe quay khác tốc độ`;
    },
  };
};

// ------------------------------------------------------------------ động cơ phản lực micro cắt bổ
const turbineLab: Lab = ({k, P, live}) => {
  const Y = 1.1;
  const CX = -0.6;
  const rotor = group(k.scene, CX, Y, Z);
  const jet = glow(k, new THREE.ConeGeometry(0.3, 1, 24).rotateZ(-Math.PI / 2), '#FFB35C');
  jet.material.opacity = 0.75;
  let liner: THREE.MeshStandardMaterial[] = [];
  const TH = V(1.7, 0.2, 1.0); // chốt cần ga
  const lever = group(k.scene, TH.x, TH.y, TH.z);
  const VALVE = V(-0.2, 0.66, 1.1);
  const wheel = group(k.scene, VALVE.x, VALVE.y, VALVE.z);
  k.label('Máy nén li tâm')(V(CX - 1.15, 2.0, Z));
  k.label('Buồng đốt')(V(CX - 0.1, 2.0, Z));
  k.label('Tuabin')(V(CX + 0.85, 2.0, Z));
  k.label('Ống phun')(V(CX + 1.6, 1.7, Z));
  k.label('CẮT')(V(TH.x + 0.55, 0.3, TH.z + 0.6));
  k.label('TỐI ĐA')(V(TH.x + 0.6, 0.3, TH.z - 0.6));
  const tags = [k.label('Cần ga'), k.label('Van nhiên liệu')];
  loadModel(ENG)
    .then((lib) => {
      const put = builder(lib);
      put('JetCasing', k.scene, [CX, Y, Z]);
      put('Impeller', rotor, [-1.15, 0, 0]);
      put('JetShaft', rotor);
      put('TurbineWheel', rotor, [0.85, 0, 0])?.obj.scale.setScalar(0.85);
      liner = put('Combustor', k.scene, [CX - 0.1, Y, Z])?.mats.filter((m) => m.name === 'liner') ?? [];
      put('ThrottleBase', k.scene, [TH.x, TH.y, TH.z]);
      tint(put('ThrottleLever', lever), 'tint', '#D9481C');
      put('FuelValve', k.scene, [VALVE.x, 0, VALVE.z]);
      put('ValveWheel', wheel);
    })
    .catch(() => undefined);

  const CUT = 0.1; // phần hành trình cần ga dành cho vị trí cắt nhiên liệu
  let run = false;
  let burnt = false;
  let spool = 0;
  let seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
  const travel = () => (run ? CUT + ((live.v.throttle - 10) / 90) * (1 - CUT) : 0);
  const knob = V();
  const leverGrip: Grip = {
    at: () => knob.set(TH.x, TH.y + Math.cos(lever.rotation.x) * 0.8, TH.z + Math.sin(lever.rotation.x) * 0.8),
    hold: (ptr) => {
      const t = clamp((TH.z + 0.5 - P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.9, v3).z) / 1.0, 0, 1);
      run = t >= CUT;
      if (run) live.set('throttle', Math.round(10 + ((t - CUT) / (1 - CUT)) * 90));
    },
  };
  let a0 = 0;
  const angleAt = (ptr: {ndc: THREE.Vector2}) => {
    const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, VALVE.y, v3);
    return Math.atan2(at.z - VALVE.z, at.x - VALVE.x);
  };
  const valveGrip: Grip = {
    at: () => VALVE,
    down: (ptr) => (a0 = angleAt(ptr)),
    hold: (ptr) => {
      const a = angleAt(ptr);
      let da = a - a0;
      da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
      a0 = a;
      live.set('far', Math.round(clamp(live.v.far - (da / (3 * Math.PI)) * 29, 6, 35) * 10) / 10); // vặn ngược chiều kim đồng hồ (nhìn từ trên) để mở, hai vòng rưỡi hết cỡ
    },
  };
  const G = grips(P, [leverGrip, valveGrip]);
  return {
    grab: G.grab,
    step(_now, dt) {
      G.step(dt);
      // nút dự phòng ở bảng bên
      if ((live.events.start ?? 0) !== seen.start) run = true;
      if ((live.events.stop ?? 0) !== seen.stop) run = false;
      seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
      spool += ((run ? 1 : 0) - spool) * Math.min(1, dt * 1.2);
      const b = brayton(live.v.throttle, live.v.far);
      // máy ĐANG CHẠY mà nhiệt trước tuabin vượt giới hạn thì cháy (máy tắt thì thông số cao chưa gây hậu quả)
      if (run && spool > 0.6 && b.hot) {
        if (!burnt) live.hazard?.('turbine-overheat', V(CX, Y, Z));
        burnt = true;
      } else if (!b.hot || !run) burnt = false;
      rotor.rotation.x += dt * (4 + live.v.throttle / 4) * spool * 3;
      const heat = (b.flameout ? 0 : clamp((b.T4 - 600) / 900, 0, 1)) * spool;
      liner.forEach((m) => m.emissive.set('#FF4D1C').multiplyScalar(heat));
      const len = Math.max(0.1, (b.thrust / 90) * spool);
      jet.visible = !b.flameout && spool > 0.15;
      jet.scale.x = len;
      jet.position.set(CX + 1.75 + len / 2, Y, Z);
      jet.material.color.set(b.hot ? '#FF3B3B' : '#FFB35C');
      lever.rotation.x += (0.6 - travel() * 1.2 - lever.rotation.x) * 0.4;
      wheel.rotation.y = ((live.v.far - 6) / 29) * 3 * Math.PI;
      tags[0](V(TH.x, 1.35, TH.z), undefined, run ? `Cần ga: ${live.v.throttle.toFixed(0)} %` : 'Cần ga: CẮT nhiên liệu · đẩy cần ra xa để khởi động');
      tags[1](V(VALVE.x, 1.2, VALVE.z), undefined, `Van nhiên liệu: ${live.v.far.toFixed(0)} g/kg không khí · vặn để chỉnh`);
      if (!run && spool < 0.05) return 'Máy đang tắt\nĐẩy cần ga ra khỏi vị trí CẮT để mồi lửa và tăng tốc; vặn van để chỉnh tỉ lệ nhiên liệu';
      return `${run ? '' : 'Đang giảm tốc… '}Lực đẩy ${(b.thrust * spool).toFixed(0)} N · trước tuabin ${(b.T4 - 273).toFixed(0)} °C (giới hạn 1100 °C)\n${b.flameout ? 'Tắt lửa: hỗn hợp quá nghèo, mở thêm van nhiên liệu' : b.hot ? 'Đỏ rực: cánh tuabin quá nhiệt, khép bớt van nhiên liệu' : 'Vỏ máy cắt bổ: trục nối máy nén với tuabin quay cùng nhau; ống lửa sáng dần theo nhiệt độ'}`;
    },
  };
};

// ------------------------------------------------------------------ động cơ Stirling kiểu alpha
const GAS_COLOR = ['#9AA3C7', '#2459C9', '#E3B341', '#D9481C'];
const stirlingLab: Lab = ({k, P, live}) => {
  const XC = 0.9; // trục khuỷu
  const Y = 0.7;
  const ROD = 1.9;
  const CAP = XC - 3.3; // đáy kín của hai xi-lanh
  const ZS = [Z - 0.6, Z + 0.6]; // nóng (phía sau), lạnh (phía trước)
  const pistons = ZS.map((z) => group(k.scene, 0, Y, z));
  const cranks = ZS.map((z) => group(k.scene, XC, Y, z));
  const rods = ZS.map((z) => solid(k.scene, xCyl(0.03, 0.03, 1), '#C9CED6', {metal: 0.9, rough: 0.25, y: Y, z: z + 0.08}));
  const fly = group(k.scene, XC, Y, Z + 1.25);
  let cap: THREE.MeshStandardMaterial[] = [];
  // đèn khò: bình gas + vòi, ngọn lửa phun về +x vào chụp nóng
  const torch = group(k.scene, CAP - 1.0, 0, ZS[0]);
  solid(torch, yCyl(0.2, 0.2, 0.5), '#2459C9', {metal: 0.5, rough: 0.4, y: 0.25});
  solid(torch, yCyl(0.05, 0.05, 0.3), '#B9BEC5', {metal: 0.9, y: 0.6});
  solid(torch, xCyl(0.05, 0.07, 0.3), '#C8722A', {metal: 0.9, x: 0.12, y: Y});
  const flame = glow(k, new THREE.ConeGeometry(0.11, 0.55, 16).rotateZ(-Math.PI / 2), '#6FB7FF');
  torch.add(flame);
  flame.position.set(0.55, Y, 0);
  flame.material.opacity = 0.8;
  const PUMP = V(2.4, 0, 1.2);
  const handle = group(k.scene, PUMP.x, 1.6, PUMP.z);
  const GAUGE = V(1.7, 0.9, 1.2);
  const needle = group(k.scene, GAUGE.x, GAUGE.y, GAUGE.z);
  const SLOT = V(2.1, 0, 0.3);
  solid(k.scene, new THREE.TorusGeometry(0.28, 0.025, 10, 32).rotateX(Math.PI / 2), '#E3B341', {x: SLOT.x, y: 0.03, z: SLOT.z});
  k.label('Cổng nạp khí: đặt bình vào đây')(V(SLOT.x, 0.1, SLOT.z - 0.55));
  const bottles = GASES.map((g, i) => {
    const home = V(-1.0 + i * 0.6, 0, 1.5);
    const m = group(k.scene, home.x, 0, home.z);
    k.label(g.name)(V(home.x, 1.3, home.z));
    return {home, m};
  });
  board(k, -2.7, 1.2, 2.8, 1.4);
  k.label('Chu trình P–V')(V(-2.7, 0.1, 0.4));
  const loop = path(k, '#7FFFB0', 3, 121);
  const dot = glow(k, new THREE.SphereGeometry(0.07, 12, 8), '#FF9A4D');
  k.label('Xi-lanh nóng')(V(CAP + 0.8, 1.6, ZS[0]));
  k.label('Xi-lanh lạnh 27 °C (cánh tản nhiệt)')(V(CAP + 0.8, 0.1, ZS[1] + 0.85));
  const tags = [k.label('Đèn khò'), k.label('Bơm tay'), k.label('Áp suất')];
  loadModel(ENG)
    .then((lib) => {
      const put = builder(lib);
      put('StirFrame', k.scene, [XC, 0, Z]);
      ZS.forEach((z, i) => {
        put('StirCyl', k.scene, [CAP, Y, z]);
        put('StirPiston', pistons[i]);
        put('CrankDisc', cranks[i]);
      });
      cap = put('StirHotCap', k.scene, [CAP, Y, ZS[0]])?.mats ?? [];
      put('StirFins', k.scene, [CAP, Y, ZS[1]]);
      put('Flywheel', fly);
      put('HandPump', k.scene, [PUMP.x, 0, PUMP.z]);
      put('PumpHandle', handle);
      put('Gauge', k.scene, [GAUGE.x, GAUGE.y, GAUGE.z]);
      put('GaugeNeedle', needle);
      bottles.forEach((b, i) => tint(put('GasBottle', b.m), 'tint', GAS_COLOR[i]));
    })
    .catch(() => undefined);

  const FAR = CAP - 1.9; // đèn khò ở xa nhất: 300 °C; sát chụp nóng: 800 °C
  const NEAR = CAP - 0.75;
  const torchX = () => FAR + ((live.v.Th - 300) / 500) * (NEAR - FAR);
  let off = 0;
  const torchGrip: Grip = {
    at: () => v3.set(torch.position.x, 0.5, ZS[0]),
    down: (ptr) => (off = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.5, v3).x - torchX()),
    hold: (ptr) => live.set('Th', Math.round(300 + (clamp(P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.5, v3).x - off, FAR, NEAR) - FAR) / (NEAR - FAR) * 500)),
  };
  let hy = 1.6;
  let lastY = 0;
  let armed = true; // cán đã kéo lên hết: nhát ấn xuống kế tiếp mới tính là một lần bơm
  const pumpGrip: Grip = {
    at: () => handle.position,
    down: (ptr) => (lastY = ptr.ndc.y),
    hold: (ptr) => {
      hy = clamp(hy + (ptr.ndc.y - lastY) * 2.2, 1.08, 1.6);
      lastY = ptr.ndc.y;
      if (hy > 1.5) armed = true;
      if (armed && hy < 1.14) {
        armed = false;
        live.set('p', Math.min(100, Math.round(live.v.p * 1.6 + 0.5)));
      }
    },
  };
  const ventGrip: Grip = {at: () => GAUGE, hold: (_p, dt) => live.set('p', Math.max(1, Math.round(live.v.p * Math.exp(-2.5 * dt) * 10) / 10))};
  const bottleGrips = bottles.map(
    (b, i): Grip => ({
      at: () => v3.copy(b.m.position).setY(b.m.position.y + 0.5),
      up: (ptr) => {
        if (ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, v3.copy(SLOT).setY(0.5)) < 0.25 && Math.round(live.v.gas) !== i + 1) {
          live.set('gas', i + 1);
          live.set('p', 1); // đổi khí: xả hết khí cũ, nạp lại từ 1 bar
        }
      },
    }),
  );
  const G = grips(P, [torchGrip, pumpGrip, ventGrip, ...bottleGrips]);
  let key = NaN;
  let range = [0, 1];
  let ang = 0;
  const at = (a: number) => {
    const [vol, p] = schmidt(live.v.Th, a);
    return [-2.7 - 1.2 + (vol - 0.1) * 2.9, 0.07, 1.2 + 0.6 - ((p - range[0]) / (range[1] - range[0])) * 1.2];
  };
  return {
    grab: G.grab,
    step(_now, dt) {
      G.step(dt);
      if (live.v.Th !== key) {
        key = live.v.Th;
        const ps = Array.from({length: 121}, (_, i) => schmidt(key, (i / 120) * 6.2832)[1]);
        range = [Math.min(...ps), Math.max(...ps) * 1.4];
        setLine(loop, Array.from({length: 121}, (_, i) => at((i / 120) * 6.2832)).flat());
      }
      const s = stirling(live.v.p, live.v.Th, live.v.gas);
      ang += dt * (1.5 + s.g.k * 3);
      [0, Math.PI / 2].forEach((phase, i) => {
        const th = ang - phase;
        const px = XC + 0.2 * Math.cos(th);
        const py = Y + 0.2 * Math.sin(th);
        const wx = px - Math.sqrt(ROD * ROD - (py - Y) ** 2); // chốt pít-tông chỉ trượt dọc x
        pistons[i].position.x = wx - 0.24;
        cranks[i].rotation.z = th;
        rods[i].position.set((wx + px) / 2, (Y + py) / 2, ZS[i] + 0.08);
        rods[i].rotation.z = Math.atan2(py - Y, px - wx);
        rods[i].scale.x = ROD;
      });
      fly.rotation.z = ang;
      const hot = (live.v.Th - 300) / 500;
      cap.forEach((m) => m.emissive.set('#FF3B1C').multiplyScalar(0.15 + 0.75 * hot));
      torch.position.x = torchX();
      flame.scale.setScalar(0.9 + 0.1 * Math.sin(ang * 9));
      if (!G.by(pumpGrip)) hy += (1.6 - hy) * 0.08; // buông tay: cán tự nổi lên
      handle.position.y = hy;
      needle.rotation.z = 2.36 - (Math.log(live.v.p) / Math.log(100)) * 4.71;
      const gas = Math.min(3, Math.max(0, Math.round(live.v.gas) - 1));
      let hint = '';
      bottles.forEach((b, i) => {
        const ptr = G.by(bottleGrips[i]);
        b.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.9, v3) : i === gas ? SLOT : b.home, ptr ? 0.5 : 0.25);
        if (ptr) hint = `Đặt bình ${GASES[i].name} vào cổng nạp rồi buông tay (khí cũ được xả, nạp lại từ 1 bar)`;
      });
      const [x, y, z] = at(ang);
      dot.position.set(x, y + 0.03, z);
      tags[0](V(torch.position.x, 1.35, ZS[0]), undefined, `Đèn khò: chụp nóng ${live.v.Th.toFixed(0)} °C · kéo lại gần / ra xa`);
      tags[1](V(PUMP.x, 2.1, PUMP.z), undefined, 'Bơm tay: kéo cán lên rồi ấn xuống');
      tags[2](V(GAUGE.x, 1.5, GAUGE.z), undefined, `${live.v.p.toFixed(0)} bar · giữ đồng hồ để xả`);
      if (G.by(torchGrip)) hint = `Đang đưa đèn khò: nguồn nóng ${live.v.Th.toFixed(0)} °C`;
      if (G.by(pumpGrip)) hint = `Đang bơm: ${live.v.p.toFixed(0)} bar (mỗi nhát ấn hết cỡ tăng khoảng 60 %)`;
      if (G.by(ventGrip)) hint = `Đang xả khí: ${live.v.p.toFixed(0)} bar`;
      return `${hint || `Công suất trục ≈ ${s.power.toFixed(0)} W · ${s.g.name} ở ${live.v.p.toFixed(0)} bar, nguồn nóng ${live.v.Th.toFixed(0)} °C`}\nHai pít-tông lệch pha 90° nhờ hai chốt khuỷu; diện tích vòng P–V là công mỗi chu trình`;
    },
  };
};

export const ENG_LABS: Record<string, Lab> = {differential: differentialLab, turbine: turbineLab, stirling: stirlingLab};
