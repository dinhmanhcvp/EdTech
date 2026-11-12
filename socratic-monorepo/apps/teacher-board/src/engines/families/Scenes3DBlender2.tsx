import * as THREE from 'three';
import {f1, f2} from '../../utils/presets/sceneKit';
import {G, atwood, cartAccel, collide, shmV, shmX, slideAccel, springEq} from '../../utils/presets/lyScene1';
import {circuit} from '../../utils/presets/lyScene2';
import {CIRC_PATHS, kinematicsX, niceMax, rampLayout} from '../../utils/presets/scene3dPhys';
import {polyAt} from '../../utils/presets/scene3dExtra';
import {glassify, loadModel, partOf, type Skin} from './labParts';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, group, swarm} from './Scenes3DMore';
import {clamp, grip} from './dragKit';

/** Sáu bộ thiết bị Vật lí dựng bằng Blender (`tools/lab-models/board_parts2.py` → `board-parts2.glb`): đệm khí + xe, lò xo, dốc, Atwood, ống chân không, bảng mạch. */
const LIB = '/models/board-parts2.glb';
const rad = (d: number) => (d * Math.PI) / 180;
const empty = (): Skin => ({obj: new THREE.Group(), mats: []});
const tint = (sk: Skin, color: string) => sk.mats.filter((m) => m.name === 'paint').forEach((m) => m.color.set(color));
function withLib(k: Kit, fn: (get: (name: string) => Skin) => void): void {
  loadModel(LIB)
    .then((lib) => fn((n) => partOf(lib, n) ?? empty()))
    .catch(() => k.caption('Không tải được mô hình 3D — chuyển sang bản 2D'));
}
const TRACK_Y = 0.34;

/** Đệm khí và `n` xe: trả các nhóm xe để cảnh đặt vị trí; mỗi xe là nhóm con có tỉ lệ đều. */
function trackRig(k: Kit, n: number, colors: string[]) {
  const track = group(k);
  track.position.y = TRACK_Y;
  const carts = Array.from({length: n}, () => group(k));
  carts.forEach((c) => (c.position.y = TRACK_Y));
  withLib(k, (get) => {
    track.add(get('Track').obj);
    carts.forEach((c, i) => {
      const sk = get('Cart');
      tint(sk, colors[i]);
      c.add(sk.obj);
    });
  });
  return {track, carts};
}
const trackCam = {floor: true, dist: 15, target: [0, 0.9, 0] as [number, number, number], orbit: () => [8, 16] as [number, number]};

// ------------------------------------------------------------------ động học (đệm khí) và rơi tự do (ống chân không)
const kinematicsScene: SceneDef = {
  ...trackCam,
  setup: (k) => {
    const {track, carts} = trackRig(k, 1, ['#2459C9']);
    const tube = group(k);
    withLib(k, (get) => {
      const v = get('VacuumTube');
      glassify(v.obj, 0.12);
      tube.add(v.obj, get('VacuumCaps').obj);
    });
    const heavy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 18), new THREE.MeshStandardMaterial({color: '#2459C9', metalness: 0.6, roughness: 0.25}));
    const feather = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 12), new THREE.MeshStandardMaterial({color: '#D9481C', roughness: 0.6}));
    feather.scale.set(1, 1.8, 0.4);
    k.scene.add(heavy, feather);
    const arrow = k.arrow('#D9481C', 0.04);
    k.scene.add(arrow.obj);
    const tag = k.label('', '#2459C9');
    return ({p, t, s}) => {
      const fall = s.m === 'fall';
      track.visible = !fall;
      carts[0].visible = !fall;
      tube.visible = fall;
      heavy.visible = feather.visible = fall;
      const {x, v, X, tEnd} = kinematicsX(s.m, p.v0, p.a, p.h, t);
      if (fall) {
        const y = 6.2 - clamp(x / p.h, 0, 1) * 5.7;
        heavy.position.set(-0.22, y, 0);
        feather.position.set(0.24, y, 0);
        arrow.set(V(0.8, y, 0), V(0.8, y - clamp(v * 0.06, 0, 2), 0));
        tag(V(0, y + 0.55, 0), undefined, `đã rơi ${f2(x)} m`);
        k.caption(`Rơi tự do trong chân không: v = ${f2(v)} m/s\nVật nặng và lông vũ rơi nhanh như nhau (h = ${f1(p.h)} m, t = ${f2(Math.min(t, tEnd))} s)`);
      } else {
        carts[0].position.x = X;
        arrow.set(V(X, 1.2, 0), V(X + clamp(v * 0.12, -2.2, 2.2), 1.2, 0));
        tag(V(X, 1.7, 0), undefined, `x = ${f2(x)} m`);
        k.caption(`v = ${f2(v)} m/s · x = ${f2(x)} m\nVạch trên thước chỉ để so vị trí; mũi tên đỏ là vận tốc`);
      }
    };
  },
};

