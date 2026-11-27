import * as THREE from 'three';
import {STITCHES, WIRES, cabgStep, cabgTool, cabgVitals, CABG_STEPS, CABG_TOOL_NAME, type CabgAction, type CabgState, type CabgTool} from '../../utils/lab/hands/cabg';
import {setLine, type Kit} from './Stage3D';

/**
 * Phần cảnh của ca BẮC CẦU ĐỘNG MẠCH VÀNH trong bài "Phẫu thuật tim" (`HandsSurgery3D` gọi vào khi chế độ là `cabg`).
 * Dựng: ống thông (dụng cụ cầm tay + ống đã đặt có dây nối về máy), mũi khâu túi, kẹp ngang động mạch chủ, kim truyền liệt tim,
 * mảng xơ vữa ở đoạn gần động mạch liên thất trước, miệng mở động mạch, cầu nối động mạch ngực trong trái kèm cuống mỡ, mũi khâu vắt và sợi chỉ.
 * Toạ độ thế giới của cảnh (tim nằm ngửa, mỏm về +z, tim trái phía +x); điểm thao tác lấy bằng tia chiếu xuống đúng bộ phận sau khi mô hình tải xong.
 */
export interface CabgHost {
  k: Kit;
  /** điểm trên mặt bộ phận `id` ngay dưới (x, z); null nếu tia không trúng */
  onNode: (id: string, x: number, z: number) => THREE.Vector3 | null;
  /** điểm trên mặt tim bất kỳ dưới (x, z) */
  surfaceY: (x: number, z: number) => number;
  /** các điểm của động mạch liên thất trước (thế giới) */
  ladPts: THREE.Vector3[];
  /** mô hình kẹp (để đặt kẹp ngang động mạch chủ) */
  clampModel: () => THREE.Object3D | undefined;
  dispatch: (a: CabgAction) => void;
  state: () => CabgState;
  /** khoảng cách trên MÀN HÌNH (đơn vị chiều cao) từ con trỏ tới một điểm thế giới: nhắm theo hình chiếu như mắt người, không theo điểm tia chạm
   * (động mạch phổi nằm đè trên động mạch chủ nên điểm tia chạm lệch chỗ cần thao tác) */
  distAt: (nx: number, ny: number, at: THREE.Vector3) => number;
  /** toạ độ màn hình (−1…1) của một điểm thế giới */
  toNdc: (at: THREE.Vector3) => THREE.Vector2;
  /** điểm trên lòng khoang ngực (trường mổ) dưới (x, z) */
  onField: (x: number, z: number) => THREE.Vector3 | null;
  /** hai nửa thành ngực (xương ức, cơ, mỡ, da) và banh ngực của mô hình; đóng ngực thì trượt / tháo */
  chest: () => {R: THREE.Object3D | null; L: THREE.Object3D | null; retractor: THREE.Object3D | null};
}
type Ptr = {active: boolean; pressed: boolean; down: boolean; reach: number; hot: boolean; ndc: THREE.Vector2};

const PUMP = new THREE.Vector3(0.6, 0.5, -3.4);
const LIMA_FROM = new THREE.Vector3(2.35, 0.12, -1.9);
const LIMA_REST = new THREE.Vector3(1.55, 0.62, 0.05);

