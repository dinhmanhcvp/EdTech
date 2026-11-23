import {describe, expect, it} from 'vitest';
import {bakeOrgan, isLowGpu} from '../engines/families/surgLook';

describe('vân mô nướng sẵn', () => {
  const N = 64;
  const row = (d: Uint8Array, j: number, c: number) => Array.from({length: N}, (_, i) => d[(i + j * N) * 4 + c]);
  it('lát liền: mép đối diện gần như trùng nhau, không có đường nối khi lặp', () => {
    for (const kind of ['liver', 'fat', 'muscle', 'peritoneum'] as const) {
      const d = bakeOrgan(kind, N);
      const seam = row(d, 0, 3).reduce((a, v, i) => a + Math.abs(v - row(d, N - 1, 3)[i]), 0) / N;
      const inner = row(d, 20, 3).reduce((a, v, i) => a + Math.abs(v - row(d, 40, 3)[i]), 0) / N;
      expect(seam).toBeLessThan(inner + 12);
    }
  });
  it('nhận ra card tích hợp để hạ chất lượng, không hạ card rời', () => {
    expect(isLowGpu('ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11)')).toBe(true);
    expect(isLowGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11)')).toBe(false);
  });
  it('mỗi loại mô có vân riêng và có chi tiết', () => {
    const a = bakeOrgan('liver', N);
    const b = bakeOrgan('fat', N);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    expect(diff / a.length).toBeGreaterThan(5);
    expect(new Set(row(a, 10, 0)).size).toBeGreaterThan(8);
  });
});
