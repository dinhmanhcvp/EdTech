import {describe, expect, it} from 'vitest';
import {ACT_SAFE, CABG_BRIEF, CABG_STEPS, PLEGIA_TIME, STITCHES, cabgDebrief, cabgReducer, cabgStep, cabgTool, cabgVitals, newCabg, type CabgAction, type CabgState} from '../utils/lab/hands/cabg';

const run = (s: CabgState, ...as: CabgAction[]) => as.reduce(cabgReducer, s);
const wait = (s: CabgState, sec: number) => {
  for (let t = 0; t < sec; t += 0.1) s = cabgReducer(s, {t: 'tick', dt: 0.1});
  return s;
};
const briefed = () => run(newCabg(), ...CABG_BRIEF.map((_, i) => ({t: 'brief', i}) as CabgAction));
const plegia = (s: CabgState) => {
  for (let t = 0; t <= PLEGIA_TIME + 0.2; t += 0.1) s = cabgReducer(s, {t: 'plegia', dt: 0.1});
  return s;
};
/** đi đúng toàn ca */
const fullCase = () => {
  let s = run(briefed(), {t: 'heparin'});
  s = wait(s, 6);
  s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'pumpOn'});
  s = wait(s, 2);
  s = run(s, {t: 'place', at: 'clamp', ok: true}, {t: 'place', at: 'root', ok: true});
  s = plegia(s);
  s = wait(s, 3);
  s = run(s, {t: 'cut', s: 0.5}, {t: 'cut', s: 1});
  for (let i = 0; i < STITCHES; i++) s = cabgReducer(s, {t: 'stitch', ok: true});
  s = run(s, {t: 'remove', at: 'clamp'}, {t: 'shock'}, {t: 'wean'}, {t: 'remove', at: 'ra'}, {t: 'protamine'}, {t: 'remove', at: 'ao'}, {t: 'flow'});
  return s;
};

