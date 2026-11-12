import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {MISHAPS, type MishapKind} from '../utils/lab/hands/mishap';
import {mishapFx} from '../engines/families/mishapFx';

/** Bộ dụng cụ giả chỉ có `scene`: hiệu ứng không cần WebGL để tính toán, nên kiểm được hạt, ánh sáng và vũng loang. */
const kit = () => ({scene: new THREE.Scene()}) as unknown as Parameters<typeof mishapFx>[0];
const lit = (scene: THREE.Scene) => {
  let n = 0;
  scene.traverse((o) => {
    const p = o as THREE.Points;
    if (!p.isPoints || !p.visible) return;
    const c = p.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < c.length; i += 3) if (c[i] + c[i + 1] + c[i + 2] > 0.02) n++;
  });
  return n;
};
const flash = (scene: THREE.Scene) => scene.children.find((o) => (o as THREE.PointLight).isPointLight) as THREE.PointLight;

describe('hiệu ứng 3D của sự cố', () => {
  it('mọi loại sự cố trong danh mục tạo ra hiệu ứng nhìn thấy được và tự tắt khi hết thời gian', () => {
    const kinds = new Set<MishapKind>(Object.values(MISHAPS).map((m) => m.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(6); // chập, cháy, nổ, acid, bỏng, giật, gãy, cháy cách điện: danh mục dùng nhiều loại
    for (const kind of ['short', 'fire', 'explosion', 'acid', 'scald', 'shock', 'break', 'burn'] as MishapKind[]) {
      const k = kit();
      const fx = mishapFx(k);
      expect(lit(k.scene), `${kind} trước`).toBe(0);
      fx.go(kind, new THREE.Vector3(0, 0.5, 0));
      for (let i = 0; i < 6; i++) fx.update(1 / 30);
      const shown = lit(k.scene) > 0 || scenePuddles(k.scene) > 0 || flash(k.scene).intensity > 1;
      expect(shown, `${kind} có hiệu ứng`).toBe(true);
      for (let i = 0; i < 30 * 12; i++) fx.update(1 / 30); // 12 giây sau: hết sự cố
      expect(lit(k.scene), `${kind} sau 12 s`).toBe(0);
      expect(flash(k.scene).intensity, `${kind} đèn loé tắt`).toBe(0);
    }
  });

  it('nổ có sóng xung kích và loé sáng mạnh hơn chập điện; acid để lại vũng loang to dần', () => {
    const boom = kit();
    const f1 = mishapFx(boom);
    f1.go('explosion', new THREE.Vector3(0, 0.5, 0));
    expect(flash(boom.scene).intensity).toBeGreaterThan(50);
    f1.update(0.2);
    const ring = boom.scene.children.find((o) => (o as THREE.Mesh).geometry instanceof THREE.RingGeometry) as THREE.Mesh;
    expect((ring.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.3);
    const zap = kit();
    mishapFx(zap).go('short', new THREE.Vector3());
    expect(flash(zap.scene).intensity).toBeLessThan(flash(boom.scene).intensity + 100);

    const spill = kit();
    const f2 = mishapFx(spill);
    f2.go('acid', new THREE.Vector3(1, 0, 1));
    const pud = () => spill.scene.children.find((o) => (o as THREE.Mesh).geometry instanceof THREE.CircleGeometry) as THREE.Mesh;
    f2.update(0.1);
    const r1 = pud().scale.x;
    for (let i = 0; i < 30; i++) f2.update(0.1);
    expect(pud().scale.x).toBeGreaterThan(r1);
    expect(pud().scale.x).toBeLessThanOrEqual(1.1); // loang tới bán kính tối đa rồi dừng
  });
});

function scenePuddles(scene: THREE.Scene): number {
  return scene.children.filter((o) => (o as THREE.Mesh).geometry instanceof THREE.CircleGeometry).length;
}
