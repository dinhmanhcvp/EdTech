import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {HandsLab} from '../engines/families/HandsLab';
import {MOTOR, ROBOT, SPECS, allOff, armIK, movePart, pistonHeight, strokeOf} from '../utils/lab/hands/assembly';
import {SAMPLE_MIRRORS, START, trace} from '../utils/lab/hands/optics';
import {GAINS, START_STATE, simulate} from '../utils/lab/hands/cartpole';
import {DNA, OVERSTRETCH_X, dnaForce, fitPersistence, jitter, settle} from '../utils/lab/hands/tweezers';
import {GRACE, PAD_DWELL, PINCH_HOLD, REGRAB_LOCK, SKIN_FAR, SKIN_NEAR, SLIDE_DWELL, edgeGlow, glide, handGate, nextPinch, oneEuro, padRate, pinchLatch, pinchRatio, skinAlpha, slideTravel, thumbSlide} from '../utils/lab/hands/handTracker';
import {SAMPLE, evaluate, explain, netSources, type Wire} from '../utils/lab/hands/threePhase';

afterEach(cleanup);

describe('đấu động cơ 3 pha: tính mạch', () => {
  it('đấu sao: 220 V mỗi cuộn, quay thuận; động cơ 220/380 V chạy đúng định mức', () => {
    const v = evaluate(SAMPLE.star, 220);
    expect(v).toMatchObject({kind: 'run', conn: 'star', load: 'ok', dir: 1, earthed: true});
    if (v.kind === 'run') for (const u of v.u) expect(u).toBeCloseTo(380 / Math.sqrt(3), 3);
    expect(explain(v).ok).toBe(true);
  });

  it('đấu tam giác: 380 V mỗi cuộn; quá áp với cuộn 220 V, đúng với cuộn 380 V', () => {
    const v = evaluate(SAMPLE.delta, 220);
    expect(v).toMatchObject({kind: 'run', conn: 'delta', load: 'over', dir: 1});
    if (v.kind === 'run') for (const u of v.u) expect(u).toBeCloseTo(380, 3);
    expect(evaluate(SAMPLE.delta, 380)).toMatchObject({load: 'ok'});
    expect(evaluate(SAMPLE.star, 380)).toMatchObject({conn: 'star', load: 'under'});
  });

  it('đổi chỗ hai dây pha thì đảo chiều quay', () => {
    const swapped: Wire[] = [['L2', 'U1'], ['L1', 'V1'], ...SAMPLE.star.slice(2)];
    expect(evaluate(swapped, 220)).toMatchObject({kind: 'run', dir: -1});
  });

  it('ngắn mạch pha–pha, pha–đất và vỏ mang điện', () => {
    expect(evaluate([['L1', 'L2']], 220)).toMatchObject({kind: 'short', between: ['L1', 'L2']});
    expect(evaluate([['L3', 'U1'], ['U1', 'PE']], 220).kind).toBe('short');
    expect(evaluate([['L1', 'GND']], 220)).toMatchObject({kind: 'live_frame', phase: 'L1'});
    // tam giác đấu sai vòng: một cuộn bị nối tắt hai đầu vào cùng pha, hai pha chập qua dây nối
    expect(evaluate([['L1', 'U1'], ['L2', 'V1'], ['U1', 'U2'], ['U2', 'V1']], 220).kind).toBe('short');
  });

  it('mất pha, thiếu cầu nối, chưa đấu gì', () => {
    expect(evaluate(SAMPLE.star.filter(([a]) => a !== 'L3'), 220).kind).toBe('unbalanced');
    expect(evaluate([['L1', 'U1'], ['L2', 'V1'], ['L3', 'W1']], 220).kind).toBe('dead');
    expect(evaluate([], 220).kind).toBe('dead');
    // ba cuộn mắc song song vào cùng hai pha: điện áp bằng nhau nhưng cùng pha → không có từ trường quay
    expect(evaluate([['L1', 'U1'], ['U1', 'V1'], ['V1', 'W1'], ['L2', 'U2'], ['U2', 'V2'], ['V2', 'W2']], 220).kind).toBe('unbalanced');
  });

  it('chưa nối đất thì chưa đạt; màu dây theo pha tới cọc', () => {
    const v = evaluate(SAMPLE.star.slice(0, 5), 220);
    expect(v).toMatchObject({kind: 'run', load: 'ok', earthed: false});
    expect(explain(v).ok).toBe(false);
    expect(netSources(SAMPLE.delta)).toMatchObject({W2: 'L1', U2: 'L2', V2: 'L3', GND: 'PE'});
    expect(netSources(SAMPLE.star).U2).toBeNull();
  });
});

