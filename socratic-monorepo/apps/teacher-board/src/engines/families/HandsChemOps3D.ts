import * as THREE from 'three';
import {alkali, bleach, no2, titrationPH} from '../../utils/lab/hands/sims/thptChemBio';
import {BZ_SAMPLES, oregonator} from '../../utils/lab/hands/sims/advanced';
import {tiltFor} from '../../utils/lab/hands/handTracker';
import {spillOf} from '../../utils/lab/hands/mishap';
import type {SimLive} from './HandsSims3D';
import {board, box, clamp, cloud, glass, glow, path, rnd, yCyl, Z} from './HandsSimsThpt3D';
import {handPointers, type Ptr} from './handsKit';
import {V, solid, xCyl} from './handsModels';
import {dress, glassify, labelBottle, loadModel, partOf, place, type Skin} from './labParts';
import {setLine, type Kit} from './Stage3D';

/**
 * Bốn bài Hóa THPT làm bằng THAO TÁC trên dụng cụ thật (mô hình Blender `chem-parts.glb`), không còn thanh trượt trên bàn:
 * chuẩn độ (rót NaOH vào buret, bóp khóa nhỏ giọt), NO₂ ⇌ N₂O₄ (đẩy pít-tông, rót nước nóng / đá vào bể),
 * clo khô – clo ẩm (mở khóa phễu, đổi bình rửa khí, thả vải vào bình), kim loại kiềm (lấy thỏi kim loại, cắt, thả vào chậu).
 * Cảnh luôn vẽ theo `live.v`, thao tác chỉ ghi vào `live.v`: thanh trượt dự phòng ở bảng bên vẫn điều khiển được cùng một trạng thái.
 */
type Hands = ReturnType<typeof handPointers>;
type Ctx = {k: Kit; P: Hands; live: SimLive};
export type Lab = (c: Ctx) => {grab: (nx: number, ny: number) => boolean; step: (now: number, dt: number) => string};
const CHEM = '/models/chem-parts.glb';

