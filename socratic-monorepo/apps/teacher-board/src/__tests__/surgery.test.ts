import {describe, expect, it} from 'vitest';
import {BLEED, CHECKLIST, FIELD_OK, GAUZE_TOTAL, LAYERS, NICK_BLEED, PERI_FLUID, VITALS0, alarms, capnoAt, debrief, ecgAt, mapOf, plethAt, newSurg, peelable, surgReducer, surgStep, vitalsGoal, vitalsStep, type SAction, type SurgState} from '../utils/lab/hands/surgery';
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

describe('quy trình phòng mổ', () => {
  const sign = (s: SurgState, phase: 'signin' | 'timeout' | 'signout') => run(s, ...CHECKLIST[phase].items.map((_, i): SAction => ({t: 'check', phase, i})));
  const suck = (s: SurgState) => {
    s = run(s, {t: 'tool', tool: 'suction'});
    for (let i = 0; i < 80 && surgStep(s) === 'suction'; i++) s = run(s, {t: 'suck', dt: 0.1});
    return s;
  };
  it('chưa xong bảng kiểm thì chưa rạch được; không tick trước chặng sau', () => {
    let s = run(newSurg(true), {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 0.5});
    expect(surgStep(s)).toBe('signin');
    expect(s.incision).toBe(0);
    expect(run(s, {t: 'check', phase: 'timeout', i: 0}).checks.timeout[0]).toBe(false);
    s = sign(s, 'signin');
    expect(surgStep(s)).toBe('timeout');
    s = sign(s, 'timeout');
    expect(surgStep(s)).toBe('incise');
  });
  it('ca đủ quy trình: còn gạc thì đếm lệch và không khâu được; lấy hết mới đóng', () => {
    let s = sign(sign(newSurg(true), 'signin'), 'timeout');
    s = run(s, {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 0.4}, {t: 'nick', at: [0, 0.7, 0.3]}, {t: 'tool', tool: 'clamp'}, {t: 'clamp', ok: true}, {t: 'tool', tool: 'scalpel'}, {t: 'cut', s: 1});
    expect(s.gauze).toBe(3);
    s = suck(s);
    expect(surgStep(s)).toBe('count');
    s = run(s, {t: 'count'});
    expect(s.warn).toMatch(/lệch/);
    s = run(s, {t: 'tool', tool: 'needle'}, {t: 'sew', s: 1});
    expect(s.countErrors).toBe(1);
    expect(s.suture).toBe(0);
    s = run(s, {t: 'gauzeOut'}, {t: 'gauzeOut'}, {t: 'gauzeOut'}, {t: 'gauzeOut'}, {t: 'count'});
    expect(s.gauze).toBe(0);
    expect(s.counted).toBe(true);
    s = run(s, {t: 'sew', s: 1});
    expect(surgStep(s)).toBe('signout');
    s = sign(s, 'signout');
    expect(surgStep(s)).toBe('done');
    expect(debrief(s)).toMatch(/lệch 1 lần/);
    expect(run(s, {t: 'reset'}).protocol).toBe(true);
  });
  it('gạc không vượt số đã mở; bỏ tick được', () => {
    let s = sign(sign(newSurg(true), 'signin'), 'timeout');
    for (let i = 0; i < 8; i++) s = run(s, {t: 'nick', at: [0, 0, 0]}, {t: 'tool', tool: 'clamp'}, {t: 'clamp', ok: true});
    expect(s.gauze).toBe(GAUZE_TOTAL);
    const a = run(newSurg(true), {t: 'check', phase: 'signin', i: 1}, {t: 'check', phase: 'signin', i: 1});
    expect(a.checks.signin[1]).toBe(false);
  });
  it('monitor gây mê: EtCO₂ tụt khi sốc; sóng nằm trong dải', () => {
    let v = VITALS0;
    for (let i = 0; i < 1500; i++) v = vitalsStep(v, 0.1, NICK_BLEED);
    expect(v.etco2).toBeLessThan(25);
    expect(alarms(v)).toContain('EtCO₂ thấp');
    expect(mapOf(v)).toBeLessThan(mapOf(VITALS0));
    expect(v.rr).toBe(12);
    expect(v.temp).toBeLessThan(VITALS0.temp);
    for (let f = 0; f < 1; f += 0.01) {
      expect(Math.abs(ecgAt(f))).toBeLessThanOrEqual(1);
      expect(plethAt(f)).toBeGreaterThanOrEqual(0);
      expect(plethAt(f)).toBeLessThanOrEqual(1);
      expect(capnoAt(f)).toBeGreaterThanOrEqual(0);
      expect(capnoAt(f)).toBeLessThanOrEqual(1);
    }
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