describe('theo dõi tay', () => {
  const hand = (gap: number) => Array.from({length: 21}, (_, i) => (i === 9 ? {x: 0, y: 0.2} : i === 8 ? {x: gap, y: 0} : {x: 0, y: 0}));
  it('chụm ngón có hai ngưỡng để không rơi vật khi tay run', () => {
    expect(pinchRatio(hand(0.1))).toBeCloseTo(0.5, 10);
    expect(nextPinch(false, 0.4)).toBe(false);
    expect(nextPinch(false, 0.25)).toBe(true);
    expect(nextPinch(true, 0.4)).toBe(true);
    expect(nextPinch(true, 0.6)).toBe(false);
  });
  it('bộ lọc: giảm rung khi đứng yên, bám kịp khi đi nhanh', () => {
    const f = oneEuro();
    let out = 0;
    for (let i = 0; i < 60; i++) out = f(0.5 + (i % 2 ? 0.004 : -0.004), i / 30);
    expect(Math.abs(out - 0.5)).toBeLessThan(0.002);
    for (let i = 60; i < 75; i++) out = f(0.5 + (i - 59) * 0.03, i / 30);
    expect(out).toBeGreaterThan(0.5 + 15 * 0.03 - 0.03);
  });
  it('mất dấu tay: ân hạn 450 ms vẫn giữ vật, quá hạn thì buông, tay quay lại bị khoá chụm 200 ms', () => {
    const at = (x: number) => Array.from({length: 21}, () => ({x, y: 0.5}));
    const g = handGate();
    expect(g(at(0.3), false, 0)).toMatchObject({pinch: false, event: 'back'});
    expect(g(at(0.3), true, 0.1).pinch).toBe(false); // còn trong 200 ms khoá
    expect(g(at(0.3), true, 0.3)).toMatchObject({pinch: true, alpha: 1});
    g(at(0.33), true, 0.33); // tay đang đi sang phải 1 màn hình/giây
    const ghost = g(null, false, 0.53);
    expect(ghost.pinch).toBe(true);
    expect(ghost.event).toBeUndefined();
    expect(ghost.alpha).toBeLessThan(1);
    expect(ghost.alpha).toBeGreaterThan(0.4);
    expect(ghost.pts[9].x).toBeGreaterThan(0.33);
    expect(ghost.pts[9].x).toBeLessThan(0.33 + 0.081); // trôi theo quán tính nhưng không văng
    // quay lại trong ân hạn: liền mạch, không khoá, không báo sự kiện
    expect(g(at(0.4), true, 0.6)).toMatchObject({pinch: true, alpha: 1, event: undefined});
    expect(g(null, false, 0.61 + GRACE)).toMatchObject({pts: [], pinch: false, event: 'dock'});
    expect(g(null, false, 2).event).toBeUndefined();
    expect(g(at(0.7), true, 3)).toMatchObject({pinch: false, event: 'back'});
    expect(g(at(0.7), true, 3 + REGRAB_LOCK).pinch).toBe(true);
  });
  it('vi cử chỉ: ngón cái miết dọc ngón trỏ cho quãng miết tương đối, không nhảy khi vừa đặt ngón', () => {
    // cổ tay (0,0), gốc ngón giữa (0,1) → cỡ tay 1; ngón trỏ từ (0.2,1) tới (0.2,1.8)
    const hand = (tx: number, ty: number, tip = 1.8) => Array.from({length: 21}, (_, i) => (i === 9 ? {x: 0, y: 1} : i === 5 ? {x: 0.2, y: 1} : i === 8 ? {x: 0.2, y: tip} : i === 4 ? {x: tx, y: ty} : {x: 0, y: 0}));
    expect(thumbSlide(hand(0.3, 1.2))).toBeCloseTo(0.25, 10);
    expect(thumbSlide(hand(0.3, 1.6))).toBeCloseTo(0.75, 10);
    expect(thumbSlide(hand(0.6, 1.2))).toBeNull(); // ngón cái xoè xa ngón trỏ
    expect(thumbSlide(hand(0.3, 0.9))).toBeNull(); // dưới gốc ngón
    expect(thumbSlide(hand(0.3, 1.2, 1.3))).toBeNull(); // ngón trỏ co lại
    const tr = slideTravel();
    expect(tr(0.6, 0)).toBe(0); // vừa đặt ngón ở giữa: chưa đổi gì
    expect(tr(0.7, 0.05)).toBe(0); // chưa tì đủ lâu
    expect(tr(0.7, SLIDE_DWELL)).toBe(0);
    expect(tr(0.9, SLIDE_DWELL + 0.03)).toBeCloseTo(0.2, 10);
    expect(tr(null, 1)).toBeCloseTo(0.2, 10);
    expect(tr(0.1, 2)).toBeCloseTo(0.2, 10); // đặt lại ở chỗ khác: không nhảy
    expect(tr(0, 2.2)).toBeCloseTo(0.1, 10);
  });
  it('nút − / + cạnh núm: lướt qua thì chưa đổi, giữ thì đổi chậm để chỉnh chính xác, giữ lâu nhanh dần và có trần', () => {
    expect(padRate(0)).toBe(0);
    expect(padRate(PAD_DWELL - 0.01)).toBe(0);
    expect(padRate(PAD_DWELL)).toBeCloseTo(0.05, 10);
    expect(padRate(0.6)).toBeGreaterThan(padRate(0.3));
    expect(padRate(PAD_DWELL + 1.5)).toBeCloseTo(0.5, 10);
    expect(padRate(60)).toBeCloseTo(0.5, 10);
    // giữ đúng 1 giây: đổi chưa tới 15 % thang đo, đủ chậm để dừng đúng chỗ
    let moved = 0;
    for (let t = 0; t < 1; t += 1 / 60) moved += padRate(t) / 60;
    expect(moved).toBeGreaterThan(0.04);
    expect(moved).toBeLessThan(0.15);
  });
  it('chụm có trễ nhả: điểm nhận diện nhảy một hai khung hình thì vật không rơi; rời tay thật thì nhả sau 90 ms', () => {
    const p = pinchLatch();
    expect(p(0.6, 0)).toBe(false);
    expect(p(0.2, 0.03)).toBe(true); // chụm: nhận ngay
    expect(p(0.7, 0.06)).toBe(true); // một khung hình nhảy ra
    expect(p(0.2, 0.09)).toBe(true); // rồi quay lại: vẫn giữ
    expect(p(0.7, 0.12)).toBe(true);
    expect(p(0.7, 0.12 + PINCH_HOLD - 0.01)).toBe(true);
    expect(p(0.7, 0.12 + PINCH_HOLD)).toBe(false);
    expect(p(0.4, 1)).toBe(false); // hai ngưỡng vẫn còn: 0,4 chưa đủ để chụm lại
  });
  it('độ đục hình tay: ngoài mặt nạ thì trong suốt, lõi luôn đặc, rìa chỉ hiện khi giống màu da', () => {
    expect(skinAlpha(0, 255, 0)).toBe(0);
    expect(skinAlpha(255, 255, 99)).toBe(1); // lõi: màu gì cũng hiện (không thủng lỗ)
    expect(skinAlpha(255, 0, SKIN_NEAR)).toBe(1);
    expect(skinAlpha(255, 0, SKIN_FAR)).toBe(0); // rìa mà là màu nền bàn: bỏ
    // bàn đen: điểm ảnh tối hơn hẳn da tay bị bỏ kể cả trong lõi; sáng gần bằng da thì giữ nguyên
    expect(skinAlpha(255, 255, 0, 0.2)).toBe(0);
    expect(skinAlpha(255, 255, 0, 0.6)).toBe(1);
    expect(skinAlpha(255, 255, 0, 0.4)).toBeCloseTo(0.5, 6);
    expect(skinAlpha(255, 0, (SKIN_NEAR + SKIN_FAR) / 2)).toBeCloseTo(0.5, 10);
    expect(skinAlpha(128, 0, 0)).toBeCloseTo(128 / 255, 10); // mép khử răng cưa của mặt nạ
  });
  it('nối mẫu camera thành chuyển động mượt: giữa hai mẫu vẫn tiến theo vận tốc, đứng yên thì không rung, không vọt quá xa', () => {
    const g = glide();
    g.sample(0.2, 0);
    expect(g.at(0, 0.016)).toBeCloseTo(0.2, 10);
    // tay đi đều 0,6 màn hình/giây, camera 30 mẫu/giây, màn hình 60 khung hình/giây
    let prev = 0.2;
    let maxJump = 0;
    let minJump = 1;
    for (let f = 1; f <= 60; f++) {
      const t = f / 60;
      if (f % 2 === 0) g.sample(0.2 + 0.6 * t, t);
      const x = g.at(t, 1 / 60);
      if (f > 20) {
        maxJump = Math.max(maxJump, x - prev);
        minJump = Math.min(minJump, x - prev);
      }
      prev = x;
    }
    expect(minJump).toBeGreaterThan(0.004); // khung nào cũng tiến, không có khung đứng hình giữa hai mẫu
    expect(maxJump).toBeLessThan(0.02);
    expect(Math.abs(prev - 0.8)).toBeLessThan(0.02); // bám sát vị trí thật, không trễ
    // dừng hẳn: về đúng chỗ, không vọt quá
    for (let f = 61; f <= 120; f++) {
      if (f % 2 === 0) g.sample(0.8, f / 60);
      prev = g.at(f / 60, 1 / 60);
      expect(prev).toBeLessThan(0.83);
    }
    expect(prev).toBeCloseTo(0.8, 3);
  });
  it('viền cảnh báo sáng dần khi điểm chụm vào dải 8 % sát mép', () => {
    const at = (x: number, y: number) => Array.from({length: 21}, () => ({x, y}));
    expect(edgeGlow(at(0.5, 0.5))).toEqual([0, 0, 0, 0]);
    expect(edgeGlow(at(0.04, 0.5))[0]).toBeCloseTo(0.5, 10);
    expect(edgeGlow(at(1.1, 0.97))).toMatchObject([0, 1, 0, expect.closeTo(0.625, 10)]);
  });
});

