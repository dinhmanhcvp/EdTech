import * as THREE from 'three';
import {f1, f2, seeded} from '../../utils/presets/sceneKit';
import {CELLS, anodeLitres, molElectrons, productMass} from '../../utils/presets/hoaScene2';
import {G} from '../../utils/presets/lyScene1';
import {chainPopulation, effectiveK} from '../../utils/presets/lyScene2';
import {DEPTH_UNIT, WATER_TOP, WIRE_BLACK, WIRE_RED, gaugeDeg, gaugeKPa, leverAngleDeg, neutronCount, polyAt, submerged} from '../../utils/presets/scene3dExtra';
import {glassify, loadModel, partOf, type Skin} from './labParts';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, group, swarm} from './Scenes3DMore';
import {clamp, grip} from './dragKit';

/**
 * Bốn cảnh dùng mô hình Blender thật (`tools/lab-models/board_parts.py` → `public/models/board-parts.glb`): đòn bẩy, bể chất lỏng + áp kế,
 * bình điện phân, lò phản ứng. Cảnh dựng nhóm rỗng ngay (update chạy được từ khung hình đầu), khi tệp về thì gắn mô hình vào.
 */
const LIB = '/models/board-parts.glb';
const rad = (d: number) => (d * Math.PI) / 180;
const empty = (): Skin => ({obj: new THREE.Group(), mats: []});
const named = (sk: Skin, name: string) => sk.mats.filter((m) => m.name === name);
const tint = (sk: Skin, name: string, color: string, extra: Partial<THREE.MeshStandardMaterial> = {}) => named(sk, name).forEach((m) => Object.assign(m, extra).color.set(color));
/** Tải thư viện rồi gọi `fn`; hỏng thì báo trên chú thích (người dùng vẫn đổi sang bản 2D được). */
function withLib(k: Kit, fn: (get: (name: string) => Skin) => void): void {
  loadModel(LIB)
    .then((lib) => fn((n) => partOf(lib, n) ?? empty()))
    .catch(() => k.caption('Không tải được mô hình 3D — chuyển sang bản 2D'));
}

// ------------------------------------------------------------------ đòn bẩy
const leverScene: SceneDef = {
  floor: true,
  dist: 13,
  target: [0, 2.1, 0],
  orbit: () => [8, 8],
  setup: (k) => {
    const barG = group(k);
    barG.position.y = 2.6;
    const hang = [group(k), group(k)];
    hang.forEach((h) => barG.add(h));
    let paints: Skin[] = [];
    withLib(k, (get) => {
      const bar = get('LeverBar');
      const frame = get('LeverFrame');
      k.scene.add(frame.obj);
      barG.add(bar.obj);
      paints = [get('Weight'), get('Weight')];
      paints.forEach((w, i) => {
        hang[i].add(w.obj);
        tint(w, 'paint', i ? '#D9481C' : '#2459C9');
      });
    });
    hang.forEach((h, i) => {
      const g = grip();
      g.position.set(0, -1.05, 0);
      h.add(g);
      // kéo quả cân dọc thanh: khoảng cách tới điểm tựa là d₁ (trái) hoặc d₂ (phải)
      k.drag(h, {onMove: (pt) => k.set(i ? 'd2' : 'd1', clamp(i ? barG.worldToLocal(pt.clone()).x : -barG.worldToLocal(pt.clone()).x, 0.5, 4))});
    });
    const tags = [k.label('', '#2459C9'), k.label('', '#D9481C')];
    const dTag = [k.label('', undefined, true), k.label('', undefined, true)];
    const grav = [k.arrow('#C4261A', 0.035), k.arrow('#C4261A', 0.035)];
    k.scene.add(grav[0].obj, grav[1].obj);
    let cur = 0;
    const w = new THREE.Vector3();
    return ({p}) => {
      const target = leverAngleDeg(p.m1, p.d1, p.m2, p.d2);
      cur += (target - cur) * 0.12;
      barG.rotation.z = rad(cur);
      const items = [{m: p.m1, d: -p.d1}, {m: p.m2, d: p.d2}];
      items.forEach(({m, d}, i) => {
        const s = 0.65 + 0.55 * Math.cbrt(m / 10);
        const h = hang[i];
        h.visible = m > 0;
        h.position.set(d, 0, 0);
        h.rotation.z = -rad(cur); // quả cân luôn treo thẳng đứng
        h.scale.setScalar(s);
        tags[i](m > 0 ? V(d, -1.55 * s, 0) : null, barG, `m${i ? '₂' : '₁'} = ${f1(m)} kg`);
        dTag[i](V(d / 2, 0.32, 0), barG, `d${i ? '₂' : '₁'} = ${f1(Math.abs(d))} m`);
        if (m > 0) {
          w.set(0, -0.95 * s, 0);
          h.localToWorld(w);
          grav[i].set(w, w.clone().add(V(0, -(0.25 + 0.09 * m), 0)));
        } else grav[i].set(V(), V());
      });
      const M1 = p.m1 * G * p.d1;
      const M2 = p.m2 * G * p.d2;
      const diff = M1 - M2;
      k.caption(`M₁ = ${f1(M1)} N·m · M₂ = ${f1(M2)} N·m\n${Math.abs(diff) < 0.05 ? 'CÂN BẰNG' : diff > 0 ? 'bên trái nặng hơn: thanh quay ngược chiều kim đồng hồ' : 'bên phải nặng hơn: thanh quay cùng chiều kim đồng hồ'}`);
    };
  },
};

