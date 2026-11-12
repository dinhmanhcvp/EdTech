import * as THREE from 'three';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, ball, group, mat, swarm} from './Scenes3DMore';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Các bộ phận chạm chọn được: mỗi bộ phận một nhóm vật có vật liệu riêng, được tô sáng khi chọn và mờ đi khi bộ phận khác được chọn. */
function parts(k: Kit) {
  const reg = new Map<string, {obj: THREE.Object3D; mats: THREE.MeshStandardMaterial[]}>();
  const tag = k.label('', '#A8481C');
  const box = new THREE.Box3();
  return {
    add(id: string, obj: THREE.Object3D, low = false) {
      const mats: THREE.MeshStandardMaterial[] = [];
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const c = (m.material as THREE.MeshStandardMaterial).clone();
        c.userData.o = c.opacity;
        c.userData.t = c.transparent;
        m.material = c;
        mats.push(c);
      });
      if (!obj.parent) k.scene.add(obj);
      k.pick(obj, id, low);
      reg.set(id, {obj, mats});
    },
    /** tô sáng bộ phận `sel`, nhãn của nó và chú thích; `labels`: id → tên */
    paint(sel: string, labels: (id: string) => string, hint: string) {
      reg.forEach(({mats}, id) =>
        mats.forEach((m) => {
          const on = id === sel;
          m.emissive.set(on ? '#A8481C' : '#000000');
          m.emissiveIntensity = on ? 0.55 : 0;
          m.opacity = m.userData.o * (sel && !on ? 0.4 : 1);
          m.transparent = m.userData.t || (!!sel && !on);
        }),
      );
      const r = reg.get(sel);
      if (r) tag(box.setFromObject(r.obj).getCenter(V()), undefined, labels(sel));
      else tag(null);
      k.caption(r ? labels(sel) : hint);
    },
  };
}

const put = (m: THREE.Mesh, x: number, y: number, z: number) => {
  m.position.set(x, y, z);
  return m;
};
const tube = (pts: THREE.Vector3[], r: number, color: string) => Object.assign(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 14), mat(color, {roughness: 0.4})), {castShadow: true});
const scaled = (m: THREE.Mesh, x: number, y: number, z: number, at: [number, number, number]) => {
  m.scale.set(x, y, z);
  m.position.set(...at);
  return m;
};

