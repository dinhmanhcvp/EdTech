'use client';

import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type {P, S} from '../../utils/presets/types';

export interface View3 {
  p: P;
  t: number;
  s: S;
}
export type FatLine = LineSegments2 & {material: LineMaterial};
export interface Arrow3 {
  obj: THREE.Group;
  /** đặt mũi tên từ a tới b (toạ độ của nhóm cha); quá ngắn thì ẩn */
  set(a: THREE.Vector3, b: THREE.Vector3): void;
}
export interface Kit {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  night: boolean;
  /** nhóm theo hệ trục toán học (z hướng lên): (x, y, z) của bài toán → (x, z, −y) của three */
  zUp(): THREE.Group;
  /** nét dày tính theo px màn hình; `segments` = các đoạn rời (cứ hai điểm một đoạn) */
  line(color: string, width: number, pts?: number[], segments?: boolean): FatLine;
  arrow(color: string, radius?: number): Arrow3;
  /** nhãn HTML bám theo một điểm 3D; gọi với null để ẩn. `parent` = nhóm chứa điểm (để đổi về toạ độ thế giới) */
  label(text: string, color?: string, plain?: boolean): (at: THREE.Vector3 | null, parent?: THREE.Object3D, text?: string) => void;
  /** chú thích góc trên trái: dòng đầu đậm */
  caption(text: string): void;
  /** đăng ký vật có thể chạm chọn (nhóm cha mang id); `lowPriority`: chỉ được chọn khi không trúng vật nào khác (màng tế bào bao ngoài) */
  pick(obj: THREE.Object3D, id: string, lowPriority?: boolean): void;
  /**
   * Cho kéo một vật bằng chuột, bút hay ngón tay: trong lúc kéo máy quay không xoay. `onMove` nhận điểm thế giới nằm trên mặt phẳng
   * hướng về máy quay đi qua điểm chạm; `onEnd` gọi khi nhả (kể cả thả vào đâu thì `pt` là điểm thả). Trả hàm huỷ đăng ký.
   */
  drag(obj: THREE.Object3D, spec: {plane?: THREE.Plane; onStart?: () => void; onMove: (pt: THREE.Vector3) => void; onEnd?: (pt: THREE.Vector3) => void}): () => void;
  /** đẩy giá trị về bảng điều khiển (thanh trượt hoặc lựa chọn); SceneLab chặn theo min/max/bước của thanh trượt */
  set(key: string, value: number | string): void;
}
export interface SceneDef {
  /** nền trời đêm, không sàn, không đèn mặc định (cảnh tự đặt đèn) */
  night?: boolean;
  /** sàn hứng bóng đổ; máy quay không chui xuống dưới sàn */
  floor?: boolean;
  /** bỏ lưới sàn (vật thể lơ lửng: cơ quan, tế bào) */
  noGrid?: boolean;
  /** phòng thực hành ảo: nền tối, góc nhìn rộng, không lưới; cảnh tự dựng phòng (`labRoom`) */
  room?: boolean;
  dist: number;
  target?: [number, number, number];
  /** góc ngang, góc cao (độ) lấy từ thanh trượt: đổi thì đặt lại máy quay, sau đó người dùng vẫn kéo tự do */
  orbit?: (v: View3) => [number, number];
  setup: (k: Kit) => (v: View3) => void;
}

const rad = (d: number) => (d * Math.PI) / 180;
const UP = new THREE.Vector3(0, 1, 0);