describe('bàn thực hành tay (không có WebGL thì vẫn điều khiển được bằng nút)', () => {
  it('đấu mẫu sao rồi đóng aptomat: đạt; đấu tam giác: quá áp và aptomat tự cắt; không sửa dây khi đang có điện', () => {
    const {getByTestId} = render(<HandsLab />);
    fireEvent.click(getByTestId('hands-sample-star'));
    expect(getByTestId('hands-wires').textContent).toContain('6');
    fireEvent.click(getByTestId('hands-breaker'));
    expect(getByTestId('hands-status').textContent).toContain('chạy đúng định mức');
    expect(getByTestId('hands-status').getAttribute('data-ok')).toBe('true');
    fireEvent.click(getByTestId('hands-clear'));
    expect(getByTestId('hands-wires').textContent).toContain('6');
    expect(getByTestId('hands-warning').textContent).toContain('Cắt aptomat');
    fireEvent.click(getByTestId('hands-breaker'));
    fireEvent.click(getByTestId('hands-clear'));
    fireEvent.click(getByTestId('hands-breaker'));
    expect(getByTestId('hands-status').textContent).toContain('Chưa có dòng điện');
    fireEvent.click(getByTestId('hands-breaker'));
    fireEvent.click(getByTestId('hands-sample-delta'));
    fireEvent.click(getByTestId('hands-breaker'));
    expect(getByTestId('hands-status').textContent).toContain('quá áp');
    fireEvent.click(getByTestId('hands-breaker'));
    fireEvent.click(getByTestId('hands-clear'));
    fireEvent.click(getByTestId('hands-sample-short'));
    fireEvent.click(getByTestId('hands-breaker'));
    expect(getByTestId('hands-status').textContent).toContain('Ngắn mạch');
    expect(getByTestId('hands-breaker').textContent).toContain('Đóng');
  });
});

