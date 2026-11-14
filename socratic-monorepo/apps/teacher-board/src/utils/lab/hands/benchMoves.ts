import {BIO_BY_ID} from '../bio/experiments';
import {PHYS_BY_ID} from '../phys/experiments';
import type {PhysExperiment} from '../phys/types';
import type {Manual} from './manual';

/**
 * Phần động của bộ dụng cụ Blender (`tools/lab-models/bench_parts.py` → `bench-phys.glb`, `bench-bio.glb`) trong các bài thực hành SGK:
 * nút `Mov_<MÃ BÀI>_<n>` dịch (x, y, z), co giãn dọc (sy) hoặc phóng to đều (s) theo một thanh trượt, tuyến tính từ `a` (thanh trượt ở min) tới `b` (ở max).
 * Phép dịch tính từ gốc của nút (chốt treo, điểm tựa) như trong tệp GLB.
 */
export interface BenchMove {
  n: number;
  param: string;
  axis: 'x' | 'y' | 'z' | 'sy' | 's';
  a: number;
  b: number;
  /** tên bộ phận để học sinh CẦM và kéo trực tiếp (chụm vào rồi di chuyển); bỏ trống = bộ phận chỉ chạy theo, không cầm được */
  what?: string;
}
const mv = (n: number, param: string, axis: BenchMove['axis'], a: number, b: number, what?: string): BenchMove => ({n, param, axis, a, b, what});

/** Kéo bộ phận một quãng `d` (đơn vị cảnh, đã chia tỉ lệ phóng) từ lúc cầm (`startT` ∈ 0..1 của thanh trượt) → `t` mới. Bộ phận chỉ phóng to/co: 2,2 đơn vị = cả thang. */
export function dragT(m: BenchMove, startT: number, d: number): number {
  const dt = m.axis === 's' || m.axis === 'sy' ? d / 2.2 : d / (m.b - m.a);
  return Math.min(1, Math.max(0, startT + dt));
}
export const BENCH_MOVES: Record<string, BenchMove[]> = {
  SPEED: [mv(1, 's', 'x', -0.6, 2.2, 'cổng quang thứ hai')], // cổng quang thứ hai
  FREE_FALL_G: [mv(1, 'h', 'y', 1.55, 0.45, 'cổng quang')], // cổng quang hạ thấp khi quãng rơi dài hơn
  EMF_INTERNAL_R: [mv(1, 'R', 'x', 1.15, 2.3, 'con chạy biến trở')], // con chạy biến trở
  NEWTON2: [mv(1, 'F', 's', 0.6, 1.4, 'quả cân treo')], // quả cân treo
  FRICTION: [mv(1, 'm', 's', 0.6, 1.5, 'quả cân trên khối gỗ')], // quả cân đặt trên khối gỗ
  HOOKE: [mv(1, 'm', 'sy', 1, 1.9), mv(2, 'm', 'y', 0, -0.648, 'quả cân treo')], // lò xo dãn, quả cân hạ theo (lò xo dài 0,72)
  PENDULUM_G: [mv(1, 'l', 'sy', 0.6, 1.9), mv(2, 'l', 'y', 0.4, -0.9, 'quả nặng')], // dây dài 1,0 ở tỉ lệ 1
  BOYLE: [mv(1, 'V', 'y', 0.5, 1.3, 'pit-tông')], // pit-tông
  CHARLES: [mv(1, 'T', 'x', 0.5, 1.3, 'pit-tông')], // pit-tông bị khí nóng đẩy ra
  EM_INDUCTION: [mv(1, 'v', 'x', 0.9, -0.2, 'nam châm')], // nam châm đưa vào lòng cuộn dây
  LEVER_MOMENT: [mv(1, 'd1', 'x', -0.4, -1.6, 'quả cân bên trái')], // quả cân trái: mỗi lỗ 10 cm
  PROJECTILE_HORIZONTAL: [mv(1, 'h', 'y', 0.5, 1.5, 'bệ máng ném')], // bệ máng ném
  CELL_OBSERVE: [mv(1, 'focus', 'y', 0.44, 0.56, 'bàn kính')], // bàn kính
  TRANSPIRATION: [mv(1, 'L', 'x', 2.2, 0.6, 'đèn')], // đèn lại gần cây
  TREE_AGE: [mv(1, 'D', 's', 0.4, 1.5, 'lát cắt thân cây')], // lát cắt thân cây
  MINI_ECOSYSTEM: [mv(1, 'pl', 's', 0.2, 1.3, 'cây thủy sinh')], // cây thủy sinh
};

/** Bộ phận cầm được của một thanh trượt (nếu có): bài đó kéo thẳng dụng cụ thay vì kéo con trượt trên ray. */
export function grabOf(expId: string, param: string): (BenchMove & {what: string}) | undefined {
  const all = (BENCH_MOVES[expId] ?? []).filter((m): m is BenchMove & {what: string} => m.param === param && !!m.what);
  return all.find((m) => m.axis !== 's') ?? all[0];
}

/** Bài thực hành SGK theo mã preset (`PHYS_LAB_<MÃ>` / `BIO_LAB_<MÃ>`); `file` = tệp mô hình chứa bộ dụng cụ. */
export function benchOf(presetId: string): {e: PhysExperiment; file: 'phys' | 'bio'} | null {
  const m = /^(PHYS|BIO)_LAB_(.+)$/.exec(presetId);
  if (!m) return null;
  const e = (m[1] === 'PHYS' ? PHYS_BY_ID : BIO_BY_ID)[m[2]];
  return e ? {e, file: m[1] === 'PHYS' ? 'phys' : 'bio'} : null;
}

/** Tab "Hướng dẫn" của bài thực hành SGK, suy ra từ chính khai báo của bài (bước làm, dụng cụ, câu hỏi sau thí nghiệm). */
export function benchManual(presetId: string): Manual | null {
  const b = benchOf(presetId);
  if (!b) return null;
  const {e} = b;
  return {
    goal: e.goal,
    tools: [
      `Trên bàn: ${e.apparatus}.`,
      ...e.sliders.map((p) => {
        const g = grabOf(e.id, p.key);
        const range = `từ ${p.min} đến ${p.max}${p.unit ? ` ${p.unit}` : ''}`;
        return g
          ? `${g.what[0].toUpperCase()}${g.what.slice(1)}: chụm vào chính dụng cụ này rồi kéo để đổi "${p.label}" (${range}); vòng con trỏ chuyển cam khi chạm đúng.`
          : `Con trượt "${p.label}" (ray ở mép bàn bên trái): chụm vào con trượt màu vàng và kéo dọc ray; ${range}.`;
      }),
      ...(e.choices ?? []).map((c) => `Nút tròn "${c.label}" (mép bàn bên phải): chụm một lần để đổi sang lựa chọn kế tiếp (${c.options.map((o) => o[1]).join(', ')}).`),
      ...(b.file === 'phys' ? ['Dụng cụ tự chuyển động đúng theo quy luật của bài (xe lăn, bi rơi, con lắc đung đưa, dòng điện chạy, sóng lan…): chạm (chụm) vào vật đang chuyển động hoặc bấm ĐO để cho chạy lại từ đầu; kéo thanh trượt thì chuyển động đổi theo ngay.'] : []),
      ...(e.columns.length ? ['Nút ĐO màu cam (mép trước bàn, dưới các nút tròn): chụm một lần = một lần đo, số đo ghi vào bảng ở tab Thao tác.'] : []),
    ],
    steps: e.steps.map((s) => ({do: s.text, why: ''})),
    conclude: e.questions.map((q) => q.why).join(' '),
  };
}
