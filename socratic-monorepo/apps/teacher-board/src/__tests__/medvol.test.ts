import {describe, expect, it} from 'vitest';
import {PHANTOM_TUMOR, chestPhantom, dicomVolume, distMm, exportJSON, idx, parseDicom, parseNifti, regionGrow, sliceRGBA, sliceShape, toPixel, toVoxel, type Volume} from '../utils/lab/hands/medvol';

const ph = chestPhantom();

describe('phantom và lát cắt', () => {
  it('đúng kích thước, đơn vị HU hợp lí', () => {
    expect(ph.dims).toEqual([128, 128, 96]);
    expect(ph.data[idx(ph, 0, 0, 0)]).toBeLessThan(-900); // không khí
    expect(ph.data[idx(ph, ...PHANTOM_TUMOR.center)]).toBeGreaterThan(0); // khối u đặc
    expect(ph.data[idx(ph, 37, 50, 52)]).toBeLessThan(-700); // nhu mô phổi
  });
  it('điểm ảnh ↔ voxel qua lại đúng ở cả ba mặt phẳng', () => {
    for (const ax of ['axial', 'coronal', 'sagittal'] as const) {
      const p = toPixel(ph, ax, [10, 20, 30]);
      expect(toVoxel(ph, ax, p.s, p.c, p.r)).toEqual([10, 20, 30]);
      const {w, h} = sliceShape(ph, ax);
      expect(sliceRGBA(ph, ax, 5, {w: 400, l: 40}).length).toBe(w * h * 4);
    }
  });
});

describe('đo và phân vùng', () => {
  it('khoảng cách tính theo kích thước voxel (mm)', () => {
    expect(distMm(ph, [0, 0, 0], [4, 0, 0])).toBeCloseTo(10);
    expect(distMm(ph, [0, 0, 0], [0, 0, 10])).toBeCloseTo(30);
  });
  it('loang từ tâm khối u ra đúng thể tích quả cầu ~13 mm (±35 %), không tràn ra phổi', () => {
    const s = regionGrow(ph, PHANTOM_TUMOR.center, 120);
    const ball = ((4 / 3) * Math.PI * PHANTOM_TUMOR.radiusMm ** 3) / 1000;
    expect(s.capped).toBe(false);
    expect(s.cm3).toBeGreaterThan(ball * 0.65);
    expect(s.cm3).toBeLessThan(ball * 1.35);
    expect(Math.max(...s.extent)).toBeLessThan(40);
    const j = exportJSON(ph, [{a: [0, 0, 0], b: [4, 0, 0], mm: 10}], s);
    expect(j.segment?.volume_cm3).toBeCloseTo(s.cm3, 1);
    expect(j.volume.phantom).toBe(true);
  });
  it('khoảng giá trị quá rộng thì chạm giới hạn và báo tràn', () => {
    const s = regionGrow(ph, PHANTOM_TUMOR.center, 2000, 5000);
    expect(s.capped).toBe(true);
  });
});

/** NIfTI-1 nhỏ 3×2×2 int16, slope 2, inter −10 */
function nifti(): ArrayBuffer {
  const buf = new ArrayBuffer(352 + 12 * 2);
  const dv = new DataView(buf);
  dv.setInt32(0, 348, true);
  [3, 3, 2, 2, 1, 1, 1, 1].forEach((d, n) => dv.setInt16(40 + n * 2, d, true));
  dv.setInt16(70, 4, true);
  dv.setInt16(72, 16, true);
  [1, 0.8, 0.8, 2.5].forEach((d, n) => dv.setFloat32(76 + n * 4, d, true));
  dv.setFloat32(108, 352, true);
  dv.setFloat32(112, 2, true);
  dv.setFloat32(116, -10, true);
  for (let q = 0; q < 12; q++) dv.setInt16(352 + q * 2, q, true);
  return buf;
}

