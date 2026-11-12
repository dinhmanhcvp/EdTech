import React from 'react';
import {describe, it, expect, beforeEach} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import type {SimulationBlueprint} from '@socratic/types';

const bp = {
  engine: 'MATH',
  templateId: 'MATH_TRIG_WAVE',
  recognizedLatex: 'y = A \sin(\omega t)',
  ocrAlternatives: [],
  parameters: [
    {key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2, min: 0.5, max: 5, step: 0.5},
    {key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3, min: 0.5, max: 10, step: 0.5},
  ],
  socraticQuestion: 'Khi tăng A thì đồ thị thay đổi thế nào? Chu kì có đổi không vì sao?',
  curriculumLevel: 'THPT_STANDARD',
} as unknown as SimulationBlueprint;

beforeEach(() => window.localStorage.clear());

describe('khung hiển thị mô phỏng: dễ dùng cho giáo viên và học sinh', () => {
  it('không còn huy hiệu kĩ thuật "60 FPS • Local Engine"; thanh quan sát hiện sẵn câu hỏi đầu tiên', () => {
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    expect(screen.queryByText(/60 FPS/)).toBeNull();
    const bar = screen.getByTestId('observe-bar');
    expect(bar.textContent).toContain('Hãy quan sát');
    expect(bar.textContent).toContain('Khi tăng A thì đồ thị thay đổi thế nào?');
    expect(bar.textContent).not.toContain('Chu kì có đổi không'); // chỉ câu đầu, câu đầy đủ mở khi bấm
    fireEvent.click(bar);
    expect(screen.getByTestId('socratic-content').textContent).toContain('Chu kì có đổi không');
    expect(screen.queryByTestId('observe-bar')).toBeNull();
  });

  it('tùy chọn ít dùng gom vào "Thêm"; nút chính (Gợi ý, Đặt lại, Lớp học) luôn hiện', () => {
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    expect(screen.getByTestId('socratic-cue-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-toggle')).toBeInTheDocument();
    const menu = screen.getByTestId('sim-more-menu');
    expect(menu.className).toContain('hidden');
    expect(menu).toContainElement(screen.getByTestId('btn-mode-engine'));
    fireEvent.click(screen.getByTestId('sim-more-btn'));
    expect(screen.getByTestId('sim-more-menu').className).not.toContain('hidden');
    expect(screen.getByTestId('sim-more-btn')).toHaveAttribute('aria-expanded', 'true');
  });

  const num = (id: string) => Number(screen.getByTestId(id).textContent!.match(/-?\d+(?:\.\d+)?/)![0]);
  const val = () => Number(screen.getByTestId('param-val-A').textContent!.match(/-?\d+(?:\.\d+)?/)![0]);

  it('nhảy nhanh tới nhỏ nhất / mặc định / lớn nhất (đúng số ghi trên nút)', () => {
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    const [mn, df, mx] = [num('param-min-A'), num('param-default-A'), num('param-max-A')];
    expect(mn).toBeLessThan(mx);
    fireEvent.click(screen.getByTestId('param-max-A'));
    expect(val()).toBe(mx);
    fireEvent.click(screen.getByTestId('param-min-A'));
    expect(val()).toBe(mn);
    fireEvent.click(screen.getByTestId('param-default-A'));
    expect(val()).toBe(df);
  });

  it('nút +/− không vượt khoảng cho phép', () => {
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    const [mn, mx] = [num('param-min-A'), num('param-max-A')];
    fireEvent.click(screen.getByTestId('param-max-A'));
    fireEvent.click(screen.getByTestId('slider-plus-A'));
    expect(val()).toBe(mx);
    fireEvent.click(screen.getByTestId('param-min-A'));
    fireEvent.click(screen.getByTestId('slider-minus-A'));
    expect(val()).toBe(mn);
  });

  it('chế độ lớp học: nút/chữ to hơn, nhớ lựa chọn sau khi mở lại', () => {
    const {unmount} = render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    expect(screen.getByTestId('slider-plus-A').className).toContain('w-9');
    fireEvent.click(screen.getByTestId('classroom-toggle'));
    expect(screen.getByTestId('classroom-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('slider-plus-A').className).toContain('w-11');
    expect(screen.getByTestId('param-val-A').className).toContain('text-2xl');
    unmount();
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    expect(screen.getByTestId('classroom-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('slider-plus-A').className).toContain('w-11');
  });

  it('tự chạy dừng khi người dùng chỉnh tay', () => {
    render(<SimulationWidget blueprint={bp} displayMode="DOCK" />);
    fireEvent.click(screen.getByTestId('param-autoplay-A'));
    expect(screen.getByTestId('param-autoplay-A').textContent).toContain('Dừng');
    fireEvent.click(screen.getByTestId('param-max-A'));
    expect(screen.getByTestId('param-autoplay-A')).toHaveAttribute('aria-pressed', 'false');
  });
});
