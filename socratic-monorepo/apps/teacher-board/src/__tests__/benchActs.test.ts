import {readFileSync} from 'fs';
import {join} from 'path';
import {describe, expect, it} from 'vitest';
import {OVER_R, dropped, wirePath, newSqueeze, newStir, pourStep, pourTilt, squash, squeezeStep, stirProgress, stirStep} from '../utils/lab/hands/benchActs';
import {BENCH_SETUP, benchManual} from '../utils/lab/hands/benchMoves';

const nodes = (file: string): Set<string> => {
  const b = readFileSync(join(__dirname, '../../public/models', file));
  return new Set((JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]}).nodes.map((n) => n.name));
};

describe('thao tác thật trong bước chuẩn bị (đặt, rót, khuấy, bóp bóng)', () => {
  it('rót: chỉ tăng khi giữ chụm VÀ miệng lọ ở trên dụng cụ; nhấc ra thì giữ nguyên phần đã rót', () => {
    let p = 0;
    for (let i = 0; i < 60; i++) p = pourStep(p, 1 / 60, true, true, 2);
    expect(p).toBeCloseTo(0.5, 1);
    expect(pourStep(p, 0.5, false, true)).toBe(p);
    expect(pourStep(p, 0.5, true, false)).toBe(p);
    expect(pourStep(0.99, 1, true, true)).toBe(1);
    expect(pourTilt(0.12, true, true, 1)).toBeGreaterThan(1.2);
    expect(pourTilt(1.3, false, true, 1)).toBeLessThan(0.2);
  });

  it('khuấy: đủ số vòng quanh tâm (cả hai chiều, qua mốc ±π), bỏ qua vùng chết và ngoài dụng cụ', () => {
    let s = newStir();
    const turn = (n: number, dir: 1 | -1, r = 0.3) => {
      for (let i = 0; i <= n * 40; i++) {
        const a = dir * ((i / 40) * 2 * Math.PI) + 3; // bắt đầu gần mốc ±π
        s = stirStep(s, 1 + r * Math.cos(a), 2 + r * Math.sin(a), 1, 2);
      }
    };
    turn(1.5, 1);
    expect(stirProgress(s, 3)).toBeCloseTo(0.5, 1);
    turn(1.5, -1);
    expect(stirProgress(s, 3)).toBe(1);
    // sát tâm (rung tay) và ngoài dụng cụ: không cộng
    const before = newStir();
    let q = before;
    for (let i = 0; i < 100; i++) q = stirStep(q, 1 + 0.02 * Math.cos(i), 2 + 0.02 * Math.sin(i), 1, 2);
    for (let i = 0; i < 100; i++) q = stirStep(q, 1 + 1.4 * Math.cos(i * 0.3), 2 + 1.4 * Math.sin(i * 0.3), 1, 2);
    expect(q.total).toBe(0);
  });

  it('bóp bóng: mỗi lần chụm rồi nhả là một nhịp, giữ chụm mãi không bơm thêm; bóng xẹp khi bóp rồi phồng lại', () => {
    let s = newSqueeze();
    for (let i = 0; i < 30; i++) s = squeezeStep(s, true, true);
    expect(s).toEqual({down: true, pumps: 0});
    s = squeezeStep(s, false, true);
    expect(s).toEqual({down: false, pumps: 1});
    s = squeezeStep(s, false, true);
    expect(s.pumps).toBe(1);
    expect(squash(true, 0, 0.2)).toBeGreaterThan(0.9);
    expect(squash(false, 1, 0.2)).toBeLessThan(0.1);
  });

  it('đặt vật: thả trong tầm của tay thì nhận, xa hơn thì không', () => {
    expect(dropped(0.15, 0.18)).toBe(true);
    expect(dropped(0.3, 0.18)).toBe(false);
    expect(OVER_R).toBeGreaterThanOrEqual(0.4);
  });

  it('dây nối võng xuống giữa hai đầu, không chui xuống bàn, hai đầu đúng chỗ', () => {
    const w = wirePath([0, 0.05, 2], [1, 0.4, 0]);
    expect(w[0]).toEqual([0, 0.05, 2]);
    expect(w[w.length - 1][0]).toBeCloseTo(1, 5);
    expect(w[w.length - 1][1]).toBeCloseTo(0.4, 5);
    expect(Math.min(...w.map((q) => q[1]))).toBeGreaterThanOrEqual(0.03);
    expect(w[10][1]).toBeLessThan(0.05 + 0.35 * 0.5); // giữa dây thấp hơn đường thẳng nối hai đầu
  });

  it('mọi bước thao tác thật dùng vật có trong bench-props.glb, đặt trong phạm vi bàn, đích đủ rộng', () => {
    const g = nodes('bench-props.glb');
    for (const n of ['slide', 'cover', 'rack', 'bottle', 'jug', 'pestle', 'rod', 'bulb', 'flask', 'disc', 'foil', 'jar', 'plug']) expect(g.has(`Prop_${n}`), n).toBe(true);
    const acts = Object.entries(BENCH_SETUP).flatMap(([id, steps]) => steps.filter((s) => s.act).map((s) => [id, s] as const));
    expect(acts.length).toBeGreaterThanOrEqual(28);
    const kinds = new Set(acts.map(([, s]) => s.act!.kind));
    expect([...kinds].sort()).toEqual(['connect', 'pour', 'place', 'press', 'squeeze', 'stir'].sort());
    for (const [id, s] of acts) {
      const a = s.act!;
      if (a.kind === 'press') continue; // bấm công tắc trên thiết bị: không có vật
      expect(g.has(`Prop_${a.prop}`), `${id}: ${a.prop}`).toBe(true);
      for (const v of [a.from[0], s.at[0]]) expect(Math.abs(v), id).toBeLessThanOrEqual(3.1);
      expect(a.from[2], `${id} vật nằm ở mép bàn phía người nhìn`).toBeGreaterThanOrEqual(1.3);
      if (a.kind === 'stir') expect(a.n ?? 3, id).toBeGreaterThanOrEqual(2);
      if (a.kind === 'pour') expect(a.color, id).toBeTruthy();
    }
  });

  it('hướng dẫn của bài nói đúng thao tác thật (rót, khuấy, bóp, đặt), không còn "cục cam" cho bước đã đổi', () => {
    const t = (id: string) => (benchManual(id)?.tools ?? []).join(' ');
    expect(t('BIO_LAB_ENZYME')).toContain('Rót');
    expect(t('BIO_LAB_DNA_EXTRACT')).toContain('Khuấy');
    expect(t('BIO_LAB_CIRCULATION')).toContain('Bóp');
    expect(t('BIO_LAB_CELL_OBSERVE')).toContain('Đặt');
  });
});
