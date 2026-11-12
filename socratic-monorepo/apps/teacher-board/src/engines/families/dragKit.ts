import * as THREE from 'three';

/** Tay nắm: chấm cam phát sáng báo "kéo được" (vẽ xuyên vật khác, to đủ cho đầu bút trên bảng tương tác). */
export function grip(color = '#FF8A4C', r = 0.24): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.6, depthTest: false}));
  m.renderOrder = 20;
  m.add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.45, r * 0.12, 8, 28), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.85, depthTest: false})));
  (m.children[0] as THREE.Mesh).renderOrder = 20;
  return m;
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
