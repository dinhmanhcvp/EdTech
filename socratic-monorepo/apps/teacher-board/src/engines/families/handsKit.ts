import * as THREE from 'three';
import {TILT_START, glide, oneEuro, palmRoll, steadyRoll, wrapAngle, type Pt} from '../../utils/lab/hands/handTracker';
import {dress, loadModel, partOf, type Skin} from './labParts';
import {setLine, type Kit} from './Stage3D';

/** Đầu vào tay / chuột dùng chung cho mọi bài thực hành tay; React ghi, cảnh 3D đọc mỗi khung hình (không gây render lại). */
export interface HandsInput {
  /** hai bàn tay đã lọc, toạ độ 0–1 theo khung nhìn (x sang phải, y xuống dưới); pts rỗng = không thấy tay */
  hands: {pts: Pt[]; pinch: boolean; /** quãng ngón cái đã miết dọc ngón trỏ, cộng dồn (1 = hết chiều dài ngón) */ slide?: number}[];
  /** vẽ thêm khung xương 21 khớp; mặc định tắt vì lớp phủ đã hiện bàn tay thật từ camera */
  skeleton?: boolean;
  /** chuột / cảm ứng, toạ độ NDC (−1..1); nhấn/nhả xếp hàng, cảnh xử lí mỗi khung hình một sự kiện */
  mouse: {x: number; y: number; down: boolean; active: boolean; queue: {x: number; y: number; down: boolean}[]; /** sự kiện cuối là ngón tay / bút trên màn hình cảm ứng, không phải chuột */ touch?: boolean};
  /** cảnh gán: có vật cầm được dưới điểm này không (nếu có thì tạm khoá xoay máy quay) */
  grab: (nx: number, ny: number) => boolean;
}
export const newInput = (): HandsInput => ({hands: [{pts: [], pinch: false}, {pts: [], pinch: false}], mouse: {x: 0, y: 0, down: false, active: false, queue: []}, grab: () => false});

/** Một con trỏ: bàn tay (điểm giữa đầu ngón cái và ngón trỏ) hoặc chuột. `pressed`/`released` chỉ đúng trong một khung hình. */
export interface Ptr {
  ndc: THREE.Vector2;
  hand: boolean;
  /** con trỏ chuột nhưng là ngón tay chạm màn hình: không có "di chuột" trước khi bấm, đầu ngón to hơn con trỏ → tầm bắt rộng như tay, dụng cụ cầm theo kiểu giữ–kéo */
  touch: boolean;
  active: boolean;
  down: boolean;
  pressed: boolean;
  released: boolean;
  /** cảnh đặt true khi con trỏ đang ở trên vật cầm được: vòng con trỏ đổi màu */
  hot: boolean;
  /** bán kính bắt vật trên màn hình (đơn vị NDC theo chiều cao); tay rộng hơn chuột */
  reach: number;
  /** quãng miết cộng dồn của tay này (chuột: luôn 0); cảnh lấy hiệu giữa hai khung hình */
  slide: number;
  /** góc xoay cổ tay (rad, xem `rollOf`); chuột: NaN */
  roll: number;
}

/** ảnh vẽ bằng canvas (nhiễu, vân đá, cảnh ngoài cửa sổ) thành texture lặp */
function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = 1): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  if (!g) return null;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
/** số giả ngẫu nhiên cố định theo hạt giống: phòng giống nhau mỗi lần mở */
const rnd = (i: number) => {
  const a = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return a - Math.floor(a);
};

