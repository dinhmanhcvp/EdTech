import * as THREE from 'three';
import {acceleratedRaycast, computeBoundsTree, disposeBoundsTree} from 'three-mesh-bvh';

/**
 * Raycast nhanh cho lưới tĩnh dựng bằng Blender (cơ quan, bộ dụng cụ, phòng mổ): mỗi lần trỏ / chạm, cảnh bắn tia vào các lưới hàng chục nghìn tam giác;
 * three.js thử từng tam giác (bài mổ người ~13 ms mỗi khung). Cây bao (BVH) của `three-mesh-bvh` chỉ thử vài chục tam giác.
 * - Chỉ lưới được đánh dấu `geometry.userData.bvh = true` (do `loadModel` đánh dấu) mới dựng cây, dựng LƯỜI ở lần bắn tia đầu tiên.
 * - Lưới bị biến dạng (mô mềm sao chép từ lưới GLB, đỉnh đổi mỗi khung) tự bỏ cây và quay về cách thử từng tam giác: không bao giờ trả kết quả cũ.
 */
type G = THREE.BufferGeometry & {boundsTree?: unknown; computeBoundsTree?: typeof computeBoundsTree; disposeBoundsTree?: typeof disposeBoundsTree};
const proto = THREE.BufferGeometry.prototype as G;
if (!proto.computeBoundsTree) {
  proto.computeBoundsTree = computeBoundsTree;
  proto.disposeBoundsTree = disposeBoundsTree;
  const plain = THREE.Mesh.prototype.raycast;
  THREE.Mesh.prototype.raycast = function (this: THREE.Mesh, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
    const g = this.geometry as G;
    const pos = g.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos || !g.userData.bvh || (this as THREE.SkinnedMesh).isSkinnedMesh || g.morphAttributes.position) return plain.call(this, ray, hits);
    if (g.boundsTree && g.userData.bvhVer !== pos.version) {
      // đỉnh vừa bị sửa sau khi dựng cây: lưới này là lưới động, thôi dùng cây
      g.disposeBoundsTree!();
      g.userData.bvh = false;
      return plain.call(this, ray, hits);
    }
    if (!g.boundsTree) {
      g.computeBoundsTree!();
      g.userData.bvhVer = pos.version;
    }
    return acceleratedRaycast.call(this, ray, hits);
  };
}

/** đánh dấu mọi lưới đủ lớn trong `root` được dùng cây bao khi bắn tia (lưới nhỏ thử từng tam giác vẫn nhanh hơn dựng cây) */
export function markBVH(root: THREE.Object3D, minTris = 300): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    const n = g.index ? g.index.count / 3 : (g.getAttribute('position')?.count ?? 0) / 3;
    if (n >= minTris) g.userData.bvh = true;
  });
}
