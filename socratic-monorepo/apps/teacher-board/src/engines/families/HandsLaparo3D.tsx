'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {ANCHOR, ARTERY, ART_CLIP_X, ART_CUT_X, BAG_AT, CHOLE_PHASES, clampScope, CLIP_X, CUT_X, LAP_TASKS, NO_GO, PEGS_FROM, PEGS_GOAL, RIGHT_TOOL_NAME, TARGETS, TIP_HIGH, TIP_LOW, TUBE_X, TUBE_Y, handleOf, lapStep, tipOf, trocarsOf, type LapState, type LapTaskId, type P3, type RightTool} from '../../utils/lab/hands/laparo';
import {BAND, BAND_A, BAND_B, BAND_LEN, MEMB, WINDOW, bandUV, bandXZ, clearedIn, columnCleared, firstAlive, type CellGrid} from '../../utils/lab/hands/lapDissect';
import {SoftBody, TEAR_PULL, applySkin, buildSkin, linkWithin, sampleCloud, type Edge, type Skin, type SoftTip} from '../../utils/lab/hands/lapSoft';
import {handPointers, type HandsInput} from './handsKit';
import {loadModel} from './labParts';
import {organAll, organify, surgPost} from './surgLook';
import {Stage3D, type SceneDef} from './Stage3D';

/** trạng thái dùng chung giữa bảng React và cảnh (React ghi lựa chọn, cảnh ghi `st` mỗi khung hình) */
export interface LaparoLive {
  st: LapState;
  /** chuột điều khiển tay nào */
  mouseHand: 0 | 1;
  right: RightTool;
  /** ống soi do người phụ mổ cầm: phóng (1 = khung chuẩn, nhỏ hơn = gần hơn) và lia tâm nhìn trên mặt làm việc */
  scope?: {zoom: number; x: number; z: number};
}

const ORANGE = '#D9481C';
const HAND_COL = ['#39B6E8', '#F2B632'];
/** cơ quan biến dạng được và loại mô của nó */
const DEFORM: Record<string, 'liver' | 'gallbladder' | 'fat' | 'vessel'> = {LA_liver: 'liver', LA_gallbladder: 'gallbladder', LA_fat: 'fat', LA_artery: 'vessel', LA_cbd: 'vessel'};
/** số hạt của ống và chỗ ống tách đôi khi cắt */
const CHAIN = 41;
const SPLIT = (CUT_X[0] + CUT_X[1]) / 2;
const chainX = (i: number) => TUBE_X[0] + ((TUBE_X[1] - TUBE_X[0]) * i) / (CHAIN - 1);
type SoftMesh = {geo: THREE.BufferGeometry; rest: Float32Array; skin: Skin};
type Soft = {body: SoftBody; meshes: SoftMesh[]};
const fieldTask = (t: LapTaskId) => t === 'clip' || t === 'chole';
/** màng phúc mạc căng qua ống và động mạch */
const membY = (x: number, z: number) => 0.34 + 0.27 * Math.exp(-((z / 0.24) ** 2)) + 0.2 * Math.exp(-(((z + 0.5) / 0.18) ** 2)) + 0.012 * Math.sin(x * 9 + z * 6);
/** lưới hiển thị của một mảng ô: đỉnh chung, chỉ số dựng lại khi ô đổi, mép ô đã đốt sạm đi */
function cellSurface(g: CellGrid, at: (i: number, j: number) => P3, color: string, opts: THREE.MeshPhysicalMaterialParameters) {
  const pos = new Float32Array((g.nx + 1) * (g.nz + 1) * 3);
  for (let j = 0; j <= g.nz; j++) for (let i = 0; i <= g.nx; i++) pos.set(at(i, j), (i + j * (g.nx + 1)) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aRest', new THREE.BufferAttribute(pos.slice(), 3));
  // RGBA: mép lưới mờ dần vào mô xung quanh, không có đường viền chữ nhật
  const col = new Float32Array(((g.nx + 1) * (g.nz + 1)) * 4);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: 0.3, clearcoat: 0.8, ...opts}));
  const base = new THREE.Color(color);
  const char = new THREE.Color('#2A1A12');
  const c = new THREE.Color();
  const show = (cells: Uint8Array) => {
    const idx: number[] = [];
    const v = (i: number, j: number) => i + j * (g.nx + 1);
    for (let j = 0; j < g.nz; j++)
      for (let i = 0; i < g.nx; i++) if (cells[i + j * g.nx]) idx.push(v(i, j), v(i, j + 1), v(i + 1, j), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1));
    geo.setIndex(idx);
    for (let j = 0; j <= g.nz; j++)
      for (let i = 0; i <= g.nx; i++) {
        let gone = 0;
        for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < g.nx && b < g.nz && !cells[a + b * g.nx]) gone++;
        const q = v(i, j) * 4;
        const wob = Math.sin(i * 0.37 + j * 0.61) * Math.cos(i * 0.13 - j * 0.29);
        c.copy(base).multiplyScalar(0.96 + 0.08 * wob).lerp(char, gone ? 0.5 + 0.11 * gone : 0);
        col[q] = c.r;
        col[q + 1] = c.g;
        col[q + 2] = c.b;
        const edge = Math.max(0, Math.min(1, (Math.min(i, g.nx - i, j, g.nz - j) + 1.6 * wob) / 4.5));
        col[q + 3] = gone ? 0.92 : edge * edge * (3 - 2 * edge) * (0.82 + 0.16 * wob);
      }
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return {mesh, geo, show};
}

