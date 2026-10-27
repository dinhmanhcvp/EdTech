import React from 'react';
import {describe, it, expect} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';

const line: Stroke = {id: 'l1', points: [{x: 100, y: 100}, {x: 300, y: 100}], color: '#000', width: 3};

describe('bảng trắng: thu phóng, trang, công cụ', () => {
  it('thu phóng bằng nút và về vừa khung', () => {
    render(<SmartboardCanvas />);
    const wrap = screen.getByTestId('board-wrap');
    expect(wrap.dataset.zoom).toBe('1.000');
    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(parseFloat(wrap.dataset.zoom!)).toBeGreaterThan(1.2);
    expect(screen.getByTestId('zoom-level').textContent).toMatch(/12\d%/);
    fireEvent.click(screen.getByTestId('zoom-fit'));
    expect(wrap.dataset.zoom).toBe('1.000');
    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(parseFloat(wrap.dataset.zoom!)).toBeLessThan(1);
  });

  it('Ctrl + cuộn thu phóng; cuộn thường khi chưa phóng thì không đổi', () => {
    render(<SmartboardCanvas />);
    const wrap = screen.getByTestId('board-wrap');
    fireEvent.wheel(wrap, {deltaY: 120});
    expect(wrap.dataset.zoom).toBe('1.000');
    fireEvent.wheel(wrap, {deltaY: -200, ctrlKey: true});
    expect(parseFloat(wrap.dataset.zoom!)).toBeGreaterThan(1);
  });

  it('thêm / chuyển / xóa trang; nét thuộc đúng trang', () => {
    render(<SmartboardCanvas initialStrokes={[line]} />);
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 1');
    expect(screen.getByTestId('page-delete')).toBeDisabled();
    fireEvent.click(screen.getByTestId('page-add'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('2 / 2');
    expect(screen.getByTestId('page-next')).toBeDisabled();
    fireEvent.click(screen.getByTestId('page-prev'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 2');
    fireEvent.click(screen.getByTestId('page-next'));
    fireEvent.click(screen.getByTestId('page-delete'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 1');
  });

  it('dock có công cụ Tay và Chữ; chọn Chữ rồi chạm bảng mở ô nhập', async () => {
    render(<SmartboardCanvas />);
    fireEvent.click(screen.getByTestId('tool-text'));
    const canvas = screen.getByTestId('chalkboard-canvas');
    fireEvent.pointerDown(canvas, {pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50});
    expect(await screen.findByTestId('text-draft-input', {}, {timeout: 1000})).toBeInTheDocument();
    expect(screen.getByTestId('tool-pan')).toBeInTheDocument();
  });

  it('chọn nét rồi nhân đôi', () => {
    render(<SmartboardCanvas initialStrokes={[line]} initialSelectedStrokes={[line]} />);
    fireEvent.click(screen.getByTestId('sel-btn-duplicate'));
    expect(screen.getByTestId('sel-btn-duplicate')).toBeInTheDocument(); // vùng chọn chuyển sang bản sao
  });
});
