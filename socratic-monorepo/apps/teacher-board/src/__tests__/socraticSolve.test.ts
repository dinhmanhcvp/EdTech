import {describe, it, expect} from 'vitest';
import {BANK, GENERIC, SUBJECT_NAME, type SubjectId} from '../utils/socraticBank';
import {classifyProblem, hintAt, advance, newSolveState, type SolveState, levelAfterDiagnosis, pitfallQuestion, reviewFromGrade, reviewChemLine, problemFromContext, typesOfSubject, STUCK_OPTIONS} from '../utils/socraticSolve';
import type {BoardContext} from '../utils/boardContext';

const CASES: [string, string, string][] = [
  // [đề, id dạng mong đợi, môn khóa (nếu có)]
  ['Giải phương trình 2x^2 - 5x + 3 = 0', 'm_eq', ''],
  ['Giải bất phương trình (x-1)(x+2) > 0', 'm_ineq', ''],
  ['Giải hệ phương trình x + y = 5, x - y = 1', 'm_system', ''],
  ['Giải phương trình log_2(x-1) = 3', 'm_explog', ''],
  ['Giải phương trình sin x = 1/2', 'm_trig', ''],
  ['Khảo sát sự biến thiên và tìm cực trị của hàm số y = x^3 - 3x', 'm_func', ''],
  ['Viết phương trình tiếp tuyến của đồ thị tại điểm có hoành độ 1', 'm_tangent', ''],
  ['Tính tích phân từ 0 đến 1 của x e^x dx', 'm_integral', ''],
  ['Tính giới hạn lim x→0 sin x / x', 'm_limit', ''],
  ['Cho cấp số cộng có công sai d = 3, tìm số hạng tổng quát', 'm_seq', ''],
  ['Có bao nhiêu cách chọn 3 học sinh từ 10 học sinh? Tính xác suất', 'm_comb', ''],
  ['Trong không gian Oxyz, viết phương trình mặt phẳng đi qua ba điểm', 'm_vec', ''],
  ['Tìm giá trị của tham số m để phương trình có hai nghiệm phân biệt', 'm_param', ''],
  ['Một xe đi từ A đến B với vận tốc 40 km/h, tăng thêm 20% thì về sớm 30 phút. Tính quãng đường', 'm_word', ''],
  ['Cho tam giác ABC vuông tại A. Chứng minh rằng AM = BM', 'm_geo', ''],
  ['Một vật chuyển động thẳng nhanh dần đều với gia tốc 2 m/s2, tính quãng đường sau 5 s', 'p_kin', ''],
  ['Vật khối lượng 2 kg trượt trên mặt phẳng nghiêng có ma sát, tính gia tốc', 'p_dyn', ''],
  ['Tính công suất trung bình và cơ năng của vật rơi', 'p_energy', ''],
  ['Va chạm mềm giữa hai vật, tính vận tốc sau va chạm từ bảo toàn động lượng', 'p_mom', ''],
  ['Cho mạch điện gồm hai điện trở mắc song song, định luật Ôm, tính cường độ dòng điện', 'p_elec', ''],
  ['Mạch RLC nối tiếp có cộng hưởng, tính tổng trở và hệ số công suất', 'p_ac', ''],
  ['Con lắc lò xo dao động điều hòa, viết phương trình dao động, tính chu kì', 'p_osc', ''],
  ['Vật đặt trước thấu kính hội tụ tiêu cự 10 cm, tìm vị trí và tính chất ảnh', 'p_optics', ''],
  ['Khí lí tưởng biến đổi đẳng nhiệt, tính áp suất cuối', 'p_thermo', ''],
  ['Hạt nhân phóng xạ có chu kì bán rã 8 ngày', 'p_modern', ''],
  ['Cân bằng phương trình hóa học Fe + O2 → Fe3O4', 'c_balance', ''],
  ['Tính khối lượng sản phẩm khi cho 5,6 g Fe tác dụng hết với axit, hiệu suất 80%', 'c_mol', ''],
  ['Tính pH của dung dịch HCl 0,01M', 'c_solution', ''],
  ['Xác định số oxi hóa và bảo toàn electron trong phản ứng Cu với HNO3 đặc', 'c_redox', ''],
  ['Đốt cháy hoàn toàn một hợp chất hữu cơ, xác định công thức phân tử', 'c_organic', ''],
  ['Điện phân dung dịch CuSO4 với điện cực trơ, tính khối lượng thoát ra ở catot', 'c_electro', ''],
  ['Phép lai hai cặp tính trạng, xác định kiểu gen và tỉ lệ kiểu hình ở đời con', 'b_gen', ''],
  ['Một gen có 3000 nuclêôtit, nhân đôi hai lần, tính số nuclêôtit từng loại', 'b_mol', ''],
  ['Trong chuỗi thức ăn, hiệu suất sinh thái giữa các bậc dinh dưỡng', 'b_eco', ''],
  ['Quang hợp diễn ra ở đâu trong tế bào, pha sáng và pha tối', 'b_phys', ''],
  ['Đọc hiểu: xác định biện pháp tu từ và nêu thông điệp của đoạn thơ', 'l_read', ''],
  ['Nghị luận xã hội: suy nghĩ của em về hiện tượng bạo lực học đường', 'l_social', ''],
  ['Phân tích nhân vật Chí Phèo trong tác phẩm của Nam Cao', 'l_essay', ''],
  ['Nguyên nhân dẫn đến thắng lợi của chiến dịch Điện Biên Phủ và ý nghĩa lịch sử', 'h_event', ''],
  ['Dựa vào Atlat và bảng số liệu, nhận xét cơ cấu dân số', 'g_chart', ''],
  ['Choose the correct answer: She has lived here since 2010 (tense)', 'e_gram', ''],
  ['Viết thuật toán sắp xếp mảng bằng Python và nêu độ phức tạp', 'i_algo', ''],
  ['Phân tích tình huống: hành vi vi phạm quyền và nghĩa vụ công dân', 'd_civics', ''],
];

