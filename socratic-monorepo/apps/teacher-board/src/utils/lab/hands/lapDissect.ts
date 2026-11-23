/**
 * Lưới ô cho phần bóc tách của ca cắt túi mật: màng phúc mạc phủ tam giác gan mật và dải mô nối túi mật với giường gan.
 * Móc đốt xóa ô thật, mảnh màng không còn dính vào mép cũng rơi đi. Hàm thuần, cảnh dựng lưới hiển thị từ mảng ô này.
 */
export interface CellGrid {
  x0: number;
  z0: number;
  dx: number;
  dz: number;
  nx: number;
  nz: number;
}
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
/** màng phúc mạc: phủ ống (z = 0) và động mạch (z ≈ −0,5) */
export const MEMB: CellGrid = {x0: -2.25, z0: -0.92, dx: 0.06, dz: 0.06, nx: 68, nz: 24};
/** cửa sổ an toàn giữa ống và động mạch: mở hết mới nhìn rõ hai cấu trúc riêng biệt */
export const WINDOW: Rect = {x0: -1.4, x1: 1.2, z0: -0.37, z1: -0.16};
/** dải nối túi mật với gan, toạ độ (u dọc dải, v ngang dải; v dương về phía gan) */
export const BAND_A: [number, number] = [-2.8, -0.72];
export const BAND_B: [number, number] = [-4.7, -1.48];
export const BAND_LEN = Math.hypot(BAND_B[0] - BAND_A[0], BAND_B[1] - BAND_A[1]);
export const BAND_HALF = 0.2;
export const BAND: CellGrid = {x0: 0, z0: -BAND_HALF, dx: BAND_LEN / 34, dz: (2 * BAND_HALF) / 6, nx: 34, nz: 6};

export const newCells = (g: CellGrid) => new Uint8Array(g.nx * g.nz).fill(1);

/** (x, z) thế giới → (u, v) của dải */
export function bandUV(x: number, z: number): [number, number] {
  const ux = (BAND_B[0] - BAND_A[0]) / BAND_LEN;
  const uz = (BAND_B[1] - BAND_A[1]) / BAND_LEN;
  const px = x - BAND_A[0];
  const pz = z - BAND_A[1];
  // pháp tuyến quay về phía gan (−z)
  return [px * ux + pz * uz, -px * uz + pz * ux];
}
/** (u, v) của dải → (x, z) thế giới */
export function bandXZ(u: number, v: number): [number, number] {
  const ux = (BAND_B[0] - BAND_A[0]) / BAND_LEN;
  const uz = (BAND_B[1] - BAND_A[1]) / BAND_LEN;
  return [BAND_A[0] + u * ux - v * uz, BAND_A[1] + u * uz + v * ux];
}

/** xóa các ô có tâm trong bán kính `r`; không có ô nào đổi thì trả lại đúng mảng cũ */
export function burnCells(cells: Uint8Array, g: CellGrid, x: number, z: number, r: number): Uint8Array {
  let out: Uint8Array | null = null;
  const i0 = Math.max(0, Math.floor((x - r - g.x0) / g.dx));
  const i1 = Math.min(g.nx - 1, Math.ceil((x + r - g.x0) / g.dx));
  const j0 = Math.max(0, Math.floor((z - r - g.z0) / g.dz));
  const j1 = Math.min(g.nz - 1, Math.ceil((z + r - g.z0) / g.dz));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const q = i + j * g.nx;
      if (!cells[q] || Math.hypot(g.x0 + (i + 0.5) * g.dx - x, g.z0 + (j + 0.5) * g.dz - z) > r) continue;
      out ??= cells.slice();
      out[q] = 0;
    }
  return out ?? cells;
}

/** mảnh không còn nối với mép lưới thì rơi đi */
export function pruneIslands(cells: Uint8Array, g: CellGrid): Uint8Array {
  const seen = new Uint8Array(cells.length);
  const stack: number[] = [];
  const push = (q: number) => {
    if (cells[q] && !seen[q]) {
      seen[q] = 1;
      stack.push(q);
    }
  };
  for (let i = 0; i < g.nx; i++) {
    push(i);
    push(i + (g.nz - 1) * g.nx);
  }
  for (let j = 0; j < g.nz; j++) {
    push(j * g.nx);
    push(g.nx - 1 + j * g.nx);
  }
  while (stack.length) {
    const q = stack.pop()!;
    const i = q % g.nx;
    if (i > 0) push(q - 1);
    if (i < g.nx - 1) push(q + 1);
    if (q >= g.nx) push(q - g.nx);
    if (q < cells.length - g.nx) push(q + g.nx);
  }
  return seen.every((v, q) => v === cells[q]) ? cells : seen;
}

/** tỉ lệ ô đã mở trong một vùng (mặc định cả lưới) */
export function clearedIn(cells: Uint8Array, g: CellGrid, r?: Rect): number {
  let all = 0;
  let gone = 0;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.dx;
      const z = g.z0 + (j + 0.5) * g.dz;
      if (r && (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1)) continue;
      all++;
      if (!cells[i + j * g.nx]) gone++;
    }
  return all ? gone / all : 1;
}

/** tỉ lệ đã mở của một cột (đoạn dọc dải) */
export function columnCleared(cells: Uint8Array, g: CellGrid, i: number): number {
  let gone = 0;
  for (let j = 0; j < g.nz; j++) if (!cells[i + j * g.nx]) gone++;
  return gone / g.nz;
}

/** tâm ô còn lại đầu tiên trong vùng: chỗ gợi ý làm tiếp */
export function firstAlive(cells: Uint8Array, g: CellGrid, r?: Rect): [number, number] | null {
  for (let i = 0; i < g.nx; i++)
    for (let j = 0; j < g.nz; j++) {
      const x = g.x0 + (i + 0.5) * g.dx;
      const z = g.z0 + (j + 0.5) * g.dz;
      if (cells[i + j * g.nx] && (!r || (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1))) return [x, z];
    }
  return null;
}
