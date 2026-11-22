/**
 * Trạm ảnh y khoa (giai đoạn 1): khối ảnh CT / MRI trong trình duyệt.
 *  - Đọc NIfTI-1 (.nii, .nii.gz) và chuỗi DICOM không nén (little endian, VR tường minh hoặc ngầm định); ảnh DICOM nén (JPEG…) báo lỗi rõ ràng.
 *  - Phantom ngực tổng hợp để thử khi chưa có dữ liệu (KHÔNG phải ảnh bệnh nhân).
 *  - Lát cắt ba mặt phẳng chuẩn (ngang / đứng ngang / đứng dọc) với cửa sổ đậm độ, đo khoảng cách (mm), phân vùng loang từ điểm hạt giống và thể tích (cm³).
 * Trục khối: i (x, trái → phải ảnh), j (y, sau → trước), k (z, dưới → trên); chưa áp ma trận hướng qform/sform (hiển thị theo chỉ số voxel).
 */

export interface Volume {
  dims: [number, number, number];
  /** kích thước voxel (mm) */
  spacing: [number, number, number];
  /** giá trị đã quy đổi (CT: đơn vị Hounsfield) */
  data: Float32Array;
  modality: 'CT' | 'MR' | 'OT';
  name: string;
  /** dữ liệu tổng hợp để thử, không phải ảnh người bệnh */
  phantom?: boolean;
}
export type Axis = 'axial' | 'coronal' | 'sagittal';
export const AXIS_NAME: Record<Axis, string> = {axial: 'Ngang (axial)', coronal: 'Đứng ngang (coronal)', sagittal: 'Đứng dọc (sagittal)'};
export type P3 = [number, number, number];
export const idx = (v: Volume, i: number, j: number, k: number) => i + v.dims[0] * (j + v.dims[1] * k);

// ------------------------------------------------------------------ cửa sổ đậm độ
export interface WL {
  w: number;
  l: number;
}
export const WL_PRESETS: {id: string; name: string; wl: WL}[] = [
  {id: 'soft', name: 'Mô mềm', wl: {w: 400, l: 40}},
  {id: 'lung', name: 'Phổi', wl: {w: 1500, l: -600}},
  {id: 'bone', name: 'Xương', wl: {w: 1800, l: 400}},
  {id: 'vessel', name: 'Mạch (thuốc cản quang)', wl: {w: 600, l: 150}},
];
/** cửa sổ tự động cho MRI / ảnh không rõ đơn vị: từ bách phân vị 1–99 */
export function autoWL(v: Volume): WL {
  const step = Math.max(1, Math.floor(v.data.length / 200000));
  const s: number[] = [];
  for (let n = 0; n < v.data.length; n += step) s.push(v.data[n]);
  s.sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.01)];
  const hi = s[Math.floor(s.length * 0.99)];
  return {w: Math.max(1, hi - lo), l: (hi + lo) / 2};
}
export const gray = (x: number, wl: WL) => Math.max(0, Math.min(255, ((x - (wl.l - wl.w / 2)) / wl.w) * 255));

/** kích thước ảnh của lát cắt (cột, hàng) và cỡ điểm ảnh (mm) theo hai trục */
export function sliceShape(v: Volume, ax: Axis): {w: number; h: number; sw: number; sh: number; n: number} {
  const [X, Y, Z] = v.dims;
  const [sx, sy, sz] = v.spacing;
  return ax === 'axial' ? {w: X, h: Y, sw: sx, sh: sy, n: Z} : ax === 'coronal' ? {w: X, h: Z, sw: sx, sh: sz, n: Y} : {w: Y, h: Z, sw: sy, sh: sz, n: X};
}
/** điểm ảnh (cột c, hàng r) của lát số `s` → voxel. Ngang: trước ở trên; hai mặt đứng: trên ở trên */
export function toVoxel(v: Volume, ax: Axis, s: number, c: number, r: number): P3 {
  const [, Y, Z] = v.dims;
  return ax === 'axial' ? [c, Y - 1 - r, s] : ax === 'coronal' ? [c, s, Z - 1 - r] : [s, c, Z - 1 - r];
}
export function toPixel(v: Volume, ax: Axis, p: P3): {c: number; r: number; s: number} {
  const [, Y, Z] = v.dims;
  return ax === 'axial' ? {c: p[0], r: Y - 1 - p[1], s: p[2]} : ax === 'coronal' ? {c: p[0], r: Z - 1 - p[2], s: p[1]} : {c: p[1], r: Z - 1 - p[2], s: p[0]};
}
/** ảnh xám RGBA của một lát cắt; `mask` (nếu có) phủ đỏ trong suốt */
export function sliceRGBA(v: Volume, ax: Axis, s: number, wl: WL, mask?: Uint8Array | null): Uint8ClampedArray<ArrayBuffer> {
  const {w, h} = sliceShape(v, ax);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      const [i, j, k] = toVoxel(v, ax, s, c, r);
      const n = idx(v, i, j, k);
      const g = gray(v.data[n], wl);
      const o = (r * w + c) * 4;
      const m = mask?.[n] ? 1 : 0;
      out[o] = g * (1 - 0.45 * m) + 230 * 0.45 * m;
      out[o + 1] = g * (1 - 0.45 * m) + 40 * 0.45 * m;
      out[o + 2] = g * (1 - 0.45 * m) + 50 * 0.45 * m;
      out[o + 3] = 255;
    }
  return out;
}

