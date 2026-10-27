import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationWidget } from '../components/canvas/SimulationWidget';
import type { SimulationBlueprint } from '@socratic/types';

describe('Compact Hologram & Parameter Auto-Play UI/UX Upgrades', () => {
  const sampleBlueprint: SimulationBlueprint = {
    engine: 'MATH',
    templateId: 'MATH_TRIG_WAVE',
    recognizedLatex: 'y = 2\\sin(3x)',
    parameters: [
      { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.5 },
      { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3.0, min: 0.5, max: 10.0, step: 0.5 },
    ],
    socraticQuestion: 'Đồ thị biến đổi thế nào khi tăng A?',
  };

  it('hiển thị nút ▶ Auto-Play trên từng tham số trong SimulationWidget và cho phép bật/tắt mượt mà', () => {
    render(<SimulationWidget blueprint={sampleBlueprint} displayMode="DOCK" />);

    const autoPlayABtn = screen.getByTestId('param-autoplay-A');
    expect(autoPlayABtn).toBeInTheDocument();
    expect(autoPlayABtn).toHaveAttribute('aria-pressed', 'false');
    expect(autoPlayABtn.textContent).toBe('▶');

    // Bấm bật Auto-Play cho tham số A
    fireEvent.click(autoPlayABtn);
    expect(autoPlayABtn).toHaveAttribute('aria-pressed', 'true');
    expect(autoPlayABtn.textContent).toBe('⏸');

    // Khi người dùng bấm nút + hoặc kéo thanh trượt, Auto-Play tự động dừng để nhường quyền điều khiển tay
    fireEvent.click(screen.getByTestId('slider-plus-A'));
    expect(autoPlayABtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('hiển thị Tay nắm 6 chấm (6-Dot Grip Handle) và Thanh tác vụ ngữ cảnh 3 nút dưới đáy khi ở chế độ HOLOGRAM', () => {
    const onToggleMode = vi.fn();
    const onClose = vi.fn();

    render(
      <SimulationWidget
        blueprint={sampleBlueprint}
        displayMode="HOLOGRAM"
        onToggleDisplayMode={onToggleMode}
        onClose={onClose}
      />
    );

    // Kiểm tra Tay nắm 6 chấm (:::::) dưới đáy Hologram
    const sixDotGrip = screen.getByTestId('hologram-six-dot-grip');
    expect(sixDotGrip).toBeInTheDocument();
    expect(sixDotGrip.querySelectorAll('span')).toHaveLength(6);

    // Kiểm tra Thanh tác vụ ngữ cảnh 3 nút (Nửa bảng, Đặt lại, Xóa) dưới đáy Hologram
    const ctxBar = screen.getByTestId('hologram-bottom-context-bar');
    expect(ctxBar).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('holo-ctx-dock-btn'));
    expect(onToggleMode).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('holo-ctx-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

