import {describe, it, expect} from 'vitest';
import {classroomReducer, initialClassroom, inControl, slimBlueprint, wsUrl, ERROR_TEXT} from '../utils/classroomState';
import type {SimulationBlueprint} from '@socratic/types';

const run = (msgs: Record<string, unknown>[]) => msgs.reduce((s, m) => classroomReducer(s, m as {type: string}), initialClassroom);

describe('classroomState: bộ rút gọn trạng thái phòng học', () => {
  it('STATE đưa học sinh vào phòng với mô phỏng và tham số hiện tại', () => {
    const s = run([{type: 'STATE', role: 'student', roomId: 'ABC123', youId: 'S1', blueprint: {templateId: 'PHYS_PROJECTILE'}, params: {v0: 20}, control: null, teacherOnline: true}]);
    expect(s.status).toBe('open');
    expect(s.blueprint).toMatchObject({templateId: 'PHYS_PROJECTILE'});
    expect(s.params).toEqual({v0: 20});
    expect(s.teacherOnline).toBe(true);
  });

  it('SYNC cập nhật tham số và tăng nonce để giao diện biết có thay đổi mới', () => {
    const s = run([
      {type: 'STATE', role: 'student', youId: 'S1'},
      {type: 'SYNC', key: 'v0', value: 30, by: 'teacher'},
      {type: 'SYNC', key: 'v0', value: 30, by: 'teacher'},
    ]);
    expect(s.params.v0).toBe(30);
    expect(s.lastSync?.nonce).toBe(2);
  });

  it('inControl chỉ đúng cho học sinh được giao quyền, và hết khi bị thu hồi', () => {
    let s = run([{type: 'STATE', role: 'student', youId: 'S1'}]);
    expect(inControl(s)).toBe(false);
    s = classroomReducer(s, {type: 'CONTROL', studentId: 'S1', name: 'An'});
    expect(inControl(s)).toBe(true);
    s = classroomReducer(s, {type: 'CONTROL', studentId: 'S2', name: 'Bình'});
    expect(inControl(s)).toBe(false);
    s = classroomReducer(s, {type: 'CONTROL', studentId: null, name: null});
    expect(s.control).toBeNull();
    expect(inControl(run([{type: 'STATE', role: 'teacher', youId: 'S1'}, {type: 'CONTROL', studentId: 'S1'}]))).toBe(false);
  });

  it('ROSTER: giáo viên thấy danh sách, học sinh chỉ thấy sĩ số', () => {
    const t = run([{type: 'ROSTER', count: 2, students: [{id: 'S1', name: 'An'}, {id: 'S2', name: 'Bình'}], control: null}]);
    expect(t.roster).toHaveLength(2);
    const stu = classroomReducer(t, {type: 'ROSTER', count: 3, control: null});
    expect(stu.studentCount).toBe(3);
    expect(stu.roster).toHaveLength(2); // không bị ghi đè bằng danh sách rỗng
  });

  it('câu hỏi bình chọn: mở → bỏ phiếu → kết quả, mở câu mới thì xóa kết quả cũ', () => {
    let s = run([
      {type: 'STATE', role: 'student', youId: 'S1'},
      {type: 'POLL', question: 'Góc nào?', options: ['30°', '45°'], open: true},
      {type: 'VOTE_ACK', choice: '45°'},
      {type: 'POLL_RESULT', counts: {'30°': 0, '45°': 1}, percents: {'30°': 0, '45°': 100}, total: 1, students: 1, final: false},
    ]);
    expect(s.myVote).toBe('45°');
    expect(s.result?.percents['45°']).toBe(100);
    s = classroomReducer(s, {type: 'POLL', question: 'Câu 2', options: ['a', 'b'], open: true});
    expect(s.result).toBeNull();
    expect(s.myVote).toBeNull();
    s = classroomReducer(s, {type: 'POLL', question: 'Câu 2', options: ['a', 'b'], open: false});
    expect(s.poll?.open).toBe(false);
  });

  it('CLOSED, ERROR có lời nhắn tiếng Việt, thông điệp lạ bị bỏ qua', () => {
    expect(run([{type: 'STATE', role: 'student'}, {type: 'CLOSED'}]).status).toBe('closed');
    expect(run([{type: 'ERROR', code: 'not_in_control'}]).error).toBe(ERROR_TEXT.not_in_control);
    expect(run([{type: 'ERROR', code: 'x_y'}]).error).toContain('x_y');
    expect(run([{type: 'WHAT'}])).toEqual(initialClassroom);
  });

  it('slimBlueprint bỏ SVG nặng nhưng giữ phần còn lại', () => {
    const bp = {engine: 'PHYSICS', templateId: 'PHYS_PROJECTILE', recognizedLatex: 'v', parameters: [], socraticQuestion: 'q', custom_interactive_svg: '<svg>' + 'x'.repeat(100000) + '</svg>'} as SimulationBlueprint;
    const slim = slimBlueprint(bp);
    expect('custom_interactive_svg' in slim).toBe(false);
    expect(slim.templateId).toBe('PHYS_PROJECTILE');
  });

  it('wsUrl đổi http→ws, https→wss và gắn tham số', () => {
    expect(wsUrl('ABC123', {role: 'student', name: 'An Nguyễn'})).toBe('ws://127.0.0.1:8000/ws/rooms/ABC123?role=student&name=An+Nguy%E1%BB%85n');
  });
});
