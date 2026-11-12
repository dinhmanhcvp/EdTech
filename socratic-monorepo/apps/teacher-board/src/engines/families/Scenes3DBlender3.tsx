import * as THREE from 'three';
import {CLEAR, COLOR_OF, FLAMES, REDOX, STOCK, halogenResult, testTubeResult} from '../../utils/presets/hoaScene1';
import {AA_CLASS, AA_NAME, mutate, transcribe, type MutationKind} from '../../utils/presets/sinhData';
import {anticodon, formedCount, polyAt, readingFrame} from '../../utils/presets/scene3dExtra';
import {glassify, loadModel, partOf, type Skin} from './labParts';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, group, swarm} from './Scenes3DMore';
import {clamp, grip} from './dragKit';

/** Hóa + Sinh dựng bằng Blender (`board_parts3.py` → `board-parts3.glb`): nhận biết ion, halide, màu ngọn lửa, pin điện hóa (oxi hóa–khử), dịch mã. Các cảnh đều thao tác bằng kéo-thả. */
const LIB = '/models/board-parts3.glb';
const rad = (d: number) => (d * Math.PI) / 180;
const empty = (): Skin => ({obj: new THREE.Group(), mats: []});
function withLib(k: Kit, fn: (get: (name: string) => Skin) => void): void {
  loadModel(LIB)
    .then((lib) => fn((n) => partOf(lib, n) ?? empty()))
    .catch(() => k.caption('Không tải được mô hình 3D — chuyển sang bản 2D'));
}
const tintMat = (sk: Skin, name: string, color: string, extra: Partial<THREE.MeshStandardMaterial> = {}) => sk.mats.filter((m) => m.name === name).forEach((m) => Object.assign(m, extra).color.set(color));
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
/** Cột chất lỏng/kết tủa: có phát sáng nhẹ cùng màu để màu không bị môi trường studio làm nhạt đi. */
const tube = (r: number, h: number, color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 0.45, roughness: 0.4, transparent: true, opacity: 0.88, ...o}));
const paint = (m: THREE.Mesh, color: string | THREE.Color) => {
  const mm = m.material as THREE.MeshStandardMaterial;
  mm.color.set(color);
  mm.emissive.set(color);
};

// ------------------------------------------------------------------ ống nghiệm: nhỏ thuốc thử / trộn hai ống bằng kéo-thả
/** Vật kéo được: đi theo con trỏ (giữ độ lệch lúc nắm), thả gần đích thì rót (nghiêng, chảy) rồi chạy `onDrop`, sau đó trượt về chỗ cũ. */
function carrier(k: Kit, obj: THREE.Object3D, home: THREE.Vector3, target: THREE.Vector3, reach: number, onDrop: () => void) {
  const st = {mode: 'idle' as 'idle' | 'drag' | 'pour' | 'back', off: null as THREE.Vector3 | null, at: V().copy(home), t0: 0, rot: 0};
  k.drag(obj, {
    onStart: () => {
      st.mode = 'drag';
      st.off = null;
    },
    onMove: (pt) => {
      if (!st.off) st.off = st.at.clone().sub(pt);
      st.at.set(clamp(pt.x + st.off.x, -4.5, 4.5), clamp(pt.y + st.off.y, 0.3, 5.5), 0);
    },
    onEnd: () => {
      st.mode = Math.hypot(st.at.x - target.x, st.at.y - (target.y + 1.2)) < reach ? 'pour' : 'back';
      st.t0 = now();
    },
  });
  return {
    /** gọi mỗi khung hình: trả tiến độ rót 0–1 khi đang rót */
    step: (tilt: number): number => {
      const dt = (now() - st.t0) / 1000;
      let prog = 0;
      if (st.mode === 'pour') {
        st.at.lerp(V(target.x + 1.0, target.y + 2.0, 0), 0.2);
        prog = Math.min(1, dt / 1.2);
        st.rot += (tilt * Math.min(1, dt / 0.5) - st.rot) * 0.2;
        if (dt > 1.2) {
          onDrop();
          st.mode = 'back';
          st.t0 = now();
        }
      } else if (st.mode === 'back') {
        st.at.lerp(home, 0.15);
        st.rot *= 0.8;
        if (st.at.distanceTo(home) < 0.03) st.mode = 'idle';
      } else if (st.mode === 'drag') st.rot += ((st.at.x > target.x ? tilt * 0.3 : 0) - st.rot) * 0.2;
      obj.position.copy(st.at);
      obj.rotation.z = st.rot;
      return prog;
    },
  };
}

