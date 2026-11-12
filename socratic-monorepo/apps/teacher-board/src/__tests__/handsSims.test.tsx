import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {HandsLab} from '../engines/families/HandsLab';
import {SIMS} from '../utils/lab/hands/sims';
import {condensateFraction, criticalT} from '../utils/lab/hands/sims/bec';
import {chirpMass, freqAt, match, snr} from '../utils/lab/hands/sims/ligo';
import {fringe, speed, visibility, wavelength} from '../utils/lab/hands/sims/matterwave';
import {fromUnit, initial, toUnit} from '../utils/lab/hands/sims/types';
import {PMSM, TIT_MAX, brayton, crackAt, fatigue, foc, harmonic, oregonator, quadruped, schmidt, shock, slam, stirling, surgery} from '../utils/lab/hands/sims/advanced';
import {EM, H_EV, THOMSON, backFraction, balance, beam, closest, collide, differential, fallPos, fallTime, photoCurrent, scatterAngle, stopU, terminal} from '../utils/lab/hands/sims/thptPhys';
import {LANES, alkali, bleach, cross, migrate, no2, titrationPH} from '../utils/lab/hands/sims/thptChemBio';

afterEach(cleanup);

describe('bài mô phỏng thanh trượt: khung chung', () => {
  it('mỗi bài: giá trị mẫu thì đạt, giá trị ban đầu thì chưa đạt, thang trượt đổi qua lại đúng, bảng điều khiển hiện kết quả', () => {
    for (const s of SIMS) {
      expect(s.evaluate(s.solution).ok, `${s.id} mẫu`).toBe(true);
      expect(s.evaluate(initial(s)).ok, `${s.id} ban đầu`).toBe(false);
      for (const p of s.params) {
        expect(fromUnit(p, toUnit(p, p.init))).toBeCloseTo(p.init, 6);
        expect(fromUnit(p, 0)).toBeCloseTo(p.min, 9);
        expect(fromUnit(p, 1)).toBeCloseTo(p.max, 9);
      }
      const r = render(<HandsLab experiment={s.id as never} />);
      expect(r.getByTestId('sim-status').getAttribute('data-ok')).toBe('false');
      fireEvent.click(r.getByTestId('sim-sample'));
      expect(r.getByTestId('sim-status').getAttribute('data-ok'), s.id).toBe('true');
      fireEvent.click(r.getByTestId('sim-reset'));
      expect(r.getByTestId('sim-status').getAttribute('data-ok')).toBe('false');
      cleanup();
    }
  });
});

describe('giao thoa phân tử C60', () => {
  it('λ = h/(mv): C60 ở 900 K cho cỡ vài pm; nặng hơn hoặc nóng hơn thì λ nhỏ hơn; vân λL/d cỡ chục µm', () => {
    const lam = wavelength(900, 720);
    expect(speed(900, 720)).toBeGreaterThan(150);
    expect(speed(900, 720)).toBeLessThan(200);
    expect(lam * 1e12).toBeGreaterThan(2);
    expect(lam * 1e12).toBeLessThan(4);
    expect(wavelength(900, 840)).toBeLessThan(lam);
    expect(wavelength(1100, 720)).toBeLessThan(lam);
    expect(fringe(900, 720) * 1e6).toBeGreaterThan(20);
    expect(fringe(900, 720) * 1e6).toBeLessThan(50);
  });
  it('khí dư làm mờ vân: áp suất càng cao độ tương phản càng thấp', () => {
    expect(visibility(1e-10)).toBeGreaterThan(0.99);
    expect(visibility(1e-8)).toBeGreaterThan(0.6);
    expect(visibility(1e-6)).toBeLessThan(0.01);
  });
});

describe('LIGO: lọc khớp mẫu', () => {
  it('khối lượng chirp của 36 + 29 M☉ ≈ 28; tần số 0,2 s trước sáp nhập ≈ 34 Hz và tăng dần', () => {
    expect(chirpMass(36, 29)).toBeCloseTo(28.1, 1);
    expect(freqAt(0.2, 36, 29)).toBeCloseTo(34.3, 0);
    expect(freqAt(0.01, 36, 29)).toBeGreaterThan(freqAt(0.2, 36, 29));
    expect(freqAt(0.01, 36, 29)).toBeLessThan(freqAt(0.003, 36, 29));
  });
  it('mẫu đúng khớp 100 %; sai nhiều thì khớp rất thấp; cặp khác khối lượng nhưng cùng chirp vẫn khớp gần hoàn toàn; ρ giảm theo nhiễu', () => {
    expect(match(36, 29)).toBeCloseTo(1, 6);
    expect(match(20, 20)).toBeLessThan(0.3);
    expect(match(40, 26)).toBeGreaterThan(0.99);
    expect(snr(36, 29, 1)).toBeCloseTo(24, 4);
    expect(snr(36, 29, 3)).toBeCloseTo(8, 4);
    expect(snr(36, 29, 4)).toBeLessThan(8);
  });
});

