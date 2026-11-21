import * as THREE from 'three';

/**
 * Vi bề mặt của mô sống, tính trong shader theo toạ độ của chính lưới (không cần texture, không cần UV — lưới metaball của Blender không có UV):
 * gồ ghề nhỏ (bump từ nhiễu 3D nhiều tầng), độ nhám loang lổ. Lớp phủ bóng (clearcoat) vẫn dùng pháp tuyến trơn nên mô trông như phủ một màng ướt.
 * `scale` = số gợn trên một đơn vị cảnh, `bump` = độ sâu gợn, `rough` = biên độ loang của độ nhám (0 = đều).
 */
const NOISE = /* glsl */ `
varying vec3 vTisPos;
uniform float tScale;
uniform float tBump;
uniform float tRough;
float tisHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float tisNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tisHash(i), tisHash(i + vec3(1, 0, 0)), f.x), mix(tisHash(i + vec3(0, 1, 0)), tisHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(tisHash(i + vec3(0, 0, 1)), tisHash(i + vec3(1, 0, 1)), f.x), mix(tisHash(i + vec3(0, 1, 1)), tisHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float tisFbm(vec3 p) { return 0.5 * tisNoise(p) + 0.25 * tisNoise(p * 2.03) + 0.125 * tisNoise(p * 4.01) + 0.0625 * tisNoise(p * 8.02); }
vec3 tisPerturb(vec3 surfPos, vec3 n, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos); vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, n); vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * n - grad);
}
`;

export function wetTissue(m: THREE.Material, scale = 20, bump = 0.012, rough = 0.5): void {
  const mat = m as THREE.MeshStandardMaterial;
  if (!mat.isMeshStandardMaterial || mat.userData.tissue) return;
  mat.userData.tissue = true;
  mat.onBeforeCompile = (s) => {
    s.uniforms.tScale = {value: scale};
    s.uniforms.tBump = {value: bump};
    s.uniforms.tRough = {value: rough};
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTisPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTisPos = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (1.0 + tRough * (tisFbm(vTisPos * tScale * 0.35) - 0.45)), 0.04, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ float h = tisFbm(vTisPos * tScale); normal = tisPerturb(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)) * tBump * 60.0, faceDirection); }');
  };
  mat.customProgramCacheKey = () => `tissue:${scale}:${bump}:${rough}`;
  mat.needsUpdate = true;
}

/** gắn vi bề mặt cho mọi lưới trong một vật (bỏ qua thủy tinh và kim loại: dụng cụ, khay) */
export function wetAll(o: THREE.Object3D, scale = 20, bump = 0.012, rough = 0.5): void {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const sm = m as THREE.MeshStandardMaterial;
      // mặt cắt (section, muscle, cavity, chamber) phải phẳng và mịn: chỉ da, nội quan và mạch mới có vi bề mặt
      if (sm.transparent || (sm.metalness ?? 0) > 0.5 || /^(section|sect|muscle|cavity|chamber|lumen|locule|rcav|lcav)/.test(sm.name)) continue;
      wetTissue(sm, scale, bump, rough);
    }
  });
}
