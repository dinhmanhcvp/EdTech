'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Fluid, ML_PER} from '../../utils/lab/hands/pbf';
import {Thread, Tissue, type Layer} from '../../utils/lab/hands/xpbd';
import {handPointers, type HandsInput} from './handsKit';
import {glassify, loadModel} from './labParts';
import {Stage3D, setLine, type SceneDef} from './Stage3D';
import {addOrRoom, clothTexture, organify, surgPost} from './surgLook';

export type TTool = 'scalpel' | 'forceps' | 'retractor' | 'suction' | 'cautery' | 'clamp' | 'needle';
export const TTOOLS: TTool[] = ['scalpel', 'forceps', 'retractor', 'suction', 'cautery', 'clamp', 'needle'];
export const TTOOL_NAME: Record<TTool, string> = {scalpel: 'Dao mổ', forceps: 'Kẹp phẫu tích', retractor: 'Banh', suction: 'Ống hút', cautery: 'Dao đốt điện', clamp: 'Kẹp mạch', needle: 'Kim chỉ'};
export interface Source {
  kind: 'artery' | 'vein' | 'capillary';
  at: (out: [number, number, number]) => [number, number, number];
  sealed: boolean;
  /** mao mạch tự ngừng sau một lúc (đông máu tự nhiên) */
  ttl: number;
  acc: number;
}
export interface TissueStats {
  skinCut: number;
  deepest: Layer | -1;
  retractors: number;
  exposed: boolean;
  loss: number;
  field: number;
  sucked: number;
  active: {artery: number; vein: number; capillary: number};
  bled: boolean;
  stitches: number;
  torn: number;
  burned: number;
  clamped: number;
}
/** trạng thái dùng chung: React (bảng) ghi dụng cụ và đọc số liệu; cảnh chạy vật lý */
export interface TissueLive {
  tools: [TTool, TTool];
  stats: TissueStats;
  warn: string;
}
export const newStats = (): TissueStats => ({skinCut: 0, deepest: -1, retractors: 0, exposed: false, loss: 0, field: 0, sucked: 0, active: {artery: 0, vein: 0, capillary: 0}, bled: false, stitches: 0, torn: 0, burned: 0, clamped: 0});

const TRAY_X = 2.35;
const SLOT = (t: TTool) => -1.5 + TTOOLS.indexOf(t) * 0.5;
const HOLD: Record<TTool, THREE.Euler> = {
  scalpel: new THREE.Euler(0, -0.6, 0.6, 'YXZ'),
  forceps: new THREE.Euler(0, -0.6, 0.55, 'YXZ'),
  retractor: new THREE.Euler(0, -0.6, 0.25, 'YXZ'),
  suction: new THREE.Euler(0, -0.6, 0.75, 'YXZ'),
  cautery: new THREE.Euler(0, -0.6, 0.7, 'YXZ'),
  clamp: new THREE.Euler(0, -0.6, 0.5, 'YXZ'),
  needle: new THREE.Euler(0, -0.6, 0.5, 'YXZ'),
};
const LAYER_COL = [new THREE.Color('#9E2B33'), new THREE.Color('#EECB66'), new THREE.Color('#C4866A')];
const DERMIS = new THREE.Color('#EFC3B0');
const COAG = new THREE.Color('#F2E6D2');
const CHAR = new THREE.Color('#3B2A1F');
/** mạch máu chạy dọc khối trong lớp mỡ (toạ độ nghỉ): động mạch và tĩnh mạch đi kèm */
const VESSELS: {kind: 'artery' | 'vein'; z: number; y: number; r: number; color: string}[] = [
  {kind: 'artery', z: 0.16, y: 0.37, r: 0.04, color: '#B3202B'},
  {kind: 'vein', z: -0.22, y: 0.36, r: 0.05, color: '#3E3C8C'},
];
const VN = 36;