// ------------------------------------------------------------------ bể chất lỏng và áp kế
const liquidColor = (rho: number) => (rho < 900 ? '#E6BE5A' : rho < 1800 ? '#4C9BE8' : rho < 5000 ? '#8EB0C9' : '#B9BFC8');
const tankScene: SceneDef = {
  floor: true,
  dist: 16,
  target: [0.3, 2.6, 0],
  orbit: () => [14, 12],
  setup: (k) => {
    const cube = group(k);
    const probe = group(k);
    const pg = grip();
    pg.position.set(0.2, 0, 0);
    probe.add(pg);
    k.drag(probe, {onMove: (pt) => k.set('h', (WATER_TOP - pt.y) / DEPTH_UNIT)}); // kéo đầu dò lên xuống để đổi độ sâu
    const needle = group(k);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 12), new THREE.MeshStandardMaterial({color: '#8A857A', metalness: 0.8, roughness: 0.3}));
    k.scene.add(pipe);
    let water: Skin = empty();
    let cubeSk: Skin = empty();
    withLib(k, (get) => {
      const glass = get('TankGlass');
      glassify(glass.obj, 0.14);
      k.scene.add(glass.obj, get('TankFrame').obj);
      water = get('TankWater');
      water.mats.forEach((m) => Object.assign(m, {transparent: true, opacity: 0.42, depthWrite: false}));
      k.scene.add(water.obj);
      cubeSk = get('FloatCube');
      cube.add(cubeSk.obj);
      probe.add(get('PressureProbe').obj);
      const gauge = get('GaugeBody');
      gauge.obj.position.set(1.85, 4.55, 0);
      needle.add(get('GaugeNeedle').obj);
      needle.position.set(1.85, 4.55, 0);
      k.scene.add(gauge.obj);
    });
    const line = k.line('#D9481C', 2.2, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(line);
    const up = k.arrow('#2E9E6B', 0.05);
    const down = k.arrow('#C4261A', 0.05);
    k.scene.add(up.obj, down.obj);
    const tCube = k.label('', '#D9481C');
    const tProbe = k.label('', '#D9481C');
    const tGauge = k.label('', '#2459C9');
    let bob = 0;
    return ({p, t}) => {
      const sub = submerged(p.rho, p.rhoO);
      const floats = p.rhoO < p.rho;
      bob = floats ? Math.sin(t * 2.2) * 0.03 * (1 - sub * 0.3) : 0;
      const cy = (floats ? WATER_TOP - sub + 0.5 : 0.6) + bob;
      cube.position.set(-0.9, cy, 0);
      tint(cubeSk, 'paint', floats ? '#2459C9' : '#6B4BC8');
      tint(water, 'water', liquidColor(p.rho));
      const py = WATER_TOP - p.h * DEPTH_UNIT;
      probe.position.set(1.4, py, 0);
      pipe.position.set(1.82, (py + 3.5) / 2, 0);
      pipe.scale.y = 3.5 - py;
      const kpa = gaugeKPa(p.rho, p.h);
      needle.rotation.z = -rad(gaugeDeg(kpa));
      line.visible = p.h > 0;
      setLine(line, [1.4, WATER_TOP, 0.4, 1.4, py, 0.4]);
      // lực đẩy Archimedes (xanh, đi lên) và trọng lực (đỏ, đi xuống) lên khối, độ dài theo khối lượng riêng
      const Fw = p.rhoO;
      const Fb = p.rho * sub;
      const len = (F: number) => 0.3 + (1.3 * Math.min(F, 14000)) / 14000;
      up.set(V(-0.9, cy - 0.5, 0.6), V(-0.9, cy - 0.5 + len(Fb), 0.6));
      down.set(V(-0.9, cy, 0.6), V(-0.9, cy - len(Fw), 0.6));
      tCube(V(-0.9, cy + 0.85, 0), undefined, floats ? `nổi, ngập ${f1(sub * 100)} %` : p.rhoO === p.rho ? 'lơ lửng' : 'chìm');
      tProbe(V(1.4, py - 0.3, 0), undefined, `h = ${f1(p.h)} m`);
      tGauge(V(1.85, 5.5, 0), undefined, `${f1(kpa)} kPa`);
      k.caption(`p = p₀ + ρgh = ${f1(kpa)} kPa
xanh: Fₐ (lực đẩy Archimedes) · đỏ: P (trọng lực)`);
    };
  },
};

