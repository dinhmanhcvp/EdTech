import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen} from '@testing-library/react';
import {MicroLessonPanel} from '../components/canvas/MicroLessonPanel';
import type {BoardJournalData} from '../utils/vectorJournal';

const journal = (events: BoardJournalData['events']): BoardJournalData => ({header: {version: '1', createdAt: 0, durationMs: 125_000, eventCount: events.length}, events});
const EVENTS: BoardJournalData['events'] = [
  {t: 2000, type: 'ADD_OBJECT', strokeId: 'f1', x: 10, y: 10, color: '#111', typeset: {latex: 'y = x^2 - 3', text: 'y = x² − 3', size: 20, w: 100, h: 30}},
  {t: 30_000, type: 'SPAWN_SIM', id: 's1', template: 'PHYS_PROJECTILE', x: 0, y: 0, scale: 1},
];

describe('MicroLessonPanel', () => {
  it('bảng trống: báo rõ thay vì tạo bài giảng rỗng', () => {
    render(<MicroLessonPanel getJournal={() => journal([])} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    expect(screen.getByTestId('micro-lesson-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('micro-lesson-download')).toBeNull();
  });

  it('có nội dung: dàn bài theo phần, số liệu, đổi sang sơ đồ tư duy, đổi tên, đóng lại', () => {
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    expect(screen.getByTestId('micro-lesson-stats').textContent).toContain('2:05 phút');
    expect(screen.getAllByTestId('micro-lesson-section')).toHaveLength(2);
    expect(screen.getAllByTestId('micro-lesson-moment').map((e) => e.getAttribute('data-kind'))).toEqual(['formula', 'sim']);

    fireEvent.change(screen.getByTestId('micro-lesson-title'), {target: {value: 'Bài 5: Parabol'}});
    fireEvent.click(screen.getByTestId('micro-lesson-tab-map'));
    expect(screen.getByTestId('micro-lesson-map').textContent).toContain('Bài 5: Parabol');
    expect(screen.getAllByTestId('mind-node-1')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('micro-lesson-close'));
    expect(screen.queryByTestId('micro-lesson')).toBeNull();
  });

  it('tải về tạo tệp Markdown có tên bài; sao chép ghi vào bộ nhớ tạm', async () => {
    const blobs: Blob[] = [];
    const create = vi.fn((b: Blob) => (blobs.push(b), 'blob:x'));
    Object.assign(URL, {createObjectURL: create, revokeObjectURL: vi.fn()});
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {clipboard: {writeText}});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.change(screen.getByTestId('micro-lesson-title'), {target: {value: 'Bài 5'}});
    fireEvent.click(screen.getByTestId('micro-lesson-download'));
    expect(await blobs[0].text()).toContain('# Bài 5');
    fireEvent.click(screen.getByTestId('micro-lesson-copy'));
    await screen.findByTestId('micro-lesson-note');
    expect(writeText.mock.calls[0][0]).toContain('# Bài 5');
  });
});

describe('MicroLessonPanel · AI viết lời giảng', () => {
  const NOTES = {summary: 'Tiết học đi từ hàm số đến mô phỏng.', narrations: ['Ta mở đầu bằng hàm số bậc hai.', ''], key_points: ['Parabol có trục đối xứng'], review_questions: ['Đỉnh nằm ở đâu?']};

  it('bấm AI: gửi đúng dàn bài (tên đã sửa, các phần), hiện lời giảng, ý cần nhớ, câu ôn tập và lời nhắc đọc lại', async () => {
    const askFn = vi.fn().mockResolvedValue({notes: NOTES, source: 'openrouter'});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} askFn={askFn} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    expect(screen.queryByTestId('micro-lesson-narration')).toBeNull();
    fireEvent.change(screen.getByTestId('micro-lesson-title'), {target: {value: 'Bài 5'}});
    fireEvent.click(screen.getByTestId('micro-lesson-ai'));
    expect(screen.getByTestId('micro-lesson-ai')).toBeDisabled();
    expect((await screen.findByTestId('micro-lesson-summary')).textContent).toContain('hàm số đến mô phỏng');
    const lesson = askFn.mock.calls[0][0];
    expect(lesson.title).toBe('Bài 5');
    expect(lesson.sections).toHaveLength(2);
    expect(screen.getAllByTestId('micro-lesson-narration')).toHaveLength(1); // phần rỗng không hiện đoạn rỗng
    expect(screen.getByTestId('micro-lesson-review').textContent).toContain('Đỉnh nằm ở đâu?');
    expect(screen.getByTestId('micro-lesson-ai-source')).toBeInTheDocument();
    expect(screen.getByTestId('micro-lesson-ai').textContent).toContain('Viết lại');
  });

  it('AI không dùng được (offline hoặc lỗi mạng): báo rõ, dàn bài vẫn còn, không có lời giảng bịa', async () => {
    const askFn = vi.fn().mockResolvedValueOnce({notes: null, source: 'offline', note: 'Chưa gọi được mô hình AI.'}).mockRejectedValueOnce(new Error('Không kết nối được máy chủ AI.'));
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} askFn={askFn} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.click(screen.getByTestId('micro-lesson-ai'));
    expect((await screen.findByTestId('micro-lesson-ai-error')).textContent).toContain('Chưa gọi được mô hình AI');
    expect(screen.queryByTestId('micro-lesson-narration')).toBeNull();
    expect(screen.getAllByTestId('micro-lesson-section')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('micro-lesson-ai'));
    expect((await screen.findByText(/Không kết nối được/)).textContent).toContain('máy chủ AI');
  });

  it('Markdown tải về có lời giảng khi đã có, và mở lại panel thì bỏ lời giảng cũ', async () => {
    const blobs: Blob[] = [];
    Object.assign(URL, {createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: vi.fn()});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} askFn={vi.fn().mockResolvedValue({notes: NOTES, source: 'gemini'})} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.click(screen.getByTestId('micro-lesson-ai'));
    await screen.findByTestId('micro-lesson-summary');
    fireEvent.click(screen.getByTestId('micro-lesson-download'));
    const md = await blobs[0].text();
    expect(md).toContain('Ta mở đầu bằng hàm số bậc hai.');
    expect(md).toContain('## Ý cần nhớ');
    expect(md).toContain('1. Đỉnh nằm ở đâu?');
    fireEvent.click(screen.getByTestId('micro-lesson-close'));
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    expect(screen.queryByTestId('micro-lesson-summary')).toBeNull();
  });
});

