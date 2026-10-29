import {describe, expect, it} from 'vitest';
import {MAX_SUB_POINTS, MAX_SUB_STROKES, PAD_H, PAD_W, anonymousLabel, decimate, prepareSubmission, thumbPoints, toBoardStrokes, type InkStroke, type Pt, type Submission} from '../utils/submissionInk';
import {classroomReducer, initialClassroom, type ClassroomState} from '../utils/classroomState';

const line = (n: number, step = 1): Pt[] => Array.from({length: n}, (_, i) => [10 + i * step, 20 + (i % 7)] as Pt);
const ink = (p: Pt[], c = '#111', w = 3): InkStroke => ({p, c, w});
const run = (msgs: Record<string, unknown>[], from: ClassroomState = initialClassroom) => msgs.reduce((s, m) => classroomReducer(s, m as {type: string}), from);

describe('decimate / prepareSubmission', () => {
  it('giữ điểm đầu và cuối, bỏ điểm quá gần nhau', () => {
    const out = decimate([[0, 0], [0.2, 0], [0.4, 0], [5, 0], [5.1, 0], [10, 0]], 1);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([10, 0]);
    expect(out).toEqual([[0, 0], [5, 0], [10, 0]]);
    expect(decimate([[1, 1]], 5)).toEqual([[1, 1]]);
  });

  it('bài rỗng thì từ chối; quá nhiều nét thì từ chối chứ không cắt lặng lẽ', () => {
    expect(prepareSubmission([])).toEqual({ok: false, reason: 'empty'});
    expect(prepareSubmission([ink([])])).toEqual({ok: false, reason: 'empty'});
    const many = Array.from({length: MAX_SUB_STROKES + 1}, () => ink([[1, 1], [2, 2]]));
    expect(prepareSubmission(many)).toEqual({ok: false, reason: 'too_many_strokes'});
  });

  it('bài nhỏ giữ nguyên số điểm, làm tròn 0,1 và kẹp trong khung bảng', () => {
    const r = prepareSubmission([ink([[10.04, 20.06], [-5, 9999], [30, 40]])]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.strokes[0].p).toEqual([[10, 20.1], [0, PAD_H], [30, 40]]);
  });

  it('bài quá nhiều điểm được rút gọn cho vừa giới hạn máy chủ mà vẫn giữ đầu/cuối từng nét', () => {
    const strokes = Array.from({length: 20}, (_, k) => ink(Array.from({length: 600}, (_, i) => [k * 50 + (i % 40) * 0.8, 10 + Math.floor(i / 40) * 0.8] as Pt)));
    const r = prepareSubmission(strokes);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.points).toBeLessThanOrEqual(MAX_SUB_POINTS);
      expect(r.strokes).toHaveLength(20);
      const r1 = (q: Pt): Pt => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10];
      expect(r.strokes[3].p[0]).toEqual(r1(strokes[3].p[0]));
      expect(r.strokes[3].p[r.strokes[3].p.length - 1]).toEqual(r1(strokes[3].p[599]));
    }
  });

  it('một nét dài quá giới hạn riêng cũng được rút gọn', () => {
    const r = prepareSubmission([ink(Array.from({length: 2500}, (_, i) => [i * 0.4, (i % 3) * 0.4] as Pt))]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.strokes[0].p.length).toBeLessThanOrEqual(1500);
  });
});

