import {describe, expect, it} from 'vitest';
import {BRIEFING_TAG, buildBriefing, withAdvice} from '../lib/briefing';
import {LEVEL, levelOf} from '../lib/mastery';
import {buildScenes} from '../lib/timeline';
import type {ClassMetrics, PlanBody, ResourceItem} from '../lib/hub';

const NOW = 1_800_000_000;
const stu = (name: string, mastery: Record<string, number>, over: Record<string, unknown> = {}) => ({
  studentId: name, name, mastery, done: 3, total: 5, firstTryRate: 0.5, hintsPerItem: 0, minutes: 5, lastActive: NOW - 3600, needsSupport: false, supportReasons: [], ...over,
});
const metrics = (students: ReturnType<typeof stu>[]): ClassMetrics => ({classId: 'c', kcs: [{id: 'nem', label: 'Chuyển động ném'}], students, heatmap: {}, progress: 0.5});

describe('mức nắm vững', () => {
  it('ngưỡng 40% và 70%, biên thuộc mức cao hơn', () => {
    expect([0, 0.399, 0.4, 0.699, 0.7, 1].map(levelOf)).toEqual(['stuck', 'stuck', 'hint', 'hint', 'mastery', 'mastery']);
    expect(Object.values(LEVEL).map((l) => l.label)).toEqual(['Mắc kẹt', 'Cần gợi mở', 'Đạt chuẩn']);
  });
});

describe('tóm tắt sáng', () => {
  it('đếm học sinh học trong 24 giờ, em cần hỗ trợ, kiến thức yếu nhất và câu gợi ý', () => {
    const b = buildBriefing('10A1', metrics([
      stu('An', {nem: 0.2}, {needsSupport: true}), stu('Bình', {nem: 0.5}, {needsSupport: true}), stu('Chi', {nem: 0.95}),
      stu('Dũng', {nem: 0.9}, {lastActive: NOW - 3 * 86400}), stu('Em', {}, {lastActive: null}),
    ]), NOW);
    expect(b.active).toBe(3);
    expect(b.sentences[0]).toBe('Trong 24 giờ qua có 3/5 học sinh lớp 10A1 học sau giờ.');
    expect(b.sentences[1]).toBe('2 em cần hỗ trợ: An, Bình.');
    expect(b.weak).toMatchObject({id: 'nem', label: 'Chuyển động ném', below: 2});
    expect(b.sentences[2]).toContain('nắm vững trung bình 64%');
    expect(b.advice).toBe('Đầu giờ ôn nhanh “Chuyển động ném”: 2 em chưa đạt chuẩn. Chú ý An, Bình.');
  });

  it('không kết luận khi thiếu số liệu: lớp trống, chưa ai học, kiến thức chỉ có 1 em', () => {
    expect(buildBriefing('9A', metrics([]), NOW).sentences[0]).toContain('chưa có học sinh');
    const none = buildBriefing('9A', metrics([stu('An', {}, {lastActive: null})]), NOW);
    expect(none.sentences).toEqual(['Lớp 9A chưa có số liệu học sau giờ. Giao một bài tập trong tiết để bắt đầu có chỉ số.']);
    expect(none.advice).toBeNull();
    const one = buildBriefing('9A', metrics([stu('An', {nem: 0.1}), stu('Bình', {})]), NOW);
    expect(one.weak).toBeNull();
    expect(buildBriefing('9A', metrics([stu('An', {}, {lastActive: NOW - 5 * 86400})]), NOW).sentences[0]).toBe('Trong 24 giờ qua chưa em nào của lớp 9A học sau giờ.');
  });

  it('rút gọn danh sách em cần hỗ trợ sau 3 tên', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map((n) => stu(n, {}, {needsSupport: true}));
    expect(buildBriefing('9A', metrics(many), NOW).sentences[1]).toBe('5 em cần hỗ trợ: A, B, C và 2 em khác.');
  });

  it('gợi ý vào ghi chú: giữ ghi chú cũ, chạy lại thì thay chứ không nhân đôi', () => {
    const once = withAdvice('Mở đầu bằng câu hỏi nhanh.\n', 'Ôn A.');
    expect(once).toBe(`Mở đầu bằng câu hỏi nhanh.\n${BRIEFING_TAG} Ôn A.`);
    expect(withAdvice(once, 'Ôn B.')).toBe(`Mở đầu bằng câu hỏi nhanh.\n${BRIEFING_TAG} Ôn B.`);
    expect(withAdvice('', 'Ôn A.')).toBe(`${BRIEFING_TAG} Ôn A.`);
  });
});

describe('kịch bản tiết học', () => {
  const plan: PlanBody = {title: 'Bài 12', subject: 'PHYSICS', boardContext: '', sections: [
    {id: 's1', title: 'Khởi động', objective: 'Gợi trực giác', kcs: [], items: [{id: 'a', type: 'poll', question: 'Q?', options: ['x', 'y']}]},
    {id: 's2', title: 'Phân tích', objective: '', kcs: [], items: [{id: 'b', type: 'formula', latex: 'x'}, {id: 'c', type: 'problem', text: 't'}, {id: 'd', type: 'sim', templateId: 'SIM_A', params: {}}]},
  ]};
  const res: ResourceItem = {id: 'r1', title: 'Đề 15 phút', subject: 'PHYSICS', kind: 'exam', source: 'file', currentVersion: 1, pageCount: 2, updatedAt: 1};
  const catalog = [{id: 'SIM_A', engine: 'PHYSICS', title: 'Thực hành: ném ngang'}, {id: 'SIM_B', engine: 'PHYSICS', title: 'Rơi tự do'}];

  it('bảng, từng phần giáo án, mô phỏng chưa có trong giáo án, rồi tài nguyên', () => {
    const scenes = buildScenes({lessonTitle: 'Bài ném', plan, resources: [res], sims: ['SIM_A', 'SIM_B'], catalog});
    expect(scenes.map((s) => s.kind)).toEqual(['board', 'plan', 'plan', 'sim', 'resource']);
    expect(scenes[1]).toMatchObject({title: 'Khởi động', detail: 'Gợi trực giác', chips: ['1 câu hỏi nhanh']});
    expect(scenes[2].chips).toEqual(['1 công thức', '1 bài tập', '▶ ném ngang']);
    expect(scenes[3].title).toBe('Rơi tự do'); // SIM_A đã nằm trong giáo án nên không lặp
    expect(scenes[4]).toMatchObject({title: 'Đề 15 phút', detail: 'Đề · 2 trang'});
  });

  it('chưa chuẩn bị gì thì không có cảnh nào', () => {
    expect(buildScenes({resources: [], sims: [], catalog})).toEqual([]);
  });
});
