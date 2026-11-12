import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Thư viện bộ phận dựng bằng Blender (`tools/lab-models/*.py` → `public/models/*.glb`), tải một lần cho mỗi tệp.
 * Cảnh dựng trước các vật thay thế bằng hình khối (để tương tác chạy ngay), khi thư viện về thì "mặc" mô hình thật lên.
 */
const cache = new Map<string, Promise<THREE.Group>>();
export function loadModel(url: string): Promise<THREE.Group> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((resolve, reject) => new GLTFLoader().load(url, (g) => resolve(g.scene), undefined, reject));
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