describe('ngưng tụ Bose–Einstein', () => {
  it('T_c của 2·10⁵ nguyên tử trong bẫy 100 Hz ≈ 264 nK; tăng theo N^(1/3) và theo tần số bẫy; tỉ lệ ngưng tụ 1 − (T/T_c)³', () => {
    expect(criticalT(2e5, 100)).toBeGreaterThan(255);
    expect(criticalT(2e5, 100)).toBeLessThan(275);
    expect(criticalT(8e5, 100) / criticalT(1e5, 100)).toBeCloseTo(2, 6);
    expect(criticalT(2e5, 200) / criticalT(2e5, 100)).toBeCloseTo(2, 6);
    expect(condensateFraction(0, 300)).toBe(1);
    expect(condensateFraction(150, 300)).toBeCloseTo(0.875, 10);
    expect(condensateFraction(300, 300)).toBe(0);
    expect(condensateFraction(500, 300)).toBe(0);
  });
});

describe('bài THPT: Vật lí – Công nghệ', () => {
  it('va chạm: động lượng luôn bảo toàn; đàn hồi cùng khối lượng thì xe 1 dừng; va chạm mềm mất nửa động năng', () => {
    for (const e of [0, 0.4, 1]) {
      const c = collide(0.2, 0.3, 0.6, e);
      expect(0.2 * c.u1 + 0.3 * c.u2).toBeCloseTo(0.2 * 0.6, 12);
      expect((c.u2 - c.u1) / 0.6).toBeCloseTo(e, 12);
    }
    expect(collide(0.2, 0.2, 0.6, 1)).toMatchObject({u1: 0, u2: 0.6});
    expect(collide(0.2, 0.2, 0.6, 0).lost).toBeCloseTo(0.5, 12);
  });
  it('Thomson: tại điểm cân bằng v = E/B và e/m ra 1,76·10¹¹ C/kg; không có từ trường thì tia lệch về phía lực điện', () => {
    const s = THOMSON.solution;
    const b = beam(s.U, s.I, s.Ua);
    expect(b.E / b.B).toBeCloseTo(b.v, 0);
    expect(b.em / EM).toBeCloseTo(1, 9);
    expect(Math.abs(b.y)).toBeLessThan(1e-9);
    expect(beam(200, 0, 3000).y).toBeGreaterThan(0.005);
    expect(beam(200, 2, 3000).y).toBeLessThan(0);
  });
  it('hãm từ: ống xẻ hết thì rơi tự do 0,45 s; ống dẫn điện tốt và dày thì rơi chậm; vận tốc không vượt vận tốc giới hạn', () => {
    expect(fallTime(terminal(58, 3, 100))).toBeCloseTo(Math.sqrt(2 / 9.81), 6);
    expect(fallTime(terminal(58, 2, 0))).toBeGreaterThan(9);
    expect(fallTime(terminal(35, 1, 0))).toBeLessThan(fallTime(terminal(58, 1, 0)));
    expect(fallTime(terminal(58, 1, 50))).toBeLessThan(fallTime(terminal(58, 1, 0)));
    const vt = terminal(58, 2, 0);
    expect(fallPos(vt, 5) - fallPos(vt, 4)).toBeCloseTo(vt, 6);
  });
  it('quang điện: U_h = hf/e − A/e; dưới giới hạn thì không có dòng; hệ số góc cho h', () => {
    expect(stopU(7, 2.1)).toBeCloseTo(0.795, 3);
    expect(stopU(4, 2.1)).toBe(0);
    expect(photoCurrent(4, 2.1, 0)).toBe(0);
    expect(photoCurrent(7, 2.1, 0)).toBe(1);
    expect(photoCurrent(7, 2.1, 1)).toBe(0);
    expect((stopU(10, 2.1) - stopU(8, 2.1)) / 2e14).toBeCloseTo(H_EV, 20);
  });
  it('Rutherford: vàng 5 MeV dừng cách tâm ≈ 45,5 fm; b = d/2 lệch đúng 90°; bật ngược chỉ cỡ 1 trên vài chục nghìn hạt', () => {
    expect(closest(79, 5)).toBeCloseTo(45.5, 1);
    expect(scatterAngle(79, 5, closest(79, 5) / 2)).toBeCloseTo(90, 9);
    expect(scatterAngle(79, 5, 300)).toBeLessThan(10);
    expect(scatterAngle(13, 5, 10)).toBeLessThan(scatterAngle(79, 5, 10));
    expect(1 / backFraction(79, 5)).toBeGreaterThan(1e4);
    expect(1 / backFraction(79, 5)).toBeLessThan(1e5);
  });
  it('vi sai: trung bình hai bánh bằng tốc độ vỏ; vào cua bánh ngoài nhanh hơn; sa lầy thì vi sai mở bó tay, khoá thì thoát', () => {
    for (const d of [differential(8, 1, 0), differential(100, 0.1, 0), differential(8, 0.1, 1)]) expect((d.wl + d.wr) / 2).toBeCloseTo(1, 12);
    expect(differential(8, 1, 0)).toMatchObject({wl: 0.9, wr: 1.1, stuck: false});
    expect(differential(100, 0.1, 0)).toMatchObject({stuck: true, wl: 2, wr: 0});
    expect(differential(100, 0.1, 1).stuck).toBe(false);
  });
  it('PID: K_p nhỏ thì ngã; chỉ P thì lắc; PD đứng nhưng còn lệch tĩnh; thêm I thì hết lệch', () => {
    expect(balance(5, 0, 0).fell).toBe(true);
    const p = balance(60, 0, 0);
    expect(p.fell || p.err > 0.03).toBe(true);
    const pd = balance(60, 0, 8);
    expect(pd.fell).toBe(false);
    expect(pd.err).toBeCloseTo(1.5 / (60 - 32.7), 2);
    const pid = balance(60, 40, 8);
    expect(pid.fell).toBe(false);
    expect(pid.err).toBeLessThan(0.002);
    expect(pid.th[0]).toBeCloseTo(0.1, 2);
  });
});