/** vật liệu mặt bàn thật theo môn: đá granite lấm tấm (Sinh), nhựa epoxy đen chịu hoá chất (Hoá), tấm laminate xám nhạt viền gỗ (Lí), gỗ dẻ ghép (bàn lắp ráp kĩ thuật) */
export type TopKind = 'granite' | 'epoxy' | 'laminate' | 'wood';
const TOPS: Record<TopKind, {base: string; dots: string[]; n: number; rough: number; edge: string; edgeRough: number}> = {
  granite: {base: '#1B1C1F', dots: ['#2A2B2F', '#3A3B40', '#5A5C62', '#9A9CA3'], n: 9000, rough: 0.32, edge: '#0E0F11', edgeRough: 0.5},
  epoxy: {base: '#202224', dots: ['#25272A', '#2B2D30', '#33363A', '#3C3F44'], n: 5000, rough: 0.45, edge: '#141517', edgeRough: 0.55},
  laminate: {base: '#5F666B', dots: ['#5A6166', '#656C71', '#545B60', '#737A7F'], n: 7000, rough: 0.7, edge: '#A9825A', edgeRough: 0.55},
  wood: {base: '#A87C4E', dots: [], n: 0, rough: 0.62, edge: '#8A6238', edgeRough: 0.6},
};
/** mặt bàn thí nghiệm: tấm dày 12 cm, mặt trên ở y + 0,06, có nẹp mép trước */
export function benchTop(k: Kit, [w, d, cx, cz]: [number, number, number, number], kind: TopKind, y = -0.056) {
  const T = TOPS[kind];
  const map = paint(512, 512, (g, W, H) => {
    g.fillStyle = T.base;
    g.fillRect(0, 0, W, H);
    if (kind === 'wood') {
      // gỗ ghép thanh: mỗi thanh một sắc, vân dọc lượn nhẹ
      for (let i = 0; i < 8; i++) {
        g.fillStyle = `hsl(30, ${40 + rnd(i) * 10}%, ${44 + rnd(i + 20) * 8}%)`;
        g.fillRect(0, (i * H) / 8, W, H / 8 - 1);
        for (let j = 0; j < 14; j++) {
          g.strokeStyle = `hsla(26, 45%, 28%, ${0.1 + rnd(i * 14 + j) * 0.12})`;
          g.lineWidth = 1 + rnd(j + i) * 1.5;
          g.beginPath();
          const y0 = (i * H) / 8 + rnd(i * 31 + j) * (H / 8);
          for (let x = 0; x <= W; x += 32) g.lineTo(x, y0 + Math.sin(x / 90 + j) * 3);
          g.stroke();
        }
      }
    }
    for (let i = 0; i < T.n; i++) {
      const r = rnd(i * 3 + 1);
      g.fillStyle = T.dots[r < 0.55 ? 0 : r < 0.85 ? 1 : r < 0.97 ? 2 : 3];
      const sz = r > 0.97 ? 1.6 : 1 + rnd(i * 3 + 2) * 1.6;
      g.fillRect(rnd(i * 7) * W, rnd(i * 11 + 5) * H, sz, sz);
    }
  }, kind === 'wood' ? 2 : 3);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), new THREE.MeshStandardMaterial({color: '#FFFFFF', map, roughness: T.rough, metalness: 0.02}));
  top.position.set(cx, y, cz);
  top.receiveShadow = true;
  k.scene.add(top);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.05, 0.06), new THREE.MeshStandardMaterial({color: T.edge, roughness: T.edgeRough}));
  edge.position.set(cx, y - 0.034, cz + d / 2);
  k.scene.add(edge);
}
/** mặt bàn đá granite đen lấm tấm (bàn thí nghiệm Sinh) */
export const graniteTop = (k: Kit, bench: [number, number, number, number], y = -0.056) => benchTop(k, bench, 'granite', y);

/**
 * Phòng thực hành sáng, có chiều sâu (mọi cảnh `room: true`): tủ thí nghiệm hai tầng (cánh tủ, tay nắm), kệ đồ, cửa sổ nhìn ra vườn,
 * tường sáng, sàn gạch xám, đèn trần, khung bàn thép. Mọi thứ ở xa bàn và chìm trong sương nhẹ của Stage3D nên làm nền mềm, không tranh với dụng cụ.
 * Theo môn: Sinh có chậu cây + lọ hoá chất; Hoá có tủ hút khí độc + lọ hoá chất + biển vòi rửa mắt; Lí / kĩ thuật có hộp thiết bị đo trên kệ + nguồn điện, dao động kí trên tủ.
 * `bench` = [rộng, sâu, tâm x, tâm z] của mặt bàn mà cảnh vẽ (mặt trên ở y = 0).
 */