describe('tháo lắp: thứ tự chi tiết và động học tay máy', () => {
  it('đồ thị thứ tự hợp lệ: mọi tên trong needs có thật, tháo hết được và lắp lại hết được', () => {
    for (const spec of [MOTOR, ROBOT]) {
      const ids = new Set(spec.parts.map((p) => p.id));
      for (const p of spec.parts) for (const n of p.needs) expect(ids.has(n), `${p.id} -> ${n}`).toBe(true);
      // lặp: mỗi vòng tháo (rồi lắp) mọi chi tiết đang được phép; đồ thị có chu trình thì kẹt
      let off = new Set<string>();
      for (const target of [spec.parts.length, 0])
        for (let round = 0; round < spec.parts.length && off.size !== target; round++)
          for (const p of spec.parts) {
            if (off.has(p.id) === (target > 0)) continue;
            const r = movePart(spec, off, p.id);
            if ('off' in r) off = r.off;
          }
      expect(off.size, spec.title).toBe(0);
    }
  });

  it('động cơ: rôto chỉ rút được sau hai ổ bi; quạt chỉ lắp được sau nắp máy sau', () => {
    expect(movePart(MOTOR, new Set(), 'rotor')).toEqual({blocked: ['Ổ bi trước', 'Ổ bi sau']});
    expect(movePart(MOTOR, new Set(), 'fan')).toEqual({blocked: ['Nắp che quạt']});
    expect(movePart(MOTOR, allOff(MOTOR), 'fan')).toEqual({blocked: ['Nắp máy sau']});
    expect('off' in movePart(MOTOR, allOff(MOTOR), 'rotor')).toBe(true);
  });

  it('robot: lắp từ servo đế lên; tay kẹp không lắp được khi chưa có cánh tay trên', () => {
    expect(movePart(ROBOT, allOff(ROBOT), 'gripper')).toEqual({blocked: ['Cánh tay trên']});
    expect('off' in movePart(ROBOT, allOff(ROBOT), 'base_servo')).toBe(true);
    expect('off' in movePart(ROBOT, allOff(ROBOT), 'battery')).toBe(true);
  });

  it('động học ngược: đặt lại hai khâu theo góc tính được thì đầu tay kẹp tới đúng điểm; ngoài tầm thì duỗi thẳng về phía điểm', () => {
    for (const [r, h] of [[1.0, -0.37], [0.6, 0.5], [1.3, 0.2], [0.5, -0.3]]) {
      const {a1, a2} = armIK(r, h, 0.6, 1.0);
      expect(0.6 * Math.cos(a1) + 1.0 * Math.cos(a2)).toBeCloseTo(r, 6);
      expect(0.6 * Math.sin(a1) + 1.0 * Math.sin(a2)).toBeCloseTo(h, 6);
      expect(a1).toBeGreaterThan(a2); // nghiệm khuỷu cao
    }
    const far = armIK(5, 0, 0.6, 1.0);
    expect(far.a1).toBeCloseTo(0, 1);
    expect(far.a2).toBeCloseTo(0, 1);
  });

  it('bảng điều khiển động cơ: sai thứ tự bị chặn và đếm lỗi; tháo rời hết rồi lắp lại thì hoàn thành', () => {
    const {getByTestId, queryByTestId} = render(<HandsLab experiment="motor" />);
    const click = (id: string) => fireEvent.click(getByTestId(`asm-part-${id}`));
    click('rotor');
    expect(getByTestId('asm-warning').textContent).toContain('tháo Ổ bi trước, Ổ bi sau');
    expect(getByTestId('asm-info').textContent).toContain('lồng');
    const order = ['cowl', 'fan', 'rear_shield', 'rear_bearing', 'pulley', 'front_shield', 'front_bearing', 'rotor', 'box_cover'];
    order.forEach(click);
    expect(queryByTestId('asm-warning')).toBeNull();
    expect(getByTestId('asm-status').textContent).toContain('Đang lắp lại: 0/9');
    click('fan');
    expect(getByTestId('asm-warning').textContent).toContain('lắp Nắp máy sau');
    expect(getByTestId('asm-status').textContent).toContain('sai thứ tự: 2');
    [...order].reverse().forEach(click);
    expect(getByTestId('asm-status').getAttribute('data-done')).toBe('true');
    fireEvent.click(getByTestId('asm-reset'));
    expect(getByTestId('asm-status').textContent).toContain('Đang tháo: 0/9');
  });

  it('bảng điều khiển robot: bắt đầu với mọi chi tiết trên khay, lắp đủ thì hoàn thành', () => {
    const {getByTestId} = render(<HandsLab experiment="robot" />);
    expect(getByTestId('asm-status').textContent).toContain('Đang lắp: 0/9');
    for (const id of ['base_servo', 'turntable', 'shoulder_servo', 'lower_arm', 'elbow_servo', 'forearm', 'gripper', 'board', 'battery']) fireEvent.click(getByTestId(`asm-part-${id}`));
    expect(getByTestId('asm-status').textContent).toContain('Hoàn thành');
  });
});