describe('đọc tệp', () => {
  it('NIfTI thường và nén gzip', async () => {
    const v = await parseNifti(nifti());
    expect(v.dims).toEqual([3, 2, 2]);
    expect(v.spacing).toEqual([expect.closeTo(0.8, 5), expect.closeTo(0.8, 5), 2.5]);
    expect(Array.from(v.data.slice(0, 3))).toEqual([-10, -8, -6]);
    if (typeof CompressionStream !== 'undefined') {
      const gz = await new Response(new Response(nifti()).body!.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
      expect((await parseNifti(gz)).data[11]).toBe(12);
    }
  });
  it('NIfTI hỏng báo lỗi rõ', async () => {
    await expect(parseNifti(new ArrayBuffer(400))).rejects.toThrow(/NIfTI/);
  });

  /** DICOM VR tường minh, có một dãy độ dài không xác định lồng một dãy khác (như tệp thật), ảnh 2×2 int16 */
  function dicom(z: number, syntax = '1.2.840.10008.1.2.1'): ArrayBuffer {
    const parts: number[] = [];
    const u16 = (x: number) => parts.push(x & 255, x >> 8);
    const u32 = (x: number) => {
      u16(x & 0xffff);
      u16(x >>> 16);
    };
    const ascii = (s: string) => {
      const t = s.length % 2 ? s + ' ' : s;
      for (const ch of t) parts.push(ch.charCodeAt(0));
      return t.length;
    };
    const el = (g: number, e: number, vr: string, val: string | number[]) => {
      u16(g);
      u16(e);
      ascii(vr);
      const bytes = typeof val === 'string' ? (val.length % 2 ? val + ' ' : val).split('').map((c) => c.charCodeAt(0)) : val;
      u16(bytes.length);
      parts.push(...bytes);
    };
    for (let n = 0; n < 128; n++) parts.push(0);
    ascii('DICM');
    el(0x0002, 0x0010, 'UI', syntax);
    el(0x0008, 0x0060, 'CS', 'CT');
    // dãy SQ độ dài không xác định → mục độ dài không xác định → dãy lồng → mục độ dài xác định
    u16(0x0008);
    u16(0x1140);
    ascii('SQ');
    u16(0);
    u32(0xffffffff);
    u16(0xfffe);
    u16(0xe000);
    u32(0xffffffff);
    u16(0x0008);
    u16(0x1150);
    ascii('SQ');
    u16(0);
    u32(0xffffffff);
    u16(0xfffe);
    u16(0xe000);
    u32(4);
    parts.push(1, 2, 3, 4);
    u16(0xfffe);
    u16(0xe0dd);
    u32(0);
    u16(0xfffe);
    u16(0xe00d);
    u32(0);
    u16(0xfffe);
    u16(0xe0dd);
    u32(0);
    el(0x0018, 0x0050, 'DS', '3');
    el(0x0020, 0x0032, 'DS', `0\\0\\${z}`);
    el(0x0028, 0x0010, 'US', [2, 0]);
    el(0x0028, 0x0011, 'US', [2, 0]);
    el(0x0028, 0x0030, 'DS', '0.7\\0.7');
    el(0x0028, 0x0100, 'US', [16, 0]);
    el(0x0028, 0x0103, 'US', [1, 0]);
    el(0x0028, 0x1052, 'DS', '-1024');
    el(0x0028, 0x1053, 'DS', '1');
    u16(0x7fe0);
    u16(0x0010);
    ascii('OW');
    u16(0);
    u32(8);
    for (const x of [1000, 1010, 1020, 1030]) u16(x + z);
    return new Uint8Array(parts).buffer;
  }
  it('DICOM: qua dãy lồng, ghép lát theo vị trí, quy đổi HU', () => {
    const v = dicomVolume([parseDicom(dicom(6)), parseDicom(dicom(0)), parseDicom(dicom(3))]) as Volume;
    expect(v.dims).toEqual([2, 2, 3]);
    expect(v.spacing[2]).toBeCloseTo(3);
    expect(v.modality).toBe('CT');
    // lát đầu là z = 0; hàng ảnh đầu tiên (phía trước) nằm ở j = 1
    expect(v.data[idx(v, 0, 1, 0)]).toBe(1000 - 1024);
    expect(v.data[idx(v, 1, 0, 2)]).toBe(1030 + 6 - 1024);
  });
  it('DICOM nén báo lỗi rõ', () => {
    expect(() => parseDicom(dicom(0, '1.2.840.10008.1.2.4.70'))).toThrow(/nén/);
  });
});