describe('bài THPT: Hóa – Sinh', () => {
  it('clo khô không tẩy màu; clo ẩm đậm đặc tẩy gần hết trong 2 s', () => {
    expect(bleach(0, 100, 30)).toBe(0);
    expect(bleach(100, 100, 2)).toBeGreaterThan(0.94);
    expect(bleach(50, 100, 2)).toBeLessThan(bleach(100, 100, 2));
  });
  it('kim loại kiềm: mạnh dần từ Li tới Cs; mẩu to thì cháy nổ; số mol và pH đúng', () => {
    expect([1, 2, 3, 4, 5].map((m) => alkali(m, 4).level)).toEqual([0, 1, 2, 3, 3]);
    expect(alkali(2, 10).level).toBe(2);
    expect(alkali(2, 20).level).toBe(3);
    const a = alkali(2, 4);
    expect(a.mol * 1000).toBeCloseTo(1.415, 2);
    expect(a.pH).toBeCloseTo(11.45, 1);
  });
  it('NO₂ ⇌ N₂O₄: nóng lên thì nâu hơn, nén hoặc làm lạnh thì nhạt đi; K_p thoả 4α²P/(1 − α²)', () => {
    expect(no2(25, 1).Kp).toBeCloseTo(0.148, 6);
    expect(no2(80, 1).x).toBeGreaterThan(no2(25, 1).x);
    expect(no2(0, 1).x).toBeLessThan(no2(25, 1).x);
    expect(no2(25, 5).x).toBeLessThan(no2(25, 1).x);
    const q = no2(60, 2);
    expect((4 * q.alpha ** 2 * 2) / (1 - q.alpha ** 2)).toBeCloseTo(q.Kp, 9);
  });
  it('chuẩn độ: pH 1 lúc đầu, 7 tại điểm tương đương, bước nhảy 4 → 10 quanh ±0,04 mL', () => {
    expect(titrationPH(0, 0.1)).toBeCloseTo(1, 9);
    expect(titrationPH(20, 0.1)).toBe(7);
    expect(titrationPH(19.96, 0.1)).toBeCloseTo(4, 1);
    expect(titrationPH(20.04, 0.1)).toBeCloseTo(10, 1);
    expect(titrationPH(10, 0.2)).toBe(7);
  });
  it('điện di: đoạn ngắn đi xa hơn; quãng đường tỉ lệ V·t; gel đặc thì chậm; hiện trường trùng nghi phạm 2', () => {
    expect(migrate(100, 100, 27, 1)).toBeGreaterThan(migrate(3000, 100, 27, 1));
    expect(migrate(600, 100, 20, 1)).toBeCloseTo(migrate(600, 50, 40, 1), 12);
    expect(migrate(600, 100, 20, 2)).toBeCloseTo(migrate(600, 100, 20, 1) / 2, 12);
    expect(LANES[1][1]).toEqual(LANES[3][1]);
    expect(LANES[1][1]).not.toEqual(LANES[2][1]);
  });
  it('Morgan: bốn lớp cộng lại đủ số ruồi; lặp lại được; đếm nhiều thì f về gần 17 % và sai số nhỏ đi', () => {
    for (const n of [20, 300, 2300]) {
      const c = cross(n, 17);
      expect(c.counts.reduce((a, b) => a + b, 0)).toBe(n);
      expect(c.counts.every((x) => x >= 0)).toBe(true);
      expect(cross(n, 17)).toEqual(c);
    }
    const big = cross(5000, 17);
    expect(Math.abs(big.est - 0.17)).toBeLessThan(0.02);
    expect(big.se).toBeLessThan(cross(200, 17).se);
  });
});

