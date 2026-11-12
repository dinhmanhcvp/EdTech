import * as THREE from 'three';
import {f1, f2} from '../../utils/presets/sceneKit';
import {SPECTRA, irTransmittance} from '../../utils/presets/hoaScene1';
import {POLYMERS, polymerMass, waterReleased} from '../../utils/presets/hoaScene2';
import {bioAccumulation, driftPath, energyAt, expectedPath, offspring} from '../../utils/presets/sinh2Scene';
import {PYRAMIDS, lincolnPetersen} from '../../utils/presets/sinh3';
import {capture, nearestPyramid, scatter, stemPoints} from '../../utils/presets/scene3dExtra';
import {loadModel, partOf, type Skin} from './labParts';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, group, swarm} from './Scenes3DMore';
import {clamp, grip} from './dragKit';

/**
 * Sinh học và Hóa còn lại, thao tác bằng kéo-thả / chạm: hướng động (kéo đèn, kéo đỉnh ngọn), phả hệ (chạm bố mẹ đổi phép lai), chuỗi thức ăn (kéo bậc, chạm đại bàng),
 * tháp tuổi và đánh dấu–bắt lại (kéo lưới), tiến hóa quần thể (kéo thanh thế hệ), glucose (kéo nhóm OH ở C1), polymer (kéo đầu mạch), phổ (kéo con trỏ).
 * Sinh vật và thiết bị dựng bằng Blender (`board_parts4.py` → `board-parts4.glb`), phân tử dựng bằng three.
 */
const LIB = '/models/board-parts4.glb';
const rad = (d: number) => (d * Math.PI) / 180;
const empty = (): Skin => ({obj: new THREE.Group(), mats: []});
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
function withLib(k: Kit, fn: (get: (name: string) => Skin) => void): void {
  loadModel(LIB)
    .then((lib) => fn((n) => partOf(lib, n) ?? empty()))
    .catch(() => k.caption('Không tải được mô hình 3D — chuyển sang bản 2D'));
}
const tint = (sk: Skin, name: string, color: string) => sk.mats.filter((m) => m.name === name).forEach((m) => m.color.set(color));
/** Chạm (nhấn rồi nhả gần như không dời) vào vật thì chạy `fn`; dùng được bằng bút trên bảng. */
function tap(k: Kit, obj: THREE.Object3D, fn: () => void) {
  const st = {x: 0, y: 0, moved: false, first: true};
  k.drag(obj, {
    onStart: () => Object.assign(st, {moved: false, first: true}),
    onMove: (pt) => {
      if (st.first) Object.assign(st, {x: pt.x, y: pt.y, first: false});
      else if (Math.hypot(pt.x - st.x, pt.y - st.y) > 0.25) st.moved = true;
    },
    onEnd: () => {
      if (!st.moved) fn();
    },
  });
}
const stdMat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.4, ...o});
const sphere = (r: number, color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), stdMat(color, o));

