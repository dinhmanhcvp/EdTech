import * as THREE from 'three';
import {BZ_SAMPLES, PMSM, brayton, crackAt, fatigue, foc, harmonic, oregonator, quadruped, schmidt, shock, slam, stirling, surgery} from '../../utils/lab/hands/sims/advanced';
import type {Scene} from './HandsSims3D';
import {Z, board, box, clamp, cloud, glass, glow, path, rnd, sig, withSims, yCyl} from './HandsSimsThpt3D';
import {V, solid, xCyl} from './handsModels';
import {dress, partOf, place, withSims2} from './labParts';
import {setLine} from './Stage3D';

/** Cảnh 3D của 10 bài đỉnh cao còn lại (`sims/advanced.ts`). Cùng quy ước với `HandsSimsThpt3D.ts`. */
const circle = (cx: number, cz: number, r: number, n = 64) => Array.from({length: n + 1}, (_, i) => [cx + r * Math.cos((i / n) * 6.2832), 0.07, cz + r * Math.sin((i / n) * 6.2832)]).flat();

// ------------------------------------------------------------------ động cơ phản lực micro
const turbine: Scene = ({k, live}) => {
  const Y = 0.8;
  solid(k.scene, xCyl(0.35, 0.55, 1.2), '#9AA3AE', {metal: 0.8, x: -1.8, y: Y, z: Z});
  const comb = solid(k.scene, xCyl(0.55, 0.55, 1.4), '#6B7380', {metal: 0.6, x: -0.5, y: Y, z: Z});
  solid(k.scene, xCyl(0.55, 0.35, 0.9), '#4A5666', {metal: 0.7, x: 0.65, y: Y, z: Z});
  const fan = solid(k.scene, box(0.05, 0.66, 0.12), '#E8E2D4', {x: -2.42, y: Y, z: Z});
  const jet = glow(k, new THREE.ConeGeometry(0.3, 1, 24).rotateZ(-Math.PI / 2), '#FFB35C');
  jet.material.opacity = 0.75;
  k.label('Máy nén')(V(-1.8, 1.7, Z));
  k.label('Buồng đốt')(V(-0.5, 1.7, Z));
  k.label('Tuabin + ống phun')(V(0.8, 1.7, Z));
  let run = false;
  let spool = 0;
  let seen = {start: 0, stop: 0};
  return (_now, dt) => {
    // Khởi động / Tắt máy là hai nút thật: động cơ cần thời gian tăng và giảm tốc, không bật ngay
    if ((live.events.start ?? 0) !== seen.start) run = true;
    if ((live.events.stop ?? 0) !== seen.stop) run = false;
    seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
    spool += ((run ? 1 : 0) - spool) * Math.min(1, dt * 1.2);
    const b = brayton(live.v.throttle, live.v.far);
    fan.rotation.x += dt * (4 + live.v.throttle / 4) * spool * 3;
    comb.material.emissive.set('#FF4D1C').multiplyScalar((b.flameout ? 0 : clamp((b.T4 - 600) / 900, 0, 1)) * spool);
    const len = Math.max(0.1, (b.thrust / 90) * spool);
    jet.visible = !b.flameout && spool > 0.15;
    jet.scale.x = len;
    jet.position.set(1.1 + len / 2, Y, Z);
    jet.material.color.set(b.hot ? '#FF3B3B' : '#FFB35C');
    if (!run && spool < 0.05) return 'Máy đang tắt\nBấm Khởi động để mồi lửa và tăng tốc, rồi chỉnh bướm ga';
    return `${run ? '' : 'Đang giảm tốc… '}Lực đẩy ${(b.thrust * spool).toFixed(0)} N · trước tuabin ${(b.T4 - 273).toFixed(0)} °C (giới hạn 1100 °C)\n${b.flameout ? 'Tắt lửa: không đủ nhiên liệu để giữ ngọn lửa' : b.hot ? 'Đỏ rực: cánh tuabin quá nhiệt' : 'Buồng đốt sáng dần theo nhiệt độ; luồng phụt dài theo lực đẩy'}`;
  };
};