/** đốm mềm dùng cho khói và vũng máu */
function softSpot(inner: string, outer: string, blotch = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const n = blotch ? 9 : 1;
  for (let i = 0; i < n; i++) {
    const x = blotch ? 64 + 30 * Math.cos(i * 2.4) * (0.4 + (i % 3) * 0.3) : 64;
    const y = blotch ? 64 + 30 * Math.sin(i * 2.4) * (0.4 + (i % 2) * 0.5) : 64;
    const r = blotch ? 24 + (i % 4) * 6 : 62;
    const q = g.createRadialGradient(x, y, 1, x, y, r);
    q.addColorStop(0, inner);
    q.addColorStop(blotch ? 0.72 : 0.45, inner);
    q.addColorStop(1, outer);
    g.fillStyle = q;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** vân mô ướt: nền hồng đỏ, mảng mỡ và mao mạch */
function tissueTexture(base: string, fat: string, vessel: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = (i * 197) % 512;
    const y = (i * 311) % 512;
    const r = 14 + ((i * 7) % 42);
    const q = g.createRadialGradient(x, y, 1, x, y, r);
    q.addColorStop(0, i % 3 ? 'rgba(90,16,24,0.28)' : fat);
    q.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = q;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = vessel;
  for (let i = 0; i < 26; i++) {
    let x = (i * 83) % 512;
    let y = (i * 149) % 512;
    g.lineWidth = 0.7 + (i % 3) * 0.6;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += 22 * Math.cos(i + j * 0.9);
      y += 22 * Math.sin(i * 2 + j * 0.7);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const wet = (map: THREE.Texture, color = '#FFFFFF') => new THREE.MeshPhysicalMaterial({map, color, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.16});

/** một dụng cụ: thân dài đen, đầu thép có hai hàm mở theo lực chụm */
function makeTool(k: {scene: THREE.Scene}, col: string) {
  const shaftM = new THREE.MeshStandardMaterial({color: '#15181C', roughness: 0.34, metalness: 0.5});
  const steel = new THREE.MeshStandardMaterial({color: '#C8CDD2', roughness: 0.22, metalness: 1});
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 18), shaftM);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.05, 18), new THREE.MeshStandardMaterial({color: col, roughness: 0.4}));
  const head = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.2, 16).translate(0, 0.16, 0), steel);
  const plain: THREE.Object3D[] = [neck];
  const jaw = () => {
    const pivot = new THREE.Group();
    pivot.position.y = 0.06;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.17, 0.028).translate(0, -0.085, 0), steel);
    plain.push(m);
    pivot.add(m);
    head.add(pivot);
    return pivot;
  };
  const jaws = [jaw(), jaw()];
  head.add(neck, band);
  const tips = new Map<RightTool, THREE.Object3D[]>();
  band.position.y = 0.3;
  shaft.castShadow = neck.castShadow = true;
  k.scene.add(shaft, head);
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const q = new THREE.Quaternion();
  /** thay đầu dụng cụ khối đơn giản bằng mô hình chi tiết */
  const dress = (lib: THREE.Object3D) => {
    const cl = (n: string, parent: THREE.Object3D) => {
      const o = lib.getObjectByName(n)!.clone(true);
      o.position.set(0, 0, 0);
      o.traverse((c) => (c.castShadow = true));
      parent.add(o);
      return o;
    };
    plain.forEach((o) => (o.visible = false));
    cl('LT_neck', head).position.y = 0.06;
    for (const [t, id] of [['grasper', 'maryland'], ['clip', 'clip'], ['scissors', 'scissors'], ['hook', 'hook']] as const) tips.set(t, [cl(`LT_${id}_a`, jaws[0]), cl(`LT_${id}_b`, jaws[1])]);
  };
  const update = (tip: P3, tr: P3, open: number, tool: RightTool) => {
    for (const [t, l] of tips) l.forEach((o) => (o.visible = t === tool));
    a.set(...tip);
    b.set(...tr);
    const dir = b.clone().sub(a).normalize();
    q.setFromUnitVectors(up, dir);
    const start = a.clone().addScaledVector(dir, 0.26);
    const end = b.clone().addScaledVector(dir, 3);
    shaft.position.copy(start).lerp(end, 0.5);
    shaft.quaternion.copy(q);
    shaft.scale.y = start.distanceTo(end);
    head.position.copy(a).addScaledVector(dir, 0.1);
    head.quaternion.copy(q);
    const wide = tool === 'hook' ? 0 : tool === 'scissors' ? 0.34 : tool === 'clip' ? 0.2 : 0.42;
    jaws[0].rotation.z = wide * open + 0.015;
    jaws[1].rotation.z = -wide * open - 0.015;
  };
  return {update, dress};
}

