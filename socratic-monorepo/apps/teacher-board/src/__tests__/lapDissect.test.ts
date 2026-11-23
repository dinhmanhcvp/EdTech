import {describe, expect, it} from 'vitest';
import {BAND, BAND_A, BAND_B, BAND_LEN, MEMB, WINDOW, bandUV, bandXZ, burnCells, clearedIn, columnCleared, firstAlive, newCells, pruneIslands} from '../utils/lab/hands/lapDissect';
import {ANCHOR, ART_CLIP_X, ART_CUT_X, CHOLE_PHASES, CLIP_X, PASS_SCORE, lapScore, lapStep, newLap, trocarsOf, type LapState, type P3, type RightTool} from '../utils/lab/hands/laparo';

const OFF: P3 = [2.6, 0.6, 1.3];
const frame = (s: LapState, tip: P3, on: boolean, right: RightTool, left: P3 = ANCHOR, lg = true) => lapStep(s, {dt: 0.05, tips: [left, tip], grip: [lg, on], right});
const tap = (s: LapState, tip: P3, right: RightTool) => frame(frame(frame(s, tip, false, right), tip, true, right), tip, false, right);
const sweepWindow = (s: LapState) => {
  for (let z = WINDOW.z0 + 0.03; z < WINDOW.z1 + 0.02 && s.phase === 'expose'; z += 0.05) for (let x = WINDOW.x0; x <= WINDOW.x1 && s.phase === 'expose'; x += 0.05) s = frame(s, [x, 0.45, z], true, 'hook');
  return frame(s, OFF, false, 'hook');
};
const doDuct = (s: LapState) => {
  for (const x of CLIP_X) s = tap(s, [x, 0.42, 0], 'clip');
  return tap(s, [-0.2, 0.42, 0], 'scissors');
};
const doArtery = (s: LapState) => {
  for (const x of ART_CLIP_X) s = tap(s, [x, 0.42, -0.49], 'clip');
  return tap(s, [(ART_CUT_X[0] + ART_CUT_X[1]) / 2, 0.42, -0.49], 'scissors');
};
const sweepBand = (s: LapState) => {
  for (let u = 0; u <= BAND_LEN + 0.02 && !s.done; u += 0.05)
    for (let v = -0.18; v <= 0.18 && !s.done; v += 0.06) {
      const [x, z] = bandXZ(u, v);
      s = frame(s, [x, 0.5, z], true, 'hook');
    }
  return s;
};

describe('lưới ô', () => {
  it('đốt chỉ xóa ô trong bán kính và không đổi mảng khi không có gì để xóa', () => {
    const c = newCells(MEMB);
    const a = burnCells(c, MEMB, 0, -0.3, 0.12);
    expect(a).not.toBe(c);
    expect(c.every((v) => v === 1)).toBe(true);
    expect(a.filter((v) => !v).length).toBeGreaterThan(4);
    expect(burnCells(a, MEMB, 0, -0.3, 0.12)).toBe(a);
    expect(burnCells(c, MEMB, 40, 40, 0.1)).toBe(c);
  });
  it('mảnh bị khoét tách khỏi mép thì rơi đi, phần còn dính thì giữ', () => {
    const g = {x0: 0, z0: 0, dx: 1, dz: 1, nx: 7, nz: 7};
    const c = newCells(g);
    for (let i = 1; i < 6; i++) for (const j of [1, 5]) c[i + j * 7] = 0;
    for (let j = 1; j < 6; j++) for (const i of [1, 5]) c[i + j * 7] = 0;
    const p = pruneIslands(c, g);
    expect(p[3 + 3 * 7]).toBe(0);
    expect(p[0]).toBe(1);
    const kept = newCells(g);
    expect(pruneIslands(kept, g)).toBe(kept);
  });
  it('đổi toạ độ dải đi và về khớp nhau; v dương ở phía gan', () => {
    const [x, z] = bandXZ(1.1, 0.13);
    const [u, v] = bandUV(x, z);
    expect(u).toBeCloseTo(1.1);
    expect(v).toBeCloseTo(0.13);
    expect(bandUV(...BAND_A)[0]).toBeCloseTo(0);
    expect(bandUV(...BAND_B)[0]).toBeCloseTo(BAND_LEN);
    expect(bandXZ(1, 0.3)[1]).toBeLessThan(bandXZ(1, 0)[1]);
  });
  it('tỉ lệ đã mở và điểm làm tiếp', () => {
    const c = newCells(BAND);
    expect(clearedIn(c, BAND)).toBe(0);
    for (let j = 0; j < BAND.nz; j++) c[j * BAND.nx] = 0;
    expect(columnCleared(c, BAND, 0)).toBe(1);
    expect(firstAlive(c, BAND)?.[0]).toBeCloseTo(BAND.dx * 1.5);
  });
});