interface PourResult {
  mixed: boolean;
  liquid: string;
  start: string;
  precip?: string;
  gas?: boolean;
  text: string;
  item: string;
  itemColor: string;
  a: string;
}
interface PourDef {
  item: 'DropperBottle' | 'TestTube';
  result: (s: Record<string, string>, p: Record<string, number>) => PourResult;
  /** thả xong thì ghi tham số về bảng điều khiển */
  drop: (k: Kit, p: Record<string, number>) => void;
  hint: string;
}
function pourScene(def: PourDef): SceneDef {
  return {
    floor: true,
    dist: 9.5,
    target: [0.9, 1.7, 0],
    orbit: () => [10, 10],
    setup: (k) => {
      const tubeA = new THREE.Group();
      tubeA.position.set(-0.8, 0.25, 0);
      const item = new THREE.Group();
      const itemLiq = tube(0.26, 1.2, '#FFFFFF', {opacity: 0.8});
      const liq = tube(0.28, 1.4, '#FFFFFF');
      liq.position.y = 0.08 + 0.7;
      const pre = tube(0.27, 0.34, '#FFFFFF', {opacity: 0.95, roughness: 0.8});
      pre.position.y = 0.2;
      tubeA.add(liq, pre);
      const stream = tube(0.03, 1, '#FFFFFF', {opacity: 0.8});
      k.scene.add(tubeA, item, stream);
      const isTube = def.item === 'TestTube';
      withLib(k, (get) => {
        k.scene.add(get('TubeRack').obj);
        const tb = get('TestTube');
        glassify(tb.obj, 0.16);
        tubeA.add(tb.obj);
        const it = get(def.item);
        if (isTube) {
          glassify(it.obj, 0.16);
          itemLiq.position.y = 0.08 + 0.6;
          it.obj.add(itemLiq);
        }
        item.add(it.obj);
        const g = grip();
        g.position.set(0, isTube ? 1.4 : 0.9, 0.5);
        item.add(g);
      });
      const bub = swarm(10, 0.055, '#FFFFFF', {transparent: true, opacity: 0.8});
      k.scene.add(bub);
      const home = V(2.4, isTube ? 0.25 : 0, 0);
      item.position.copy(home);
      const live = {p: {} as Record<string, number>};
      const mover = carrier(k, item, home, V(-0.8, 0.25, 0), 2.2, () => def.drop(k, live.p));
      const tA = k.label('', '#2459C9');
      const tI = k.label('', '#D9481C');
      const col = new THREE.Color('#E0F2FE');
      return ({p, s, t}) => {
        live.p = p;
        const r = def.result(s, p);
        const prog = mover.step(isTube ? -2.0 : -2.3);
        col.lerp(new THREE.Color(r.mixed ? r.liquid : r.start), 0.06);
        paint(liq, col);
        pre.visible = !!r.precip && r.mixed;
        if (r.precip) paint(pre, r.precip);
        paint(itemLiq, r.itemColor);
        // dòng chảy từ vật rót vào ống A
        stream.visible = prog > 0.35;
        const sy = item.position.y + 0.2;
        stream.scale.y = Math.max(0.01, sy - 2.6);
        stream.position.set(-0.8, (sy + 2.6) / 2, 0);
        paint(stream, r.itemColor);
        let n = 0;
        if (r.gas && r.mixed) for (let i = 0; i < 10; i++) bub.at(n++, -0.8 + Math.sin(i * 7 + t * 3) * 0.12, 0.5 + ((t * 0.6 + i / 10) % 1) * 1.8, Math.cos(i * 5) * 0.1);
        bub.flush(n);
        tA(V(-0.8, 3.0, 0), undefined, r.a);
        tI(V(item.position.x, item.position.y + (isTube ? 2.9 : 2.5), 0), undefined, r.item);
        k.caption(r.mixed ? r.text : def.hint);
      };
    },
  };
}