// ------------------------------------------------------------------ FOC động cơ PMSM
const focScene: Scene = ({k, live}) => {
  const rotor = new THREE.Group();
  rotor.position.set(-2.4, 0.2, Z);
  solid(rotor, box(0.8, 0.3, 1.2), '#D9481C', {x: -0.4});
  solid(rotor, box(0.8, 0.3, 1.2), '#2F6FD0', {x: 0.4});
  k.scene.add(rotor);
  withSims((lib) => {
    place(k.scene, lib, 'PmsmStator', [-2.4, 0, Z]);
    place(rotor, lib, 'PmsmRotor', [0, 0, 0], [...rotor.children]);
  });
  k.label('Rô-to nam châm vĩnh cửu')(V(-2.4, 1, Z));
  const CX = 1.3;
  const R = 1.15;
  board(k, CX, Z, 3.6, 2.9);
  const ring = k.line('#5E7A9A', 2, circle(CX, Z, R));
  const axes = k.line('#5E7A9A', 1.5, [CX - 1.6, 0.06, Z, CX + 1.6, 0.06, Z, CX, 0.06, Z - 1.35, CX, 0.06, Z + 1.35], true);
  const cur = k.line('#FF9A4D', 4, [0, 0, 0, 0, 0, 0]);
  const volt = k.line('#7FFFB0', 4, [0, 0, 0, 0, 0, 0]);
  k.scene.add(ring, axes, cur, volt);
  k.label('trục d')(V(CX + 1.75, 0.1, Z));
  k.label('trục q')(V(CX, 0.1, Z - 1.5));
  const tags = [k.label('dòng i', '#FF9A4D'), k.label('điện áp v', '#7FFFB0')];
  let on = false;
  let burnt = false;
  let spin = 0;
  let seen = {start: 0, stop: 0};
  return (_now, dt) => {
    // Đóng contactor / Cắt nguồn: bộ nghịch lưu chỉ điều khiển khi có điện, rô-to có quán tính
    if ((live.events.start ?? 0) !== seen.start) on = true;
    if ((live.events.stop ?? 0) !== seen.stop) on = false;
    seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
    spin += ((on ? 1 : 0) - spin) * Math.min(1, dt * 1.5);
    const s = foc(live.v.rpm, live.v.iq, live.v.id);
    // đang chạy mà điện áp hoặc dòng vượt giới hạn nghịch lưu: transistor cháy
    if (on && spin > 0.5 && (s.V > PMSM.Vmax || s.I > PMSM.Imax)) {
      if (!burnt) live.hazard?.('inverter-burn', V(-2.4, 0.4, Z));
      burnt = true;
    } else burnt = false;
    rotor.rotation.y += dt * (live.v.rpm / 1500) * spin;
    if (!on && spin < 0.03) {
      setLine(cur, [CX, 0.09, Z, CX, 0.09, Z]);
      setLine(volt, [CX, 0.09, Z, CX, 0.09, Z]);
      tags[0](null);
      tags[1](null);
      return 'Bộ nghịch lưu chưa có điện\nBấm Đóng contactor để bắt đầu điều khiển';
    }
    const tip = (x: number, y: number, max: number) => [CX + clamp((x / max) * R, -1.7, 1.7), 0.09, Z - clamp((y / max) * R, -1.4, 1.4)];
    const i = tip(live.v.id, live.v.iq, PMSM.Imax);
    const u = tip(s.vd, s.vq, PMSM.Vmax);
    setLine(cur, [CX, 0.09, Z, ...i]);
    setLine(volt, [CX, 0.09, Z, ...u]);
    tags[0](V(i[0], 0.3, i[2]));
    tags[1](V(u[0], 0.3, u[2]));
    return `Mô-men ${s.torque.toFixed(1)} N·m · điện áp ${s.V.toFixed(0)}/${PMSM.Vmax.toFixed(0)} V · dòng ${s.I.toFixed(0)}/100 A\nVòng tròn là giới hạn của bộ nghịch lưu: cả hai mũi tên phải nằm trong vòng`;
  };
};

