import React from 'react';
import {describe, expect, it} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';

const line = (id: string, y: number): Stroke => ({id, points: [{x: 100, y}, {x: 300, y: y + 20}], color: '#000', width: 3});
const THREE = [line('l1', 100), line('l2', 160), line('l3', 220)];

describe('che / lộ đáp án trên bảng', () => {
  it('chọn lời giải → Che: mỗi dòng một tấm; "Lộ bước kế" lộ lần lượt; Che lại tất cả; chạm để lộ riêng một tấm', () => {
    render(<SmartboardCanvas initialStrokes={THREE} initialSelectedStrokes={THREE} />);
    expect(screen.queryByTestId('cover-bar')).toBeNull();
    fireEvent.click(screen.getByTestId('sel-btn-cover'));

    const covers = screen.getAllByTestId('answer-cover');
    expect(covers).toHaveLength(3);
    expect(covers.every((c) => c.getAttribute('data-hidden') === 'true')).toBe(true);
    expect(screen.getByTestId('cover-reveal-next').textContent).toContain('(3)');

    fireEvent.click(screen.getByTestId('cover-reveal-next'));
    expect(screen.getAllByTestId('answer-cover').map((c) => c.getAttribute('data-hidden'))).toEqual(['false', 'true', 'true']); // lộ theo thứ tự trên xuống

    fireEvent.click(screen.getAllByTestId('answer-cover')[2]); // chạm tấm cuối tự lộ
    expect(screen.getAllByTestId('answer-cover').map((c) => c.getAttribute('data-hidden'))).toEqual(['false', 'true', 'false']);
    expect(screen.getByTestId('cover-reveal-next').textContent).toContain('(1)');

    fireEvent.click(screen.getByTestId('cover-hide-all'));
    expect(screen.getAllByTestId('answer-cover').every((c) => c.getAttribute('data-hidden') === 'true')).toBe(true);
  });

  it('lộ hết thì nút "Lộ bước kế" tắt; tấm đã lộ không chặn bút (không nhận con trỏ)', () => {
    render(<SmartboardCanvas initialStrokes={[line('a', 100)]} initialSelectedStrokes={[line('a', 100)]} />);
    fireEvent.click(screen.getByTestId('sel-btn-cover'));
    fireEvent.click(screen.getByTestId('cover-reveal-next'));
    expect(screen.getByTestId('cover-reveal-next')).toBeDisabled();
    expect(screen.getByTestId('answer-cover').style.pointerEvents).toBe('none');
  });

  it('nội dung AI đọc từ bảng không có tấm che (không lẫn "chữ" ảo vào ngữ cảnh)', async () => {
    const {buildBoardContext} = await import('../utils/boardContext');
    const {makeCovers} = await import('../utils/answerCover');
    const ctx = buildBoardContext({strokes: [...makeCovers([{x: 10, y: 10, w: 100, h: 30}], [])]});
    expect(ctx.items).toEqual([]);
  });
});