describe('nhận diện dạng bài (mọi môn)', () => {
  for (const [text, id] of CASES) it(`${id}: ${text.slice(0, 40)}…`, () => expect(classifyProblem(text).id).toBe(id));

  it('có đủ các môn trong ngân hàng và mỗi môn có dạng chung dự phòng', () => {
    const subjects = new Set(BANK.map((b) => b.subject));
    for (const s of ['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'LITERATURE', 'HISTORY', 'GEOGRAPHY', 'ENGLISH', 'INFORMATICS', 'CIVICS'] as SubjectId[]) expect(subjects.has(s), s).toBe(true);
    for (const s of Object.keys(SUBJECT_NAME) as SubjectId[]) expect(GENERIC[s].subject).toBe(s);
    expect(BANK.length).toBeGreaterThanOrEqual(40);
  });
  it('không nhận ra → dạng chung; có khóa môn thì dùng dạng chung của môn đó', () => {
    expect(classifyProblem('abc xyz').id).toBe('generic_GENERAL');
    expect(classifyProblem('một đề lạ hoàn toàn', 'PHYSICS').id).toBe('generic_PHYSICS');
  });
  it('phương trình hóa học không bị nhầm với phương trình đại số', () => {
    expect(classifyProblem('Giải phương trình sau: Zn + HCl').subject).toBe('CHEMISTRY');
    expect(classifyProblem('Hoàn thành phương trình hóa học Al + O2').id).toBe('c_balance');
  });
  it('môn đang khóa ưu tiên dạng của môn đó', () => {
    expect(classifyProblem('Tính năng lượng', 'PHYSICS').subject).toBe('PHYSICS');
  });
});

describe('mỗi dạng đều đủ dữ liệu và chỉ là CÂU HỎI', () => {
  it('đủ trường, dạng câu hỏi, không chứa lời giải cuối cùng', () => {
    for (const t of [...BANK, ...Object.values(GENERIC)]) {
      expect(t.given.length, t.id).toBeGreaterThan(20);
      expect(t.plan.length, t.id).toBeGreaterThan(0);
      expect(t.pitfalls.length, t.id).toBeGreaterThan(0);
      for (const q of [t.given, ...t.plan, t.check, ...t.pitfalls]) expect(q, `${t.id}: ${q}`).toMatch(/\?/);
      expect(t.step, t.id).toMatch(/(em|Em)\b/); // lời mời học sinh tự làm bước đầu
      for (const q of [t.given, ...t.plan, t.step, t.check]) expect(q, t.id).not.toMatch(/đáp\s*số\s*(là|=)|kết\s*quả\s*(là|bằng)\s*\d/i);
    }
  });
  it('mỗi môn có nhiều dạng để chọn tay khi máy nhận sai', () => {
    expect(typesOfSubject('MATH').length).toBeGreaterThan(10);
    expect(typesOfSubject('PHYSICS').length).toBeGreaterThan(8);
    expect(typesOfSubject('LITERATURE').length).toBeGreaterThanOrEqual(4);
  });
});

describe('thang gợi ý Polya và chẩn đoán', () => {
  const ty = classifyProblem('Giải phương trình 2x^2 - 5x + 3 = 0');
  it('bốn mức đúng khung, mức 1–3 nhắc dành thời gian tự làm', () => {
    const hs = ([1, 2, 3, 4] as const).map((l) => hintAt(ty, l));
    expect(hs.map((h) => h.title)).toEqual(['① Tìm hiểu đề', '② Lập kế hoạch', '③ Thực hiện', '④ Kiểm tra lại']);
    expect(hs[0].wait && hs[1].wait && hs[2].wait).toBeTruthy();
    expect(hs[3].wait).toBeUndefined();
  });
  it('chẩn đoán chỗ vướng → vào đúng mức', () => {
    expect(STUCK_OPTIONS.map((o) => levelAfterDiagnosis(o.id))).toEqual([1, 2, 3, 4]);
  });
  it('đổi ý ở mức lập kế hoạch có câu hỏi khác', () => {
    expect(hintAt(ty, 2, 0).question).not.toBe(hintAt(ty, 2, 1).question);
  });
  it('làm đúng thì sang mức kế; sai lần 1 hỏi bẫy; sai lần 2 nâng mức; không vượt mức 4', () => {
    let s = newSolveState();
    let r = advance(s, 'ok');
    expect(r.state.level).toBe(2);
    s = r.state;
    r = advance(s, 'miss');
    expect(r.ask).toBe('pitfall');
    r = advance(r.state, 'miss');
    expect(r.ask).toBe('deeper');
    expect(r.state.level).toBe(3);
    let z: SolveState = {...newSolveState(), level: 4};
    z = advance(z, 'ok').state;
    expect(z.level).toBe(4);
  });
  it('bẫy thường gặp lần lượt, quay vòng', () => {
    expect(pitfallQuestion(ty, 0)).not.toBe(pitfallQuestion(ty, 1));
    expect(pitfallQuestion(ty, ty.pitfalls.length)).toBe(pitfallQuestion(ty, 0));
  });
});

describe('nhận xét một bước làm: câu hỏi, không sửa hộ', () => {
  it('bước sai → hỏi theo loại lỗi, chi tiết chỉ nằm ở detail', () => {
    const r = reviewFromGrade({status: 'error', kind: 'sign', title: 'Sai dấu khi chuyển vế', explain: 'Chuyển vế phải đổi dấu.', fix: 'x = 3'});
    expect(r.verdict).toBe('miss');
    expect(r.question).toMatch(/dấu/);
    expect(r.question).not.toContain('x = 3');
    expect(r.detail).toContain('x = 3');
  });
  it('bước đúng → hỏi vì sao; không chắc → hỏi lí do', () => {
    expect(reviewFromGrade({status: 'ok'}).verdict).toBe('ok');
    expect(reviewFromGrade({status: 'warn', title: 'đơn vị'}).verdict).toBe('unknown');
    expect(reviewFromGrade(undefined).verdict).toBe('unknown');
  });
  it('phương trình hóa học: đếm nguyên tử ngoại tuyến, không báo đáp án', () => {
    const bad = reviewChemLine('Fe + O2 → Fe3O4')!;
    expect(bad.verdict).toBe('unknown'); // chưa ghi hệ số
    const wrong = reviewChemLine('2Fe + O2 → Fe3O4')!;
    expect(wrong.verdict).toBe('miss');
    expect(wrong.question).toMatch(/Fe|O/);
    expect(wrong.question).not.toMatch(/3Fe/);
    expect(reviewChemLine('3Fe + 2O2 → Fe3O4')!.verdict).toBe('ok');
    expect(reviewChemLine('6Fe + 4O2 → 2Fe3O4')!.verdict).toBe('miss'); // chưa tối giản
    expect(reviewChemLine('Giải phương trình 2x = 4')).toBeNull();
  });
});

describe('lấy đề từ bảng', () => {
  const ctx: BoardContext = {items: [
    {id: 'a', kind: 'formula', text: 'Giải phương trình x^2 = 4'},
    {id: 'b', kind: 'formula', latex: 'v = v_0 + at'},
    {id: 'c', kind: 'solid', geo: {problem: 'Cho tam giác ABC', parts: [], edges: []}},
  ]};
  it('không có vùng chọn: gom chữ/công thức/đề hình; có vùng chọn: chỉ phần đó', () => {
    expect(problemFromContext(ctx)).toContain('x^2 = 4');
    expect(problemFromContext(ctx)).toContain('tam giác ABC');
    expect(problemFromContext({...ctx, selection: {item_ids: ['b']}})).toBe('v = v_0 + at');
  });
});