// ------------------------------------------------------------------ Newton: xe kéo và máy Atwood
const newtonScene: SceneDef = {
  ...trackCam,
  setup: (k) => {
    const {track, carts} = trackRig(k, 1, ['#2459C9']);
    const stand = group(k);
    const pulley = group(k);
    pulley.position.set(0, 6.2, 0.35);
    const masses = [group(k), group(k)];
    withLib(k, (get) => {
      stand.add(get('AtwoodStand').obj);
      pulley.add(get('Pulley').obj);
      masses.forEach((m, i) => {
        const sk = get('Mass');
        tint(sk, i ? '#D9481C' : '#2459C9');
        m.add(sk.obj);
      });
    });
    const ropes = k.line('#3A3730', 2, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(ropes);
    const pull = k.arrow('#2E9E6B', 0.045);
    const fric = k.arrow('#C4261A', 0.045);
    k.scene.add(pull.obj, fric.obj);
    // tay nắm ở đầu mũi tên: kéo mũi tên xanh để đổi lực kéo F, kéo mũi tên đỏ để đổi hệ số ma sát μ
    const gF = grip('#2E9E6B');
    const gM = grip('#C4261A');
    k.scene.add(gF, gM);
    const cur = {front: 0, back: 0, m: 5};
    k.drag(gF, {onMove: (pt) => k.set('F', (pt.x - cur.front) / 0.05)});
    k.drag(gM, {onMove: (pt) => k.set('mu', (cur.back - pt.x) / 0.05 / (cur.m * G))});
    const tags = [k.label('', '#2459C9'), k.label('', '#D9481C')];
    return ({p, t, s}) => {
      const isCart = s.mode === 'cart';
      track.visible = carts[0].visible = isCart;
      stand.visible = pulley.visible = masses[0].visible = masses[1].visible = ropes.visible = !isCart;
      pull.obj.visible = fric.obj.visible = gF.visible = gM.visible = isCart;
      if (isCart) {
        const a = cartAccel(p.F, p.m, p.mu);
        const x = 0.5 * a * t * t;
        const xmax = Math.max(0.5 * a * 16, 0.1);
        const X = -5 + 9 * Math.min(1, x / xmax);
        const sc = 0.7 + 0.04 * p.m;
        carts[0].position.x = X;
        carts[0].scale.setScalar(sc);
        const front = X + 0.62 * sc;
        pull.set(V(front, TRACK_Y + 0.3 * sc, 0), V(front + Math.min(2.4, p.F * 0.05), TRACK_Y + 0.3 * sc, 0));
        const fm = p.mu * p.m * G;
        fric.set(V(X - 0.5 * sc, TRACK_Y + 0.06, 0.5), V(X - 0.5 * sc - Math.min(2.4, fm * 0.05), TRACK_Y + 0.06, 0.5));
        Object.assign(cur, {front, back: X - 0.5 * sc, m: p.m});
        gF.position.set(front + Math.min(2.4, p.F * 0.05), TRACK_Y + 0.3 * sc, 0);
        gM.position.set(X - 0.5 * sc - Math.min(2.4, fm * 0.05), TRACK_Y + 0.06, 0.5);
        tags[0](V(X, TRACK_Y + 1.1 * sc, 0), undefined, `${f1(p.m)} kg`);
        tags[1](null);
        k.caption(`a = ${f2(a)} m/s² · v = ${f2(a * t)} m/s · x = ${f2(x)} m\nMũi tên xanh: lực kéo F · đỏ: ma sát μmg`);
      } else {
        const {a, T} = atwood(p.m, p.m2);
        const dy = clamp(0.5 * a * t * t * 0.4, -1.6, 1.6);
        const ys = [3.9 - dy, 3.9 + dy];
        const ms = [p.m, p.m2];
        masses.forEach((m, i) => {
          const sc = 0.55 + 0.4 * Math.cbrt(ms[i] / 10) * 1.6;
          m.position.set(i ? 0.55 : -0.55, ys[i], 0.35);
          m.scale.setScalar(sc);
          tags[i](V(i ? 0.55 : -0.55, ys[i] - 0.62 * sc - 0.45, 0.35), undefined, `m${i ? '₂' : '₁'} = ${f1(ms[i])} kg`);
        });
        pulley.rotation.z = dy / 0.55;
        setLine(ropes, [-0.55, 6.2, 0.35, -0.55, ys[0], 0.35, 0.55, 6.2, 0.35, 0.55, ys[1], 0.35]);
        k.caption(`a = ${f2(a)} m/s² · T = ${f2(T)} N\nVật nặng hơn đi xuống, ròng rọc quay theo`);
      }
    };
  },
};

// ------------------------------------------------------------------ va chạm một chiều
const collisionScene: SceneDef = {
  ...trackCam,
  setup: (k) => {
    const {carts} = trackRig(k, 2, ['#2459C9', '#D9481C']);
    const ar = [k.arrow('#2459C9', 0.04), k.arrow('#D9481C', 0.04)];
    k.scene.add(ar[0].obj, ar[1].obj);
    // kéo đầu mũi tên vận tốc (trước va chạm) để đổi v₁, v₂
    const gv = [grip('#2459C9'), grip('#D9481C')];
    k.scene.add(...gv);
    const cx0 = [0, 0];
    gv.forEach((g, i) => k.drag(g, {onMove: (pt) => k.set(i ? 'v2' : 'v1', (pt.x - cx0[i]) / 0.25)}));
    const tags = [k.label('', '#2459C9'), k.label('', '#D9481C')];
    return ({p, t}) => {
      const gap = 300;
      const approach = p.v1 - p.v2;
      const [u1, u2] = collide(p.m1, p.v1, p.m2, p.v2, p.e);
      const s = 40;
      const tcol = approach > 0 ? Math.min(3, gap / (approach * s)) : Infinity;
      const pos = (x0: number, v: number, u: number) => (t < tcol ? x0 + v * s * t : x0 + v * s * tcol + u * s * (t - tcol));
      const w = [28 + p.m1 * 4, 28 + p.m2 * 4].map((v) => v / 40);
      const a = clamp(pos(90, p.v1, u1), 40, 480);
      const b = clamp(pos(90 + gap, p.v2, u2), 40, 480);
      const cx = [(a - 260) / 40 - w[0] / 2, (b - 260) / 40 + w[1] / 2];
      const vv = t < tcol ? [p.v1, p.v2] : [u1, u2];
      carts.forEach((c, i) => {
        c.position.x = cx[i];
        c.scale.setScalar(w[i]);
        ar[i].set(V(cx[i], 1.25, 0), V(cx[i] + vv[i] * 0.25, 1.25, 0));
        tags[i](V(cx[i], 1.8, 0), undefined, `${f1(i ? p.m2 : p.m1)} kg`);
        cx0[i] = cx[i];
        gv[i].visible = t < tcol;
        gv[i].position.set(cx[i] + (i ? p.v2 : p.v1) * 0.25, 1.25, 0);
      });
      k.caption(`Trước: v₁ = ${f1(p.v1)}, v₂ = ${f1(p.v2)} m/s → sau: v₁′ = ${f2(u1)}, v₂′ = ${f2(u2)} m/s\nĐộng lượng ${f1(p.m1 * p.v1 + p.m2 * p.v2)} kg·m/s bảo toàn · e = ${f2(p.e)}`);
    };
  },
};

// ------------------------------------------------------------------ con lắc lò xo nằm ngang
const shmScene: SceneDef = {
  ...trackCam,
  setup: (k) => {
    const {carts} = trackRig(k, 1, ['#2459C9']);
    const coil = group(k);
    coil.rotation.z = Math.PI / 2;
    withLib(k, (get) => coil.add(get('Coil').obj));
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 1.2), new THREE.MeshStandardMaterial({color: '#3A3730', roughness: 0.6}));
    wall.position.set(-5.65, TRACK_Y + 0.8, 0);
    const mark = k.line('#8A857A', 1.6, [0, TRACK_Y, 0.6, 0, TRACK_Y + 1.6, 0.6], true);
    k.scene.add(wall, mark);
    const gc = grip();
    gc.position.set(0, 1.0, 0);
    carts[0].add(gc);
    k.drag(carts[0], {onMove: (pt) => k.set('A', Math.abs(pt.x) / 0.225)}); // kéo xe ra xa vị trí cân bằng để đổi biên độ
    const tag = k.label('VTCB', '#8A857A');
    const tx = k.label('', '#2459C9');
    return ({p, t}) => {
      const x = shmX(p.A, p.T, p.phi, t, p.b);
      const v = shmV(p.A, p.T, p.phi, t);
      const X = x * 0.225;
      carts[0].position.x = X;
      const left = X - 0.5;
      coil.position.set(-5.5, TRACK_Y + 0.27, 0);
      coil.scale.y = Math.max(0.3, left + 5.5);
      tag(V(0, TRACK_Y + 1.75, 0.6));
      tx(V(X, TRACK_Y + 1.3, 0), undefined, `x = ${f1(x)} cm`);
      const E0 = p.A * p.A;
      const wt = Math.min(1, (x * x) / E0);
      k.caption(`x = ${f2(x)} cm · v = ${f2(v / 100)} m/s\nThế năng ${f1(wt * 100)} % · động năng ${f1((1 - wt) * 100)} % (cơ năng ${p.b > 0 ? 'giảm dần vì tắt dần' : 'không đổi'})`);
    };
  },
};