/** vật cầm được: `at` là vị trí hiện tại; `down` lúc vừa chụm, `hold` mỗi khung hình đang giữ, `up` lúc buông */
export type Grip = {at: () => THREE.Vector3; down?: (p: Ptr) => void; hold?: (p: Ptr, dt: number) => void; up?: (p: Ptr) => void};
export function grips(P: Hands, list: Grip[]) {
  const held: (Grip | null)[] = P.ptrs.map(() => null);
  const near = (nx: number, ny: number, reach: number) => {
    let best: Grip | null = null;
    let bd = reach;
    for (const g of list) {
      const d = P.distAt(nx, ny, g.at());
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    return best;
  };
  return {
    grab: (nx: number, ny: number) => near(nx, ny, 0.07) !== null,
    /** con trỏ đang cầm vật này (null nếu không ai cầm) */
    by: (g: Grip): Ptr | null => P.ptrs[held.indexOf(g)] ?? null,
    step(dt: number) {
      P.ptrs.forEach((ptr, n) => {
        const h = ptr.active && !held[n] ? near(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && h) {
          held[n] = h;
          h.down?.(ptr);
        }
        const cur = held[n];
        if (cur && (ptr.released || !ptr.active)) {
          cur.up?.(ptr);
          held[n] = null;
        } else cur?.hold?.(ptr, dt);
        ptr.hot = !!(held[n] ?? h);
      });
    },
  };
}
export const based = (g: THREE.BufferGeometry, h: number) => g.translate(0, h / 2, 0); // gốc ở đáy như mô hình Blender
export const wear = (proxy: THREE.Mesh, lib: THREE.Object3D, name: string, scale = 1): Skin | null => {
  const sk = dress(proxy, partOf(lib, name));
  if (sk) {
    glassify(sk.obj);
    sk.obj.scale.setScalar(scale);
  }
  return sk;
};
export const tint = (sk: Skin | null, name: string, color: string) => sk?.mats.filter((m) => m.name === name).forEach((m) => m.color.set(color));
const v3 = new THREE.Vector3();
/**
 * Nghiêng chai ở giữa không trung (xoay cổ tay quá 50 % khi chưa ở trên miệng dụng cụ) quá 0,6 s thì chất lỏng đổ ra bàn.
 * Chuột không xoay cổ tay nên không bao giờ đổ; mỗi lần nhấc chai chỉ đổ một lần (`rearm` khi nhấc lại).
 */
const airSpill = () => {
  let air = 0;
  let done = false;
  return {
    rearm: () => ((air = 0), (done = false)),
    /** true đúng một lần, ở khung hình bắt đầu đổ */
    tick(tilt: number, over: boolean, dt: number): boolean {
      if (over || tilt < 0.5) return (air = 0), false;
      air += dt;
      if (air < 0.6 || done) return false;
      return (done = true);
    },
  };
};

// ------------------------------------------------------------------ chuẩn độ: rót NaOH vào buret, bóp khóa để nhỏ giọt
const NAOH = [0.05, 0.1, 0.2];
const titrationLab: Lab = ({k, P, live}) => {
  const X = -2.2;
  const TIP = 1.2; // đầu vòi buret
  const TOP = V(X, TIP + 2.45, Z);
  const plain = [solid(k.scene, box(0.08, 3.4, 0.08), '#6B7380', {metal: 0.7, x: X - 0.6, y: 1.7, z: Z}), glass(k, yCyl(0.09, 0.09, 2), '#BFD8E8', 0.3, X, TIP + 1.45, Z), glass(k, yCyl(0.16, 0.5, 0.95, true), '#BFD8E8', 0.25, X, 0.48, Z)];
  const naoh = solid(k.scene, based(yCyl(0.07, 0.07, 1.9), 1.9), '#CFEFFF', {x: X, y: TIP + 0.5, z: Z});
  const sol = glass(k, yCyl(0.36, 0.46, 0.3), '#F2F6F8', 0.85, X, 0.2, Z);
  const cock = solid(k.scene, box(0.06, 0.24, 0.06), '#2459C9', {x: X, y: TIP + 0.36, z: Z + 0.14});
  const drop = solid(k.scene, new THREE.SphereGeometry(0.035, 10, 8), '#CFEFFF', {});
  k.label('Khóa buret: chụm nhanh = 1 giọt, giữ = chảy thành dòng')(V(X + 1.1, TIP + 0.36, Z));
  k.label('Rót NaOH vào đây')(V(X, TIP + 2.75, Z));
  const bottles = NAOH.map((c, i) => {
    const home = V(-3.7 + i * 0.75, 0, 1.5);
    const m = solid(k.scene, based(yCyl(0.24, 0.24, 0.9), 0.9), '#BFD8E8', {x: home.x, z: home.z});
    k.label(`NaOH ${c.toString().replace('.', ',')} M`)(V(home.x, 1.25, home.z));
    return {c, home, m};
  });
  board(k, 1.3, Z, 4, 2.6);
  k.label('Đường cong pH theo thể tích NaOH (0–40 mL)')(V(1.3, 0.1, Z - 1.45));
  const at = (V_: number, pH: number) => [-0.5 + (V_ / 40) * 3.6, 0.07, Z + 1.15 - (pH / 14) * 2.3];
  const curve = path(k, '#7FFFB0', 3, 400);
  k.scene.add(k.line('#5E7A9A', 1.5, [...at(0, 7), ...at(40, 7)]));
  const dot = glow(k, new THREE.SphereGeometry(0.08, 12, 8), '#FF9A4D');
  loadModel(CHEM)
    .then((lib) => {
      place(k.scene, lib, 'RetortStand', [X, 0, Z], [plain[0]]);
      place(k.scene, lib, 'Burette', [X, TIP, Z], [plain[1]]);
      place(k.scene, lib, 'Erlenmeyer', [X, 0, Z], [plain[2]]);
      const sk = dress(cock, partOf(lib, 'Stopcock'));
      if (sk) sk.obj.position.z = -0.14; // vật thay thế nằm ở tay vặn, mô hình có gốc trên trục khóa
      bottles.forEach((b) => {
        const sk = wear(b.m, lib, 'Bottle', 1.6);
        tint(sk, 'cap', '#2459C9');
        labelBottle(sk, 'NaOH', `${b.c.toString().replace('.', ',')} M`, '#2459C9');
      });
    })
    .catch(() => undefined);

  let flow = 0; // mL/s đang chảy
  let heldFor = 0;
  const add = (ml: number) => live.set('V', Math.min(40, Math.round((live.v.V + ml) * 100) / 100));
  const cockGrip: Grip = {
    at: () => cock.position,
    down: () => {
      heldFor = 0;
      add(0.05); // một giọt
    },
    hold: (_p, dt) => {
      heldFor += dt;
      flow = heldFor < 0.6 ? 0 : Math.min(4, 0.4 + (heldFor - 0.6) * 1.5);
      if (flow) add(flow * dt);
    },
    up: () => (flow = 0),
  };
  const fillRoll = bottles.map(() => 0);
  const spills = bottles.map(() => airSpill());
  let fillFor = 0; // thời gian đã nghiêng chai trên miệng buret
  const bottleGrips = bottles.map(
    (b, i): Grip => ({
      at: () => v3.copy(b.m.position).setY(b.m.position.y + 0.45),
      down: (p) => {
        fillRoll[i] = p.roll;
        fillFor = 0;
        spills[i].rearm();
      },
      // nghiêng chai trên miệng buret ~0,8 s thì buret đầy NaOH nồng độ của chai
      hold: (p, dt) => {
        const near = P.distAt(p.ndc.x, p.ndc.y, TOP) < 0.22;
        if (spills[i].tick(tiltFor(p.roll, fillRoll[i], false), near, dt)) live.hazard?.(spillOf('base'), V(P.onPlane(p.ndc.x, p.ndc.y, 1.6, v3).x, 0.06, v3.z));
        if (near && tiltFor(p.roll, fillRoll[i], true) > 0.5) {
          fillFor += dt;
          if (fillFor >= 0.8 && (live.v.cb !== b.c || live.v.V !== 0)) {
            live.set('cb', b.c);
            live.set('V', 0); // buret đầy lại, bình tam giác thay mẻ acid mới
          }
        } else fillFor = 0;
      },
    }),
  );
  const G = grips(P, [cockGrip, ...bottleGrips]);
  let key = NaN;
  let dripAt = 0;
  let lastV = live.v.V;
  return {
    grab: G.grab,
    step(now, dt) {
      G.step(dt);
      const {V: vol, cb} = live.v;
      if (cb !== key) {
        key = cb;
        setLine(curve, Array.from({length: 400}, (_, i) => at((i / 399) * 40, titrationPH((i / 399) * 40, cb))).flat());
      }
      if (vol > lastV) dripAt = now;
      lastV = vol;
      const pH = titrationPH(vol, cb);
      const [x, y, z] = at(vol, pH);
      dot.position.set(x, y + 0.03, z);
      naoh.scale.y = Math.max(0.01, 1 - vol / 40);
      sol.material.color.set('#F2F6F8').lerp(new THREE.Color('#E84F9A'), clamp((pH - 8.2) / 1.8, 0, 1));
      const open = G.by(cockGrip) !== null;
      cock.rotation.z += ((open ? Math.PI / 2 : 0) - cock.rotation.z) * 0.4;
      drop.visible = now - dripAt < 350;
      drop.position.set(X, TIP - (((now - dripAt) / 350) % 1) * 0.75, Z);
      drop.scale.setScalar(flow > 1 ? 1.8 : 1);
      let pouring = '';
      bottles.forEach((b, i) => {
        const p = G.by(bottleGrips[i]);
        const over = !!p && P.distAt(p.ndc.x, p.ndc.y, TOP) < 0.22;
        const tl = p ? tiltFor(p.roll, fillRoll[i], over) : 0;
        b.m.position.lerp(p ? P.onPlane(p.ndc.x, p.ndc.y, over ? TOP.y : 1.6, v3) : b.home, p ? 0.5 : 0.25);
        b.m.rotation.z += (tl * 1.9 - b.m.rotation.z) * 0.3;
        if (p) pouring = over ? (tl > 0.5 ? `Đang rót NaOH ${b.c.toString().replace('.', ',')} M vào buret (làm lại từ 0 mL với mẻ acid mới)` : 'Nghiêng chai (xoay cổ tay) để rót NaOH vào buret') : 'Đưa chai lên miệng buret rồi nghiêng chai';
      });
      if (pouring) return `${pouring}\nBuret đang chứa NaOH ${cb.toFixed(3).replace('.', ',')} M`;
      return `pH = ${pH.toFixed(2)} sau ${vol.toFixed(2)} mL NaOH ${cb.toFixed(3).replace('.', ',')} M · dung dịch ${pH > 8.2 ? 'đã chuyển hồng' : 'còn không màu'}\nBóp khóa buret để nhỏ; gần điểm tương đương hãy nhỏ từng giọt. Cầm chai NaOH khác rót vào buret để đổi nồng độ`;
    },
  };
};

// ------------------------------------------------------------------ NO2 ⇌ N2O4: đẩy pít-tông, rót nước nóng hoặc nước đá vào bể
const no2Lab: Lab = ({k, P, live}) => {
  const X0 = -3.4;
  const Y = 0.9;
  const MID = X0 + 1.8;
  const plain = [glass(k, xCyl(0.52, 0.52, 3.6), '#BFD8E8', 0.2, MID, Y, Z)];
  const gas = glass(k, xCyl(0.48, 0.48, 1), '#8B3A1E', 0.3, 0, Y, Z);
  const piston = solid(k.scene, xCyl(0.47, 0.47, 0.12), '#15171B', {y: Y, z: Z});
  const rod = solid(piston, xCyl(0.07, 0.07, 3.5), '#9AA3AE', {metal: 0.8, x: 1.8});
  const thumb = solid(piston, xCyl(0.4, 0.4, 0.06), '#F4F1EA', {x: 3.51});
  void rod;
  void thumb;
  const bath = glass(k, box(4, 0.42, 1.6), '#2F6FD0', 0.45, MID, 0.25, Z);
  const bathTag = k.label('Bể nước');
  const pTag = k.label('Pít-tông');
  const brown = cloud(k, 120, '#C2562A', 5);
  const white = cloud(k, 120, '#F4F1EA', 5);
  const p = rnd(360);
  const jugs = [
    {name: 'Nước đá', color: '#9FD8FF', rate: -25, home: V(-1.6, 0, 1.6)},
    {name: 'Nước sôi', color: '#E5562B', rate: 25, home: V(0.4, 0, 1.6)},
  ].map((j) => {
    const m = solid(k.scene, based(yCyl(0.45, 0.4, 0.7), 0.7), j.color, {x: j.home.x, z: j.home.z});
    k.label(`${j.name}: cầm lên, nghiêng vào bể`)(V(j.home.x, 1.15, j.home.z));
    const stream = solid(k.scene, based(yCyl(0.04, 0.04, 1), 1), j.color, {});
    return {...j, m, stream};
  });
  loadModel(CHEM)
    .then((lib) => {
      place(k.scene, lib, 'SyringeBarrel', [X0, Y, Z], plain);
      place(k.scene, lib, 'Tank', [MID, 0, Z]);
      const sk = dress(piston, partOf(lib, 'SyringePlunger'));
      if (sk) sk.obj.position.x = -0.06;
      jugs.forEach((j) => {
        const s = wear(j.m, lib, 'Beaker', 0.8);
        if (s) solid(s.obj, based(yCyl(0.5, 0.48, 0.6), 0.6), j.color, {y: 0.04}); // nước trong cốc
      });
    })
    .catch(() => undefined);

  const lenOf = () => 1.7 / live.v.P;
  const thumbAt = V();
  let off = 0;
  const plunger: Grip = {
    at: () => thumbAt.set(X0 + lenOf() + 3.57, Y, Z),
    down: (ptr) => (off = P.onPlane(ptr.ndc.x, ptr.ndc.y, Y, v3).x - lenOf()),
    hold: (ptr) => live.set('P', Math.round((1.7 / clamp(P.onPlane(ptr.ndc.x, ptr.ndc.y, Y, v3).x - off, 0.34, 3.4)) * 10) / 10),
  };
  const overTank = (ptr: Ptr) => {
    const a = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.6, v3);
    return Math.abs(a.x - MID) < 2.1 && Math.abs(a.z - Z) < 1.0;
  };
  const jugRoll = jugs.map(() => 0);
  const jugSpill = jugs.map(() => airSpill());
  const jugTilt = (i: number, ptr: Ptr) => tiltFor(ptr.roll, jugRoll[i], overTank(ptr));
  const jugGrips = jugs.map(
    (j, i): Grip => ({
      at: () => v3.copy(j.m.position).setY(j.m.position.y + 0.35),
      down: (ptr) => {
        jugRoll[i] = ptr.roll;
        jugSpill[i].rearm();
      },
      // nghiêng cốc càng nhiều thì rót càng nhanh; chưa nghiêng thì chưa đổ
      hold: (ptr, dt) => {
        const tl = jugTilt(i, ptr);
        if (j.rate > 0 && jugSpill[i].tick(tiltFor(ptr.roll, jugRoll[i], false), overTank(ptr), dt)) live.hazard?.(spillOf('hot'), V(P.onPlane(ptr.ndc.x, ptr.ndc.y, 1.7, v3).x, 0.06, v3.z)); // chỉ nước sôi mới gây bỏng
        if (overTank(ptr) && tl > 0.15) live.set('T', Math.round(clamp(live.v.T + j.rate * dt * tl, 0, 100) * 10) / 10);
      },
    }),
  );
  const G = grips(P, [plunger, ...jugGrips]);
  return {
    grab: G.grab,
    step(_now, dt) {
      G.step(dt);
      const q = no2(live.v.T, live.v.P);
      const len = lenOf();
      gas.scale.x = len;
      gas.position.x = X0 + len / 2;
      gas.material.opacity = 0.05 + 0.85 * q.x;
      piston.position.x = X0 + len + 0.06;
      bath.material.color.set('#2F6FD0').lerp(new THREE.Color('#D9481C'), live.v.T / 100);
      bathTag(V(MID, 0.1, Z + 1), undefined, `Bể nước ${live.v.T.toFixed(0)} °C`);
      pTag(V(X0 + len + 3.57, Y + 0.7, Z), undefined, `Pít-tông: ${live.v.P.toFixed(1)} atm · cầm kéo ra / đẩy vào`);
      const nb = Math.round(120 * q.x);
      for (let i = 0; i < 120; i++) {
        const a = p[i * 3 + 1] * 6.283;
        const r = Math.sqrt(p[i * 3 + 2]) * 0.4;
        (i < nb ? brown : white).pos.set([X0 + p[i * 3] * len, Y + Math.cos(a) * r, Z + Math.sin(a) * r], (i < nb ? i : i - nb) * 3);
      }
      brown.flush(nb);
      white.flush(120 - nb);
      let hint = '';
      jugs.forEach((j, i) => {
        const ptr = G.by(jugGrips[i]);
        const tl = ptr ? jugTilt(i, ptr) : 0;
        const pour = !!ptr && overTank(ptr) && tl > 0.15;
        j.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 1.7, v3) : j.home, ptr ? 0.5 : 0.25);
        j.m.rotation.z += (tl * 1.2 - j.m.rotation.z) * 0.3;
        j.stream.visible = pour;
        j.stream.position.set(j.m.position.x - 0.45, 0.45, j.m.position.z);
        j.stream.scale.y = Math.max(0.05, j.m.position.y - 0.1);
        if (ptr) hint = pour ? `Đang rót ${j.name.toLowerCase()}: bể ${live.v.T.toFixed(0)} °C` : overTank(ptr) ? `Nghiêng cốc ${j.name.toLowerCase()} (xoay cổ tay) để rót` : `Đưa cốc ${j.name.toLowerCase()} tới trên bể nước`;
      });
      if (G.by(plunger)) hint = `Đang ${live.v.P > 1 ? 'nén' : 'giãn'} khí: ${live.v.P.toFixed(1)} atm`;
      return `${hint || `NO₂ (nâu) ${(q.x * 100).toFixed(0)} % · N₂O₄ (không màu) ${(100 - q.x * 100).toFixed(0)} % số phân tử`}\nĐẩy pít-tông để nén; rót nước sôi hoặc nước đá vào bể để đổi nhiệt độ. Độ đậm của ống vẽ theo phần mol NO₂`;
    },
  };
};

