import * as THREE from 'three';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Thư viện bộ phận dựng bằng Blender (`tools/lab-models/*.py` → `public/models/*.glb`), tải một lần cho mỗi tệp.
 * Cảnh dựng trước các vật thay thế bằng hình khối (để tương tác chạy ngay), khi thư viện về thì "mặc" mô hình thật lên.
 */
const cache = new Map<string, Promise<THREE.Group>>();
/** mã phiên bản tài nguyên (mỗi lần deploy một giá trị): gắn vào địa chỉ mô hình để trình duyệt / CDN giữ bản cũ lâu mà vẫn lấy bản mới sau khi deploy */
const ASSET_V = process.env.NEXT_PUBLIC_ASSET_V || 'dev';
export const assetUrl = (url: string): string => `${url}?v=${ASSET_V}`;
let draco: DRACOLoader | null = null;
/** GLTFLoader có giải nén Draco (mô hình Blender được nén hình học; bộ giải nén nằm ở `public/draco`, cùng nguồn với trang) */
export function gltfLoader(): GLTFLoader {
  draco ??= new DRACOLoader().setDecoderPath('/draco/');
  return new GLTFLoader().setDRACOLoader(draco);
}
export function loadModel(url: string): Promise<THREE.Group> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((resolve, reject) => gltfLoader().load(assetUrl(url), (g) => resolve(g.scene), undefined, reject));
    cache.set(url, p);
  }
  return p;
}

export type Skin = {obj: THREE.Object3D; mats: THREE.MeshStandardMaterial[]};
/** bản sao một bộ phận theo tên, đặt về gốc toạ độ, vật liệu riêng (đổi màu không lan sang bản sao khác); null nếu thư viện không có */
export function partOf(lib: THREE.Object3D, name: string): Skin | null {
  const src = lib.getObjectByName(name);
  if (!src) return null;
  const obj = src.clone(true);
  obj.position.set(0, 0, 0);
  const mats: THREE.MeshStandardMaterial[] = [];
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    m.material = mat;
    m.castShadow = m.receiveShadow = true;
    mats.push(mat);
  });
  return {obj, mats};
}
/** thủy tinh của mô hình (vật liệu tên `glass`) dùng vật liệu thủy tinh vật lí của cảnh: khúc xạ, lớp phủ bóng, không đổ bóng */
export function glassify(o: THREE.Object3D, opacity = 0.2): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || (m.material as THREE.Material).name !== 'glass') return;
    m.material = new THREE.MeshPhysicalMaterial({color: '#DDEBF7', transparent: true, opacity, roughness: 0.06, ior: 1.458, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide});
    m.castShadow = false;
  });
}
/**
 * Dán nhãn giấy lên chai `Bottle`: dải màu ở trên, tên chất (chữ lớn, tự co cho vừa) và một dòng phụ (công thức, nồng độ, tác dụng).
 * Nhãn là mảnh trụ ôm quanh thân chai, quay mặt về phía người nhìn (+z) nên chữ đọc được ngay khi chai đứng ở kệ; chai nghiêng khi rót thì nhãn nghiêng theo.
 */
export function labelBottle(sk: Skin | null, title: string, sub = '', accent = '#2459C9'): void {
  if (!sk) return;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 332;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FBF9F4';
  g.fillRect(0, 0, 512, 332);
  g.fillStyle = accent;
  g.fillRect(0, 0, 512, 40);
  g.fillStyle = '#1D1B16';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fit = (text: string, weight: number, size: number, min: number) => {
    g.font = `${weight} ${size}px sans-serif`;
    while (g.measureText(text).width > 470 && size > min) g.font = `${weight} ${(size -= 4)}px sans-serif`;
  };
  fit(title, 800, 140, 34);
  g.fillText(title, 256, sub ? 148 : 190);
  if (sub) {
    g.fillStyle = '#4B473D';
    fit(sub, 600, 72, 26);
    g.fillText(sub, 256, 262);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const len = 2.6; // góc ôm quanh thân (rad): ~150°, đủ rộng để đọc mà không quấn ra sau
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1535, 0.1535, 0.26, 32, 1, true, -len / 2, len), new THREE.MeshStandardMaterial({map: tex, roughness: 0.8}));
  m.position.y = 0.19; // phủ phần thân thẳng của chai (y 0,06 → 0,32), rộng hơn dải nhãn trống để chữ đủ lớn khi nhìn từ xa
  sk.obj.add(m);
}

/** đặt một dụng cụ tĩnh vào cảnh và ẩn các hình khối nó thay thế; trả mô hình (null nếu thư viện không có) */
export function place(scene: THREE.Object3D, lib: THREE.Object3D, name: string, at: [number, number, number], plain: THREE.Object3D[] = []): Skin | null {
  const sk = partOf(lib, name);
  if (!sk) return null;
  glassify(sk.obj);
  sk.obj.position.set(...at);
  scene.add(sk.obj);
  plain.forEach((o) => (o.visible = false));
  return sk;
}

/** thay hình của một vật thay thế bằng mô hình thật: vật cũ vẫn giữ vị trí, phép quay và vai trò tương tác, chỉ không vẽ nữa */
export function dress(proxy: THREE.Mesh, skin: Skin | null): Skin | null {
  if (!skin) return null;
  (proxy.material as THREE.Material).visible = false;
  proxy.children.forEach((c) => (c.visible = false));
  proxy.add(skin.obj);
  return skin;
}
/** 10 thiết bị chính của các bài mô phỏng (`tools/lab-models/sims2_parts.py`): tải một lần rồi chạy `use` khi mô hình về; lỗi tải thì cảnh giữ hình khối. */
export const withSims2 = (use: (lib: THREE.Group) => void): void => void loadModel('/models/sims2-parts.glb').then(use).catch(() => undefined);