export function labRoom(k: Kit, [w, d, cx, cz]: [number, number, number, number], kind: 'bio' | 'chem' | 'phys' = 'phys') {
  const FLOOR = -2.6;
  const wall = cz - d / 2 - 3.2;
  const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: {rough?: number; metal?: number; map?: THREE.Texture | null; glow?: number; opacity?: number} = {}) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, map: o.map ?? null, emissive: o.glow ? color : '#000000', emissiveIntensity: o.glow ?? 0, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1}));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    k.scene.add(m);
    return m;
  };
  const box = (sx: number, sy: number, sz: number, color: string, x: number, y: number, z: number, o: Parameters<typeof add>[5] = {}) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, o);
  const tiles = paint(256, 256, (g, W, H) => {
    g.fillStyle = '#B9BCBC';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = `hsl(180, 3%, ${70 + rnd(i * 4 + j) * 6}%)`;
        g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
      }
  }, 10);
  box(40, 0.1, 40, '#FFFFFF', 0, FLOOR - 0.05, 0, {map: tiles, rough: 0.6});
  // tường kem + chân tường
  const wallC = kind === 'bio' ? '#E9E4D8' : kind === 'chem' ? '#E6E8E6' : '#E2E6EA';
  box(40, 14, 0.2, wallC, 0, FLOOR + 7, wall - 0.9);
  for (const sx of [-1, 1]) box(0.2, 14, 40, wallC, cx + sx * 12, FLOOR + 7, 0, {rough: 0.9});
  // cửa sổ: khung trắng, kính nhìn ra vườn xanh có nắng
  const garden = paint(512, 256, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#CFE6F5');
    sky.addColorStop(0.55, '#E8F3E6');
    sky.addColorStop(1, '#9CC48A');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = rnd(i * 5) * W;
      const y = H * (0.45 + rnd(i * 5 + 1) * 0.5);
      const r = 18 + rnd(i * 5 + 2) * 40;
      g.fillStyle = `hsla(${95 + rnd(i * 5 + 3) * 35}, 38%, ${34 + rnd(i * 5 + 4) * 26}%, 0.75)`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  for (const sx of [-1, 1]) {
    const x = cx + sx * 5.2;
    add(new THREE.PlaneGeometry(3.6, 2.6), '#FFFFFF', x, 3.3, wall - 0.78, {map: garden, glow: 0.9, rough: 1});
    box(3.8, 0.12, 0.16, '#F7F6F2', x, 4.65, wall - 0.75);
    box(3.8, 0.16, 0.3, '#F7F6F2', x, 1.95, wall - 0.7);
    for (const dx of [-1.85, 0, 1.85]) box(0.1, 2.8, 0.14, '#F7F6F2', x + dx, 3.3, wall - 0.74);
  }
  // tủ thí nghiệm dọc tường: tủ dưới có cánh + tay nắm, mặt đá, tủ treo phía trên giữa hai cửa sổ
  const cab = (x0: number, n: number, y: number, h: number, dep: number, color: string) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 1.02;
      box(1.0, h, dep, color, x, y, wall - 0.75 + dep / 2, {rough: 0.55});
      box(0.32, 0.04, 0.04, '#B8BCC2', x + 0.3, y + h * 0.3, wall - 0.73 + dep, {metal: 0.8, rough: 0.3});
    }
  };
  cab(cx - 6.6, 14, FLOOR + 0.95, 1.8, 0.75, '#D8DCDF');
  box(14.6, 0.08, 0.85, '#2A2B2F', cx + 0.03, FLOOR + 1.89, wall - 0.33, {rough: 0.35});
  cab(cx - 1.53, 4, 4.4, 1.3, 0.45, '#E4E7E9');
  // kệ gỗ và lọ hoá chất (nâu, trong, xanh) trên kệ
  for (const [y, n] of [[2.75, 9], [3.55, 7]] as const) {
    box(4.1, 0.06, 0.4, '#9A7048', cx, y, wall - 0.55, {rough: 0.7});
    for (let i = 0; i < n; i++) {
      const r = rnd(i + y * 10);
      const x = cx - 1.8 + i * (3.6 / (n - 1));
      if (kind === 'phys') {
        // hộp thiết bị đo: vỏ màu, mặt trước sẫm có ô hiển thị
        const hh = 0.26 + r * 0.16;
        const c = r < 0.35 ? '#2F5FA8' : r < 0.6 ? '#C9CED6' : r < 0.8 ? '#D9481C' : '#3A3D44';
        box(0.38, hh, 0.3, c, x, y + 0.03 + hh / 2, wall - 0.55, {rough: 0.45});
        box(0.2, 0.08, 0.01, '#9FD3A8', x, y + 0.03 + hh * 0.62, wall - 0.395, {glow: 0.5});
        continue;
      }
      const h = 0.28 + r * 0.25;
      const c = r < 0.4 ? '#6B3A12' : r < 0.7 ? '#DDE7EE' : r < 0.85 ? '#2F6FD0' : '#3F8F3A';
      add(new THREE.CylinderGeometry(0.09 + r * 0.04, 0.1 + r * 0.04, h, 16), c, x, y + 0.03 + h / 2, wall - 0.55, {rough: 0.15, opacity: c === '#DDE7EE' ? 0.55 : 0.92});
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), '#1D1B16', x, y + 0.06 + h, wall - 0.55);
    }
  }
  // dụng cụ trên mặt tủ sau: cốc, bình tam giác, chậu cây
  for (let i = 0; i < 6; i++) {
    const x = cx - 6 + i * 2.3 + rnd(i) * 0.5;
    const h = 0.3 + rnd(i + 9) * 0.3;
    add(new THREE.CylinderGeometry(0.12, 0.2, h, 18), i % 2 ? '#CFE3F0' : '#E8F0E0', x, FLOOR + 1.93 + h / 2, wall - 0.3, {rough: 0.1, opacity: 0.5});
  }
  if (kind === 'bio')
    for (const sx of [-1, 1]) {
      const x = cx + sx * 7.2;
      add(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 18), '#B5532A', x, FLOOR + 2.15, wall - 0.35);
      for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.22 + rnd(i + sx) * 0.12, 12, 10), i % 2 ? '#3F8F3A' : '#5DA34A', x + (rnd(i * 3) - 0.5) * 0.6, FLOOR + 2.55 + rnd(i * 4) * 0.6, wall - 0.35 + (rnd(i * 5) - 0.5) * 0.3);
    }
  else if (kind === 'chem') {
    // tủ hút khí độc ở góc phải: thân tủ, cửa kính kéo, đèn trong tủ, ống hút lên trần; biển vòi rửa mắt khẩn cấp xanh lá
    const x = cx + 8.6;
    box(2.6, 2.4, 1.3, '#DADDDF', x, FLOOR + 1.2, wall - 0.25, {rough: 0.5});
    box(2.6, 2.1, 1.3, '#E4E6E8', x, FLOOR + 3.45, wall - 0.25, {rough: 0.5});
    box(2.3, 1.5, 0.05, '#BFD6E3', x, FLOOR + 3.3, wall + 0.42, {rough: 0.05, opacity: 0.35});
    box(2.3, 0.08, 0.08, '#B8BCC2', x, FLOOR + 2.6, wall + 0.45, {metal: 0.8, rough: 0.3});
    box(2.2, 0.05, 0.9, '#FFFDF6', x, FLOOR + 4.4, wall - 0.25, {glow: 1});
    add(new THREE.CylinderGeometry(0.35, 0.35, 4, 20), '#C9CDD1', x, FLOOR + 6.6, wall - 0.25, {metal: 0.5, rough: 0.4});
    box(0.9, 0.6, 0.03, '#1F8A4C', cx - 8.4, 3.6, wall - 0.78, {glow: 0.25});
    box(0.5, 0.06, 0.04, '#FFFFFF', cx - 8.4, 3.6, wall - 0.76, {glow: 0.6});
    box(0.06, 0.4, 0.04, '#FFFFFF', cx - 8.4, 3.6, wall - 0.76, {glow: 0.6});
  } else
    for (const sx of [-1, 1]) {
      // nguồn điện (núm, ô số đỏ) và dao động kí (màn hình xanh có vệt sóng) trên mặt tủ
      const x = cx + sx * 7.0;
      box(1.1, 0.55, 0.6, sx < 0 ? '#E8E8E4' : '#3A3D44', x, FLOOR + 2.2, wall - 0.35, {rough: 0.45});
      box(0.5, 0.3, 0.01, sx < 0 ? '#3A0D0A' : '#0E2A1A', x - 0.2, FLOOR + 2.25, wall - 0.045, {glow: 0.2});
      box(0.3, 0.05, 0.012, sx < 0 ? '#FF4A2A' : '#4AFF8A', x - 0.2, FLOOR + 2.25, wall - 0.035, {glow: 1.4});
      for (const dy of [-0.1, 0.1]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14).rotateX(Math.PI / 2), '#1D1B16', x + 0.3, FLOOR + 2.2 + dy, wall - 0.03);
    }
  // đèn trần dạng tấm phát sáng
  for (const sx of [-1, 0, 1]) box(2.4, 0.06, 0.8, '#FFFDF6', cx + sx * 4.2, 6.2, cz - 1.5, {glow: 1.2});
  // chân bàn: khung thép sơn xám
  box(w - 0.3, 0.2, d - 0.3, '#3A3D44', cx, -0.22, cz, {metal: 0.4, rough: 0.5});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.14, -FLOOR - 0.3, 0.14, '#4A4E57', cx + sx * (w / 2 - 0.35), (FLOOR - 0.3) / 2, cz + sz * (d / 2 - 0.35), {metal: 0.6, rough: 0.4});
}