function makeDef(input: HandsInput, live: LaparoLive): SceneDef {
  return {
    night: true,
    dist: 6.5,
    target: [0, -0.05, 0.05],
    orbit: () => [0, 56],
    post: surgPost('scope'),
    setup: (k) => {
      const P = handPointers(k, input, 0.55);
      k.scene.background = new THREE.Color('#120304');
      k.controls.enabled = false;
      // ống soi góc rộng: thấy cả vùng làm việc và hai dụng cụ đi vào từ hai bên
      k.camera.fov = 54;
      k.camera.updateProjectionMatrix();
      P.grabWhen(() => true);
      // ca cắt túi mật: ống soi dịch sang trái để thấy cả đáy túi mật
      const camX = live.st.task === 'chole' ? -1.55 : 0;
      k.controls.target.x += camX;
      // ống soi điều khiển được: giữ khung gốc rồi mỗi khung cộng độ phóng / lia (mượt, như người phụ mổ đưa ống soi từ từ)
      // khung gốc chỉ có sau khi Stage3D đặt máy quay (sau lần cập nhật đầu): lấy ở khung thứ hai
      let camBase: THREE.Vector3 | null = null;
      let camDir: THREE.Vector3 | null = null;
      let camFrames = 0;
      const camNow = {zoom: 1, x: 0, z: 0};

      // nguồn sáng duy nhất đi cùng ống soi: sáng ở giữa, tối dần ra mép như hình nội soi thật
      const scope = new THREE.SpotLight('#FFF1E2', 95, 20, 0.72, 0.75, 1.5);
      scope.castShadow = true;
      scope.shadow.mapSize.set(1024, 1024);
      scope.shadow.bias = -0.0015;
      k.scene.add(scope, scope.target, new THREE.HemisphereLight('#FFC9BC', '#4A1216', 0.35));

      const domeM = new THREE.MeshPhysicalMaterial({color: '#C87870', side: THREE.BackSide, roughness: 0.4, clearcoat: 0.8});
      organify(domeM, 'peritoneum');
      const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 40), domeM);
      dome.scale.set(1, 0.72, 1);
      dome.position.y = 1;
      k.scene.add(dome);

      const floorGeo = new THREE.PlaneGeometry(18, 13, 110, 80).rotateX(-Math.PI / 2);
      const pos = floorGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const rim = Math.max(0, Math.hypot(x / 5.6, z / 3.6) - 1);
        pos.setY(i, -0.22 + 0.06 * Math.sin(x * 2.3 + z) * Math.cos(z * 1.9) + 0.09 * Math.sin(x * 5.1 - z * 3.7) * Math.min(1, rim * 3) + rim * rim * 1.4);
      }
      floorGeo.computeVertexNormals();
      const floorM = new THREE.MeshPhysicalMaterial({color: '#BE6660', roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12});
      organify(floorM, 'peritoneum');
      const floor = new THREE.Mesh(floorGeo, floorM);
      floor.receiveShadow = true;
      k.scene.add(floor);

      // cơ quan quanh vùng làm việc
      const liverTex = tissueTexture('#6E1F27', 'rgba(150,60,60,0.25)', 'rgba(40,6,12,0.45)');
      const organs = new THREE.Group();
      const blob = (r: number, s: P3, at: P3, m: THREE.Material) => {
        const o = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), m);
        o.scale.set(...s);
        o.position.set(...at);
        o.castShadow = o.receiveShadow = true;
        organs.add(o);
        return o;
      };
      const liver = wet(liverTex);
      blob(NO_GO.r, [1.9, 0.8, 1], NO_GO.at, liver);
      blob(1.5, [1.7, 0.55, 0.9], [-4.3, 0.15, -2.6], liver);
      const bowelTex = tissueTexture('#D98C82', 'rgba(244,222,170,0.55)', 'rgba(150,40,50,0.5)');
      const bowel = wet(bowelTex);
      for (let i = 0; i < 9; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.62 + (i % 3) * 0.08, 0.25, 16, 36), bowel);
        const side = i % 2 ? 1 : -1;
        t.position.set(side * (4.1 + (i % 3) * 0.55), 0.08, 2.5 - i * 0.62);
        t.rotation.set(Math.PI / 2 + 0.25 * side, 0.2 * i, i);
        t.castShadow = t.receiveShadow = true;
        organs.add(t);
      }
      k.scene.add(organs);

      // ---- dụng cụ bài kỹ năng: tấm tập, mục tiêu, chốt, vòng
      const skills = new THREE.Group();
      k.scene.add(skills);
      const board = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.08, 3.5), new THREE.MeshStandardMaterial({color: '#3C4C4A', roughness: 0.7}));
      board.position.y = -0.03;
      board.receiveShadow = true;
      skills.add(board);
      const targetMats = TARGETS.map((g) => new THREE.MeshStandardMaterial({color: HAND_COL[g.hand], emissive: HAND_COL[g.hand], emissiveIntensity: 0.35, roughness: 0.3}));
      const targets = TARGETS.map((g, i) => {
        const o = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 28), targetMats[i]);
        o.position.set(g.at[0], 0.08, g.at[2]);
        o.castShadow = true;
        skills.add(o);
        return o;
      });
      const pegM = new THREE.MeshStandardMaterial({color: '#D8DCDC', roughness: 0.3, metalness: 0.5});
      const pegGoalM = new THREE.MeshStandardMaterial({color: '#EFC44C', roughness: 0.35, metalness: 0.3});
      const pegs = new THREE.Group();
      for (const [list, m] of [[PEGS_FROM, pegM], [PEGS_GOAL, pegGoalM]] as const)
        for (const p of list) {
          const o = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.42, 14), m);
          o.position.set(p[0], 0.2, p[2]);
          o.castShadow = true;
          pegs.add(o);
        }
      skills.add(pegs);
      const ringM = new THREE.MeshStandardMaterial({color: '#E94F37', roughness: 0.35});
      const rings = PEGS_FROM.map(() => {
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 12, 28).rotateX(Math.PI / 2), ringM);
        o.castShadow = true;
        skills.add(o);
        return o;
      });

      // ---- bài kẹp và cắt: ống trên mô, vạch vị trí, clip
      const duct = new THREE.Group();
      k.scene.add(duct);
      const pts = [TUBE_X[0], -1.3, (CUT_X[0] + CUT_X[1]) / 2, 1.1, TUBE_X[1]].map((x, i) => new THREE.Vector3(x, TUBE_Y + 0.025 * Math.sin(i * 2), 0.04 * Math.cos(i * 1.7)));
      const tubeL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, 3)), 40, 0.11, 16), new THREE.MeshPhysicalMaterial({color: '#D8C27A', roughness: 0.28, clearcoat: 1}));
      organify(tubeL.material, 'vessel', true);
      const tubeR = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(2)), 40, 0.11, 16), tubeL.material);
      tubeL.castShadow = tubeR.castShadow = true;
      duct.add(tubeL, tubeR);
      const marks = CLIP_X.map((x) => {
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 24).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FFE16B'}));
        o.position.set(x, TUBE_Y, 0);
        duct.add(o);
        return o;
      });
      const clips = CLIP_X.map((x) => {
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.028, 8, 20, Math.PI * 1.6).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#D5D9DE', metalness: 1, roughness: 0.2}));
        o.position.set(x, TUBE_Y, 0);
        o.visible = false;
        o.castShadow = true;
        duct.add(o);
        return o;
      });
      for (const t of [tubeL, tubeR]) t.geometry.setAttribute('aRest', t.geometry.getAttribute('position').clone());
      // ---- ca cắt túi mật: màng phúc mạc, dải nối túi mật với gan, clip trên động mạch
      const memb = cellSurface(MEMB, (i, j) => {
        const x = MEMB.x0 + i * MEMB.dx;
        const z = MEMB.z0 + j * MEMB.dz;
        return [x, membY(x, z), z];
      }, '#EDC8B8', {transparent: true, opacity: 0.66, depthWrite: false});
      memb.mesh.renderOrder = 1;
      const band = cellSurface(BAND, (i, j) => {
        const u = BAND.x0 + i * BAND.dx;
        const v = BAND.z0 + j * BAND.dz;
        const [x, z] = bandXZ(u, v);
        return [x, 0.86 - 0.08 * Math.abs(v) + 0.022 * Math.sin(i * 1.9 + j * 2.1), z];
      }, '#EAD9B8', {transparent: true, depthWrite: false});
      band.mesh.castShadow = true;
      memb.show(live.st.memb);
      band.show(live.st.band);
      // giường gan: mặt gan thô lộ ra khi túi mật được bóc đi
      const fossa = new THREE.Mesh(new THREE.PlaneGeometry(BAND_LEN + 1.1, 1.5).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({map: softSpot('rgba(92,18,26,0.96)', 'rgba(92,18,26,0)', true), transparent: true, depthWrite: false, roughness: 0.3, clearcoat: 1, opacity: 0}));
      fossa.position.set((BAND_A[0] + BAND_B[0]) / 2, 0.66, (BAND_A[1] + BAND_B[1]) / 2 + 0.42);
      fossa.rotation.y = -Math.atan2(BAND_B[1] - BAND_A[1], BAND_B[0] - BAND_A[0]);
      const cholePart = new THREE.Group().add(fossa, memb.mesh, band.mesh);
      cholePart.visible = false;
      k.scene.add(cholePart);
      let shownMemb = live.st.memb;
      let shownBand = live.st.band;
      const artClips = ART_CLIP_X.map(() => {
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 20, Math.PI * 1.6).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#D5D9DE', metalness: 1, roughness: 0.2}));
        o.scale.setScalar(0.62);
        o.visible = false;
        k.scene.add(o);
        return o;
      });
      const artMarks = ART_CLIP_X.map(() => {
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 8, 24).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FFE16B'}));
        o.visible = false;
        k.scene.add(o);
        return o;
      });
      // hai đầu ống sau khi cắt: lòng ống sẫm
      const stumps = [0, 1].map(() => {
        const o = new THREE.Mesh(new THREE.CircleGeometry(0.1, 18).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#3A2A12', roughness: 0.5, side: THREE.DoubleSide}));
        o.visible = false;
        duct.add(o);
        return o;
      });

      // ---- máu: giọt bắn theo nhịp, vũng loang ở chỗ chảy
      const NB = 150;
      const bloodM = new THREE.MeshPhysicalMaterial({color: '#A80A1C', roughness: 0.14, clearcoat: 1});
      const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), bloodM, NB);
      drops.frustumCulled = false;
      drops.count = 0;
      k.scene.add(drops);
      const bp = Array.from({length: NB}, () => ({p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0}));
      let bAcc = 0;
      const leak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({map: softSpot('rgba(112,6,18,0.96)', 'rgba(112,6,18,0)', true), transparent: true, depthWrite: false, roughness: 0.1, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2}));
      leak.visible = false;
      k.scene.add(leak);
      let poolSize = 0;

      // ---- khói đốt điện
      const smokeTex = softSpot('rgba(232,226,216,0.62)', 'rgba(232,226,216,0)');
      const smoke = Array.from({length: 34}, () => {
        const m = new THREE.SpriteMaterial({map: smokeTex, transparent: true, depthWrite: false, opacity: 0});
        const s = new THREE.Sprite(m);
        s.visible = false;
        k.scene.add(s);
        return {s, m, life: 0, v: new THREE.Vector3()};
      });
      let smokeAcc = 0;

      // ---- vết đốt: bám theo hạt mô để đi cùng khi mô bị kéo
      const NBURN = 180;
      const burnM = new THREE.MeshStandardMaterial({map: softSpot('rgba(34,20,14,0.95)', 'rgba(120,88,62,0)'), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3});
      const burns = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.17).rotateX(-Math.PI / 2), burnM, NBURN);
      burns.frustumCulled = false;
      burns.count = 0;
      burns.renderOrder = 2;
      k.scene.add(burns);
      const burnAt: {b: SoftBody; i: number; off: P3}[] = [];
      let lastBurn: P3 | null = null;
      const anchorRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: ORANGE, depthTest: false, transparent: true}));
      anchorRing.renderOrder = 5;
      anchorRing.position.set(...ANCHOR);
      k.scene.add(anchorRing);
      const goalRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.016, 8, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FBF9F4', depthTest: false, transparent: true}));
      goalRing.renderOrder = 5;
      k.scene.add(goalRing);

      // ---- TÚI LẤY BỆNH PHẨM (endobag): túi nhựa trong, miệng giữ mở bằng vòng kim loại đàn hồi, dây rút luồn ra cổng rốn
      const bag = new THREE.Group();
      const pouchM = new THREE.MeshPhysicalMaterial({color: '#DCE7EE', transparent: true, opacity: 0.58, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, depthWrite: false});
      const pouch = new THREE.Mesh(new THREE.LatheGeometry([[0.0, -0.98], [0.16, -0.95], [0.32, -0.82], [0.43, -0.6], [0.48, -0.32], [0.47, -0.08], [0.45, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 36), pouchM);
      // nếp nhăn của túi nhựa: dải mờ chạy dọc thân túi
      for (let i = 0; i < 7; i++) {
        const crease = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.8), new THREE.MeshBasicMaterial({color: '#FFFFFF', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide}));
        const a = (i / 7) * Math.PI * 2;
        crease.position.set(Math.cos(a) * 0.44, -0.42, Math.sin(a) * 0.44);
        crease.lookAt(0, -0.42, 0);
        pouch.add(crease);
      }
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.026, 10, 48).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({color: '#AFC3D3', metalness: 0.7, roughness: 0.3}));
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), new THREE.MeshStandardMaterial({color: '#EDE7D6', roughness: 0.8}));
      bag.add(pouch, rim);
      bag.position.set(BAG_AT[0], BAG_AT[1] + 0.2, BAG_AT[2]);
      bag.rotation.x = 1.15; // túi nằm ngả trên mặt mô, thân túi về phía sau, miệng mở hướng lên ống soi
      bag.visible = false;
      k.scene.add(bag, cord);
      const cordTop = new THREE.Vector3(0.6, 4, 2.4); // cổng rốn
      let bagClose = 0;

      const tools = [makeTool(k, HAND_COL[0]), makeTool(k, HAND_COL[1])];
      // giải phẫu chi tiết; chưa tải được thì giữ các khối đơn giản ở trên. Vùng tam giác gan mật chỉ hiện ở bài kẹp cắt
      const fieldParts: THREE.Object3D[] = [];
      const softs: Soft[] = [];
      const softMeshes: THREE.Mesh[] = [];
      let liverSoft: Soft | null = null;
      let biliary: Soft | null = null;
      let bedSoft: Soft | null = null;
      let arteryMesh: SoftMesh | null = null;
      /** mỗi đỉnh của đường động mạch đi theo hạt gần nhất của thân chứa nó */
      let arteryNode: number[] = [];
      const released = new Set<number>();
      let didArtery = false;
      let specimenOut = false;
      /** hạt của bệnh phẩm (túi mật + nửa ống phía túi mật) và hình dạng lúc bắt đầu mang đi */
      const specIdx = (b: SoftBody) => Array.from({length: b.n}, (_, i) => i).filter((i) => i >= CHAIN || chainX(i) < SPLIT);
      let carry: {idx: number[]; shape: Float32Array} | null = null;
      const gbC = new THREE.Vector3();
      const gbCenter = (): P3 | undefined => {
        const b = biliary?.body;
        if (!b) return undefined;
        gbC.set(0, 0, 0);
        for (let i = CHAIN; i < b.n; i++) gbC.add(v8.set(b.pos[i * 3], b.pos[i * 3 + 1], b.pos[i * 3 + 2]));
        gbC.divideScalar(Math.max(1, b.n - CHAIN));
        return [gbC.x, gbC.y, gbC.z];
      };
      const v8 = new THREE.Vector3();
      // chỉ khi phát triển: máy dò trình duyệt đọc tâm túi mật để kéo thử chặng cho vào túi
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__lapScene?: unknown}).__lapScene = {gbCenter};
      const collect = (o: THREE.Object3D) => {
        const out: THREE.Mesh[] = [];
        o.traverse((c) => (c as THREE.Mesh).isMesh && out.push(c as THREE.Mesh));
        return out;
      };
      const restOf = (g: THREE.BufferGeometry) => Float32Array.from(g.getAttribute('position').array as ArrayLike<number>);
      /** đưa lưới về toạ độ thế giới và tách hình học riêng để sửa đỉnh mỗi khung */
      const bakeMesh = (m: THREE.Mesh, kind: (typeof DEFORM)[string]) => {
        m.updateWorldMatrix(true, false);
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        g.setAttribute('aRest', g.getAttribute('position').clone());
        (g.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
        m.geometry = g;
        for (let p: THREE.Object3D | null = m; p && p !== k.scene; p = p.parent) {
          p.position.set(0, 0, 0);
          p.quaternion.identity();
          p.scale.set(1, 1, 1);
        }
        organify(m.material as THREE.Material, kind, true);
        softMeshes.push(m);
      };
      const cloud = (ms: THREE.Mesh[], spacing: number, home: number, link: number): Soft => {
        const all = ms.flatMap((m) => Array.from(restOf(m.geometry)));
        const pts = sampleCloud(all, spacing);
        const body = new SoftBody(pts, home, linkWithin(pts, link));
        return {body, meshes: ms.map((m) => ({geo: m.geometry, rest: restOf(m.geometry), skin: buildSkin(restOf(m.geometry), pts)}))};
      };
      /** ống (chuỗi hạt) + túi mật trong cùng một thân: kéo túi mật thì ống căng theo */
      const makeBiliary = (gb: THREE.Mesh[]): Soft => {
        const chain = Array.from({length: CHAIN}, (_, i) => [chainX(i), TUBE_Y, 0]).flat();
        const gbPts = sampleCloud(gb.flatMap((m) => Array.from(restOf(m.geometry))), 0.3);
        const pts = [...chain, ...gbPts];
        const edges: Edge[] = [];
        for (let i = 0; i + 1 < CHAIN; i++) edges.push([i, i + 1]);
        for (let i = 0; i + 2 < CHAIN; i++) edges.push([i, i + 2]);
        edges.push(...linkWithin(gbPts, 0.62, CHAIN));
        for (let j = CHAIN; j < pts.length / 3; j++) if (Math.hypot(pts[j * 3] - chain[0], pts[j * 3 + 1] - chain[1], pts[j * 3 + 2] - chain[2]) < 0.6) edges.push([0, j], [1, j]);
        // đầu phải nối vào ống mật chủ nên gần như cố định
        const body = new SoftBody(pts, (i) => (i >= CHAIN - 2 ? 1 : i < CHAIN ? 0.035 : 0.05), edges);
        // trước khi cắt hai nửa ống bám chung cả chuỗi nên chỗ nối liền mạch
        const whole = (i: number) => i < CHAIN;
        const mk = (g: THREE.BufferGeometry, only: (i: number) => boolean): SoftMesh => ({geo: g, rest: restOf(g), skin: buildSkin(restOf(g), pts, 3, only)});
        return {body, meshes: [mk(tubeL.geometry, whole), mk(tubeR.geometry, whole), ...gb.map((m) => mk(m.geometry, (i) => i >= CHAIN || i < 3))]};
      };
      /** vị trí trên ống tại toạ độ x lúc nghỉ */
      const onChain = (b: SoftBody, x: number, out: THREE.Vector3) => {
        const f = Math.max(0, Math.min(CHAIN - 1.001, ((x - TUBE_X[0]) / (TUBE_X[1] - TUBE_X[0])) * (CHAIN - 1)));
        const i = Math.floor(f);
        const u = f - i;
        return out.set(b.pos[i * 3] * (1 - u) + b.pos[i * 3 + 3] * u, b.pos[i * 3 + 1] * (1 - u) + b.pos[i * 3 + 4] * u, b.pos[i * 3 + 2] * (1 - u) + b.pos[i * 3 + 5] * u);
      };
      const refresh = (s: Soft) => {
        for (const m of s.meshes) {
          const a = m.geo.getAttribute('position') as THREE.BufferAttribute;
          applySkin(m.skin, m.rest, s.body, a.array as Float32Array);
          a.needsUpdate = true;
          m.geo.computeVertexNormals();
          m.geo.computeBoundingSphere();
        }
      };
      void loadModel('/models/lap-anatomy.glb')
        .then((lib) => {
          const byName = new Map<string, THREE.Object3D>();
          for (const src of lib.children) {
            if (!src.name.startsWith('LA_')) continue;
            const o = src.clone(true);
            o.traverse((c) => {
              const m = c as THREE.Mesh;
              if (!m.isMesh) return;
              m.material = (m.material as THREE.Material).clone();
              m.receiveShadow = true;
              // bóng đổ chỉ cần ở vật gần vùng làm việc; lưới lớn đổ bóng tốn gấp đôi
              m.castShadow = src.name === 'LA_gallbladder';
            });
            k.scene.add(o);
            byName.set(src.name, o);
            if (DEFORM[src.name]) collect(o).forEach((m) => bakeMesh(m, DEFORM[src.name]));
            else organAll(o, 'peritoneum');
            if (['LA_gallbladder', 'LA_cbd', 'LA_artery', 'LA_fat'].includes(src.name)) fieldParts.push(o);
          }
          const meshesOf = (...n: string[]) => n.flatMap((x) => (byName.has(x) ? collect(byName.get(x)!) : []));
          liverSoft = cloud(meshesOf('LA_liver'), 0.62, 0.11, 1.0);
          biliary = makeBiliary(meshesOf('LA_gallbladder'));
          const artGeo = meshesOf('LA_artery')[0]?.geometry;
          bedSoft = cloud(meshesOf('LA_cbd', 'LA_artery', 'LA_fat'), 0.36, 0.1, 0.62);
          arteryMesh = bedSoft.meshes.find((m) => m.geo === artGeo) ?? null;
          const bp0 = bedSoft.body.rest;
          arteryNode = ARTERY.map(([x, z]) => {
            let best = 0;
            let bd = Infinity;
            for (let i = 0; i < bedSoft!.body.n; i++) {
              const d = Math.hypot(bp0[i * 3] - x, bp0[i * 3 + 2] - z);
              if (d < bd) {
                bd = d;
                best = i;
              }
            }
            return best;
          });
          softs.push(biliary, bedSoft, liverSoft);
          // màng đi theo mô bên dưới; dải nối đi theo túi mật
          const addSurface = (s: Soft, geo: THREE.BufferGeometry, only?: (i: number) => boolean) => {
            const rest = restOf(geo);
            s.meshes.push({geo, rest, skin: buildSkin(rest, s.body.rest, 3, only)});
          };
          addSurface(bedSoft, memb.geo);
          addSurface(biliary, band.geo, (i) => i >= CHAIN);
          organs.visible = false;
          tools.forEach((t) => t.dress(lib));
          const mark = lib.getObjectByName('LT_clipmark') as THREE.Mesh | undefined;
          if (mark?.isMesh)
            (clips as THREE.Mesh[]).forEach((c) => {
              c.geometry = mark.geometry;
              c.material = (mark.material as THREE.Material).clone();
            });
        })
        .catch(() => {});
      const handle: [number, number][] = [[0.15, 0.1], [-0.15, 0.1]];
      const tipY = [TIP_HIGH, TIP_HIGH];
      const openAmt = [1, 1];
      const stick = [false, false];
      let stickTask = live.st.task;
      let last = performance.now();
      const prevGrip = [false, false];
      let didCut = false;
      /** đường động mạch hiện tại trên mặt xz */
      const arteryPath = (): [number, number][] | undefined => {
        if (!bedSoft || !arteryNode.length) return undefined;
        const b = bedSoft.body;
        return ARTERY.map(([x, z], k2) => {
          const i = arteryNode[k2] * 3;
          return [x + b.pos[i] - b.rest[i], z + b.pos[i + 2] - b.rest[i + 2]];
        });
      };
      const v7 = new THREE.Vector3();
      /** điểm trên động mạch tại toạ độ x lúc nghỉ */
      const onArtery = (x: number, out: THREE.Vector3) => {
        let a = 0;
        while (a < ARTERY.length - 2 && x < ARTERY[a + 1][0]) a++;
        const u = (x - ARTERY[a][0]) / (ARTERY[a + 1][0] - ARTERY[a][0]);
        out.set(x, 0.39, ARTERY[a][1] + (ARTERY[a + 1][1] - ARTERY[a][1]) * u);
        if (bedSoft && arteryNode.length) {
          const b = bedSoft.body;
          const p = arteryNode[a] * 3;
          const q = arteryNode[a + 1] * 3;
          for (const c of [0, 1, 2]) out.setComponent(c, out.getComponent(c) + (b.pos[p + c] - b.rest[p + c]) * (1 - u) + (b.pos[q + c] - b.rest[q + c]) * u);
        }
        return out;
      };
      /** quy mũi dụng cụ về vị trí nghỉ của ống: mô bị kéo lệch thì vẫn xét đúng đoạn ống */
      const ductRest = (tip: P3): P3 | undefined => {
        const b = biliary?.body;
        if (!b) return undefined;
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < CHAIN; i++) {
          const d = Math.hypot(b.pos[i * 3] - tip[0], b.pos[i * 3 + 2] - tip[2]);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        const i = best * 3;
        return [tip[0] - (b.pos[i] - b.rest[i]), tip[1], tip[2] - (b.pos[i + 2] - b.rest[i + 2])];
      };
      const arteryRest = (tip: P3, path?: [number, number][]): P3 | undefined => {
        if (!path) return undefined;
        let best = 0;
        let bd = Infinity;
        path.forEach(([x, z], i) => {
          const d = Math.hypot(x - tip[0], z - tip[2]);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        return [tip[0] - (path[best][0] - ARTERY[best][0]), tip[1], tip[2] - (path[best][1] - ARTERY[best][1])];
      };
      const m4 = new THREE.Matrix4();
      const q4 = new THREE.Quaternion();
      const v5 = new THREE.Vector3();
      const v6 = new THREE.Vector3();
      const down5 = new THREE.Vector3(0, -1, 0);
      const up5 = new THREE.Vector3(0, 1, 0);
      const ray5 = new THREE.Raycaster();

      /** một bước mô mềm; trả điểm rách nếu mô vừa bị kéo quá mức */
      const stepSoft = (dt: number, tips: [P3, P3], grip: [boolean, boolean], clipTask: boolean): P3 | null => {
        if (!softs.length) return null;
        let tear: P3 | null = null;
        for (const h of [0, 1] as const) {
          // chặng cho vào túi: túi mật đã rời gan, kẹp chỉ cầm bệnh phẩm (cảnh tự mang theo mũi kẹp), không cầm nhầm gan / giường gan mà kéo rách
          const bagging = live.st.phase === 'bag';
          if (grip[h] && !prevGrip[h] && clipTask && !bagging && (h === 0 || live.right === 'grasper')) for (const s of softs) if (s.body.grasp(h, tips[h], 0.36)) break;
          if (!grip[h]) softs.forEach((s) => s.body.release(h));
          prevGrip[h] = grip[h];
        }
        const contact: SoftTip[] = [{at: tips[0], r: 0.28, h: 0}, {at: tips[1], r: 0.28, h: 1}];
        for (const s of softs) {
          // ngoài bài kẹp cắt chỉ còn gan nằm trong tầm dụng cụ
          if (!clipTask && s !== liverSoft) continue;
          s.body.step(dt, contact);
          if (s.body.moving) refresh(s);
          for (const h of [0, 1] as const)
            if (s.body.pulled(h) > TEAR_PULL) {
              tear = s.body.heldPoint(h);
              s.body.release(h);
            }
        }
        return tear;
      };
      /** vết đốt tại mũi móc: chiếu xuống mặt mô rồi gắn vào hạt gần nhất */
      const addBurn = (tip: P3) => {
        if (burnAt.length >= NBURN || (lastBurn && Math.hypot(tip[0] - lastBurn[0], tip[2] - lastBurn[2]) < 0.05)) return;
        ray5.set(v5.set(tip[0], tip[1] + 1.2, tip[2]), down5);
        const hit = ray5.intersectObjects(softMeshes.filter((m) => m.visible), false)[0];
        if (!hit) return;
        lastBurn = [...tip];
        let owner: SoftBody | null = null;
        let oi = 0;
        let bd = Infinity;
        for (const s of softs)
          for (let i = 0; i < s.body.n; i++) {
            const d = hit.point.distanceToSquared(v6.set(s.body.pos[i * 3], s.body.pos[i * 3 + 1], s.body.pos[i * 3 + 2]));
            if (d < bd) {
              bd = d;
              owner = s.body;
              oi = i;
            }
          }
        if (owner) burnAt.push({b: owner, i: oi, off: [hit.point.x - owner.pos[oi * 3], hit.point.y + 0.012 - owner.pos[oi * 3 + 1], hit.point.z - owner.pos[oi * 3 + 2]]});
      };

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1);
        k.controls.enabled = false;
        const want = clampScope(live.scope ?? {zoom: 1, x: 0, z: 0});
        const ease = 1 - Math.exp(-dt * 6);
        camNow.zoom += (want.zoom - camNow.zoom) * ease;
        camNow.x += (want.x - camNow.x) * ease;
        camNow.z += (want.z - camNow.z) * ease;
        if (++camFrames === 2) {
          camBase = k.controls.target.clone();
          camDir = k.camera.position.clone().sub(camBase);
        }
        if (camBase && camDir) {
          k.controls.target.set(camBase.x + camNow.x, camBase.y, camBase.z + camNow.z);
          k.camera.position.copy(k.controls.target).addScaledVector(camDir, camNow.zoom);
        }
        scope.position.copy(k.camera.position);
        scope.target.position.set(camX + camNow.x, 0, camNow.z);

        const grip: [boolean, boolean] = [false, false];
        for (const h of [0, 1] as const) {
          const hand = P.ptrs[h];
          const mouse = P.ptrs[2];
          const p = hand.active ? hand : live.mouseHand === h && mouse.active ? mouse : null;
          // một chuột không giữ được hai tay: ở bước cần giữ, bấm một lần là khóa kẹp, bấm lần nữa là nhả
          const sticky = live.st.task === 'transfer' || (fieldTask(live.st.task) && h === 0);
          if (live.st.task !== stickTask) {
            stickTask = live.st.task;
            stick[0] = stick[1] = false;
          }
          if (p) {
            handle[h] = handleOf(p.ndc.x, p.ndc.y);
            if (p === mouse && sticky && p.pressed) stick[h] = !stick[h];
            grip[h] = p === mouse && sticky ? stick[h] : p.down;
            p.hot = grip[h];
          } else if (sticky) grip[h] = stick[h];
          tipY[h] += ((grip[h] ? TIP_LOW : TIP_HIGH) - tipY[h]) * (1 - Math.exp(-dt * 16));
          openAmt[h] += ((grip[h] ? 0 : 1) - openAmt[h]) * (1 - Math.exp(-dt * 22));
        }
        const clipTask = fieldTask(live.st.task);
        const ports = trocarsOf(live.st.task);
        const yOf = (h: number) => (clipTask ? TUBE_Y + (tipY[h] - TIP_LOW) * 0.5 : tipY[h]);
        const tips: [P3, P3] = [tipOf(ports[0], handle[0][0], handle[0][1], yOf(0)), tipOf(ports[1], handle[1][0], handle[1][1], yOf(1))];
        const tear = stepSoft(dt, tips, grip, clipTask);
        const arteryNow = clipTask ? arteryPath() : undefined;
        const wasHeld = live.st.gbHeld;
        live.st = lapStep(live.st, {dt, tips, grip, right: live.right, tear, arteryNow, ductTip: clipTask ? ductRest(tips[1]) : undefined, arteryTip: clipTask ? arteryRest(tips[1], arteryNow) : undefined, gb: live.st.phase === 'bag' ? gbCenter() : undefined});
        const st = live.st;
        // mang túi mật theo mũi kẹp trái: chỗ mô muốn về = mũi kẹp + hình dạng lúc kẹp (không kéo giãn nên không rách)
        const bb = biliary?.body;
        if (bb && st.gbHeld && !wasHeld) {
          const c = gbCenter()!;
          const idx = specIdx(bb);
          carry = {idx, shape: Float32Array.from(idx.flatMap((i) => [bb.pos[i * 3] - c[0], bb.pos[i * 3 + 1] - c[1], bb.pos[i * 3 + 2] - c[2]]))};
          for (const i of idx) bb.setPull(i, 0.3);
        }
        if (bb && carry) {
          const follow = st.gbHeld;
          carry.idx.forEach((i, n) => {
            if (follow) {
              bb.home[i * 3] = tips[0][0] + carry!.shape[n * 3];
              bb.home[i * 3 + 1] = tips[0][1] + 0.12 + carry!.shape[n * 3 + 1];
              bb.home[i * 3 + 2] = tips[0][2] + carry!.shape[n * 3 + 2];
            } else if (!st.bagged) bb.home[i * 3 + 1] = Math.max(0.55, bb.pos[i * 3 + 1] - 0.3); // tuột kẹp: rơi xuống mặt gan
          });
          if (!follow) carry = null;
        }
        // túi lấy bệnh phẩm: hiện ở chặng cuối; cho túi mật vào xong thì miệng túi thắt lại, bệnh phẩm khuất trong túi
        bag.visible = st.task === 'chole' && (st.phase === 'bag' || st.bagged);
        cord.visible = bag.visible;
        bagClose += ((st.bagged ? 1 : 0) - bagClose) * (1 - Math.exp(-dt * 3));
        rim.scale.setScalar(1 - 0.82 * bagClose);
        pouch.scale.set(1 - 0.25 * bagClose, 1 + 0.08 * bagClose, 1 - 0.25 * bagClose);
        bag.position.set(BAG_AT[0], BAG_AT[1] + 0.2 + 0.5 * bagClose, BAG_AT[2]);
        if (cord.visible) {
          v8.set(0, 0, 0).applyMatrix4(rim.matrixWorld);
          cord.position.copy(v8).add(cordTop).multiplyScalar(0.5);
          cord.scale.set(1, v8.distanceTo(cordTop), 1);
          cord.quaternion.setFromUnitVectors(up5, v6.copy(cordTop).sub(v8).normalize());
        }

        tools[0].update(tips[0], ports[0], openAmt[0], 'grasper');
        tools[1].update(tips[1], ports[1], openAmt[1], clipTask ? live.right : 'grasper');

        const task = st.task;
        skills.visible = !clipTask;
        duct.visible = clipTask;
        fieldParts.forEach((o) => (o.visible = clipTask));
        // túi mật (và nửa ống phía túi mật) đã nằm trong túi lấy bệnh phẩm: khuất đi khi miệng túi thắt lại; nửa ống phía người bệnh (có clip) ở lại
        if (st.bagged && biliary) for (const m of biliary.meshes) if (m.geo !== biliary.meshes[1].geo) for (const o of softMeshes) if (o.geometry === m.geo) o.visible = bagClose < 0.6;
        const chole = task === 'chole';
        cholePart.visible = chole;
        // bóc xong thì các sợi mô sót lại rời cùng túi mật
        const freed = st.phase === 'bag' || st.done;
        band.mesh.visible = !freed;
        // ---- ô vừa bị đốt: dựng lại lưới, phần túi mật đã bóc thì rời khỏi chỗ bám
        if (st.memb !== shownMemb) {
          shownMemb = st.memb;
          memb.show(st.memb);
        }
        if (st.band !== shownBand) {
          shownBand = st.band;
          band.show(st.band);
          const b = biliary?.body;
          if (b)
            for (let i = CHAIN; i < b.n; i++) {
              if (released.has(i)) continue;
              const [u] = bandUV(b.rest[i * 3], b.rest[i * 3 + 2]);
              const col = Math.max(0, Math.min(BAND.nx - 1, Math.floor((u / BAND_LEN) * BAND.nx)));
              if (columnCleared(st.band, BAND, col) < 0.7) continue;
              released.add(i);
              b.setPull(i, 0.008);
              // mất chỗ bám: túi mật nhấc khỏi giường gan
              b.home[i * 3 + 1] += 0.2;
              b.home[i * 3 + 2] += 0.14;
            }
        }
        (fossa.material as THREE.MeshPhysicalMaterial).opacity = chole && st.phase === 'bed' ? clearedIn(st.band, BAND) : 0;
        // bóc xong: túi mật cùng đoạn ống đã cắt nhấc hẳn khỏi giường gan
        if (chole && freed && !st.bled && !specimenOut && biliary) {
          specimenOut = true;
          const b = biliary.body;
          for (let i = 0; i < b.n; i++) {
            if (i < CHAIN && chainX(i) >= SPLIT) continue;
            b.setPull(i, 0.05);
            b.home[i * 3] += 0.35;
            b.home[i * 3 + 1] += 0.75;
            b.home[i * 3 + 2] += 0.95;
          }
          b.release(0);
        }
        // ---- cắt động mạch: bỏ tam giác ở đoạn cắt và cho hai đầu co lại
        if (st.artCut && !didArtery && arteryMesh && bedSoft) {
          didArtery = true;
          const cx = (ART_CUT_X[0] + ART_CUT_X[1]) / 2;
          const m = arteryMesh;
          const old = m.geo.getIndex()!;
          const keep: number[] = [];
          for (let t = 0; t + 2 < old.count; t += 3) {
            const [a, b, c] = [old.getX(t), old.getX(t + 1), old.getX(t + 2)];
            const mx = (m.rest[a * 3] + m.rest[b * 3] + m.rest[c * 3]) / 3;
            const mz = (m.rest[a * 3 + 2] + m.rest[b * 3 + 2] + m.rest[c * 3 + 2]) / 3;
            if (Math.abs(mx - cx) > 0.05 || mz > -0.3 || mz < -0.72) keep.push(a, b, c);
          }
          m.geo.setIndex(keep);
          for (let i = 0; i < m.rest.length; i += 3) if (m.rest[i + 2] < -0.3 && m.rest[i + 2] > -0.72) m.rest[i] += (m.rest[i] < cx ? -0.13 : 0.13) * Math.exp(-Math.abs(m.rest[i] - cx) / 0.5);
          refresh(bedSoft);
        }
        artClips.forEach((o, i) => {
          o.visible = chole && st.artClips[i];
          if (o.visible) onArtery(ART_CLIP_X[i], o.position);
        });
        artMarks.forEach((o, i) => {
          o.visible = chole && st.phase === 'artery' && !st.artClips[i];
          if (o.visible) onArtery(ART_CLIP_X[i], o.position);
        });
        pegs.visible = task === 'transfer';
        targets.forEach((o, i) => {
          o.visible = task === 'touch' && i >= st.target;
          targetMats[i].emissiveIntensity = i === st.target ? 0.75 + 0.3 * Math.sin(now / 160) : 0.05;
        });
        rings.forEach((o, i) => {
          o.visible = task === 'transfer';
          o.position.set(...st.rings[i].pos);
        });
        const chainBody = biliary?.body ?? null;
        if (st.cut && !didCut && chainBody) {
          didCut = true;
          chainBody.cutX(SPLIT);
          // từ đây mỗi nửa ống chỉ bám chuỗi bên mình
          biliary!.meshes.slice(0, 2).forEach((m, side) => (m.skin = buildSkin(m.rest, chainBody.rest, 3, (i) => i < CHAIN && chainX(i) < SPLIT === (side === 0))));
          // ống đàn hồi nên hai đầu co lại sau khi cắt
          for (let i = 0; i < CHAIN - 2; i++) chainBody.home[i * 3] += (chainX(i) < SPLIT ? -0.2 : 0.2) * Math.exp(-Math.abs(chainX(i) - SPLIT) / 0.7);
        }
        clips.forEach((o, i) => {
          o.visible = st.clips[i];
          if (chainBody) onChain(chainBody, CLIP_X[i], o.position);
        });
        marks.forEach((o, i) => {
          o.visible = !st.clips[i] && !st.cut && (task === 'clip' || st.phase === 'duct');
          if (chainBody) onChain(chainBody, CLIP_X[i], o.position);
        });
        stumps.forEach((o, i) => {
          o.visible = st.cut;
          if (chainBody && st.cut) onChain(chainBody, SPLIT + (i ? 0.07 : -0.07), o.position);
        });
        if (chainBody) anchorRing.position.set(...chainBody.point(Math.round(((ANCHOR[0] - TUBE_X[0]) / (TUBE_X[1] - TUBE_X[0])) * (CHAIN - 1))));

        // ---- móc đốt: khói và vết cháy khi chạm mô
        const hooking = clipTask && live.right === 'hook' && grip[1] && !st.done;
        if (hooking) {
          addBurn(tips[1]);
          smokeAcc += dt * 26;
          for (const q of smoke) {
            if (smokeAcc < 1) break;
            if (q.life > 0) continue;
            smokeAcc -= 1;
            q.life = 1;
            q.s.position.set(tips[1][0], tips[1][1] + 0.03, tips[1][2]);
            q.v.set((Math.random() - 0.5) * 0.28, 0.42 + Math.random() * 0.34, (Math.random() - 0.5) * 0.28);
          }
          smokeAcc = Math.min(smokeAcc, 2);
        }
        for (const q of smoke) {
          if (q.life <= 0) continue;
          q.life -= dt * 0.72;
          q.s.position.addScaledVector(q.v, dt);
          q.v.multiplyScalar(1 - dt * 0.7);
          q.s.visible = q.life > 0;
          q.m.opacity = Math.max(0, q.life) * 0.34;
          q.s.scale.setScalar(0.16 + (1 - q.life) * 0.85);
        }
        burns.visible = clipTask;
        burns.count = burnAt.length;
        burnAt.forEach((d, i) => {
          const p = d.i * 3;
          burns.setMatrixAt(i, m4.compose(v5.set(d.b.pos[p] + d.off[0], d.b.pos[p + 1] + d.off[1], d.b.pos[p + 2] + d.off[2]), q4.setFromAxisAngle(up5, i * 2.4), v6.setScalar(0.72 + (i % 4) * 0.16)));
        });
        burns.instanceMatrix.needsUpdate = true;

        // ---- máu: tia theo nhịp ở chỗ đang chảy, vũng lớn dần theo lượng mất
        if (st.bleed && clipTask) {
          const beat = 0.55 + 0.45 * Math.max(0, Math.sin((now / 1000) * 2 * Math.PI * 1.25));
          bAcc += dt * 70 * beat;
          for (const q of bp) {
            if (bAcc < 1) break;
            if (q.life > 0) continue;
            bAcc -= 1;
            q.life = 1;
            q.p.set(...st.bleed.at);
            q.v.set((Math.random() - 0.5) * 0.6, 0.45 + beat * 0.65 * Math.random(), (Math.random() - 0.5) * 0.6);
          }
          bAcc = Math.min(bAcc, 3);
          leak.position.set(st.bleed.at[0], Math.max(0.05, st.bleed.at[1] - 0.26), st.bleed.at[2]);
        }
        let nd = 0;
        for (const q of bp) {
          if (q.life <= 0) continue;
          q.v.y -= 3.1 * dt;
          q.p.addScaledVector(q.v, dt);
          q.life -= dt * 1.2;
          if (q.p.y < 0.06) q.life = 0;
          if (q.life <= 0) continue;
          drops.setMatrixAt(nd++, m4.compose(q.p, q4.setFromUnitVectors(up5, v5.copy(q.v).normalize()), v6.set(1, 1 + q.v.length() * 1.5, 1)));
        }
        drops.count = nd;
        drops.instanceMatrix.needsUpdate = true;
        poolSize = st.bled ? 1.5 : Math.min(1.5, 0.22 + Math.sqrt(st.loss) * 0.14);
        leak.visible = clipTask && (st.loss > 0.5 || st.bled);
        if (st.bled && !st.bleed) leak.position.set(SPLIT, 0.06, 0.05);
        leak.scale.set(poolSize, 1, poolSize);
        anchorRing.visible = (task === 'clip' || (task === 'chole' && st.phase === 'duct')) && !st.done;

        let goal: P3 | null = null;
        if (task === 'touch' && !st.done) goal = TARGETS[st.target].at;
        if (task === 'transfer' && !st.done) {
          const held = st.rings.find((r) => r.holder !== null);
          goal = held?.holder === 1 && held.passed ? (PEGS_GOAL.find((g) => !st.rings.some((r) => r.placed && Math.hypot(r.pos[0] - g[0], r.pos[2] - g[2]) < 0.05)) ?? null) : held ? [0, 0.55, 0.2] : (st.rings.find((r) => !r.placed)?.pos ?? null);
        }
        if (task === 'chole' && !st.done && !st.bleed) {
          if (st.phase === 'expose') {
            const f = firstAlive(st.memb, MEMB, WINDOW);
            if (f) goal = [f[0], 0.5, f[1]];
          } else if (st.phase === 'cvs') {
            if (!st.cvs[0] && biliary) onChain(biliary.body, -1.0, v7);
            else onArtery(-1.0, v7);
            goal = [v7.x, v7.y, v7.z];
          } else if (st.phase === 'bag') {
            goal = st.gbHeld ? BAG_AT : (gbCenter() ?? null);
          } else if (st.phase === 'artery' && st.artClips.every(Boolean)) {
            onArtery((ART_CUT_X[0] + ART_CUT_X[1]) / 2, v7);
            goal = [v7.x, v7.y, v7.z];
          } else if (st.phase === 'bed') {
            const f = firstAlive(st.band, BAND);
            if (f) {
              const [x, z] = bandXZ(f[0], f[1]);
              goal = [x, 0.86, z];
            }
          }
        }
        if (st.bleed) goal = st.bleed.at;
        goalRing.visible = !!goal;
        if (goal) goalRing.position.set(goal[0], goal[1] + 0.05, goal[2]);

        const def = LAP_TASKS.find((x) => x.id === task)!;
        const how = st.done
          ? 'Hoàn thành. Xem điểm ở bảng điều khiển.'
          : task === 'touch'
            ? `Mục tiêu ${st.target + 1}/${TARGETS.length}: dùng tay ${TARGETS[st.target].hand ? 'phải (vàng)' : 'trái (xanh)'}. Tay đi một hướng, mũi đi hướng ngược lại.`
            : task === 'transfer'
              ? `Đã đặt ${st.rings.filter((r) => r.placed).length}/${st.rings.length} vòng. Trái nhấc, chuyển sang phải ở giữa, phải đặt vào chốt vàng.`
              : task === 'chole' && !st.bleed
                ? `${CHOLE_PHASES.findIndex((p) => p.id === st.phase) + 1}/${CHOLE_PHASES.length} · ${CHOLE_PHASES.find((p) => p.id === st.phase)!.how}`
              : st.bleed
                ? `Đang chảy máu. Tay phải chọn móc đốt, giữ vào chỗ chảy (đã đốt ${Math.round((st.bleed.coag / 0.8) * 100)} %).`
                : `Tay phải: ${RIGHT_TOOL_NAME[live.right].toLowerCase()}. Clip ${st.clips.filter(Boolean).length}/3. Tay trái giữ vòng cam để kéo căng.`;
        k.caption(`${def.name}\n${st.warn || how}`);
      };
    },
  };
}

const HandsLaparo3D: React.FC<{input: HandsInput; live: LaparoLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsLaparo3D;