describe('bài đỉnh cao còn lại (mô hình rút gọn)', () => {
  it('Brayton: nghèo quá thì tắt lửa, giàu quá thì quá nhiệt, ga lớn thì lực đẩy lớn', () => {
    expect(brayton(100, 7)).toMatchObject({flameout: true, thrust: 0});
    expect(brayton(100, 30).T4).toBeGreaterThan(TIT_MAX);
    const full = brayton(100, 22);
    expect(full.hot).toBe(false);
    expect(full.thrust).toBeGreaterThan(250);
    expect(full.thrust).toBeLessThan(330);
    expect(brayton(30, 22).thrust).toBeLessThan(full.thrust);
  });
  it('FOC: trên tốc độ định mức thì thiếu điện áp nếu i_d = 0; i_d âm hạ điện áp cần và thêm mô-men từ trở', () => {
    expect(foc(6000, 40, 0).V).toBeLessThan(PMSM.Vmax);
    expect(foc(12000, 40, 0).V).toBeGreaterThan(PMSM.Vmax);
    const fw = foc(12000, 40, -80);
    expect(fw.V).toBeLessThan(PMSM.Vmax);
    expect(fw.torque).toBeCloseTo(15.84, 2);
    expect(foc(12000, 40, 0).torque).toBeCloseTo(12, 6);
  });
  it('Stirling: công suất tỉ lệ áp suất nạp; H₂ hơn không khí; vòng P–V khép kín', () => {
    expect(stirling(100, 800, 4).power / stirling(1, 800, 4).power).toBeCloseTo(100, 6);
    expect(stirling(50, 600, 4).power).toBeGreaterThan(stirling(50, 600, 1).power);
    expect(stirling(1, 400, 1).power).toBeLessThan(50);
    expect(schmidt(600, 0)[1]).toBeCloseTo(schmidt(600, 2 * Math.PI)[1], 9);
    expect(schmidt(600, 0)[1]).not.toBeCloseTo(schmidt(600, Math.PI)[1], 3);
  });
  it('Harmonic Drive: 200 răng cho 100:1; quá 130 % tải thì trượt răng', () => {
    expect(harmonic(200, 3000, 50)).toMatchObject({ratio: 100, out: 30, ratchet: false});
    expect(harmonic(201, 3000, 140)).toMatchObject({Z: 202, ratchet: true});
  });
  it('mỏi: giảm nửa ứng suất thì tuổi thọ tăng ít nhất 8 lần; vết nứt lớn dần tới a_c; titan bền hơn nhôm', () => {
    const a = fatigue(200, 2, 1);
    expect(a.cycles).toBeGreaterThan(4000);
    expect(a.cycles).toBeLessThan(7000);
    expect(fatigue(100, 2, 1).cycles / a.cycles).toBeGreaterThan(8);
    expect(fatigue(200, 2, 3).cycles).toBeGreaterThan(a.cycles);
    expect(crackAt(200, 2, 1, 0)).toBeCloseTo(0.002, 9);
    expect(crackAt(200, 2, 1, a.cycles / 2)).toBeGreaterThan(0.002);
    expect(crackAt(200, 2, 1, a.cycles * 2)).toBeCloseTo(a.ac, 9);
  });
  it('sóng xung kích: Mach 3, nêm 20° cho β ≈ 37,8° và áp suất ×3,77; Mach 2 góc Mach 30°; mũi tù thì sóng tách', () => {
    const s = shock(3, 20);
    expect((s.beta! * 180) / Math.PI).toBeCloseTo(37.8, 0);
    expect(s.pr).toBeCloseTo(3.77, 1);
    expect((shock(2, 5).mu * 180) / Math.PI).toBeCloseTo(30, 6);
    expect(shock(1.5, 30)).toMatchObject({detached: true, beta: null});
    expect(shock(0.9, 20).pr).toBe(1);
  });
  it('robot chân: mặt băng thì trượt, thân cao thì lật; phẫu thuật: thu nhỏ và lọc run giảm sai lệch; SLAM: đóng vòng lặp kéo sai số xuống', () => {
    expect(quadruped(0.05, 0.25, 60)).toMatchObject({slip: true, tip: false});
    expect(quadruped(0.8, 0.4, 60)).toMatchObject({slip: false, tip: true});
    expect(quadruped(0.8, 0.25, 60)).toMatchObject({slip: false, tip: false});
    expect(surgery(1, 0, 20).err).toBeCloseTo(0.6, 9);
    expect(surgery(10, 80, 20).err).toBeCloseTo(0.02, 9);
    expect(surgery(10, 80, 200).err).toBeGreaterThan(0.05);
    expect(slam(3, 100, 500, 0).err).toBeCloseTo(3, 9);
    expect(slam(3, 100, 500, 1).err).toBeLessThan(0.1);
  });
  it('BZ: f = 1 dao động tuần hoàn, f = 3,5 và f = 0,2 thì đứng yên', () => {
    const on = oregonator(1, 0.04);
    expect(on.period).toBeGreaterThan(0);
    expect(on.amp).toBeGreaterThan(0.1);
    expect(oregonator(3.5, 0.04).period).toBe(0);
    expect(oregonator(0.2, 0.04).period).toBe(0);
  });
});