describe('ca cắt túi mật', () => {
  it('đi đủ bốn chặng theo đúng thứ tự và đạt', () => {
    let s = newLap('chole');
    expect(s.phase).toBe('expose');
    s = sweepWindow(s);
    expect(s.phase).toBe('duct');
    s = doDuct(s);
    expect(s.phase).toBe('artery');
    expect(s.done).toBe(false);
    s = doArtery(s);
    expect(s.phase).toBe('bed');
    s = sweepBand(s);
    expect(s.done).toBe(true);
    expect(s.errors).toEqual({collide: 0, drop: 0, miss: 0});
    expect(s.loss).toBe(0);
    expect(lapScore({...s, t: 60, path: [10, 10]}).pass).toBe(true);
    expect(PASS_SCORE).toBeGreaterThan(0);
    expect(CHOLE_PHASES.map((p) => p.id)).toEqual(['expose', 'duct', 'artery', 'bed']);
  });
  it('chưa mở cửa sổ an toàn thì không kẹp được ống', () => {
    const s = tap(newLap('chole'), [CLIP_X[0], 0.42, 0], 'clip');
    expect(s.clips.some(Boolean)).toBe(false);
    expect(s.phase).toBe('expose');
  });
  it('kéo cắt động mạch khi chưa đủ clip thì chảy máu; cầm xong mới làm tiếp', () => {
    let s = doDuct(sweepWindow(newLap('chole')));
    s = tap(s, [(ART_CUT_X[0] + ART_CUT_X[1]) / 2, 0.42, -0.49], 'scissors');
    expect(s.bleed).not.toBeNull();
    expect(s.artCut).toBe(false);
    const blocked = tap(s, [ART_CLIP_X[0], 0.42, -0.49], 'clip');
    expect(blocked.artClips[0]).toBe(false);
    const at = s.bleed!.at;
    for (let i = 0; i < 20; i++) s = frame(s, at, true, 'hook');
    expect(s.bleed).toBeNull();
    s = frame(s, OFF, false, 'hook');
    s = doArtery(s);
    expect(s.phase).toBe('bed');
  });
  it('đốt lấn sâu vào gan là lỗi một lần cho mỗi lần lấn và gây rỉ máu', () => {
    let s = doArtery(doDuct(sweepWindow(newLap('chole'))));
    const [x, z] = bandXZ(1, 0.42);
    s = frame(frame(s, [x, 0.5, z], true, 'hook'), [x, 0.5, z], true, 'hook');
    expect(s.errors.miss).toBe(1);
    expect(s.bleed).not.toBeNull();
  });
  it('vùng va chạm động mạch đi theo mô khi bị kéo', () => {
    const moved: [number, number][] = [[3, 0.5], [-3, 0.5]];
    const s = lapStep(newLap('chole'), {dt: 0.05, tips: [ANCHOR, [0.3, 0.45, 0.5]], grip: [true, true], right: 'hook', arteryNow: moved});
    expect(s.bleed).not.toBeNull();
    const rest = lapStep(newLap('chole'), {dt: 0.05, tips: [ANCHOR, [0.3, 0.45, -0.5]], grip: [true, true], right: 'hook', arteryNow: moved});
    expect(rest.bleed).toBeNull();
  });
  it('hai cổng làm việc với tới cả túi mật', () => {
    expect(trocarsOf('chole')[1][0]).toBeLessThan(trocarsOf('clip')[1][0]);
  });
});