// ------------------------------------------------------------------ động cơ Stirling
const stirlingScene: Scene = ({k, live}) => {
  const Y = 0.7;
  const hot = glass(k, xCyl(0.45, 0.45, 1.6), '#D9481C', 0.35, -2.6, Y, Z - 0.6);
  glass(k, xCyl(0.45, 0.45, 1.6), '#2F6FD0', 0.35, -2.6, Y, Z + 0.6);
  const pistons = [-0.6, 0.6].map((dz) => solid(k.scene, xCyl(0.4, 0.4, 0.4), '#C9CED6', {metal: 0.8, y: Y, z: Z + dz}));
  k.label('Xi-lanh nóng')(V(-2.6, 1.6, Z - 0.6));
  k.label('Xi-lanh lạnh 27 °C')(V(-2.6, 0.1, Z + 1.3));
  const CX = 1.4;
  board(k, CX, Z, 3.6, 2.6);
  k.label('Chu trình P–V (áp suất theo thể tích)')(V(CX, 0.1, Z - 1.45));
  const loop = path(k, '#7FFFB0', 3, 121);
  const dot = glow(k, new THREE.SphereGeometry(0.08, 12, 8), '#FF9A4D');
  let key = NaN;
  let range = [0, 1];
  let ang = 0;
  const at = (a: number) => {
    const [vol, p] = schmidt(live.v.Th, a);
    return [CX - 1.5 + (vol - 0.1) * 3.6, 0.07, Z + 1.1 - ((p - range[0]) / (range[1] - range[0])) * 2.2];
  };
  return (_now, dt) => {
    if (live.v.Th !== key) {
      key = live.v.Th;
      const ps = Array.from({length: 121}, (_, i) => schmidt(key, (i / 120) * 6.2832)[1]);
      range = [Math.min(...ps), Math.max(...ps) * 1.4]; // chừa chỗ: vòng lớn dần khi nguồn nóng hơn
      setLine(loop, Array.from({length: 121}, (_, i) => at((i / 120) * 6.2832)).flat());
    }
    const s = stirling(live.v.p, live.v.Th, live.v.gas);
    ang += dt * (1.5 + s.g.k * 3);
    pistons[0].position.x = -2.6 + 0.5 * Math.cos(ang);
    pistons[1].position.x = -2.6 + 0.5 * Math.cos(ang - Math.PI / 2);
    hot.material.opacity = 0.2 + 0.5 * ((live.v.Th - 300) / 500);
    const [x, y, z] = at(ang);
    dot.position.set(x, y + 0.03, z);
    return `Công suất trục ≈ ${s.power.toFixed(0)} W · ${s.g.name} ở ${live.v.p.toFixed(0)} bar\nDiện tích vòng P–V là công mỗi chu trình; hai pít-tông lệch pha 90°`;
  };
};

// ------------------------------------------------------------------ Harmonic Drive
const harmonicScene: Scene = ({k, live}) => {
  const ring = solid(k.scene, new THREE.TorusGeometry(1.25, 0.12, 12, 64).rotateX(Math.PI / 2), '#6B7380', {metal: 0.8, y: 0.14, z: Z});
  k.label('Vành cứng (cố định)')(V(0, 0.1, Z - 1.6));
  const flex = path(k, '#7FFFB0', 5, 97);
  const gen = solid(k.scene, box(1.9, 0.12, 0.5), '#E3B341', {metal: 0.7, y: 0.1, z: Z});
  withSims((lib) => {
    place(k.scene, lib, 'HarmonicRing', [0, 0, Z], [ring]);
    dress(gen, partOf(lib, 'WaveGen'));
  });
  const mark = glow(k, new THREE.SphereGeometry(0.09, 12, 8), '#FFFFFF');
  const tag = k.label('Đầu ra');
  k.label('Bộ tạo sóng (nối động cơ)', '#E3B341')(V(0, 0.9, Z));
  let wg = 0;
  return (_now, dt) => {
    const h = harmonic(live.v.zf, live.v.rpm, live.v.load);
    wg += dt * (live.v.rpm / 700);
    gen.rotation.y = -wg;
    const pts: number[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * 6.2832;
      const r = 1.0 + 0.11 * Math.cos(2 * (a - wg));
      pts.push(r * Math.cos(a), 0.2, Z + r * Math.sin(a));
    }
    setLine(flex, pts);
    flex.material.color.set(h.ratchet ? '#FF3B3B' : h.stress > 0.85 ? '#FF9A4D' : h.stress > 0.6 ? '#E3B341' : '#7FFFB0');
    // đầu ra quay ngược chiều, chậm hơn `ratio` lần (ở đây phóng đại 20 lần cho thấy được)
    const out = (-wg / h.ratio) * 20 + (h.ratchet ? Math.sin(wg * 3) * 0.3 : 0);
    mark.position.set(0.95 * Math.cos(out), 0.3, Z + 0.95 * Math.sin(out));
    tag(V(mark.position.x, 0.6, mark.position.z));
    return `Tỉ số ${h.ratio}:1 · đầu ra ${h.out.toFixed(1)} vòng/phút (chấm trắng, vẽ nhanh gấp 20)\nBánh mềm bị ép thành elip, ăn khớp ở hai đầu; màu theo ứng suất uốn`;
  };
};