// ------------------------------------------------------------------ hướng động
const plantScene: SceneDef = {
  floor: true,
  dist: 12,
  target: [0, 2.2, 0],
  orbit: () => [10, 8],
  setup: (k) => {
    const pot = group(k);
    const stem = new THREE.Mesh(new THREE.BufferGeometry(), stdMat('#4FA84A'));
    stem.castShadow = true;
    const leaves = [group(k), group(k)];
    const tipCap = group(k);
    const tipGrip = grip('#C4261A', 0.2);
    tipCap.add(tipGrip);
    const lamp = group(k);
    const lampGrip = grip();
    lampGrip.position.set(0, 0.7, 0);
    lamp.add(lampGrip);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.2, 4.4, 24, 1, true).translate(0, -2.2, 0), new THREE.MeshBasicMaterial({color: '#FFE08A', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide}));
    lamp.add(beam);
    const sun = new THREE.PointLight('#FFE9A8', 12, 14);
    lamp.add(sun);
    k.scene.add(stem);
    withLib(k, (get) => {
      pot.add(get('PlantPot').obj);
      leaves.forEach((l) => l.add(get('Leaf').obj));
      tipCap.add(get('TipCap').obj);
      lamp.add(get('Lamp').obj);
    });
    const arrowG = k.arrow('#6B665B', 0.05);
    k.scene.add(arrowG.obj);
    const auxin = swarm(18, 0.05, '#FFB703', {emissive: '#FFB703', emissiveIntensity: 0.8});
    k.scene.add(auxin);
    const st = {tip: 1, drag: null as THREE.Vector3 | null};
    k.drag(lamp, {onMove: (pt) => k.set('ang', clamp((Math.atan2(pt.x, pt.y - 1.5) * 180) / Math.PI, -80, 80))});
    k.drag(tipCap, {
      onMove: (pt) => (st.drag = pt.clone()),
      onEnd: (pt) => {
        const tip = tipCap.position;
        if (Math.hypot(pt.x - tip.x, pt.y - tip.y) > 0.7) k.set('tip', 0); // kéo đỉnh ra khỏi cây = cắt đỉnh sinh trưởng
        st.drag = null;
      },
    });
    const tag = k.label('', '#2459C9');
    let key = '';
    return ({p, t, s}) => {
      const photo = s.mode === 'photo';
      const grow = 1 - Math.exp(-t / 2.5);
      const tipOn = p.tip === 1;
      const k2 = `${s.mode}|${p.ang}|${tipOn}|${grow.toFixed(3)}`;
      const pts = stemPoints(s.mode, p.ang, tipOn, grow);
      if (k2 !== key) {
        key = k2;
        stem.geometry.dispose();
        stem.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => V(...q))), 32, 0.09, 8);
      }
      pot.rotation.z = photo ? 0 : -Math.PI / 2;
      const tipP = V(...pts[pts.length - 1]);
      const q = V(...pts[pts.length - 2]);
      const a = Math.atan2(tipP.x - q.x, tipP.y - q.y); // góc lệch so với phương thẳng đứng
      leaves.forEach((l, i) => {
        l.position.copy(tipP);
        l.rotation.z = Math.PI / 2 - a + (i ? 0.9 : -0.9);
        l.scale.setScalar(0.3 + 0.9 * grow);
      });
      tipCap.visible = tipOn;
      tipCap.position.copy(tipP).add(V(Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0));
      lamp.visible = photo;
      const aL = rad(p.ang);
      const lp = V(4.2 * Math.sin(aL), 1.5 + 4.2 * Math.cos(aL), 0);
      lamp.position.copy(lp);
      lamp.quaternion.setFromUnitVectors(V(0, -1, 0), V(0, 1.5, 0).sub(lp).normalize());
      arrowG.obj.visible = !photo;
      arrowG.set(V(2.2, 3.5, 0), V(2.2, 2.2, 0));
      // auxin: tập trung ở phía tối (xa đèn) của đoạn thân dưới đỉnh, chỉ khi còn đỉnh
      let n = 0;
      if (tipOn)
        for (let i = 0; i < 18; i++) {
          const idx = Math.min(pts.length - 1, 3 + Math.floor(((t * 0.8 + i / 18) % 1) * (pts.length - 4)));
          const sideDir = photo ? -Math.sign(p.ang || 1) : -1;
          const off = (photo ? 0.14 : 0.0) * sideDir;
          n++;
          auxin.at(i, pts[idx][0] + off, pts[idx][1] + (photo ? 0 : sideDir * 0.14), 0.05);
        }
      auxin.flush(n);
      tag(tipOn ? tipP : null, undefined, 'đỉnh sinh trưởng (kéo ra để cắt)');
      k.caption(photo ? `Ánh sáng lệch ${f1(p.ang)}° · ${tipOn ? `thân cong ${f1(rad(p.ang) * 0.9 * grow * 57.3)}° về phía sáng` : 'đã cắt đỉnh: không có auxin nên không cong'}\nKéo chiếc đèn quanh cây để đổi hướng sáng` : `Chậu nằm ngang: ${tipOn ? 'auxin dồn về phía dưới làm thân cong lên (hướng động âm)' : 'đã cắt đỉnh: thân không cong lên'}`);
    };
  },
};

