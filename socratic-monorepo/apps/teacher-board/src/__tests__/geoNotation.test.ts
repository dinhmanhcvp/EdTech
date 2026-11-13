import {describe, expect, it} from 'vitest';
import {buildScene, normalizeProblem, parseRichestGeometry} from '../utils/geometryProblem';

const sceneOf = (t: string) => (parseRichestGeometry([t])?.scene ?? buildScene(t).scene)!;
const cosAt = (t: string, a: string, v: string, c: string) => {
  const s = sceneOf(t);
  const [u, w] = [[s.pts[a][0] - s.pts[v][0], s.pts[a][1] - s.pts[v][1]], [s.pts[c][0] - s.pts[v][0], s.pts[c][1] - s.pts[v][1]]];
  return (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
};

describe('đọc đề viết bằng ký hiệu (chữ viết tay được nhận dạng)', () => {
  it.each([
    'tam giác ABC vuông tại A',
    'ΔABC vuông tại A, AB=3cm, AC=4cm',
    '△ABC (Â=90°)',
    'ΔABC có Â = 90°',
    'ΔABC, ∠A = 90°',
    'Cho ΔABC (∠A = 90°), AB = 3, AC = 4',
    '\\triangle ABC, \\widehat{A} = 90^\\circ',
    '\\Delta ABC vuông tại A',
    'tam giác ABC có góc A = 90 độ',
    'tam giác ABC A=90°',
    'tam giác ABC có \\widehat{BAC} = 90^0',
    'ABC vuông tại A',
    'tg ABC vuông tại A',
    'Tam giác ABC, AB ⊥ AC',
    'AB ⊥ AC',
  ])('"%s" → vuông tại A', (t) => {
    const s = sceneOf(t);
    expect(Object.keys(s.pts).sort().slice(0, 3)).toEqual(['A', 'B', 'C']);
    expect(Math.abs(cosAt(t, 'B', 'A', 'C'))).toBeLessThan(1e-6);
  });

  it('góc vuông ở đỉnh khác A', () => {
    expect(Math.abs(cosAt('ΔABC có B̂ = 90°', 'A', 'B', 'C'))).toBeLessThan(1e-6);
    expect(Math.abs(cosAt('tam giác abc ab vuông bc', 'A', 'B', 'C'))).toBeLessThan(1e-6);
  });

  it('tứ giác và viết tắt', () => {
    expect(Object.keys(sceneOf('HV ABCD').pts)).toHaveLength(4);
    const rect = sceneOf('tứ giác ABCD là hình chữ nhật');
    expect(rect.pts.C[0]).not.toBeCloseTo(rect.pts.C[1], 3); // chữ nhật, không phải hình vuông
    expect(Object.keys(sceneOf('Cho ABCD là hình thoi').pts)).toHaveLength(4);
  });

  it('"độ dài" không bị biến thành dấu độ; "đáy ABCD là hình vuông" vẫn đúng', () => {
    expect(normalizeProblem('Tính độ dài AH')).toContain('độ dài');
    expect(normalizeProblem('góc 60 độ')).toContain('60°');
    const pyr = sceneOf('Hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a');
    expect(Object.keys(pyr.pts).sort()).toEqual(['A', 'B', 'C', 'D', 'S']);
  });

  it.each([
    'tam giác ABC, AH ⊥ BC',
    'ΔABC, AH⊥BC',
    String.fromCharCode(92) + 'triangle ABC, AH ' + String.fromCharCode(92) + 'perp BC',
    String.fromCharCode(92) + 'triangle ABC, AH ' + String.fromCharCode(92) + 'bot BC',
    'ABC, AH ⊥ BC',
    'tam giác abc, ah vuông góc bc',
    'tam giác abc ah vuông bc',
    'Cho △ABC có AH ⊥ BC tại H',
    'tam giác ABC, AH ⊥ BC, H ∈ BC',
  ])('"%s" → H là chân đường cao hạ từ A, AH ⊥ BC', (t) => {
    const s = sceneOf(t);
    expect(s.pts.H).toBeDefined();
    const dot = (s.pts.H[0] - s.pts.A[0]) * (s.pts.C[0] - s.pts.B[0]) + (s.pts.H[1] - s.pts.A[1]) * (s.pts.C[1] - s.pts.B[1]);
    expect(Math.abs(dot)).toBeLessThan(1e-9);
    expect(s.aux.some(([a, b]) => a + b === 'AH' || a + b === 'HA')).toBe(true);
    // H nằm trên đường thẳng BC và theo khi kéo đỉnh (có công thức)
    expect(s.defs?.H?.k).toBe('foot');
  });
});


describe('nét lớn của hình', () => {
  it('bỏ nhãn đỉnh và dấu góc vuông nhỏ, giữ ba cạnh', async () => {
    const {frameStrokes, detectPlaneShapeFromStrokes} = await import('../utils/sketchSolid');
    const line = (a: [number, number], b: [number, number]) => ({points: Array.from({length: 15}, (_, i) => ({x: a[0] + ((b[0] - a[0]) * i) / 14, y: a[1] + ((b[1] - a[1]) * i) / 14}))});
    const big = [line([100, 300], [300, 300]), line([300, 300], [100, 150]), line([100, 150], [100, 300])];
    const small = [line([85, 310], [95, 322]), line([305, 310], [315, 322]), line([85, 140], [95, 132]), line([100, 280], [120, 280])];
    const all = [...big, ...small];
    expect(frameStrokes(all)).toHaveLength(3);
    expect(detectPlaneShapeFromStrokes(all as never)).toBeNull(); // nhiều hơn 4 nét: trước đây hỏng
    expect(detectPlaneShapeFromStrokes(frameStrokes(all) as never)).not.toBeNull();
    expect(frameStrokes(small)).toHaveLength(4); // không có nét lớn: giữ nguyên
  });
});

describe('đề dài, nhiều câu', () => {
  const pts = (t: string) => Object.keys(sceneOf(t).pts).sort().join('');
  it('lấy điểm trên cạnh viết nhiều kiểu', () => {
    for (const t of ['Cho hình vuông ABCD. Trên cạnh AB lấy điểm M, trên cạnh AD lấy điểm N.', 'Cho hình vuông ABCD. Lấy điểm M trên cạnh AB, lấy N thuộc cạnh AD.', 'Cho hình vuông ABCD, M nằm trên cạnh AB, N nằm trên AD.', 'Cho hình vuông ABCD. Gọi M là điểm trên cạnh AB, N là điểm thuộc cạnh AD.']) expect(pts(t)).toBe('ABCDMN');
    expect(pts('Cho tam giác ABC, điểm N nằm giữa A và C.')).toBe('ABCN');
  });

  it('các đường cao AD, BE, CF cắt nhau tại H: đủ chân đường cao và trực tâm, không báo "chưa hiểu"', () => {
    const s = sceneOf('Cho tam giác ABC có ba góc nhọn, các đường cao AD, BE, CF cắt nhau tại H. Chứng minh rằng tứ giác BCEF nội tiếp.');
    expect(Object.keys(s.pts).sort().join('')).toBe('ABCDEFH');
    expect(s.ignored).toEqual([]);
    for (const [v, f, p, q] of [['A', 'D', 'B', 'C'], ['B', 'E', 'A', 'C'], ['C', 'F', 'A', 'B']] as const) {
      const dot = (s.pts[f][0] - s.pts[v][0]) * (s.pts[q][0] - s.pts[p][0]) + (s.pts[f][1] - s.pts[v][1]) * (s.pts[q][1] - s.pts[p][1]);
      expect(Math.abs(dot)).toBeLessThan(1e-9);
    }
    // H nằm trên cả ba đường cao: AH ⊥ BC
    expect(Math.abs((s.pts.H[0] - s.pts.A[0]) * (s.pts.C[0] - s.pts.B[0]) + (s.pts.H[1] - s.pts.A[1]) * (s.pts.C[1] - s.pts.B[1]))).toBeLessThan(1e-9);
  });

  it('đường tròn đường kính BC cắt AB tại D, cắt AC tại E', () => {
    const s = sceneOf('Cho tam giác ABC cân tại A. Vẽ đường tròn tâm O đường kính BC cắt AB tại D, cắt AC tại E. Chứng minh rằng BD = CE.');
    expect(Object.keys(s.pts).sort().join('')).toBe('ABCDEO');
    const c = s.circles![0];
    for (const n of ['B', 'C', 'D', 'E']) expect(Math.hypot(s.pts[n][0] - c.center[0], s.pts[n][1] - c.center[1])).toBeCloseTo(c.r, 6);
  });

  it('chỉ có đoạn thẳng hoặc đường tròn vẫn dựng được; không nuốt đoạn thẳng thành đường tròn', () => {
    const seg = sceneOf('Cho đoạn thẳng AB = 6 cm. Gọi M là trung điểm của AB. Vẽ đường tròn tâm M bán kính 3 cm.');
    expect(Object.keys(seg.pts).sort().join('')).toBe('ABM');
    expect(seg.circles![0].r).toBeCloseTo(3, 6);
    expect(pts('Cho nửa đường tròn tâm O đường kính AB. Lấy điểm M trên nửa đường tròn.')).toBe('ABMO'); // M nay được vẽ trên nửa đường tròn
    const tg = sceneOf('Cho đường tròn (O; R) và điểm A nằm ngoài đường tròn. Kẻ hai tiếp tuyến AB, AC với đường tròn (B, C là các tiếp điểm).');
    expect(Object.keys(tg.pts).sort().join('')).toBe('ABCO');
    expect(tg.ignored).toEqual([]);
    const c = tg.circles![0];
    for (const n of ['B', 'C']) expect(Math.hypot(tg.pts[n][0] - c.center[0], tg.pts[n][1] - c.center[1])).toBeCloseTo(c.r, 6);
  });

  it('nhiều bài dán cùng lúc: vẽ bài đầu và báo rõ; tam giác đứng trước hình vuông thì vẽ tam giác', () => {
    const s = sceneOf('Bài 1: Cho tam giác ABC có AB = 5, AC = 6, BC = 7. Chứng minh ABC nhọn.\nBài 2: Cho hình vuông ABCD.');
    expect(Object.keys(s.pts).sort().join('')).toBe('ABC');
    expect(s.ignored.join(' ')).toContain('2 bài');
    expect(pts('Cho tam giác ABC. Dựng hình vuông ABDE trên cạnh AB.')).toContain('C');
  });

  it('trực tâm/trọng tâm không ghi tên tam giác, và các đề dài có a), b) vẫn giữ đủ điểm', () => {
    const t = 'Câu 1. Cho tam giác ABC vuông tại A, có AB = 6 cm, AC = 8 cm. Kẻ đường cao AH. a) Tính BC, AH. b) Gọi M là trung điểm của BC. Chứng minh AM = BC/2.';
    expect(pts(t)).toBe('ABCHM');
  });
});
