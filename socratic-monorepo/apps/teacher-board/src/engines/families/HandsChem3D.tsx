'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {derive} from '../../utils/lab/chem/engine';
import {SPECIES, SUBSTANCES} from '../../utils/lab/chem/species';
import type {Action, Derived, LabState, Substance} from '../../utils/lab/chem/types';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {loadModel, partOf} from './labParts';
import {Stage3D, setLine, type SceneDef} from './Stage3D';

export const CHEM_GROUPS = ['Acid', 'Base', 'Muối', 'Halogen', 'Kim loại', 'Chất rắn', 'Hữu cơ', 'Chỉ thị'] as const;
/** Trạng thái bàn hóa học dùng chung giữa bảng điều khiển React và cảnh 3D (cảnh chỉ đọc `lab`, ghi qua `dispatch`). */
export interface ChemLive {
  lab: LabState;
  dispatch: (a: Action) => void;
  group: string;
  setGroup: (g: string) => void;
  /** lượng mỗi lần cho thêm của một chất (mL hoặc g) */
  amountOf: (id: string) => number;
  /** hệ số tua nhanh thời gian phản ứng */
  scale: number;
  active: number;
  setActive: (i: number) => void;
}

const VX = [-2.9, -2.1, -1.3, -0.5, 1.4];
const VZ = 1.05;
const TUBE_H = 1.0;
const BEAKER_H = 0.85;
const BIN: [number, number] = [3.2, 0.1];
const LAMP_HOME = new THREE.Vector3(3.3, 0.3, 1.9);
const GOGGLES = new THREE.Vector3(3.5, 0.1, 2.5);
const TAB_Z = -1.2;
const slot = (i: number): [number, number] => [-3.8 + (i % 13) * 0.62, -2.45 + Math.floor(i / 13) * 0.55];
const GROUP_COLOR: Record<string, string> = {Acid: '#D9481C', Base: '#2459C9', Muối: '#7A8394', Halogen: '#2E9B57', 'Kim loại': '#B9BEC5', 'Chất rắn': '#C9A24B', 'Hữu cơ': '#C2184A', 'Chỉ thị': '#6B4BC8'};
const contentColor = (s: Substance): string => {
  const sp = Object.keys(s.species).map((k) => SPECIES[k]?.color).find(Boolean);
  return sp ?? (s.kind === 'solid' ? '#D8D2C4' : '#BFE3F5');
};