export const ORGAN_SCENES: Record<string, SceneDef> = {
  BIO_HEART_CIRCULATION: {
    noGrid: true,
    dist: 12,
    target: [0, 0, 0],
    orbit: () => [0, 8],
    setup: (k) => {
      const P = parts(k);
      const blue = '#3D7BE0';
      const red = '#E0453A';
      P.add('lung', scaled(ball('#F6B3CF', 1, {roughness: 0.6}), 2.1, 0.45, 0.75, [0, 2.3, 0]));
      P.add('body', scaled(ball('#B8B2A7', 1, {roughness: 0.7}), 2.5, 0.4, 0.8, [0, -2.5, 0]));
      P.add('vc', tube([V(-2, -2.2, 0), V(-2, 0.6, 0), V(-1.05, 0.6, 0)], 0.13, blue));
      P.add('ra', scaled(ball('#93C5FD', 1), 0.55, 0.45, 0.45, [-0.65, 0.55, 0]));
      P.add('rv', scaled(ball('#60A5FA', 1), 0.55, 0.7, 0.5, [-0.5, -0.4, 0.1]));
      P.add('pa', tube([V(-0.35, -0.05, 0.2), V(-0.1, 0.95, 0.25), V(-0.6, 1.6, 0), V(-0.9, 2.1, 0)], 0.11, blue));
      P.add('pv', tube([V(0.9, 2.1, 0), V(0.95, 1.3, 0), V(0.75, 0.85, 0)], 0.11, red));
      P.add('la', scaled(ball('#FCA5A5', 1), 0.55, 0.45, 0.45, [0.65, 0.55, 0]));
      P.add('lv', scaled(ball('#F87171', 1), 0.62, 0.8, 0.55, [0.5, -0.4, 0.1]));
      P.add('aorta', tube([V(0.3, 0.0, 0.35), V(0.25, 1.3, 0.35), V(1.2, 1.55, 0.35), V(2, 0.8, 0), V(2, -2.2, 0)], 0.13, red));
      for (const [id, x] of [['valve-r', -0.6], ['valve-l', 0.6]] as const) {
        const v = Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 12, 28), mat('#FACC15', {roughness: 0.3})), {castShadow: true});
        v.rotation.x = Math.PI / 2;
        v.position.set(x, 0.12, 0);
        P.add(id, v);
      }
      // đường đi của máu: thân → tâm nhĩ P → tâm thất P → phổi → tâm nhĩ T → tâm thất T → động mạch chủ → thân
      const path = new THREE.CatmullRomCurve3(
        [[-2, -2.3, 0], [-2, 0.6, 0], [-0.65, 0.6, 0], [-0.6, 0.12, 0], [-0.5, -0.4, 0.1], [-0.2, 0.2, 0.2], [-0.6, 1.6, 0], [-0.9, 2.2, 0], [0.9, 2.2, 0], [0.95, 1.3, 0], [0.65, 0.6, 0], [0.6, 0.12, 0], [0.5, -0.4, 0.1], [0.25, 0.2, 0.35], [0.25, 1.3, 0.35], [1.2, 1.55, 0.35], [2, 0.8, 0], [2, -2.3, 0], [0, -2.6, 0]].map(([x, y, z]) => V(x, y, z)),
        true,
      );
      const dark = swarm(12, 0.09, '#1F4FBF', {roughness: 0.2, emissive: '#1F4FBF', emissiveIntensity: 0.4});
      const light = swarm(12, 0.09, '#FF3B2F', {roughness: 0.2, emissive: '#FF3B2F', emissiveIntensity: 0.4});
      k.scene.add(dark, light);
      const pt = V();
      return ({s}) => {
        const now = performance.now() / 1000;
        let a = 0;
        let b = 0;
        const on = s.flow === '1';
        if (on)
          for (let i = 0; i < 12; i++) {
            const u = (now * 0.045 + i / 12) % 1;
            path.getPointAt(u, pt);
            (u < 0.48 || u > 0.97 ? dark : light).at(u < 0.48 || u > 0.97 ? a++ : b++, pt.x, pt.y, pt.z);
          }
        dark.flush(a);
        light.flush(b);
        P.paint(s.sel, (id) => s[`L:${id}`] ?? id, 'Chạm một bộ phận để xem chi tiết (xanh: máu nghèo O₂, đỏ: máu giàu O₂)');
      };
    },
  },

  BIO_EUKARYOTE_CELL: {
    noGrid: true,
    dist: 8,
    target: [0, 0, 0],
    orbit: () => [-12, 14],
    setup: (k) => {
      const P = parts(k);
      const glass = new THREE.MeshPhysicalMaterial({color: '#8FD3A8', transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false});
      P.add('membrane', new THREE.Mesh(new THREE.SphereGeometry(2.1, 56, 36), glass), true);
      const nuc = group(k, ball('#B79BE8', 0.8, {transparent: true, opacity: 0.88, roughness: 0.5}), put(ball('#6B4BC8', 0.25), 0.15, 0.15, 0.4));
      nuc.position.set(-0.3, 0.25, 0);
      P.add('nucleus', nuc);
      // lưới nội chất: các túi dẹt xếp lớp quanh nhân
      const er = group(k);
      [[-0.3, 0.25, 0, 1.05], [-0.3, 0.25, 0, 1.2], [-0.3, 0.25, 0, 1.35]].forEach(([x, y, z, r], i) => {
        const sheet = ball('#F2B33D', 1, {roughness: 0.5, side: THREE.DoubleSide});
        sheet.scale.set(r, 0.12, r * 0.8);
        sheet.position.set(x, y + (i - 1) * 0.0, z);
        sheet.rotation.set(0.5 + i * 0.35, i * 0.8, 0.3);
        er.add(sheet);
      });
      P.add('er', er);
      const golgi = group(k);
      for (let i = 0; i < 5; i++) {
        const d = ball('#F28B82', 1, {roughness: 0.5});
        d.scale.set(0.65 - Math.abs(i - 2) * 0.07, 0.07, 0.45);
        d.position.y = i * 0.17;
        golgi.add(d);
      }
      golgi.position.set(1.1, -0.9, 0.3);
      golgi.rotation.z = 0.5;
      P.add('golgi', golgi);
      const mito = group(k);
      [[0.9, 0.9, 0.3], [-1.2, -0.8, 0.3], [0.2, -1.3, -0.5]].forEach(([x, y, z], i) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 8, 16), mat('#E0453A', {roughness: 0.45}));
        m.position.set(x, y, z);
        m.rotation.set(i, i * 1.9, 0.6);
        m.castShadow = true;
        mito.add(m);
      });
      P.add('mito', mito);
      const lyso = group(k);
      [[-1.3, 1.0, 0.3], [1.4, 0.1, -0.6], [-0.2, 1.5, 0.5]].forEach(([x, y, z]) => lyso.add(put(ball('#C7D23E', 0.2), x, y, z)));
      P.add('lysosome', lyso);
      const ribo = swarm(46, 0.065, '#2E9E6B');
      let n = 0;
      for (let i = 0; i < 46; i++) {
        const th = i * 2.399;
        const ph = Math.acos(1 - ((i + 0.5) / 46) * 2);
        const r = i % 2 ? 1.3 : 1.7; // một nửa bám lưới nội chất, một nửa tự do trong bào tương
        ribo.at(n++, -0.3 + r * Math.sin(ph) * Math.cos(th) * 0.9, 0.25 + r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th) * 0.9);
      }
      ribo.flush(n);
      P.add('ribosome', ribo);
      return ({s}) => P.paint(s.sel, (id) => s[`L:${id}`] ?? id, 'Chạm một bào quan để xem chi tiết');
    },
  },

  BIO_FLOWER_STRUCTURE: {
    noGrid: true,
    dist: 7,
    target: [0, 0.5, 0],
    orbit: () => [20, 38],
    setup: (k) => {
      const P = parts(k);
      const petals = group(k);
      const sepals = group(k);
      const stamens = group(k);
      const anthers = group(k);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const pet = ball('#F4A6C8', 1, {roughness: 0.55, side: THREE.DoubleSide});
        pet.scale.set(0.42, 0.8, 0.08);
        pet.position.set(Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0);
        pet.rotation.set(Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7 + 0);
        pet.lookAt(Math.cos(a) * 3, 0.55, Math.sin(a) * 3);
        petals.add(pet);
        const fa = a + 0.5;
        const top = V(Math.cos(fa) * 0.55, 1.15, Math.sin(fa) * 0.55);
        const base = V(Math.cos(fa) * 0.12, -0.1, Math.sin(fa) * 0.12);
        const fil = tube([base, top.clone().lerp(base, 0.5).add(V(Math.cos(fa) * 0.08, 0, Math.sin(fa) * 0.08)), top], 0.025, '#D8E58B');
        stamens.add(fil);
        const an = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 6, 12), mat('#F2A31F', {roughness: 0.5}));
        an.position.copy(top);
        an.castShadow = true;
        anthers.add(an);
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const sep = ball('#5FA84C', 1, {roughness: 0.6});
        sep.scale.set(0.2, 0.55, 0.06);
        sep.position.set(Math.cos(a) * 0.4, -0.45, Math.sin(a) * 0.4);
        sep.lookAt(Math.cos(a) * 1.4, -1.0, Math.sin(a) * 1.4);
        sepals.add(sep);
      }
      P.add('petal', petals);
      P.add('sepal', sepals);
      P.add('filament', stamens);
      P.add('anther', anthers);
      P.add('style', tube([V(0, 0.1, 0), V(0, 0.8, 0), V(0, 1.6, 0)], 0.045, '#9FD16C'));
      P.add('stigma', group(k, ...[[0, 0], [0.07, 0.04], [-0.07, 0.04]].map(([x, z]) => put(ball('#E8C13A', 0.1), x, 1.7, z))));
      const ov = group(k, scaled(ball('#7FBF5E', 1, {transparent: true, opacity: 0.78, roughness: 0.5}), 0.42, 0.5, 0.42, [0, -0.25, 0]));
      P.add('ovary', ov);
      const ovules = group(k, ...[[-0.12, -0.3, 0], [0.12, -0.3, 0.05], [0, -0.15, -0.1], [0.02, -0.4, 0.12]].map(([x, y, z]) => put(ball('#FFF1B8', 0.09), x, y, z)));
      P.add('ovule', ovules);
      return ({s}) => P.paint(s.sel, (id) => s[`L:${id}`] ?? id, 'Chạm một bộ phận của hoa để xem chi tiết');
    },
  },

  BIO_MITOSIS: {
    noGrid: true,
    dist: 7.5,
    target: [0, 0, 0],
    orbit: () => [18, 14],
    setup: (k) => {
      // 2n = 4: hai cặp NST (dài đỏ, ngắn xanh); mỗi NST nhân đôi thành hai chromatid chị em
      const cols = ['#E0453A', '#F2776B', '#3D6FE0', '#6C9BE8'];
      const len = [0.6, 0.6, 0.4, 0.4];
      const nucPos = [V(-0.4, 0.3, 0.1), V(0.3, 0.35, -0.25), V(-0.25, -0.4, -0.2), V(0.4, -0.3, 0.25)];
      const eq = [0, 1, 2, 3].map((i) => V(0, (i - 1.5) * 0.5, (i % 2 ? 0.12 : -0.12)));
      const chr = cols.flatMap((c, i) => [0, 1].map((side) => ({i, side, mesh: Object.assign(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, len[i], 8, 14), mat(c, {roughness: 0.4})), {castShadow: true})})));
      chr.forEach((c) => k.scene.add(c.mesh));
      const cell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({color: '#8FD3A8', transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false}));
      const nucEnv = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshPhysicalMaterial({color: '#B79BE8', transparent: true, opacity: 0.2, roughness: 0.3, depthWrite: false}));
      const envs = [0, 1].map(() => new THREE.Mesh(nucEnv.geometry, (nucEnv.material as THREE.Material).clone()));
      const furrow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 12, 48), mat('#2E9E6B'));
      furrow.rotation.y = Math.PI / 2;
      const poles = [V(-1.3, 0, 0), V(1.3, 0, 0)].map((v) => {
        const m = ball('#F2A31F', 0.1);
        m.position.copy(v);
        return m;
      });
      k.scene.add(cell, nucEnv, ...envs, furrow, ...poles);
      const spindle = k.line('#8A857A', 1.6, new Array(chr.length * 6).fill(0), true);
      spindle.material.transparent = true;
      k.scene.add(spindle);
      let e = -1;
      const pos = V();
      const seg = new Array(chr.length * 6).fill(0);
      return ({p}) => {
        e = e < 0 ? p.step : e + (p.step - e) * 0.08;
        const open = 0.24 * smooth(e); // chromatid chị em tách thành hình chữ X sau khi nhân đôi
        const cond = lerp(0.3, 1, smooth((e - 1.4) / 1.4)) * (1 - 0.55 * smooth(e - 4));
        const toEq = smooth(e - 2);
        const apart = smooth(e - 3) * (1 + 0.1 * smooth(e - 4));
        const pole = 1.3 + 0.65 * smooth(e - 4);
        poles.forEach((m, j) => {
          m.position.x = (j ? 1 : -1) * pole;
          m.visible = e > 1.7;
        });
        chr.forEach((c, n) => {
          const sg = c.side ? 1 : -1;
          pos.copy(nucPos[c.i]).lerp(eq[c.i], toEq);
          // kì sau: hai chromatid đi về hai cực; trước đó vẫn dính nhau ở tâm động
          const x = pos.x + sg * 1.25 * apart * (pole / 1.3) * 0.95;
          const m = c.mesh;
          m.position.set(x, pos.y, pos.z);
          m.rotation.z = sg * open * (1 - smooth(e - 3));
          m.scale.set(cond * 1.0 + 0.2, 1, cond * 1.0 + 0.2);
          const a = n * 6;
          const target = V(sg * pole, 0, 0);
          seg[a] = target.x;
          seg[a + 1] = target.y;
          seg[a + 2] = target.z;
          seg[a + 3] = m.position.x;
          seg[a + 4] = m.position.y;
          seg[a + 5] = m.position.z;
        });
        const sp = smooth(e - 1.6) * (1 - smooth(e - 4.6));
        spindle.visible = sp > 0.02;
        spindle.material.opacity = sp * 0.8;
        if (spindle.visible) setLine(spindle, seg);
        const grow = 1 + 0.55 * smooth(e - 4);
        cell.scale.set(1.75 * grow, 1.75, 1.75);
        furrow.visible = e > 4;
        furrow.position.x = 0;
        const fr = lerp(1.75, 0.12, smooth(e - 4.3));
        furrow.scale.set(fr, fr, fr);
        const old = 1 - smooth((e - 2) / 0.8);
        nucEnv.scale.setScalar(1.0);
        (nucEnv.material as THREE.MeshPhysicalMaterial).opacity = 0.2 * old;
        const born = smooth((e - 4.2) / 0.8);
        envs.forEach((m, j) => {
          m.position.set((j ? 1 : -1) * pole * 0.95, 0, 0);
          m.scale.set(0.55, 0.7, 0.7);
          (m.material as THREE.MeshPhysicalMaterial).opacity = 0.22 * born;
          m.visible = born > 0.01;
        });
      };
    },
  },
};