describe('nhịp POE và phân nhóm môn', () => {
  it('mọi bài mô phỏng có hướng dẫn Tự tay thử / Em sẽ thấy / Kết luận; mọi bài của phòng thuộc đúng một môn', async () => {
    const {GUIDE} = await import('../utils/lab/hands/sims/guide');
    const {SUBJECT_OF} = await import('../utils/lab/hands/sims/catalog');
    const {ALL_EXPERIMENTS} = await import('../engines/families/HandsLab');
    for (const s of SIMS) {
      const g = GUIDE[s.id];
      expect(g, s.id).toBeTruthy();
      expect(g.tryIt.length).toBeGreaterThan(10);
      expect(g.see.length).toBeGreaterThan(10);
      expect(g.why.length).toBeGreaterThan(20);
    }
    for (const [id] of ALL_EXPERIMENTS) expect(SUBJECT_OF[id], id).toBeTruthy();
  });
  it('kết luận ẩn đến khi bấm', () => {
    const r = render(<HandsLab experiment={'no2' as never} />);
    expect(r.queryByTestId('sim-why')).toBeNull();
    expect(r.getByTestId('sim-guide').textContent).toContain('Tự tay thử');
    fireEvent.click(r.getByTestId('sim-reveal'));
    expect(r.getByTestId('sim-why').textContent).toContain('Le Chatelier');
  });
});

