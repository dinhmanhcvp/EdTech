import {readFileSync} from 'fs';
import {join} from 'path';
import {describe, expect, it} from 'vitest';
import {AUTO_FLAG, PICK_PROP, TINTS, isToggle, pickProp, tintOf, trayLayout} from '../utils/lab/hands/benchPick';
import {BENCH_PICK, benchManual} from '../utils/lab/hands/benchMoves';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';

const glbNodes = (): Set<string> => {
  const b = readFileSync(join(__dirname, '../../public/models/bench-props.glb'));
  return new Set((JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]}).nodes.map((n) => n.name));
};

describe('chọn phương án bằng cách cầm vật thật', () => {
  it('lựa chọn có / không chỉ có một vật; lựa chọn nhiều phương án có một vật cho mỗi phương án', () => {
    expect(isToggle(['Chưa', 'Rồi'])).toBe(true);
    expect(isToggle(['Không thêm', 'Thêm CuSO₄ (ion kim loại nặng)'])).toBe(true);
    expect(isToggle(['Không thêm (đối chứng)', 'Có thêm'])).toBe(true);
    expect(isToggle(['Thước thẳng', 'Thước kẹp'])).toBe(false);
    expect(isToggle(['Chưa', 'Rồi', 'Xong'])).toBe(false);
  });

  it('khay: các vật không chồng nhau, căn giữa, vừa bề rộng bàn; nhóm cách nhau', () => {
    const g = trayLayout([5, 4]);
    const all = g.flat();
    expect(all.length).toBe(9);
    for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1], `vật ${i}`).toBeGreaterThan(0.39);
    expect(Math.abs((Math.min(...all) + Math.max(...all)) / 2)).toBeLessThan(0.05);
    expect(Math.max(...all) - Math.min(...all)).toBeLessThanOrEqual(5.6);
    expect(g[1][0] - g[0][4]).toBeGreaterThan(g[0][1] - g[0][0] + 0.3); // nhóm cách nhau xa hơn vật trong nhóm
    expect(trayLayout([2, 0, 3]).map((r) => r.length)).toEqual([2, 0, 3]);
    expect(trayLayout([])).toEqual([]);
  });

  it('màu phương án: có nghĩa màu thì đúng màu, không thì lấy theo thứ tự trong bảng màu', () => {
    expect(tintOf('Cao su', 0)).toBe('#2B2F3A');
    expect(tintOf('Iodine (Lugol)', 3)).toBe('#8A4A12');
    expect(tintOf('Giống A', 2)).toBe(TINTS[2]);
    expect(tintOf('Giống B', 9)).toBe(TINTS[9 % TINTS.length]);
  });

  it('mọi lựa chọn của mọi bài có vật trong bench-props.glb, có chỗ đặt (vòng vàng) trong phạm vi bàn', () => {
    const g = glbNodes();
    for (const k of new Set([...Object.values(PICK_PROP).flatMap((m) => Object.values(m).flat()), 'card'])) expect(g.has(`Prop_${k}`), k).toBe(true);
    let n = 0;
    for (const [pre, list] of [['PHYS', PHYS_EXPERIMENTS], ['BIO', BIO_EXPERIMENTS]] as const)
      for (const e of list)
        for (const c of e.choices ?? []) {
          n++;
          for (let o = 0; o < c.options.length; o++) expect(g.has(`Prop_${pickProp(e.id, c.key, o)}`), `${pre} ${e.id}.${c.key}[${o}]`).toBe(true);
          expect(c.options.length, `${e.id}.${c.key}`).toBeGreaterThanOrEqual(2);
          const at = BENCH_PICK[e.id]?.[c.key];
          if (at) expect(Math.abs(at[0]) <= 3.2 && at[1] >= 0 && at[1] <= 2.6 && Math.abs(at[2]) <= 1.5, `${e.id}.${c.key}`).toBe(true);
        }
    expect(n).toBeGreaterThanOrEqual(43);
  });

  it('cờ do bước chuẩn bị đặt: chỉ khai báo cho lựa chọn kiểu có / không và bước có thật', () => {
    for (const [id, m] of Object.entries(AUTO_FLAG))
      for (const [key, step] of Object.entries(m)) {
        const e = [...PHYS_EXPERIMENTS, ...BIO_EXPERIMENTS].find((x) => x.id === id)!;
        const c = e.choices!.find((x) => x.key === key)!;
        expect(isToggle(c.options.map((o) => o[1])), `${id}.${key}`).toBe(true);
        expect(step, `${id}.${key}`).toBeLessThan(2);
      }
    expect(pickProp('METAMORPHOSIS', 'sp', 1)).toBe('butterfly');
    expect(pickProp('ERROR_MEASURE', 'inst', 1)).toBe('caliper');
    expect(pickProp('KHÔNG_CÓ', 'x')).toBe('card');
  });

  it('hướng dẫn nói đúng cách chọn: cầm vật đặt vào vòng vàng, không còn "công tắc xoay chạm để đổi"', () => {
    const t = (id: string) => (benchManual(id)?.tools ?? []).join(' ');
    expect(t('BIO_LAB_CELL_OBSERVE')).toContain('cầm một vật');
    expect(t('BIO_LAB_ENZYME')).toContain('nhấc ra để về khay');
    expect(t('PHYS_LAB_OHM_LAW')).not.toContain('Công tắc xoay');
  });
});