// ------------------------------------------------------------------ phả hệ
const pedigreeScene: SceneDef = {
  floor: true,
  dist: 18,
  target: [0, 3.0, 0],
  orbit: () => [0, 10],
  setup: (k) => {
    const mk = (kind: 'PersonM' | 'PersonF', x: number, y: number, sc: number) => {
      const g = group(k);
      g.position.set(x, y, 0);
      g.scale.setScalar(sc);
      return {g, kind, sk: empty()};
    };
    const father = mk('PersonM', -1.4, 3.6, 1.6);
    const mother = mk('PersonF', 1.4, 3.6, 1.6);
    const kids = Array.from({length: 8}, (_, i) => mk(i < 4 ? 'PersonM' : 'PersonF', (i < 4 ? -4.8 : 1.6) + (i % 4) * 1.05, 0, 1.15));
    const all = [father, mother, ...kids];
    withLib(k, (get) =>
      all.forEach((f) => {
        f.sk = get(f.kind);
        f.g.add(f.sk.obj);
      }),
    );
    const lines = k.line('#2B2823', 2, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(lines);
    const seg: number[] = [-1.0, 4.4, 0, 1.0, 4.4, 0, 0, 4.4, 0, 0, 3.0, 0, -4.3, 3.0, 0, 3.4, 3.0, 0];
    for (const f of kids) seg.push(f.g.position.x, 3.0, 0, f.g.position.x, 1.5, 0);
    setLine(lines, seg);
    const live = {cross: 'c1'};
    const next = () => k.set('cross', `c${(Number(live.cross.slice(1)) % 4) + 1}`);
    tap(k, father.g, next);
    tap(k, mother.g, next);
    for (const f of [father, mother]) {
      const g = grip('#2459C9', 0.2);
      g.position.set(0, 1.5, 0.2);
      f.g.add(g);
    }
    const tags = [k.label('bố', undefined, true), k.label('mẹ', undefined, true), k.label('', '#2459C9')];
    return ({s}) => {
      live.cross = s.cross;
      const r = offspring(s.mode, s.cross);
      kids.forEach((f, i) => {
        const sex = i < 4 ? r.son : r.daughter;
        const affected = i % 4 < Math.round(4 * sex);
        tint(f.sk, 'body', affected ? '#2B2823' : '#F4EFE4');
      });
      tags[0](V(-1.4, 6.3, 0));
      tags[1](V(1.4, 6.3, 0));
      tags[2](V(0, 6.9, 0), undefined, `kiểu gene bố mẹ: ${r.geno} (chạm bố hoặc mẹ để đổi phép lai)`);
      k.caption(`Xác suất con mắc bệnh: con trai ${f1(r.son * 100)} % · con gái ${f1(r.daughter * 100)} %\nNgười tô đen là mắc bệnh (minh họa 4 con mỗi giới)`);
    };
  },
};

// ------------------------------------------------------------------ chuỗi thức ăn và dòng năng lượng
const TROPHIC = ['Grass', 'Grasshopper', 'Frog', 'Snake', 'Eagle'];
const TROPHIC_VN = ['Sinh vật sản xuất', 'Tiêu thụ bậc 1', 'Tiêu thụ bậc 2', 'Tiêu thụ bậc 3', 'Tiêu thụ bậc 4'];
const LAYER = ['#86EFAC', '#BEF264', '#FDE68A', '#FDBA74', '#FCA5A5'];
const foodScene: SceneDef = {
  floor: true,
  dist: 17,
  target: [0, 2.8, 0],
  orbit: () => [14, 14],
  setup: (k) => {
    const slabs = LAYER.map((c) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), stdMat(c, {roughness: 0.6}));
      m.castShadow = m.receiveShadow = true;
      k.scene.add(m);
      return m;
    });
    const orgs = TROPHIC.map(() => group(k));
    withLib(k, (get) => orgs.forEach((o, i) => o.add(get(TROPHIC[i]).obj)));
    const tags = TROPHIC.map(() => k.label('', undefined, true));
    const gEff = grip('#2459C9', 0.22);
    k.scene.add(gEff);
    const live = {e0: 10000, eff: 10, ddt: 0, w1: 3};
    // kéo mép bậc 2 sang ngang để đổi hiệu suất chuyển hóa giữa hai bậc
    k.drag(gEff, {onMove: (pt) => k.set('eff', 100 * Math.pow(clamp((Math.abs(pt.x) * 2 * 60) / 380, 0.05, 1), 1 / 0.28))});
    tap(k, orgs[4], () => k.set('ddt', live.ddt === 1 ? 0 : 1));
    const grip4 = grip('#C4261A', 0.2);
    grip4.position.set(0, 1.4, 0);
    orgs[4].add(grip4);
    return ({p}) => {
      Object.assign(live, {e0: p.e0, eff: p.eff, ddt: p.ddt ?? 0});
      let prevW = 0;
      const widths = TROPHIC.map((_, i) => Math.max(18, 380 * Math.pow(energyAt(p.e0, p.eff, i) / p.e0, 0.28)) / 60);
      slabs.forEach((m, i) => {
        const w = widths[i];
        m.scale.set(w, 1, w * 0.7);
        m.position.set(0, 0.4 + i * 0.8, 0);
        const top = 0.8 + i * 0.8;
        const next = widths[i + 1] ?? 0;
        const x = clamp(w / 2 - 0.55, next / 2 + 0.3, w / 2 - 0.3);
        orgs[i].position.set(i === 0 ? 0 : x * (i % 2 ? 1 : -1), top, 0);
        orgs[i].scale.setScalar(1.1 + 0.12 * i);
        const e = energyAt(p.e0, p.eff, i);
        tags[i](V(-5.6, top - 0.4, 0.4), undefined, `${TROPHIC_VN[i]}: ${e >= 100 ? Math.round(e).toLocaleString('vi-VN') : f1(e)} kcal${p.ddt === 1 ? ` · DDT ${f2(bioAccumulation(0.04, i))} ppm` : ''}`);
        prevW = w;
      });
      void prevW;
      gEff.position.set(widths[1] / 2, 1.2, 0.35);
      k.caption(`Hiệu suất ${f1(p.eff)} % giữa hai bậc → bậc 4 chỉ còn ${f1(energyAt(p.e0, p.eff, 4))} kcal\nKéo chấm xanh để đổi hiệu suất · chạm đại bàng để ${p.ddt === 1 ? 'ẩn' : 'hiện'} nồng độ DDT`);
    };
  },
};