const REAGENT_NAME: Record<string, string> = {naoh: 'NaOH', bacl2: 'BaCl₂', agno3: 'AgNO₃', hcl: 'HCl'};
const testTubeScene = pourScene({
  item: 'DropperBottle',
  result: (s, p) => {
    const res = testTubeResult(s.sol, s.reagent, p.excess === 1);
    return {mixed: p.mix === 1, liquid: res.liquid, start: STOCK[s.sol], precip: res.precip, gas: res.gas, text: res.text, item: `thuốc thử ${REAGENT_NAME[s.reagent] ?? s.reagent}`, itemColor: '#CFE7F5', a: `dung dịch ${s.sol}`};
  },
  drop: (k, p) => (p.mix === 1 ? k.set('excess', 1) : k.set('mix', 1)),
  hint: 'Kéo lọ thuốc thử tới miệng ống nghiệm để nhỏ vào; kéo thêm lần nữa để cho thuốc thử dư',
});
const halogenScene = pourScene({
  item: 'TestTube',
  result: (s, p) => {
    const res = halogenResult(s.salt, s.reagent);
    const rc = s.reagent === 'cl2' ? COLOR_OF.Cl : s.reagent === 'br2' ? COLOR_OF.Br : CLEAR;
    return {mixed: p.mix === 1, liquid: res.liquid, start: CLEAR, precip: res.precip, text: res.text, item: s.reagent === 'ag' ? 'AgNO₃' : s.reagent === 'cl2' ? 'nước Cl₂' : 'nước Br₂', itemColor: rc, a: s.salt === 'F' ? 'NaF' : `Na${s.salt}`};
  },
  drop: (k) => k.set('mix', 1),
  hint: 'Kéo ống thuốc thử sang ống muối để trộn hai ống',
});

// ------------------------------------------------------------------ màu ngọn lửa: nhúng que vào đĩa muối rồi đưa vào ngọn lửa
const FLAME_ORDER = ['Li', 'Na', 'K', 'Ca', 'Sr', 'Ba', 'Cu'];
const flameScene: SceneDef = {
  floor: true,
  dist: 14,
  target: [0, 2.0, 0],
  orbit: () => [6, 10],
  setup: (k) => {
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshBasicMaterial({color: '#5B8CFF', transparent: true, opacity: 0.35, depthWrite: false}));
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({color: '#BFD6FF', transparent: true, opacity: 0.6, depthWrite: false}));
    outer.position.y = 2.7 + 0.8;
    inner.position.y = 2.7 + 0.4;
    const light = new THREE.PointLight('#5B8CFF', 0, 7);
    light.position.set(0, 3.5, 0.8);
    k.scene.add(outer, inner, light);
    const loop = new THREE.Group();
    const salt = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({color: '#FFFFFF'}));
    salt.position.y = 0.16;
    loop.add(salt);
    const dishes = FLAME_ORDER.map((key, i) => {
      const g = new THREE.Group();
      g.position.set((i - 3) * 1.1, 0, 1.7);
      k.scene.add(g);
      return {key, g, sk: empty(), tag: k.label(key, FLAMES[key].color, true)};
    });
    const lp = {at: V(2.5, 3.3, 0), off: null as THREE.Vector3 | null, loaded: true};
    withLib(k, (get) => {
      k.scene.add(get('Bunsen').obj);
      loop.add(get('WireLoop').obj);
      dishes.forEach((d) => {
        d.sk = get('Dish');
        d.g.add(d.sk.obj);
      });
    });
    const gr = grip();
    gr.position.set(0, 1.5, 0);
    loop.add(gr);
    k.scene.add(loop);
    let ion = 'Na';
    k.drag(loop, {
      onStart: () => {
        lp.off = null;
      },
      onMove: (pt) => {
        if (!lp.off) lp.off = lp.at.clone().sub(pt);
        lp.at.set(clamp(pt.x + lp.off.x, -4.2, 4.2), clamp(pt.y + lp.off.y, 0.45, 4.6), 0);
      },
      onEnd: () => {
        const d = dishes.find((q) => Math.hypot(q.g.position.x - lp.at.x, 0.35 - lp.at.y) < 0.8);
        if (d) {
          lp.loaded = true;
          if (d.key !== ion) k.set('ion', d.key);
        }
      },
    });
    const tw = k.label('', '#D9481C');
    return ({t, s}) => {
      ion = s.ion;
      const F = FLAMES[ion];
      loop.position.copy(lp.at);
      const lit = Math.abs(lp.at.x) < 0.7 && lp.at.y > 2.7 && lp.at.y < 4.4 && lp.loaded;
      salt.visible = lp.loaded;
      (salt.material as THREE.MeshStandardMaterial).color.set(F.color);
      const flick = 1 + 0.06 * Math.sin(t * 9) + 0.04 * Math.sin(t * 17);
      outer.scale.set(0.42, 0.95 * flick, 0.42);
      inner.scale.set(0.2, 0.5 * flick, 0.2);
      (outer.material as THREE.MeshBasicMaterial).color.set(lit ? F.color : '#5B8CFF');
      (outer.material as THREE.MeshBasicMaterial).opacity = lit ? 0.85 : 0.35;
      (inner.material as THREE.MeshBasicMaterial).color.set(lit ? F.inner : '#BFD6FF');
      light.color.set(lit ? F.color : '#5B8CFF');
      light.intensity = lit ? 14 : 0;
      dishes.forEach((d) => {
        tintMat(d.sk, 'salt', FLAMES[d.key].color, {emissive: new THREE.Color(d.key === ion ? FLAMES[d.key].color : '#000000'), emissiveIntensity: d.key === ion ? 0.35 : 0});
        d.tag(V(d.g.position.x, -0.1, 2.35));
      });
      tw(lit ? V(lp.at.x + 0.9, lp.at.y + 0.6, 0) : null, undefined, `${F.label}: ${F.name} ${F.wave}`);
      k.caption(lit ? `${F.label} → ngọn lửa ${F.name} (${F.wave})\nỨng dụng: ${F.use}` : 'Kéo que thử vào đĩa muối (chấm màu) để lấy muối, rồi đưa vào ngọn lửa đèn');
    };
  },
};

