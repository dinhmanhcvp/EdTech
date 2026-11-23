import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {loadModel} from './labParts';
import type {Kit, SceneDef} from './Stage3D';

/**
 * Lớp hình ảnh dùng chung của các bài mổ: vật liệu mô sống tính trong shader (vi mạch, tiểu thùy, thớ cơ, màng ướt, tán xạ dưới bề mặt)
 * và hậu kỳ quang học (ống soi hoặc máy quay phòng mổ). Không cần UV nên dùng được cho lưới metaball và lưới mô biến dạng.
 */
export type OrganKind = 'liver' | 'gallbladder' | 'bowel' | 'fat' | 'muscle' | 'peritoneum' | 'skin' | 'heart' | 'vessel' | 'lung' | 'block';
interface OrganSpec {
  /** số chi tiết trên một đơn vị cảnh */
  s: number;
  vein: number;
  lobule: number;
  fat: number;
  fiber: number;
  bump: number;
  wet: number;
  sss: string;
}
const SPECS: Record<OrganKind, OrganSpec> = {
  liver: {s: 5, vein: 0.1, lobule: 0.34, fat: 0, fiber: 0, bump: 0.5, wet: 0.9, sss: '#7A1420'},
  gallbladder: {s: 5, vein: 0.55, lobule: 0, fat: 0.12, fiber: 0, bump: 0.35, wet: 1, sss: '#3F6B38'},
  bowel: {s: 5, vein: 0.62, lobule: 0.08, fat: 0.2, fiber: 0, bump: 0.5, wet: 1, sss: '#D2504A'},
  fat: {s: 7, vein: 0.3, lobule: 0.62, fat: 0.55, fiber: 0, bump: 1.25, wet: 0.82, sss: '#E89A48'},
  muscle: {s: 8, vein: 0.16, lobule: 0, fat: 0.1, fiber: 0.75, bump: 0.8, wet: 0.72, sss: '#B02028'},
  peritoneum: {s: 3.4, vein: 0.74, lobule: 0.05, fat: 0.26, fiber: 0.08, bump: 0.45, wet: 0.95, sss: '#C93C40'},
  skin: {s: 26, vein: 0.03, lobule: 0.05, fat: 0, fiber: 0, bump: 0.2, wet: 0.14, sss: '#D85C48'},
  heart: {s: 7, vein: 0.34, lobule: 0, fat: 0.26, fiber: 0.55, bump: 0.62, wet: 1, sss: '#B51E2A'},
  vessel: {s: 13, vein: 0.26, lobule: 0, fat: 0.04, fiber: 0.18, bump: 0.3, wet: 0.95, sss: '#B01826'},
  lung: {s: 10, vein: 0.2, lobule: 0.5, fat: 0, fiber: 0, bump: 0.7, wet: 0.72, sss: '#D06068'},
  block: {s: 8, vein: 0.2, lobule: 0, fat: 0, fiber: 0, bump: 0.6, wet: 0.85, sss: '#C4403C'},
};