// ------------------------------------------------------------------ clo khô và clo ẩm: mở khóa phễu, đổi bình rửa khí, thả vải vào bình
const chlorineLab: Lab = ({k, P, live}) => {
  const GEN = V(-2.9, 0, Z);
  const SLOT = V(-1.1, 0, Z);
  const JAR = V(1.2, 0, Z);
  const OUT = V(3.0, 0.9, 0.6); // móc treo vải ngoài bình
  const plain = [glass(k, yCyl(0.2, 0.5, 0.95), '#BFD8E8', 0.25, GEN.x, 0.48, Z), glass(k, yCyl(0.55, 0.55, 1.8, true), '#BFD8E8', 0.2, JAR.x, 0.9, Z)];
  solid(k.scene, yCyl(0.36, 0.44, 0.22), '#6B2A7A', {x: GEN.x, y: 0.14, z: Z});
  k.label('KMnO₄ + HCl đặc → Cl₂')(V(GEN.x, 2.35, Z));
  const cock = solid(k.scene, box(0.2, 0.07, 0.07), '#2459C9', {x: GEN.x - 0.05, y: 1.25, z: Z + 0.06});
  k.label('Khóa phễu: giữ để nhỏ HCl')(V(GEN.x - 1.0, 1.25, Z));
  k.scene.add(k.line('#C9CED6', 4, [GEN.x + 0.7, 1.42, Z, SLOT.x - 0.11, 1.42, Z, SLOT.x - 0.11, 0.2, Z]));
  k.scene.add(k.line('#C9CED6', 4, [SLOT.x + 0.11, 0.95, Z, SLOT.x + 0.11, 1.95, Z, JAR.x, 1.95, Z, JAR.x, 0.5, Z]));
  const gas = glass(k, yCyl(0.5, 0.5, 1.68), '#C8D94A', 0.3, JAR.x, 0.88, Z);
  const drops = cloud(k, 80, '#DFF3FF', 3);
  const p = rnd(240);
  for (let i = 0; i < 80; i++) {
    const a = p[i * 3] * 6.283;
    const r = Math.sqrt(p[i * 3 + 1]) * 0.45;
    drops.pos.set([JAR.x + Math.cos(a) * r, 0.15 + p[i * 3 + 2] * 1.5, Z + Math.sin(a) * r], i * 3);
  }
  const washers = [
    {humid: 0, name: 'H₂SO₄ đặc (làm khô khí)', color: '#B58A4A', home: V(-1.9, 0, 1.5)},
    {humid: 100, name: 'Nước (khí ẩm)', color: '#6FB7E8', home: V(-0.3, 0, 1.5)},
  ].map((w) => {
    const m = solid(k.scene, based(yCyl(0.38, 0.38, 0.9), 0.9), w.color, {x: w.home.x, z: w.home.z});
    return {...w, m, tag: k.label(w.name)};
  });
  const cloth = solid(k.scene, box(0.8, 1.0, 0.03), '#C2185B', {x: OUT.x, y: OUT.y, z: OUT.z});
  const clothTag = k.label('Vải màu');
  let clothSkin: Skin | null = null;
  loadModel(CHEM)
    .then((lib) => {
      place(k.scene, lib, 'Generator', [GEN.x, 0, Z], [plain[0]]);
      place(k.scene, lib, 'GasJar', [JAR.x, 0, Z], [plain[1]]);
      washers.forEach((w) => tint(wear(w.m, lib, 'WashBottle'), 'liquid', w.color));
      clothSkin = dress(cloth, partOf(lib, 'Cloth'));
      if (clothSkin) clothSkin.obj.rotation.x = Math.PI / 2; // mô hình nằm phẳng, treo dựng lên
    })
    .catch(() => undefined);

  let t = live.v.t;
  let inJar = t > 0;
  const fresh = new THREE.Color('#C2185B');
  const white = new THREE.Color('#F4F1EA');
  const cockGrip: Grip = {at: () => cock.position, hold: (_p, dt) => live.set('cl', Math.round(Math.min(100, live.v.cl + 15 * dt) * 10) / 10)};
  const washGrips = washers.map(
    (w): Grip => ({
      at: () => v3.copy(w.m.position).setY(w.m.position.y + 0.5),
      up: (ptr) => {
        if (ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, v3.copy(SLOT).setY(0.5)) < 0.25) live.set('humid', w.humid);
      },
    }),
  );
  const clothGrip: Grip = {
    at: () => cloth.position,
    up: (ptr) => {
      inJar = ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, v3.copy(JAR).setY(1.0)) < 0.3;
      t = 0; // lấy ra là thay mảnh vải mới; thả vào thì bấm giờ lại từ đầu
      live.set('t', 0);
    },
  };
  const G = grips(P, [cockGrip, clothGrip, ...washGrips]);
  return {
    grab: G.grab,
    step(_now, dt) {
      G.step(dt);
      // thanh trượt dự phòng ở bảng bên vừa đổi thời gian: theo nó
      if (Math.abs(live.v.t - t) > 0.25) {
        t = live.v.t;
        inJar = t > 0;
      }
      const holdingCloth = G.by(clothGrip);
      if (inJar && !holdingCloth && t < 30) {
        t = Math.min(30, t + dt);
        if (Math.abs(t - live.v.t) >= 0.1) live.set('t', Math.round(t * 10) / 10);
      }
      const {humid, cl} = live.v;
      const b = bleach(humid, cl, t);
      gas.material.opacity = 0.06 + 0.4 * (cl / 100);
      const col = fresh.clone().lerp(white, b);
      cloth.material.color.copy(col);
      tint(clothSkin, 'tint', `#${col.getHexString()}`);
      drops.flush(Math.round((humid / 100) * 80));
      cock.rotation.x += ((G.by(cockGrip) ? Math.PI / 2 : 0) - cock.rotation.x) * 0.4;
      const wet = humid >= 50;
      let hint = '';
      washers.forEach((w, i) => {
        const ptr = G.by(washGrips[i]);
        const on = w.humid >= 50 === wet;
        w.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 1.2, v3) : on ? SLOT : w.home, ptr ? 0.5 : 0.25);
        w.tag(v3.set(w.m.position.x, w.m.position.y + 1.45, w.m.position.z), undefined, w.name);
        if (ptr) hint = 'Đặt bình rửa khí vào giữa đường ống rồi buông tay';
      });
      cloth.position.lerp(holdingCloth ? P.onPlane(holdingCloth.ndc.x, holdingCloth.ndc.y, 1.9, v3) : inJar ? v3.set(JAR.x, 0.75, Z) : OUT, holdingCloth ? 0.5 : 0.25);
      clothTag(v3.set(cloth.position.x, cloth.position.y + 0.9, cloth.position.z), undefined, inJar ? `Vải trong bình ${t.toFixed(0)} s: mất ${(b * 100).toFixed(0)} % màu` : 'Vải màu: thả vào bình khí clo');
      if (holdingCloth) hint = 'Thả vải vào bình khí để bắt đầu tính giờ; thả ra ngoài là thay mảnh vải mới';
      if (G.by(cockGrip)) hint = `Đang nhỏ HCl đặc: khí clo trong bình ${cl.toFixed(0)} %`;
      return `${hint || (inJar ? `Vải mất ${(b * 100).toFixed(0)} % màu sau ${t.toFixed(0)} s trong khí clo ${cl.toFixed(0)} %` : 'Vải đang ở ngoài bình')}\n${wet ? 'Clo ẩm: Cl₂ + H₂O ⇌ HCl + HClO, HClO tẩy màu' : 'Clo khô (đã qua H₂SO₄ đặc): không có HClO nên không tẩy màu. Thử đổi bình rửa khí sang bình nước'}`;
    },
  };
};