// ------------------------------------------------------------------ tháp tuổi và đánh dấu – bắt lại
const ecologyScene: SceneDef = {
  floor: true,
  dist: 13,
  target: [0, 1.4, 0],
  orbit: () => [0, 22],
  setup: (k) => {
    const slabs = ['#FCA5A5', '#FDE68A', '#BBF7D0'].map((c) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 1.6), stdMat(c, {roughness: 0.6}));
      m.castShadow = true;
      k.scene.add(m);
      return m;
    });
    const slabTags = ['Sau sinh sản', 'Đang sinh sản', 'Trước sinh sản'].map((t) => k.label(t, undefined, true));
    const gBase = grip('#2459C9', 0.22);
    k.scene.add(gBase);
    const arena = group(k);
    const net = group(k);
    const netGrip = grip();
    netGrip.position.set(0, 0.5, 0);
    net.add(netGrip);
    withLib(k, (get) => {
      arena.add(get('Arena').obj);
      net.add(get('Net').obj);
    });
    const MAXN = 1000;
    const un = swarm(MAXN, 0.07, '#8FB28A', {roughness: 0.5});
    const mk = swarm(100, 0.1, '#D9481C', {emissive: '#D9481C', emissiveIntensity: 0.4});
    const hit = swarm(100, 0.17, '#FFD166', {emissive: '#FFD166', emissiveIntensity: 0.9, transparent: true, opacity: 0.55});
    k.scene.add(un, mk, hit);
    const NETHOME = V(4.2, 1.6, 2.6);
    const st = {at: NETHOME.clone(), mode: 'idle' as 'idle' | 'drag' | 'back', off: null as THREE.Vector3 | null, res: null as null | {idx: number[]; marked: number}, until: 0, p: {N: 400, M: 50, n: 60}};
    // kéo lưới theo chiều ngang; chiều sâu (z) theo phương kéo dọc màn hình
    k.drag(netGrip, {
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.6),
      onStart: () => ((st.mode = 'drag'), (st.res = null)),
      onMove: (pt) => st.at.set(clamp(pt.x, -3.2, 3.2), 1.6, clamp(pt.z, -2.2, 2.2)),
      onEnd: () => {
        const pts = scatter(st.p.N);
        st.res = capture(pts, st.p.M, st.p.n, st.at.x, st.at.z);
        st.until = now() + 6000;
        st.mode = 'back';
      },
    });
    const baseW = Object.fromEntries(Object.entries(PYRAMIDS).map(([kk, v]) => [kk, v.widths[0]]));
    k.drag(gBase, {onMove: (pt) => k.set('kind', nearestPyramid(Math.abs(pt.x) * 60, baseW))});
    const tt = k.label('', '#2459C9');
    return ({p, s}) => {
      st.p = {N: p.N, M: p.M, n: p.n};
      const pyr = s.mode === 'pyr';
      slabs.forEach((m) => (m.visible = pyr));
      gBase.visible = pyr;
      arena.visible = !pyr;
      net.visible = !pyr;
      un.visible = mk.visible = hit.visible = !pyr;
      if (pyr) {
        const pr = PYRAMIDS[s.kind];
        slabs.forEach((m, i) => {
          const w = pr.widths[2 - i] / 60;
          m.scale.set(2 * w, 1, 1);
          m.position.set(0, 0.55 + (2 - i) * 1.15, 0);
          slabTags[i](V(0, 0.55 + (2 - i) * 1.15, 0.9), undefined, ['Sau sinh sản', 'Đang sinh sản', 'Trước sinh sản'][i]);
        });
        // đáy tháp là tầng "trước sinh sản" (i = 2, dưới cùng): kéo cạnh đáy để chọn dạng gần nhất
        gBase.position.set(pr.widths[0] / 60, 0.55, 0.9);
        un.flush(0);
        mk.flush(0);
        hit.flush(0);
        tt(null);
        k.caption(`${pr.label}\n${pr.trend} · kéo chấm xanh ở cạnh đáy để đổi dạng tháp`);
        return;
      }
      slabTags.forEach((t) => t(null));
      const pts = scatter(p.N);
      pts.forEach(([x, z], i) => (i < p.M ? mk : un).at(i < p.M ? i : i - Math.min(p.M, p.N), x, 0.1, z));
      un.flush(Math.max(0, p.N - p.M));
      mk.flush(p.M);
      if (st.mode === 'back') {
        st.at.lerp(NETHOME, 0.04);
        if (now() > st.until) st.mode = 'idle';
      }
      net.position.copy(st.at);
      const res = now() < st.until ? st.res : null;
      let h = 0;
      if (res) res.idx.forEach((i) => hit.at(h++, pts[i][0], 0.12, pts[i][1]));
      hit.flush(h);
      const est = res ? lincolnPetersen(p.M, p.n, res.marked) : null;
      tt(res ? V(st.at.x, 2.4, st.at.z) : null, undefined, res ? `bắt ${p.n} con, có ${res.marked} con đã đánh dấu` : '');
      k.caption(res ? `Ước lượng N ≈ M·n/m = ${p.M}·${p.n}/${res.marked} = ${est === Infinity ? '∞' : Math.round(est ?? 0)} (thực tế ${p.N})\nBắt lại nhiều lần để thấy ước lượng dao động quanh giá trị thật` : `Sân có ${p.N} cá thể, ${p.M} con đã đánh dấu (cam). Kéo chiếc vợt qua sân rồi thả để bắt ${p.n} con`);
    };
  },
};

