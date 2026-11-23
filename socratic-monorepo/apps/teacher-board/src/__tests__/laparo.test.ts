import {describe, expect, it} from 'vitest';
import {ANCHOR, CLIP_X, NO_GO, PASS_SCORE, PEGS_FROM, PEGS_GOAL, TARGETS, TROCARS, lapScore, lapStep, newLap, tipOf, type LapInput, type LapState, type P3, type RightTool} from '../utils/lab/hands/laparo';
import {MANUAL} from '../utils/lab/hands/manual';
import {SUBJECT_OF} from '../utils/lab/hands/sims/catalog';

const REST: [P3, P3] = [[-2.3, 0.55, 1.6], [2.3, 0.55, 1.6]];
const frame = (s: LapState, tips: [P3, P3], grip: [boolean, boolean], right: RightTool = 'grasper', dt = 0.1): LapState => lapStep(s, {dt, tips, grip, right} as LapInput);
/** chụm rồi nhả tay `h` tại `at` */
const tap = (s: LapState, h: 0 | 1, at: P3, right: RightTool = 'grasper', other: P3 = REST[h ? 0 : 1], otherGrip = false) => {
  const tips: [P3, P3] = h ? [other, at] : [at, other];
  const down: [boolean, boolean] = h ? [otherGrip, true] : [true, otherGrip];
  const up: [boolean, boolean] = h ? [otherGrip, false] : [false, otherGrip];
  return frame(frame(frame(s, tips, up, right), tips, down, right), tips, up, right);
};

describe('điểm tựa trocar', () => {
  it('mũi đi ngược chiều tay và theo tỉ lệ phần trong / phần ngoài', () => {
    const tr = TROCARS[1];
    const a = tipOf(tr, 0.5, -0.4, 0);
    expect(a[0]).toBeCloseTo(tr[0] - 1);
    expect(a[2]).toBeCloseTo(tr[2] + 0.8);
    expect(tipOf(tr, 0, 0, 0.5)).toEqual([tr[0], 0.5, tr[2]]);
  });
});

describe('bài định vị', () => {
  it('đúng tay mới tính; sai tay là lỗi; đủ mục tiêu thì xong', () => {
    let s = tap(newLap('touch'), 1, TARGETS[0].at);
    expect(s.target).toBe(0);
    expect(s.errors.miss).toBe(1);
    for (const g of TARGETS) s = tap(s, g.hand, g.at);
    expect(s.done).toBe(true);
    expect(s.target).toBe(TARGETS.length);
  });
  it('thời gian chỉ chạy sau lần chụm đầu; rung nhỏ không cộng quãng đường', () => {
    let s = frame(newLap('touch'), REST, [false, false]);
    expect(s.t).toBe(0);
    s = frame(s, REST, [true, false]);
    expect(s.t).toBeCloseTo(0.1);
    s = frame(s, [[-2.301, 0.55, 1.6], REST[1]], [true, false]);
    expect(s.path[0]).toBe(0);
  });
  it('vào vùng cơ quan chỉ tính một lần cho tới khi ra', () => {
    const inn: P3 = [...NO_GO.at];
    let s = frame(newLap('touch'), [inn, REST[1]], [false, false]);
    s = frame(s, [inn, REST[1]], [false, false]);
    expect(s.errors.collide).toBe(1);
    s = frame(s, REST, [false, false]);
    s = frame(s, [inn, REST[1]], [false, false]);
    expect(s.errors.collide).toBe(2);
  });
});

describe('bài chuyển vòng', () => {
  const carry = (s: LapState, i: number, g: number) => {
    const from = PEGS_FROM[i];
    const mid: P3 = [0, 0.55, 0];
    s = frame(s, [from, REST[1]], [false, false]);
    s = frame(s, [from, REST[1]], [true, false]);
    s = frame(s, [mid, mid], [true, false]);
    s = frame(s, [mid, mid], [true, true]);
    s = frame(s, [REST[0], mid], [false, true]);
    s = frame(s, [REST[0], PEGS_GOAL[g]], [false, true]);
    return frame(s, [REST[0], PEGS_GOAL[g]], [false, false]);
  };
  it('nhấc, chuyển tay, đặt đủ 6 vòng thì xong', () => {
    let s = newLap('transfer');
    for (let i = 0; i < 6; i++) s = carry(s, i, i);
    expect(s.rings.every((r) => r.placed)).toBe(true);
    expect(s.done).toBe(true);
    expect(s.errors.drop).toBe(0);
  });
  it('chưa chuyển tay mà thả ở chốt là rơi vòng; chốt đã có vòng không nhận thêm', () => {
    let s = frame(newLap('transfer'), [PEGS_FROM[0], REST[1]], [false, false]);
    s = frame(s, [PEGS_FROM[0], REST[1]], [true, false]);
    s = frame(s, [PEGS_GOAL[0], REST[1]], [true, false]);
    s = frame(s, [PEGS_GOAL[0], REST[1]], [false, false]);
    expect(s.rings[0].placed).toBe(false);
    expect(s.errors.drop).toBe(1);
    let t = carry(newLap('transfer'), 0, 0);
    t = carry(t, 1, 0);
    expect(t.rings[1].placed).toBe(false);
    expect(t.errors.drop).toBe(1);
  });
});