// ------------------------------------------------------------------ vết nứt mỏi
const fatigueScene: Scene = ({k, live}) => {
  const halves = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.set(-1.6, 0.1, Z);
    const m = solid(g, box(3.2, 0.12, 1.1), '#9AA3AE', {metal: 0.7, x: 1.6, z: s * 0.56});
    k.scene.add(g);
    return {g, m, s};
  });
  withSims((lib) => {
    place(k.scene, lib, 'Clevis', [0, 0, Z + 0.95]);
    const far = place(k.scene, lib, 'Clevis', [0, 0, Z - 0.95]);
    if (far) far.obj.rotation.y = Math.PI;
  });
  const crack = k.line('#FF3B3B', 4, [0, 0, 0, 0, 0, 0]);
  k.scene.add(crack);
  const tip = glow(k, new THREE.SphereGeometry(0.1, 12, 8), '#FFB35C');
  const tag = k.label('Đầu vết nứt');
  for (const s of [-1, 1]) k.label(s < 0 ? '↑ tải lặp Δσ' : '↓ tải lặp Δσ')(V(0, 0.4, Z + s * 1.4));
  let key = '';
  let t0 = 0;
  return (now) => {
    if (sig(live) !== key) {
      key = sig(live);
      t0 = now;
    }
    const {ds, a0, alloy} = live.v;
    const f = fatigue(ds, a0, alloy);
    const u = (((now - t0) / 1000) % 7) / 5; // 5 s nứt dần, 2 s đã gãy
    const a = crackAt(ds, a0, alloy, Math.min(1, u) * f.cycles);
    const broken = u >= 1;
    const len = broken ? 3.2 : (a / 0.05) * 3.2;
    setLine(crack, [-1.6, 0.18, Z, -1.6 + len, 0.18, Z]);
    tip.position.set(-1.6 + len, 0.2, Z);
    tip.scale.setScalar(0.5 + 1.5 * Math.min(1, a / f.ac));
    tip.visible = !broken;
    tag(broken ? null : V(-1.6 + len, 0.6, Z));
    halves.forEach((h) => {
      h.g.position.z = Z + (broken ? h.s * 0.25 : 0);
      h.m.material.color.set(['#B9C2CC', '#7C8590', '#A9A39A'][Math.round(alloy) - 1] ?? '#9AA3AE');
    });
    return `${broken ? 'GÃY GIÒN' : `Vết nứt dài ${(a * 1000).toFixed(1)} mm`} · ${f.m.name} · tuổi thọ ${Math.round(f.cycles).toLocaleString('vi-VN')} chu kì\nVết nứt bò rất chậm lúc đầu rồi tăng tốc; tấm rộng 50 mm, hình lặp lại mỗi 7 giây`;
  };
};

