import {describe, expect, it} from 'vitest';
import {choiceAt, dialAt, MEASURE_AT} from '../engines/families/HandsBench3D';
import {grabOf, isTimeUnit} from '../utils/lab/hands/benchMoves';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';

/**
 * Bàn thực hành Lí/Sinh (`labRoom(k, [8.4, 5.6, -0.3, 0.1])`: x ∈ [−4,5; 3,9], z ∈ [−2,7; 2,9]) điều khiển bằng tay qua webcam:
 * mọi núm, đồng hồ hẹn giờ, công tắc chọn và nút đo phải nằm trên mặt bàn và cách nhau đủ xa để không chụm nhầm cái bên cạnh.
 */
const TABLE = {x0: -4.5, x1: 3.9, z0: -2.7, z1: 2.9};
type Ctl = {name: string; x: number; z: number; r: number};

const layout = (e: {id: string; sliders: {key: string; unit?: string}[]; choices?: unknown[]; columns: unknown[]}): Ctl[] => {
  const timed = e.sliders.filter((p) => !grabOf(e.id, p.key) && isTimeUnit(p.unit ?? ''));
  const railed = e.sliders.filter((p) => !grabOf(e.id, p.key) && !isTimeUnit(p.unit ?? ''));
  const out: Ctl[] = [...timed, ...railed].map((_, j) => ({name: `núm ${j + 1}`, x: dialAt(j)[0], z: dialAt(j)[1], r: 0.32}));
  (e.choices ?? []).forEach((_, i) => out.push({name: `công tắc ${i + 1}`, x: choiceAt(i)[0], z: choiceAt(i)[1], r: 0.21}));
  if (e.columns.length) out.push({name: 'nút đo', x: MEASURE_AT[0], z: MEASURE_AT[1], r: 0.33});
  return out;
};

describe('bàn thực hành: núm, công tắc, nút đo nằm trên bàn và đủ thưa', () => {
  for (const e of [...PHYS_EXPERIMENTS, ...BIO_EXPERIMENTS]) {
    it(e.id, () => {
      const ctl = layout(e as never);
      for (const c of ctl) {
        expect(c.x - c.r, `${c.name} lọt mép trái`).toBeGreaterThanOrEqual(TABLE.x0);
        expect(c.x + c.r, `${c.name} lọt mép phải`).toBeLessThanOrEqual(TABLE.x1);
        expect(c.z + c.r, `${c.name} lọt mép trước`).toBeLessThanOrEqual(TABLE.z1);
      }
      for (let a = 0; a < ctl.length; a++)
        for (let b = a + 1; b < ctl.length; b++) {
          const gap = Math.hypot(ctl[a].x - ctl[b].x, ctl[a].z - ctl[b].z) - ctl[a].r - ctl[b].r;
          expect(gap, `${ctl[a].name} – ${ctl[b].name}`).toBeGreaterThanOrEqual(0.3);
        }
    });
  }
});
