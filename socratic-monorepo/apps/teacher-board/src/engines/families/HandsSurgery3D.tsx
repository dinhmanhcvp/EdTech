'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {cutAdvance, pointAt} from '../../utils/lab/hands/dissect';
import {INCISION, LAYERS, SURG_NAME, SURG_TOOLS, STEP_DO, STEP_TOOL, alarms, capnoAt, ecgAt, lungVolAt, mapOf, peelable, plethAt, surgStep, type SAction, type SurgState, type SurgTool} from '../../utils/lab/hands/surgery';
import {cardiacPhase} from './heart3d';
import {CABG_STEPS, CABG_TOOL_NAME, cabgStep, cabgTool, cabgVitals, monitorLanes, type CabgAction, type CabgState, type CabgTool, type MonitorState} from '../../utils/lab/hands/cabg';
import {makeCabg} from './surgCabg';
import {handPointers, type HandsInput} from './handsKit';
import {oneEuro} from '../../utils/lab/hands/handTracker';
import {glassify, loadModel} from './labParts';
import {clothTexture, organAll, surgPost} from './surgLook';
import {Stage3D, setLine, type SceneDef} from './Stage3D';

export type SurgMode = 'cabg' | 'slice' | 'peel' | 'surgery';
export type SliceAxis = 'front' | 'short' | 'side';
export type OrView = 'field' | 'room';
/** trạng thái dùng chung giữa bảng React và cảnh (React ghi, cảnh đọc mỗi khung hình; cảnh gọi lại qua các hàm) */
export interface SurgeryLive {
  mode: SurgMode;
  st: SurgState;
  dispatch: (a: SAction) => void;
  peeled: number;
  setPeeled: (n: number) => void;
  slice: {axis: SliceAxis; off: number; tilt: number; locked: boolean};
  /** góc nhìn: trường mổ (phẫu thuật viên) hoặc toàn phòng */
  view: OrView;
  /** ca bắc cầu động mạch vành (chế độ `cabg`) */
  cabg: CabgState;
  cabgDispatch: (a: CabgAction) => void;
}
/** ô trên khay Mayo dùng chung: ở ca bắc cầu, ô ống hút là ống thông */
const CABG_OF: Record<SurgTool, CabgTool> = {scalpel: 'scalpel', clamp: 'clamp', suction: 'cannula', needle: 'needle'};
const SLOT_OF: Record<CabgTool, SurgTool> = {scalpel: 'scalpel', clamp: 'clamp', cannula: 'suction', needle: 'needle'};
const CABG_LABEL = CABG_TOOL_NAME;
/** vị trí máy quay so với chỗ nối khi đeo kính lúp phẫu thuật */
const LOUPE = new THREE.Vector3(0.15, 1.7, 1.25);

const ORANGE = '#D9481C';
/** dụng cụ trên khay Mayo bên phải: mũi ở x = 3,25, thân dọc +x */
const SLOT: Record<SurgTool, number> = {scalpel: -1.2, clamp: -0.4, suction: 0.4, needle: 1.2};
const TRAY_X = 3.25;
const TRAY_Y = 0.36;
const HOLD: Record<SurgTool, THREE.Euler> = {
  scalpel: new THREE.Euler(0, -0.6, 0.6, 'YXZ'),
  clamp: new THREE.Euler(0, -0.6, 0.5, 'YXZ'),
  suction: new THREE.Euler(0, -0.6, 0.75, 'YXZ'),
  needle: new THREE.Euler(0, -0.6, 0.5, 'YXZ'),
};
/** tên và chức năng khi chỉ vào một bộ phận (nút GLB) */
const INFO: Record<string, [string, string]> = {
  SH_peri: ['Màng ngoài tim', 'Túi hai lá bọc tim, giữa hai lá có ít dịch giúp tim co bóp trơn.'],
  SH_lad: ['Động mạch liên thất trước', 'Nhánh lớn nhất của động mạch vành trái, nuôi thành trước và vách liên thất. Vùng cấm của dao mổ.'],
  SH_cor: ['Mạch vành', 'Động mạch vành phải, các nhánh chéo và tĩnh mạch tim lớn trên mặt trước.'],
  SH_valve_tri: ['Van ba lá', 'Van nhĩ–thất phải; dây chằng nối cơ nhú giữ van không lật lên nhĩ khi thất co.'],
  SH_valve_mit: ['Van hai lá', 'Van nhĩ–thất trái: chỉ cho máu đi từ nhĩ trái xuống thất trái.'],
  SH_valve_ao: ['Van động mạch chủ', 'Van tổ chim ba túi ở gốc động mạch chủ: đóng khi thất giãn để máu không chảy ngược.'],
  SH_valve_pa: ['Van động mạch phổi', 'Van tổ chim ba túi ở gốc động mạch phổi.'],
  SH_aorta: ['Động mạch chủ', 'Đưa máu giàu O₂ từ thất trái đi khắp cơ thể; thành dày, đàn hồi.'],
  SH_pa: ['Động mạch phổi', 'Đưa máu nghèo O₂ từ thất phải lên hai phổi.'],
  SH_vc: ['Tĩnh mạch chủ', 'Tĩnh mạch chủ trên và dưới đưa máu nghèo O₂ về nhĩ phải.'],
  SH_pv: ['Tĩnh mạch phổi', 'Đưa máu giàu O₂ từ phổi về nhĩ trái.'],
};
/** thành tim: gọi tên theo vùng (toạ độ của tim đứng: x < 0,05 là bên phải cơ thể, y > 0,22 là tầng nhĩ) */
const wallName = (lx: number, ly: number) => `${ly > 0.22 ? 'Tâm nhĩ' : 'Tâm thất'} ${lx < 0.05 ? 'phải' : 'trái'}`;
const WALL_FN: Record<string, string> = {
  'Tâm nhĩ phải': 'Thành mỏng; nhận máu nghèo O₂ từ tĩnh mạch chủ.',
  'Tâm nhĩ trái': 'Nhận máu giàu O₂ từ tĩnh mạch phổi.',
  'Tâm thất phải': 'Thành mỏng hơn thất trái: chỉ bơm máu lên phổi, áp lực thấp.',
  'Tâm thất trái': 'Thành dày nhất (gấp ~3 lần thất phải): bơm máu đi khắp cơ thể với áp lực cao.',
};
const SLICE_NOTE: Record<SliceAxis, string> = {
  front: 'Mặt cắt bốn buồng (song song mặt trước): thấy cùng lúc hai nhĩ, hai thất, vách liên thất và hai van nhĩ–thất.',
  short: 'Mặt cắt ngang trục ngắn: thất trái tròn, thành dày; thất phải hình lưỡi liềm ôm bên phải.',
  side: 'Mặt cắt dọc trái–phải: thấy đường máu từ thất ra gốc động mạch.',
};
/** dải lệch của mặt cắt theo từng hướng (hệ cảnh) */
const RANGE: Record<SliceAxis, [number, number]> = {front: [-0.7, 0.85], short: [-1.6, 1.4], side: [-1.2, 1.4]};
/** chỗ đặt gạc quanh tim trong khoang (x, z); độ cao lấy theo mặt khoang lúc nạp */
const GAUZE_AT: [number, number][] = [[-1.75, 1.45], [1.8, 1.25], [-1.7, -1.2], [1.75, -1.0], [-1.1, 2.1], [1.15, 2.05], [0, 2.5], [-2.0, 0.2], [2.05, 0.15], [0.1, -2.1]];
/** máy quay và điểm nhìn của hai góc nhìn; `field` trùng góc mở đầu của `def` */
const VIEWS: Record<OrView, {cam: THREE.Vector3; at: THREE.Vector3}> = {
  field: {cam: new THREE.Vector3(0.95, 4.52, 5.53), at: new THREE.Vector3(0.95, -0.1, 0.4)},
  room: {cam: new THREE.Vector3(31, 15, 21), at: new THREE.Vector3(-3, 1, -3)},
};
/** vị trí màn hình monitor trên khung của máy gây mê (`OR_anesthesia`) */
const SCREEN_AT: [number, number, number] = [-15.5, 17.6, -20.78];
const N_CUT = 48;
const PATH_N = 24;