// ------------------------------------------------------------------ tiến hóa quần thể: kéo thanh thế hệ
const evoScene: SceneDef = {
  floor: true,
  dist: 14,
  target: [0, 1.6, 0],
  orbit: () => [0, 14],
  setup: (k) => {
    const G = 100;
    const X = (g: number) => -4.5 + (g / G) * 9;
    const Y = (v: number) => 0.2 + v * 3.2;
    const cols = ['#2459C9', '#D9481C', '#2E7D32', '#C2751A', '#6B4BC8'];
    const lines = cols.map((c, i) => k.line(c, 2.2, [0, 0, 0, 0, 0, 0]));
    const expect = k.line('#2B2823', 3, [0, 0, 0, 0, 0, 0]);
    const board = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.9, 0.08), stdMat('#FBF9F4', {roughness: 0.9, transparent: true, opacity: 0.65}));
    board.position.set(0, 2.15, -1.2);
    lines.forEach((l, i) => (l.position.z = -1.0 + i * 0.5));
    expect.position.z = 1.0;
    k.scene.add(board, ...lines, expect);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.5, 3.0), new THREE.MeshBasicMaterial({color: '#FF8A4C', transparent: true, opacity: 0.3, depthWrite: false}));
    bar.position.set(0, 2.0, 0.0);
    const bg = grip();
    bg.position.set(0, 3.9, 0);
    bar.add(bg);
    k.scene.add(bar);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.15, 48), stdMat('#7FA35A', {roughness: 0.8}));
    stage.position.set(0, 0.05, 3.9);
    k.scene.add(stage);
    const NB = 40;
    const bees = Array.from({length: NB}, () => {
      const g = group(k);
      return {g, sk: empty()};
    });
    withLib(k, (get) =>
      bees.forEach((b, i) => {
        b.sk = get('Beetle');
        b.g.add(b.sk.obj);
        b.g.scale.setScalar(1.8);
        b.g.position.set(Math.cos(i * 2.4) * (0.6 + (i % 7) * 0.4), 0.15, 3.9 + Math.sin(i * 2.4) * (0.6 + (i % 7) * 0.4));
        b.g.rotation.y = i * 1.3;
      }),
    );
    const st = {g: 0, dragging: false, hold: 0};
    k.drag(bar, {
      onStart: () => (st.dragging = true),
      onMove: (pt) => (st.g = clamp(((pt.x + 4.5) / 9) * G, 0, G)),
      onEnd: () => ((st.dragging = false), (st.hold = now() + 3000)),
    });
    const tg = k.label('', '#D9481C');
    let key = '';
    let paths: number[][] = [];
    return ({p}) => {
      const kk = `${p.N}|${p.p0}|${p.s}|${p.m}`;
      if (kk !== key) {
        key = kk;
        paths = cols.map((_, i) => driftPath(p.N, p.p0, p.s, p.m, G, i + 3));
        paths.forEach((pa, i) => setLine(lines[i], pa.flatMap((v, g) => [X(g), Y(v), 0])));
        setLine(expect, expectedPath(p.p0, p.s, p.m, G).flatMap((v, g) => [X(g), Y(v), 0]));
      }
      if (!st.dragging && now() > st.hold) st.g = (st.g + 0.08) % G;
      const g = Math.floor(st.g);
      bar.position.x = X(g);
      const freq = paths[0]?.[g] ?? p.p0;
      bees.forEach((b, i) => tint(b.sk, 'shell', i < Math.round(NB * freq) ? '#3E9B4F' : '#7A4A21'));
      tg(V(X(g), 4.4, 0), undefined, `thế hệ ${g}: tần số A = ${f2(freq)}`);
      k.caption(`Quần thể N = ${p.N}: ${p.N < 100 ? 'nhỏ nên phiêu bạt di truyền mạnh' : 'lớn nên tần số ít dao động ngẫu nhiên'} · nét đen đứt: kì vọng theo chọn lọc/di nhập\nKéo thanh cam để xem thế hệ; bọ xanh = mang allele A (${Math.round(NB * freq)}/${NB})`);
    };
  },
};