function makeDef(input: HandsInput, live: TissueLive): SceneDef {
  return {
    floor: true,
    room: true,
    post: surgPost('open'),
    dist: 5.4,
    target: [0.5, 0.2, 0.25],
    orbit: () => [0, 52],
    setup: (k) => {
      const P = handPointers(k, input, 0.65);
      const tissue = new Tissue();
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__tissueBody?: Tissue}).__tissueBody = tissue; // chỉ khi phát triển: máy dò đọc trạng thái mô
      const fluid = new Fluid(900, 0.07, [-2.0, 2.0, -1.4, 1.4]);
      const thread = new Thread(22, 0.045, [0.5, 0.9, 0.5]);
      const ray = new THREE.Raycaster();
      const v2 = new THREE.Vector2();
      const v3 = new THREE.Vector3();
      const tmp: [number, number, number] = [0, 0, 0];

      // bàn mổ + khăn
      const table = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.1, 7.2), new THREE.MeshStandardMaterial({color: '#2A6661', map: clothTexture('#FFFFFF', 7), roughness: 0.95}));
      addOrRoom(k, 0.8, -0.26);
      table.position.y = -0.05;
      table.receiveShadow = true;
      k.scene.add(table);
      const lamp = new THREE.SpotLight('#FFF4E6', 11, 14, 0.55, 0.5, 1.3);
      lamp.position.set(0.3, 6, 2);
      lamp.target.position.set(0, 0.3, 0);
      lamp.castShadow = true;
      k.scene.add(lamp, lamp.target);

      // ---- lưới mặt ngoài của mô: không chia sẻ đỉnh giữa các mặt (màu theo lớp của tứ diện), pháp tuyến trơn theo đỉnh mô
      const geo = new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color('#FF8A7A')}));
      mesh.castShadow = mesh.receiveShadow = true;
      k.scene.add(mesh);
      // vân mô dính theo toạ độ nghỉ: kéo giãn thì vân giãn theo, không trôi trên mặt
      organify(mesh.material as THREE.Material, 'block', true);
      const rest0 = tissue.pos.slice();
      // khăn có cửa sổ: dốc từ mép da xuống bàn, chỉ để lộ vùng mổ như khi trải khăn thật
      {
        const box3 = new THREE.Box3().setFromArray(rest0);
        const [x0, x1, z0, z1, top] = [box3.min.x - 0.012, box3.max.x + 0.012, box3.min.z - 0.012, box3.max.z + 0.012, box3.max.y + 0.006];
        const o = 0.16;
        const ring = [[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1], [x0 - o, 0.01, z0 - o], [x1 + o, 0.01, z0 - o], [x1 + o, 0.01, z1 + o], [x0 - o, 0.01, z1 + o]];
        const fen = new THREE.BufferGeometry();
        fen.setAttribute('position', new THREE.Float32BufferAttribute(ring.flat(), 3));
        fen.setAttribute('uv', new THREE.Float32BufferAttribute(ring.flatMap(([x, , z]) => [x, z]), 2));
        fen.setIndex([0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4]);
        fen.computeVertexNormals();
        const drape = new THREE.Mesh(fen, new THREE.MeshStandardMaterial({color: '#245B57', map: clothTexture('#FFFFFF', 1), roughness: 0.95, side: THREE.DoubleSide}));
        drape.receiveShadow = true;
        k.scene.add(drape);
      }
      let bnd = tissue.boundary();
      let topo = -1;
      let posA = new Float32Array(0);
      let colA = new Float32Array(0);
      let norA = new Float32Array(0);
      const vn = new Float32Array(tissue.nv * 3);
      const fiber = (v: number) => 0.85 + 0.15 * Math.sin(tissue.pos[v * 3 + 2] * 60 + tissue.pos[v * 3 + 1] * 9);
      const fatVar = (v: number) => 0.92 + 0.08 * Math.sin(v * 12.9898);
      const c3 = new THREE.Color();
      const rebuild = () => {
        bnd = tissue.boundary();
        const n = bnd.tri.length;
        posA = new Float32Array(n * 3);
        colA = new Float32Array(n * 3);
        norA = new Float32Array(n * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(norA, 3));
        const restA = new Float32Array(n * 3);
        const kindA = new Float32Array(n);
        for (let q = 0; q < n; q++) {
          const v = bnd.tri[q];
          restA[q * 3] = rest0[v * 3];
          restA[q * 3 + 1] = rest0[v * 3 + 1];
          restA[q * 3 + 2] = rest0[v * 3 + 2];
          kindA[q] = bnd.layer[Math.floor(q / 3)];
        }
        geo.setAttribute('aRest', new THREE.BufferAttribute(restA, 3));
        geo.setAttribute('aKind', new THREE.BufferAttribute(kindA, 1));
      };
      let lastBurn = -1;
      const refresh = () => {
        // mô đang ngủ, không đổi hình, không cháy thêm: lưới trên GPU vẫn đúng, khỏi tính lại pháp tuyến / màu
        let burnSum = 0;
        for (let v = 0; v < tissue.nv; v++) burnSum += tissue.burned[v];
        if (tissue.asleep && tissue.topo === topo && burnSum === lastBurn) return;
        lastBurn = burnSum;
        if (tissue.topo !== topo) {
          topo = tissue.topo;
          rebuild();
        }
        const p = tissue.pos;
        const {tri, layer} = bnd;
        vn.fill(0);
        for (let f = 0; f < tri.length / 3; f++) {
          const a = tri[f * 3] * 3;
          const b = tri[f * 3 + 1] * 3;
          const c = tri[f * 3 + 2] * 3;
          const ux = p[b] - p[a];
          const uy = p[b + 1] - p[a + 1];
          const uz = p[b + 2] - p[a + 2];
          const wx = p[c] - p[a];
          const wy = p[c + 1] - p[a + 1];
          const wz = p[c + 2] - p[a + 2];
          const nx = uy * wz - uz * wy;
          const ny = uz * wx - ux * wz;
          const nz = ux * wy - uy * wx;
          vn[a] += nx;
          vn[a + 1] += ny;
          vn[a + 2] += nz;
          vn[b] += nx;
          vn[b + 1] += ny;
          vn[b + 2] += nz;
          vn[c] += nx;
          vn[c + 1] += ny;
          vn[c + 2] += nz;
        }
        for (let n = 0; n < tri.length; n++) {
          const v = tri[n];
          posA[n * 3] = p[v * 3];
          posA[n * 3 + 1] = p[v * 3 + 1];
          posA[n * 3 + 2] = p[v * 3 + 2];
          const L = Math.hypot(vn[v * 3], vn[v * 3 + 1], vn[v * 3 + 2]) || 1;
          norA[n * 3] = vn[v * 3] / L;
          norA[n * 3 + 1] = vn[v * 3 + 1] / L;
          norA[n * 3 + 2] = vn[v * 3 + 2] / L;
          const ly = layer[Math.floor(n / 3)];
          // mặt da hướng lên là da; vách rạch trong lớp da là bì (hồng nhạt)
          c3.copy(ly === 2 && norA[n * 3 + 1] < 0.6 ? DERMIS : LAYER_COL[ly]);
          c3.multiplyScalar(ly === 0 ? fiber(v) : ly === 1 ? fatVar(v) : 1);
          const b = tissue.burned[v];
          if (b > 0.5) c3.lerp(b < 1.8 ? COAG : CHAR, Math.min(1, (b - 0.5) / 1.2));
          colA[n * 3] = c3.r;
          colA[n * 3 + 1] = c3.g;
          colA[n * 3 + 2] = c3.b;
        }
        geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.color.needsUpdate = true;
        geo.computeBoundingSphere();
      };

      // ---- mạch máu nhúng trong mô: điểm theo mô, đứt khi ô chứa nó bị rạch
      const vessels = VESSELS.map((d) => {
        const pts = Array.from({length: VN}, (_, n) => {
          const x = -1.45 + (2.9 * n) / (VN - 1);
          return {f: tissue.embed(x, d.y, d.z), cell: tissue.cellOf(x, d.y, d.z)!, p: new THREE.Vector3()};
        });
        const mats = new THREE.MeshPhysicalMaterial({color: d.color, roughness: 0.3, clearcoat: 0.8});
        const segs: THREE.Mesh[] = [];
        return {d, pts, mats, segs, cut: -1, clampAt: null as THREE.Vector3 | null};
      });
      const drawVessel = (V: (typeof vessels)[number]) => {
        for (const s of V.segs) {
          k.scene.remove(s);
          s.geometry.dispose();
        }
        V.segs.length = 0;
        for (const q of V.pts) q.f(tmp) && q.p.set(...tmp);
        const parts = V.cut < 0 ? [V.pts] : [V.pts.slice(0, Math.max(0, V.cut)), V.pts.slice(V.cut + 1)];
        for (const part of parts) {
          if (part.length < 2) continue;
          const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(part.map((q) => q.p)), part.length * 2, V.d.r, 10, false), V.mats);
          m.castShadow = true;
          k.scene.add(m);
          V.segs.push(m);
        }
      };

      // ---- nguồn chảy máu và hạt máu
      const sources: Source[] = [];
      const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.046, 10, 8), new THREE.MeshPhysicalMaterial({roughness: 0.1, clearcoat: 1}), fluid.max);
      drops.frustumCulled = false;
      drops.count = 0;
      k.scene.add(drops);
      const ART = new THREE.Color('#C8102E');
      const VEN = new THREE.Color('#5C0712');
      const m4 = new THREE.Matrix4();
      let spawned = 0;
      // khói đốt điện
      const smoke = Array.from({length: 24}, () => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({color: '#DDD8D0', transparent: true, opacity: 0, depthWrite: false}));
        k.scene.add(s);
        return {s, life: 0};
      });
      let smokeAt = 0;

      // ---- mặt cao nhất của từng cột mô (sàn cho máu)
      const {nx, nz, sx, sz} = tissue.spec;
      const height = new Float32Array(nx * nz);
      const updHeight = () => {
        for (let kk = 0; kk < nz; kk++)
          for (let i = 0; i < nx; i++) {
            const j = tissue.topRow(i, kk);
            if (j < 0) {
              height[i + nx * kk] = 0;
              continue;
            }
            let y = 0;
            for (const [a, b] of [
              [0, 0],
              [1, 0],
              [0, 1],
              [1, 1],
            ])
              y += tissue.pos[tissue.vid(i + a, j + 1, kk + b) * 3 + 1];
            height[i + nx * kk] = y / 4;
          }
      };
      const floor = (x: number, z: number) => {
        const i = Math.floor((x / sx + 0.5) * nx);
        const kk = Math.floor((z / sz + 0.5) * nz);
        return i >= 0 && i < nx && kk >= 0 && kk < nz ? height[i + nx * kk] : 0;
      };

      // ---- dụng cụ
      const tools = new Map<TTool, THREE.Object3D>();
      const anchors: {at: number; obj: THREE.Object3D; group: number[]}[] = [];
      const clamps: THREE.Object3D[] = [];
      const threadLine = k.line('#6A4BC0', 3, new Array(thread.n * 3).fill(0));
      const stitchLine = k.line('#6A4BC0', 3, new Array(60 * 6).fill(0), true);
      k.scene.add(threadLine, stitchLine);
      let pendingStitch = -1;
      let lastStitch = -1;
      let ready = false;
      k.caption('Đang tải dụng cụ…');
      void Promise.all([loadModel('/models/surgery-heart.glb'), loadModel('/models/dissect-parts.glb')]).then(([sh, dp]) => {
        const src: Record<TTool, THREE.Object3D | undefined> = {
          scalpel: dp.getObjectByName('TOOL_scalpel'),
          forceps: dp.getObjectByName('TOOL_forceps'),
          retractor: sh.getObjectByName('TOOL_retractor'),
          suction: sh.getObjectByName('TOOL_suction'),
          cautery: sh.getObjectByName('TOOL_cautery'),
          clamp: sh.getObjectByName('TOOL_clamp'),
          needle: sh.getObjectByName('TOOL_needle'),
        };
        for (const t of TTOOLS) {
          const o = src[t]?.clone(true);
          if (!o) continue;
          if (t === 'suction') glassify(o, 0.35);
          k.scene.add(o);
          tools.set(t, o);
          k.label(TTOOL_NAME[t], '#F3EFE6', true, 11)(new THREE.Vector3(TRAY_X + 0.55, 0.02, SLOT(t) + 0.2));
        }
        ready = true;
      });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 3.6), new THREE.MeshStandardMaterial({color: '#174A46', roughness: 0.95}));
      tray.position.set(TRAY_X + 0.6, 0.0, 0);
      k.scene.add(tray);

      /** tam giác mặt ngoài (chỉ số trong `bnd`) mà lần dò gần nhất chạm; lưới không đánh chỉ số nên tam giác f gồm đỉnh 3f..3f+2 */
      let hitFace = -1;
      const hitTissue = (nx2: number, ny2: number) => {
        ray.setFromCamera(v2.set(nx2, ny2), k.camera);
        const h = ray.intersectObject(mesh, false)[0];
        hitFace = h?.face ? Math.floor(h.face.a / 3) : -1;
        return h?.point ?? null;
      };
      const onTray = (nx2: number, ny2: number): TTool | null => {
        const q = P.onPlane(nx2, ny2, 0.02, v3);
        if (q.x < TRAY_X - 0.15 || q.x > TRAY_X + 1.35 || Math.abs(q.z) > 1.8) return null;
        return TTOOLS.reduce((a, t) => (Math.abs(q.z - SLOT(t)) < Math.abs(q.z - SLOT(a)) ? t : a));
      };
      P.grabWhen((x, y) => !!onTray(x, y) || !!hitTissue(x, y));

      type St = {tool: TTool; lastCell: string; grab: number; grabY: number; group: {v: number; off: [number, number, number]}[]; tip: THREE.Vector3};
      const per: St[] = P.ptrs.map(() => ({tool: 'scalpel', lastCell: '', grab: -1, grabY: 0, group: [], tip: new THREE.Vector3(1, 1, 1)}));
      const toolOf = (n: number) => (n === 1 ? live.tools[1] : live.tools[0]);
      const warn = (s: string) => (live.warn = s);
      let frame = 0;
      let last = performance.now();
      rebuild();

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1);
        frame++;
        const S = live.stats;

        // ---- con trỏ và dụng cụ
        for (const [n, p] of P.ptrs.entries()) {
          const st = per[n];
          if (!p.active) {
            if (st.grab >= 0) {
              const grp = st.group.map((g) => g.v);
              tissue.attaches = tissue.attaches.filter((a) => !grp.includes(a.v));
            }
            st.grab = -1;
            st.group = [];
            continue;
          }
          const tool = toolOf(n);
          const tr = onTray(p.ndc.x, p.ndc.y);
          if (p.pressed && tr) {
            if (n === 1) live.tools[1] = tr;
            else live.tools[0] = tr;
            continue;
          }
          const hit = hitTissue(p.ndc.x, p.ndc.y);
          const tip = hit ?? P.onPlane(p.ndc.x, p.ndc.y, 0.7, v3).clone();
          st.tip.copy(tip);
          p.hot = !!hit || !!tr;
          const down = p.down && !tr;
          if (tool === 'scalpel') {
            if (down && hit) {
              // cột theo mặt bị chạm (đúng cả khi mô biến dạng; chạm vách rãnh thì là cột rãnh), lưới chưa có thì theo vị trí
              const f = hitFace;
              const c = f >= 0 && f < bnd.tet.length ? tissue.faceColumn(bnd.tri[f * 3], bnd.tri[f * 3 + 1], bnd.tri[f * 3 + 2], bnd.tet[f]) : tissue.cellAt(hit.x, hit.z);
              const key = c ? `${c[0]},${c[1]}` : '';
              // mỗi nhát (một lần chụm–kéo) cắt mỗi ô một lần: rạch lại cùng chỗ thì vào sâu thêm một lớp
              if (c && !st.lastCell.split('|').includes(key)) {
                st.lastCell += `|${key}`;
                const L = tissue.cut(c[0], c[1]);
                if (L === 2) S.skinCut++;
                if (L !== null) S.deepest = S.deepest === -1 ? L : (Math.min(S.deepest, L) as Layer);
                // mỡ và cơ có mao mạch: rỉ máu tại chỗ
                if (L !== null && L < 2 && sources.filter((s) => s.kind === 'capillary' && !s.sealed).length < 10) {
                  const f = tissue.embed(hit.x, hit.y - 0.05, hit.z);
                  sources.push({kind: 'capillary', at: f, sealed: false, ttl: 25, acc: 0});
                }
              }
            }
            if (!p.down) st.lastCell = '';
          } else if (tool === 'forceps' || tool === 'retractor') {
            if (p.pressed && hit) {
              const old = anchors.findIndex((a) => Math.hypot(tissue.pos[a.at * 3] - hit.x, tissue.pos[a.at * 3 + 2] - hit.z) < 0.15);
              if (tool === 'retractor' && old >= 0) {
                // chụm vào banh đang đặt: tháo banh
                const a = anchors[old];
                tissue.attaches = tissue.attaches.filter((x) => !a.group.includes(x.v));
                k.scene.remove(a.obj);
                anchors.splice(old, 1);
              } else {
                const v = tissue.nearest([hit.x, hit.y, hit.z], 0.18);
                if (v >= 0 && tissue.invMass[v]) {
                  st.grab = v;
                  st.grabY = tissue.pos[v * 3 + 1];
                  // kẹp ôm cả một nếp mô: đỉnh chạm và các đỉnh liền kề cùng đi theo, lực chia ra nên không rách ngay ở một điểm
                  st.group = [v, ...tissue.nbr[v].filter((w) => tissue.invMass[w] && Math.abs(tissue.pos[w * 3 + 1] - st.grabY) < 0.1)].map((w) => ({v: w, off: [tissue.pos[w * 3] - tissue.pos[v * 3], tissue.pos[w * 3 + 1] - tissue.pos[v * 3 + 1], tissue.pos[w * 3 + 2] - tissue.pos[v * 3 + 2]] as [number, number, number]}));
                  for (const g of st.group) tissue.attaches.push({v: g.v, target: [tissue.pos[g.v * 3], tissue.pos[g.v * 3 + 1], tissue.pos[g.v * 3 + 2]], compliance: g.v === v ? 1e-4 : 4e-4});
                }
              }
            }
            if (st.grab >= 0) {
              const q = P.onPlane(p.ndc.x, p.ndc.y, st.grabY + 0.08, new THREE.Vector3());
              for (const g of st.group) {
                const at = tissue.attaches.find((a) => a.v === g.v);
                if (at) at.target = [q.x + g.off[0], q.y + g.off[1], q.z + g.off[2]];
              }
              st.tip.copy(q);
              if (!p.down) {
                const grp = st.group.map((g) => g.v);
                if (tool === 'retractor' && tools.get('retractor')) {
                  const o = tools.get('retractor')!.clone(true);
                  k.scene.add(o);
                  anchors.push({at: st.grab, obj: o, group: grp});
                } else tissue.attaches = tissue.attaches.filter((a) => !grp.includes(a.v));
                st.grab = -1;
                st.group = [];
              }
            }
          } else if (tool === 'suction') {
            if (down) S.sucked += fluid.suck(tip.x, tip.y, tip.z, 0.16) * ML_PER;
          } else if (tool === 'cautery') {
            if (down && hit) {
              tissue.cauterize([hit.x, hit.y, hit.z], 0.09, 14 * dt);
              const hv = tissue.nearest([hit.x, hit.y, hit.z], 0.2);
              if (now - smokeAt > 60) {
                smokeAt = now;
                const s = smoke.find((x) => x.life <= 0);
                if (s) {
                  s.life = 1;
                  s.s.position.copy(hit);
                }
              }
              for (const so of sources) {
                if (so.sealed) continue;
                so.at(tmp);
                if (Math.hypot(tmp[0] - hit.x, tmp[1] - hit.y, tmp[2] - hit.z) > 0.18) continue;
                if (so.kind === 'artery') warn('Động mạch phun theo nhịp: đốt điện không đủ, phải dùng kẹp mạch.');
                // mô phải đủ nóng (trắng ra) thì mạch nhỏ mới đông lại
                else if (hv >= 0 && tissue.heat[hv] > 0.7) so.sealed = true;
              }
            }
          } else if (tool === 'clamp') {
            if (p.pressed && hit) {
              let done = false;
              for (const V of vessels) {
                if (V.cut < 0) continue;
                const q = V.pts[Math.max(0, V.cut - 1)].p;
                if (q.distanceTo(hit) > 0.25) continue;
                for (const so of sources) if (so.kind === V.d.kind) so.sealed = true;
                const o = tools.get('clamp')?.clone(true);
                if (o) {
                  o.position.copy(q);
                  // cán hướng về phía người mổ, chếch lên khỏi vết mổ
                  o.rotation.set(0, -Math.PI / 2, 0.6, 'YXZ');
                  k.scene.add(o);
                  clamps.push(o);
                }
                V.clampAt = q.clone();
                S.clamped++;
                done = true;
              }
              if (!done) warn('Kẹp mạch đặt đúng đầu mạch bị đứt (chỗ máu ra).');
            }
          } else if (tool === 'needle') {
            if (p.pressed && hit) {
              const v = tissue.nearest([hit.x, hit.y, hit.z], 0.15);
              if (v >= 0) {
                if (pendingStitch < 0) pendingStitch = v;
                else {
                  const d = tissue.dist(pendingStitch, v);
                  if (d < 0.06 || d > 0.7) warn('Mũi khâu: đâm kim ở mép bên này rồi mép đối diện (cách nhau 0,5–5 cm).');
                  else {
                    tissue.stitches.push({a: pendingStitch, b: v, rest: d, goal: 0.05});
                    S.stitches++;
                    lastStitch = v;
                  }
                  pendingStitch = -1;
                }
              }
            }
          }
        }

        // ---- vật lý
        tissue.step(1 / 60, 6);
        tissue.diffuseHeat(1 / 60);
        if (frame % 4 === 0) {
          const n = tissue.tear();
          if (n) warn('Kéo quá lực: mô bị rách. Vén nhẹ tay, kéo căng vừa đủ để lộ lớp bên dưới.');
          S.torn = tissue.torn;
        }
        // mạch đứt khi ô chứa nó bị xoá → nguồn chảy máu tại đầu mạch
        for (const V of vessels) {
          if (V.cut >= 0) continue;
          const n = V.pts.findIndex((q) => !tissue.cellAlive(...q.cell));
          if (n >= 0) {
            V.cut = n;
            sources.push({kind: V.d.kind, at: V.pts[Math.max(0, n - 1)].f, sealed: false, ttl: Infinity, acc: 0});
            warn(V.d.kind === 'artery' ? 'Cắt trúng động mạch: máu đỏ tươi phun theo nhịp tim! Dùng kẹp mạch kẹp đầu mạch, ống hút để thấy rõ.' : 'Cắt trúng tĩnh mạch: máu đỏ sẫm chảy tràn. Kẹp mạch hoặc đốt điện để cầm máu.');
          }
          // lộ mạch: ô ngay trên mạch đã được mở
          if (V.pts.some((q) => !tissue.cellAlive(q.cell[0], q.cell[1] + 1, q.cell[2]))) S.exposed = true;
        }
        updHeight();
        const t = now / 1000;
        S.active = {artery: 0, vein: 0, capillary: 0};
        for (const so of sources) {
          if (so.sealed) continue;
          so.ttl -= dt;
          if (so.ttl <= 0) {
            so.sealed = true;
            continue;
          }
          S.active[so.kind]++;
          S.bled = true;
          so.at(tmp);
          const pulse = 1 + 0.6 * Math.max(0, Math.sin(2 * Math.PI * (75 / 60) * t));
          const rate = so.kind === 'artery' ? 40 * pulse : so.kind === 'vein' ? 14 : 2.5;
          so.acc += rate * dt;
          while (so.acc >= 1) {
            so.acc -= 1;
            const art = so.kind === 'artery';
            if (fluid.add(tmp[0] + (Math.random() - 0.5) * 0.03, tmp[1] + 0.03, tmp[2] + (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * (art ? 0.4 : 0.15), art ? 1.6 * pulse : 0.05, art ? 0.5 : 0.05 + (Math.random() - 0.5) * 0.1, art ? 0 : 1)) spawned++;
          }
        }
        fluid.step(1 / 60, floor, 2);
        S.loss = spawned * ML_PER;
        S.field = fluid.ml();
        S.retractors = anchors.length;
        let burned = 0;
        for (let v = 0; v < tissue.nv; v++) if (tissue.burned[v] > 0.8) burned++;
        S.burned = burned;

        // ---- vẽ
        refresh();
        for (const V of vessels) drawVessel(V);
        drops.count = fluid.n;
        for (let i = 0; i < fluid.n; i++) {
          drops.setMatrixAt(i, m4.makeTranslation(fluid.pos[i * 3], fluid.pos[i * 3 + 1], fluid.pos[i * 3 + 2]));
          drops.setColorAt(i, fluid.kind[i] ? VEN : ART);
        }
        drops.instanceMatrix.needsUpdate = true;
        if (drops.instanceColor) drops.instanceColor.needsUpdate = true;
        for (const s of smoke) {
          if (s.life <= 0) continue;
          s.life -= dt * 0.8;
          s.s.position.y += dt * 0.5;
          s.s.scale.setScalar(1 + (1 - s.life) * 2.5);
          (s.s.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life) * 0.45;
        }
        for (const a of anchors) {
          a.obj.position.set(tissue.pos[a.at * 3], tissue.pos[a.at * 3 + 1] + 0.02, tissue.pos[a.at * 3 + 2]);
          a.obj.rotation.set(0, Math.atan2(-a.obj.position.z, a.obj.position.x) + Math.PI, 0.25, 'YXZ');
        }
        // mũi khâu và sợi chỉ
        const sl: number[] = [];
        for (const sti of tissue.stitches) {
          const a = sti.a * 3;
          const b = sti.b * 3;
          sl.push(tissue.pos[a], tissue.pos[a + 1] + 0.012, tissue.pos[a + 2], tissue.pos[b], tissue.pos[b + 1] + 0.012, tissue.pos[b + 2]);
        }
        while (sl.length < 60 * 6) sl.push(0, -9, 0);
        setLine(stitchLine, sl.slice(0, 60 * 6));
        const needleHeld = live.tools.includes('needle');
        const nTip = per[live.tools[1] === 'needle' ? 1 : 0].tip;
        const anchorV = pendingStitch >= 0 ? pendingStitch : lastStitch;
        threadLine.visible = needleHeld;
        if (needleHeld) {
          thread.step(1 / 60, anchorV >= 0 ? [tissue.pos[anchorV * 3], tissue.pos[anchorV * 3 + 1], tissue.pos[anchorV * 3 + 2]] : null, [nTip.x, nTip.y + 0.1, nTip.z], 0);
          setLine(threadLine, Array.from(thread.pos));
        }
        if (ready)
          for (const [tl, o] of tools) {
            const n = live.tools[0] === tl ? (P.ptrs[2].active ? 2 : 0) : live.tools[1] === tl ? 1 : -1;
            const held = n >= 0 && P.ptrs[n].active;
            if (held) {
              const tip = per[n].tip;
              o.position.set(tip.x, tip.y + (P.ptrs[n].down ? 0.02 : 0.2), tip.z);
              o.quaternion.setFromEuler(HOLD[tl]);
            } else {
              o.position.set(TRAY_X, 0.04, SLOT(tl));
              o.quaternion.identity();
            }
          }
        k.caption('');
      };
    },
  };
}

const HandsTissue3D: React.FC<{input: HandsInput; live: TissueLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsTissue3D;