/** ống thông: thân nhựa trong có lò xo gia cường, đầu vát, khớp nối xanh; gốc ở MŨI ống, thân chạy theo +y */
function cannulaMesh(tint = '#D7E7EE'): THREE.Group {
  const g = new THREE.Group();
  const clear = new THREE.MeshPhysicalMaterial({color: tint, roughness: 0.15, transparent: true, opacity: 0.6, clearcoat: 1});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.5, 16).translate(0, 0.31, 0), clear);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.016, 0.07, 16).translate(0, 0.035, 0), clear);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.004, 4, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#E8EEF2', metalness: 0.6, roughness: 0.3}));
  const coils = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const c = coil.clone();
    c.position.y = 0.12 + i * 0.045;
    coils.add(c);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16).translate(0, 0.58, 0), new THREE.MeshStandardMaterial({color: '#2E6FB8', roughness: 0.4}));
  g.add(body, tip, coils, hub);
  return g;
}
/** mũi khâu túi quanh chỗ đặt ống + ống siết cao su đỏ */
function pursestring(): THREE.Group {
  const g = new THREE.Group();
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#2B5BB0', roughness: 0.4}));
  const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 10).rotateZ(0.9).translate(0.13, 0.1, 0), new THREE.MeshStandardMaterial({color: '#B8402E', roughness: 0.5}));
  g.add(thread, snare);
  return g;
}