describe('MicroLessonPanel · gửi cho học sinh', () => {
  const NOTES = {summary: 'Tóm tắt.', narrations: ['Ta mở đầu bằng hàm số bậc hai.', ''], key_points: ['Ý chính'], review_questions: ['Đỉnh nằm ở đâu?']};

  it('bảng trống: không có nút gửi', () => {
    render(<MicroLessonPanel getJournal={() => journal([])} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    expect(screen.queryByTestId('micro-lesson-publish')).toBeNull();
  });

  it('gửi đúng tên bài đã sửa, các phần và lời giảng AI nếu có; báo số phần đã gửi', async () => {
    const publishFn = vi.fn().mockResolvedValue({sections: 2});
    const askFn = vi.fn().mockResolvedValue({notes: NOTES, source: 'gemini'});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} askFn={askFn} publishFn={publishFn} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.change(screen.getByTestId('micro-lesson-title'), {target: {value: 'Bài 5'}});
    fireEvent.click(screen.getByTestId('micro-lesson-ai'));
    await screen.findByTestId('micro-lesson-summary');
    fireEvent.click(screen.getByTestId('micro-lesson-publish'));
    expect(screen.getByTestId('micro-lesson-publish')).toBeDisabled();
    expect((await screen.findByTestId('micro-lesson-published')).textContent).toMatch(/2 phần/);
    const snapshot = publishFn.mock.calls[0][0];
    expect(snapshot.lessonTitle).toBe('Bài 5');
    expect(snapshot.boardSnapshots).toHaveLength(2);
    expect(snapshot.boardSnapshots[0].latex).toBe('y = x^2 - 3');
    expect(snapshot.boardSnapshots[0].note).toBe('Ta mở đầu bằng hàm số bậc hai.');
    expect(snapshot.reviewQuestions).toEqual(['Đỉnh nằm ở đâu?']);
  });

  it('chưa bấm AI: vẫn gửi được, không có lời giảng bịa', async () => {
    const publishFn = vi.fn().mockResolvedValue({sections: 2});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} publishFn={publishFn} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.click(screen.getByTestId('micro-lesson-publish'));
    await screen.findByTestId('micro-lesson-published');
    expect(publishFn.mock.calls[0][0].summary).toBeUndefined();
    expect(publishFn.mock.calls[0][0].reviewQuestions).toBeUndefined();
  });

  it('lỗi khi gửi: hiện lý do, nút bấm lại được', async () => {
    const publishFn = vi.fn().mockRejectedValueOnce(new Error('Tài khoản này không có quyền gửi bài cho lớp.')).mockResolvedValueOnce({sections: 2});
    render(<MicroLessonPanel getJournal={() => journal(EVENTS)} publishFn={publishFn} />);
    fireEvent.click(screen.getByTestId('micro-lesson-open'));
    fireEvent.click(screen.getByTestId('micro-lesson-publish'));
    expect((await screen.findByTestId('micro-lesson-publish-error')).textContent).toContain('không có quyền');
    expect(screen.getByTestId('micro-lesson-publish')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('micro-lesson-publish'));
    await screen.findByTestId('micro-lesson-published');
    expect(screen.queryByTestId('micro-lesson-publish-error')).toBeNull();
  });
});