// ------------------------------------------------------------------ nướng vân mô một lần (CPU) thành texture lát liền
const TILE = 12;
const fr = (x: number) => x - Math.floor(x);
const wrap = (i: number, per: number) => ((i % per) + per) % per;
function hash(x: number, y: number, seed: number) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(seed, 83492791)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, per: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const at = (a: number, b: number) => hash(wrap(ix + a, per), wrap(iy + b, per), seed);
  return (at(0, 0) * (1 - u) + at(1, 0) * u) * (1 - v) + (at(0, 1) * (1 - u) + at(1, 1) * u) * v;
}
/** nhiễu nhiều tầng, lặp đúng chu kỳ `per` ô */
const fbm = (x: number, y: number, per: number, seed: number) => 0.5 * noise(x, y, per, seed) + 0.27 * noise(x * 2, y * 2, per * 2, seed + 1) + 0.15 * noise(x * 4, y * 4, per * 4, seed + 2) + 0.08 * noise(x * 8, y * 8, per * 8, seed + 3);
/** khoảng cách tới hai tâm ô gần nhất: ranh giữa hai ô là mạch nhỏ / vách tiểu thùy */
function worley(x: number, y: number, per: number, seed: number): [number, number] {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let a = 9;
  let b = 9;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = wrap(ix + dx, per);
      const cy = wrap(iy + dy, per);
      const d = Math.hypot(ix + dx + hash(cx, cy, seed) - x, iy + dy + hash(cx, cy, seed + 9) - y);
      if (d < a) {
        b = a;
        a = d;
      } else if (d < b) b = d;
    }
  return [a, b];
}
const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** RGBA: rgb = hệ số nhân màu / 2 (vi mạch, tiểu thùy, thớ, mỡ), a = độ cao. Lặp liền ở cả hai chiều */
export function bakeOrgan(kind: Exclude<OrganKind, 'block'>, size = 384): Uint8Array {
  const {vein, lobule, fat, fiber} = SPECS[kind];
  const out = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = (i / size) * TILE;
      const y = (j / size) * TILE;
      // uốn toạ độ để mạch ngoằn ngoèo; độ lệch cũng tuần hoàn nên vẫn lát liền
      const wx = x + 0.75 * (fbm(x * 0.75, y * 0.75, 9, 11) - 0.5);
      const wy = y + 0.75 * (fbm(x * 0.75, y * 0.75, 9, 23) - 0.5);
      const mott = fbm(x * 0.5, y * 0.5, 6, 3);
      const [b1, b2] = worley(wx * 0.5, wy * 0.5, 6, 31);
      const [s1, s2] = worley(wx * 1.75, wy * 1.75, 21, 47);
      const big = 1 - sstep(0, 0.026, b2 - b1);
      const small = 1 - sstep(0, 0.038, s2 - s1);
      const gate = sstep(0.38, 0.62, fbm(x * 0.25, y * 0.25, 3, 61));
      const v = vein * Math.min(1, big * gate * 0.85 + 0.42 * small * gate * gate);
      const [l1, l2] = lobule > 0 ? worley(x * 2.5, y * 2.5, 30, 71) : [1, 2];
      const wall = 1 - sstep(0, 0.09, l2 - l1);
      const cell = 1 - sstep(0, 0.75, l1);
      const fatN = fat > 0 ? sstep(0.56 - 0.22 * fat, 0.72, fbm(x * 0.75, y * 0.75, 9, 83)) : 0;
      // thớ dọc: số sóng nguyên trên một tile
      const fb = 0.5 + 0.5 * Math.sin((y / TILE) * 2 * Math.PI * 22 + 5 * Math.sin((x / TILE) * 2 * Math.PI * 2) + 3 * (fbm(x * 0.5, y * 0.5, 6, 91) - 0.5));
      const fib = 1 + fiber * (fb - 1);
      let r = 0.8 + 0.42 * mott;
      let g = r;
      let c = r;
      r *= 1 + lobule * wall * (0.74 - 1);
      g *= 1 + lobule * wall * (0.62 - 1);
      c *= 1 + lobule * wall * (0.6 - 1);
      const lit = 1 + 0.12 * lobule * cell;
      const fm = 0.82 + (1.08 - 0.82) * fib;
      r *= lit * fm;
      g *= lit * (0.76 + (1.08 - 0.76) * fib);
      c *= lit * (0.76 + (1.08 - 0.76) * fib);
      const fk = fatN * Math.min(1, fat * 1.9);
      r += fk * (r * 0.65 + 0.1);
      g += fk * (g * 0.42 + 0.07);
      c += fk * (c * -0.14);
      const vk = v * 0.86;
      r += (0.34 - r) * vk;
      g += (0.035 - g) * vk;
      c += (0.06 - c) * vk;
      const h = 0.34 * mott + 0.24 * noise(x * 9, y * 9, 108, 101) + 0.1 * noise(x * 23, y * 23, 276, 103) + 0.34 * lobule * (cell - wall) + 0.2 * fiber * fb + 0.22 * v + 0.16 * fatN;
      const q = (i + j * size) * 4;
      out[q] = Math.min(255, r * 127.5);
      out[q + 1] = Math.min(255, g * 127.5);
      out[q + 2] = Math.min(255, c * 127.5);
      out[q + 3] = Math.min(255, Math.max(0, h) * 255);
    }
  return out;
}
/** card tích hợp (màn hình lớp học, laptop): mỗi điểm mô chỉ lấy một hướng chiếu và vẽ ở độ phân giải thấp hơn */
let lowGpu = false;
export const isLowGpu = (name: string) => /intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe|microsoft basic/i.test(name);
const baked = new Map<string, THREE.DataTexture>();
function organTexture(kind: Exclude<OrganKind, 'block'>): THREE.DataTexture {
  let t = baked.get(kind);
  if (!t) {
    t = new THREE.DataTexture(bakeOrgan(kind), 384, 384, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    t.needsUpdate = true;
    baked.set(kind, t);
  }
  return t;
}

const GLSL = /* glsl */ `
varying vec3 vOrg;
varying vec3 vOrgN;
varying float vOrgKind;
uniform sampler2D oT0;
uniform sampler2D oT1;
uniform sampler2D oT2;
uniform vec3 oB; // bump, wet, scale
uniform vec3 oS;
uniform vec3 oSss;
#ifdef ORG_LOW
vec4 oTri(sampler2D t, vec3 p, vec3 w) { return w.y >= w.x && w.y >= w.z ? texture2D(t, p.xz) : w.x >= w.z ? texture2D(t, p.zy) : texture2D(t, p.xy); }
#else
vec4 oTri(sampler2D t, vec3 p, vec3 w) { return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }
#endif
vec3 oPerturb(vec3 sp, vec3 n, vec2 d, float face) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1) * face;
  return normalize(abs(det) * n - sign(det) * (d.x * r1 + d.y * r2));
}
`;

/**
 * Gắn mô sống cho một vật liệu (vân nướng sẵn, chiếu ba hướng nên không cần UV). `rest`: lấy toạ độ từ `aRest` để vân dính theo mô khi biến dạng;
 * loại `block` đọc thêm `aKind` (0 cơ, 1 mỡ, 2 da) nên một lưới có đủ ba lớp.
 */
export function organify(m: THREE.Material, kind: OrganKind, rest = false, gain = 1): void {
  const mat = m as THREE.MeshPhysicalMaterial;
  if (!mat.isMeshStandardMaterial || mat.userData.organ) return;
  mat.userData.organ = kind;
  mat.userData.tissue = true;
  const sp = SPECS[kind];
  const block = kind === 'block';
  const tex = block ? [organTexture('muscle'), organTexture('fat'), organTexture('skin')] : [organTexture(kind), organTexture(kind), organTexture(kind)];
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, {
      oT0: {value: tex[0]},
      oT1: {value: tex[1]},
      oT2: {value: tex[2]},
      oB: {value: new THREE.Vector3(sp.bump * gain, sp.wet, sp.s)},
      oS: {value: new THREE.Vector3(SPECS.muscle.s, SPECS.fat.s, SPECS.skin.s)},
      oSss: {value: new THREE.Color(sp.sss)},
    });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vOrg;\nvarying vec3 vOrgN;\nvarying float vOrgKind;${rest ? '\nattribute vec3 aRest;' : ''}${block ? '\nattribute float aKind;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvOrg = ${rest ? 'aRest' : 'position'};\nvOrgN = objectNormal;\nvOrgKind = ${block ? 'aKind' : '0.0'};`);
    const sample = block
      ? `vec4 org = vOrgKind < .5 ? oTri(oT0, vOrg * oS.x / ${TILE}., oW) : vOrgKind < 1.5 ? oTri(oT1, vOrg * oS.y / ${TILE}., oW) : oTri(oT2, vOrg * oS.z / ${TILE}., oW);\nfloat oWet = vOrgKind > 1.5 ? .2 : .92;`
      : `vec4 org = oTri(oT0, vOrg * oB.z / ${TILE}., oW);\nfloat oWet = oB.y;`;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${lowGpu ? '#define ORG_LOW\n' : ''}${GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\nvec3 oW = pow(abs(normalize(vOrgN)), vec3(4.)); oW /= oW.x + oW.y + oW.z;\n${sample}\ndiffuseColor.rgb *= org.rgb * 2.;`)
      // màng dịch: mảng rất bóng xen mảng mờ hơn, lấy từ tầng thấp của độ cao
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat oFilm = smoothstep(.3, .62, org.a);\nroughnessFactor = clamp(min(roughnessFactor + .12, mix(.62, mix(.15, .36, oFilm), oWet) + .05), .06, 1.);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = oPerturb(-vViewPosition, normal, vec2(dFdx(org.a), dFdy(org.a)) * oB.x * .03, faceDirection);')
      // ánh sáng xuyên qua lớp mô mỏng: viền và vùng khuất ửng màu máu thay vì đen
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float nv = saturate(dot(normal, normalize(vViewPosition))); totalEmissiveRadiance += oSss * diffuseColor.rgb * (.05 + .24 * pow(1. - nv, 2.4)); }');
  };
  mat.customProgramCacheKey = () => `organ:${kind}:${rest}:${gain}:${lowGpu}`;
  mat.needsUpdate = true;
}

const NAME_KIND: [RegExp, OrganKind][] = [
  [/liver|^gan/i, 'liver'],
  [/gall|bile/i, 'gallbladder'],
  [/bowel|intest|colon|gut|stomach/i, 'bowel'],
  [/fat|omentum/i, 'fat'],
  [/^myo|heart|ventric|atri/i, 'heart'],
  [/lung|lg/i, 'lung'],
  [/skin|body|dermis/i, 'skin'],
  [/^cor$|^cv$|ves|artery|vein|aorta/i, 'vessel'],
  [/bowl|cavity|perit|wall/i, 'peritoneum'],
  [/musc|flap/i, 'muscle'],
];
const SKIP = /^(section|sect|lumen|locule|rcav|lcav|cloth|drape|steel|edge|gold|sternum|bone|valve|or_)/i;
/** gắn mô theo tên vật liệu; tên không nhận ra thì dùng `fallback`. Bỏ qua kính, kim loại, vải và mặt cắt */
export function organAll(o: THREE.Object3D, fallback: OrganKind = 'peritoneum', gain = 1): void {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.stencil) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.transparent || (sm.metalness ?? 0) > 0.5 || SKIP.test(sm.name)) continue;
      organify(sm, NAME_KIND.find(([r]) => r.test(sm.name))?.[1] ?? fallback, false, gain);
    }
  });
}

/** vải mổ không dệt: sợi đan mịn và nếp loang (dùng làm `map` + `bumpMap`) */
export function clothTexture(color: string, repeat = 8): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2)
    for (let x = 0; x < 256; x += 2) {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      g.fillStyle = `rgba(${(x + y) % 4 ? '255,255,255' : '0,0,0'},${0.035 + 0.05 * (n - Math.floor(n))})`;
      g.fillRect(x, y, 2, 2);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** phòng mổ đặt quanh một trường mổ nhỏ hơn: `scale` so với hệ của `or-room.glb` */
export function addOrRoom(k: Kit, scale: number, y: number): void {
  k.scene.background = new THREE.Color('#B9CCC6');
  k.scene.fog = null;
  k.camera.far = 220;
  k.camera.updateProjectionMatrix();
  void loadModel('/models/or-room.glb')
    .then((room) => {
      const g = room.clone(true);
      g.scale.setScalar(scale);
      g.position.y = y;
      g.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) m.receiveShadow = true;
      });
      k.scene.add(g);
    })
    .catch(() => {});
}

const LENS = {
  uniforms: {tDiffuse: {value: null as THREE.Texture | null}, uScope: {value: 1}, uAspect: {value: 1.6}, uTime: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uScope; uniform float uAspect; uniform float uTime; varying vec2 vUv;
    float grain(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec2 c = vUv - .5; vec2 q = vec2(c.x * uAspect, c.y); float r = length(q);
      // méo thùng và lệch màu nhẹ ở rìa thấu kính
      vec2 uv = .5 + c * (1. + uScope * .055 * r * r);
      float ca = uScope * .0035 * r;
      vec3 col = vec3(texture2D(tDiffuse, uv + c * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ca).b);
      col = mix(col, col * col * (3. - 2. * col), .22);
      col *= mix(vec3(1.), vec3(1.04, .985, .95), uScope);
      float R = .5 * max(1., uAspect);
      float v = smoothstep(R * 1.2, R * (uScope > .5 ? .58 : .7), r);
      col *= mix(.38, 1., v);
      col += (grain(vUv * 913.) - .5) * .016;
      gl_FragColor = vec4(col, 1.);
    }`,
};

/** hậu kỳ quang học: lóa ở điểm phản chiếu ướt; `scope` thêm méo thấu kính và rìa tối của ống soi */
export function surgPost(mode: 'scope' | 'open'): NonNullable<SceneDef['post']> {
  return (renderer, scene, camera) => {
    const size = renderer.getSize(new THREE.Vector2());
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    lowGpu = isLowGpu(info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '');
    const scale = lowGpu ? 0.72 : 1;
    // đèn mổ rất mạnh: hạ phơi sáng để mô giữ màu, không cháy trắng
    if (mode === 'open') {
      renderer.toneMappingExposure = 0.58;
      scene.environmentIntensity = 0.45;
    }
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {type: THREE.HalfFloatType, samples: lowGpu ? 0 : 4, stencilBuffer: true, depthBuffer: true});
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(size.clone().multiplyScalar(0.5), mode === 'scope' ? 0.3 : 0.16, 0.42, 0.94);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const lens = new ShaderPass(LENS);
    lens.uniforms.uScope.value = mode === 'scope' ? 1 : 0;
    composer.addPass(lens);
    return {
      render: () => {
        lens.uniforms.uTime.value = performance.now() / 1000;
        composer.render();
      },
      setSize: (w, h) => {
        const pr = renderer.getPixelRatio() * scale;
        composer.setPixelRatio(pr);
        composer.setSize(w, h);
        // lóa sáng là vùng mờ nên vẽ ở nửa độ phân giải cũng không khác
        bloom.setSize(Math.max(2, Math.round(w * pr * 0.5)), Math.max(2, Math.round(h * pr * 0.5)));
        lens.uniforms.uAspect.value = w / Math.max(1, h);
      },
      dispose: () => {
        bloom.dispose();
        lens.dispose();
        composer.dispose();
        rt.dispose();
      },
    };
  };
}