// ------------------------------------------------------------------ đo đạc
export const distMm = (v: Volume, a: P3, b: P3) => Math.hypot((a[0] - b[0]) * v.spacing[0], (a[1] - b[1]) * v.spacing[1], (a[2] - b[2]) * v.spacing[2]);
export const voxelMm3 = (v: Volume) => v.spacing[0] * v.spacing[1] * v.spacing[2];

export interface Segment {
  mask: Uint8Array;
  count: number;
  /** thể tích (cm³) */
  cm3: number;
  /** hộp bao theo voxel */
  min: P3;
  max: P3;
  /** kích thước hộp bao (mm) ba trục */
  extent: P3;
  /** khoảng giá trị đã loang */
  range: [number, number];
  seed: P3;
  /** chạm giới hạn số voxel: vùng loang tràn ra mô xung quanh, phải thu hẹp khoảng giá trị */
  capped: boolean;
}
/**
 * Phân vùng loang (region growing, 6 láng giềng) từ voxel hạt giống: nhận voxel có giá trị trong [giá trị hạt giống − tol, + tol].
 * Không phải AI: là bước khởi đầu cổ điển, tốt với tổn thương có đậm độ khác hẳn mô quanh (u phổi trong nhu mô phổi, phình mạch có thuốc cản quang).
 */
export function regionGrow(v: Volume, seed: P3, tol: number, maxVox = 2_000_000): Segment {
  const [X, Y, Z] = v.dims;
  const s0 = v.data[idx(v, ...seed)];
  const lo = s0 - tol;
  const hi = s0 + tol;
  const mask = new Uint8Array(v.data.length);
  const q = new Int32Array(Math.min(v.data.length, maxVox + 6));
  let head = 0;
  let tail = 0;
  const start = idx(v, ...seed);
  mask[start] = 1;
  q[tail++] = start;
  const min: P3 = [...seed];
  const max: P3 = [...seed];
  let capped = false;
  while (head < tail) {
    const n = q[head++];
    const i = n % X;
    const j = Math.floor(n / X) % Y;
    const k = Math.floor(n / (X * Y));
    if (i < min[0]) min[0] = i;
    if (i > max[0]) max[0] = i;
    if (j < min[1]) min[1] = j;
    if (j > max[1]) max[1] = j;
    if (k < min[2]) min[2] = k;
    if (k > max[2]) max[2] = k;
    const nb = [i > 0 ? n - 1 : -1, i < X - 1 ? n + 1 : -1, j > 0 ? n - X : -1, j < Y - 1 ? n + X : -1, k > 0 ? n - X * Y : -1, k < Z - 1 ? n + X * Y : -1];
    for (const m of nb) {
      if (m < 0 || mask[m]) continue;
      const x = v.data[m];
      if (x < lo || x > hi) continue;
      if (tail >= maxVox) {
        capped = true;
        continue;
      }
      mask[m] = 1;
      q[tail++] = m;
    }
  }
  const count = tail;
  return {
    mask,
    count,
    cm3: (count * voxelMm3(v)) / 1000,
    min,
    max,
    extent: [(max[0] - min[0] + 1) * v.spacing[0], (max[1] - min[1] + 1) * v.spacing[1], (max[2] - min[2] + 1) * v.spacing[2]],
    range: [lo, hi],
    seed,
    capped,
  };
}

// ------------------------------------------------------------------ phantom ngực tổng hợp
/** số giả ngẫu nhiên lặp lại được (nhiễu ảnh giống nhau mỗi lần mở) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** tâm khối u trong phantom (voxel) và bán kính danh định (mm): để test và bài đo đối chiếu */
export const PHANTOM_TUMOR = {center: [42, 70, 52] as P3, radiusMm: 13};
/**
 * Phantom CT ngực 128 × 128 × 96 (voxel 2,5 × 2,5 × 3 mm), đơn vị HU: thân (mỡ dưới da, cơ), hai phổi, tim có máu cản quang, động mạch chủ,
 * cột sống và xương sườn, và MỘT KHỐI U ĐẶC ~13 mm ở thùy dưới phổi phải (bên trái ảnh). Nhiễu ±15 HU.
 */
