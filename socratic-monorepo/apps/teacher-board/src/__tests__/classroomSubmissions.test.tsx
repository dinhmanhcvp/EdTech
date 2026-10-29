import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {SubmitPad} from '../components/classroom/SubmitPad';
import {SubmissionsSection} from '../components/classroom/SubmissionsSection';
import type {Submission} from '../utils/submissionInk';

const draw = (canvas: HTMLElement, pts: [number, number][]) => {
  fireEvent.pointerDown(canvas, {pointerId: 1, clientX: pts[0][0], clientY: pts[0][1]});
  for (const [x, y] of pts.slice(1)) fireEvent.pointerMove(canvas, {pointerId: 1, clientX: x, clientY: y});
  fireEvent.pointerUp(canvas, {pointerId: 1});
};

describe('SubmitPad (học sinh)', () => {
  it('hiện đề; nộp bài rỗng bị chặn; vẽ rồi nộp gửi đúng nét (màu, tọa độ), nút đổi thành Nộp lại sau xác nhận', () => {
    const onSubmit = vi.fn().mockReturnValue(true);
    const {rerender} = render(<SubmitPad prompt="Giải phương trình" open submittedRev={0} onSubmit={onSubmit} />);
    expect(screen.getByTestId('submit-prompt').textContent).toBe('Giải phương trình');
    expect(screen.getByTestId('submit-send')).toBeDisabled();

    fireEvent.click(screen.getByTestId('submit-color-Đỏ'));
    draw(screen.getByTestId('submit-canvas'), [[10, 10], [50, 60], [90, 20]]);
    fireEvent.click(screen.getByTestId('submit-send'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const strokes = onSubmit.mock.calls[0][0];
    expect(strokes).toHaveLength(1);
    expect(strokes[0].c).toBe('#DC2626');
    expect(strokes[0].p[0]).toEqual([10, 10]);
    expect(strokes[0].p).toHaveLength(3);

    rerender(<SubmitPad prompt="Giải phương trình" open submittedRev={1} onSubmit={onSubmit} />);
    expect(screen.getByTestId('submit-status').textContent).toContain('Đã nộp (lần 1)');
    expect(screen.getByTestId('submit-send').textContent).toContain('Nộp lại');
    draw(screen.getByTestId('submit-canvas'), [[100, 100], [120, 120]]); // sửa thêm sau khi nộp
    expect(screen.getByTestId('submit-status').textContent).toContain('Viết lời giải');
  });

  it('chạm rất nhanh (nhấn và nhả trong cùng một lượt xử lý) không làm hỏng bảng nháp và vẫn nộp được chấm đó', () => {
    const onSubmit = vi.fn().mockReturnValue(true);
    render(<SubmitPad prompt="" open submittedRev={0} onSubmit={onSubmit} />);
    const cv = screen.getByTestId('submit-canvas');
    act(() => {
      fireEvent.pointerDown(cv, {pointerId: 1, clientX: 20, clientY: 30});
      fireEvent.pointerUp(cv, {pointerId: 1});
    });
    fireEvent.click(screen.getByTestId('submit-send'));
    expect(onSubmit.mock.calls[0][0]).toEqual([{p: [[20, 30]], c: '#18181B', w: 3}]);
  });

  it('hoàn tác và xóa hết bỏ nét; mất kết nối thì báo, không báo đã nộp', () => {
    const onSubmit = vi.fn().mockReturnValue(false);
    render(<SubmitPad prompt="" open submittedRev={0} onSubmit={onSubmit} />);
    const cv = screen.getByTestId('submit-canvas');
    draw(cv, [[1, 1], [5, 5]]);
    draw(cv, [[20, 20], [30, 30]]);
    fireEvent.click(screen.getByTestId('submit-undo'));
    fireEvent.click(screen.getByTestId('submit-send'));
    expect(onSubmit.mock.calls[0][0]).toHaveLength(1);
    expect(screen.getByTestId('submit-error').textContent).toContain('mất kết nối');
    fireEvent.click(screen.getByTestId('submit-clear'));
    expect(screen.getByTestId('submit-send')).toBeDisabled();
  });

  it('giáo viên đã đóng: không vẽ được, không nộp được, có thông báo', () => {
    render(<SubmitPad prompt="x" open={false} submittedRev={2} onSubmit={vi.fn()} />);
    draw(screen.getByTestId('submit-canvas'), [[1, 1], [9, 9]]);
    expect(screen.getByTestId('submit-send')).toBeDisabled();
    expect(screen.getByTestId('submit-status').textContent).toContain('đã đóng');
  });

  it('bài có quá nhiều nét bị từ chối bằng lời tiếng Việt, không gửi', () => {
    const onSubmit = vi.fn().mockReturnValue(true);
    render(<SubmitPad prompt="" open submittedRev={0} onSubmit={onSubmit} />);
    const cv = screen.getByTestId('submit-canvas');
    for (let i = 0; i < 201; i++) draw(cv, [[i, 1], [i + 1, 2]]);
    fireEvent.click(screen.getByTestId('submit-send'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('submit-error').textContent).toContain('quá nhiều nét');
  });
});

const sub = (id: string, name: string, rev = 1): Submission => ({studentId: id, name, rev, at: 1, strokes: [{p: [[10, 10], [200, 100]], c: '#111', w: 3}]});

describe('SubmissionsSection (giáo viên)', () => {
  it('bắt đầu thu bài gửi đề; cần có học sinh trong phòng', () => {
    const send = vi.fn().mockReturnValue(true);
    const {rerender} = render(<SubmissionsSection state={{collect: null, submissions: [], studentCount: 0}} send={send} />);
    expect(screen.getByTestId('submissions-start')).toBeDisabled();
    rerender(<SubmissionsSection state={{collect: null, submissions: [], studentCount: 5}} send={send} />);
    fireEvent.change(screen.getByTestId('submissions-prompt'), {target: {value: 'Giải x²−5x+6=0'}});
    fireEvent.click(screen.getByTestId('submissions-start'));
    expect(send).toHaveBeenCalledWith({type: 'COLLECT_START', prompt: 'Giải x²−5x+6=0'});
  });

  it('đang thu: hiện số bài đã nộp/sĩ số và nút đóng', () => {
    const send = vi.fn();
    render(<SubmissionsSection state={{collect: {prompt: 'Đề', open: true}, submissions: [sub('S1', 'An')], studentCount: 4}} send={send} />);
    expect(screen.getByTestId('submissions-count').textContent).toContain('1/4');
    fireEvent.click(screen.getByTestId('submissions-end'));
    expect(send).toHaveBeenCalledWith({type: 'COLLECT_END'});
  });

  it('lưới bài ẩn danh theo mặc định (Bài 1, Bài 2), chỉ hiện tên khi giáo viên bật', () => {
    render(<SubmissionsSection state={{collect: {prompt: '', open: false}, submissions: [sub('S1', 'Nguyễn An'), sub('S2', 'Trần Bình', 2)], studentCount: 4}} send={vi.fn()} />);
    const labels = () => screen.getAllByTestId('submission-label').map((e) => e.textContent);
    expect(labels()).toEqual(['Bài 1', 'Bài 2']);
    expect(document.body.textContent).not.toContain('Nguyễn An');
    expect(screen.getByText('lần 2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('submissions-names'));
    expect(labels()).toEqual(['Nguyễn An', 'Trần Bình']);
  });

  it('Chiếu gửi đúng bài và nhãn ẨN DANH (không bao giờ kèm tên) cho bảng', () => {
    const onShow = vi.fn();
    render(<SubmissionsSection state={{collect: {prompt: '', open: false}, submissions: [sub('S1', 'Nguyễn An'), sub('S2', 'Trần Bình')], studentCount: 2}} send={vi.fn()} onShow={onShow} />);
    fireEvent.click(screen.getByTestId('submissions-names')); // dù đang hiện tên trên màn hình giáo viên
    fireEvent.click(within(screen.getAllByTestId('submission-card')[1]).getByTestId('submission-show'));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(onShow.mock.calls[0][1]).toBe('Bài 2');
    expect(onShow.mock.calls[0][0].studentId).toBe('S2');
  });

  it('đợt đã đóng cho phép thu đợt mới', () => {
    const send = vi.fn();
    render(<SubmissionsSection state={{collect: {prompt: 'A', open: false}, submissions: [sub('S1', 'An')], studentCount: 3}} send={send} />);
    expect(screen.getByTestId('submissions-start').textContent).toContain('đợt mới');
  });
});