/** Ghi điểm vào nét dày (đường gấp khúc hoặc các đoạn rời tùy lúc tạo). Cùng số điểm thì ghi tại chỗ: setPositions mỗi khung hình sẽ rò bộ đệm GPU. */
export function setLine(o: FatLine, pts: number[]): void {
  let flat = pts;
  if (o.userData.poly) {
    flat = [];
    for (let i = 0; i + 5 < pts.length; i += 3) flat.push(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
  }
  const cur = (o.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute | undefined)?.data;
  if (cur && cur.array.length === flat.length) {
    (cur.array as Float32Array).set(flat);
    cur.needsUpdate = true;
  } else {
    o.geometry.dispose();
    o.geometry = new LineSegmentsGeometry().setPositions(flat);
  }
}

/**
 * Sân khấu 3D dùng chung (three.js) cho các template có vật thể không gian: ánh sáng studio, bóng đổ mềm, sàn lưới mờ dần,
 * kéo để xoay, lăn để phóng, nhãn HTML bám điểm 3D. Mỗi cảnh chỉ khai báo vật thể và hàm cập nhật theo (tham số, thời gian).
 * Không tạo được WebGL thì gọi `onFail` để SceneLab quay về bản SVG.
 */
/** chất lượng đồ họa dùng chung trong phiên: 0 = theo màn hình (tối đa 2×); hạ dần khi máy không theo kịp 30 khung/giây */
const QUALITY = {ratio: 0, shadows: true};
export const Stage3D: React.FC<View3 & {def: SceneDef; onFail: () => void; onPick?: (id: string | null) => void; onSet?: (key: string, value: number | string) => void; fill?: boolean}> = ({def, p, t, s, onFail, onPick, onSet, fill}) => {
  const box = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLDivElement>(null);
  const pickAt = useRef<((x: number, y: number) => string | null) | null>(null);
  const down = useRef<[number, number]>([0, 0]);
  const setRef = useRef(onSet);
  setRef.current = onSet;
  const live = useRef({p, t, s, at: 0});
  live.current = {p, t, s, at: typeof performance !== 'undefined' ? performance.now() : 0};
  const night = !!def.night;
  const dark = night || !!def.room;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true});
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(QUALITY.ratio || Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = QUALITY.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const bg = night ? '#0B0E2A' : def.room ? '#0E1030' : '#EEEAE0';
    scene.background = new THREE.Color(bg);
    const pmrem = new THREE.PMREMGenerator(renderer);
    if (night) {
      // sao nền: vị trí cố định theo hạt giống để không nhấp nháy giữa các lần mở
      const pos = Array.from({length: 240}, (_, i) => {
        const a = Math.sin(i * 12.9898) * 43758.5453;
        const b = Math.sin(i * 78.233) * 12345.6789;
        const th = (a - Math.floor(a)) * 2 * Math.PI;
        const y = (b - Math.floor(b)) * 2 - 1;
        const r = Math.sqrt(1 - y * y) * 40;
        return [r * Math.cos(th), y * 40, r * Math.sin(th)];
      }).flat();
      scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)), new THREE.PointsMaterial({color: '#E8E6F5', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7})));
    } else {
      scene.fog = new THREE.Fog(bg, def.dist * 1.6, def.dist * 3.2);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const sun = new THREE.DirectionalLight('#FFF6E8', def.room ? 1.5 : 2.2);
      sun.position.set(2.5, 4.5, 3.5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.radius = 5;
      const sh = def.room ? 5 : 3;
      Object.assign(sun.shadow.camera, {left: -sh, right: sh, top: sh, bottom: -sh, near: 0.5, far: 14});
      scene.add(sun, new THREE.HemisphereLight('#FFFFFF', '#D8D2C4', def.room ? 0.25 : 0.5));
      if (!def.noGrid && !def.room) scene.add(new THREE.GridHelper(24, 48, '#CFC8B8', '#DDD7C9'));
      if (def.floor && !def.room) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({opacity: 0.22}));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
      }
    }

    const camera = new THREE.PerspectiveCamera(def.room ? 45 : 30, 560 / 340, 0.1, 120);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = def.dist * 0.45;
    controls.maxDistance = def.dist * 2.4;
    if (def.floor) controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(...(def.target ?? [0, 0, 0]));
    const place = (az: number, e: number) => {
      const d = camera.position.distanceTo(controls.target);
      const dd = d > 0.01 && d < 100 ? d : def.dist;
      const c = controls.target;
      camera.position.set(c.x + dd * Math.sin(rad(az)) * Math.cos(rad(e)), c.y + dd * Math.sin(rad(e)), c.z + dd * Math.cos(rad(az)) * Math.cos(rad(e)));
    };
    camera.position.set(0, 0, 1e4); // chưa đặt: place() sẽ dùng def.dist

    const labels: {el: HTMLSpanElement; pos: THREE.Vector3; on: boolean}[] = [];
    let capText = '';
    const pickers: THREE.Object3D[] = [];
    const ray = new THREE.Raycaster();
    const draggables: {obj: THREE.Object3D; spec: Parameters<Kit['drag']>[1]}[] = [];
    const kit: Kit = {
      scene,
      camera,
      controls,
      night,
      zUp: () => {
        const g = new THREE.Group();
        g.rotation.x = -Math.PI / 2;
        scene.add(g);
        return g;
      },
      line: (color, width, pts, segments = false) => {
        const o = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color, linewidth: width})) as FatLine;
        o.userData.poly = !segments;
        o.frustumCulled = false;
        if (pts) setLine(o, pts);
        return o;
      },
      arrow: (color, radius = 0.03) => {
        const mat = new THREE.MeshStandardMaterial({color, roughness: 0.4, metalness: 0.1, emissive: night ? color : '#000000', emissiveIntensity: night ? 0.8 : 0});
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 16).translate(0, 0.5, 0), mat);
        const hl = radius * 7;
        const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, hl, 20).translate(0, hl / 2, 0), mat);
        shaft.castShadow = head.castShadow = true;
        const obj = new THREE.Group().add(shaft, head);
        const d = new THREE.Vector3();
        return {
          obj,
          set: (a, b) => {
            const len = d.subVectors(b, a).length();
            obj.visible = len > 1e-3;
            if (!obj.visible) return;
            obj.position.copy(a);
            obj.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
            const h = Math.min(hl, len * 0.5);
            head.scale.setScalar(h / hl);
            head.position.y = len - h;
            shaft.scale.y = len - h;
          },
        };
      },
      label: (text, color, plain = false) => {
        const sp = document.createElement('span');
        sp.className = plain
          ? 'pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap text-[13px] font-semibold'
          : `pointer-events-none absolute -translate-x-1/2 -translate-y-[200%] whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums shadow-sm ${dark ? 'border-white/20 bg-[#11143A]/85 text-[#E8E6F5]' : 'border-[#1D1B16]/15 bg-[#FBF9F4]/90 text-[#1D1B16]'}`;
        if (plain) {
          sp.style.color = color ?? (dark ? '#E8E6F5' : '#1D1B16');
          sp.style.textShadow = dark ? '0 0 4px #0B0E2A' : '0 0 3px #FBF9F4, 0 0 3px #FBF9F4';
        } else if (color) {
          const dot = document.createElement('i');
          dot.className = 'mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle';
          dot.style.background = color;
          sp.append(dot);
        }
        const tn = document.createTextNode(text);
        sp.append(tn);
        sp.style.opacity = '0';
        el.append(sp);
        const L = {el: sp, pos: new THREE.Vector3(), on: false};
        labels.push(L);
        return (at, parent, next) => {
          if (next !== undefined && tn.data !== next) tn.data = next;
          L.on = !!at;
          if (at) {
            L.pos.copy(at);
            parent?.localToWorld(L.pos);
          }
        };
      },
      pick: (obj, id, lowPriority = false) => {
        obj.userData.part = id;
        obj.userData.low = lowPriority;
        pickers.push(obj);
      },
      drag: (obj, spec) => {
        const d = {obj, spec};
        draggables.push(d);
        return () => void draggables.splice(draggables.indexOf(d), 1);
      },
      set: (key, value) => setRef.current?.(key, value),
      caption: (text) => {
        if (text === capText || !cap.current) return;
        capText = text;
        const [head, ...rest] = text.split('\n');
        cap.current.replaceChildren(Object.assign(document.createElement('b'), {className: 'block text-[13px] font-semibold', textContent: head}), ...rest.map((r) => Object.assign(document.createElement('span'), {className: 'block text-xs opacity-75', textContent: r})));
      },
    };
    const update = def.setup(kit);

    const resize = () => {
      const w = el.clientWidth || 560;
      const h = el.clientHeight || 340;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // phòng thực hành phủ kín màn hình: màn hình hẹp hơn tỉ lệ thiết kế thì mở rộng góc nhìn để vẫn thấy trọn bề ngang bàn
      if (def.room) camera.fov = (360 / Math.PI) * Math.atan(Math.tan(Math.PI / 8) * Math.max(1, 1.647 / camera.aspect));
      camera.updateProjectionMatrix();
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(el);
    resize();

    pickAt.current = (cx, cy) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
      const hits = ray.intersectObjects(pickers, true).filter((h) => h.object.visible);
      const root = (o: THREE.Object3D | null): THREE.Object3D | null => (o ? (o.userData.part ? o : root(o.parent)) : null);
      const owners = hits.map((h) => root(h.object)).filter((o): o is THREE.Object3D => !!o && o.visible);
      return (owners.find((o) => !o.userData.low) ?? owners[0])?.userData.part ?? null;
    };
    // kéo vật: nghe ở pha bắt (capture) để chạy trước OrbitControls rồi tắt xoay máy quay trong lúc kéo; pointer events dùng chung cho chuột, bút, ngón tay
    const dom = renderer.domElement;
    const plane = new THREE.Plane();
    const hitPt = new THREE.Vector3();
    let active: (typeof draggables)[number] | null = null;
    const toRay = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    };
    const grabbed = (e: PointerEvent) => {
      toRay(e);
      const live = draggables.filter((d) => d.obj.visible);
      const hits = ray.intersectObjects(live.map((d) => d.obj), true).filter((h) => h.object.visible);
      const own = (o: THREE.Object3D | null): (typeof draggables)[number] | undefined => (o ? live.find((d) => d.obj === o) ?? own(o.parent) : undefined);
      const h = hits[0];
      return h ? {d: own(h.object), point: h.point} : null;
    };
    const onDown = (e: PointerEvent) => {
      const g = grabbed(e);
      if (!g?.d) return;
      active = g.d;
      controls.enabled = false;
      dom.setPointerCapture?.(e.pointerId);
      if (active.spec.plane) plane.copy(active.spec.plane);
      else plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), g.point);
      dom.style.cursor = 'grabbing';
      active.spec.onStart?.();
      e.stopPropagation();
    };
    const onMove = (e: PointerEvent) => {
      if (!active) {
        dom.style.cursor = e.pointerType === 'mouse' && grabbed(e)?.d ? 'grab' : '';
        return;
      }
      toRay(e);
      if (ray.ray.intersectPlane(plane, hitPt)) active.spec.onMove(hitPt);
    };
    const onUp = (e: PointerEvent) => {
      if (!active) return;
      toRay(e);
      ray.ray.intersectPlane(plane, hitPt);
      active.spec.onEnd?.(hitPt);
      active = null;
      controls.enabled = true;
      dom.style.cursor = '';
      dom.releasePointerCapture?.(e.pointerId);
    };
    dom.addEventListener('pointerdown', onDown, true);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    let lastAz = NaN;
    let lastEl = NaN;
    const v = new THREE.Vector3();
    let raf = 0;
    // chất lượng thích nghi: máy yếu (màn hình lớp học, laptop cũ) chạy dưới ~30 khung/giây thì hạ độ phân giải từng bậc rồi tắt bóng đổ;
    // lựa chọn nhớ cho các cảnh sau trong phiên. Khung hình quá dài (tab ẩn / bị trình duyệt hãm) không tính.
    let lastFrameAt = performance.now();
    let avgMs = 16;
    let sampled = 0;
    const degrade = () => {
      const cur = renderer.getPixelRatio();
      if (cur > 1.01) QUALITY.ratio = Math.max(1, cur > 1.5 ? 1.5 : 1);
      else if (cur > 0.8) QUALITY.ratio = 0.75;
      else if (QUALITY.shadows) {
        QUALITY.shadows = false;
        renderer.shadowMap.enabled = false;
        scene.traverse((o) => ((o as THREE.Mesh).material && (((o as THREE.Mesh).material as THREE.Material).needsUpdate = true)));
      } else return;
      renderer.setPixelRatio(QUALITY.ratio);
      resize();
    };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const tnow = performance.now();
      const ft = tnow - lastFrameAt;
      lastFrameAt = tnow;
      if (ft < 250) {
        avgMs += (ft - avgMs) * 0.05;
        if (++sampled >= 150) {
          sampled = 0;
          if (avgMs > 32) degrade();
        }
      }
      const {p: q, t: t0, s: s0, at} = live.current;
      // SceneLab đổi t mỗi 50 ms: nội suy tiếp giữa hai nhịp để chuyển động mượt 60 khung/giây
      const dt = (performance.now() - at) / 1000;
      const view = {p: q, t: t0 + (dt < 0.12 ? Math.min(dt, 0.05) : 0), s: s0};
      update(view);
      const [az, e] = def.orbit?.(view) ?? [25, 16];
      if (az !== lastAz || e !== lastEl) {
        lastAz = az;
        lastEl = e;
        place(az, e);
      }
      controls.update();
      scene.updateMatrixWorld();
      renderer.render(scene, camera);
      for (const L of labels) {
        if (L.on) v.copy(L.pos).project(camera);
        const show = L.on && v.z < 1;
        L.el.style.opacity = show ? '1' : '0';
        if (show) {
          L.el.style.left = `${((v.x + 1) / 2) * 100}%`;
          L.el.style.top = `${((1 - v.y) / 2) * 100}%`;
        }
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener('pointerdown', onDown, true);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      ro?.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        for (const mat of ([] as THREE.Material[]).concat(m.material ?? [])) mat.dispose();
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // giải phóng ngữ cảnh WebGL ngay (không chờ GC): đổi bài nhiều lần không làm cạn ngữ cảnh của trình duyệt
      renderer.domElement.remove();
      labels.forEach((L) => L.el.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={box}
      data-testid="scene-3d"
      onPointerDown={(e) => {
        e.stopPropagation(); // kéo trong cảnh là xoay máy quay, không phải dời cả khung mô phỏng
        down.current = [e.clientX, e.clientY];
      }}
      onPointerUp={(e) => {
        // chạm (không kéo) thì chọn vật dưới ngón tay
        if (onPick && Math.hypot(e.clientX - down.current[0], e.clientY - down.current[1]) < 6) onPick(pickAt.current?.(e.clientX, e.clientY) ?? null);
      }}
      onWheel={(e) => e.stopPropagation()}
      className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing ${fill ? 'h-full' : 'aspect-[560/340] rounded-2xl border'} ${dark ? 'border-[#1B1B4B] text-[#E8E6F5]' : 'border-[#1D1B16]/15 text-[#1D1B16]'}`}
    >
      <div ref={cap} className={`pointer-events-none absolute max-w-[70%] ${fill ? 'bottom-6 left-6 origin-bottom-left scale-125 rounded-xl bg-[#11143A]/85 font-mono tabular-nums px-3 py-2 empty:hidden' : 'left-4 top-3'}`} />
      <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] opacity-70">Kéo nền để xoay · lăn để phóng · kéo vật có chấm cam để thao tác</span>
    </div>
  );
};
