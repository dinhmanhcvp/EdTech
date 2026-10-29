import React from 'react';
import {describe, expect, it} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import {GeometryEngine} from '../engines/GeometryEngine';
import {makeSolidBlueprint} from '../utils/localRouter';
import type {Stroke} from '../utils/lassoGeometry';

const triangle: Stroke[] = [
  {id: 't1', points: [{x: 100, y: 100}, {x: 100, y: 300}], color: '#000', width: 3},
  {id: 't2', points: [{x: 100, y: 300}, {x: 300, y: 300}], color: '#000', width: 3},
  {id: 't3', points: [{x: 300, y: 300}, {x: 100, y: 100}], color: '#000', width: 3},
];

describe('Nhãn "AI đã nhận ra"', () => {
  it('hiện ngay khi nét vẽ được thay bằng hình dựng, nêu loại và tên hình', async () => {
    render(<SmartboardCanvas initialStrokes={triangle} initialSelectedStrokes={triangle} />);
    expect(screen.queryByTestId('recognition-chip')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('top-toolbar-btn-visualize'));
    });
    await act(async () => {
      fireEvent.click(await screen.findByTestId('ai-fab-draw-new'));
    });
    const chip = await screen.findByTestId('recognition-chip');
    expect(chip.textContent).toContain('AI đã nhận ra');
    expect(chip.textContent).toContain('Hình phẳng');
    expect(chip.textContent).toContain('Tam giác');
  });
});

describe('Tách thiết diện ra ngoài (extend)', () => {
  it('nút có trong bảng cắt thiết diện, bật/tắt và đổi nhãn', () => {
    render(<GeometryEngine blueprint={makeSolidBlueprint('cube')} />);
    expect(screen.queryByTestId('geo-section-extend')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('geo-mode-section'));
    const btn = screen.getByTestId('geo-section-extend');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn.textContent).toContain('Tách thiết diện');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.textContent).toContain('về khối');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });
});