export function chestPhantom(): Volume {
  const X = 128;
  const Y = 128;
  const Z = 96;
  const sp: [number, number, number] = [2.5, 2.5, 3];
  const data = new Float32Array(X * Y * Z);
  const r = rng(7);
  const e = (i: number, j: number, k: number, c: P3, R: P3) => ((i - c[0]) / R[0]) ** 2 + ((j - c[1]) / R[1]) ** 2 + ((k - c[2]) / R[2]) ** 2;
  const {center: tc, radiusMm} = PHANTOM_TUMOR;
  for (let k = 0; k < Z; k++)
    for (let j = 0; j < Y; j++)
      for (let i = 0; i < X; i++) {
        let hu = -1000;
        // thân: elip ngang, mỡ dưới da 4 voxel
        const body = ((i - 64) / 58) ** 2 + ((j - 62) / 44) ** 2;
        if (body < 1) {
          hu = body > 0.86 ? -100 : 45;
          // hai phổi
          for (const s of [-1, 1]) if (e(i, j, k, [64 + s * 27, 66, 50], [20, 27, 44]) < 1) hu = -850 + (r() - 0.5) * 60;
          // tim (máu cản quang trong buồng, thành cơ) lệch trái người bệnh = phải ảnh
          const h = e(i, j, k, [72, 74, 36], [22, 18, 20]);
          if (h < 1) hu = h < 0.55 ? 180 : 45;
          // động mạch chủ xuống, cạnh cột sống
          if (((i - 74) / 6) ** 2 + ((j - 40) / 6) ** 2 < 1 && k > 10) hu = 190;
          // cột sống (thân đốt sống) và vỏ xương đặc hơn
          const sp2 = ((i - 64) / 9) ** 2 + ((j - 30) / 9) ** 2;
          if (sp2 < 1) hu = sp2 > 0.6 ? 900 : 300;
          // xương sườn: các vòng mảnh cách nhau 8 lát
          if (k % 8 < 2 && body > 0.72 && body < 0.84) hu = 700;
        }
        // khối u: cầu hơi tròn múi, đậm độ mô mềm
        const d = Math.hypot((i - tc[0]) * sp[0], (j - tc[1]) * sp[1], (k - tc[2]) * sp[2]);
        const lob = 1 + 0.12 * Math.sin((i - tc[0]) * 0.9) * Math.cos((k - tc[2]) * 0.8);
        if (d < radiusMm * lob) hu = 35;
        data[i + X * (j + Y * k)] = hu + (r() - 0.5) * 30;
      }
  return {dims: [X, Y, Z], spacing: sp, data, modality: 'CT', name: 'Phantom ngực tổng hợp (không phải bệnh nhân)', phantom: true};
}

// ------------------------------------------------------------------ NIfTI-1
async function gunzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip');
  return new Response(new Response(buf).body!.pipeThrough(ds)).arrayBuffer();
}
export async function parseNifti(raw: ArrayBuffer, name = 'NIfTI'): Promise<Volume> {
  const u8 = new Uint8Array(raw);
  const buf = u8[0] === 0x1f && u8[1] === 0x8b ? await gunzip(raw) : raw;
  const dv = new DataView(buf);
  let le = true;
  if (dv.getInt32(0, true) !== 348) {
    if (dv.getInt32(0, false) !== 348) throw new Error('Không phải tệp NIfTI-1 (sizeof_hdr khác 348). NIfTI-2 chưa hỗ trợ.');
    le = false;
  }
  const dim = Array.from({length: 8}, (_, n) => dv.getInt16(40 + n * 2, le));
  if (dim[0] < 3) throw new Error('Ảnh NIfTI không phải khối 3D.');
  const [X, Y, Z] = [dim[1], dim[2], dim[3]];
  const type = dv.getInt16(70, le);
  const pix = Array.from({length: 8}, (_, n) => dv.getFloat32(76 + n * 4, le));
  const off = Math.max(352, Math.round(dv.getFloat32(108, le)));
  let slope = dv.getFloat32(112, le);
  const inter = dv.getFloat32(116, le);
  if (!slope || !Number.isFinite(slope)) slope = 1;
  const n = X * Y * Z;
  const read: Record<number, [number, (o: number) => number]> = {
    2: [1, (o) => dv.getUint8(o)],
    4: [2, (o) => dv.getInt16(o, le)],
    8: [4, (o) => dv.getInt32(o, le)],
    16: [4, (o) => dv.getFloat32(o, le)],
    64: [8, (o) => dv.getFloat64(o, le)],
    256: [1, (o) => dv.getInt8(o)],
    512: [2, (o) => dv.getUint16(o, le)],
    768: [4, (o) => dv.getUint32(o, le)],
  };
  const rd = read[type];
  if (!rd) throw new Error(`Kiểu dữ liệu NIfTI ${type} chưa hỗ trợ (cần số nguyên hoặc số thực, một kênh).`);
  if (off + n * rd[0] > buf.byteLength) throw new Error('Tệp NIfTI bị cụt: thiếu dữ liệu ảnh.');
  const data = new Float32Array(n);
  for (let q = 0; q < n; q++) data[q] = rd[1](off + q * rd[0]) * slope + inter;
  // CT thường có giá trị âm tới −1000 (không khí); MRI thì không
  let mn = Infinity;
  for (let q = 0; q < n; q += 97) mn = Math.min(mn, data[q]);
  return {dims: [X, Y, Z], spacing: [Math.abs(pix[1]) || 1, Math.abs(pix[2]) || 1, Math.abs(pix[3]) || 1], data, modality: mn < -500 ? 'CT' : 'MR', name};
}