export function makeCabg(h: CabgHost) {
  const {k} = h;
  const root = new THREE.Group();
  k.scene.add(root);
  const T = {drainP: new THREE.Vector3(), drainM: new THREE.Vector3(), pace: new THREE.Vector3(), ao: new THREE.Vector3(), clamp: new THREE.Vector3(), root: new THREE.Vector3(), ra: new THREE.Vector3(), lad: new THREE.Vector3(), plaque: new THREE.Vector3(), u: new THREE.Vector3(1, 0, 0), w: new THREE.Vector3(0, 0, 1)};
  let ready = false;

  // ---- dụng cụ ống thông cầm tay (thay cho ống hút trên khay khi ở chế độ này)
  const handCannula = cannulaMesh();
  root.add(handCannula);
  // ---- ống đã đặt
  const aoCann = cannulaMesh('#E8C7C3');
  const raCann = cannulaMesh('#C9B8C8');
  const rootNeedle = cannulaMesh('#F2E6D0');
  rootNeedle.scale.setScalar(0.6);
  const aoPurse = pursestring();
  const raPurse = pursestring();
  root.add(aoCann, raCann, rootNeedle, aoPurse, raPurse);
  const lineMat = (c: string, o = 0.85) => new THREE.MeshPhysicalMaterial({color: c, roughness: 0.2, transparent: true, opacity: o, clearcoat: 1});
  const lines = {ao: new THREE.Mesh(new THREE.BufferGeometry(), lineMat('#DDE8EE', 0.55)), ra: new THREE.Mesh(new THREE.BufferGeometry(), lineMat('#DDE8EE', 0.55)), root: new THREE.Mesh(new THREE.BufferGeometry(), lineMat('#F1EAD8', 0.7))};
  for (const l of Object.values(lines)) root.add(l);
  const tubeTo = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.9, 0));
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 0.25, 0)), mid, b]), 40, r, 10, false);
  };
  // ---- kẹp ngang động mạch chủ (bản sao mô hình kẹp, phóng to)
  let xClamp: THREE.Object3D | null = null;
  // ---- mảng xơ vữa: chỗ hẹp vàng nhạt nổi trên động mạch liên thất trước (đoạn gần)
  const plaque = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshPhysicalMaterial({color: '#E8D38A', roughness: 0.45, clearcoat: 0.6}));
  root.add(plaque);
  // ---- miệng mở động mạch vành
  const slit = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.018), new THREE.MeshStandardMaterial({color: '#3A0508', roughness: 0.3}));
  root.add(slit);
  // ---- cầu nối: động mạch ngực trong trái + cuống mỡ, kẹp bulldog ở đầu
  const lima = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({color: '#C2584E', roughness: 0.32, clearcoat: 0.8}));
  const pedicle = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({color: '#E6C57A', roughness: 0.4, clearcoat: 0.6, transparent: true, opacity: 0.85}));
  const bulldog = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.05), new THREE.MeshStandardMaterial({color: '#B9C0C8', metalness: 0.85, roughness: 0.25}));
  root.add(lima, pedicle, bulldog);
  let graftKey = '';
  const graftEnd = new THREE.Vector3();
  const layGraft = (end: THREE.Vector3) => {
    const key = end.toArray().map((x) => x.toFixed(3)).join();
    if (key === graftKey) return;
    graftKey = key;
    // cầu nối nằm dọc bờ trái tim, chỉ hơi vồng lên (không treo lơ lửng trên trường mổ)
    const mid = LIMA_FROM.clone().lerp(end, 0.55).add(new THREE.Vector3(0, 0.18, 0));
    const curve = new THREE.CatmullRomCurve3([LIMA_FROM, LIMA_FROM.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 0.06, 0)), mid, end]);
    lima.geometry.dispose();
    lima.geometry = new THREE.TubeGeometry(curve, 60, 0.032, 10, false);
    // cuống mỡ ôm động mạch, dừng trước đầu đã tách sạch để nối
    const pts = curve.getPoints(60).slice(0, 48);
    pedicle.geometry.dispose();
    pedicle.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.07, 10, false);
  };
  // ---- mũi khâu vắt + sợi chỉ
  const stitchMat = new THREE.MeshStandardMaterial({color: '#2B5BB0', roughness: 0.35});
  const stitchPts: THREE.Vector3[] = [];
  const stitchMeshes = Array.from({length: STITCHES}, () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0035, 6, 14, Math.PI), stitchMat);
    root.add(m);
    return m;
  });
  const thread = k.line('#2B5BB0', 2, new Array(6).fill(0));
  root.add(thread);

  // ---- ĐÓNG NGỰC: hai ống dẫn lưu, dây điện cực tạm thời, 5 sợi chỉ thép xương ức, băng vết mổ
  const drainMat = new THREE.MeshPhysicalMaterial({color: '#E9D7D2', roughness: 0.2, transparent: true, opacity: 0.75, clearcoat: 1});
  const drains = [new THREE.Mesh(new THREE.BufferGeometry(), drainMat), new THREE.Mesh(new THREE.BufferGeometry(), drainMat)];
  const paceWire = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({color: '#2B6CB0', roughness: 0.4}));
  const steel = new THREE.MeshStandardMaterial({color: '#C9CED6', metalness: 0.9, roughness: 0.25});
  const wireMeshes = Array.from({length: WIRES}, () => new THREE.Mesh(new THREE.BufferGeometry(), steel));
  const wirePts: THREE.Vector3[] = [];
  const dressing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 5.0), new THREE.MeshStandardMaterial({color: '#F4F2EC', roughness: 0.95}));
  dressing.position.set(0, 0.305, -0.2);
  root.add(...drains, paceWire, ...wireMeshes, dressing);
  /** đầu ra của ống dẫn lưu / dây điện cực: qua da ngay dưới đầu dưới vết mổ */
  const EXIT = [new THREE.Vector3(-0.35, 0.33, 2.85), new THREE.Vector3(0.35, 0.33, 2.85), new THREE.Vector3(-0.8, 0.33, 2.8)];
  let closeT = 0;
  let sink = 0;
  let closeKey = '';
  const tubeAlong = (m: THREE.Mesh, pts: THREE.Vector3[], r: number) => {
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8, false);
  };

  // ---- vòng chỉ chỗ làm
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 10, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#D9481C', depthTest: false, transparent: true}));
  const small = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FFD27F', depthTest: false, transparent: true}));
  ring.renderOrder = small.renderOrder = 6;
  root.add(ring, small);
  const tag = k.label('', '#D9481C');

  /** gọi khi mô hình tim đã tải: lấy điểm thao tác trên đúng bộ phận */
  const init = () => {
    const on = (id: string, x: number, z: number, fallbackY: number) => h.onNode(id, x, z) ?? new THREE.Vector3(x, fallbackY, z);
    T.ao.copy(on('SH_aorta', 0.42, -2.0, 0.05));
    T.clamp.copy(on('SH_aorta', 0.3, -1.75, 0.05));
    T.root.copy(on('SH_aorta', 0.22, -1.45, 0.1));
    T.ra.set(-0.95, h.surfaceY(-0.95, -0.7), -0.7);
    // động mạch liên thất trước: điểm nối ở đoạn giữa–xa (z ≈ 0,9), chỗ hẹp ở đoạn gần (z ≈ 0)
    const near = (z: number) => h.ladPts.reduce((a, p) => (Math.abs(p.z - z) < Math.abs(a.z - z) ? p : a), h.ladPts[0] ?? new THREE.Vector3(0.15, 0.6, z));
    T.lad.copy(near(0.92)).add(new THREE.Vector3(0, 0.02, 0));
    T.plaque.copy(near(0.02));
    T.u.copy(near(1.12)).sub(near(0.72)).setY(0).normalize();
    T.w.set(-T.u.z, 0, T.u.x);
    // mũi khâu: vòng elip quanh miệng mở, đi từ gót (phía gần) vòng qua mũi rồi về gót
    stitchPts.length = 0;
    for (let i = 0; i < STITCHES; i++) {
      const th = Math.PI + (2 * Math.PI * i) / STITCHES;
      const p = T.lad.clone().addScaledVector(T.u, 0.11 * Math.cos(th)).addScaledVector(T.w, 0.05 * Math.sin(th));
      p.y = h.surfaceY(p.x, p.z) + 0.012;
      stitchPts.push(p);
    }
    plaque.position.copy(T.plaque).add(new THREE.Vector3(0, 0.01, 0));
    plaque.scale.set(0.07, 0.03, 0.07);
    plaque.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), T.u);
    slit.position.copy(T.lad);
    slit.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), T.u);
    stitchMeshes.forEach((m, i) => {
      m.position.copy(stitchPts[i]);
      // nửa vòng chỉ nhô lên, mặt phẳng vòng vuông góc mép miệng nối
      m.lookAt(T.lad.clone().setY(stitchPts[i].y));
    });
    for (const [o, p, tilt] of [[aoCann, T.ao, -0.6], [raCann, T.ra, 0.5], [rootNeedle, T.root, -0.3]] as const) {
      o.position.copy(p);
      o.rotation.set(tilt, 0, 0);
    }
    aoPurse.position.copy(T.ao);
    raPurse.position.copy(T.ra);
    const top = (o: THREE.Object3D) => o.localToWorld(new THREE.Vector3(0, 0.6, 0));
    root.updateMatrixWorld(true);
    tubeTo(lines.ao, top(aoCann), PUMP, 0.05);
    tubeTo(lines.ra, top(raCann), PUMP.clone().add(new THREE.Vector3(-1.4, 0, 0)), 0.06);
    tubeTo(lines.root, top(rootNeedle), PUMP.clone().add(new THREE.Vector3(-0.6, 0, 0)), 0.025);
    // đóng ngực: dẫn lưu dưới tim (khoang màng ngoài tim) và trước tim (trung thất), dây điện cực trên mặt thất phải, chỉ thép ở mép xương ức
    T.drainP.copy(h.onField(-0.3, 2.05) ?? new THREE.Vector3(-0.3, -0.5, 2.05)).add(new THREE.Vector3(0, 0.04, 0));
    T.drainM.copy(h.onField(0.85, -2.3) ?? new THREE.Vector3(0.85, -0.3, -2.3)).add(new THREE.Vector3(0, 0.04, 0));
    T.pace.set(-0.55, h.surfaceY(-0.55, 0.75) + 0.01, 0.75);
    wirePts.length = 0;
    for (const z of [-1.9, -1.1, -0.3, 0.5, 1.3]) wirePts.push(new THREE.Vector3(-2.36, 0.24, z), new THREE.Vector3(2.36, 0.24, z));
    ready = true;
    // chỉ khi phát triển: máy dò trình duyệt đọc điểm thao tác để chạy thử trọn ca
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__cabgScene?: unknown}).__cabgScene = {T, stitchPts, wirePts, cam: k.camera};
  };

  // ---- thao tác
  let cutting = -1;
  let plegiaStart = false;
  const xz = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrongTool = (need: CabgTool | null, have: CabgTool | null) => (need ? `Bước này cần ${CABG_TOOL_NAME[need].toLowerCase()} (khay bên phải); đang cầm ${have ? CABG_TOOL_NAME[have].toLowerCase() : 'tay không'}.` : 'Bước này do kíp làm: dùng nút ở bảng điều khiển.');
  /** một con trỏ; trả true nếu đang dùng */
  const pointer = (p: Ptr, n: number, hit: THREE.Vector3, dt: number): boolean => {
    if (!ready) return false;
    const s = h.state();
    const step = cabgStep(s);
    const need = cabgTool(step);
    const tool = s.tool;
    // rạch động mạch vành: kéo dọc đoạn ở vòng cam
    if (cutting === n) {
      p.hot = true;
      // tiến độ theo HÌNH CHIẾU trên màn hình của đoạn rạch (đầu gần → đầu xa của động mạch): không lệch do thị sai bề mặt
      const a = h.toNdc(v3.copy(T.lad).addScaledVector(T.u, -0.07));
      const b = h.toNdc(v3.copy(T.lad).addScaledVector(T.u, 0.07));
      const ab = b.clone().sub(a);
      const ap = p.ndc.clone().sub(a);
      const along = ap.dot(ab) / Math.max(1e-6, ab.lengthSq());
      const off = Math.abs(ap.x * ab.y - ap.y * ab.x) / Math.max(1e-6, ab.length());
      if (off < Math.max(0.05, p.reach * 0.6)) h.dispatch({t: 'cut', s: Math.max(0, Math.min(1, along))});
      if (!p.down) cutting = -1;
      return true;
    }
    // truyền liệt tim: giữ chụm ở gốc động mạch chủ
    if (tool === 'cannula' && step === 'plegia' && p.down && h.distAt(p.ndc.x, p.ndc.y, T.root) < Math.max(0.09, p.reach * 1.2)) {
      p.hot = true;
      if (!plegiaStart) {
        plegiaStart = true;
        h.dispatch({t: 'place', at: 'root', ok: true});
      }
      h.dispatch({t: 'plegia', dt});
      return true;
    }
    if (!p.pressed) {
      p.hot = !!tool && step !== 'done';
      return false;
    }
    if (!tool) return false;
    // trúng = con trỏ nằm trong tầm với quanh hình chiếu của điểm; gần = trong gấp đôi tầm đó (bấm lệch chỗ)
    const R = Math.max(0.06, p.reach * 0.8);
    const dd = (q: THREE.Vector3) => h.distAt(p.ndc.x, p.ndc.y, q);
    const near = (q: THREE.Vector3, k2 = 1) => dd(q) < R * k2;
    if (tool === 'cannula' && step === 'drains') {
      const next = s.drains === 0 ? T.drainP : T.drainM;
      if (near(T.drainP, 2) || near(T.drainM, 2)) return h.dispatch({t: 'drain', ok: near(next, 1.3)}), true;
    }
    if (tool === 'needle' && step === 'pacing' && near(T.pace, 2.5)) return h.dispatch({t: 'pace', ok: near(T.pace, 1.3)}), true;
    if (tool === 'needle' && (step === 'wires' || step === 'count')) {
      let best = -1;
      let bd = Infinity;
      wirePts.forEach((q, i) => {
        const d = dd(q);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (bd < R * 2.5) return h.dispatch({t: 'wire', ok: best === s.wireTaps && bd < R * 1.3}), true;
    }
    if (tool === 'cannula') {
      if (s.cannRa && !s.pump && s.reperfused && near(T.ra)) return h.dispatch({t: 'remove', at: 'ra'}), true;
      if (s.cannAo && s.reperfused && near(T.ao)) return h.dispatch({t: 'remove', at: 'ao'}), true;
      if (!s.cannAo && near(T.ao, 2)) return h.dispatch({t: 'place', at: 'ao', ok: near(T.ao)}), true;
      if (!s.cannRa && !s.reperfused && near(T.ra, 2)) return h.dispatch({t: 'place', at: 'ra', ok: near(T.ra)}), true;
      if ((step === 'xclamp' || step === 'plegia') && near(T.root, 1.5)) return h.dispatch({t: 'place', at: 'root', ok: true}), true;
    } else if (tool === 'clamp') {
      if (s.xclamp && near(T.clamp, 1.5)) return h.dispatch({t: 'remove', at: 'clamp'}), true;
      if (!s.xclamp && !s.reperfused && near(T.clamp, 2)) return h.dispatch({t: 'place', at: 'clamp', ok: near(T.clamp, 1.2)}), true;
    } else if (tool === 'scalpel') {
      if (near(T.lad, 2.5)) {
        if (step === 'arteriotomy') cutting = n;
        else h.dispatch({t: 'cut', s: 0});
        return true;
      }
    } else if (tool === 'needle') {
      if (step === 'anast' && near(T.lad, 3)) {
        // mũi đúng: điểm gần nhất là điểm kế tiếp và đủ sát (các điểm chỉ cách nhau vài chục điểm ảnh)
        const next = s.stitches;
        let best = -1;
        let bd = Infinity;
        stitchPts.forEach((q, i) => {
          const d = dd(q);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        h.dispatch({t: 'stitch', ok: best === next && bd < Math.max(0.035, p.reach * 0.35)});
        return true;
      }
    }
    if (need !== tool) h.dispatch({t: 'wrong', msg: wrongTool(need, tool)});
    return true;
  };

  const v3 = new THREE.Vector3();
  let shocks = 0;
  let jolt = 0;
  /** mỗi khung: hiện / ẩn và đặt vật theo trạng thái; `lead` = điểm con trỏ chính (để dụng cụ cầm tay đi theo) */
  const frame = (on: boolean, dt: number, now: number, lead: THREE.Vector3 | null, leadDown: boolean, trayAt: THREE.Vector3) => {
    root.visible = on && ready;
    const ch = h.chest();
    if (!root.visible) {
      tag(null);
      // chế độ khác: ngực mở, banh ngực đặt lại
      if (ch.R) ch.R.position.x = -2.34;
      if (ch.L) ch.L.position.x = 2.34;
      if (ch.retractor) ch.retractor.visible = true;
      return {jolt: 0, focus: null as THREE.Vector3 | null, sink: 0, pale: 0};
    }
    const s = h.state();
    const step = cabgStep(s);
    const v = cabgVitals(s);
    // ống thông cầm tay: theo con trỏ khi đang cầm, nằm ở khay khi không
    if (s.tool === 'cannula' && lead) {
      handCannula.position.set(lead.x, lead.y + (leadDown ? 0.0 : 0.2), lead.z);
      handCannula.rotation.set(-0.5, 0, 0.3);
    } else {
      handCannula.position.copy(trayAt);
      handCannula.rotation.set(0, 0, Math.PI / 2);
    }
    aoCann.visible = aoPurse.visible = lines.ao.visible = s.cannAo;
    raCann.visible = raPurse.visible = lines.ra.visible = s.cannRa;
    rootNeedle.visible = lines.root.visible = s.plegia > 0 && !s.reperfused;
    // máu trong đường ống: trong suốt trước khi chạy máy; động mạch đỏ tươi, tĩnh mạch đỏ sẫm; liệt tim (máu pha) đỏ cam
    (lines.ao.material as THREE.MeshPhysicalMaterial).color.set(v.pumpFlow > 0 || s.cannAo ? '#C8102E' : '#DDE8EE');
    (lines.ra.material as THREE.MeshPhysicalMaterial).color.set(v.pumpFlow > 0 ? '#5A0A16' : '#DDE8EE');
    (lines.root.material as THREE.MeshPhysicalMaterial).color.set(step === 'plegia' ? '#E06A3A' : '#F1EAD8');
    // kẹp ngang động mạch chủ
    if (s.xclamp && !xClamp) {
      const src = h.clampModel();
      if (src) {
        xClamp = src.clone(true);
        xClamp.scale.setScalar(1.35);
        xClamp.position.copy(T.clamp).add(v3.set(0, 0.03, 0));
        xClamp.rotation.set(0, Math.PI / 2 + 0.25, 0.3, 'YXZ');
        root.add(xClamp);
      }
    }
    if (xClamp) xClamp.visible = s.xclamp;
    // miệng mở + cầu nối
    slit.visible = s.arteriotomy > 0;
    slit.scale.set(0.1 * Math.max(0.05, s.arteriotomy), 1, 1);
    const f = s.stitches / STITCHES;
    const parachute = f * f * (3 - 2 * f);
    graftEnd.copy(LIMA_REST).lerp(v3.copy(T.lad).add(new THREE.Vector3(0, 0.035, 0)), s.stitches >= STITCHES ? 1 : parachute * 0.85);
    layGraft(graftEnd);
    bulldog.position.copy(graftEnd).add(v3.set(-0.12, 0.02, -0.1));
    // kẹp bulldog trên cầu nối được mở khi thả kẹp động mạch chủ (máu vào cầu nối)
    bulldog.visible = !s.reperfused;
    stitchMeshes.forEach((m, i) => (m.visible = i < s.stitches));
    const last = s.stitches ? stitchPts[s.stitches - 1] : null;
    // khâu vắt: MỘT sợi chỉ chạy qua mọi mũi đã khâu; đang khâu thì nối tới đầu cầu nối, xong thì khép vòng về mũi đầu (nút buộc)
    thread.visible = !!last;
    if (last) {
      const pts = stitchPts.slice(0, s.stitches).flatMap((q) => [q.x, q.y + 0.006, q.z]);
      const tail = s.stitches < STITCHES ? graftEnd : stitchPts[0];
      setLine(thread, [...pts, tail.x, tail.y + 0.006, tail.z]);
    }

    // vòng chỉ chỗ làm của bước hiện tại
    const pulse = 1 + 0.12 * Math.sin(now / 180);
    let spot: THREE.Vector3 | null = null;
    let tiny: THREE.Vector3 | null = null;
    if (step === 'cannAo' || step === 'decanAo') spot = T.ao;
    else if (step === 'cannRa' || step === 'decanRa') spot = T.ra;
    else if (step === 'xclamp' || step === 'unclamp') spot = T.clamp;
    else if (step === 'plegia') spot = T.root;
    else if (step === 'drains') spot = s.drains === 0 ? T.drainP : T.drainM;
    else if (step === 'pacing') spot = T.pace;
    else if (step === 'wires') {
      spot = wirePts[s.wireTaps] ?? null;
      tiny = spot;
    }
    else if (step === 'arteriotomy') spot = T.lad;
    else if (step === 'anast') {
      spot = T.lad;
      tiny = stitchPts[s.stitches] ?? null;
    }
    ring.visible = !!spot;
    if (spot) {
      ring.position.copy(spot).add(v3.set(0, 0.05, 0));
      ring.scale.setScalar(pulse);
    }
    small.visible = !!tiny;
    if (tiny) small.position.copy(tiny).add(v3.set(0, 0.01, 0));
    const meta = CABG_STEPS.find((x) => x.id === step);
    tag(spot && meta ? v3.copy(spot).add(new THREE.Vector3(0, 0.55, 0)) : null, undefined, meta ? meta.name : '');
    // sốc điện: tim giật một nhịp
    if (s.shocks !== shocks) {
      shocks = s.shocks;
      jolt = 1;
    }
    jolt = Math.max(0, jolt - dt * 5);

    // ---- đóng ngực
    const wiresDone = s.wireTaps >= WIRES * 2;
    // tháo banh ngực (và cắt chỉ treo màng ngoài tim) trước khi luồn chỉ thép
    if (ch.retractor) ch.retractor.visible = !(step === 'wires' || step === 'skin' || step === 'signout' || step === 'done');
    closeT = Math.min(1, closeT + (wiresDone ? dt / 2.5 : -closeT));
    const e = closeT * closeT * (3 - 2 * closeT);
    // tim, phổi, cầu nối hạ xuống lòng ngực khi hai nửa xương ức khép lại (trong ca, nôi màng ngoài tim nâng tim lên cao)
    sink = 0.85 * e;
    root.position.y = -sink;
    const gap = 2.34 * (1 - e) + 0.004;
    if (ch.R) ch.R.position.x = -gap;
    if (ch.L) ch.L.position.x = gap;
    drains.forEach((m, i) => (m.visible = s.drains > i));
    paceWire.visible = s.pacing;
    dressing.visible = s.skin;
    const key = `${s.drains}|${s.pacing}|${s.wireTaps}|${closeT.toFixed(3)}`;
    if (key !== closeKey) {
      closeKey = key;
      // đầu trong theo tim (đã hạ), đầu ngoài cố định ở da dưới vết mổ: bù lại độ hạ của nhóm
      const up = new THREE.Vector3(0, sink, 0);
      const out = (q: THREE.Vector3) => q.clone().add(up);
      for (const [i, from] of [T.drainP, T.drainM].entries()) if (s.drains > i) tubeAlong(drains[i], [from, from.clone().add(new THREE.Vector3(0, 0.25, i ? 0.4 : 0.25)), out(EXIT[i]).add(new THREE.Vector3(0, 0.12, -0.25)), out(EXIT[i]), out(EXIT[i]).add(new THREE.Vector3(i ? 0.4 : -0.4, 0, 1.1))], 0.045);
      if (s.pacing) tubeAlong(paceWire, [T.pace, T.pace.clone().add(new THREE.Vector3(-0.1, 0.3, 0.4)), out(EXIT[2]).add(new THREE.Vector3(0, 0.1, -0.2)), out(EXIT[2]), out(EXIT[2]).add(new THREE.Vector3(-0.5, 0, 0.9))], 0.008);
      // chỉ thép: vòng qua hai mép xương ức; khi khép thì hai mép sát nhau, sợi xoắn chặt ở giữa
      wireMeshes.forEach((m, k2) => {
        m.visible = s.wireTaps >= k2 * 2 + 2;
        if (!m.visible) return;
        const z = wirePts[k2 * 2].z;
        const xr = -gap - 0.02;
        const xl = gap + 0.02;
        const y = 0.24 + sink;
        const lift = 0.05 + 0.5 * (1 - e);
        tubeAlong(m, [new THREE.Vector3(xr, y - 0.12, z), new THREE.Vector3(xr, y + 0.02, z), new THREE.Vector3((xr + xl) / 2, y + lift, z), new THREE.Vector3(xl, y + 0.02, z), new THREE.Vector3(xl, y - 0.12, z)], 0.012);
      });
    }
    // da khép: băng nằm trên đường giữa (nhóm đã hạ nên bù độ hạ)
    dressing.position.y = 0.305 + sink;
    // tim nhợt, mềm khi liệt tim lạnh; hồng trở lại khi được tưới máu
    const pale = s.reperfused ? 0 : s.rhythm === 'arrest' ? 1 : s.rhythm === 'slowing' ? Math.min(1, s.plegia / 3) : 0;
    // kính lúp phẫu thuật: mở động mạch vành và khâu nối là vi phẫu (mạch 1,5–2 mm) nên máy quay phóng vào chỗ nối
    const focus = step === 'arteriotomy' || step === 'anast' ? T.lad : null;
    return {jolt, focus, sink, pale};
  };
  return {init, pointer, frame};
}