type Mats = THREE.MeshStandardMaterial[];
const matsOf = (o: THREE.Object3D): Mats => {
  const out: Mats = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) out.push(m.material as THREE.MeshStandardMaterial);
  });
  return out;
};

/** vân cơ tim cho nắp lát cắt: sợi cơ xoắn, đỏ hồng, vài mạch nhỏ */
function muscleTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#A8404A';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const y = (i * 37) % 256;
    const x = (i * 91) % 256;
    g.strokeStyle = i % 3 ? 'rgba(140,40,52,0.55)' : 'rgba(196,96,104,0.5)';
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(x - 30, y);
    g.bezierCurveTo(x - 10, y - 6, x + 10, y + 6, x + 30, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(232,207,146,0.6)';
  for (let i = 0; i < 18; i++) g.fillRect((i * 53) % 256, (i * 29) % 256, 3, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** gạc: sợi đan trắng, thấm máu ở giữa */
function gauzeTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#F4F0E8';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(150,140,125,0.35)';
  for (let i = 0; i < 128; i += 4) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 128);
    g.moveTo(0, i);
    g.lineTo(128, i);
    g.stroke();
  }
  const r = g.createRadialGradient(62, 70, 6, 64, 64, 58);
  r.addColorStop(0, 'rgba(122,10,20,0.85)');
  r.addColorStop(0.6, 'rgba(160,24,32,0.45)');
  r.addColorStop(1, 'rgba(160,24,32,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** vẽ màn hình monitor gắn trên máy gây mê: ba sóng cuộn theo thời gian và các chỉ số */
function drawScreen(g: CanvasRenderingContext2D, v: SurgState['vitals'], time: number, m: MonitorState = {rhythm: 'sinus', pulsatile: true, vent: true}) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  g.fillStyle = '#04100C';
  g.fillRect(0, 0, W, H);
  const plot = W * 0.62;
  const traces: [string, (t: number) => number, number, number][] = [
    ['#46F08C', (t) => monitorLanes(m, [ecgAt((t * v.hr) / 60 % 1), 0, 0], t)[0], H * 0.2, H * 0.14],
    ['#7AD8F7', (t) => -monitorLanes(m, [0, plethAt((t * v.hr) / 60 % 1), 0], t)[1], H * 0.58, H * 0.17],
    ['#F7E27A', (t) => -monitorLanes(m, [0, 0, capnoAt((t * v.rr) / 60 % 1) * (v.etco2 / 40)], t)[2], H * 0.92, H * 0.2],
  ];
  g.lineWidth = 2;
  for (const [col, fn, y0, a] of traces) {
    g.strokeStyle = col;
    g.beginPath();
    for (let x = 0; x <= plot; x += 2) {
      const y = y0 + fn(time - ((plot - x) / plot) * 4) * a;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  const rows: [string, string, string][] = [
    ['HR', String(Math.round(v.hr)), v.hr > 110 ? '#FF6B5A' : '#46F08C'],
    ['ABP', `${Math.round(v.sys)}/${Math.round(v.dia)}`, v.sys < 90 ? '#FF6B5A' : '#F7A8A0'],
    ['SpO₂', String(Math.round(v.spo2)), v.spo2 < 94 ? '#FF6B5A' : '#7AD8F7'],
    ['EtCO₂', String(Math.round(v.etco2)), v.etco2 < 25 ? '#FF6B5A' : '#F7E27A'],
  ];
  rows.forEach(([k, val, col], i) => {
    const y = 8 + (i * H) / 4;
    g.fillStyle = col;
    g.font = '600 18px monospace';
    g.fillText(k, plot + 12, y + 16);
    g.font = '700 46px monospace';
    g.fillText(val, plot + 12, y + 60);
  });
  if (alarms(v).length) {
    g.fillStyle = 'rgba(255,70,50,0.9)';
    g.fillRect(0, 0, plot, 26);
    g.fillStyle = '#FFF';
    g.font = '700 18px monospace';
    g.fillText(alarms(v)[0], 8, 19);
  }
}

function makeDef(input: HandsInput, live: SurgeryLive): SceneDef {
  return {
    floor: true,
    room: true,
    stencil: true,
    post: surgPost('open'),
    dist: 6.9,
    target: [0.95, -0.1, 0.4],
    orbit: () => [0, 42],
    setup: (k) => {
      const P = handPointers(k, input, 0.5);
      const ray = new THREE.Raycaster();
      const v2 = new THREE.Vector2();
      const v3 = new THREE.Vector3();
      const w3 = new THREE.Vector3();
      const qt = new THREE.Quaternion();
      const box = new THREE.Box3();
      const DOWN = new THREE.Vector3(0, -1, 0);

      // phòng rộng ~5 m: mở tầm nhìn xa của máy quay, bỏ sương để thấy hết tường
      k.scene.background = new THREE.Color('#B9CCC6');
      k.scene.fog = null;
      k.camera.far = 220;
      k.camera.updateProjectionMatrix();
      k.controls.maxDistance = 42;
      // đèn mổ: chùm sáng trắng ấm từ trên chiếu thẳng vào trường mổ
      const lamp = new THREE.SpotLight('#FFF4E6', 20, 18, 0.5, 0.45, 1.4);
      lamp.position.set(0.4, 8, 2.5);
      lamp.target.position.set(0, 0, 0.2);
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(1024, 1024);
      k.scene.add(lamp, lamp.target);
      const lamp2 = new THREE.SpotLight('#F4F8FF', 7, 18, 0.55, 0.6, 1.4);
      lamp2.position.set(3.6, 7.5, -2.2);
      lamp2.target.position.set(0, 0, 0.2);
      k.scene.add(lamp2, lamp2.target);
      // màn hình monitor trong phòng
      const screenCv = document.createElement('canvas');
      screenCv.width = 512;
      screenCv.height = 340;
      const screenTex = new THREE.CanvasTexture(screenCv);
      screenTex.colorSpace = THREE.SRGBColorSpace;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(13, 8.7), new THREE.MeshBasicMaterial({map: screenTex, toneMapped: false}));
      screen.position.set(...SCREEN_AT);
      screen.visible = false;
      k.scene.add(screen);
      let screenAt = 0;

      // tim nằm ngửa: nhóm `heart` xoay −90° quanh x (mặt trước lên trời); nhóm `beat` co bóp quanh tâm tim
      const heart = new THREE.Group();
      heart.rotation.x = -Math.PI / 2;
      k.scene.add(heart);
      const BEAT_C = new THREE.Vector3(0.05, -0.3, 0);
      const beat = new THREE.Group();
      beat.position.copy(BEAT_C);
      heart.add(beat);

      let ready = false;
      const nodes = new Map<string, THREE.Object3D>();
      const home = new Map<string, THREE.Vector3>();
      const tools = new Map<SurgTool, THREE.Object3D>();
      const toolMats = new Map<SurgTool, Mats>();
      const toolTags = new Map<SurgTool, ReturnType<typeof k.label>>();
      const pickable: THREE.Object3D[] = [];
      let periMat: THREE.MeshStandardMaterial | null = null;
      const ladPts: THREE.Vector3[] = [];
      const veinPts: THREE.Vector3[] = [];
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
      const card = k.card(ORANGE);
      k.caption('Đang tải tim phẫu thuật…');

      // ---- nắp lát cắt (stencil): mặt sau / mặt trước của khối kín cộng / trừ stencil → bên trong khối = khác 0 → vẽ nắp cơ tim
      const cap = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 9),
        new THREE.MeshStandardMaterial({map: muscleTexture(), color: '#C25A64', roughness: 0.55, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp}),
      );
      cap.renderOrder = 2;
      cap.visible = false;
      k.scene.add(cap);
      const frame = k.line(ORANGE, 2, new Array(15).fill(0));
      frame.visible = false;
      k.scene.add(frame);
      const writers: THREE.Mesh[] = [];
      const stencilOf = (o: THREE.Object3D) =>
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh || m.userData.stencil) return;
          // hai lượt: mặt sau +1, mặt trước −1 (quấn vòng) → trong khối kín còn lại khác 0; khối chồng nhau vẫn đúng
          for (const [side, op] of [[THREE.BackSide, THREE.IncrementWrapStencilOp], [THREE.FrontSide, THREE.DecrementWrapStencilOp]] as const) {
            const s = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false, depthTest: false, side, clippingPlanes: [plane], stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op}));
            s.userData.stencil = true;
            s.renderOrder = 1;
            s.raycast = () => {};
            writers.push(s);
            m.add(s);
          }
        });

      // ---- màng ngoài tim: rạch thật (bỏ điểm ảnh dọc đường rạch đã đi qua, mép tách hé) và khâu lại (đoạn đã khâu khép kín)
      const peri = {path: Array.from({length: PATH_N}, () => new THREE.Vector3()), prog: {value: 0}, sew: {value: 0}, half: {value: 0.03}};
      const periShader = (m: THREE.MeshStandardMaterial) => {
        m.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, {uPath: {value: peri.path}, uProg: peri.prog, uSew: peri.sew, uHalf: peri.half});
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', `#include <common>\nuniform vec3 uPath[${PATH_N}];\nuniform float uProg;\nuniform float uSew;\nuniform float uHalf;\nvarying float vCutD;\nvarying float vCutT;`)
            .replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              float bd = 1e3; float bt = 0.0;
              for (int i = 0; i < ${PATH_N - 1}; i++) {
                vec3 a = uPath[i]; vec3 b = uPath[i + 1]; vec3 ab = b - a;
                float h = clamp(dot(transformed - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
                float d = length(transformed - a - ab * h);
                if (d < bd) { bd = d; bt = (float(i) + h) / ${(PATH_N - 1).toFixed(1)}; }
              }
              vCutD = bd; vCutT = bt;
              // mép rạch hé ra: đỉnh gần đường rạch (đoạn đã rạch, chưa khâu) bị đẩy sang hai bên và lún nhẹ
              float open = (bt <= uProg && bt >= uSew) ? smoothstep(uHalf * 3.0, 0.0, bd) : 0.0;
              transformed -= objectNormal * open * 0.03;`,
            );
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform float uProg;\nuniform float uSew;\nuniform float uHalf;\nvarying float vCutD;\nvarying float vCutT;')
            .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCutT <= uProg && vCutT >= uSew && vCutD < uHalf) discard;\nfloat wet = (vCutT <= uProg && vCutT >= uSew) ? smoothstep(uHalf * 2.6, uHalf, vCutD) : 0.0;')
            // mép rạch ướt máu: đỏ thẫm, đục, bóng (nhám 0,1)
            .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.04, 0.06), wet);\ndiffuseColor.a = mix(diffuseColor.a, 1.0, wet);')
            .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.1, wet);');
        };
        m.needsUpdate = true;
      };

      const lungs: {o: THREE.Object3D; side: number; x: number; y: number}[] = [];
      const chest: {R: THREE.Object3D | null; L: THREE.Object3D | null; retractor: THREE.Object3D | null} = {R: null, L: null, retractor: null};
      /** màu gốc của vật liệu tim (để làm nhợt khi liệt tim lạnh) */
      const heartCols = new Map<THREE.MeshStandardMaterial, THREE.Color>();
      const PALE = new THREE.Color('#E4CFCA');
      const PALE_GLOW = new THREE.Color('#3A2A28');
      let heartY0: number | null = null;
      /** ca bắc cầu động mạch vành (dựng khi mô hình đã tải) */
      let cabg: ReturnType<typeof makeCabg> | null = null;
      // thiếu mô hình phòng thì vẫn mổ được trên nền trơn
      void Promise.all([loadModel('/models/surgery-heart.glb'), loadModel('/models/dissect-parts.glb'), loadModel('/models/or-room.glb').catch(() => null)])
        .then(([lib, dlib, room]) => {
          const take = (src: THREE.Object3D | undefined, parent: THREE.Object3D) => {
            if (!src) return null;
            const o = src.clone(true);
            o.traverse((c) => {
              const m = c as THREE.Mesh;
              if (!m.isMesh) return;
              m.material = (m.material as THREE.Material).clone();
              m.castShadow = m.receiveShadow = true;
            });
            parent.add(o);
            return o;
          };
          for (const src of room?.children ?? []) {
            if (!src.name.startsWith('OR_')) continue;
            const o = take(src, k.scene);
            // tường, sàn, trần chỉ nhận bóng; đèn mổ không chắn chùm sáng của chính nó
            if (src.name === 'OR_shell' || src.name === 'OR_lamps') o?.traverse((c) => (c.castShadow = false));
          }
          screen.visible = !!room;
          const field = take(lib.getObjectByName('SH_field'), k.scene);
          // hai nửa thành ngực + banh ngực (nút riêng để đóng ngực ở cuối ca bắc cầu)
          chest.R = take(lib.getObjectByName('SHL_chestR'), k.scene);
          chest.L = take(lib.getObjectByName('SHL_chestL'), k.scene);
          chest.retractor = take(lib.getObjectByName('SHL_retractor'), k.scene);
          for (const o of [chest.R, chest.L]) if (o) organAll(o, 'muscle', 0.8);
          // hai lá phổi thật (thùy, rãnh liên thùy) nằm dưới mép xương ức, thở theo máy thở
          for (const [name, side] of [['SHL_lungR', -1], ['SHL_lungL', 1]] as const) {
            const o = take(lib.getObjectByName(name), k.scene);
            if (!o) continue;
            organAll(o, 'lung', 0.9);
            lungs.push({o, side, x: o.position.x, y: o.position.y});
          }
          if (field) {
            // bóng ướt chỉ cho mô (khoang ngực, phổi, mép vết mổ); khăn và thép giữ mặt mờ để dụng cụ nổi trên khay
            field.traverse((c) => {
              const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
              if (!m) return;
              if (/^(bowl|lg|fat|skin)/.test(m.name)) organAll(c, 'peritoneum', 0.8);
              // lòng khoang ngực tối hơn tim để tim nổi lên dưới đèn mổ
              if (m.name.startsWith('bowl')) m.color.set('#7A4848');
              if (m.name === 'cloth' || m.name === 'drape') {
                m.color.set(m.name === 'cloth' ? '#174A46' : '#2A6661');
                m.map = clothTexture('#FFFFFF', 10);
                m.needsUpdate = true;
              }
            });
          }
          for (const src of lib.children) {
            if (!src.name.startsWith('SH_') || src.name === 'SH_field') continue;
            // màng ngoài tim không co theo tim (đường rạch phải đứng yên); còn lại đập trong nhóm `beat`
            const o = take(src, src.name === 'SH_peri' ? heart : beat)!;
            if (src.name !== 'SH_peri') o.position.sub(BEAT_C);
            o.userData.part = src.name;
            nodes.set(src.name, o);
            home.set(src.name, o.position.clone());
            pickable.push(o);
            matsOf(o).forEach((m) => (m.clippingPlanes = [plane]));
          }
          for (const id of ['SH_wall_front', 'SH_wall_back']) {
            const o = nodes.get(id);
            if (o) {
              stencilOf(o);
            }
          }
          // mọi phần của tim trừ màng ngoài (trong suốt, có shader rạch riêng)
          for (const [id, o] of nodes) if (id !== 'SH_peri') organAll(o, 'heart');
          const p = nodes.get('SH_peri');
          if (p) {
            periMat = matsOf(p)[0] ?? null;
            if (periMat) {
              // màng mỏng trong như giấy bóng: chỉ hai lớp mặt của túi chồng nhau đã đủ đục, nên độ đục thấp và chỉ vẽ mặt ngoài
              Object.assign(periMat, {transparent: true, opacity: 0.16, depthWrite: false, side: THREE.FrontSide});
              periMat.color.set('#F6DDD2');
              if ('clearcoat' in periMat) Object.assign(periMat, {clearcoat: 1, clearcoatRoughness: 0.08});
              periShader(periMat);
            }
          }
          const t = {scalpel: dlib.getObjectByName('TOOL_scalpel'), clamp: lib.getObjectByName('TOOL_clamp'), suction: lib.getObjectByName('TOOL_suction'), needle: lib.getObjectByName('TOOL_needle')};
          for (const id of SURG_TOOLS) {
            const o = take(t[id], k.scene);
            if (!o) continue;
            if (id === 'suction') glassify(o, 0.35);
            tools.set(id, o);
            toolMats.set(id, matsOf(o));
            toolTags.set(id, k.label(SURG_NAME[id], '#F3EFE6', true));
          }
          k.scene.updateMatrixWorld(true);
          // điểm của động mạch liên thất trước (vùng cấm): lấy mẫu đỉnh lưới, hệ thế giới
          nodes.get('SH_lad')?.traverse((c) => {
            const m = c as THREE.Mesh;
            if (!m.isMesh) return;
            const pos = m.geometry.getAttribute('position');
            for (let i = 0; i < pos.count; i += 6) ladPts.push(m.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, i)));
          });
          // tĩnh mạch tim lớn (vật liệu `cv` trong `SH_cor`): cắt vào thì rỉ máu tĩnh mạch
          nodes.get('SH_cor')?.traverse((c) => {
            const m = c as THREE.Mesh;
            if (!m.isMesh || (m.material as THREE.Material).name !== 'cv') return;
            const pos = m.geometry.getAttribute('position');
            for (let i = 0; i < pos.count; i += 6) veinPts.push(m.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, i)));
          });
          // đường rạch dán lên mặt màng ngoài tim; đưa về hệ của lưới màng để shader bỏ điểm ảnh đúng chỗ
          layCut();
          cabg = makeCabg({
            k,
            onNode: (id, x, z) => {
              const o = nodes.get(id);
              if (!o) return null;
              ray.set(v3.set(x, 6, z), DOWN);
              const hit = ray.intersectObject(o, true)[0];
              return hit ? hit.point.clone() : null;
            },
            surfaceY: (x, z) => {
              ray.set(v3.set(x, 6, z), DOWN);
              const parts = pickable.filter((o) => o.visible && o.userData.part !== 'SH_peri');
              return ray.intersectObjects(parts, true)[0]?.point.y ?? 0.5;
            },
            ladPts,
            clampModel: () => tools.get('clamp'),
            dispatch: (a) => live.cabgDispatch(a),
            distAt: (nx, ny, q) => P.distAt(nx, ny, q),
            onField: (x, z) => {
              if (!field) return null;
              ray.set(v3.set(x, 6, z), DOWN);
              const hit = ray.intersectObject(field, true)[0];
              return hit ? hit.point.clone() : null;
            },
            chest: () => chest,
            toNdc: (q) => {
              const v = q.clone().project(k.camera);
              return new THREE.Vector2(v.x, v.y);
            },
            state: () => live.cabg,
          });
          cabg.init();
          if (field)
            gauzes.forEach((g, i) => {
              const [x, z] = GAUZE_AT[i];
              ray.set(v3.set(x, 4, z), DOWN);
              g.position.set(x, (ray.intersectObject(field, true)[0]?.point.y ?? -0.3) + 0.05, z);
            });
          const pm = (() => {
            let mesh: THREE.Mesh | null = null;
            p?.traverse((c) => {
              if ((c as THREE.Mesh).isMesh && !mesh) mesh = c as THREE.Mesh;
            });
            return mesh as THREE.Mesh | null;
          })();
          if (pm) peri.path.forEach((q, i) => q.copy(pm.worldToLocal(cutPts[Math.round((i / (PATH_N - 1)) * (N_CUT - 1))].clone())));
          ready = true;
          if (process.env.NODE_ENV !== 'production') (window as unknown as {__surgScene?: object}).__surgScene = {cap, writers, plane, nodes, k, drops};
        })
        .catch(() => k.caption('Không tải được mô hình (models/surgery-heart.glb). Tải lại trang để thử lại.'));

      const visibleParts = () => pickable.filter((o) => o.visible);
      const hitParts = (nx: number, ny: number) => {
        ray.setFromCamera(v2.set(nx, ny), k.camera);
        return ray.intersectObjects(visibleParts(), true).find((h) => !h.object.userData.stencil && plane.distanceToPoint(h.point) >= -0.001) ?? null;
      };
      const partOf = (o: THREE.Object3D | null) => {
        for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part as string;
        return null;
      };
      const surfaceY = (x: number, z: number) => {
        ray.set(v3.set(x, 6, z), DOWN);
        return ray.intersectObjects(visibleParts(), true)[0]?.point.y ?? 0.5;
      };

      // ---- đường rạch: vạch chấm (chưa rạch), đường đỏ ướt (đã rạch), mũi khâu chéo
      const cutPts: THREE.Vector3[] = [];
      const layCut = () => {
        cutPts.length = 0;
        for (let j = 0; j < N_CUT; j++) {
          const [x, z] = pointAt(INCISION, j / (N_CUT - 1));
          cutPts.push(new THREE.Vector3(x, surfaceY(x, z) + 0.006, z));
        }
      };
      const at = (u: number, out: THREE.Vector3) => {
        const f = Math.max(0, Math.min(1, u)) * (N_CUT - 1);
        const j = Math.min(Math.floor(f), N_CUT - 2);
        return out.copy(cutPts[j]).lerp(cutPts[j + 1], f - j);
      };
      const dash = k.line('#FBF9F4', 3, new Array(N_CUT * 6).fill(0), true);
      Object.assign(dash.material, {transparent: true, opacity: 0.85, depthTest: false});
      dash.renderOrder = 4;
      const stitches = k.line('#6A4BC0', 3, new Array(40 * 6).fill(0), true);
      stitches.renderOrder = 4;
      k.scene.add(dash, stitches);
      let drawn = '';
      const drawCut = (prog: number, sew: number, show: boolean) => {
        dash.visible = show && prog < 1;
        stitches.visible = show && sew > 0;
        const key = `${prog.toFixed(3)}:${sew.toFixed(3)}:${show}`;
        if (!show || !cutPts.length || key === drawn) return;
        drawn = key;
        const d: number[] = [];
        for (let j = 0; j < N_CUT; j++) {
          const u0 = Math.max(j / N_CUT, prog);
          const u1 = Math.max((j + 0.5) / N_CUT, prog);
          at(u0, v3);
          d.push(v3.x, v3.y, v3.z);
          at(u1, v3);
          d.push(v3.x, v3.y, v3.z);
        }
        setLine(dash, d);
        // mũi khâu vắt: mỗi mũi một nét chéo qua đường rạch
        const s: number[] = [];
        for (let i = 0; i < 40; i++) {
          const u = (i + 0.5) / 40;
          if (u > sew) {
            s.push(0, -9, 0, 0, -9, 0);
            continue;
          }
          at(u, v3);
          at(Math.min(1, u + 0.02), w3).sub(v3).normalize();
          const sx = -w3.z * 0.07;
          const sz = w3.x * 0.07;
          s.push(v3.x - sx - w3.x * 0.03, v3.y + 0.01, v3.z - sz - w3.z * 0.03, v3.x + sx + w3.x * 0.03, v3.y + 0.01, v3.z + sz + w3.z * 0.03);
        }
        setLine(stitches, s);
      };

      // ---- máu: tia phun theo nhịp tim ở chỗ đứt mạch, vũng dịch trong khoang ngực, kẹp đã đặt
      // một InstancedMesh cho mọi giọt (một lần vẽ); giọt kéo dài theo vận tốc
      const NB = 300;
      const dropMat = new THREE.MeshPhysicalMaterial({color: '#D90429', roughness: 0.15, clearcoat: 1});
      const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), dropMat, NB);
      drops.frustumCulled = false;
      drops.count = 0;
      k.scene.add(drops);
      const parts = Array.from({length: NB}, () => ({p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0}));
      let spawnAcc = 0;
      const m4 = new THREE.Matrix4();
      const UP = new THREE.Vector3(0, 1, 0);
      const sc = new THREE.Vector3();
      const tipF = [0, 1, 2].map(() => oneEuro(1.0, 0.6));
      let tipTool: SurgTool | null = null;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({color: '#E9D27A', roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2, transparent: true, opacity: 0.92}));
      pool.scale.set(2.2, 1, 2.7);
      pool.position.set(0, -0.6, 0.15);
      pool.visible = false;
      k.scene.add(pool);
      const poolCol = new THREE.Color();
      let placedClamp: THREE.Object3D | null = null;

      const rings = Array.from({length: 2}, (_, i) => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: i ? '#E0202A' : ORANGE, depthTest: false, transparent: true}));
        r.renderOrder = 5;
        r.visible = false;
        k.scene.add(r);
        return r;
      });

      // ---- gạc trong khoang: `gz` = chỗ đang có gạc (lấy đúng miếng được chỉ vào)
      const gauzeMat = new THREE.MeshStandardMaterial({map: gauzeTexture(), roughness: 0.95, side: THREE.DoubleSide});
      const gauzes = GAUZE_AT.map(([x, z], i) => {
        const geo = new THREE.PlaneGeometry(0.66, 0.6, 10, 10).rotateX(-Math.PI / 2);
        const pos = geo.getAttribute('position');
        for (let j = 0; j < pos.count; j++) pos.setY(j, 0.025 * Math.sin(pos.getX(j) * 17 + i) * Math.cos(pos.getZ(j) * 13 + i * 2));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, gauzeMat);
        m.position.set(x, -0.3, z);
        m.rotation.y = i * 1.3;
        m.castShadow = m.receiveShadow = true;
        m.visible = false;
        k.scene.add(m);
        return m;
      });
      const gz: number[] = [];
      const nearGauze = (nx: number, ny: number, reach: number) => {
        let best = -1;
        let bd = reach;
        for (const j of gz) {
          const d = P.distAt(nx, ny, gauzes[j].position);
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        return best;
      };
      let curView: OrView = live.view;
      let tween = 0;

      // ---- bóc lớp
      const shownPeel = LAYERS.map(() => 0);
      const layerOf = (part: string | null) => LAYERS.findIndex((l) => part && l.nodes.includes(part));
      const outLocal = LAYERS.map((l) => {
        const q = heart.quaternion.clone().invert();
        return new THREE.Vector3(...l.out).applyQuaternion(q);
      });
      const gripOf = (i: number, out: THREE.Vector3) => {
        box.makeEmpty();
        for (const n of LAYERS[i].nodes) {
          const o = nodes.get(n);
          if (o) box.expandByObject(o);
        }
        box.getCenter(out);
        out.y = box.max.y + 0.05;
        return out;
      };

      // ---- con trỏ
      type Drag = {kind: 'peel'; i: number; start: THREE.Vector3; a0: number; a: number; dir: THREE.Vector2; len: number} | {kind: 'cut'; prog: number; sent: number; sew: boolean} | {kind: 'slice'} | {kind: 'suck'};
      const drag: (Drag | null)[] = P.ptrs.map(() => null);
      let lastTool: THREE.Vector3 | null = null;
      let lastLead: THREE.Vector3 | null = null;
      let lastLeadDown = false;
      let loupe = false;
      let last = performance.now();
      let heartBox: THREE.Box3 | null = null;
      const center = new THREE.Vector3();

      const overHeart = (nx: number, ny: number) => {
        if (!heartBox) return false;
        heartBox.getCenter(center);
        const r = heartBox.getSize(v3).length() * 0.5;
        return P.distAt(nx, ny, center) < 0.42 * (r / 2.2);
      };
      const onTray = (nx: number, ny: number) => {
        const q = P.onPlane(nx, ny, TRAY_Y, v3);
        return q.x > TRAY_X - 0.2 && q.x < TRAY_X + 1.5 && Math.abs(q.z - 0.2) < 1.8 ? SURG_TOOLS.reduce((a, t) => (Math.abs(q.z - SLOT[t]) < Math.abs(q.z - SLOT[a]) ? t : a)) : null;
      };
      P.grabWhen((nx, ny) => {
        if (!ready) return false;
        if (live.mode === 'slice') return overHeart(nx, ny);
        if (live.mode === 'peel') {
          const h = hitParts(nx, ny);
          const {next, back} = peelable(live.peeled);
          const i = layerOf(partOf(h?.object ?? null));
          return (i >= 0 && (i === next || i === back)) || (next !== null && P.distAt(nx, ny, gripOf(next, w3)) < 0.16);
        }
        if (live.mode === 'cabg') return !!onTray(nx, ny) || (!!live.cabg.tool && Math.abs(P.onPlane(nx, ny, 0.3, v3).x) < 3 && Math.abs(v3.z) < 3);
        if (surgStep(live.st) === 'count' && nearGauze(nx, ny, 0.12) >= 0) return true;
        return !!onTray(nx, ny) || (!!live.st.tool && Math.abs(P.onPlane(nx, ny, 0.3, v3).x) < 3 && Math.abs(v3.z) < 3);
      });

      const applySlice = () => {
        const s = live.slice;
        const n = s.axis === 'front' ? new THREE.Vector3(0, -1, 0) : s.axis === 'short' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(-1, 0, 0);
        const tiltAxis = s.axis === 'front' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        n.applyQuaternion(qt.setFromAxisAngle(tiltAxis, s.tilt)).normalize();
        // giữ phía mặt phẳng hướng về người nhìn: phần bị cắt bỏ là phần gần máy quay
        plane.setFromNormalAndCoplanarPoint(n, w3.set(s.axis === 'side' ? s.off : 0, s.axis === 'front' ? s.off : 0, s.axis === 'short' ? s.off : 0));
        cap.position.copy(plane.coplanarPoint(v3));
        cap.lookAt(v3.clone().add(n));
        const u = new THREE.Vector3(0, 1, 0).cross(n);
        if (u.lengthSq() < 1e-3) u.set(1, 0, 0);
        u.normalize().multiplyScalar(1.9);
        const vv = n.clone().cross(u).normalize().multiplyScalar(1.9);
        const c = cap.position;
        const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1], [1, 1]].flatMap(([a, b]) => [c.x + u.x * a + vv.x * b, c.y + u.y * a + vv.y * b, c.z + u.z * a + vv.z * b]);
        setLine(frame, corners);
      };

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1);
        if (!ready) return;
        const mode = live.mode;
        const st = live.st;
        const step = surgStep(st);
        if (!heartBox) heartBox = new THREE.Box3().setFromObject(beat);

        // ---- đổi góc nhìn: máy quay trôi tới rồi trả lại cho người dùng xoay tự do
        if (live.view !== curView) {
          curView = live.view;
          tween = 1;
        }
        if (tween > 0) {
          const e = 1 - Math.exp(-dt * 5);
          k.camera.position.lerp(VIEWS[curView].cam, e);
          k.controls.target.lerp(VIEWS[curView].at, e);
          tween -= dt / 1.2;
          if (tween <= 0) {
            k.camera.position.copy(VIEWS[curView].cam);
            k.controls.target.copy(VIEWS[curView].at);
          }
        }
        if (screen.visible && now - screenAt > 80) {
          screenAt = now;
          if (mode === 'cabg') {
            const c = cabgVitals(live.cabg);
            drawScreen(screenCv.getContext('2d')!, {...st.vitals, hr: c.hr, sys: c.sys, dia: c.dia, spo2: c.spo2, etco2: c.etco2}, now / 1000, c);
          } else drawScreen(screenCv.getContext('2d')!, st.vitals, now / 1000);
          screenTex.needsUpdate = true;
        }
        while (gz.length < st.gauze) gz.push(gauzes.findIndex((_, j) => !gz.includes(j)));
        while (gz.length > st.gauze) gz.pop();
        gauzes.forEach((g, j) => (g.visible = mode === 'surgery' && gz.includes(j)));

        // ---- phổi thở theo máy thở (cùng pha với sóng EtCO₂ trên monitor): phồng ra trước và lấn vào giữa khi hít vào
        const cv = mode === 'cabg' ? cabgVitals(live.cabg) : null;
        // đang chạy máy tim phổi: ngừng thở máy, phổi xẹp nằm yên
        const vol = cv && !cv.vent ? 0 : lungVolAt(((now / 1000) * st.vitals.rr) / 60 % 1);
        for (const L of lungs) {
          L.o.scale.set(1 + 0.08 * vol, 1 + 0.28 * vol, 1 + 0.04 * vol);
          L.o.position.x = L.x - L.side * 0.26 * vol;
        }
        // ---- nhịp tim theo monitor
        const period = 60 / Math.max(30, cv ? Math.max(1, cv.hr) : st.vitals.hr);
        const {atria, ventricles} = cardiacPhase(now / 1000, period);
        const cf = cabg?.frame(mode === 'cabg', dt, now, lastLead, lastLeadDown, w3.set(TRAY_X, TRAY_Y, SLOT.suction)) ?? {jolt: 0, focus: null, sink: 0, pale: 0};
        // đóng ngực: tim và phổi hạ xuống lòng ngực theo hai nửa xương ức
        heartY0 ??= heart.position.y;
        heart.position.y = heartY0 - cf.sink;
        for (const L of lungs) L.o.position.y = L.y - cf.sink;
        // liệt tim lạnh: cơ tim nhợt dần; tưới máu lại thì hồng trở lại
        // màu tim nằm ở màu đỉnh (vật liệu trắng) nên nhân màu không làm nhợt được: kéo màu vật liệu về hồng xám và cộng ánh nhạt tự phát
        if (!heartCols.size)
          for (const [id, o] of nodes)
            if (id !== 'SH_peri')
              for (const m of matsOf(o)) if ((m as THREE.MeshStandardMaterial).emissive) heartCols.set(m as THREE.MeshStandardMaterial, (m as THREE.MeshStandardMaterial).color.clone());
        for (const [m, c0] of heartCols) {
          m.color.copy(c0).lerp(PALE, 0.35 * cf.pale);
          m.emissive.copy(PALE_GLOW).multiplyScalar(cf.pale);
        }
        // kính lúp: máy quay trôi tới sát chỗ nối khi vào bước vi phẫu, xong thì trả về góc nhìn đang chọn
        if (cf.focus) {
          const e = 1 - Math.exp(-dt * 3);
          k.controls.target.lerp(cf.focus, e);
          k.camera.position.lerp(v3.copy(cf.focus).add(LOUPE), e);
          loupe = true;
        } else if (loupe) {
          loupe = false;
          tween = 1;
        }
        if (cv && (cv.rhythm === 'arrest' || cv.hr === 0) && cv.rhythm !== 'vf') beat.scale.setScalar(1.012 - 0.03 * cf.jolt); // liệt tim: tim mềm, giãn, đứng yên
        else if (cv?.rhythm === 'vf') {
          // rung thất: cơ tim rung lăn tăn hỗn loạn, không co bóp thành nhịp
          const t = now / 1000;
          const q = 0.006 * Math.sin(t * 47) + 0.004 * Math.sin(t * 31 + 1.1);
          beat.scale.set(1 + q - 0.03 * cf.jolt, 1 - q * 0.7, 1 + q * 0.8);
        } else beat.scale.set(1 - 0.03 * ventricles - 0.01 * atria - 0.03 * cf.jolt, 1 - 0.02 * ventricles, 1 - 0.03 * ventricles);

        // ---- hiện / ẩn theo chế độ
        const slice = mode === 'slice';
        cap.visible = frame.visible = slice;
        if (slice) applySlice();
        else plane.set(v3.set(0, -1, 0), 100);
        const periNode = nodes.get('SH_peri');
        // ca bắc cầu: màng ngoài tim đã mở và treo lên (chỉ treo trong trường mổ)
        if (periNode) periNode.visible = mode !== 'slice' && mode !== 'cabg';
        const cabgMode = mode === 'cabg';
        for (const [id, o] of tools) o.visible = mode === 'surgery' || (cabgMode && id !== 'suction');
        for (const [id, tg] of toolTags) tg((mode === 'surgery' || cabgMode) && curView === 'field' ? w3.set(TRAY_X + 0.55, TRAY_Y, SLOT[id] + 0.3) : null, undefined, cabgMode ? CABG_LABEL[CABG_OF[id]] : SURG_NAME[id]);
        if (cabgMode) live.cabgDispatch({t: 'tick', dt});
        for (const w of writers) w.visible = slice;
        if (mode === 'surgery') live.dispatch({t: 'tick', dt});

        // ---- con trỏ
        let lead: THREE.Vector3 | null = null;
        let leadDown = false;
        let blade: THREE.Vector3 | null = null;
        let hoverPart: {name: string; fn: string; at: THREE.Vector3} | null = null;
        for (const [n, p] of P.ptrs.entries()) {
          const dg = drag[n];
          if (!p.active) {
            drag[n] = null;
            continue;
          }
          // một tia mỗi con trỏ mỗi khung (lưới tim ~300 nghìn tam giác): các bước dưới dùng lại kết quả
          const hp = hitParts(p.ndc.x, p.ndc.y);
          if (slice) {
            // cắt lớp: tay xòe di chuyển là mặt cắt đi theo (chụm một lần để khóa / mở khóa); chuột / ngón tay kéo trên tim
            if (p.hand && p.pressed) live.slice.locked = !live.slice.locked;
            const follow = p.hand ? !live.slice.locked && !p.down : p.down && (dg?.kind === 'slice' || (p.pressed && overHeart(p.ndc.x, p.ndc.y)));
            if (!p.hand && p.pressed && overHeart(p.ndc.x, p.ndc.y)) drag[n] = {kind: 'slice'};
            if (!p.down && !p.hand) drag[n] = null;
            if (follow && heartBox) {
              heartBox.getCenter(center).project(k.camera);
              const [lo, hi] = RANGE[live.slice.axis];
              const ux = Math.max(-1, Math.min(1, (p.ndc.x - center.x) / 0.45));
              const uy = Math.max(-1, Math.min(1, (p.ndc.y - center.y) / 0.45));
              // trục ngang màn hình → vị trí mặt cắt, trục dọc → góc nghiêng (±40°)
              live.slice.off = lo + ((ux + 1) / 2) * (hi - lo);
              live.slice.tilt = uy * 0.7;
              p.hot = true;
            }
          } else if (mode === 'peel') {
            if (dg?.kind === 'peel') {
              p.hot = true;
              const q = P.onPlane(p.ndc.x, p.ndc.y, dg.start.y, w3);
              dg.a = Math.max(0, Math.min(1, dg.a0 + ((q.x - dg.start.x) * dg.dir.x + (q.z - dg.start.z) * dg.dir.y) / dg.len));
              shownPeel[dg.i] = dg.a;
              if (!p.down) {
                const was = dg.i < live.peeled;
                if (!was && dg.a > 0.35) live.setPeeled(dg.i + 1);
                else if (was && dg.a < 0.65) live.setPeeled(dg.i);
                drag[n] = null;
              }
            } else {
              const h = hp;
              const part = partOf(h?.object ?? null);
              const {next, back} = peelable(live.peeled);
              let i = layerOf(part);
              if (next !== null && i !== next && i !== back && P.distAt(p.ndc.x, p.ndc.y, gripOf(next, w3)) < p.reach) i = next;
              p.hot = i >= 0 && (i === next || i === back);
              if (p.pressed && i >= 0) {
                if (i !== next && i !== back) live.dispatch({t: 'wrong', msg: `Bóc ${LAYERS[peelable(live.peeled).next ?? 0].name.toLowerCase()} trước: lớp ngoài chưa bóc thì chưa chạm được lớp trong.`});
                else {
                  const start = P.onPlane(p.ndc.x, p.ndc.y, gripOf(i, w3).y, new THREE.Vector3());
                  const o = LAYERS[i].out;
                  const len = Math.max(0.6, Math.hypot(o[0], o[2]));
                  const dir = new THREE.Vector2(o[0], o[2]);
                  // lớp bay thẳng lên (không có hướng ngang): kéo về phía người xem để bóc
                  if (dir.length() < 0.3) dir.set(0, 1);
                  drag[n] = {kind: 'peel', i, start, a0: shownPeel[i], a: shownPeel[i], dir: dir.normalize(), len};
                }
              }
            }
          } else if (mode === 'cabg') {
            const tray = onTray(p.ndc.x, p.ndc.y);
            const hit = hp ? hp.point.clone() : P.onPlane(p.ndc.x, p.ndc.y, 0.3, new THREE.Vector3());
            if (p.pressed && tray) {
              const want = CABG_OF[tray];
              live.cabgDispatch({t: 'tool', tool: live.cabg.tool === want ? null : want});
              p.hot = true;
            } else if (!(cabg?.pointer(p, n, hit, dt) ?? false)) p.hot = p.hot || !!tray;
          } else {
            // phẫu thuật
            const tray = onTray(p.ndc.x, p.ndc.y);
            const h = hp;
            const hit = h ? h.point.clone() : P.onPlane(p.ndc.x, p.ndc.y, 0.3, new THREE.Vector3());
            if (dg?.kind === 'cut') {
              p.hot = true;
              const r = cutAdvance(INCISION, dg.prog, hit.x, hit.z, 0.45, 0.6);
              dg.prog = r.s;
              blade = new THREE.Vector3(r.at[0], surfaceY(r.at[0], r.at[1]), r.at[1]);
              if (!dg.sew) {
                // vùng cấm: tay (không phải lưỡi đã bám đường) đi sát động mạch liên thất trước hoặc tĩnh mạch tim lớn → đứt mạch
                let bd = Infinity;
                let bp: THREE.Vector3 | null = null;
                let kind: 'artery' | 'vein' = 'artery';
                for (const [pts, kd, r] of [[ladPts, 'artery', 0.11], [veinPts, 'vein', 0.09]] as const)
                  for (const q of pts) {
                    const d = Math.hypot(q.x - hit.x, q.z - hit.z) - r;
                    if (d < bd) {
                      bd = d;
                      bp = q;
                      kind = kd;
                    }
                  }
                if (bp && bd < 0 && !(st.nick && !st.clamped)) {
                  live.dispatch({t: 'nick', at: [bp.x, bp.y, bp.z], vessel: kind});
                  drag[n] = null;
                  continue;
                }
              }
              if (r.s - dg.sent >= 0.03 || (r.s >= 0.97 && dg.sent < 1) || (!p.down && r.s > dg.sent)) {
                dg.sent = r.s >= 0.97 ? 1 : r.s;
                live.dispatch(dg.sew ? {t: 'sew', s: dg.sent} : {t: 'cut', s: dg.sent});
              }
              if (!p.down) drag[n] = null;
            } else if (dg?.kind === 'suck') {
              p.hot = true;
              live.dispatch({t: 'suck', dt});
              if (!p.down) drag[n] = null;
            } else {
              p.hot = !!tray || !!st.tool;
              if (p.pressed) {
                if (tray) live.dispatch({t: 'tool', tool: st.tool === tray ? null : tray});
                else if (step === 'count') {
                  const j = nearGauze(p.ndc.x, p.ndc.y, Math.max(p.reach, 0.1));
                  if (j >= 0) {
                    gz.splice(gz.indexOf(j), 1);
                    live.dispatch({t: 'gauzeOut'});
                  }
                } else if (st.tool && step !== 'done' && STEP_TOOL[step] && st.tool !== STEP_TOOL[step]) live.dispatch({t: 'wrong'});
                else if (step === 'incise' || step === 'suture') {
                  const sew = step === 'suture';
                  const prog = sew ? st.suture : st.incision;
                  const r = cutAdvance(INCISION, prog, hit.x, hit.z, 0.45, 0.6);
                  if (r.d < 0.45) drag[n] = {kind: 'cut', prog, sent: prog, sew};
                } else if (step === 'clamp' && st.nick) {
                  live.dispatch({t: 'clamp', ok: Math.hypot(hit.x - st.nick[0], hit.z - st.nick[2]) < 0.3 || P.distAt(p.ndc.x, p.ndc.y, v3.set(...st.nick)) < p.reach});
                } else if (step === 'suction' && st.tool === 'suction') drag[n] = {kind: 'suck'};
              }
            }
          }
          // chỉ vào bộ phận: thẻ tên + chức năng; cắt lớp mà tia gặp mặt cắt trước (trong khối tim) thì gọi tên vùng lát cắt đi qua
          // ca bắc cầu đang cầm dụng cụ: không bật thẻ tên bộ phận (thẻ che đúng chỗ đang thao tác)
          if (!drag[n] && !hoverPart && !(mode === 'cabg' && live.cabg.tool)) {
            const h = hp;
            ray.setFromCamera(v2.set(p.ndc.x, p.ndc.y), k.camera);
            const x = slice ? ray.ray.intersectPlane(plane, new THREE.Vector3()) : null;
            if (x && heartBox?.containsPoint(x) && (!h || h.distance > ray.ray.origin.distanceTo(x) + 0.02)) {
              const lp = heart.worldToLocal(x.clone());
              const nm = wallName(lp.x, lp.y);
              hoverPart = {name: `Lát cắt qua ${nm.toLowerCase()}`, fn: `${WALL_FN[nm]} Vùng hồng có vân là cơ tim bị cắt; khoang sẫm là lòng buồng.`, at: x};
            } else {
            const part = partOf(h?.object ?? null);
            if (h && part) {
              if (part.startsWith('SH_wall')) {
                const lp = heart.worldToLocal(h.point.clone());
                const nm = wallName(lp.x, lp.y);
                hoverPart = {name: nm, fn: WALL_FN[nm], at: h.point.clone()};
              } else if (INFO[part]) hoverPart = {name: INFO[part][0], fn: INFO[part][1], at: h.point.clone()};
            }
            }
          }
          if (!lead || p.hand) {
            const h = hp;
            lead = h ? h.point.clone() : P.onPlane(p.ndc.x, p.ndc.y, 0.3, new THREE.Vector3());
            leadDown = p.down;
          }
        }

        lastLead = lead;
        lastLeadDown = leadDown;
        // ---- bóc lớp: lớp trượt ra / về theo trạng thái đã chốt
        LAYERS.forEach((l, i) => {
          const dragging = drag.some((d) => d?.kind === 'peel' && d.i === i);
          const goal = mode === 'peel' ? (i < live.peeled ? 1 : 0) : 0;
          if (!dragging) shownPeel[i] += (goal - shownPeel[i]) * (1 - Math.exp(-dt * 6));
          const a = shownPeel[i] * shownPeel[i] * (3 - 2 * shownPeel[i]);
          for (const n of l.nodes) {
            const o = nodes.get(n);
            if (o) o.position.copy(home.get(n)!).addScaledVector(outLocal[i], a);
          }
        });

        // ---- dụng cụ
        for (const [t, o] of tools) {
          const held = (mode === 'surgery' && st.tool === t) || (mode === 'cabg' && t !== 'suction' && live.cabg.tool !== null && SLOT_OF[live.cabg.tool] === t);
          if (held) {
            if (tipTool !== t) {
              tipTool = t;
              tipF.forEach((_, i) => (tipF[i] = oneEuro(1.0, 0.6)));
            }
            // lọc One Euro cho mũi dụng cụ theo tay: chậm thì lọc mạnh (đường dao thẳng), nhanh thì nhẹ (không trễ); lưỡi đang bám đường rạch thì không cần
            const raw = blade ?? lead ?? lastTool;
            const ts = now / 1000;
            const tip = raw && !blade ? new THREE.Vector3(tipF[0](raw.x, ts), tipF[1](raw.y, ts), tipF[2](raw.z, ts)) : raw;
            if (tip) {
              lastTool = (lastTool ?? new THREE.Vector3()).copy(tip);
              o.position.set(tip.x, tip.y + (blade || leadDown ? 0.02 : 0.25), tip.z);
            }
            o.quaternion.setFromEuler(HOLD[t]);
          } else {
            o.position.set(TRAY_X, TRAY_Y, SLOT[t]);
            o.quaternion.identity();
          }
          toolMats.get(t)!.forEach((m) => m.emissive?.set(held ? '#5A2A10' : '#000000'));
        }

        // ---- màng ngoài tim: rạch / khâu
        const surg = mode === 'surgery';
        const cutLive = drag.reduce((m, d) => (d?.kind === 'cut' && !d.sew ? Math.max(m, d.prog) : m), st.incision);
        const sewLive = drag.reduce((m, d) => (d?.kind === 'cut' && d.sew ? Math.max(m, d.prog) : m), st.suture);
        peri.prog.value = surg ? cutLive : 0;
        // khâu xong thì đoạn khâu khép kín; đang mở hết thì mép banh rộng hơn (khâu treo màng ngoài tim)
        peri.sew.value = surg ? sewLive : 0;
        peri.half.value = st.incision >= 1 ? 0.075 : 0.035;
        if (periMat) periMat.opacity = surg ? 0.2 : 0.16;
        drawCut(cutLive, sewLive, surg);

        // ---- máu phun theo nhịp ở chỗ đứt mạch
        const bleeding = surg && !!st.nick && !st.clamped;
        // động mạch: tia đỏ tươi, vận tốc đầu v0 = vbase·(1 + 0,6·max(0, sin(2π·BPM/60·t))) nên phun dồn theo nhịp; tĩnh mạch: đỏ sẫm, rỉ chậm, trườn trên mặt mô
        const artery = st.vessel === 'artery';
        if (bleeding) {
          dropMat.color.set(artery ? '#D90429' : '#6A040F');
          spawnAcc += dt * (artery ? 90 : 18);
          const pulse = 1 + 0.6 * Math.max(0, Math.sin(2 * Math.PI * (st.vitals.hr / 60) * (now / 1000)));
          for (const q of parts) {
            if (spawnAcc < 1) break;
            if (q.life > 0) continue;
            spawnAcc -= 1;
            q.life = 1;
            q.p.set(...st.nick!);
            if (artery) q.v.set((Math.random() - 0.5) * 0.35, 1.5 * pulse + Math.random() * 0.3, 0.25 + (Math.random() - 0.5) * 0.35);
            else q.v.set((Math.random() - 0.5) * 0.25, 0.05 + Math.random() * 0.1, 0.15 + Math.random() * 0.15);
          }
          spawnAcc = Math.min(spawnAcc, 3);
        }
        let nd = 0;
        for (const q of parts) {
          if (q.life <= 0) continue;
          q.v.y -= (artery ? 6 : 1.2) * dt;
          q.p.addScaledVector(q.v, dt);
          q.life -= dt * (artery ? 0.9 : 0.45);
          if (q.p.y < -0.3) q.life = 0;
          if (q.life <= 0) continue;
          const sp = q.v.length();
          qt.setFromUnitVectors(UP, sp > 1e-3 ? w3.copy(q.v).divideScalar(sp) : UP);
          drops.setMatrixAt(nd++, m4.compose(q.p, qt, sc.set(1, 1 + sp * 0.9, 1)));
        }
        drops.count = nd;
        drops.instanceMatrix.needsUpdate = true;
        // vũng dịch: dâng theo lượng, màu từ vàng trong (dịch màng ngoài tim) tới đỏ sẫm (máu)
        pool.visible = surg && st.field > 0.5;
        if (pool.visible) {
          const f = Math.min(1, st.field / 160);
          // dịch đọng ở đáy khoang quanh tim: rộng và dâng dần theo lượng (40 mL dịch màng ngoài tim chỉ là một vũng nhỏ)
          pool.position.y = -0.62 + 0.4 * f;
          pool.scale.set(1.0 + 1.2 * f, 1, 1.3 + 1.4 * f);
          (pool.material as THREE.MeshPhysicalMaterial).color.copy(poolCol.set('#E9D27A').lerp(new THREE.Color('#3E0307'), Math.min(1, st.bloody * 1.6)));
        }
        // kẹp đã đặt nằm lại ở chỗ đứt mạch
        if (surg && st.clamped && st.nick && !placedClamp && tools.get('clamp')) {
          placedClamp = tools.get('clamp')!.clone(true);
          placedClamp.position.set(st.nick[0], st.nick[1] + 0.02, st.nick[2]);
          placedClamp.rotation.set(0, -0.9, 0.35, 'YXZ');
          k.scene.add(placedClamp);
        }
        if (placedClamp) placedClamp.visible = surg && st.clamped;

        // ---- vòng chỉ chỗ làm
        const pulse = 1 + 0.12 * Math.sin(now / 180);
        const spot: (THREE.Vector3 | null)[] = [null, null];
        if (surg && !drag.some(Boolean)) {
          if (step === 'incise' && cutPts.length) spot[0] = at(st.incision, new THREE.Vector3());
          else if (step === 'suture' && cutPts.length) spot[0] = at(st.suture, new THREE.Vector3());
          else if (step === 'suction') spot[0] = new THREE.Vector3(0.9, pool.position.y + 0.05, 1.5);
          else if (step === 'count' && gz.length) spot[0] = gauzes[gz[0]].position.clone().setY(gauzes[gz[0]].position.y + 0.06);
        }
        if (bleeding) spot[1] = new THREE.Vector3(...st.nick!).add(v3.set(0, 0.04, 0));
        if (mode === 'peel') {
          const {next} = peelable(live.peeled);
          if (next !== null && !drag.some(Boolean)) spot[0] = gripOf(next, new THREE.Vector3());
        }
        rings.forEach((r, i) => {
          r.visible = !!spot[i];
          if (spot[i]) {
            r.position.copy(spot[i]!);
            r.scale.setScalar(i ? 1 + 0.3 * ventricles : pulse);
          }
        });

        // ---- thẻ thông tin + chú thích
        if (hoverPart) card(hoverPart.at.add(v3.set(0, 0.25, 0)), [{t: 'h', a: hoverPart.name}, {t: 'p', a: hoverPart.fn}]);
        else card(null);
        const how =
          mode === 'slice'
            ? `${SLICE_NOTE[live.slice.axis]}\nTay xòe đưa ngang để dời mặt cắt, đưa lên / xuống để nghiêng; chụm một lần để ${live.slice.locked ? 'mở khóa' : 'khóa'} lát cắt. Chuột: kéo trên tim.`
            : mode === 'peel'
              ? (() => {
                  const {next} = peelable(live.peeled);
                  return next === null ? 'Đã bóc hết bốn lớp (xem tách rời). Kéo lớp vừa bóc về chỗ cũ để lắp lại.' : `Lớp ngoài cùng: ${LAYERS[next].name.toLowerCase()}. Chụm vào vòng cam (hoặc vào chính lớp đó) rồi kéo ra quá một phần ba đường để bóc.`;
                })()
              : step === 'done'
                ? 'Ca mổ hoàn tất. Đưa tay lên từng bộ phận để xem tên và chức năng.'
                : step === 'signin' || step === 'timeout' || step === 'signout'
                  ? 'Cả kíp đọc to và đánh dấu từng mục ở bảng kiểm trong tab Thao tác.'
                  : step === 'count'
                    ? gz.length
                      ? `Còn ${gz.length} miếng gạc trong khoang: chỉ vào từng miếng rồi chụm một lần để lấy ra.`
                      : 'Đã lấy hết gạc. Bấm "Xác nhận đếm đủ" ở tab Thao tác.'
                : st.tool !== STEP_TOOL[step]
                  ? `Lấy ${SURG_NAME[STEP_TOOL[step]!].toLowerCase()} ở khay Mayo bên phải: đưa tay tới rồi chụm một lần.`
                  : step === 'incise'
                    ? 'Chụm ở vòng cam rồi kéo dọc vạch chấm: lưỡi bám đường; đi lệch sang rãnh giữa hai thất sẽ cắt trúng động mạch vành.'
                    : step === 'clamp'
                      ? 'Đưa kẹp tới vòng đỏ (chỗ máu phun) và chụm một lần để kẹp.'
                      : step === 'suction'
                        ? 'Đưa ống hút xuống vũng dịch quanh tim, chụm và giữ để hút.'
                        : 'Chụm ở vòng cam rồi kéo dọc đường rạch để khâu vắt.';
        if (mode === 'cabg') {
          const c = live.cabg;
          const cs = cabgStep(c);
          const meta = CABG_STEPS.find((x) => x.id === cs);
          const need = cabgTool(cs);
          const hint = cs === 'done' ? 'Ca mổ hoàn tất: xem nhận xét ở bảng điều khiển.' : need && c.tool !== need ? `Lấy ${CABG_LABEL[need].toLowerCase()} ở khay bên phải (chụm một lần), rồi: ${meta!.how}` : meta!.how;
          k.caption(`Bắc cầu động mạch vành · ${meta ? meta.name : 'Hoàn tất'}\n${c.warn || hint}`);
        } else k.caption(`${mode === 'surgery' ? `${STEP_DO[step]}` : mode === 'peel' ? 'Bóc tách từng lớp' : 'Cắt lớp thời gian thực'}\n${st.warn && mode !== 'slice' ? st.warn : how}`);
      };
    },
  };
}

const HandsSurgery3D: React.FC<{input: HandsInput; live: SurgeryLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsSurgery3D;