// ------------------------------------------------------------------ kim loại kiềm: lấy thỏi kim loại, cắt một mẩu, thả vào chậu nước
const METALS = ['Li', 'Na', 'K', 'Rb', 'Cs'];
const MM = 0.05; // 1 mm trên thước của tấm cắt
const alkaliLab: Lab = ({k, P, live}) => {
  const C = V(1.3, 0, Z); // tâm chậu
  const TILE = V(-2.6, 0.06, -0.9);
  const LEFT = TILE.x - 0.5;
  const plain = [glass(k, yCyl(1.4, 1.4, 0.9, true), '#BFD8E8', 0.22, C.x, 0.45, Z)];
  const water = glass(k, yCyl(1.32, 1.32, 0.55), '#BFE3F5', 0.75, C.x, 0.36, Z);
  k.label('Chậu nước có phenolphtalein')(V(C.x, 0.1, Z + 1.75));
  solid(k.scene, box(1.5, 0.06, 0.8), '#F4F1EA', {rough: 0.3, x: TILE.x + 0.1, y: 0.03, z: TILE.z});
  for (let i = 0; i <= 20; i += 5) k.label(`${i}`, '#8B91B8', true)(V(LEFT + i * MM, 0.08, TILE.z + 0.5));
  k.label('Tấm cắt (mm): kéo dao để chọn cỡ mẩu')(V(TILE.x + 0.1, 0.08, TILE.z - 0.65));
  const piece = solid(k.scene, box(1, 0.14, 0.14).translate(0.5, 0, 0), '#D5D9DF', {metal: 0.9, rough: 0.25, x: LEFT, y: TILE.y + 0.07, z: TILE.z});
  const rest = solid(k.scene, box(1, 0.14, 0.14).translate(0.5, 0, 0), '#8E949C', {metal: 0.6, rough: 0.5, y: TILE.y + 0.07, z: TILE.z});
  const knife = solid(k.scene, box(0.02, 0.34, 0.5), '#C9CED6', {metal: 0.9, rough: 0.2});
  solid(knife, box(0.05, 0.1, 0.5), '#3A2A20', {y: 0.2});
  const barTag = k.label('Na');
  const jars = METALS.map((sym, i) => {
    const home = V(-3.8 + i * 0.7, 0, 1.5);
    const m = solid(k.scene, based(yCyl(0.24, 0.24, 0.9), 0.9), '#C9A24B', {x: home.x, z: home.z});
    k.label(`${sym} (ngâm dầu)`)(V(home.x, 1.25, home.z));
    return {sym, home, m};
  });
  const blob = solid(k.scene, new THREE.SphereGeometry(1, 20, 14), '#C9CED6', {metal: 0.9, rough: 0.25});
  const flame = glow(k, new THREE.ConeGeometry(0.16, 0.5, 16), '#FFC53D');
  const burst = cloud(k, 90, '#FFE3A3', 4);
  const dir = rnd(180);
  loadModel(CHEM)
    .then((lib) => {
      place(k.scene, lib, 'Trough', [C.x, 0, Z], plain);
      jars.forEach((j) => {
        const sk = wear(j.m, lib, 'Bottle', 1.6);
        tint(sk, 'liquid', '#C9A24B');
        labelBottle(sk, j.sym, 'ngâm dầu', '#E3B341');
      });
    })
    .catch(() => undefined);

  const DUR = 7; // s cho tới khi mẩu kim loại tan hết
  let react: {t: number} | null = null;
  let pink = 0;
  let metalWas = live.v.metal;
  let ang = 0;
  const cutX = () => LEFT + live.v.d * MM;
  const knifeGrip: Grip = {at: () => v3.set(cutX(), TILE.y + 0.3, TILE.z), hold: (ptr) => live.set('d', Math.round(clamp((P.onPlane(ptr.ndc.x, ptr.ndc.y, TILE.y + 0.2, v3).x - LEFT) / MM, 1, 20) * 2) / 2)};
  const pieceGrip: Grip = {
    at: () => v3.copy(piece.position).setX(piece.position.x + (live.v.d * MM) / 2),
    up: (ptr) => {
      const a = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.7, v3);
      if (ptr.active && Math.hypot(a.x - C.x, a.z - Z) < 1.35) {
        react = {t: 0};
        // mẩu quá to hoặc kim loại quá hoạt động: nổ thật, không chỉ chữ
        if (alkali(live.v.metal, live.v.d).level === 3) live.hazard?.('alkali-explosion', V(C.x, 0.7, Z));
      }
    },
  };
  const jarGrips = jars.map(
    (j, i): Grip => ({
      at: () => v3.copy(j.m.position).setY(j.m.position.y + 0.45),
      up: (ptr) => {
        if (ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, v3.copy(TILE).setX(TILE.x + 0.1)) < 0.25) live.set('metal', i + 1);
      },
    }),
  );
  const G = grips(P, [knifeGrip, pieceGrip, ...jarGrips]);
  return {
    grab: G.grab,
    step(now, dt) {
      G.step(dt);
      if (live.v.metal !== metalWas) {
        metalWas = live.v.metal;
        pink = 0; // kim loại khác: thay chậu nước mới
        react = null;
      }
      const a = alkali(live.v.metal, live.v.d);
      const len = live.v.d * MM;
      const carried = G.by(pieceGrip);
      piece.scale.x = len;
      piece.visible = !react;
      piece.position.lerp(carried ? P.onPlane(carried.ndc.x, carried.ndc.y, 1.3, v3).setX(v3.x - len / 2) : v3.set(LEFT, TILE.y + 0.07, TILE.z), carried ? 0.5 : 0.3);
      rest.position.x = cutX() + 0.02;
      rest.scale.x = Math.max(0.01, 1.1 - len);
      knife.position.set(cutX() + 0.01, TILE.y + 0.24, TILE.z);
      barTag(v3.set(TILE.x + 0.1, 0.75, TILE.z), undefined, `${a.m.sym}: mẩu ${live.v.d.toFixed(1)} mm`);
      let hint = carried ? 'Đưa mẩu kim loại tới trên chậu nước rồi buông tay' : G.by(knifeGrip) ? `Cắt mẩu ${live.v.d.toFixed(1)} mm` : '';
      jars.forEach((j, i) => {
        const ptr = G.by(jarGrips[i]);
        j.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 1.3, v3) : j.home, ptr ? 0.5 : 0.25);
        if (ptr) hint = `Đặt lọ ${j.sym} lên tấm cắt để lấy thỏi ${j.sym}`;
      });
      // ---- phản ứng trong chậu: chỉ chạy sau khi thả mẩu kim loại
      if (react) {
        react.t += dt;
        if (react.t > DUR) react = null;
      }
      const u = react ? react.t / DUR : 1;
      const r = (0.05 + live.v.d / 45) * (1 - u);
      if (react) pink += (clamp((a.pH - 8.2) / 3, 0, 1) - pink) * Math.min(1, dt * 1.2);
      water.material.color.set('#BFE3F5').lerp(new THREE.Color('#E84F9A'), pink);
      ang += dt * [0.3, 2.5, 4, 7][a.level];
      const x = C.x + Math.cos(ang) * 0.75;
      const z = Z + Math.sin(ang) * 0.75;
      blob.visible = !!react;
      blob.scale.setScalar(Math.max(0.001, r));
      blob.position.set(x, 0.66 + r * 0.4, z);
      flame.visible = !!react && a.level >= 2;
      flame.position.set(x, 0.95 + r, z);
      flame.material.color.set(a.m.flame);
      flame.scale.setScalar(1 + r * 3 + 0.2 * Math.sin(now / 60));
      const w = (now / 700) % 1;
      for (let i = 0; i < 90; i++) {
        const th = dir[i * 2] * 6.283;
        const sp = 0.6 + dir[i * 2 + 1] * 2;
        burst.pos.set([x + Math.cos(th) * sp * w, 0.7 + sp * w * 1.6 - 3 * w * w, z + Math.sin(th) * sp * w], i * 3);
      }
      burst.flush(react && a.level === 3 ? 90 : 0);
      if (hint) return `${hint}\nLấy lọ kim loại đặt lên tấm cắt, kéo dao chọn cỡ mẩu, rồi cầm mẩu thả vào chậu`;
      if (react) return `${a.m.sym} ${live.v.d.toFixed(1)} mm: ${a.level === 3 ? 'NỔ, ngoài đời đây là tai nạn bỏng kiềm' : a.level === 2 ? `H₂ bốc cháy, ngọn lửa mang màu của ${a.m.sym}` : a.level === 1 ? 'nóng chảy, vo tròn chạy trên mặt nước' : 'sủi bọt êm trên mặt nước'}\n2${a.m.sym} + 2H₂O → 2${a.m.sym}OH + H₂↑ · pH ≈ ${a.pH.toFixed(1)}`;
      return `${pink > 0.02 ? `Dung dịch sau phản ứng: phenolphtalein ${pink > 0.3 ? 'hồng rõ' : 'hồng nhạt'}` : 'Nước trong chậu còn không màu'}\nLấy lọ kim loại đặt lên tấm cắt, kéo dao chọn cỡ mẩu, rồi cầm mẩu thả vào chậu nước`;
    },
  };
};