// ------------------------------------------------------------------ sóng xung kích
const shockScene: Scene = ({k, live}) => {
  const AX = -0.6;
  board(k, 0, Z, 7, 2.9, '#0C1118');
  withSims2((lib) => place(k.scene, lib, 'WindTunnel', [0, 0, Z])); // hầm gió: cửa kính, nắn dòng, đồng hồ áp suất
  const wedge = k.line('#E8E2D4', 4, new Array(12).fill(0));
  const waves = [path(k, '#FF9A4D', 3, 41), path(k, '#5E7A9A', 1.5, 3)];
  k.scene.add(wedge);
  const flow = cloud(k, 120, '#BFD8E8', 3);
  const pulses = cloud(k, 18, '#FFE3A3', 7);
  const p = rnd(240);
  k.label('Dòng khí →')(V(-3, 0.1, Z - 1.6));
  return (now) => {
    const {M, deg} = live.v;
    const s = shock(M, deg);
    const th = (deg * Math.PI) / 180;
    const L = 2.2;
    setLine(wedge, [AX, 0.08, Z, AX + L, 0.08, Z - L * Math.tan(th), AX + L, 0.08, Z + L * Math.tan(th), AX, 0.08, Z].map((x, i) => (i % 3 === 2 ? clamp(x, Z - 1.4, Z + 1.4) : x)));
    const pts: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const w = (i / 40 - 0.5) * 2.8; // toạ độ ngang qua dòng
      // sóng bám: hai đường thẳng từ mũi; sóng tách: đường cong đứng trước mũi; dưới âm: không có
      const x = M <= 1 ? AX : s.beta !== null ? AX + Math.abs(w) / Math.tan(s.beta) : AX - 0.35 + w * w * 0.45;
      pts.push(clamp(x, -3.4, 3.4), 0.09, Z + (M <= 1 ? 0 : w));
    }
    setLine(waves[0], pts);
    // xung chạy dọc mặt sóng xung kích: thấy sóng đang lan chứ không đứng yên
    for (let q = 0; q < 18; q++) {
      const idx = Math.floor(((now / 1500 + q / 18) % 1) * 40);
      pulses.pos.set([pts[idx * 3], pts[idx * 3 + 1] + 0.03, pts[idx * 3 + 2]], q * 3);
    }
    pulses.flush();
    const mu = M > 1 ? s.mu : Math.PI / 2;
    setLine(waves[1], [AX - 2 + 1.3 / Math.tan(mu), 0.08, Z - 1.3, AX - 2, 0.08, Z, AX - 2 + 1.3 / Math.tan(mu), 0.08, Z + 1.3].map((x, i) => (i % 3 === 0 ? clamp(x, -3.4, 3.4) : x)));
    for (let i = 0; i < 120; i++) flow.pos.set([-3.4 + ((p[i * 2] + (now / 4000) * M) % 1) * 6.8, 0.06, Z + (p[i * 2 + 1] - 0.5) * 2.7], i * 3);
    flow.flush();
    return `Mach ${M.toFixed(2)} · ${M <= 1 ? 'dưới âm' : s.detached ? 'sóng cung tách khỏi mũi' : `sóng xiên ${((s.beta! * 180) / Math.PI).toFixed(1)}°, áp suất ×${s.pr.toFixed(2)}`}\nĐường cam: sóng xung kích. Đường xanh mờ: nón Mach của một nhiễu động nhỏ`;
  };
};

// ------------------------------------------------------------------ robot bốn chân
const quadScene: Scene = ({k, live}) => {
  const robot = new THREE.Group();
  // gốc của nhóm nằm ở hàng chân bên phải, trên mặt sàn: quay nhóm quanh trục z là lật quanh hàng chân đó
  const body = solid(robot, box(1.7, 0.3, 0.8), '#E3B341', {metal: 0.4, x: -0.7});
  const legs = [-1.4, 0].flatMap((x) => [-0.3, 0.3].map((z) => solid(robot, box(0.12, 1, 0.12), '#3A3F47', {x, z})));
  // mô hình Blender: thân có đầu cảm biến, bốn chân có khớp gối và bàn chân cao su (chân co giãn theo độ cao trọng tâm)
  withSims2((lib) => {
    dress(body, partOf(lib, 'QuadBody'));
    legs.forEach((l) => dress(l, partOf(lib, 'QuadLeg')));
  });
  k.scene.add(robot);
  const floor = board(k, 0, Z, 6.5, 2.4, '#4A5666');
  const push = k.arrow('#FF3B3B', 0.05);
  k.scene.add(push.obj);
  const tag = k.label('Lực đạp');
  let kickAt = -1e9;
  let kicks = 0;
  return (now) => {
    // bấm "Đạp!": một cú đạp duy nhất, robot phản ứng rồi đứng lại ở vị trí mới
    if ((live.events.kick ?? 0) !== kicks) {
      kicks = live.events.kick ?? 0;
      kickAt = now;
    }
    const {mu, h, F} = live.v;
    const q = quadruped(mu, h, F);
    const H = h * 3; // chiều cao thân trên cảnh
    const u = Math.min(1, (now - kickAt) / 1800);
    body.position.y = H;
    legs.forEach((l) => {
      l.scale.y = H;
      l.position.y = H / 2;
    });
    robot.position.set((q.slip ? u * 1.8 : 0) + 0.7, 0.04, Z + 0.2);
    robot.rotation.z = q.tip && !q.slip ? -u * 1.2 : 0;
    floor.material.color.set('#4A5666').lerp(new THREE.Color('#BFE3F5'), clamp(1 - mu * 2, 0, 1));
    const len = F / 100;
    push.set(V(-0.9 - len, H, Z + 0.2), V(-0.9, H, Z + 0.2));
    tag(F > 1 ? V(-1 - len, H + 0.4, Z + 0.2) : null, undefined, `Lực đạp ${F.toFixed(0)} N`);
    return `${q.slip ? 'TRƯỢT CHÂN' : q.tip ? 'LẬT' : 'Trụ vững'} · chịu trượt tới ${q.maxSlip.toFixed(0)} N, chịu lật tới ${q.maxTip.toFixed(0)} N\nSàn càng xanh nhạt càng trơn; thân càng cao càng dễ lật`;
  };
};

