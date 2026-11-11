import React from 'react';
import {describe, it, expect} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import {FRAMES, buildFrame} from '../utils/teachingFrames';

describe('khung sư phạm', () => {
  it('có 6 khung; mỗi khung nằm gọn trong mặt bảng 1200×675 và có nét duy nhất', () => {
    expect(FRAMES.map((f) => f.id)).toEqual(['polya', 'poe', 'cer', 'exit321', 'lesson', 'bloom']);
    for (const f of FRAMES) {
      const s = buildFrame(f.id, 'u');
      expect(new Set(s.map((x) => x.id)).size).toBe(s.length);
      for (const x of s) for (const p of x.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1200);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(675);
      }
    }
  });
  it('Polya khớp 4 bước của coach: tìm hiểu đề, lập kế hoạch, thực hiện, kiểm tra lại', () => {
    const t = buildFrame('polya', 'u').filter((s) => s.typeset).map((s) => s.typeset!.text).join('|');
    for (const w of ['Tìm hiểu đề', 'Lập kế hoạch', 'Thực hiện', 'Kiểm tra lại']) expect(t).toContain(w);
  });
  it('chữ trong khung có id text- để bảng hiển thị như chữ gõ', () => {
    for (const s of buildFrame('cer', 'u').filter((x) => x.typeset)) expect(s.id.startsWith('text-')).toBe(true);
  });
});

describe('menu Thêm → Khung sư phạm', () => {
  it('bấm một khung thì chèn lên bảng (hoàn tác được)', () => {
    render(<SmartboardCanvas />);
    fireEvent.click(screen.getByTestId('btn-more'));
    fireEvent.click(screen.getByTestId('frame-polya'));
    expect(screen.getAllByTestId('typeset-item').length).toBeGreaterThanOrEqual(5);
    fireEvent.click(screen.getByTitle('Hoàn tác (Undo)'));
    expect(screen.queryAllByTestId('typeset-item').length).toBe(0);
  });
});