describe('cửa sổ vi mô', () => {
  it('NO₂: số nguyên tử bảo toàn; lạnh và nén thì nhiều N₂O₄ hơn', async () => {
    const {microView} = await import('../utils/lab/hands/sims/micro');
    const atoms = (m: NonNullable<ReturnType<typeof microView>>) => m.groups.reduce((s, g) => s + g.n * (g.bond ?? 1), 0);
    const warm = microView('no2', {T: 90, P: 1})!;
    const cold = microView('no2', {T: 0, P: 3})!;
    expect(atoms(warm)).toBe(80);
    expect(atoms(cold)).toBe(80);
    const dimers = (m: typeof warm) => m.groups.find((g) => g.id === 'dimer')!.n;
    expect(dimers(cold)).toBeGreaterThan(dimers(warm));
    expect(cold.heat).toBeLessThan(warm.heat);
  });
  it('chuẩn độ: H⁺ cạn ở điểm tương đương, vượt qua thì có OH⁻; Na⁺ và Cl⁻ bằng nhau ở điểm tương đương', async () => {
    const {microView} = await import('../utils/lab/hands/sims/micro');
    const n = (m: NonNullable<ReturnType<typeof microView>>, id: string) => m.groups.find((g) => g.id === id)!.n;
    const start = microView('titration', {V: 0, cb: 0.1})!;
    const eq = microView('titration', {V: 20, cb: 0.1})!;
    const over = microView('titration', {V: 30, cb: 0.1})!;
    expect(n(start, 'h')).toBe(60);
    expect(n(start, 'oh')).toBe(0);
    expect(n(eq, 'h')).toBe(0);
    expect(n(eq, 'na')).toBe(n(eq, 'cl'));
    expect(n(over, 'oh')).toBeGreaterThan(0);
  });
  it('BEC: dưới T_c có hạt đứng yên, trên T_c thì không; tổng 60 hạt; bài không có cửa sổ vi mô trả null', async () => {
    const {microView} = await import('../utils/lab/hands/sims/micro');
    const cold = microView('bec', {T: 100, N: 2e5, f: 100})!;
    const hot = microView('bec', {T: 1000, N: 2e5, f: 100})!;
    expect(cold.groups.find((g) => g.id === 'cond')!.n).toBeGreaterThan(30);
    expect(hot.groups.find((g) => g.id === 'cond')!.n).toBe(0);
    expect(cold.groups.reduce((s, g) => s + g.n, 0)).toBe(60);
    expect(microView('ligo', {})).toBeNull();
  });
  it('bảng điều khiển: bài có cửa sổ vi mô hiện kính và số hạt; bài khác thì không', () => {
    const r = render(<HandsLab experiment={'no2' as never} />);
    expect(r.getByTestId('micro-lens')).toBeTruthy();
    expect(r.getByTestId('micro-count-dimer')).toBeTruthy();
    cleanup();
    const r2 = render(<HandsLab experiment={'ligo' as never} />);
    expect(r2.queryByTestId('micro-lens')).toBeNull();
  });
});

describe('nhóm Vật lí: thao tác trực tiếp thay thanh trượt', () => {
  it('mọi bộ phận chọn là tham số thật của bài, trong khoảng cho phép; chọn đúng bộ phận thì bài đạt', async () => {
    const {OPS, knobParams, nearestOption} = await import('../utils/lab/hands/sims/ops');
    const {SIM_BY_ID} = await import('../utils/lab/hands/sims');
    for (const [id, ops] of Object.entries(OPS)) {
      const spec = SIM_BY_ID[id];
      expect(spec, id).toBeTruthy();
      const ids = spec.params.map((p) => p.id);
      for (const pick of ops.picks) {
        expect(ids, `${id}.${pick.id}`).toContain(pick.id);
        const p = spec.params.find((q) => q.id === pick.id)!;
        for (const o of pick.options) {
          expect(o.value, `${id}.${pick.id}.${o.label}`).toBeGreaterThanOrEqual(p.min);
          expect(o.value).toBeLessThanOrEqual(p.max);
        }
        // phần còn lại ở giá trị mẫu: tồn tại một bộ phận làm bài đạt
        // (các núm còn lại được chỉnh tự do: mọi tổ hợp lưới của núm đều thử)
        const knobs = knobParams(spec, ops);
        const steps = knobs.length <= 1 ? 301 : knobs.length === 2 ? 41 : 9;
        const grid = (i: number, v: Record<string, number>): boolean =>
          i === knobs.length
            ? spec.evaluate(v).ok
            : Array.from({length: steps}, (_, j) => j / (steps - 1)).some((t) => grid(i + 1, {...v, [knobs[i].id]: fromUnit(knobs[i], t)}));
        const works = pick.options.some((o) => grid(0, {...spec.solution, [pick.id]: o.value}));
        expect(works, `${id}.${pick.id} có bộ phận cho kết quả đạt`).toBe(true);
        expect(nearestOption(pick, spec.solution[pick.id])).toBeGreaterThanOrEqual(0);
      }
      // tham số nào không phải bộ phận thì là núm xoay: không bỏ sót tham số
      expect(knobParams(spec, ops).length + ops.picks.length).toBe(spec.params.length);
    }
  });
  it('9 bài nhóm Vật lí của phòng đều có thao tác trực tiếp', async () => {
    const {OPS} = await import('../utils/lab/hands/sims/ops');
    for (const id of ['collision', 'thomson', 'eddy', 'photo', 'rutherford', 'shock', 'matterwave', 'ligo', 'bec']) expect(OPS[id], id).toBeTruthy();
  });
});