/** phòng thí nghiệm Sinh (giữ tên cũ cho các cảnh đang gọi) */
export const bioRoom = (k: Kit, bench: [number, number, number, number]) => labRoom(k, bench, 'bio');

const BONES = [0, 1, 1, 2, 2, 3, 3, 4, 0, 5, 5, 6, 6, 7, 7, 8, 5, 9, 9, 10, 10, 11, 11, 12, 9, 13, 13, 14, 14, 15, 15, 16, 13, 17, 17, 18, 18, 19, 19, 20, 0, 17];

/** Hai bàn tay ảo (21 khớp) + vòng con trỏ, vẽ trên mặt phẳng cao `h`; trả ba con trỏ (tay 0, tay 1, chuột). */
/**
 * Góc nghiêng cổ tay (`p.roll`) chỉ đáng tin khi có camera độ sâu: webcam thường chỉ cho `z` ước lượng, nhiễu nên vặn vít và nghiêng lọ giật.
 * Tắt thì `p.roll` luôn NaN và mọi bài dùng cử chỉ chỉ cần vị trí 2D (giữ để vặn / rót, vẽ vòng tròn). Bật lại khi dùng camera độ sâu.
 */
export const WRIST_ROLL = false;

/** vùng chết quanh tâm của núm / van / vô-lăng khi vặn bằng cách đưa tay vòng quanh: sát tâm thì góc nhảy loạn theo rung của tay (≈ 23 px trên màn hình 768) */
export const DEAD_WORLD = 0.12; // đơn vị cảnh (núm bán kính 0,2)
export const DEAD_NDC = 0.06; // theo chiều cao màn hình, cho vật tính trên màn hình (vô-lăng)
/** góc quay giữa hai lần đo (qua mốc ±π); 0 khi một trong hai đang ở vùng chết (NaN) */
export function turnDelta(prev: number, a: number): number {
  if (Number.isNaN(prev) || Number.isNaN(a)) return 0;
  const da = a - prev;
  return da - Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
}

