import {describe, expect, it} from 'vitest';
import {BLEED, FIELD_OK, LAYERS, NICK_BLEED, PERI_FLUID, VITALS0, alarms, debrief, newSurg, peelable, surgReducer, surgStep, vitalsGoal, vitalsStep, type SAction, type SurgState} from '../utils/lab/hands/surgery';
import {MANUAL} from '../utils/lab/hands/manual';
import {SUBJECT_OF} from '../utils/lab/hands/sims/catalog';

const run = (s: SurgState, ...as: SAction[]) => as.reduce(surgReducer, s);
const tick = (s: SurgState, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.1) s = surgReducer(s, {t: 'tick', dt: 0.1});
  return s;
};

describe('sinh hiệu theo mất máu', () => {
  it('không mất máu thì giữ mức nền; mất nhiều thì tim nhanh, huyết áp tụt, SpO₂ giảm', () => {
    expect(vitalsGoal(0).hr).toBeCloseTo(72);
    expect(vitalsGoal(500).hr).toBeLessThan(100);
    expect(vitalsGoal(1200).hr).toBeGreaterThan(100);
    expect(vitalsGoal(1200).sys).toBeGreaterThan(100);
    expect(vitalsGoal(2200).sys).toBeLessThan(90);
    expect(vitalsGoal(5000).spo2).toBeCloseTo(88);
  });
  it('chảy máu thì chỉ số trôi dần về mức đáp ứng; cầm máu rồi truyền dịch thì hồi phục, tổng máu mất giữ nguyên', () => {
    let v = VITALS0;
    for (let i = 0; i < 600; i++) v = vitalsStep(v, 0.1, NICK_BLEED);
    expect(v.loss).toBeCloseTo(NICK_BLEED * 60, 0);
    expect(v.hr).toBeGreaterThan(110);
    expect(alarms(v)).toContain('Nhịp nhanh');
    const lost = v.loss;
    for (let i = 0; i < 1200; i++) v = vitalsStep(v, 0.1, 0);
    expect(v.loss).toBe(lost);
    expect(v.deficit).toBe(0);
    expect(v.hr).toBeLessThan(80);
    expect(alarms(v)).toEqual([]);
  });
});

describe('ca mở màng ngoài tim', () => {
  it('đúng kĩ thuật: rạch hết → hút dịch màng ngoài tim → khâu → xong, không biến chứng', () => {
    let s = run(newSurg(), {t: 'cut', s: 0.5});
    expect(s.incision).toBe(0); // chưa cầm dao
    s = run(s, {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 0.5}, {t: 'cut', s: 0.3});
    expect(s.incision).toBe(0.5); // không lùi
    s = run(s, {t: 'cut', s: 1});
    expect(s.field).toBe(PERI_FLUID);
    expect(surgStep(s)).toBe('suction');
    s = run(s, {t: 'tool', tool: 'suction'});
    for (let i = 0; i < 20; i++) s = run(s, {t: 'suck', dt: 0.1});
    expect(s.field).toBeLessThanOrEqual(FIELD_OK);
    expect(surgStep(s)).toBe('suture');
    s = run(s, {t: 'tool', tool: 'needle'}, {t: 'sew', s: 1});
    expect(surgStep(s)).toBe('done');
    expect(debrief(s)).toMatch(/sạch/);
  });
  it('chạm động mạch vành: máu chảy, phải kẹp đúng chỗ trước khi làm tiếp; kẹp trượt thì cảnh báo', () => {
    let s = run(newSurg(), {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 0.4}, {t: 'nick', at: [0, 0.7, 0.3]});
    expect(surgStep(s)).toBe('clamp');
    expect(s.warn).toMatch(/Biến chứng/);
    s = tick(s, 10);
    expect(s.vitals.loss).toBeGreaterThan(NICK_BLEED * 9);
    expect(s.field).toBeGreaterThan(0);
    expect(s.bloody).toBeCloseTo(1);
    // cầm dao thì không cắt tiếp được (bước đang là kẹp)
    expect(run(s, {t: 'cut', s: 0.8}).incision).toBe(0.4);
    s = run(s, {t: 'tool', tool: 'clamp'}, {t: 'clamp', ok: false});
    expect(s.clamped).toBe(false);
    expect(s.warn).toMatch(/Kẹp trượt/);
    s = run(s, {t: 'clamp', ok: true});
    expect(s.clamped).toBe(true);
    const loss = s.vitals.loss;
    s = tick(s, 5);
    expect(s.vitals.loss).toBe(loss);
    expect(['suction', 'incise']).toContain(surgStep(s));
    expect(debrief(s)).toMatch(/1 biến chứng/);
  });
  it('cắt vào tĩnh mạch: rỉ chậm hơn động mạch, vẫn phải kẹp', () => {
    let s = run(newSurg(), {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 0.3}, {t: 'nick', at: [0, 0.7, 0.3], vessel: 'vein'});
    expect(s.vessel).toBe('vein');
    expect(s.warn).toMatch(/tĩnh mạch/);
    expect(surgStep(s)).toBe('clamp');
    s = tick(s, 10);
    expect(s.vitals.loss).toBeGreaterThan(BLEED.vein * 9);
    expect(s.vitals.loss).toBeLessThan(BLEED.artery * 9);
  });
  it('sai dụng cụ thì nhắc đúng dụng cụ cần', () => {
    const s = run(newSurg(), {t: 'tool', tool: 'needle'}, {t: 'wrong'});
    expect(s.warn).toMatch(/dao mổ/);
  });
});

describe('bóc lớp và danh mục', () => {
  it('bóc từ ngoài vào: lớp tiếp theo và lớp vừa bóc', () => {
    expect(LAYERS.map((l) => l.id)).toEqual(['peri', 'cor', 'wall', 'valves']);
    expect(peelable(0)).toEqual({next: 0, back: null});
    expect(peelable(2)).toEqual({next: 2, back: 1});
    expect(peelable(4)).toEqual({next: null, back: 3});
  });
  it('bài nằm ở môn Sinh và có Hướng dẫn', () => {
    expect(SUBJECT_OF['heart-surgery']).toBe('sinh');
    expect(MANUAL['heart-surgery'].steps.length).toBeGreaterThanOrEqual(5);
  });
});