describe('bài kẹp và cắt', () => {
  const clipAll = (s: LapState) => CLIP_X.reduce((q, x) => tap(q, 1, [x, 0.42, 0], 'clip', ANCHOR, true), s);
  it('chưa kéo căng thì chưa đặt được clip', () => {
    const s = tap(newLap('clip'), 1, [CLIP_X[0], 0.42, 0], 'clip');
    expect(s.clips[0]).toBe(false);
    expect(s.warn).toMatch(/kéo căng/);
  });
  it('đủ clip, cắt đúng đoạn thì đạt', () => {
    let s = clipAll(newLap('clip'));
    expect(s.clips.every(Boolean)).toBe(true);
    s = tap(s, 1, [-0.2, 0.42, 0], 'scissors', ANCHOR, true);
    expect(s.done).toBe(true);
    expect(s.bled).toBe(false);
    expect(lapScore(s).pass).toBe(true);
  });
  it('cắt khi thiếu clip thì chảy máu, không đạt dù nhanh', () => {
    const s = tap(newLap('clip'), 1, [-0.2, 0.42, 0], 'scissors', ANCHOR, true);
    expect(s.bled).toBe(true);
    expect(lapScore(s).safety).toBe(0);
    expect(lapScore(s).pass).toBe(false);
  });
});

describe('móc đốt và chảy máu', () => {
  const OFF: P3 = [2.9, 0.42, 1.2];
  const art: P3 = [0.6, 0.42, -0.5];
  const hold = (s: LapState, tip: P3, on: boolean, n: number) => {
    for (let i = 0; i < n; i++) s = frame(s, [ANCHOR, tip], [true, on], 'hook');
    return s;
  };
  it('đốt vào động mạch thì chảy máu; chưa cầm máu thì không kẹp được; giữ móc đốt thì cầm', () => {
    let s = hold(frame(newLap('clip'), [ANCHOR, OFF], [true, false], 'hook'), art, true, 1);
    expect(s.bleed).not.toBeNull();
    expect(s.errors.collide).toBe(1);
    s = frame(s, [ANCHOR, OFF], [true, false], 'hook');
    const loss = s.loss;
    s = frame(frame(s, [ANCHOR, [CLIP_X[0], 0.42, 0]], [true, false], 'clip'), [ANCHOR, [CLIP_X[0], 0.42, 0]], [true, true], 'clip');
    expect(s.clips[0]).toBe(false);
    expect(s.warn).toMatch(/cầm máu/);
    expect(s.loss).toBeGreaterThan(loss);
    s = frame(s, [ANCHOR, OFF], [true, false], 'hook');
    s = hold(s, art, true, 9);
    expect(s.bleed).toBeNull();
    expect(s.errors.collide).toBe(1);
    expect(lapScore({...s, done: true}).safety).toBeLessThan(32);
  });
  it('móc đốt chạm ống là lỗi một lần cho mỗi lần chạm', () => {
    const d: P3 = [1.4, 0.42, 0];
    let s = hold(frame(newLap('clip'), [ANCHOR, OFF], [true, false], 'hook'), d, true, 5);
    expect(s.errors.miss).toBe(1);
    s = hold(s, OFF, false, 1);
    s = hold(s, d, true, 2);
    expect(s.errors.miss).toBe(2);
  });
  it('mô bị kéo rách thì chảy máu và tính lỗi', () => {
    const s = lapStep(newLap('clip'), {dt: 0.1, tips: [ANCHOR, OFF], grip: [true, false], right: 'grasper', tear: [-1, 0.4, 0]});
    expect(s.bleed?.at).toEqual([-1, 0.4, 0]);
    expect(s.errors.miss).toBe(1);
  });
});

describe('chấm điểm và danh mục', () => {
  it('đạt mục tiêu được đủ điểm; chậm và nhiều lỗi thì trượt', () => {
    const good = {...newLap('touch'), done: true, t: 40, path: [10, 10] as [number, number]};
    expect(lapScore(good)).toMatchObject({total: 100, pass: true});
    const bad = {...good, t: 130, path: [40, 40] as [number, number], errors: {collide: 3, drop: 2, miss: 2}};
    expect(lapScore(bad).total).toBeLessThan(PASS_SCORE);
    expect(lapScore(bad).pass).toBe(false);
  });
  it('bài nằm ở môn Sinh và có Hướng dẫn', () => {
    expect(SUBJECT_OF.laparo).toBe('sinh');
    expect(MANUAL.laparo.steps.length).toBeGreaterThanOrEqual(4);
  });
});