// ------------------------------------------------------------------ bình điện phân
const LIQ: Record<string, [string, number]> = {nacl: ['#CFE7F5', 0.3], cuso4: ['#3B7DD8', 0.5], al2o3: ['#F2A33C', 0.75]};
const cellScene: SceneDef = {
  floor: true,
  dist: 9,
  target: [1.4, 1.6, 0],
  orbit: () => [10, 12],
  setup: (k) => {
    const cathode = group(k);
    const anode = group(k);
    cathode.position.set(-0.62, 0.35, 0);
    anode.position.set(0.62, 0.35, 0);
    const depG = group(k);
    depG.position.set(-0.62, 0.45, 0);
    let dep: Skin = empty();
    withLib(k, (get) => {
      const beaker = get('CellBeaker');
      glassify(beaker.obj, 0.16);
      k.scene.add(beaker.obj, get('CellStatic').obj);
      cathode.add(get('Electrode').obj);
      anode.add(get('Electrode').obj);
      dep = get('Deposit');
      depG.add(dep.obj);
    });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.6, 48), new THREE.MeshStandardMaterial({color: '#3B7DD8', transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.1}));
    liquid.position.y = 0.9;
    k.scene.add(liquid);
    const NB = 28;
    const bubA = swarm(NB, 0.06, '#FFFFFF', {transparent: true, opacity: 0.7, roughness: 0.05});
    const bubC = swarm(NB, 0.06, '#FFFFFF', {transparent: true, opacity: 0.7, roughness: 0.05});
    const NI = 18;
    const cat = swarm(NI, 0.07, '#2459C9', {emissive: '#2459C9', emissiveIntensity: 0.6});
    const ani = swarm(NI, 0.09, '#C4261A', {emissive: '#C4261A', emissiveIntensity: 0.6});
    const NE = 12;
    const el = swarm(NE * 2, 0.06, '#7FE3FF', {emissive: '#7FE3FF', emissiveIntensity: 1.2});
    k.scene.add(bubA, bubC, cat, ani, el);
    const rng = seeded(11);
    const seed = Array.from({length: 40}, () => [rng(), rng(), rng()]);
    const tC = k.label('', '#2459C9');
    const tA = k.label('', '#C4261A');
    return ({p, t, s}) => {
      const cell = CELLS[s.cell];
      const [col, op] = LIQ[s.cell] ?? LIQ.cuso4;
      const lm = liquid.material as THREE.MeshStandardMaterial;
      lm.color.set(col);
      lm.opacity = op;
      lm.emissive.set(s.cell === 'al2o3' ? '#F2792C' : '#000000');
      lm.emissiveIntensity = s.cell === 'al2o3' ? 0.5 : 0;
      const m = productMass(cell, p.I, p.tm);
      const d = Math.min(40, Math.log10(m * 100 + 1) * 14) / 40;
      depG.visible = s.cell !== 'nacl';
      depG.scale.set(1, 0.12 + 0.88 * d * 1.8, 1);
      tint(dep, 'copper', s.cell === 'cuso4' ? '#B87333' : '#D4D4D8');
      // bọt khí: anot luôn có khí; catot chỉ có khi sinh khí (NaCl: H₂)
      const speed = 0.35 + p.I * 0.06;
      const nb = Math.round(6 + p.I * 2);
      const bub = (sw: ReturnType<typeof swarm>, x0: number, on: boolean) => {
        let n = 0;
        if (on) for (let i = 0; i < Math.min(nb, NB); i++) {
          const f = (t * speed + seed[i][0]) % 1;
          sw.at(n++, x0 + (seed[i][1] - 0.5) * 0.3 + Math.sin(t * 3 + i) * 0.04, 0.4 + f * 1.6, (seed[i][2] - 0.5) * 0.3, 0.5 + f * 0.6);
        }
        sw.flush(n);
      };
      bub(bubC, -0.62, s.cell === 'nacl');
      bub(bubA, 0.62, true);
      // ion: cation (xanh) trôi về catot, anion (đỏ) về anot
      for (let i = 0; i < NI; i++) {
        const f = (t * 0.12 * (0.5 + p.I * 0.1) + seed[i][0]) % 1;
        const y = 0.5 + seed[i][1] * 1.4;
        const z = (seed[i][2] - 0.5) * 1.6;
        cat.at(i, 1.1 - 1.55 * f * 1.0, y, z * (1 - f * 0.6));
        ani.at(i, -1.1 + 1.55 * f, y + 0.0, z * (1 - f * 0.6));
      }
      cat.flush(NI);
      ani.flush(NI);
      // electron chạy trong dây: từ cực âm nguồn tới catot (dây đen), từ anot về cực dương (dây đỏ)
      const ef = (t * 0.07 * (0.5 + p.I * 0.18)) % 1;
      for (let i = 0; i < NE; i++) {
        el.at(i, ...polyAt([...WIRE_BLACK].reverse(), ef + i / NE));
        el.at(NE + i, ...polyAt(WIRE_RED, ef + i / NE));
      }
      el.flush(NE * 2);
      tC(V(-0.62, 2.95, 0), undefined, 'catot (−)');
      tA(V(0.62, 2.95, 0), undefined, 'anot (+)');
      k.caption(`catot: ${cell.cathode}
anot: ${cell.anode} · ${f2(m)} g ${cell.cName}`);
    };
  },
};