// ------------------------------------------------------------------ lò xo và định luật Hooke
const springScene: SceneDef = {
  floor: true,
  dist: 15,
  target: [0, 3.8, 0],
  orbit: () => [10, 10],
  setup: (k) => {
    const coils = [group(k), group(k)];
    const mass = group(k);
    withLib(k, (get) => {
      k.scene.add(get('SpringStand').obj);
      coils.forEach((c) => c.add(get('Coil').obj));
      const m = get('Mass');
      mass.add(m.obj);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.14), new THREE.MeshStandardMaterial({color: '#8A857A', metalness: 0.7, roughness: 0.3}));
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({color: '#C4261A'}));
    k.scene.add(bar, joint);
    const f = k.arrow('#C4261A', 0.04);
    k.scene.add(f.obj);
    const tag = k.label('', '#2459C9');
    const TOP = 6.84;
    const cur = {mode: 'single', keq: 100};
    const gm = grip();
    gm.position.set(0, -0.62, 0.45);
    mass.add(gm);
    // kéo quả nặng xuống để tăng khối lượng treo (độ giãn Δl = mg/k)
    k.drag(mass, {onMove: (pt) => k.set('m', (((TOP - (cur.mode === 'series' ? 2.2 : cur.mode === 'parallel' ? 1.3 : 1.32) - pt.y) / 3) * cur.keq) / G)});
    return ({p, s}) => {
      const keq = springEq(s.mode, p.k1, p.k2);
      cur.mode = s.mode;
      cur.keq = keq;
      const e = (F: number, kk: number) => clamp((F / kk) * 3, 0, 3.4);
      const F = p.m * G;
      let bottom: number;
      bar.visible = joint.visible = false;
      coils.forEach((c) => (c.visible = false));
      if (s.mode === 'parallel') {
        const len = 1.2 + e(F, keq);
        [-0.5, 0.5].forEach((x, i) => {
          coils[i].visible = true;
          coils[i].position.set(0.2 + x, TOP, 0);
          coils[i].scale.y = len;
        });
        bottom = TOP - len - 0.1;
        bar.visible = true;
        bar.position.set(0.2, bottom, 0);
      } else if (s.mode === 'series') {
        const l1 = 1.0 + e(F, p.k1);
        const l2 = 1.0 + e(F, p.k2);
        coils[0].visible = coils[1].visible = true;
        coils[0].position.set(0.2, TOP, 0);
        coils[0].scale.y = l1;
        coils[1].position.set(0.2, TOP - l1 - 0.1, 0);
        coils[1].scale.y = l2;
        joint.visible = true;
        joint.position.set(0.2, TOP - l1 - 0.05, 0);
        bottom = TOP - l1 - l2 - 0.2;
      } else {
        const len = 1.2 + e(F, keq);
        coils[0].visible = true;
        coils[0].position.set(0.2, TOP, 0);
        coils[0].scale.y = len;
        bottom = TOP - len - 0.12;
      }
      mass.position.set(0.2, bottom, 0);
      mass.scale.setScalar(0.6 + 0.5 * Math.cbrt(p.m / 5));
      f.set(V(1.1, bottom - 0.5, 0), V(1.1, bottom - 0.5 - Math.min(1.6, p.m * 0.3), 0));
      tag(V(0.2, bottom - 1.3, 0), undefined, `${f1(p.m)} kg · Δl = ${f2(F / keq)} m`);
      k.caption(`k tương đương = ${f1(keq)} N/m · F = P = ${f2(F)} N\nĐộ giãn Δl = F/k = ${f2((F / keq) * 100)} cm (thước bên trái giá)`);
    };
  },
};