// ------------------------------------------------------------------ BZ: rót thuốc thử vào cốc trên máy khuấy từ
const SIMS_PARTS = '/models/sims-parts.glb';
const bzLab: Lab = ({k, P, live}) => {
  const BX = -2.3;
  const CX = 1.2;
  const plain = [glass(k, yCyl(1, 1, 1.5, true), '#BFD8E8', 0.22, BX, 0.78, Z)];
  const liquid = solid(k.scene, based(yCyl(0.93, 0.93, 1.1), 1.1), '#C4261A', {x: BX, y: 0.04, z: Z});
  const bar = solid(k.scene, box(0.6, 0.07, 0.12), '#F4F1EA', {x: BX, y: 0.1, z: Z});
  k.label('Cốc BZ trên máy khuấy từ')(V(BX, 2.0, Z));
  // bốn lọ thuốc thử: hai lọ đổi f (tỉ lệ chất khử/chất oxi hóa), hai lọ đổi ε (tốc độ khâu tự xúc tác)
  const REAG = [
    {id: 'f' as const, dir: 1, name: 'Acid malonic', note: 'tăng f', liquid: '#F1E8C8', cap: '#C4261A', spill: 'acid' as const},
    {id: 'f' as const, dir: -1, name: 'NaBrO₃', note: 'giảm f', liquid: '#ECEEF2', cap: '#2459C9', spill: 'other' as const},
    {id: 'eps' as const, dir: -1, name: 'H₂SO₄ loãng', note: 'ε nhỏ', liquid: '#E3F1FF', cap: '#E3B341', spill: 'acid' as const},
    {id: 'eps' as const, dir: 1, name: 'Nước cất', note: 'ε lớn', liquid: '#BFE3F5', cap: '#2E9B57', spill: null},
  ].map((r, i) => {
    const home = V(-3.7 + i * 0.95, 0, 1.75);
    const m = solid(k.scene, based(yCyl(0.2, 0.2, 0.9), 0.9), '#BFD8E8', {x: home.x, z: home.z});
    const pill = k.label(`${r.name} → ${r.note}`); // nhãn nổi chỉ hiện khi chưa tải được mô hình có nhãn dán
    pill(V(home.x, i % 2 ? 2.15 : 1.4, home.z));
    const stream = solid(k.scene, based(yCyl(0.035, 0.035, 1), 1), r.liquid, {});
    stream.visible = false;
    return {...r, home, m, stream, pill};
  });
  const tag = k.label('f = 3,50', '#FBF9F4');
  loadModel(SIMS_PARTS)
    .then((lib) => place(k.scene, lib, 'Stirrer', [BX, 0, Z]))
    .catch(() => undefined);
  loadModel(CHEM)
    .then((lib) => {
      const b = place(k.scene, lib, 'Beaker', [BX, 0, Z], plain);
      b?.obj.scale.setScalar(1.8); // cốc 1,8× để vừa máy khuấy: bán kính 1, cao 1,5
      REAG.forEach((r) => {
        const sk = wear(r.m, lib, 'Bottle', 2.1); // lọ to hơn để đọc được nhãn dán từ góc nhìn xa
        tint(sk, 'liquid', r.liquid);
        tint(sk, 'cap', r.cap);
        if (sk) {
          labelBottle(sk, r.name, r.note, r.cap);
          r.pill(null);
        }
      });
    })
    .catch(() => undefined);

  // đồ thị biên độ chất xúc tác theo thời gian
  board(k, CX, Z, 4.4, 2.2);
  k.label('Chất xúc tác bị oxi hóa theo thời gian')(V(CX, 0.1, Z - 1.25));
  const plot = path(k, '#7FFFB0', 3, BZ_SAMPLES);
  const dot = glow(k, new THREE.SphereGeometry(0.08, 12, 8), '#FFFFFF');
  let key = '';
  let calcAt = -1e9;
  let r = oregonator(live.v.f, live.v.eps);
  let top = 1;
  const at = (i: number) => [CX - 2 + (i / (BZ_SAMPLES - 1)) * 4, 0.07, Z + 0.9 - (r.z[i] / top) * 1.7];

  // rót: giữ lọ trên miệng cốc; số đọc cộng dồn theo thời gian giữ (không theo vị trí tay nên tay run không làm giật)
  let fv = live.v.f;
  let ev = live.v.eps;
  let lastF = fv;
  let lastE = ev;
  const overBeaker = (p: Ptr) => {
    const a = P.onPlane(p.ndc.x, p.ndc.y, 1.2, v3);
    return Math.hypot(a.x - BX, a.z - Z) < 1.15;
  };
  const rolls = REAG.map(() => 0);
  const airs = REAG.map(() => airSpill());
  const grabs = REAG.map(
    (g, n): Grip => ({
      at: () => v3.copy(g.m.position).setY(g.m.position.y + 0.45),
      down: (p) => {
        rolls[n] = p.roll;
        airs[n].rearm();
      },
      // nghiêng lọ càng nhiều thì rót càng nhanh; chưa nghiêng thì chưa đổ
      hold: (p, dt) => {
        if (g.spill && airs[n].tick(tiltFor(p.roll, rolls[n], false), overBeaker(p), dt)) live.hazard?.(spillOf(g.spill), V(P.onPlane(p.ndc.x, p.ndc.y, 2.5, v3).x, 0.06, v3.z));
        if (!overBeaker(p)) return;
        const tl = tiltFor(p.roll, rolls[n], true);
        if (tl <= 0.15) return;
        dt *= tl;
        if (live.v.f !== lastF) fv = live.v.f; // đổi ở bảng bên thì đồng bộ lại
        if (live.v.eps !== lastE) ev = live.v.eps;
        if (g.id === 'f') {
          fv = clamp(fv + g.dir * 0.5 * dt, 0.2, 4);
          lastF = Math.round(fv * 100) / 100;
          live.set('f', lastF);
        } else {
          ev = clamp(ev * Math.exp(g.dir * 0.55 * dt), 0.02, 0.2);
          lastE = Math.round(ev * 1000) / 1000;
          live.set('eps', lastE);
        }
      },
    }),
  );
  const G = grips(P, grabs);
  const col = new THREE.Color();
  return {
    grab: G.grab,
    step(now, dt) {
      G.step(dt);
      const pouring = REAG.some((_, i) => G.by(grabs[i]) && overBeaker(G.by(grabs[i])!) && tiltFor(G.by(grabs[i])!.roll, rolls[i], true) > 0.15);
      const sig = `${live.v.f}|${live.v.eps}`;
      // mô phỏng mất vài mili giây: đang rót thì chỉ tính lại mỗi 0,12 s
      if (sig !== key && (!pouring || now - calcAt > 120)) {
        key = sig;
        calcAt = now;
        r = oregonator(live.v.f, live.v.eps);
        top = Math.max(0.2, ...r.z);
        setLine(plot, Array.from({length: BZ_SAMPLES}, (_, i) => at(i)).flat());
      }
      const i = Math.floor(((now / 15000) % 1) * BZ_SAMPLES);
      const [x, y, z] = at(i);
      dot.position.set(x, y + 0.03, z);
      col.set('#C4261A').lerp(new THREE.Color('#2459C9'), clamp(r.z[i] / top, 0, 1));
      (liquid.material as THREE.MeshStandardMaterial).color.copy(col);
      bar.rotation.y += dt * 9;
      let hint = '';
      REAG.forEach((g, n) => {
        const ptr = G.by(grabs[n]);
        const over = !!ptr && overBeaker(ptr);
        const tl = ptr ? tiltFor(ptr.roll, rolls[n], over) : 0;
        const pour = over && tl > 0.15;
        g.m.position.lerp(ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 2.5, v3) : g.home, ptr ? 0.5 : 0.25);
        g.m.rotation.z += (tl * 1.15 - g.m.rotation.z) * 0.3;
        g.stream.visible = pour;
        g.stream.scale.x = g.stream.scale.z = 0.5 + tl;
        g.stream.position.set(g.m.position.x - 0.4, 1.15, g.m.position.z);
        g.stream.scale.y = Math.max(0.05, g.m.position.y - 1.15);
        if (ptr) hint = pour ? `Đang rót ${g.name}: ${g.id === 'f' ? `f = ${live.v.f.toFixed(2)}` : `ε = ${live.v.eps.toFixed(3)}`}` : over ? `Nghiêng lọ ${g.name} (xoay cổ tay) để rót` : `Đưa lọ ${g.name} tới trên miệng cốc rồi nghiêng`;
      });
      tag(V(BX, 1.7, Z + 1.25), undefined, `f = ${live.v.f.toFixed(2).replace('.', ',')} · ε = ${live.v.eps.toFixed(3).replace('.', ',')}`);
      return `${hint || (r.period > 0 ? `Dao động, chu kì ≈ ${r.period.toFixed(1)}` : 'Không dao động: cốc đứng ở một màu')}\nĐỏ = ferroin khử, xanh = ferriin oxi hóa. Rót acid malonic / bromat để đổi f, H₂SO₄ / nước để đổi ε; đồ thị chạy lại mỗi 15 giây`;
    },
  };
};

export const CHEM_LABS: Record<string, Lab> = {titration: titrationLab, no2: no2Lab, chlorine: chlorineLab, alkali: alkaliLab, bz: bzLab};
