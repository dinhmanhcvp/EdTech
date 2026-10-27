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

  /**
   * TEST 10: Multi-Touch Pinch-to-Zoom, Corner Handle & Wheel Zoom for Hologram
   */
  it('supports smooth multi-touch pinch to zoom and tactile corner resize handle', () => {
    render(<SmartboardCanvas initialBlueprint={testBlueprint} />);

    const overlay = screen.getByTestId('hologram-simulation-overlay');
    expect(overlay).toBeInTheDocument();

    // 1. Two-finger pinch gesture
    fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(overlay, { pointerId: 2, clientX: 200, clientY: 100 });
    // Move fingers farther apart (distance doubles)
    fireEvent.pointerMove(overlay, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(overlay, { pointerId: 1 });
    fireEvent.pointerUp(overlay, { pointerId: 2 });

    // Scale should have increased smoothly
    expect(overlay.style.transform).toContain('scale(');

    // 2. Corner touch resize handle
    const resizeHandle = screen.getByTestId('holo-touch-resize-handle');
    expect(resizeHandle).toBeInTheDocument();
    fireEvent.pointerDown(resizeHandle, { pointerId: 3, clientX: 500, clientY: 500 });
    fireEvent.pointerMove(overlay, { pointerId: 3, clientX: 600, clientY: 600 });
    fireEvent.pointerUp(resizeHandle, { pointerId: 3 });

    // 3. Wheel zoom on overlay
    fireEvent.wheel(overlay, { deltaY: -100 });
    expect(overlay.style.transform).toContain('scale(');
  });

  /**
   * TEST 11: Minimalist Lasso Action Bar with Subject Context Selector
   */
  it('renders minimalist lasso toolbar with contextual subject selector and without hardcoded suggestion chips', () => {
    render(<SmartboardCanvas />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // Switch to lasso tool and draw loop
    const dockLasso = screen.getByTestId('tool-lasso');
    fireEvent.click(dockLasso);

    // Draw stroke 1 with pen
    const dockPen = screen.getByTestId('tool-pen');
    fireEvent.click(dockPen);
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150 });
    fireEvent.pointerUp(canvas);

    // Switch back to lasso and enclose stroke
    fireEvent.click(dockLasso);
    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 80 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 80 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 180 });
    fireEvent.pointerUp(canvas);

    // Minimalist lasso action bar appears
    const bar = screen.getByTestId('lasso-action-bar');
    expect(bar).toBeInTheDocument();

    // Subject context selector is prominent
    expect(screen.getByTestId('subject-lock')).toBeInTheDocument();
    expect(screen.getByTestId('subject-auto')).toBeInTheDocument();
    expect(screen.getByTestId('subject-math')).toBeInTheDocument();
    expect(screen.getByTestId('subject-physics')).toBeInTheDocument();
    expect(screen.getByTestId('subject-chemistry')).toBeInTheDocument();
    expect(screen.getByTestId('subject-biology')).toBeInTheDocument();

    // Clicking subject changes domain context
    fireEvent.click(screen.getByTestId('subject-physics'));

    // Core actions are present
    expect(screen.getByTestId('btn-convert-ink')).toBeInTheDocument();
    expect(screen.getByTestId('btn-visualize')).toBeInTheDocument();
    expect(screen.getByTestId('btn-grade-ink')).toBeInTheDocument();

    // 10 hardcoded instant suggestion chips must NOT clutter the bar
    expect(screen.queryByTestId('smart-chip-physics')).toBeNull();
    expect(screen.queryByTestId('smart-chip-ripple')).toBeNull();
    expect(screen.queryByTestId('smart-chip-chemistry')).toBeNull();
  });

  /**
   * TEST 12: Separation of Formula & Visualization vs Student Grading
   */
  it('differentiates between visual conversion mode and student grading mode', () => {
    render(<SmartboardCanvas />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // Draw stroke
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 250 });
    fireEvent.pointerUp(canvas);

    // Lasso the stroke
    const dockLasso = screen.getByTestId('tool-lasso');
    fireEvent.click(dockLasso);
    fireEvent.pointerDown(canvas, { clientX: 180, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 280, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 280, clientY: 280 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 280 });
    fireEvent.pointerUp(canvas);

    // 1. Open "Chuyển thành công thức" -> VISUAL mode
    const btnConvert = screen.getByTestId('btn-convert-ink');
    fireEvent.click(btnConvert);

    const convertPanel = screen.getByTestId('ink-convert-panel');
    expect(convertPanel).toBeInTheDocument();

    // In VISUAL mode: solution-grading-panel is NOT rendered!
    expect(screen.queryByTestId('solution-grading-panel')).toBeNull();

    // 2. Switch to "Chấm bài" tab
    const tabGrade = screen.getByTestId('ink-tab-grade');
    fireEvent.click(tabGrade);

    // In GRADE mode: solution-grading-panel is displayed!
    expect(screen.getByTestId('solution-grading-panel')).toBeInTheDocument();
    expect(screen.getByTestId('solution-expected-input')).toBeInTheDocument();
    expect(screen.getByTestId('solution-grade-btn')).toBeInTheDocument();

    // 3. Switch back to VISUAL tab
    const tabVisual = screen.getByTestId('ink-tab-visual');
    fireEvent.click(tabVisual);
    expect(screen.queryByTestId('solution-grading-panel')).toBeNull();
  });
  /**
   * TEST 13: Draggable AI Tool Hub & Circular Radial Menu with Direct LaTeX Conversion
   */
  it('renders draggable AI Hub on lasso and opens circular radial menu with LaTeX conversion', () => {
    render(<SmartboardCanvas />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // Draw stroke
    fireEvent.pointerDown(canvas, { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(canvas, { clientX: 350, clientY: 350 });
    fireEvent.pointerUp(canvas);

    // Lasso the stroke
    const dockLasso = screen.getByTestId('tool-lasso');
    fireEvent.click(dockLasso);
    fireEvent.pointerDown(canvas, { clientX: 280, clientY: 280 });
    fireEvent.pointerMove(canvas, { clientX: 380, clientY: 280 });
    fireEvent.pointerMove(canvas, { clientX: 380, clientY: 380 });
    fireEvent.pointerMove(canvas, { clientX: 280, clientY: 380 });
    fireEvent.pointerUp(canvas);

    // 1. Draggable AI Hub is rendered on canvas
    const aiHub = screen.getByTestId('draggable-ai-hub');
    expect(aiHub).toBeInTheDocument();

    const aiHubBtn = screen.getByTestId('radial-ai-hub-btn');
    expect(aiHubBtn).toBeInTheDocument();

    // 2. Dragging the AI Hub changes position smoothly
    fireEvent.pointerDown(aiHubBtn, { clientX: 330, clientY: 250, pointerId: 1 });
    fireEvent.pointerMove(aiHubBtn, { clientX: 450, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(aiHubBtn, { clientX: 450, clientY: 180, pointerId: 1 });

    // 3. Tapping the AI Hub toggles circular radial fan-out menu
    fireEvent.pointerDown(aiHubBtn, { clientX: 450, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(aiHubBtn, { clientX: 450, clientY: 180, pointerId: 1 });

    const radialMenu = screen.getByTestId('radial-action-menu');
    expect(radialMenu).toBeInTheDocument();

    // 4. Circular menu items are present including direct LaTeX conversion
    expect(screen.getByTestId('radial-action-latex')).toBeInTheDocument();
    expect(screen.getByTestId('radial-action-visualize')).toBeInTheDocument();
    expect(screen.getByTestId('radial-action-grade')).toBeInTheDocument();
    expect(screen.getByTestId('radial-action-subject')).toBeInTheDocument();
    expect(screen.getByTestId('radial-action-voice')).toBeInTheDocument();
    expect(screen.getByTestId('radial-action-close')).toBeInTheDocument();

    // 5. Clicking "Chuyển LaTeX" directly opens LaTeX conversion modal
    fireEvent.click(screen.getByTestId('radial-action-latex'));
    expect(screen.getByTestId('ink-convert-panel')).toBeInTheDocument();
  });

  /**
   * TEST 14: Intelligent Auto-Detection of Lasso Intent
   */
  it('automatically detects lasso intent and displays intent badge on selection', () => {
    render(<SmartboardCanvas />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // Draw single formula stroke
    fireEvent.pointerDown(canvas, { clientX: 150, clientY: 150 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.pointerUp(canvas);

    // Lasso the stroke
    const dockLasso = screen.getByTestId('tool-lasso');
    fireEvent.click(dockLasso);
    fireEvent.pointerDown(canvas, { clientX: 130, clientY: 130 });
    fireEvent.pointerMove(canvas, { clientX: 220, clientY: 130 });
    fireEvent.pointerMove(canvas, { clientX: 220, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 130, clientY: 180 });
    fireEvent.pointerUp(canvas);

    // Intent badge is displayed with detected intent
    const intentBadge = screen.getByTestId('detected-intent-badge');
    expect(intentBadge).toBeInTheDocument();
    expect(intentBadge.textContent).toContain('Công thức STEM');
  });
});