// ------------------------------------------------------------------ robot phẫu thuật
const surgeryScene: Scene = ({k, live}) => {
  board(k, 0, Z, 7, 2.9);
  k.label('Tay bác sĩ (run 0,5 mm)', '#7FD4FF')(V(-2, 0.1, Z - 1.3));
  k.label('Đầu kim trong mạch máu 1 mm', '#FF9A4D')(V(-2, 0.1, Z + 0.15));
  const MM = 0.5; // đơn vị cảnh cho mỗi milimét
  glass(k, xCyl(MM / 2, MM / 2, 6.6), '#E0314B', 0.25, 0, 0.1, Z + 0.75);
  withSims2((lib) => {
    place(k.scene, lib, 'SurgeryJoystick', [-3.9, 0, Z - 0.7]); // tay điều khiển của bác sĩ
    place(k.scene, lib, 'CatheterDrive', [-3.75, 0, Z + 0.75]); // bộ đẩy ống thông ở đầu mạch máu
  });
  const hand = path(k, '#7FD4FF', 2.5, 300);
  const tool = path(k, '#FF9A4D', 3, 300);
  let key = '';
  let text = '';
  return () => {
    if (sig(live) === key) return text;
    key = sig(live);
    const s = surgery(live.v.K, live.v.filt, live.v.delay);
    const h: number[] = [];
    const t: number[] = [];
    for (let i = 0; i < 300; i++) {
      const x = -3.3 + (i / 299) * 6.6;
      const shake = Math.sin(i * 0.63) * 0.8 + Math.sin(i * 0.41 + 1) * 0.2; // run sinh lí ~10 Hz
      h.push(x, 0.08, Z - 0.7 + shake * 0.5 * MM);
      // trễ làm đầu kim đi sau ý định: vẽ thành dao động chậm quanh trục mạch
      t.push(x, 0.12, Z + 0.75 + (shake * s.tremor + Math.sin(i * 0.05) * s.lag) * MM);
    }
    setLine(hand, h);
    setLine(tool, t);
    text = `Đầu kim lệch ${s.err.toFixed(3)} mm (cho phép 0,05 mm)\nHai đường vẽ cùng tỉ lệ: ống đỏ là mạch máu đường kính 1 mm`;
    return text;
  };
};