export function handPointers(k: Kit, input: HandsInput, h: number) {
  const overlay = {depthTest: false, transparent: true};
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v2 = new THREE.Vector2();
  const v3 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const onPlane = (nx: number, ny: number, y: number, out: THREE.Vector3) => {
    ray.setFromCamera(v2.set(nx, ny), k.camera);
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, out) ?? out.set(0, y, 0);
  };
  const gfx = [0, 1, 2].map((i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 10, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FBF9F4', ...overlay}));
    ring.renderOrder = 5;
    ring.visible = false;
    k.scene.add(ring);
    if (i === 2) return {ring, joints: null, bones: null, pts: [] as THREE.Vector3[], seen: false, gl: [] as ReturnType<typeof glide>[], src: null as Pt[] | null, t: 0};
    const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({color: '#E8E6F5', opacity: 0.9, ...overlay}), 21);
    const bones = k.line('#E8E6F5', 4, new Array(BONES.length * 3).fill(0), true);
    joints.renderOrder = bones.renderOrder = 4;
    joints.frustumCulled = false;
    Object.assign(bones.material, {depthTest: false, transparent: true, opacity: 0.6});
    joints.visible = bones.visible = false;
    k.scene.add(joints, bones);
    return {ring, joints, bones, pts: [] as THREE.Vector3[], seen: false, gl: Array.from({length: 42}, () => glide()), src: null as Pt[] | null, t: 0};
  });
  const ptrs: Ptr[] = [0, 1, 2].map((i) => ({ndc: new THREE.Vector2(), hand: i < 2, touch: false, active: false, down: false, pressed: false, released: false, hot: false, reach: i < 2 ? 0.16 : 0.07, slide: 0, roll: NaN}));
  /** khoảng cách trên MÀN HÌNH từ điểm (nx, ny) tới một điểm 3D: đúng cho cả vật nằm cao */
  const distAt = (nx: number, ny: number, pos: THREE.Vector3) => {
    v3.copy(pos).project(k.camera);
    return Math.hypot((v3.x - nx) * k.camera.aspect, v3.y - ny);
  };

  // góc nghiêng cổ tay: mẫu thưa theo camera (30 Hz) được trải đều theo thời gian thực bằng `glide` (nội suy có ngoại suy vận tốc ngắn), trên góc đã gỡ nhảy ±π
  // góc nghiêng nhiễu hơn vị trí: lọc One Euro (đứng yên thì lọc mạnh, xoay nhanh thì nhẹ) trước khi nội suy; nội suy chỉ ngoại suy rất ngắn để không khuếch đại nhiễu
  const rollGl = [0, 1, 2].map(() => glide(0.015, 16));
  const rollEuro = [0, 1, 2].map(() => oneEuro(1.2, 6));
  const rollBase = [NaN, NaN, NaN]; // góc "đứng" thích nghi chậm: bỏ trôi tay từ từ, giữ nguyên khi đang nghiêng thật
  const rollRaw = [NaN, NaN, NaN];
  const rollUnw = [0, 0, 0];
  const rollSrc: (Pt[] | null)[] = [null, null, null];
  let stepAt = performance.now();
  return {
    ptrs,
    onPlane,
    distAt,
    grabWhen(test: (nx: number, ny: number) => boolean) {
      input.grab = (nx, ny) => {
        const hit = test(nx, ny);
        if (hit) k.controls.enabled = false;
        return hit;
      };
    },
    /** gọi đầu mỗi khung hình; `ease` = hệ số trượt về đích (camera 30 khung hình/giây, màn hình 60) */
    step(ease: number) {
      void ease; // tay tự trượt bằng `glide`; tham số giữ lại cho các cảnh đang gọi
      Object.assign(input.mouse, input.mouse.queue.shift());
      const nowMs = performance.now();
      const rollDt = Math.min((nowMs - stepAt) / 1000, 0.05);
      stepAt = nowMs;
      ptrs.forEach((p, i) => {
        const g = gfx[i];
        const hand = p.hand ? input.hands[i] : null;
        const active = hand ? hand.pts.length === 21 : input.mouse.active || input.mouse.down;
        const down = active && (hand ? hand.pinch : input.mouse.down);
        if (g.joints && g.bones) {
          g.joints.visible = g.bones.visible = active && !!input.skeleton;
          if (active && hand) {
            const flat: number[] = [];
            // camera cho mẫu 30 lần/giây, màn hình vẽ 60 lần/giây: mỗi khớp trượt theo vận tốc ước lượng giữa hai mẫu (xem `glide`)
            const now = performance.now() / 1000;
            const dt = Math.min(now - g.t, 0.05);
            g.t = now;
            const fresh = hand.pts !== g.src || !g.seen;
            g.src = hand.pts;
            if (!g.seen) g.gl.forEach((x) => x.reset());
            hand.pts.forEach((q, j) => {
              const gx = g.gl[j * 2];
              const gy = g.gl[j * 2 + 1];
              if (fresh) {
                gx.sample(q.x, now);
                gy.sample(q.y, now);
              }
              const goal = onPlane(gx.at(now, dt) * 2 - 1, 1 - gy.at(now, dt) * 2, h, v3);
              g.pts[j] = (g.pts[j] ?? new THREE.Vector3()).copy(goal);
              g.joints!.setMatrixAt(j, m4.makeTranslation(g.pts[j].x, g.pts[j].y, g.pts[j].z));
            });
            g.joints.instanceMatrix.needsUpdate = true;
            for (const b of BONES) flat.push(g.pts[b].x, g.pts[b].y, g.pts[b].z);
            setLine(g.bones, flat);
            v3.copy(g.pts[4]).lerp(g.pts[8], 0.5).project(k.camera);
            p.ndc.set(v3.x, v3.y);
          }
          g.seen = active;
        } else p.ndc.set(input.mouse.x, input.mouse.y);
        p.pressed = down && !p.down;
        p.released = !down && p.down;
        p.down = down;
        p.active = active;
        p.slide = hand?.slide ?? 0;
        if (!p.hand) {
          p.touch = !!input.mouse.touch;
          p.reach = p.touch ? 0.16 : 0.07;
        }
        // góc cổ tay mẫu thưa theo camera (30 Hz): lọc mũ theo thời gian thực, đi theo đường ngắn nhất qua mốc ±π
        if (WRIST_ROLL && hand && hand.pts.length === 21) {
          const nowS = performance.now() / 1000;
          if (hand.pts !== rollSrc[i]) {
            rollSrc[i] = hand.pts;
            const pr = palmRoll(hand.pts);
            const target = Number.isNaN(pr) ? steadyRoll(hand.pts) : pr;
            if (Number.isNaN(rollRaw[i])) {
              rollUnw[i] = target;
              rollGl[i].reset();
              rollEuro[i] = oneEuro(1.2, 6);
              rollBase[i] = target;
            } else rollUnw[i] += wrapAngle(target - rollRaw[i]);
            rollRaw[i] = target;
            rollGl[i].sample(rollEuro[i](rollUnw[i], nowS), nowS);
          }
          const abs = rollGl[i].at(nowS, rollDt);
          // góc so với tư thế đứng: trôi chậm (dưới ngưỡng nghiêng) được hấp thụ với hằng thời gian 3 s, đang nghiêng thì giữ nguyên
          if (Math.abs(abs - rollBase[i]) < TILT_START * 0.9) rollBase[i] += (abs - rollBase[i]) * (1 - Math.exp(-rollDt / 3));
          p.roll = abs - rollBase[i];
        } else {
          rollRaw[i] = NaN;
          rollSrc[i] = null;
          rollBase[i] = NaN;
          p.roll = NaN;
        }
        if (!p.hand && p.released) k.controls.enabled = true;
        g.ring.visible = active && p.hand;
        g.ring.position.copy(onPlane(p.ndc.x, p.ndc.y, h, v3));
        g.ring.scale.setScalar(down ? 0.6 : 1);
        g.ring.material.color.set(p.hot ? '#D9481C' : '#FBF9F4');
        p.hot = false;
      });
    },
  };
}

