import {describe, it, expect} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {parseClaim, verifyClaim, detectFacts} from '../utils/geoClaims';
import {goalOf, auxIdeas, coachHint, newFacts, reviewAttempt} from '../utils/geoCoach';
import {addSegment} from '../utils/geoTools';

const T = `Cho tứ giác ABCD nội tiếp đường tròn (O) với ̂ DCB < ̂ ADC < 90◦, giả sử có điểm P
nằm trong tứ giác ABCD sao cho P A ⊥ AD và P B ⊥ BC. Dựng hình bình hành P AQB.
Gọi K là hình chiếu vuông góc của Q lên AB.
1. Chứng minh rằng ̂ KQB = ̂ BCD.
2. Gọi H là hình chiếu vuông góc của P lên CD. Chứng minh rằng HD
HC = KB
KA .
3. Lấy điểm R sao cho DR song song AH và CR song song BH. Gọi giao điểm của hai
đường thẳng RH và AB là L. Chứng minh rằng các điểm D, C, K, L cùng nằm trên
một đường tròn.`;

describe('đọc mệnh đề', () => {
  it('các dạng thường gặp', () => {
    expect(parseClaim('AB ⊥ CD')).toEqual({k: 'perp', a: ['A', 'B'], b: ['C', 'D']});
    expect(parseClaim('AB vuông góc với CD')?.k).toBe('perp');
    expect(parseClaim('AB // CD')?.k).toBe('par');
    expect(parseClaim('AB = CD')?.k).toBe('eq');
    expect(parseClaim('HD/HC = KB/KA')?.k).toBe('ratio');
    expect(parseClaim('HD HC = KB KA')?.k).toBe('ratio'); // dán từ PDF mất gạch phân số
    expect(parseClaim('̂ KQB = ̂ BCD')).toEqual({k: 'ang', a: ['K', 'Q', 'B'], b: ['B', 'C', 'D']});
    expect(parseClaim('A, B, C thẳng hàng')).toEqual({k: 'col', pts: ['A', 'B', 'C']});
    expect(parseClaim('các điểm D, C, K, L cùng nằm trên một đường tròn')).toEqual({k: 'cyc', pts: ['D', 'C', 'K', 'L']});
    expect(parseClaim('hôm nay trời đẹp')).toBeNull();
  });
});

describe('kiểm chứng trên hình thật của đề tứ giác nội tiếp', () => {
  const sc = buildScene(T).scene!;
  it('3 yêu cầu của đề đều đúng trên hình', () => {
    for (const c of ['góc KQB = góc BCD', 'HD/HC = KB/KA', 'D, C, K, L cùng thuộc một đường tròn', 'PA ⊥ AD', 'QK ⊥ AB']) expect(verifyClaim(sc, c).verdict, c).toBe('holds');
  });
  it('mệnh đề sai bị bắt; thiếu điểm thì "không rõ"; không đọc được thì báo', () => {
    expect(verifyClaim(sc, 'AB // CD').verdict).toBe('fails');
    expect(verifyClaim(sc, 'AB = CD').verdict).toBe('fails');
    expect(verifyClaim(sc, 'AB ⊥ XY').verdict).toBe('unknown');
    expect(verifyClaim(sc, 'xin chào').verdict).toBe('unparsed');
  });
  it('trích quan hệ đang đúng', () => {
    const f = detectFacts(sc);
    expect(f).toContain('DA ⊥ PA');
    expect(f).toContain('PA ∥ QB');
    expect(f).toContain('K nằm trên đoạn AB');
  });
});

describe('kéo thử đỉnh khi hình còn giữ được giả thiết', () => {
  it('hình chữ nhật: AB ∥ CD đúng ở mọi vị trí kéo; AB = AD chỉ đúng ngẫu nhiên → sai khi kéo', () => {
    const sc = buildScene('hình chữ nhật ABCD, A(0;0), B(4;0), C(4;2), D(0;2)').scene!;
    const ok = verifyClaim(sc, 'AB // CD');
    expect(ok.verdict).toBe('holds');
    expect(ok.tried).toBeGreaterThan(1);
    expect(verifyClaim(sc, 'AB = BC').verdict).toBe('fails');
    const sq = buildScene('hình vuông ABCD').scene!;
    expect(verifyClaim(sq, 'AB = BC').verdict).toBe('holds');
  });
});

