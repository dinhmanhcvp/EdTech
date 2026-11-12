import {describe, it, expect} from 'vitest';
import {declination, dayLengthH, noonElevation, dateOfDay, seasonNorth, emWave, freqFromLambda, cradleAngles, cradleSpeed, LY_SCENE3_PRESETS} from '../utils/presets/lyScene3';
import {project} from '../utils/presets/scene3d';

describe('Trái Đất nghiêng: công thức', () => {
  it('xích vĩ theo mùa: hạ chí +23,5°, đông chí −23,5°, phân ngày ≈ 0', () => {
    expect(declination(23.5, 172)).toBeCloseTo(23.5, 1);
    expect(declination(23.5, 355)).toBeCloseTo(-23.5, 0);
    expect(Math.abs(declination(23.5, 80))).toBeLessThan(0.7);
    expect(Math.abs(declination(23.5, 264))).toBeLessThan(0.7);
  });
  it('độ dài ngày: xích đạo luôn 12 giờ, Hà Nội dài về mùa hè, địa cực có ngày/đêm 24 giờ', () => {
    expect(dayLengthH(0, 23.5)).toBeCloseTo(12, 5);
    expect(dayLengthH(21, 23.5)).toBeGreaterThan(13);
    expect(dayLengthH(21, -23.5)).toBeLessThan(11);
    expect(dayLengthH(80, 23.5)).toBe(24);
    expect(dayLengthH(80, -23.5)).toBe(0);
  });
  it('không nghiêng (0°) thì không có mùa: ngày 12 giờ ở mọi vĩ độ, mọi ngày', () => {
    for (const lat of [-60, 0, 21, 60]) for (const d of [1, 100, 172, 300]) expect(dayLengthH(lat, declination(0, d))).toBeCloseTo(12, 5);
  });
  it('góc cao giữa trưa, ngày/mùa', () => {
    expect(noonElevation(23.5, 23.5)).toBe(90); // Mặt Trời ở thiên đỉnh trên chí tuyến Bắc vào hạ chí
    expect(dateOfDay(172)).toBe('21/6');
    expect(seasonNorth(172)).toBe('Hè');
    expect(seasonNorth(355)).toBe('Đông');
  });
});

describe('Sóng điện từ', () => {
  it('f = c/λ; B = E/c; E và B cùng pha', () => {
    expect(freqFromLambda(3)).toBeCloseTo(1e8, 0);
    const w = emWave(60, 2, 0.4, 0.3);
    expect(w.B * 3e8).toBeCloseTo(w.E, 9);
    expect(Math.sign(w.E)).toBe(Math.sign(w.B));
  });
  it('giảm bước sóng thì sóng dày hơn: sau một khoảng x, pha lớn hơn', () => {
    expect(emWave(1, 1, 0.3, 0).k).toBeGreaterThan(emWave(1, 2, 0.3, 0).k);
  });
});

describe('Con lắc Newton', () => {
  it('n quả trái bật lên thì n quả phải bật ra, các quả giữa đứng yên', () => {
    const T = 2;
    const a0 = cradleAngles(2, 40, T, 0);
    expect(a0.slice(0, 2).every((v) => v < -39)).toBe(true);
    expect(a0[2]).toBe(0);
    const a1 = cradleAngles(2, 40, T, T / 2); // giữa chu kì: hai quả bên phải ở biên
    expect(a1.slice(3).every((v) => v > 39)).toBe(true);
    expect(a1.slice(0, 3).every((v) => v === 0)).toBe(true);
  });
  it('không hao hụt: biên độ giữ nguyên; có hao hụt: giảm theo từng nửa chu kì', () => {
    const T = 2;
    expect(Math.max(...cradleAngles(1, 40, T, 10 * T + T / 2).map(Math.abs))).toBeGreaterThan(39.9);
    expect(Math.max(...cradleAngles(1, 40, T, 4 * T + T / 2, 0.2).map(Math.abs))).toBeLessThan(40 * 0.8 ** 8 + 0.1);
  });
  it('v = √(2gL(1 − cosθ))', () => expect(cradleSpeed(0.4, 40)).toBeCloseTo(Math.sqrt(2 * 9.8 * 0.4 * (1 - Math.cos((40 * Math.PI) / 180))), 8));
});

describe('bộ chiếu 3D và dữ liệu preset', () => {
  it('quay 360° về chỗ cũ; vật gần người xem có độ sâu lớn hơn', () => {
    const c = {az: 0, el: 20, cx: 100, cy: 100, s: 50};
    const a = project([1, 0.5, 0.3], c);
    const b = project([1, 0.5, 0.3], {...c, az: 360});
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
    expect(project([0, 0, 1], c).z).toBeGreaterThan(project([0, 0, -1], c).z);
  });
  it('mỗi hình vẽ ra các nét hữu hạn (không NaN) ở mọi tham số kéo thử', () => {
    for (const [id, spec] of Object.entries(LY_SCENE3_PRESETS)) {
      if (spec.family !== 'SCENE_LAB') throw new Error('sai họ');
      const d = spec.data;
      const base = Object.fromEntries([...(d.sliders ?? []).map((q) => [q.key, q.value]), ...(d.toggles ?? []).map((q) => [q.key, q.value ? 1 : 0])]);
      for (const pick of ['value', 'min', 'max'] as const) {
        const p: Record<string, number> = {...base};
        for (const q of d.sliders ?? []) p[q.key] = pick === 'value' ? q.value : q[pick];
        for (const t of [0, 1.3, 5.9]) {
          const shapes = d.draw(p, t, {});
          expect(shapes.length, `${id} ${pick}`).toBeGreaterThan(5);
          const nums = JSON.stringify(shapes);
          expect(nums, `${id} ${pick} t=${t}`).not.toMatch(/NaN|Infinity|null/);
        }
      }
      for (const r of d.readouts ?? []) expect(r.value(base, 0, {})).not.toMatch(/NaN|undefined/);
    }
  });
});