/** Thanh trượt 3D kéo bằng tay: mỗi tham số là một ray có con trượt; trả `grab` (cho input.grab) và `step` (gọi mỗi khung hình). */
export function handSliders(
  k: Kit,
  P: ReturnType<typeof handPointers>,
  params: {id: string; label: string; t: number}[],
  origin: [number, number],
  write: (id: string, t: number) => void,
  text: (id: string) => string,
) {
  const LEN = 2.6;
  const rigs = params.map((p, i) => {
    const z = origin[1] + i * 0.5;
    const rail = solid3(k, new THREE.BoxGeometry(LEN + 0.3, 0.05, 0.1), '#A8ADB3', origin[0] + LEN / 2, 0.06, z);
    const handle = solid3(k, new THREE.CylinderGeometry(0.11, 0.11, 0.14, 24), '#E3B341', origin[0], 0.13, z);
    const tag = k.label(p.label);
    return {id: p.id, z, rail, handle, tag, skin: null as Skin | null};
  });
  // con trượt chia vạch dựng bằng Blender (thanh dẫn, thang chia, con chạy có kim chỉ); tải lỗi thì giữ hình khối
  void loadModel('/models/lab-parts.glb')
    .then((lib) =>
      rigs.forEach((r) => {
        dress(r.rail, partOf(lib, 'SlideRail'));
        r.skin = dress(r.handle, partOf(lib, 'SlideKnob'));
      }),
    )
    .catch(() => undefined);
  const pos = new THREE.Vector3();
  const held: (string | null)[] = P.ptrs.map(() => null);
  const slid = P.ptrs.map((p) => p.slide);
  let sel: string | undefined = params[0]?.id;
  const near = (nx: number, ny: number, reach: number) => {
    let best: string | null = null;
    let bd = reach;
    for (const r of rigs) {
      const d = P.distAt(nx, ny, pos.copy(r.handle.position));
      if (d < bd) {
        bd = d;
        best = r.id;
      }
    }
    return best;
  };
  const v3 = new THREE.Vector3();
  return {
    grab: (nx: number, ny: number) => near(nx, ny, 0.07) !== null,
    step(t: Record<string, number>) {
      P.ptrs.forEach((ptr, n) => {
        const hover = ptr.active && !held[n] ? near(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && hover) held[n] = hover;
        if (ptr.released || !ptr.active) held[n] = null;
        const id = held[n];
        // vi cử chỉ: ngón cái miết dọc ngón trỏ chỉnh tinh thanh trượt vừa cầm gần nhất (con trượt cam), tay không phải rời chỗ
        const d = ptr.slide - slid[n];
        slid[n] = ptr.slide;
        if (id) {
          sel = id;
          write(id, Math.min(1, Math.max(0, (P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.13, v3).x - origin[0]) / LEN)));
        } else if (d && sel) write(sel, Math.min(1, Math.max(0, (t[sel] ?? 0) + d)));
        ptr.hot = !!(id ?? hover) || d !== 0;
      });
      for (const r of rigs) {
        r.handle.material.color.set(r.id === sel ? '#D9481C' : '#E3B341');
        r.skin?.mats.find((m) => m.name === 'tint')?.color.set(r.id === sel ? '#D9481C' : '#E3B341');
        r.handle.position.x = origin[0] + (t[r.id] ?? 0) * LEN;
        r.tag(v3.set(origin[0] + LEN + 1.1, 0.1, r.z + 0.12), undefined, `${params.find((p) => p.id === r.id)!.label}: ${text(r.id)}`);
      }
    },
  };
}
function solid3(k: Kit, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, metalness: 0.2, roughness: 0.5}));
  m.position.set(x, y, z);
  m.castShadow = true;
  k.scene.add(m);
  return m;
}