// ------------------------------------------------------------------ mặt phẳng nghiêng và bảo toàn cơ năng
const rampScene: SceneDef = {
  floor: true,
  dist: 12,
  target: [0, 2.3, 0],
  orbit: () => [8, 8],
  setup: (k) => {
    const plank = group(k);
    const block = group(k);
    const proto = group(k);
    let blockSk: Skin = empty();
    withLib(k, (get) => {
      const bench = get('RampBase');
      bench.obj.position.y = 0.3;
      k.scene.add(bench.obj);
      plank.add(get('RampPlank').obj);
      proto.add(get('Protractor').obj);
      blockSk = get('Block');
      block.add(blockSk.obj);
    });
    const needle = k.line('#C4261A', 3, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(needle);
    const bars = [['#2459C9', 'Wt'], ['#D9481C', 'Wđ'], ['#C2751A', 'Q']].map(([c, l]) => ({m: new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshStandardMaterial({color: c, roughness: 0.4})), tag: k.label(l, c, true)}));
    bars.forEach((b) => k.scene.add(b.m));
    const tag = k.label('', '#2459C9');
    const gTop = grip();
    const gAng = grip('#C4261A');
    k.scene.add(gTop, gAng);
    const cur = {ku: 0.2, px: 0};
    // kéo đỉnh dốc lên xuống để đổi độ cao, kéo đầu kim đỏ quanh chân dốc để đổi góc nghiêng
    k.drag(gTop, {onMove: (pt) => k.set('h', (pt.y - 0.3) / cur.ku)});
    k.drag(gAng, {onMove: (pt) => k.set('al', (Math.atan2(pt.y - 0.3, cur.px - pt.x) * 180) / Math.PI)});
    return ({p, t}) => {
      const a = slideAccel(p.al, p.mu);
      const R = rampLayout(p.h, p.al);
      const sdist = Math.min(R.L, 0.5 * a * t * t);
      const al = rad(p.al);
      plank.position.set(R.topX, 0.3 + R.topY, 0);
      plank.rotation.z = -al;
      plank.scale.x = R.L * R.ku;
      proto.position.set(R.topX + R.L * Math.cos(al) * R.ku, 0.3, 0);
      proto.scale.set(-1, 1, 1);
      setLine(needle, [proto.position.x, 0.3, 0.05, proto.position.x - 1.9 * Math.cos(al), 0.3 + 1.9 * Math.sin(al), 0.05]);
      const u = sdist * R.ku + 0.35;
      block.position.set(R.topX + u * Math.cos(al), 0.3 + R.topY - u * Math.sin(al), 0);
      block.rotation.z = -al;
      block.scale.setScalar(0.6 + 0.5 * Math.cbrt(p.m / 5));
      tint(blockSk, '#2459C9');
      cur.ku = R.ku;
      cur.px = proto.position.x;
      gTop.position.set(R.topX, 0.3 + R.topY, 0.1);
      gAng.position.set(proto.position.x - 1.9 * Math.cos(al), 0.3 + 1.9 * Math.sin(al), 0.1);
      const E = p.m * G * p.h;
      const v = a * Math.min(t, Math.sqrt((2 * R.L) / Math.max(a, 1e-9)));
      const Ek = a > 0 ? 0.5 * p.m * v * v : 0;
      const Q = p.mu * p.m * G * Math.cos(al) * sdist;
      const Ep = p.m * G * (p.h - sdist * Math.sin(al));
      [Ep, Ek, Q].forEach((val, i) => {
        const h = Math.max(0.02, (clamp(val / E, 0, 1.05) * 3.4));
        bars[i].m.scale.y = h;
        bars[i].m.position.set(3.4 + i * 0.9, 0.3 + h / 2, 0);
        bars[i].tag(V(3.4 + i * 0.9, 0.3 - 0.1, 0.4));
      });
      tag(V(proto.position.x - 1.2, 0.75, 0.2), undefined, `${f1(p.al)}°`);
      k.caption(`E₀ = ${f1(E)} J · Wt = ${f1(Ep)} · Wđ = ${f1(Ek)} · Q (ma sát) = ${f1(Q)} J\nWt + Wđ + Q = E₀ luôn không đổi`);
    };
  },
};