describe('coach Socratic', () => {
  const sc = buildScene(T).scene!;
  it('tìm đúng yêu cầu chứng minh trong lời đề', () => {
    expect(goalOf(sc.parts[3]?.text ?? T)?.claim.k).toBe('cyc');
    expect(goalOf('Chứng minh rằng HD HC = KB KA .')?.claim.k).toBe('ratio');
    expect(goalOf('Tính diện tích tam giác ABC')).toBeNull();
  });
  it('4 mức: hiểu đề → quan hệ → cần vẽ thêm (kèm đường phụ) → dùng hình mới; chỉ là câu hỏi, không nêu kết luận', () => {
    const st = 'Cho tam giác ABC vuông tại A. Chứng minh rằng HD/HC = KB/KA';
    const t = buildScene('Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi H là chân đường cao kẻ từ A.').scene!;
    const hs = ([1, 2, 3, 4] as const).map((l) => coachHint(t, st, l));
    expect(hs.map((h) => h.level)).toEqual([1, 2, 3, 4]);
    for (const h of hs) expect(h.question).toMatch(/\?/);
    expect(hs[0].question).toContain('HD/HC = KB/KA');
  });
  it('đường phụ: chỉ gợi ý cái chưa có, dùng điểm có thật; đổi ý tưởng được', () => {
    const goal = goalOf('Chứng minh rằng D, C, K, L cùng nằm trên một đường tròn.')!;
    const ideas = auxIdeas(sc, goal.claim);
    expect(ideas.length).toBeGreaterThan(0);
    for (const i of ideas) for (const n of i.names) expect(sc.pts[n], n).toBeTruthy();
    expect(ideas[0].tool).toBe('circle3');
    const h0 = coachHint(sc, 'Chứng minh rằng D, C, K, L cùng nằm trên một đường tròn.', 3, 0);
    const h1 = coachHint(sc, 'Chứng minh rằng D, C, K, L cùng nằm trên một đường tròn.', 3, 1);
    expect(h0.aux).toBeTruthy();
    expect(h1.aux?.label).not.toBe(h0.aux?.label);
  });
  it('quan hệ mới sau khi vẽ thêm đường nối', () => {
    const t = buildScene('hình vuông ABCD').scene!;
    const after = addSegment(addSegment(t, 'A', 'C', 0), 'B', 'D', 0);
    expect(newFacts(t, after)).toContain('AC ⊥ BD');
  });
  it('nhận xét câu học sinh viết: đúng → hỏi vì sao; sai → bảo xem lại; không chứng minh hộ', () => {
    expect(reviewAttempt(sc, 'PA ⊥ AD').message).toMatch(/vì sao/i);
    expect(reviewAttempt(sc, 'AB // CD').message).toMatch(/không đúng|SAI|xem lại/i);
    expect(reviewAttempt(sc, 'blah').verdict).toBe('unparsed');
  });
});

describe('đường phụ trong tam giác vuông: quan hệ mới không nói thẳng điều cần chứng minh', () => {
  it('nối trung tuyến AM: thấy AM = MC (đoạn con của BC) nhưng không nêu AM = BM của đề', () => {
    const t = buildScene('Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi M là trung điểm BC. Chứng minh rằng AM = BM.').scene!;
    const after = addSegment(t, 'A', 'M', 0);
    const goal = goalOf('Chứng minh rằng AM = BM.')!.claim;
    const all = newFacts(t, after);
    expect(all.some((f) => /AM = (BM|MB)|(BM|MB) = AM/.test(f))).toBe(true); // máy thấy
    const shown = newFacts(t, after, goal);
    expect(shown.some((f) => /AM = (BM|MB)|(BM|MB) = AM/.test(f))).toBe(false); // nhưng không lộ ra cho học sinh
    expect(shown.length).toBeGreaterThan(0);
  });
});
