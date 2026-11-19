import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {SPECS, type AssemblyKind} from '../utils/lab/hands/assembly';
import {BUILD} from '../engines/families/HandsAssembly3D';

/** Hộp bao (mặt bàn xz) của một chi tiết khi đặt trên khay. */
function trayBox(obj: THREE.Object3D, at: THREE.Vector3, scale: number): THREE.Box3 {
  obj.position.copy(at);
  obj.scale.setScalar(scale);
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

describe('bài lắp ráp: chi tiết trên khay đủ rộng để cầm, không chồng nhau, không rơi vào vùng hộp dụng cụ', () => {
  for (const kind of Object.keys(SPECS) as AssemblyKind[]) {
    it(kind, () => {
      const model = BUILD[kind](new THREE.Scene());
      const ids = SPECS[kind].parts.map((p) => p.id);
      expect(Object.keys(model.parts).sort()).toEqual([...ids].sort());
      const boxes = ids.map((id) => ({id, box: trayBox(model.parts[id].obj, model.parts[id].tray, model.parts[id].scale ?? 1)}));
      for (const {id, box} of boxes) {
        expect(box.isEmpty(), `${id} rỗng`).toBe(false);
        // đáy chi tiết nằm trên mặt khay, không chìm xuống, không lơ lửng quá 0,1
        expect(box.min.y, `${id} chìm dưới khay`).toBeGreaterThan(-0.05);
        expect(box.min.y, `${id} lơ lửng trên khay`).toBeLessThan(0.1);
        // đỉnh các dụng cụ dựng đứng ở hộp dụng cụ (z = 2,55) nhìn từ trên rơi vào vùng z ≈ 1,5 trở lên: tâm chi tiết ở khay không được ở đó
        // (chi tiết dài như trục khuỷu vẫn vươn tới, nhưng chọn chi tiết gần con trỏ hơn dụng cụ nên cầm được; xem `partAt`)
        expect(box.getCenter(new THREE.Vector3()).z, `${id} lấn vào vùng dụng cụ`).toBeLessThan(1.7);
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].box;
          const b = boxes[j].box;
          const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
          const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
          // hộp bao chồng sâu hơn 0,4 ở cả hai trục = hai chi tiết đè lên nhau trên khay (cặp động cơ / cánh xếp chéo nên hộp bao chạm nhau nhưng lưới thì không)
          expect(ox > 0.4 && oz > 0.4, `${boxes[i].id} chồng ${boxes[j].id} trên khay (${ox.toFixed(2)} × ${oz.toFixed(2)})`).toBe(false);
        }
    });
  }

  it('drone: vị trí lắp (home) cùng trục dọc, chồng từ dưới lên đúng thứ tự khung → ESC → mạch bay → bộ thu; cánh trên động cơ', () => {
    const m = BUILD.drone(new THREE.Scene()).parts;
    const y = (id: string) => m[id].home.y;
    for (const id of Object.keys(m)) {
      expect(m[id].home.x).toBeCloseTo(m.frame.home.x);
      expect(m[id].home.z).toBeCloseTo(m.frame.home.z);
    }
    expect(y('battery')).toBeLessThan(y('frame'));
    expect(y('frame')).toBeLessThan(y('esc'));
    expect(y('esc')).toBeLessThan(y('fc'));
    expect(y('fc')).toBeLessThan(y('rx'));
    expect(y('motors_a')).toBeLessThan(y('props_a'));
    expect(y('motors_b')).toBeLessThan(y('props_b'));
  });
});