// ------------------------------------------------------------------ bảng mạch điện một chiều
const circuitScene: SceneDef = {
  floor: true,
  dist: 15,
  target: [0.3, 0.6, 0],
  orbit: () => [0, 42],
  setup: (k) => {
    const wiresS = group(k);
    const wiresP = group(k);
    const R = [group(k), group(k)];
    const needles = [group(k), group(k)];
    const meters = [group(k), group(k)];
    withLib(k, (get) => {
      k.scene.add(get('CircBoard').obj);
      const bat = get('Battery');
      bat.obj.position.set(-2.6, 0.16, 0);
      k.scene.add(bat.obj);
      wiresS.add(get('WiresS').obj);
      wiresP.add(get('WiresP').obj);
      R[0].add(get('ResistorA').obj);
      R[1].add(get('ResistorB').obj);
      meters.forEach((m, i) => {
        const b = get('MeterBody');
        b.obj.position.set(0, 0, 0);
        m.add(b.obj);
        m.position.set(-1.0 + i * 2.2, 1.2, -2.3);
        needles[i].add(get('MeterNeedle').obj);
        needles[i].position.copy(m.position);
      });
    });
    // hai ô đặt điện trở: thả R₂ vào ô trên đường dây là nối tiếp, thả vào nhánh dưới là song song
    const slot = (x: number, z: number, color: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.5), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.22, depthWrite: false}));
      m.position.set(x, 0.2, z);
      k.scene.add(m);
      return m;
    };
    const slots = [slot(1.9, -1.5, '#2459C9'), slot(1.45, 0.5, '#2E9E6B')];
    const tSlot = [k.label('thả R₂ vào đây: nối tiếp', '#2459C9', true), k.label('thả R₂ vào đây: song song', '#2E9E6B', true)];
    const hold = {on: false, x: 0, z: 0};
    const g2 = grip();
    g2.position.set(0, 0.55, 0);
    R[1].add(g2);
    k.drag(R[1], {
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3),
      onStart: () => (hold.on = true),
      onMove: (pt) => Object.assign(hold, {x: clamp(pt.x, -1.8, 2.7), z: clamp(pt.z, -2.0, 1.8)}),
      onEnd: (pt) => {
        hold.on = false;
        k.set('mode', pt.z > -0.5 ? 'parallel' : 'series');
      },
    });
    const NE = 16;
    const el = swarm(NE * 2, 0.07, '#7FE3FF', {emissive: '#7FE3FF', emissiveIntensity: 1.3});
    k.scene.add(el);
    const tBat = k.label('', '#C4261A');
    const tR = [k.label('', '#2459C9'), k.label('', '#D9481C')];
    const tM = [k.label('', undefined, true), k.label('', undefined, true)];
    return ({p, t, s}) => {
      const par = s.mode === 'parallel';
      const c = circuit(s.mode, p.E, p.r, p.R1, p.R2);
      wiresS.visible = !par;
      wiresP.visible = par;
      R[0].position.set(par ? 1.45 : 0.4, 0.16, par ? -0.5 : -1.5);
      if (hold.on) R[1].position.set(hold.x, 0.5, hold.z);
      else R[1].position.set(par ? 1.45 : 1.9, 0.16, par ? 0.5 : -1.5);
      slots.forEach((m) => (m.visible = hold.on));
      tSlot[0](hold.on ? V(1.9, 0.5, -1.5) : null);
      tSlot[1](hold.on ? V(1.45, 0.5, 0.5) : null);
      // thang đo tự chọn cho kim nằm ở nửa trên của mặt số
      const maxI = niceMax(c.I * 1.3, [0.1, 0.2, 0.5, 1, 2, 5, 10, 20]);
      const maxU = niceMax(c.U * 1.2, [2, 5, 10, 20, 30]);
      [c.I / maxI, c.U / maxU].forEach((f, i) => (needles[i].rotation.z = -rad(-135 + 270 * clamp(f, 0, 1))));
      // electron đi ngược chiều dòng điện quy ước: từ cực âm (z = +0,7) vòng về cực dương
      const paths = CIRC_PATHS[par ? 'parallel' : 'series'];
      const cur = par ? [c.U / p.R1, c.U / p.R2] : [c.I];
      let n = 0;
      paths.forEach((path, i) => {
        const pts = [...path].reverse().map(([x, z]) => [x, 0.42, z] as [number, number, number]);
        const f0 = (t * 0.05 * (0.4 + Math.min(cur[i] ?? c.I, 6) * 0.25)) % 1;
        for (let j = 0; j < NE; j++) el.at(n++, ...polyAt(pts, f0 + j / NE));
      });
      el.flush(n);
      tBat(V(-2.6, 1.0, 0), undefined, `E = ${f1(p.E)} V · r = ${f1(p.r)} Ω`);
      tR[0](V(R[0].position.x, 0.75, R[0].position.z), undefined, `R₁ = ${f1(p.R1)} Ω`);
      tR[1](V(R[1].position.x, 0.75, R[1].position.z), undefined, `R₂ = ${f1(p.R2)} Ω`);
      tM[0](V(-1.0, 2.0, -2.3), undefined, `ampe kế ${f2(c.I)} A (0–${maxI})`);
      tM[1](V(1.2, 2.0, -2.3), undefined, `vôn kế ${f2(c.U)} V (0–${maxU})`);
      k.caption(`I = ${f2(c.I)} A · U = ${f2(c.U)} V · P = ${f1(c.P)} W · H = ${f1(c.H * 100)} %\n${par ? 'Song song: hiệu điện thế chung, dòng chia hai nhánh' : 'Nối tiếp: dòng điện chung, hiệu điện thế chia'} · hạt sáng là electron (ngược chiều quy ước)`);
    };
  },
};

export const BLENDER2_SCENES: Record<string, SceneDef> = {
  PHYS_KINEMATICS_1D: kinematicsScene,
  PHYS_NEWTON_LAWS: newtonScene,
  PHYS_COLLISION_1D: collisionScene,
  PHYS_SHM: shmScene,
  PHYS_SPRING_HOOKE: springScene,
  PHYS_WORK_ENERGY: rampScene,
  PHYS_DC_CIRCUIT: circuitScene,
};