describe('bài mới: động cơ 4 kì, drone, máy tính, laser', () => {
  it('mọi mô hình tháo lắp: đồ thị thứ tự hợp lệ, tháo hết rồi lắp lại hết được', () => {
    for (const spec of Object.values(SPECS)) {
      const ids = new Set(spec.parts.map((p) => p.id));
      for (const p of spec.parts) for (const n of p.needs) expect(ids.has(n), `${p.id} -> ${n}`).toBe(true);
      let off = new Set<string>();
      for (const target of [spec.parts.length, 0])
        for (let round = 0; round < spec.parts.length && off.size !== target; round++)
          for (const p of spec.parts) {
            if (off.has(p.id) === (target > 0)) continue;
            const r = movePart(spec, off, p.id);
            if ('off' in r) off = r.off;
          }
      expect(off.size, spec.title).toBe(0);
    }
  });

  it('thứ tự đúng nghề: SSD trước card đồ hoạ, cánh drone sau động cơ, pít-tông chỉ rút được khi đã nhấc xi-lanh', () => {
    expect(movePart(SPECS.pc, allOff(SPECS.pc), 'cpu')).toEqual({blocked: ['Bo mạch chủ']});
    const pcOff = allOff(SPECS.pc);
    pcOff.delete('mainboard');
    expect(movePart(SPECS.pc, pcOff, 'gpu')).toEqual({blocked: ['SSD M.2']}); // khe M.2 nằm dưới card: lắp SSD trước
    expect(movePart(SPECS.drone, allOff(SPECS.drone), 'props_a')).toEqual({blocked: ['Động cơ quay thuận']});
    expect(movePart(SPECS.engine, new Set(), 'piston')).toEqual({blocked: ['Xi-lanh']});
    expect(movePart(SPECS.engine, new Set(), 'crank')).toEqual({blocked: ['Thanh truyền', 'Bánh đà']});
  });

  it('tay quay – con trượt: hành trình S = 2r; bốn kì trong hai vòng trục khuỷu', () => {
    expect(pistonHeight(0, 0.16, 0.55)).toBeCloseTo(0.71, 10);
    expect(pistonHeight(0, 0.16, 0.55) - pistonHeight(Math.PI, 0.16, 0.55)).toBeCloseTo(0.32, 10);
    expect([0.1, 3.3, 6.4, 9.5, 12.7].map(strokeOf)).toEqual([0, 1, 2, 3, 0]);
  });

  it('laser: ban đầu bị vách chắn; mẫu 3 gương vuông góc thì đạt; lời giải 2 gương cũng đạt; lệch 10° thì chạm nhưng không đạt', () => {
    const t0 = trace(START);
    expect(t0.hit).toBe(false);
    expect(t0.path[1][0]).toBeCloseTo(-0.3, 6);
    const t3 = trace(SAMPLE_MIRRORS);
    expect(t3).toMatchObject({hit: true, aligned: true});
    expect(t3.bounces.map((b) => Math.round(b.deg))).toEqual([45, 45, 45]);
    // gương đặt sao cho pháp tuyến là phân giác của tia tới và tia phản xạ
    const aim = (x: number, z: number, from: [number, number], to: [number, number]) => {
      const u = (p: [number, number], s: number) => { const d = Math.hypot(p[0] - x, p[1] - z); return [(s * (p[0] - x)) / d, (s * (p[1] - z)) / d]; };
      const [i, o] = [u(from, -1), u(to, 1)];
      return {x, z, a: Math.atan2(o[1] - i[1], o[0] - i[0]) + Math.PI / 2};
    };
    const two = [aim(-3.0, -1.6, [-3.2, -1.6], [2.5, 1.0]), aim(2.5, 1.0, [-3.0, -1.6], [2.5, -1.6])];
    expect(trace(two)).toMatchObject({hit: true, aligned: true});
    expect(trace(two).bounces).toHaveLength(2);
    const skew = trace([two[0], {...two[1], a: two[1].a + (2 * Math.PI) / 180}]);
    expect(skew.aligned).toBe(false);
  });

  it('bảng điều khiển: laser xếp mẫu thì đạt; drone lắp sai thứ tự bị chặn; máy tính lắp đủ thì hoàn thành', () => {
    const optics = render(<HandsLab experiment="optics" />);
    expect(optics.getByTestId('optics-status').getAttribute('data-ok')).toBe('false');
    fireEvent.click(optics.getByTestId('optics-sample'));
    expect(optics.getByTestId('optics-status').textContent).toContain('Đạt với 3 gương');
    fireEvent.click(optics.getByLabelText('Xoay gương 3 +1°'));
    fireEvent.click(optics.getByLabelText('Xoay gương 3 +1°'));
    fireEvent.click(optics.getByLabelText('Xoay gương 3 +1°'));
    fireEvent.click(optics.getByLabelText('Xoay gương 3 +1°'));
    expect(optics.getByTestId('optics-status').getAttribute('data-ok')).toBe('false');
    cleanup();
    const drone = render(<HandsLab experiment="drone" />);
    fireEvent.click(drone.getByTestId('asm-part-props_a'));
    expect(drone.getByTestId('asm-warning').textContent).toContain('lắp Động cơ quay thuận');
    cleanup();
    const pc = render(<HandsLab experiment="pc" />);
    for (const id of ['mainboard', 'cpu', 'cooler', 'ram', 'ssd', 'gpu', 'psu', 'cable', 'panel']) fireEvent.click(pc.getByTestId(`asm-part-${id}`));
    expect(pc.getByTestId('asm-status').textContent).toContain('Hoàn thành');
  });
});