// ------------------------------------------------------------------ pin điện hóa cho phản ứng oxi hóa – khử: kéo phích cắm để nối mạch
const HALF: Record<string, [{sol: string; plate: string}, {sol: string; plate: string}]> = {
  zncu: [{sol: '#DCEBF7', plate: '#B9BCC2'}, {sol: '#3B7DD8', plate: '#B87333'}],
  fehcl: [{sol: '#E6F0E0', plate: '#8A8F98'}, {sol: '#EAF2F8', plate: '#2A2B2E'}],
  nacl: [{sol: '#EEE6C8', plate: '#D9D9E0'}, {sol: '#E9F5C9', plate: '#2A2B2E'}],
  mgo2: [{sol: '#E4EAF0', plate: '#C8CCD2'}, {sol: '#EAF2F8', plate: '#2A2B2E'}],
  cuag: [{sol: '#3B7DD8', plate: '#B87333'}, {sol: '#E8E8F0', plate: '#C9CCD4'}],
  h2cuo: [{sol: '#EAF2F8', plate: '#2A2B2E'}, {sol: '#2E8A6A', plate: '#B87333'}],
};
const PLATE_X = [-1.7, 1.7];
const METER_AT = V(0, 3.15, -0.8);
const POST = V(1.7, 2.9, 0);
const PARK = V(2.9, 2.4, 0.9);
const redoxScene: SceneDef = {
  floor: true,
  dist: 14,
  target: [0, 2.1, 0],
  orbit: () => [8, 12],
  setup: (k) => {
    const liq = [tube(0.95, 1.4, '#DCEBF7', {opacity: 0.55}), tube(0.95, 1.4, '#3B7DD8', {opacity: 0.55})];
    liq.forEach((l, i) => {
      l.position.set(PLATE_X[i], 0.08 + 0.7, 0);
      k.scene.add(l);
    });
    const plates = [group(k), group(k)];
    const plateSk = [empty(), empty()];
    const meter = group(k);
    meter.position.copy(METER_AT);
    const needle = group(k);
    needle.position.copy(METER_AT);
    const plug = new THREE.Group();
    withLib(k, (get) => {
      PLATE_X.forEach((x, i) => {
        const b = get('GBeaker');
        glassify(b.obj, 0.14);
        b.obj.position.set(x, 0, 0);
        k.scene.add(b.obj);
        plateSk[i] = get('Plate');
        plates[i].position.set(x, 0.25, 0);
        plates[i].add(plateSk[i].obj);
      });
      const sb = get('SaltBridge');
      glassify(sb.obj, 0.3);
      k.scene.add(sb.obj);
      meter.add(get('GalvMeter').obj);
      needle.add(get('GalvNeedle').obj);
      plug.add(get('Plug').obj);
    });
    const gr = grip('#C4261A');
    gr.position.set(0, 0.7, 0);
    plug.add(gr);
    k.scene.add(plug);
    const wireL = k.line('#3A3730', 3, [0, 0, 0, 0, 0, 0], true);
    const wireR = k.line('#C4261A', 3, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(wireL, wireR);
    // dây trái: từ điện cực trái lên cao rồi tới đồng hồ (cố định)
    setLine(wireL, [-1.7, 2.62, 0, -1.7, 3.5, 0, -1.7, 3.5, 0, -0.62, 3.5, -0.8, -0.62, 3.5, -0.8, -0.62, 3.3, -0.8]);
    const NE = 12;
    const el = swarm(NE, 0.09, '#7FE3FF', {emissive: '#7FE3FF', emissiveIntensity: 1.4});
    const NI = 14;
    const ionL = swarm(NI, 0.07, '#FFB36B', {emissive: '#FF8A4C', emissiveIntensity: 0.6});
    const ionR = swarm(NI, 0.07, '#6C8CFF', {emissive: '#6C8CFF', emissiveIntensity: 0.6});
    const bubb = swarm(10, 0.05, '#FFFFFF', {transparent: true, opacity: 0.7});
    k.scene.add(el, ionL, ionR, bubb);
    for (const x of PLATE_X) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({color: '#F4F2EC'}));
      c.position.set(x, 2.45, 0);
      k.scene.add(c);
    }
    const st = {at: PARK.clone(), off: null as THREE.Vector3 | null, closed: false, dragging: false, prog: 0};
    k.drag(plug, {
      onStart: () => {
        st.dragging = true;
        st.off = null;
        st.closed = false;
      },
      onMove: (pt) => {
        if (!st.off) st.off = st.at.clone().sub(pt);
        st.at.set(clamp(pt.x + st.off.x, -3.5, 3.8), clamp(pt.y + st.off.y, 0.8, 5), 0);
      },
      onEnd: () => {
        st.dragging = false;
        st.closed = st.at.distanceTo(POST) < 0.9;
      },
    });
    const tL = k.label('', '#C4261A');
    const tR = k.label('', '#2459C9');
    const tSw = k.label('', '#8A857A', true);
    return ({s, t}) => {
      const r = REDOX[s.r];
      const [hl, hr] = HALF[s.r] ?? HALF.zncu;
      paint(liq[0], hl.sol);
      paint(liq[1], hr.sol);
      plateSk[0].mats.forEach((m) => m.name === 'plate' && m.color.set(hl.plate));
      plateSk[1].mats.forEach((m) => m.name === 'plate' && m.color.set(hr.plate));
      if (st.closed) st.at.lerp(POST, 0.3);
      else if (!st.dragging) st.at.lerp(PARK, 0.12);
      plug.position.copy(st.at);
      const on = st.closed;
      st.prog = on ? Math.min(1, st.prog + 0.004) : Math.max(0, st.prog - 0.01);
      needle.rotation.z = -rad(on ? 38 : 0);
      plates[0].scale.set(1 - 0.35 * st.prog, 1, 1);
      plates[1].scale.set(1 + 0.5 * st.prog, 1, 1 + 0.5 * st.prog);
      const top = [st.at.x, st.at.y + 0.9, st.at.z];
      setLine(wireR, [-0.62, 3.3, -0.8, -0.62, 3.8, -0.8, -0.62, 3.8, -0.8, ...top, ...top, st.at.x, st.at.y + 0.4, st.at.z]);
      // electron đi từ chất khử (trái) qua dây và đồng hồ tới chất oxi hóa (phải)
      const path: [number, number, number][] = [[-1.7, 2.62, 0], [-1.7, 3.5, 0], [-0.62, 3.5, -0.8], [-0.62, 3.8, -0.8], [top[0], top[1], top[2]], [1.7, 3.0, 0], [1.7, 2.6, 0]];
      let n = 0;
      if (on) for (let i = 0; i < Math.min(NE, 4 + r.electrons * 2); i++) el.at(n++, ...polyAt(path, (t * 0.12 + i / NE) % 1));
      el.flush(n);
      const sc = on ? 1 : 0.0001;
      for (let i = 0; i < NI; i++) {
        const f = (t * 0.25 + i / NI) % 1;
        ionL.at(i, -1.7 + Math.sin(i * 3) * 0.55 + f * 0.5, 0.45 + f * 0.9, Math.cos(i * 5) * 0.5, sc);
        ionR.at(i, 1.7 + Math.sin(i * 4) * 0.7 * (1 - f) - 0.3 * f, 1.3 - f * 0.9, Math.cos(i * 7) * 0.6 * (1 - f), sc);
      }
      ionL.flush(NI);
      ionR.flush(NI);
      let nb = 0;
      if (on && s.r === 'fehcl') for (let i = 0; i < 10; i++) bubb.at(nb++, 1.7 + Math.sin(i * 6) * 0.3, 0.5 + ((t * 0.5 + i / 10) % 1) * 1.1, Math.cos(i * 3) * 0.3);
      bubb.flush(nb);
      tL(V(-1.7, 3.9, 0.6), undefined, `${r.reducer}: nhường e (${r.reducerChange[0]} → ${r.reducerChange[1]})`);
      tR(V(1.7, 3.9, 0.6), undefined, `${r.oxidant}: nhận e (${r.oxidantChange[0]} → ${r.oxidantChange[1]})`);
      tSw(on ? null : V(st.at.x, st.at.y + 1.6, 0), undefined, 'kéo phích cắm tới cực phải để nối mạch');
      k.caption(on ? `${r.eq}\n${r.electrons} e chuyển từ chất khử sang chất oxi hóa qua dây · cầu muối giữ trung hòa điện` : `${r.eq}\nMạch đang hở: chưa có electron chạy. Kéo phích cắm đỏ tới đầu nối điện cực phải`);
    };
  },
};

