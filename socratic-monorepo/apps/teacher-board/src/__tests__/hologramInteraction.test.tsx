// apps/teacher-board/src/__tests__/hologramInteraction.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationWidget } from '../components/canvas/SimulationWidget';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { SimulationBlueprint } from '@socratic/types';

describe('Hologram Interaction & Zero-Background Direct Blackboard Manipulation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const testBlueprint: SimulationBlueprint = {
    engine: 'PHYSICS',
    templateId: 'PHYS_PENDULUM',
    recognizedLatex: 'T = 2\\pi\\sqrt{\\frac{l}{g}}',
    parameters: [
      { key: 'L', label: 'Chiều dài dây (L)', unit: 'm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.1 },
      { key: 'theta0', label: 'Góc lệch (θ₀)', unit: 'rad', defaultValue: 0.5, min: 0.1, max: 2.8, step: 0.1 },
    ],
    socraticQuestion: 'Chu kỳ con lắc có phụ thuộc vào biên độ góc lớn hay không?',
  };

  /**
   * TEST 1: Zero-Background Rendering & HUD Corner Brackets
   */
  it('renders in HOLOGRAM mode with zero-background and Sci-Fi HUD brackets', () => {
    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        holoScale={1.2}
      />
    );

    const widget = screen.getByTestId('simulation-widget');
    expect(widget).toHaveAttribute('data-display-mode', 'HOLOGRAM');

    // Engine container must be transparent to blend directly on blackboard
    const engineCanvas = screen.getByTestId('engine-canvas-container');
    expect(engineCanvas.className).toContain('bg-transparent');

    // Hologram indicator must be present
    expect(screen.getByText('Hologram Nổi')).toBeInTheDocument();
  });

  /**
   * TEST 2: Stylus & Touch Drag Grip Callbacks
   */
  it('supports direct stylus and touch dragging on the board', () => {
    const onGripDown = vi.fn();
    const onGripMove = vi.fn();
    const onGripUp = vi.fn();

    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        onGripPointerDown={onGripDown}
        onGripPointerMove={onGripMove}
        onGripPointerUp={onGripUp}
      />
    );

    const grip = screen.getByTestId('hologram-drag-grip');
    expect(grip).toBeInTheDocument();
    expect(grip.textContent).toContain('Kéo mô phỏng');

    fireEvent.pointerDown(grip, { clientX: 200, clientY: 150 });
    expect(onGripDown).toHaveBeenCalled();

    fireEvent.pointerMove(grip, { clientX: 250, clientY: 180 });
    expect(onGripMove).toHaveBeenCalled();

    fireEvent.pointerUp(grip, { clientX: 250, clientY: 180 });
    expect(onGripUp).toHaveBeenCalled();
  });

  /**
   * TEST 3: Freeform Zoom & Scale Controls
   */
  it('supports smooth zoom in / zoom out freeform scaling', () => {
    const onScaleChange = vi.fn();

    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        holoScale={1.0}
        onScaleChange={onScaleChange}
      />
    );

    const scaleLabel = screen.getByTestId('holo-scale-label');
    expect(scaleLabel.textContent).toContain('100%');

    const zoomInBtn = screen.getByTestId('holo-zoom-in');
    fireEvent.click(zoomInBtn);
    expect(onScaleChange).toHaveBeenCalledWith(1.1);

    const zoomOutBtn = screen.getByTestId('holo-zoom-out');
    fireEvent.click(zoomOutBtn);
    expect(onScaleChange).toHaveBeenCalledWith(0.9);
  });

  /**
   * TEST 4: Toggle Display Mode between Hologram and Dock
   */
  it('allows switching between Hologram on-board and Split-View Dock', () => {
    const onToggleMode = vi.fn();

    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        onToggleDisplayMode={onToggleMode}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-display-mode-btn');
    expect(toggleBtn.textContent).toContain('Chia đôi');

    fireEvent.click(toggleBtn);
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });

  /**
   * TEST 5: SmartboardCanvas On-Board Overlay Integration
   */
  it('mounts Hologram overlay directly on top of chalkboard canvas in SmartboardCanvas', () => {
    render(<SmartboardCanvas initialBlueprint={testBlueprint} />);

    // In default HOLOGRAM mode, hologram overlay is mounted directly on board
    const holoOverlay = screen.getByTestId('hologram-simulation-overlay');
    expect(holoOverlay).toBeInTheDocument();

    // Verify Chalkboard canvas remains accessible
    const canvas = screen.getByTestId('chalkboard-canvas');
    expect(canvas).toBeInTheDocument();

    // Switch to Dock mode via toggle button
    const toggleBtn = screen.getByTestId('toggle-display-mode-btn');
    fireEvent.click(toggleBtn);

    // Dock mode should now render active-simulation-modal
    const dockModal = screen.getByTestId('active-simulation-modal');
    expect(dockModal).toBeInTheDocument();

    // Switch back to Hologram mode via "Nổi trên bảng" button in dock header
    const dockSwitchHoloBtn = screen.getByTestId('dock-switch-holo-btn');
    fireEvent.click(dockSwitchHoloBtn);

    // Hologram overlay should be restored
    expect(screen.getByTestId('hologram-simulation-overlay')).toBeInTheDocument();
  });

  /**
   * TEST 6: Ephemeral HUD Brackets & Scale Pill
   */
  it('renders Ephemeral HUD brackets with pinch-to-scale label in HOLOGRAM mode', () => {
    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        holoScale={1.5}
      />
    );

    const brackets = screen.getByTestId('hologram-hud-brackets');
    expect(brackets).toBeInTheDocument();
    expect(brackets.textContent).toContain('[ PINCH TO SCALE: 150% ]');
  });

  /**
   * TEST 7: Dynamic Reactive Socratic Cue Banner on Threshold State
   */
  it('automatically triggers dynamic Socratic cue banner when physical threshold is crossed', () => {
    const projectileBlueprint: SimulationBlueprint = {
      engine: 'PHYSICS',
      templateId: 'PHYS_PROJECTILE',
      recognizedLatex: 'y = x\\tan\\alpha - \\frac{gx^2}{2v_0^2\\cos^2\\alpha}',
      parameters: [
        { key: 'alpha', label: 'Góc bắn (α)', unit: '°', defaultValue: 45, min: 10, max: 80, step: 1 },
        { key: 'v0', label: 'Vận tốc đầu (v₀)', unit: 'm/s', defaultValue: 25, min: 5, max: 50, step: 1 },
        { key: 'g', label: 'Gia tốc trọng trường (g)', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25, step: 0.1 },
      ],
      socraticQuestion: 'Tại sao tầm xa lại đạt cực đại ở góc 45 độ trong chân không?',
    };

    render(
      <SimulationWidget
        blueprint={projectileBlueprint}
        displayMode="HOLOGRAM"
      />
    );

    // At alpha = 45°, dynamic cue banner should automatically appear
    const dynamicCue = screen.getByTestId('dynamic-socratic-cue');
    expect(dynamicCue).toBeInTheDocument();
    expect(dynamicCue.textContent).toContain('Gợi Mở Tư Duy Tức Thời');
    expect(dynamicCue.textContent).toContain('Tầm Bắn Xa Cực Đại Lý Thuyết');
  });

  /**
   * TEST 8: Touch Anywhere Dragging (Seamless Blackboard Manipulation)
   */
  it('supports dragging hologram by touching anywhere on the widget except input sliders', () => {
    const onGripDown = vi.fn();
    const onGripMove = vi.fn();
    const onGripUp = vi.fn();

    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
        onGripPointerDown={onGripDown}
        onGripPointerMove={onGripMove}
        onGripPointerUp={onGripUp}
      />
    );

    const widget = screen.getByTestId('simulation-widget');

    // 1. Touch anywhere on the canvas container -> should trigger dragging
    const canvasContainer = screen.getByTestId('engine-canvas-container');
    fireEvent.pointerDown(canvasContainer, { clientX: 300, clientY: 200 });
    expect(onGripDown).toHaveBeenCalled();

    // 2. Touch on an input range slider -> should NOT trigger dragging so user can scrub parameters
    onGripDown.mockClear();
    const slider = screen.getByTestId('slider-L');
    fireEvent.pointerDown(slider, { clientX: 150, clientY: 400 });
    expect(onGripDown).not.toHaveBeenCalled();
  });

  /**
   * TEST 9: Streamlined Chalk Visualization & Hidden Bulky Taskbars in HOLOGRAM Mode
   */
  it('hides cumbersome feature taskbars in HOLOGRAM mode, leaving only visualization and chalk parameters', () => {
    render(
      <SimulationWidget
        blueprint={testBlueprint}
        displayMode="HOLOGRAM"
      />
    );

    const widget = screen.getByTestId('simulation-widget');
    // Transparent zero-background chalk ink
    expect(widget.className).toContain('bg-transparent');
    expect(widget.className).toContain('border-0');
    expect(widget.className).toContain('shadow-none');

    // Canvas container must be zero-background transparent
    const canvasContainer = screen.getByTestId('engine-canvas-container');
    expect(canvasContainer.className).toContain('bg-transparent');

    // Bulky taskbars (render-mode, curriculum-mode) should be hidden from visual display
    const renderModeToggle = screen.getByTestId('render-mode-toggle');
    expect(renderModeToggle.parentElement?.className).toContain('hidden');

    // Visual parameters must remain visible
    const sliderContainer = screen.getByTestId('macro-sliders-container');
    expect(sliderContainer).toBeInTheDocument();
    expect(sliderContainer.className).toContain('bg-transparent');
    expect(screen.getByTestId('param-box-L')).toBeInTheDocument();
    expect(screen.getByTestId('param-box-theta0')).toBeInTheDocument();
  });
});