describe('nhóm Sinh học: thao tác trực tiếp', () => {
  it('điện di và ruồi giấm có bộ phận chọn (gel, số ruồi) và núm xoay cho phần còn lại', async () => {
    const {OPS, knobParams} = await import('../utils/lab/hands/sims/ops');
    const {SIM_BY_ID} = await import('../utils/lab/hands/sims');
    expect(OPS.gel.picks[0].id).toBe('agar');
    expect(OPS.morgan.picks[0].id).toBe('n');
    expect(knobParams(SIM_BY_ID.gel, OPS.gel).map((p) => p.id).sort()).toEqual(['min', 'volt']);
    expect(knobParams(SIM_BY_ID.morgan, OPS.morgan).map((p) => p.id)).toEqual(['d']);
  });
});

describe('nhóm Kĩ thuật: thao tác trực tiếp', () => {
  it('10 bài kĩ thuật trong SIMS đều có thao tác trực tiếp; chọn bộ phận phản ánh đúng vật thật', async () => {
    const {OPS} = await import('../utils/lab/hands/sims/ops');
    for (const id of ['pid', 'differential', 'turbine', 'foc', 'stirling', 'harmonic', 'fatigue', 'quadruped', 'surgery', 'slam']) expect(OPS[id], id).toBeTruthy();
    expect(OPS.stirling.picks[0].options.map((o) => o.label)).toEqual(['Không khí', 'N₂', 'He', 'H₂']);
    expect(OPS.quadruped.picks[0].options[0].label).toBe('Băng');
  });
});

describe('nút thao tác riêng của bài', () => {
  it('PID, phản lực, FOC, robot bốn chân có nút bấm thật; bấm ở bảng điều khiển tăng bộ đếm', async () => {
    const {OPS} = await import('../utils/lab/hands/sims/ops');
    expect(OPS.pid.actions!.map((a) => a.id)).toEqual(['push']);
    expect(OPS.collision.actions!.map((a) => a.id)).toEqual(['start', 'stop']); // xe chỉ chạy khi thả
    expect(OPS.turbine.actions!.map((a) => a.id)).toEqual(['start', 'stop']);
    expect(OPS.foc.actions!.map((a) => a.id)).toEqual(['start', 'stop']);
    expect(OPS.quadruped.actions!.map((a) => a.id)).toEqual(['kick']);
    const r = render(<HandsLab experiment={'turbine' as never} />);
    expect(r.getByTestId('sim-act-start').textContent).toContain('×0');
    fireEvent.click(r.getByTestId('sim-act-start'));
    fireEvent.click(r.getByTestId('sim-act-start'));
    fireEvent.click(r.getByTestId('sim-act-stop'));
    expect(r.getByTestId('sim-act-start').textContent).toContain('×2');
    expect(r.getByTestId('sim-act-stop').textContent).toContain('×1');
    cleanup();
    const q = render(<HandsLab experiment={'eddy' as never} />);
    expect(q.queryByTestId('sim-actions')).toBeNull();
    cleanup();
    // bài va chạm: có nút thả xe ở bảng điều khiển làm bản dự phòng cho công tắc trên bàn
    const c = render(<HandsLab experiment={'collision' as never} />);
    fireEvent.click(c.getByTestId('sim-act-start'));
    expect(c.getByTestId('sim-act-start').textContent).toContain('Thả xe');
    expect(c.getByTestId('sim-act-start').textContent).toContain('×1');
  });
});