// ------------------------------------------------------------------ lò phản ứng
const FX = [-1.6, -0.8, 0, 0.8, 1.6];
const FZ = [-0.8, 0, 0.8];
const RX = [-1.2, -0.4, 0.4, 1.2];
const reactorScene: SceneDef = {
  floor: true,
  dist: 23,
  target: [0, 4.2, 0],
  orbit: () => [18, 10],
  setup: (k) => {
    const fuelG = group(k);
    const rodG = RX.map((x) => {
      const g = group(k);
      g.position.set(x, 3.95, 0);
      const gr = grip();
      gr.position.set(0, 1.4, 0);
      g.add(gr);
      k.drag(g, {onMove: (pt) => k.set('rod', clamp(((3.95 - (pt.y - 1.4)) / 2.9) * 100, 0, 100))}); // kéo thanh điều khiển lên xuống
      return g;
    });
    const fuel: Skin = empty();
    withLib(k, (get) => {
      const vessel = get('ReactorVessel');
      glassify(vessel.obj, 0.12);
      k.scene.add(vessel.obj, get('ReactorBase').obj);
      FX.forEach((x) => FZ.forEach((z) => {
        const f = get('FuelRod');
        f.obj.position.set(x, 1.0, z);
        fuelG.add(f.obj);
        fuel.mats.push(...f.mats);
      }));
      rodG.forEach((g) => g.add(get('ControlRod').obj));
    });
    const coolant = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.5, 40), new THREE.MeshStandardMaterial({color: '#4C9BE8', transparent: true, opacity: 0.1, depthWrite: false}));
    coolant.position.y = 2.55;
    k.scene.add(coolant);
    const NN = 80;
    const n = swarm(NN, 0.07, '#BFF3FF', {emissive: '#7FE3FF', emissiveIntensity: 1.6});
    k.scene.add(n);
    const rng = seeded(5);
    const seed = Array.from({length: NN}, () => {
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      return {x: FX[Math.floor(rng() * 5)] + 0.0, z: FZ[Math.floor(rng() * 3)], y: 1.3 + rng() * 2.2, d: V(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.5, Math.sin(ph) * Math.sin(th)).normalize(), o: rng()};
    });
    const tF = k.label('thanh nhiên liệu', '#B8641E');
    const tR = k.label('thanh điều khiển', '#1B1C22');
    const tK = k.label('', '#D9481C');
    return ({p, t}) => {
      const kEff = effectiveK(p.k0, p.rod);
      const g = Math.round(p.g);
      const pop = chainPopulation(kEff, g);
      const y = 3.95 - (p.rod / 100) * 2.9;
      rodG.forEach((r) => (r.position.y = y));
      const glow = Math.max(0.05, Math.min(1.6, 0.25 + 0.4 * Math.log10(1 + pop) * (kEff >= 1 ? 1 : 0.5)));
      fuel.mats.forEach((m) => {
        if (m.name !== 'fuel') return;
        m.emissive.set('#FF7A1A');
        m.emissiveIntensity = glow;
      });
      const cnt = neutronCount(pop);
      for (let i = 0; i < cnt; i++) {
        const q = seed[i];
        const f = (t * 0.55 + q.o) % 1;
        n.at(i, q.x + q.d.x * f * 1.6, q.y + q.d.y * f * 1.6, q.z + q.d.z * f * 1.6, 1 - f * 0.4);
      }
      n.flush(cnt);
      tF(V(1.6, 4.0, 0.8));
      tR(V(RX[3], 8.9, 0), undefined, `thanh điều khiển cắm ${Math.round(p.rod)} %`);
      tK(V(0, 4.9, 0), undefined, `k = ${f2(kEff)}`);
      k.caption(`k = ${f2(kEff)} → ${kEff > 1.001 ? 'trên tới hạn: phân hạch tăng theo cấp số nhân' : kEff < 0.999 ? 'dưới tới hạn: phản ứng tắt dần' : 'tới hạn: lò hoạt động ổn định'}\nSố phân hạch ở thế hệ ${g}: ${f1(pop)} (xuất phát 1) · nhiên liệu sáng theo công suất`);
    };
  },
};

export const BLENDER_SCENES: Record<string, SceneDef> = {
  PHYS_MOMENT_LEVER: leverScene,
  PHYS_FLUID_PRESSURE: tankScene,
  CHEM_ELECTROLYSIS: cellScene,
  PHYS_FISSION_REACTOR: reactorScene,
};