// ------------------------------------------------------------------ SLAM
const slamScene: Scene = ({k, live}) => {
  board(k, 0, Z, 6.6, 2.9);
  const W = 2.6;
  const D = 1.1;
  const at = (u: number): [number, number] => {
    const s = (u % 1) * 4;
    return s < 1 ? [-W + 2 * W * s, -D] : s < 2 ? [W, -D + 2 * D * (s - 1)] : s < 3 ? [W - 2 * W * (s - 2), D] : [-W, D - 2 * D * (s - 3)];
  };
  const truth = k.line('#5E7A9A', 2, Array.from({length: 101}, (_, i) => [at(i / 100)[0], 0.07, Z + at(i / 100)[1]]).flat());
  k.scene.add(truth);
  const est = path(k, '#FF9A4D', 3, 101);
  const feats = cloud(k, 500, '#7FFFB0', 3);
  const p = rnd(1000);
  for (let i = 0; i < 500; i++) {
    const [x, z] = at(p[i * 2]);
    feats.pos.set([x * 1.18 + (p[i * 2 + 1] - 0.5) * 0.15, 0.07, Z + z * 1.25 + (p[i * 2 + 1] - 0.5) * 0.15], i * 3);
  }
  const car = solid(k.scene, box(0.3, 0.15, 0.2), '#E3B341', {});
  withSims2((lib) => dress(car, partOf(lib, 'LidarBot')));
  k.label('Quỹ đạo thật', '#9FB6CC')(V(0, 0.1, Z - 1.25));
  const tag = k.label('Bản đồ ước lượng', '#FF9A4D');
  return (now) => {
    const s = slam(live.v.drift, live.v.L, live.v.feats, live.v.closure);
    const shift = (u: number) => clamp(s.err * 0.25, 0, 1.2) * u; // 1 m sai số = 0,25 đơn vị cảnh, lớn dần theo quãng đường
    const pos = (u: number) => [at(u)[0] + shift(u), 0.09, Z + at(u)[1] + shift(u) * 0.6];
    setLine(est, Array.from({length: 101}, (_, i) => pos(i / 100)).flat());
    feats.flush(Math.round(live.v.feats));
    const u = (now / 8000) % 1;
    const [x, y, z] = pos(u);
    car.position.set(x, y + 0.05, z);
    tag(V(pos(0.999)[0], 0.5, pos(0.999)[2]));
    return `Sai số cuối vòng ${s.err.toFixed(2)} m · ${live.v.closure >= 0.5 ? 'đã đóng vòng lặp' : 'chưa đóng vòng lặp'}\nĐường cam không khép kín là bản đồ bị trôi; chấm xanh là điểm đặc trưng camera nhận lại`;
  };
};

// ------------------------------------------------------------------ phản ứng BZ
const bzScene: Scene = ({k, live}) => {
  glass(k, yCyl(1, 1, 1.5, true), '#BFD8E8', 0.22, -2.3, 0.78, Z);
  const liquid = solid(k.scene, yCyl(0.95, 0.95, 1.1), '#C4261A', {x: -2.3, y: 0.57, z: Z});
  withSims((lib) => place(k.scene, lib, 'Stirrer', [-2.3, 0, Z]));
  k.label('Bình khuấy')(V(-2.3, 1.9, Z));
  const CX = 1.2;
  board(k, CX, Z, 4.4, 2.2);
  k.label('Chất xúc tác bị oxi hoá theo thời gian')(V(CX, 0.1, Z - 1.25));
  const plot = path(k, '#7FFFB0', 3, BZ_SAMPLES);
  const dot = glow(k, new THREE.SphereGeometry(0.08, 12, 8), '#FFFFFF');
  let key = '';
  let r = oregonator(live.v.f, live.v.eps);
  let top = 1;
  const at = (i: number) => [CX - 2 + (i / (BZ_SAMPLES - 1)) * 4, 0.07, Z + 0.9 - (r.z[i] / top) * 1.7];
  return (now) => {
    if (sig(live) !== key) {
      key = sig(live);
      r = oregonator(live.v.f, live.v.eps);
      top = Math.max(0.2, ...r.z);
      setLine(plot, Array.from({length: BZ_SAMPLES}, (_, i) => at(i)).flat());
    }
    const i = Math.floor(((now / 15000) % 1) * BZ_SAMPLES);
    const [x, y, z] = at(i);
    dot.position.set(x, y + 0.03, z);
    liquid.material.color.set('#C4261A').lerp(new THREE.Color('#2459C9'), clamp(r.z[i] / top, 0, 1));
    return `${r.period > 0 ? `Dao động, chu kì ≈ ${r.period.toFixed(1)}` : 'Không dao động'} · f = ${live.v.f.toFixed(2)}\nĐỏ = ferroin khử, xanh = ferriin oxi hoá; đồ thị chạy lại mỗi 15 giây`;
  };
};

export const ADVANCED_SCENES: Record<string, Scene> = {turbine, foc: focScene, stirling: stirlingScene, harmonic: harmonicScene, fatigue: fatigueScene, shock: shockScene, quadruped: quadScene, surgery: surgeryScene, slam: slamScene, bz: bzScene};