function makeDef(input: HandsInput, live: ChemLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 8.6,
    target: [-0.3, 0.4, 0.0],
    orbit: () => [0, 46],
    setup: (k) => {
      labRoom(k, [8.4, 5.6, -0.3, 0.1]);
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.8, x: -0.3, y: -0.056, z: 0.1});
      const P = handPointers(k, input, 0.5);
      const v3 = new THREE.Vector3();
      const glassMat = (color: string, opacity: number) => new THREE.MeshPhysicalMaterial({color, transparent: true, opacity, roughness: 0.06, ior: 1.458, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide});

      // ---- giá ống nghiệm, thùng thải, kính bảo hộ
      const rackBox = solid(k.scene, new THREE.BoxGeometry(3.4, 0.1, 0.7), '#7A5C3A', {rough: 0.8, x: -1.7, y: 0.05, z: VZ});
      const binBox = solid(k.scene, new THREE.BoxGeometry(0.9, 0.55, 0.9), '#3A3E7A', {rough: 0.6, x: BIN[0], y: 0.28, z: BIN[1]});
      k.label('Thùng thải (thả ống vào đây để đổ bỏ)')(new THREE.Vector3(BIN[0], 0.9, BIN[1]));
      const gog = new THREE.Group();
      gog.position.copy(GOGGLES);
      k.scene.add(gog);
      for (const sx of [-1, 1]) solid(gog, new THREE.TorusGeometry(0.13, 0.03, 8, 20), '#1D1B16', {x: sx * 0.16, y: 0.12});
      solid(gog, new THREE.BoxGeometry(0.2, 0.03, 0.03), '#1D1B16', {y: 0.12});
      const gogTag = k.label('Kính bảo hộ');

      // ---- dụng cụ thủy tinh
      const vessels = live.lab.vessels.map((v0, i) => {
        const beaker = v0.kind === 'beaker';
        const r = beaker ? 0.55 : 0.17;
        const h = beaker ? BEAKER_H : TUBE_H;
        const g = new THREE.Group();
        g.position.set(VX[i], 0.1, VZ);
        k.scene.add(g);
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 36, 1, true), glassMat('#DDEBF7', 0.22));
        shell.position.y = h / 2;
        const base = new THREE.Mesh(new THREE.CircleGeometry(r, 36).rotateX(-Math.PI / 2), glassMat('#DDEBF7', 0.3));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#E8E6F5', transparent: true, opacity: 0.6}));
        rim.position.y = h;
        const liquid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 1, 32), new THREE.MeshStandardMaterial({color: '#E0F2FE', transparent: true, opacity: 0.4, roughness: 0.2}));
        const sediment = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 1, 32), new THREE.MeshStandardMaterial({color: '#E5E7EB', roughness: 0.9}));
        const N = 36;
        const bub = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)), new THREE.PointsMaterial({color: '#FFFFFF', size: 7, sizeAttenuation: false, transparent: true, opacity: 0.85}));
        bub.frustumCulled = false;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.7, 0.025, 8, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#E3B341', depthTest: false, transparent: true}));
        ring.position.y = h + 0.08;
        ring.renderOrder = 3;
        // kết tủa đang rơi: hạt rơi từ mặt thoáng xuống đáy cho tới khi lớp đáy ngừng dày lên
        const fall = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3)), new THREE.PointsMaterial({color: '#E5E7EB', size: 5, sizeAttenuation: false, transparent: true, opacity: 0.9}));
        fall.frustumCulled = false;
        // làn khí / hơi nước thoát ra miệng ống
        const wisp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3)), new THREE.PointsMaterial({color: '#FFFFFF', size: 14, sizeAttenuation: false, transparent: true, opacity: 0.16, depthWrite: false}));
        wisp.frustumCulled = false;
        const flash = new THREE.PointLight('#FFF1C2', 0, 3);
        flash.position.y = h * 0.6;
        g.add(liquid, sediment, shell, base, rim, bub, fall, wisp, flash, ring);
        return {g, h, r, shell, floor: base, rim, liquid, sediment, bub, fall, wisp, flash, flashAt: -1e9, shownColor: new THREE.Color('#E0F2FE'), shownSh: 0, ring, tag: k.label(v0.id), what: k.label(''), home: new THREE.Vector3(VX[i], 0.1, VZ), base: {x: VX[i], z: VZ}};
      });

      // ---- đèn cồn
      const lamp = new THREE.Group();
      lamp.position.copy(LAMP_HOME);
      k.scene.add(lamp);
      const lampPlain = [solid(lamp, new THREE.CylinderGeometry(0.22, 0.28, 0.32, 24), '#9FD3FF', {rough: 0.1, y: 0.16}), solid(lamp, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), '#B9BEC5', {y: 0.38, metal: 0.8})];
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 14), new THREE.MeshBasicMaterial({color: '#FFB35C', transparent: true, opacity: 0.9}));
      flame.position.y = 0.62;
      lamp.add(flame);
      k.label('Đèn cồn (giữ dưới ống để đun)')(new THREE.Vector3(LAMP_HOME.x, 0.95, LAMP_HOME.z));

      // ---- kệ hóa chất: mọi chất trong CSDL, hiện theo nhóm
      const bottles = SUBSTANCES.map((s) => {
        const b = new THREE.Group();
        b.scale.setScalar(1.3);
        k.scene.add(b);
        solid(b, new THREE.CylinderGeometry(0.15, 0.15, 0.44, 20), '#8FB8D8', {rough: 0.15, y: 0.22});
        solid(b, new THREE.CylinderGeometry(0.135, 0.135, 0.3, 20), contentColor(s), {rough: 0.5, y: 0.2});
        solid(b, new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), '#8FB8D8', {y: 0.5, rough: 0.15});
        solid(b, new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), GROUP_COLOR[s.group] ?? '#666', {y: 0.58});
        return {s, g: b, home: new THREE.Vector3(), tilt: 0};
      });
      const bottleTag = k.label('');
      const place = () => {
        const mine = bottles.filter((b) => b.s.group === live.group);
        bottles.forEach((b) => (b.g.visible = b.s.group === live.group));
        mine.forEach((b, i) => {
          const [x, z] = slot(i);
          b.home.set(x, 0.1, z);
          if (b.g.position.lengthSq() === 0) b.g.position.copy(b.home); // lần đầu hiện: đặt ngay vào kệ, không bay từ gốc toạ độ
        });
      };
      let shownGroup = '';
      const tabs = CHEM_GROUPS.map((gname, i) => {
        const m = solid(k.scene, new THREE.BoxGeometry(0.88, 0.1, 0.3), GROUP_COLOR[gname], {rough: 0.5, x: -3.5 + i * 1.0, y: 0.06, z: TAB_Z});
        k.label(gname)(new THREE.Vector3(-3.5 + i * 1.0, 0.12, TAB_Z + 0.32));
        return {gname, m, pos: m.position};
      });

      // ---- mặc dụng cụ dựng bằng Blender (tools/lab-models/chem_parts.py) lên các hình khối; tải lỗi thì giữ hình khối
      loadModel('/models/chem-parts.glb')
        .then((lib) => {
          /** thủy tinh của mô hình dùng đúng vật liệu thủy tinh của cảnh (khúc xạ, lớp phủ bóng) */
          const glassy = (o: THREE.Object3D) =>
            o.traverse((c) => {
              const m = c as THREE.Mesh;
              if (!m.isMesh || (m.material as THREE.Material).name !== 'glass') return;
              m.material = glassMat('#DDEBF7', 0.2);
              m.castShadow = false;
            });
          const put = (name: string, x: number, z: number, plain: THREE.Object3D) => {
            const sk = partOf(lib, name);
            if (!sk) return;
            sk.obj.position.set(x, 0, z);
            k.scene.add(sk.obj);
            plain.visible = false;
          };
          put('Rack', -1.7, VZ, rackBox);
          put('Bin', BIN[0], BIN[1], binBox);
          vessels.forEach((v, i) => {
            const sk = partOf(lib, live.lab.vessels[i].kind === 'beaker' ? 'Beaker' : 'TestTube');
            if (!sk) return;
            glassy(sk.obj);
            v.shell.visible = v.floor.visible = false;
            v.g.add(sk.obj);
          });
          const lp = partOf(lib, 'Lamp');
          if (lp) {
            glassy(lp.obj);
            lampPlain.forEach((m) => (m.visible = false));
            lamp.add(lp.obj);
          }
          bottles.forEach((b) => {
            const sk = partOf(lib, 'Bottle');
            if (!sk) return;
            sk.mats.find((m) => m.name === 'liquid')?.color.set(contentColor(b.s));
            sk.mats.find((m) => m.name === 'cap')?.color.set(GROUP_COLOR[b.s.group] ?? '#666');
            glassy(sk.obj);
            b.g.children.forEach((c) => (c.visible = false));
            b.g.add(sk.obj);
          });
        })
        .catch(() => undefined);

      // ---- ống dẫn khí đang kéo
      const hose = k.line('#E8E6F5', 4, new Array(24 * 3).fill(0));
      hose.visible = false;
      k.scene.add(hose);
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), new THREE.MeshBasicMaterial({color: '#BFE3F5', transparent: true, opacity: 0.8}));
      stream.visible = false;
      k.scene.add(stream);

      type Hold = {kind: 'bottle'; i: number} | {kind: 'vessel'; i: number} | {kind: 'port'; i: number} | {kind: 'lamp'};
      const held: (Hold | null)[] = P.ptrs.map(() => null);
      const pos = new THREE.Vector3();
      type Hit = {kind: 'bottle'; i: number} | {kind: 'vessel'; i: number} | {kind: 'port'; i: number} | {kind: 'lamp'} | {kind: 'goggles'} | {kind: 'tab'; g: string};
      const pick = (nx: number, ny: number, reach: number): Hit | null => {
        let best: Hit | null = null;
        let bd = reach;
        const tryAt = (p: THREE.Vector3, h: Hit) => {
          const d = P.distAt(nx, ny, p);
          if (d < bd) {
            bd = d;
            best = h;
          }
        };
        bottles.forEach((b, i) => b.g.visible && tryAt(pos.copy(b.g.position).setY(b.g.position.y + 0.3), {kind: 'bottle', i}));
        vessels.forEach((v, i) => {
          tryAt(pos.copy(v.g.position).setY(v.g.position.y + v.h * 0.45), {kind: 'vessel', i});
          tryAt(pos.copy(v.g.position).setY(v.g.position.y + v.h + 0.08), {kind: 'port', i});
        });
        tryAt(pos.copy(lamp.position).setY(lamp.position.y + 0.3), {kind: 'lamp'});
        tryAt(pos.copy(gog.position), {kind: 'goggles'});
        tabs.forEach((t) => tryAt(t.pos, {kind: 'tab', g: t.gname}));
        return best;
      };
      P.grabWhen((nx, ny) => !!pick(nx, ny, 0.07));

      /** ống nào đang nằm dưới con trỏ (theo miệng ống trên màn hình) */
      const mouthAt = (nx: number, ny: number, skip = -1) => vessels.findIndex((v, j) => j !== skip && P.distAt(nx, ny, pos.set(v.g.position.x, v.g.position.y + v.h, v.g.position.z)) < 0.14);
      let derived: Derived[] = [];
      let seen: LabState | null = null;
      let seenLog = 0;
      let last = performance.now();
      let tickAcc = 0;
      let pourAcc = 0;
      let heatAcc = 0;
      let poured = 0;
      let full = false;
      let info = '';

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        if (shownGroup !== live.group) {
          shownGroup = live.group;
          place();
        }
        if (seen !== live.lab) {
          // phản ứng dữ dội (cháy, nổ, natri chạy trên nước) thì ống chớp sáng một nhịp
          for (const e of live.lab.log.slice(seenLog)) if (/nổ|cháy|bùng|giọt tròn|chạy trên/i.test(e.text) && vessels[e.v]) vessels[e.v].flashAt = now;
          seenLog = live.lab.log.length;
          seen = live.lab;
          derived = live.lab.vessels.map(derive);
        }
        // thời gian phản ứng chạy theo giờ thật nhân hệ số tua nhanh
        tickAcc += dt;
        if (tickAcc >= 0.5) {
          tickAcc = 0;
          if (live.lab.vessels.some((v) => v.liquidMl > 0 || Object.keys(v.moles).length)) live.dispatch({type: 'wait', seconds: 0.5 * live.scale});
        }

        P.ptrs.forEach((p, n) => {
          const hover = p.active && !held[n] ? pick(p.ndc.x, p.ndc.y, p.reach) : null;
          if (p.pressed && hover) {
            if (hover.kind === 'goggles') live.dispatch({type: 'goggles', on: !live.lab.goggles});
            else if (hover.kind === 'tab') live.setGroup(hover.g);
            else {
              held[n] = hover;
              if (hover.kind === 'vessel') live.setActive(hover.i);
              pourAcc = 0;
              poured = 0;
            }
          }
          const h = held[n];
          if (h && (p.released || !p.active)) {
            if (h.kind === 'vessel') {
              const v = vessels[h.i];
              if (P.distAt(p.ndc.x, p.ndc.y, pos.set(BIN[0], 0.6, BIN[1])) < 0.16 || Math.hypot(v.g.position.x - BIN[0], v.g.position.z - BIN[1]) < 0.7) live.dispatch({type: 'discard', v: h.i});
            } else if (h.kind === 'port') {
              const to = mouthAt(p.ndc.x, p.ndc.y, h.i);
              if (to >= 0) live.dispatch({type: 'transferGas', v: h.i, to});
            }
            held[n] = null;
          }
          p.hot = !!(held[n] ?? hover);
          const cur = held[n];
          const hv = cur ?? hover;
          if (hv?.kind === 'bottle') {
            const b = bottles[hv.i];
            info = `${b.s.label} (${b.s.formula})${b.s.hazard ? ` ⚠ ${b.s.hazard}` : ''}`;
            bottleTag(pos.copy(b.g.position).setY(b.g.position.y + 0.85), undefined, b.s.label);
          } else if (hv?.kind === 'vessel') info = `${live.lab.vessels[hv.i].id}: nhấc ra thùng thải để đổ bỏ`;
          else if (hv?.kind === 'port') info = 'Vòng vàng ở miệng ống: kéo sang ống khác để dẫn khí';
          else if (hv?.kind === 'lamp') info = 'Đèn cồn: giữ dưới ống để đun';
          else if (hv?.kind === 'goggles') info = live.lab.goggles ? 'Đã đeo kính bảo hộ (chạm để bỏ)' : 'Chạm để đeo kính bảo hộ trước khi dùng hóa chất độc hại';
          else if (!hv) bottleTag(null);
          if (!cur) return;
          const target = P.onPlane(p.ndc.x, p.ndc.y, 1.5, v3);
          if (cur.kind === 'bottle') {
            const b = bottles[cur.i];
            const over = mouthAt(p.ndc.x, p.ndc.y);
            const pourPos = over >= 0 ? new THREE.Vector3(vessels[over].g.position.x + 0.34 + vessels[over].r * 0.5, vessels[over].g.position.y + vessels[over].h + 0.2, vessels[over].g.position.z) : target;
            b.g.position.lerp(pourPos, 1 - Math.exp(-dt * 16));
            b.tilt += ((over >= 0 ? 1.9 : 0) - b.tilt) * (1 - Math.exp(-dt * 10));
            b.g.rotation.z = b.tilt;
            if (over >= 0 && b.tilt > 1.3) {
              full = b.s.kind !== 'solid' && live.lab.vessels[over].liquidMl + live.amountOf(b.s.id) > live.lab.vessels[over].capacityMl;
              pourAcc += dt;
              const every = b.s.kind === 'solid' ? 0.7 : 0.3;
              if (pourAcc >= every) {
                pourAcc = 0;
                const amt = live.amountOf(b.s.id);
                // ống đã đầy thì dừng rót: không để tràn và ghi vi phạm liên tục
                if (!full) {
                  live.dispatch({type: 'add', v: over, sub: b.s.id, amount: amt});
                  poured += amt;
                }
              }
              if (full) info = `${live.lab.vessels[over].id} đã đầy: nhấc chai ra`;
              else info = `Đang rót ${b.s.label} vào ${live.lab.vessels[over].id}: đã cho ${poured.toFixed(poured < 1 ? 2 : 1)} ${b.s.kind === 'solid' ? 'g' : 'mL'}`;
              const v = vessels[over];
              const top = v.g.position.y + v.h + 0.1;
              stream.visible = true;
              stream.material.color.set(contentColor(b.s));
              stream.scale.set(1, top - 0.3, 1);
              stream.position.set(v.g.position.x + 0.02, 0.3 + (top - 0.3) / 2, v.g.position.z);
            } else stream.visible = false;
          } else if (cur.kind === 'vessel') {
            const v = vessels[cur.i];
            v.g.position.lerp(pos.set(target.x, 0.9, target.z), 1 - Math.exp(-dt * 16));
          } else if (cur.kind === 'port') {
            const v = vessels[cur.i];
            const a = new THREE.Vector3(v.g.position.x, v.g.position.y + v.h + 0.08, v.g.position.z);
            const b2 = P.onPlane(p.ndc.x, p.ndc.y, 0.9, new THREE.Vector3());
            const flat: number[] = [];
            for (let q = 0; q < 24; q++) {
              const u = q / 23;
              flat.push(a.x + (b2.x - a.x) * u, a.y + (b2.y - a.y) * u + Math.sin(u * Math.PI) * 0.45, a.z + (b2.z - a.z) * u);
            }
            setLine(hose, flat);
            hose.visible = true;
          } else if (cur.kind === 'lamp') {
            lamp.position.lerp(pos.set(target.x, 0.3, target.z), 1 - Math.exp(-dt * 16));
            const under = vessels.findIndex((v) => P.distAt(p.ndc.x, p.ndc.y, pos.set(v.g.position.x, v.g.position.y + 0.3, v.g.position.z)) < 0.2);
            if (under >= 0) {
              heatAcc += dt;
              if (heatAcc >= 1.5) {
                heatAcc = 0;
                live.dispatch({type: 'heat', v: under});
              }
              info = `Đang đun ${live.lab.vessels[under].id}: ${derived[under]?.temp.toFixed(0)} °C`;
            }
          }
        });
        // vật không được cầm thì về chỗ
        const holding = (pred: (h: Hold) => boolean) => held.some((h) => h && pred(h));
        bottles.forEach((b, i) => {
          if (holding((h) => h.kind === 'bottle' && h.i === i)) return;
          b.g.position.lerp(b.home, 1 - Math.exp(-dt * 10));
          b.tilt += (0 - b.tilt) * (1 - Math.exp(-dt * 10));
          b.g.rotation.z = b.tilt;
        });
        if (!holding((h) => h.kind === 'bottle')) stream.visible = false;
        if (!holding((h) => h.kind === 'port')) hose.visible = false;
        if (!holding((h) => h.kind === 'lamp')) {
          lamp.position.lerp(LAMP_HOME, 1 - Math.exp(-dt * 10));
          heatAcc = 0;
        }
        flame.visible = holding((h) => h.kind === 'lamp');
        flame.scale.set(1, 0.85 + 0.2 * Math.sin(now / 70), 1);

        // ---- vẽ dụng cụ theo trạng thái
        vessels.forEach((vs, i) => {
          const v = live.lab.vessels[i];
          const d = derived[i];
          if (!d) return;
          if (!holding((h) => h.kind === 'vessel' && h.i === i)) vs.g.position.lerp(vs.home, 1 - Math.exp(-dt * 10));
          const frac = Math.min(1, v.liquidMl / (v.kind === 'beaker' ? 150 : v.capacityMl));
          const lh = Math.max(0.001, frac * (vs.h - 0.1));
          vs.liquid.visible = v.liquidMl > 0.01;
          vs.liquid.scale.y = lh;
          vs.liquid.position.y = 0.02 + lh / 2;
          const m = vs.liquid.material as THREE.MeshStandardMaterial;
          // màu dung dịch đổi DẦN (hiện tượng đổi màu nhìn thấy được thay vì nhảy tức thì)
          vs.shownColor.lerp(new THREE.Color(d.color), 1 - Math.exp(-dt * 2.2));
          m.color.copy(vs.shownColor);
          m.opacity = Math.min(0.92, d.colorAlpha + d.turbidity * 0.5);
          // kết tủa: lớp dày dần ở đáy, màu của chất kết tủa
          const mol = d.precipitates.reduce((s, q) => s + q.mol, 0);
          const sh = d.precipitates.length ? Math.min(0.3, 0.03 + Math.log10(1 + mol * 4e4) * 0.06) : 0;
          vs.shownSh += (sh - vs.shownSh) * (1 - Math.exp(-dt * 0.9)); // lớp đáy dày lên từ từ
          vs.sediment.visible = vs.shownSh > 0.004;
          vs.sediment.scale.y = Math.max(0.001, vs.shownSh);
          vs.sediment.position.y = 0.02 + vs.shownSh / 2;
          const settling = sh - vs.shownSh > 0.004;
          const fp = vs.fall.geometry.attributes.position as THREE.BufferAttribute;
          for (let q = 0; q < 30; q++) {
            const u = (now / 1600 + q / 30) % 1;
            fp.setXYZ(q, Math.sin(q * 5.3) * vs.r * 0.7, settling ? 0.02 + vs.shownSh + (1 - u) * Math.max(0, lh - vs.shownSh) : -5, Math.cos(q * 2.9) * vs.r * 0.7);
          }
          fp.needsUpdate = true;
          if (d.precipitates[0]) (vs.fall.material as THREE.PointsMaterial).color.set(d.precipitates[0].color);
          if (d.precipitates[0]) (vs.sediment.material as THREE.MeshStandardMaterial).color.set(d.precipitates[0].color);
          // bọt khí: số hạt theo tốc độ sinh khí, bay lên rồi vòng lại
          const a = vs.bub.geometry.attributes.position as THREE.BufferAttribute;
          const nb = Math.round(d.bubbles * 36);
          for (let q = 0; q < 36; q++) {
            const u = ((now / (900 + (q % 5) * 150) + q / 36 * 1.7) % 1);
            a.setXYZ(q, Math.sin(q * 7.1 + now / 900) * vs.r * 0.6, q < nb ? 0.05 + u * lh : -5, Math.cos(q * 3.3) * vs.r * 0.6);
          }
          a.needsUpdate = true;
          // làn khí: bọt đang sinh khí hoặc chất lỏng nóng bốc hơi thì có làn trắng mờ bay lên miệng ống
          const hotSteam = d.temp >= 85;
          const wp = vs.wisp.geometry.attributes.position as THREE.BufferAttribute;
          // khí có màu (NO₂ nâu đỏ…) thì làn khí mang đúng màu và đặc hơn
          let gasColor: string | null = null;
          let gasMol = 0;
          for (const [sp, mol] of Object.entries(v.moles)) {
            const si = SPECIES[sp];
            if (si?.phase === 'g' && si.color && mol > gasMol) {
              gasColor = si.color;
              gasMol = mol;
            }
          }
          const wantWisp = d.bubbles > 0.12 || hotSteam || gasMol > 1e-7;
          for (let q = 0; q < 16; q++) {
            const u = (now / 2200 + q / 16) % 1;
            wp.setXYZ(q, Math.sin(q * 3.7 + now / 1500) * 0.1 * u, wantWisp ? vs.h + 0.05 + u * 0.7 : -5, Math.cos(q * 2.1) * 0.1 * u);
          }
          wp.needsUpdate = true;
          const wm = vs.wisp.material as THREE.PointsMaterial;
          wm.color.set(gasColor ?? '#FFFFFF');
          wm.size = gasColor ? 26 : 14;
          wm.opacity = gasColor ? Math.min(0.6, 0.12 + gasMol * 3000) : 0.2 * (hotSteam ? 1 : d.bubbles);
          // chớp sáng khi phản ứng dữ dội
          const since = (now - vs.flashAt) / 1000;
          vs.flash.intensity = since < 0.6 ? 14 * (1 - since / 0.6) * (0.6 + 0.4 * Math.sin(now / 25)) : 0;
          // ống nóng: viền phát sáng cam theo nhiệt độ
          const heat = Math.min(1, Math.max(0, (d.temp - 40) / 80));
          (vs.rim.material as THREE.MeshBasicMaterial).color.set('#E8E6F5').lerp(new THREE.Color('#FF7A3D'), heat);
          vs.ring.material.opacity = i === live.active ? 0.95 : 0.4;
          // thành phần đang có trong ống
          const inside = Object.entries(v.moles).filter(([, mol]) => mol > 1e-7).map(([sp]) => SPECIES[sp]?.name.replace(/^ion /, '') ?? sp);
          vs.what(inside.length && v.liquidMl > 0 ? pos.set(vs.g.position.x, vs.g.position.y + vs.h * 0.45, vs.g.position.z + vs.r + 0.05) : null, undefined, `${inside.slice(0, 3).join(', ')}${inside.length > 3 ? ` +${inside.length - 3}` : ''}`);
          vs.tag(pos.set(vs.g.position.x, vs.g.position.y + vs.h + 0.3, vs.g.position.z), undefined, `${v.id} · ${d.temp.toFixed(0)} °C${d.ph !== null ? ` · pH ${d.ph.toFixed(1)}` : ''} · ${v.liquidMl.toFixed(1)} mL`);
        });
        gogTag(pos.set(GOGGLES.x, 0.55, GOGGLES.z), undefined, live.lab.goggles ? 'Đã đeo kính bảo hộ' : 'Kính bảo hộ (chạm để đeo)');
        tabs.forEach((t) => t.m.scale.set(1, t.gname === live.group ? 2.2 : 1, 1));
        const seenTexts = (live.lab.vessels[live.active]?.log ?? []).filter((t) => !t.startsWith('cho ')).slice(-3);
        k.caption(info || (seenTexts.length ? `${live.lab.vessels[live.active].id} · hiện tượng quan sát được\n${seenTexts.join('\n')}` : `Nhóm ${live.group}: chụm vào chai, kéo tới ống rồi giữ để rót`));
        info = '';
      };
    },
  };
}

const HandsChem3D: React.FC<{input: HandsInput; live: ChemLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsChem3D;