// ------------------------------------------------------------------ glucose: kéo nhóm OH ở C1 để đổi α ↔ β
const ELEM = {C: ['#5B5750', 0.3], O: ['#E0453A', 0.28], H: ['#F4F2EC', 0.16]} as const;
const carboScene: SceneDef = {
  dist: 8,
  noGrid: true,
  target: [0, 0.4, 0],
  orbit: () => [15, 22],
  setup: (k) => {
    const root = group(k);
    const rings = group(k);
    root.add(rings);
    const atom = (el: keyof typeof ELEM, pos: THREE.Vector3, parent: THREE.Object3D) => {
      const m = sphere(ELEM[el][1], ELEM[el][0], {roughness: 0.25});
      m.position.copy(pos);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    const bondL = k.line('#3A3730', 6, [0, 0, 0, 0, 0, 0], true);
    root.add(bondL);
    const c1oh = new THREE.Group();
    const c1g = grip('#C4261A', 0.25);
    c1oh.add(c1g);
    root.add(c1oh);
    const tags = Array.from({length: 7}, () => k.label('', undefined, true));
    const tC1 = k.label('', '#C4261A');
    let built = '';
    const ringAt = (i: number) => V(1.4 * Math.cos(rad(30 + i * 60)), 0, -1.4 * Math.sin(rad(30 + i * 60)));
    const live = {form: 'alpha'};
    k.drag(c1oh, {onMove: (pt) => k.set('form', pt.y > 0 ? 'beta' : 'alpha')});
    return ({s}) => {
      if (s.form !== built) {
        built = s.form;
        rings.clear();
        const seg: number[] = [];
        const add = (a: THREE.Vector3, b: THREE.Vector3) => seg.push(...a.toArray(), ...b.toArray());
        if (s.form === 'open') {
          const rows: [string, number][] = [['CHO', 1], ['H–C–OH', 1], ['HO–C–H', -1], ['H–C–OH', 1], ['H–C–OH', 1], ['CH₂OH', 0]];
          const ys = rows.map((_, i) => 2.5 - i * 1.0);
          rows.forEach(([lab, side], i) => {
            const c = atom('C', V(0, ys[i], 0), rings);
            if (i > 0) add(V(0, ys[i - 1], 0), V(0, ys[i], 0));
            if (i === 0) {
              atom('O', V(0.9, ys[0] + 0.2, 0), rings);
              add(V(0, ys[0], 0), V(0.9, ys[0] + 0.2, 0));
              atom('H', V(-0.7, ys[0] + 0.3, 0), rings);
              add(V(0, ys[0], 0), V(-0.7, ys[0] + 0.3, 0));
            } else if (i < 5) {
              const o = V(side * 1.0, ys[i] + 0.2, 0.0);
              atom('O', o, rings);
              add(V(0, ys[i], 0), o);
              atom('H', o.clone().add(V(side * 0.45, 0.2, 0)), rings);
              add(o, o.clone().add(V(side * 0.45, 0.2, 0)));
              atom('H', V(-side * 0.7, ys[i] - 0.1, 0), rings);
              add(V(0, ys[i], 0), V(-side * 0.7, ys[i] - 0.1, 0));
            } else {
              const o = V(0.9, ys[i] - 0.3, 0);
              atom('O', o, rings);
              add(V(0, ys[i], 0), o);
            }
            void c;
            void lab;
          });
          setLine(bondL, seg);
          return;
        }
        // dạng vòng pyranose: C1..C5 và O5 trên lục giác nằm ngang; nhóm thế hướng lên (+y) hoặc xuống (−y)
        const ringIdx = [0, 1, 2, 3, 4, 5];
        const names = ['C1', 'C2', 'C3', 'C4', 'C5', 'O'];
        ringIdx.forEach((i) => atom(i === 5 ? 'O' : 'C', ringAt(i), rings));
        ringIdx.forEach((i) => add(ringAt(i), ringAt((i + 1) % 6)));
        const up: Record<number, number> = {1: -1, 2: 1, 3: -1, 4: 1};
        for (const i of [1, 2, 3]) {
          const d = up[i];
          const base = ringAt(i);
          const o = base.clone().add(V(base.x * 0.25, d * 1.0, base.z * 0.25));
          atom('O', o, rings);
          add(base, o);
          const h = o.clone().add(V(base.x * 0.2, d * 0.3, base.z * 0.2));
          atom('H', h, rings);
          add(o, h);
        }
        {
          // C5 mang CH₂OH hướng lên
          const base = ringAt(4);
          const c6 = base.clone().add(V(base.x * 0.2, 1.0, base.z * 0.2));
          atom('C', c6, rings);
          add(base, c6);
          const o6 = c6.clone().add(V(base.x * 0.3, 0.5, base.z * 0.3));
          atom('O', o6, rings);
          add(c6, o6);
        }
        setLine(bondL, seg);
        names.forEach((n, i) => tags[i](ringAt(i).clone().add(V(0, -0.6 * (i === 0 ? 0 : 0), 0)), rings, n));
      }
      live.form = s.form;
      const open = s.form === 'open';
      c1oh.visible = !open;
      if (!open) {
        const base = ringAt(0);
        const dir = s.form === 'beta' ? 1 : -1;
        c1oh.position.copy(base).add(V(base.x * 0.25, dir * 1.1, base.z * 0.25));
        tC1(c1oh.position.clone().add(V(0, dir * 0.55, 0)), undefined, s.form === 'beta' ? 'OH ở C1 hướng lên (β)' : 'OH ở C1 hướng xuống (α)');
      } else tC1(null);
      if (open) tags.forEach((t) => t(null));
      k.caption(open ? 'Glucose mạch hở: nhóm –CHO ở C1, các nhóm –OH ở C2–C5\nChọn dạng vòng để thấy nhóm –CHO đóng vòng với –OH ở C5' : `${s.form === 'alpha' ? 'α' : 'β'}-glucose dạng vòng\nKéo nhóm –OH đỏ ở C1 lên hoặc xuống mặt phẳng vòng để đổi α ↔ β`);
    };
  },
};

// ------------------------------------------------------------------ polymer: kéo đầu mạch để đổi số mắt xích n
const polymerScene: SceneDef = {
  dist: 15,
  noGrid: true,
  target: [0.5, 0.5, 0],
  orbit: () => [0, 10],
  setup: (k) => {
    const chain = group(k);
    const water = swarm(24, 0.13, '#60A5FA', {emissive: '#60A5FA', emissiveIntensity: 0.5});
    k.scene.add(water);
    const endGrip = grip('#C4261A', 0.28);
    k.scene.add(endGrip);
    const tag = k.label('', '#2459C9');
    const tM = k.label('', '#C2751A');
    let built = '';
    const live = {unit: 1.5, x0: -5};
    k.drag(endGrip, {onMove: (pt) => k.set('n', (pt.x - live.x0) / live.unit)});
    return ({p, s, t}) => {
      const sp = POLYMERS[s.p];
      const n = Math.round(p.n);
      const key = `${s.p}|${n}`;
      const nylon = sp.condense;
      const unit = nylon ? 1.9 : 1.5;
      live.unit = unit;
      live.x0 = -4.6;
      if (key !== built) {
        built = key;
        chain.clear();
        const seg: number[] = [];
        const ball = (r: number, color: string, x: number, y: number, z = 0) => {
          const m = sphere(r, color, {roughness: 0.25});
          m.position.set(x, y, z);
          chain.add(m);
        };
        const stick = (ax: number, ay: number, bx: number, by: number, az = 0, bz = 0) => seg.push(ax, ay, az, bx, by, bz);
        for (let i = 0; i < n; i++) {
          const x0 = live.x0 + i * unit;
          if (!nylon) {
            // –CH₂–CHX–: hai nguyên tử C zích-zắc, H (và Cl ở PVC) hướng ra trước/sau
            const c1 = [x0 + 0.1, 0.0];
            const c2 = [x0 + 0.1 + unit * 0.5, 0.5];
            ball(0.3, '#5B5750', c1[0], c1[1]);
            ball(0.3, '#5B5750', c2[0], c2[1]);
            stick(c1[0], c1[1], c2[0], c2[1]);
            if (i < n - 1) stick(c2[0], c2[1], x0 + unit + 0.1, 0);
            for (const z of [0.5, -0.5]) {
              ball(0.15, '#F4F2EC', c1[0], c1[1] - 0.25, z);
              stick(c1[0], c1[1], c1[0], c1[1] - 0.25, 0, z);
            }
            ball(0.15, '#F4F2EC', c2[0], c2[1] + 0.25, 0.5);
            stick(c2[0], c2[1], c2[0], c2[1] + 0.25, 0, 0.5);
            if (s.p === 'pvc') {
              ball(0.3, '#2E9E6B', c2[0], c2[1] + 0.3, -0.6);
              stick(c2[0], c2[1], c2[0], c2[1] + 0.3, 0, -0.6);
            } else {
              ball(0.15, '#F4F2EC', c2[0], c2[1] + 0.25, -0.5);
              stick(c2[0], c2[1], c2[0], c2[1] + 0.25, 0, -0.5);
            }
          } else {
            // nylon-6,6: khối diamine (xanh) – liên kết amide (đỏ/xanh lam) – khối acid adipic (cam)
            ball(0.42, '#3D6FE0', x0, 0);
            ball(0.42, '#E8902B', x0 + unit * 0.5, 0);
            ball(0.16, '#E0453A', x0 + unit * 0.5 - 0.25, 0.45);
            stick(x0, 0, x0 + unit * 0.5, 0);
            if (i < n - 1) stick(x0 + unit * 0.5, 0, x0 + unit, 0);
          }
        }
        const lm = chain.children.length;
        void lm;
        const bonds = k.line('#3A3730', 6, seg.length ? seg : [0, 0, 0, 0, 0, 0], true);
        chain.add(bonds);
      }
      const endX = live.x0 + n * unit + 0.2;
      endGrip.position.set(endX, 0.2, 0);
      // nước tách ra khi trùng ngưng: 2n − 1 phân tử bay lên
      const w = waterReleased(sp, n);
      for (let i = 0; i < Math.min(24, w); i++) {
        const f = (t * 0.25 + i / 24) % 1;
        water.at(i, live.x0 + ((i % n) + 0.5) * unit, 0.9 + f * 2.2, Math.sin(i * 2) * 0.5, 1 - f * 0.5);
      }
      water.flush(Math.min(24, w));
      tag(V(live.x0 + (n * unit) / 2, -1.2, 0), undefined, `${sp.label} · ${sp.type} · n = ${n}`);
      tM(V(live.x0 + (n * unit) / 2, 2.6, 0), undefined, w ? `${w} phân tử H₂O tách ra` : '');
      k.caption(`M ≈ ${f1(polymerMass(sp, n))} (g/mol) · mắt xích ${sp.unit} · monome ${sp.monomer}\nKéo chấm đỏ ở đầu mạch sang phải/trái để thêm bớt mắt xích${nylon ? ` · ${waterReleased(sp, n)} H₂O thoát ra` : ''}`);
    };
  },
};

// ------------------------------------------------------------------ phổ IR và MS: kéo con trỏ đọc phổ
const spectraScene: SceneDef = {
  floor: true,
  dist: 15,
  target: [0, 1.6, 0],
  orbit: () => [8, 14],
  setup: (k) => {
    withLib(k, (get) => {
      const sp = get('Spectrometer');
      sp.obj.position.set(-5.8, 0, -1.6);
      sp.obj.scale.setScalar(0.9);
      k.scene.add(sp.obj);
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(10, 3.9, 0.08), stdMat('#FBF9F4', {roughness: 0.9}));
    board.position.set(0.8, 2.1, -0.3);
    k.scene.add(board);
    const axis = k.line('#2B2823', 3, [-4, 0.2, 0, 5.6, 0.2, 0, -4, 0.2, 0, -4, 3.8, 0]);
    k.scene.add(axis);
    const curve = k.line('#2459C9', 3, [0, 0, 0, 0, 0, 0]);
    k.scene.add(curve);
    const bars = Array.from({length: 8}, () => new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.3), stdMat('#2459C9')));
    bars.forEach((b) => k.scene.add(b));
    const cursor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.6, 0.5), new THREE.MeshBasicMaterial({color: '#D9481C', transparent: true, opacity: 0.45, depthWrite: false}));
    const cg = grip();
    cg.position.set(0, 1.9, 0);
    cursor.add(cg);
    k.scene.add(cursor);
    const labels = Array.from({length: 6}, () => k.label('', '#C4261A', true));
    const tc = k.label('', '#D9481C');
    const st = {x: 0.5};
    k.drag(cursor, {onMove: (pt) => (st.x = clamp((pt.x + 4) / 9.6, 0, 1))});
    let key = '';
    return ({s}) => {
      const c = SPECTRA[s.c];
      const ir = s.mode === 'ir';
      const xi = (w: number) => -4 + ((4000 - w) / 3500) * 9.6; // IR: 4000 → 500 từ trái sang phải
      const xm = (mz: number) => -4 + (mz / (c.M + 6)) * 9.6;
      const kk = `${s.c}|${s.mode}`;
      if (kk !== key) {
        key = kk;
        if (ir) {
          const pts: number[] = [];
          for (let w = 4000; w >= 500; w -= 20) pts.push(xi(w), 0.2 + (irTransmittance(c, w) / 100) * 3.4, 0.1);
          setLine(curve, pts);
        } else setLine(curve, [0, 0, 0, 0, 0, 0]);
        bars.forEach((b, i) => {
          const m = c.ms[i];
          b.visible = !ir && !!m;
          if (!m) return;
          const h = (m[1] / 100) * 3.3;
          b.scale.y = h;
          b.position.set(xm(m[0]), 0.2 + h / 2, 0.1);
          (b.material as THREE.MeshStandardMaterial).color.set(m[0] === c.M ? '#C4261A' : '#2459C9');
        });
        labels.forEach((l, i) => {
          if (ir) {
            const b = c.ir[i];
            l(b ? V(xi(b[0]), 0.2 + ((100 - 90 * b[1]) / 100) * 3.4 - 0.3, 0.1) : null, undefined, b ? `${b[3]} (${b[0]})` : '');
          } else {
            const m = c.ms[i];
            l(m ? V(xm(m[0]), 0.2 + (m[1] / 100) * 3.3 + 0.3, 0.1) : null, undefined, m ? `${m[0]}${m[2] ? ' · ' + m[2] : ''}` : '');
          }
        });
      }
      const x = -4 + st.x * 9.6;
      cursor.position.set(x, 2.0, 0.1);
      let read = '';
      if (ir) {
        const w = 4000 - st.x * 3500;
        const near = c.ir.reduce((a, b) => (Math.abs(b[0] - w) < Math.abs(a[0] - w) ? b : a));
        read = `${Math.round(w)} cm⁻¹ · T = ${f1(irTransmittance(c, w))} % · dải gần nhất: ${near[3]} (${near[0]} cm⁻¹)`;
      } else {
        const mz = st.x * (c.M + 6);
        const near = c.ms.reduce((a, b) => (Math.abs(b[0] - mz) < Math.abs(a[0] - mz) ? b : a));
        read = `m/z ≈ ${Math.round(mz)} · gần nhất: ${near[0]} (${near[1]} %)${near[2] ? ' ' + near[2] : ''}`;
      }
      tc(null);
      k.caption(`${c.label} · ${ir ? 'phổ hồng ngoại' : 'phổ khối lượng'}\n${read} · kéo thanh cam để đọc phổ`);
    };
  },
};

export const BLENDER4_SCENES: Record<string, SceneDef> = {
  BIO_PLANT_TROPISM: plantScene,
  BIO_PEDIGREE: pedigreeScene,
  BIO_FOOD_WEB_ENERGY: foodScene,
  BIO_POPULATION_ECOLOGY: ecologyScene,
  BIO_POPULATION_EVOLUTION: evoScene,
  CHEM_CARBOHYDRATE: carboScene,
  CHEM_POLYMER: polymerScene,
  CHEM_SPECTRA: spectraScene,
};