describe('bài từ danh mục nghiên cứu: kẹp quang kéo DNA, con lắc ngược', () => {
  it('WLC: 0,5 L ≈ 0,10 pN, 0,9 L ≈ 2,1 pN; đơn điệu; cao nguyên 65 pN; cân bằng bẫy khớp lực', () => {
    expect(dnaForce(0.5 * DNA.L)).toBeCloseTo(0.1028, 3);
    expect(dnaForce(0.9 * DNA.L)).toBeCloseTo(2.11, 1);
    let prev = -1;
    for (let x = 0; x <= 2.2 * DNA.L; x += 200) {
      expect(dnaForce(x)).toBeGreaterThanOrEqual(prev);
      prev = dnaForce(x);
    }
    expect(dnaForce(OVERSTRETCH_X * 1.3)).toBe(DNA.overstretch);
    for (const trap of [3000, 12000, 20000, 30000]) {
      const s = settle(trap);
      expect(DNA.kappa * (trap - s.x)).toBeCloseTo(dnaForce(s.x), 3);
    }
    expect(jitter()).toBeCloseTo(9.07, 1);
  });

  it('khớp P từ điểm có nhiễu 5 % cho kết quả quanh 50 nm', () => {
    const samples = [0.4, 0.55, 0.65, 0.75, 0.82, 0.88, 0.92].map((u, i) => ({x: u * DNA.L, f: dnaForce(u * DNA.L) * (1 + (i % 2 ? 0.04 : -0.04))}));
    const P = fitPersistence(samples)!;
    expect(P).toBeGreaterThan(45);
    expect(P).toBeLessThan(55);
    expect(fitPersistence(samples.slice(0, 2))).toBeNull();
  });

  it('con lắc ngược: không điều khiển thì ngã dưới 1 s; bộ hệ số mặc định đứng 10 s kể cả sau khi đổi vị trí đặt; kθ quá nhỏ thì ngã', () => {
    expect(simulate(START_STATE, 10, {auto: false}).held).toBeLessThan(1);
    const ok = simulate(START_STATE, 10);
    expect(ok.held).toBe(10);
    expect(Math.abs(ok.end.th)).toBeLessThan(0.01);
    expect(simulate(START_STATE, 10, {xref: 0.5}).end.x).toBeCloseTo(0.5, 1);
    expect(simulate(START_STATE, 10, {gains: {...GAINS, kth: 5}}).held).toBeLessThan(10);
  });

  it('bảng điều khiển kẹp quang: kéo tới vùng giãn, ghi điểm, khớp P, vượt 65 pN thì đạt', () => {
    const r = render(<HandsLab experiment="tweezers" />);
    const trap = r.getByTestId('tw-trap');
    expect((r.getByTestId('tw-fit') as HTMLButtonElement).disabled).toBe(true);
    for (const u of [0.45, 0.55, 0.65, 0.75, 0.82, 0.88, 0.92]) {
      fireEvent.change(trap, {target: {value: String(Math.round(u * DNA.L + 400))}});
      fireEvent.click(r.getByTestId('tw-record'));
    }
    fireEvent.click(r.getByTestId('tw-fit'));
    expect(r.getByTestId('tw-status').getAttribute('data-ok')).toBe('false');
    fireEvent.change(trap, {target: {value: String(Math.round(1.9 * DNA.L))}});
    expect(r.getByTestId('tw-status').getAttribute('data-ok')).toBe('true');
  });

  it('bảng điều khiển con lắc ngược: bắt đầu chưa ngã; nút Làm lại và Đẩy cột có mặt', () => {
    const r = render(<HandsLab experiment="cartpole" />);
    expect(r.getByTestId('cp-status').getAttribute('data-fell')).toBe('false');
    fireEvent.click(r.getByTestId('cp-kick'));
    fireEvent.click(r.getByTestId('cp-reset'));
    expect((r.getByTestId('cp-auto') as HTMLInputElement).checked).toBe(true);
  });
});