describe('ca bắc cầu động mạch vành LIMA–LAD', () => {
  it('đủ 16 bước theo đúng trình tự của ca mổ thật; dụng cụ khớp từng bước', () => {
    expect(CABG_STEPS.map((x) => x.id)).toEqual(['brief', 'heparin', 'cannAo', 'cannRa', 'pumpOn', 'xclamp', 'plegia', 'arteriotomy', 'anast', 'unclamp', 'defib', 'wean', 'decanRa', 'protamine', 'decanAo', 'flow']);
    expect(cabgTool('cannAo')).toBe('cannula');
    expect(cabgTool('xclamp')).toBe('clamp');
    expect(cabgTool('arteriotomy')).toBe('scalpel');
    expect(cabgTool('anast')).toBe('needle');
    expect(cabgTool('pumpOn')).toBeNull();
  });

  it('đi đúng thì xong, không lỗi, cầu nối thông tốt', () => {
    const s = fullCase();
    expect(cabgStep(s)).toBe('done');
    expect(s.errors).toBe(0);
    expect(s.flow!.q).toBeGreaterThanOrEqual(20);
    expect(s.flow!.pi).toBeLessThanOrEqual(5);
    expect(s.cpbT).toBeGreaterThan(0);
    expect(s.xclampT).toBeGreaterThan(0);
    expect(cabgDebrief(s)).toContain('miệng nối thông tốt');
  });

  it('heparin: chưa đủ ACT thì không được đặt ống (lỗi, không đặt)', () => {
    let s = run(briefed(), {t: 'heparin'});
    s = run(s, {t: 'place', at: 'ao', ok: true});
    expect(s.cannAo).toBe(false);
    expect(s.errors).toBe(1);
    s = wait(s, 6);
    expect(s.act).toBeGreaterThanOrEqual(ACT_SAFE);
    expect(cabgStep(s)).toBe('cannAo');
  });

  it('máy tim phổi: huyết áp thành dòng liên tục, ngừng thở máy, EtCO₂ về 0; cai máy thì đập lại và thở lại', () => {
    let s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true});
    expect(cabgVitals(s).pulsatile).toBe(true);
    s = run(s, {t: 'pumpOn'});
    const v = cabgVitals(s);
    expect(v.pulsatile).toBe(false);
    expect(v.vent).toBe(false);
    expect(v.etco2).toBe(0);
    expect(v.pumpFlow).toBeGreaterThan(3);
    const end = fullCase();
    expect(cabgVitals(end).pulsatile).toBe(true);
    expect(cabgVitals(end).vent).toBe(true);
  });

  it('kẹp động mạch chủ khi chưa lên máy là lỗi nặng; liệt tim khi chưa kẹp là lỗi', () => {
    let s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'place', at: 'clamp', ok: true});
    expect(s.xclamp).toBe(false);
    expect(s.errors).toBe(1);
    s = run(s, {t: 'pumpOn'}, {t: 'place', at: 'root', ok: true});
    expect(s.errors).toBe(2);
  });

  it('liệt tim: nhịp chậm dần rồi ngừng; tim còn đập thì không mở được động mạch vành', () => {
    let s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'pumpOn'}, {t: 'place', at: 'clamp', ok: true});
    s = cabgReducer(s, {t: 'plegia', dt: PLEGIA_TIME / 2});
    expect(s.rhythm).toBe('slowing');
    expect(s.hr).toBeLessThan(78);
    s = run(s, {t: 'cut', s: 1});
    expect(s.arteriotomy).toBe(0);
    s = plegia(s);
    expect(s.rhythm).toBe('arrest');
    expect(cabgVitals(s).hr).toBe(0);
  });

  it('thả kẹp → rung thất; cai máy khi còn rung thất là lỗi; sốc điện về nhịp xoang', () => {
    let s = fullCase();
    s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'pumpOn'}, {t: 'place', at: 'clamp', ok: true});
    s = plegia(s);
    s = run(s, {t: 'cut', s: 1});
    for (let i = 0; i < STITCHES; i++) s = cabgReducer(s, {t: 'stitch', ok: true});
    s = run(s, {t: 'remove', at: 'clamp'});
    expect(s.rhythm).toBe('vf');
    expect(cabgStep(s)).toBe('defib');
    const e = s.errors;
    s = run(s, {t: 'wean'});
    expect(s.errors).toBe(e + 1);
    expect(s.pump).toBe(true);
    s = run(s, {t: 'shock'});
    expect(s.rhythm).toBe('sinus');
  });

  it('mũi khâu lệch làm giảm lưu lượng và tăng PI của cầu nối', () => {
    let s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'pumpOn'}, {t: 'place', at: 'clamp', ok: true});
    s = plegia(s);
    s = run(s, {t: 'cut', s: 1}, {t: 'stitch', ok: false}, {t: 'stitch', ok: false}, {t: 'stitch', ok: false});
    for (let i = 0; i < STITCHES; i++) s = cabgReducer(s, {t: 'stitch', ok: true});
    s = run(s, {t: 'remove', at: 'clamp'}, {t: 'shock'}, {t: 'wean'}, {t: 'remove', at: 'ra'}, {t: 'protamine'}, {t: 'remove', at: 'ao'}, {t: 'flow'});
    expect(s.misses).toBe(3);
    expect(s.flow!.q).toBeLessThan(20);
    expect(cabgDebrief(s)).toContain('làm lại miệng nối');
  });

  it('rút ống: tĩnh mạch trước, protamine, động mạch sau cùng', () => {
    let s = fullCase();
    expect(s.cannAo || s.cannRa).toBe(false);
    s = run(briefed(), {t: 'heparin'});
    s = wait(s, 6);
    s = run(s, {t: 'place', at: 'ao', ok: true}, {t: 'place', at: 'ra', ok: true}, {t: 'pumpOn'}, {t: 'place', at: 'clamp', ok: true});
    s = plegia(s);
    s = run(s, {t: 'cut', s: 1});
    for (let i = 0; i < STITCHES; i++) s = cabgReducer(s, {t: 'stitch', ok: true});
    s = run(s, {t: 'remove', at: 'clamp'}, {t: 'shock'}, {t: 'wean'});
    const e = s.errors;
    s = run(s, {t: 'remove', at: 'ao'});
    expect(s.cannAo).toBe(true);
    expect(s.errors).toBe(e + 1);
  });
});