describe('bài nhận được → bảng giáo viên', () => {
  const sub: Submission = {studentId: 'S1', name: 'An', rev: 2, at: 1, strokes: [ink([[1, 2], [3, 4]], '#ff0000', 5), ink([[9, 9]])]};
  it('mỗi nét thành một nét trên bảng, id duy nhất theo học sinh và lần nộp, giữ màu và độ dày', () => {
    const out = toBoardStrokes(sub);
    expect(out.map((s) => s.id)).toEqual(['sub-S1-2-0', 'sub-S1-2-1']);
    expect(out[0]).toMatchObject({color: '#ff0000', width: 5, points: [{x: 1, y: 2}, {x: 3, y: 4}]});
    expect(out[0].typeset).toBeUndefined(); // là nét tay thường: chọn, tẩy, chấm được như mọi nét
  });
  it('nhãn ẩn danh theo thứ tự; hình thu nhỏ giữ tỉ lệ bảng', () => {
    expect(anonymousLabel(0)).toBe('Bài 1');
    expect(anonymousLabel(11)).toBe('Bài 12');
    expect(thumbPoints(ink([[0, 0], [PAD_W, PAD_H]]), 120, 67.5)).toBe('0,0 120,67.5');
  });
});

describe('classroomReducer: thu bài', () => {
  const sub = (id: string, rev = 1, name = 'An') => ({type: 'SUBMISSION', studentId: id, name, rev, at: 1, strokes: [ink([[1, 1]])]});

  it('giáo viên: bài nộp thêm theo thứ tự đầu tiên; nộp lại thì thay đúng chỗ, không đổi vị trí', () => {
    const s = run([{type: 'STATE', role: 'teacher'}, sub('S1'), sub('S2', 1, 'Bình'), sub('S1', 2)]);
    expect(s.submissions.map((x) => [x.studentId, x.rev])).toEqual([['S1', 2], ['S2', 1]]);
  });

  it('STATE của giáo viên nối lại khôi phục toàn bộ bài đã nhận và đợt thu bài', () => {
    const s = run([{type: 'STATE', role: 'teacher', collect: {prompt: 'Giải', open: true}, submissions: [sub('S1'), sub('S2', 3)]}]);
    expect(s.submissions).toHaveLength(2);
    expect(s.collect).toEqual({prompt: 'Giải', open: true});
  });

  it('học sinh: mở đợt → nộp → nhận xác nhận; đóng đợt giữ dấu đã nộp; đợt mới xóa dấu', () => {
    let s = run([{type: 'STATE', role: 'student', youId: 'S1'}, {type: 'COLLECT', prompt: 'Vẽ đồ thị', open: true}]);
    expect(s.collect).toEqual({prompt: 'Vẽ đồ thị', open: true});
    expect(s.mySubmitRev).toBe(0);
    s = classroomReducer(s, {type: 'SUBMIT_ACK', rev: 1});
    expect(s.mySubmitRev).toBe(1);
    s = classroomReducer(s, {type: 'COLLECT', prompt: 'Vẽ đồ thị', open: false});
    expect(s.collect?.open).toBe(false);
    expect(s.mySubmitRev).toBe(1);
    s = classroomReducer(s, {type: 'COLLECT', prompt: 'Đợt 2', open: true});
    expect(s.mySubmitRev).toBe(0);
    expect(s.submissions).toEqual([]);
  });

  it('giáo viên bắt đầu đợt mới thì danh sách bài cũ được xóa; đóng đợt thì giữ để xem', () => {
    let s = run([{type: 'STATE', role: 'teacher'}, {type: 'COLLECT', prompt: 'A', open: true}, sub('S1')]);
    s = classroomReducer(s, {type: 'COLLECT', prompt: 'A', open: false});
    expect(s.submissions).toHaveLength(1);
    s = classroomReducer(s, {type: 'COLLECT', prompt: 'B', open: true});
    expect(s.submissions).toEqual([]);
  });

  it('lỗi thu bài có thông báo tiếng Việt; hết lớp thì xóa đợt thu', () => {
    expect(run([{type: 'ERROR', code: 'no_open_collect'}]).error).toContain('chưa mở');
    expect(run([{type: 'ERROR', code: 'bad_submission'}]).error).toContain('quá lớn');
    expect(run([{type: 'COLLECT', prompt: 'x', open: true}, {type: 'CLOSED'}]).collect).toBeNull();
  });
});