// ------------------------------------------------------------------ DICOM (không nén)
interface DcmSlice {
  rows: number;
  cols: number;
  spacing: [number, number];
  thick: number;
  pos: P3 | null;
  inst: number;
  pixels: Float32Array;
  modality: string;
}
const IMPLICIT = '1.2.840.10008.1.2';
const EXPLICIT = '1.2.840.10008.1.2.1';
const LONG_VR = new Set(['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT', 'OV', 'SV', 'UV']);
/** đọc một tệp DICOM: chỉ các thẻ cần dựng khối; dãy (SQ) và phần tử độ dài không xác định thì đi qua đệ quy (dãy → mục → phần tử) tới dấu kết thúc */
export function parseDicom(buf: ArrayBuffer): DcmSlice {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const END = buf.byteLength;
  const UNDEF = 0xffffffff;
  const txt = (o: number, l: number) => String.fromCharCode(...u8.subarray(o, o + l)).replace(/\0/g, '').trim();
  let explicit = true;
  /** đầu phần tử tại p: thẻ, độ dài, cỡ phần đầu */
  const head = (p: number, ex: boolean) => {
    const g = dv.getUint16(p, true);
    const e = dv.getUint16(p + 2, true);
    if (g === 0xfffe) return {g, e, len: dv.getUint32(p + 4, true), hdr: 8};
    if (ex) {
      const vr = txt(p + 4, 2);
      return LONG_VR.has(vr) ? {g, e, len: dv.getUint32(p + 8, true), hdr: 12} : {g, e, len: dv.getUint16(p + 6, true), hdr: 8};
    }
    return {g, e, len: dv.getUint32(p + 4, true), hdr: 8};
  };
  const skipSeq = (p: number): number => {
    while (p + 8 <= END) {
      const h = head(p, false);
      p += 8;
      if (h.g === 0xfffe && h.e === 0xe0dd) return p;
      if (h.g === 0xfffe && h.e === 0xe000) p = h.len === UNDEF ? skipItem(p) : p + h.len;
    }
    return END;
  };
  const skipItem = (p: number): number => {
    while (p + 8 <= END) {
      if (dv.getUint16(p, true) === 0xfffe && dv.getUint16(p + 2, true) === 0xe00d) return p + 8;
      const h = head(p, explicit);
      p += h.hdr;
      p = h.len === UNDEF ? skipSeq(p) : p + h.len;
    }
    return END;
  };
  let p = buf.byteLength > 132 && txt(128, 4) === 'DICM' ? 132 : 0;
  let syntax = EXPLICIT;
  const tags: Record<string, [number, number]> = {};
  while (p + 8 <= END) {
    const g = dv.getUint16(p, true);
    // nhóm 0002 luôn VR tường minh; sau nhóm 0002 theo cú pháp truyền
    if (g !== 0x0002) explicit = syntax !== IMPLICIT;
    const h = head(p, g === 0x0002 || explicit);
    const key = (((h.g << 16) | h.e) >>> 0).toString(16).toUpperCase().padStart(8, '0');
    p += h.hdr;
    if (key === '7FE00010') {
      tags[key] = [p, h.len === UNDEF ? -1 : h.len];
      break;
    }
    if (h.len === UNDEF) {
      p = skipSeq(p);
      continue;
    }
    tags[key] = [p, h.len];
    if (key === '00020010') syntax = txt(p, h.len);
    p += h.len;
  }
  if (syntax !== IMPLICIT && syntax !== EXPLICIT) throw new Error(`Ảnh DICOM nén (cú pháp ${syntax}) chưa đọc được trong trình duyệt. Hãy xuất sang NIfTI (.nii) hoặc DICOM không nén.`);
  const str = (t: string) => (tags[t] ? txt(tags[t][0], tags[t][1]) : '');
  const us = (t: string) => (tags[t] ? dv.getUint16(tags[t][0], true) : 0);
  const nums = (t: string) => str(t).split('\\').map(Number).filter((x) => Number.isFinite(x));
  const rows = us('00280010');
  const cols = us('00280011');
  const bits = us('00280100') || 16;
  const signed = us('00280103') === 1;
  const slope = Number(str('00281053')) || 1;
  const inter = Number(str('00281052')) || 0;
  const px = tags['7FE00010'];
  if (!rows || !cols || !px) throw new Error('Tệp DICOM thiếu ảnh (Rows / Columns / Pixel Data).');
  if (px[1] < 0) throw new Error('Pixel Data đóng gói (nén): chưa hỗ trợ.');
  const n = rows * cols;
  const pixels = new Float32Array(n);
  for (let q = 0; q < n; q++) {
    const o = px[0] + q * (bits / 8);
    const raw = bits === 8 ? dv.getUint8(o) : signed ? dv.getInt16(o, true) : dv.getUint16(o, true);
    pixels[q] = raw * slope + inter;
  }
  const ps = nums('00280030');
  const pos = nums('00200032');
  return {rows, cols, spacing: [ps[1] || 1, ps[0] || 1], thick: Number(str('00180050')) || 1, pos: pos.length === 3 ? (pos as P3) : null, inst: Number(str('00200013')) || 0, pixels, modality: str('00080060')};
}
/** ghép các lát DICOM thành khối: xếp theo vị trí (ImagePositionPatient) hoặc số thứ tự ảnh; khoảng cách lát lấy từ vị trí */
export function dicomVolume(slices: DcmSlice[], name = 'DICOM'): Volume {
  if (!slices.length) throw new Error('Không có lát DICOM nào.');
  const {rows, cols} = slices[0];
  const ok = slices.filter((s) => s.rows === rows && s.cols === cols);
  ok.sort((a, b) => (a.pos && b.pos ? a.pos[2] - b.pos[2] : a.inst - b.inst));
  const dz = ok.length > 1 && ok[0].pos && ok[1].pos ? Math.hypot(...(ok[1].pos.map((x, n) => x - ok[0].pos![n]) as P3)) : ok[0].thick;
  const X = cols;
  const Y = rows;
  const Z = ok.length;
  const data = new Float32Array(X * Y * Z);
  // hàng 0 của ảnh DICOM là phía trước người bệnh: đảo hàng để trục j đi từ sau ra trước như NIfTI
  ok.forEach((s, k) => {
    for (let r = 0; r < Y; r++) data.set(s.pixels.subarray(r * X, (r + 1) * X), X * (Y - 1 - r + Y * k));
  });
  const m = ok[0].modality;
  return {dims: [X, Y, Z], spacing: [ok[0].spacing[0], ok[0].spacing[1], dz || 1], data, modality: m === 'CT' ? 'CT' : m === 'MR' ? 'MR' : 'OT', name};
}

/** số đo xuất ra cho nghiên cứu / giảng dạy (JSON) */
export interface MeasureLine {
  a: P3;
  b: P3;
  mm: number;
}
export function exportJSON(v: Volume, lines: MeasureLine[], seg: Segment | null) {
  return {
    volume: {name: v.name, phantom: !!v.phantom, modality: v.modality, dims: v.dims, spacing_mm: v.spacing},
    distances_mm: lines.map((l) => ({a_voxel: l.a, b_voxel: l.b, mm: +l.mm.toFixed(1)})),
    segment: seg && {seed_voxel: seg.seed, range: seg.range.map((x) => +x.toFixed(0)), voxels: seg.count, volume_cm3: +seg.cm3.toFixed(2), extent_mm: seg.extent.map((x) => +x.toFixed(1)), capped: seg.capped},
    note: 'Số đo từ chỉ số voxel; chưa áp ma trận hướng của ảnh. Chỉ dùng cho học tập / nghiên cứu, không dùng chẩn đoán.',
  };
}