// ------------------------------------------------------------------ dịch mã: kéo ribosome dọc mRNA
const BASE_COLOR: Record<string, string> = {A: '#4F7FE0', U: '#F2B33D', G: '#2E9E6B', C: '#D9576B'};
const AA_COLOR = {nonpolar: '#F2CF4C', polar: '#7ED6A0', acidic: '#F2776B', basic: '#6FA8F0', stop: '#B9B6D3'} as const;
const SP = 0.5; // khoảng cách hai base
const MAXB = 24;
const baseX = (len: number, i: number) => -((len - 1) * SP) / 2 + i * SP;
const riboScene: SceneDef = {
  dist: 11,
  noGrid: true,
  target: [0, 0.6, 0],
  orbit: () => [0, 6],
  setup: (k) => {
    const bases = 'AUGC'.split('').map((b) => ({b, sw: swarm(MAXB, 0.17, BASE_COLOR[b], {roughness: 0.3})}));
    const backbone = k.line('#8A857A', 5, [0, 0, 0, 0, 0, 0]);
    k.scene.add(...bases.map((q) => q.sw), backbone);
    const codonTags = Array.from({length: 8}, () => k.label('', undefined, true));
    const ribo = new THREE.Group();
    ribo.scale.setScalar(0.7);
    const trna = new THREE.Group();
    trna.scale.setScalar(0.8);
    const aaBall = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), new THREE.MeshStandardMaterial({color: '#F2B33D', roughness: 0.3}));
    trna.add(aaBall);
    const chain = Array.from({length: 8}, () => Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), new THREE.MeshStandardMaterial({color: '#F2B33D', roughness: 0.3})), {visible: false}));
    const link = k.line('#E8902B', 4, [0, 0, 0, 0, 0, 0]);
    k.scene.add(ribo, trna, ...chain, link);
    const chainTags = chain.map(() => k.label('', undefined, true));
    const gr = grip();
    gr.position.set(0, 1.9, 0.4);
    ribo.add(gr);
    withLib(k, (get) => {
      const r = get('Ribosome');
      r.mats.forEach((m) => Object.assign(m, {transparent: true, opacity: 0.6, depthWrite: false}));
      ribo.add(r.obj);
      const t = get('TRNA');
      t.obj.rotation.z = Math.PI;
      trna.add(t.obj);
    });
    const tA = k.label('', '#2E9E6B');
    const st = {pos: 0, dragging: false, hold: 0, off: 0, x0: 0};
    let frame = {start: 0, codons: [] as string[], aa: [] as string[]};
    let mrnaNow = '';
    // kéo ribosome: vị trí (đơn vị codon) tính từ toạ độ x của con trỏ, bám theo codon
    k.drag(ribo, {
      onStart: () => {
        st.dragging = true;
        st.off = NaN;
      },
      onMove: (pt) => {
        const cur = (pt.x - st.x0) / (3 * SP);
        if (Number.isNaN(st.off)) st.off = st.pos - cur;
        st.pos = clamp(cur + st.off, 0, Math.max(0, frame.codons.length - 1));
      },
      onEnd: () => {
        st.dragging = false;
        st.hold = now() + 2500;
      },
    });
    return ({p, s}) => {
      const clean = s.dna.toUpperCase().replace(/[^ATGC]/g, '').slice(0, MAXB);
      const mrna = transcribe(mutate(clean, s.kind as MutationKind, Math.round(p.pos), s.base)).slice(0, MAXB);
      if (mrna !== mrnaNow) {
        mrnaNow = mrna;
        frame = readingFrame(mrna);
        st.pos = 0;
        const idx: Record<string, number> = {A: 0, U: 0, G: 0, C: 0};
        const pts: number[] = [];
        [...mrna].forEach((b, i) => {
          const x = baseX(mrna.length, i);
          bases.find((v) => v.b === b)?.sw.at(idx[b]++, x, 0, 0);
          pts.push(x, 0, 0);
        });
        bases.forEach((q) => q.sw.flush(idx[q.b]));
        setLine(backbone, pts.length >= 6 ? pts : [0, 0, 0, 0, 0, 0]);
        codonTags.forEach((tg, i) => {
          const c = frame.codons[i];
          tg(c ? V(baseX(mrna.length, frame.start + 3 * i + 1), -0.55, 0) : null, undefined, c ?? '');
        });
      }
      st.x0 = baseX(mrna.length, frame.start + 1);
      if (!st.dragging && now() > st.hold && frame.codons.length) st.pos = (st.pos + 0.012) % frame.codons.length;
      const x = st.x0 + st.pos * 3 * SP;
      ribo.position.set(x, 0, 0);
      const ci = Math.min(frame.codons.length - 1, Math.round(st.pos));
      const codon = frame.codons[ci];
      trna.visible = !!codon;
      if (codon) {
        trna.position.set(baseX(mrna.length, frame.start + 3 * ci + 1), -0.5, 0);
        const aa = frame.aa[ci];
        (aaBall.material as THREE.MeshStandardMaterial).color.set(AA_COLOR[AA_CLASS[aa] ?? 'stop']);
        aaBall.position.set(0, -1.9, 0);
        tA(V(trna.position.x, -0.95, 0), undefined, `anticodon ${anticodon(codon)}`);
      } else tA(null);
      const formed = formedCount(frame, st.pos);
      const lp: number[] = [];
      chain.forEach((b, i) => {
        b.visible = i < formed;
        chainTags[i](null);
        if (i >= formed) return;
        const aa = frame.aa[i];
        b.position.set(x - 0.3 - 0.55 * (formed - 1 - i), 1.9 + 0.18 * (formed - 1 - i) + 0.35 * Math.sin(i * 1.6), 0.2);
        (b.material as THREE.MeshStandardMaterial).color.set(AA_COLOR[AA_CLASS[aa] ?? 'stop']);
        lp.push(...b.position.toArray());
        chainTags[i](V(b.position.x, b.position.y + 0.42, b.position.z), undefined, AA_NAME[aa]);
      });
      setLine(link, lp.length >= 6 ? lp : [0, 0, 0, 0, 0, 0]);
      k.caption(`mRNA: ${mrna}\nPolypeptide: ${frame.aa.filter((a) => a !== '*').map((a) => AA_NAME[a]).join(' – ') || 'chưa có AUG'} · đã nối ${formed} amino acid${st.dragging ? '' : ' (kéo ribosome để đọc)'}`);
    };
  },
};

export const BLENDER3_SCENES: Record<string, SceneDef> = {
  CHEM_VIRTUAL_TESTTUBE: testTubeScene,
  CHEM_HALOGEN_LAB: halogenScene,
  CHEM_ALKALI_EARTH: flameScene,
  CHEM_REDOX: redoxScene,
  BIO_TRANSCRIPTION_TRANSLATION: riboScene,
};
