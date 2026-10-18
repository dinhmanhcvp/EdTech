// apps/teacher-board/src/__tests__/smartboard.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { filterEnclosedStrokes, Stroke, Point } from '../utils/lassoGeometry';
import { recognizeShape } from '../utils/shapeRecognizer';
import { exportIsolatedWebp } from '../utils/isolatedExporter';
import { SimulationWidget } from '../components/canvas/SimulationWidget';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { OcrReviewModal } from '../components/canvas/OcrReviewModal';
import { SimulationBlueprint } from '@socratic/types';

describe('Smartboard Magic Lasso & 4 Deterministic Engines (Phase 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST 1: Point-in-Polygon Hit-Testing
   * Verify only strokes inside the lasso polygon are extracted to the isolated off-screen exporter;
   * stray outer strokes are excluded.
   */
  it('test_point_in_polygon_hit_testing', async () => {
    // Define a square lasso loop from (100, 100) to (300, 300)
    const lassoLoop: Point[] = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 300 },
      { x: 100, y: 100 },
    ];

    // Stroke 1: Completely inside the lasso loop (center around 200, 200)
    const enclosedStroke: Stroke = {
      id: 'stroke-inside-1',
      points: [
        { x: 150, y: 150 },
        { x: 180, y: 180 },
        { x: 200, y: 200 },
        { x: 220, y: 220 },
      ],
      color: '#ffffff',
      width: 3,
    };

    // Stroke 2: Stray stroke completely outside the lasso loop (at 600, 600)
    const strayStroke: Stroke = {
      id: 'stroke-stray-2',
      points: [
        { x: 550, y: 550 },
        { x: 580, y: 580 },
        { x: 600, y: 600 },
      ],
      color: '#ffffff',
      width: 3,
    };

    // Stroke 3: Partially inside, but <70% inside (1 of 4 points inside)
    const partiallyExcludedStroke: Stroke = {
      id: 'stroke-partially-out-3',
      points: [
        { x: 200, y: 200 }, // inside
        { x: 400, y: 400 }, // outside
        { x: 500, y: 500 }, // outside
        { x: 600, y: 600 }, // outside
      ],
      color: '#ffffff',
      width: 3,
    };

    const allStrokes = [enclosedStroke, strayStroke, partiallyExcludedStroke];

    // Execute filterEnclosedStrokes with standard 70% threshold
    const filtered = filterEnclosedStrokes(allStrokes, lassoLoop, 0.70);

    // Assert only Stroke 1 is selected
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('stroke-inside-1');

    // Test isolated exporter with the enclosed strokes
    const exportResult = await exportIsolatedWebp(filtered);
    expect(exportResult.dataUrl).toMatch(/data:image\/(png|webp)/);
  });

  /**
   * TEST 2: Zero API Calls on Normal Drawing & Shape Snapping
   * Spy on fetch and assert 0 network calls occur during normal pen drawing
   * and local geometric shape snapping.
   */
  it('test_zero_api_on_normal_drawing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const apiCallSpy = vi.fn();

    render(<SmartboardCanvas onApiCallSpy={apiCallSpy} />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // 1. Simulate drawing a line in normal PEN mode
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50 });
    for (let i = 1; i <= 10; i++) {
      fireEvent.pointerMove(canvas, { clientX: 50 + i * 20, clientY: 50 + i * 20 });
    }
    fireEvent.pointerUp(canvas);

    // 2. Test local offline $1 Unistroke recognizer directly
    const lineStroke: Stroke = {
      id: 'stroke-line',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
        { x: 40, y: 40 },
        { x: 50, y: 50 },
        { x: 60, y: 60 },
        { x: 70, y: 70 },
        { x: 80, y: 80 },
        { x: 90, y: 90 },
      ],
      color: '#ffffff',
      width: 3,
    };
    const shapeResult = recognizeShape(lineStroke);
    expect(shapeResult.type).toBe('LINE');
    expect(shapeResult.confidence).toBeGreaterThan(0.85);

    // 3. Strict Architectural Mandate Assertion: ZERO network requests during normal ink writing
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(apiCallSpy).not.toHaveBeenCalled();
  });

  /**
   * TEST 3: Reactive Sandbox Sliders (<16ms, 0 API Calls)
   * Render SimulationWidget with BIO_PHOTOSYNTHESIS at 25°C,
   * simulate dragging the temperature Macro Slider to 50°C,
   * assert state updates immediately in <16ms with 0 API calls.
   */
  it('test_reactive_sandbox_sliders', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onParamChange = vi.fn();

    const bioBlueprint: SimulationBlueprint = {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{Rate} = f(T, I)',
      parameters: [
        {
          key: 'temperature',
          label: 'Nhiệt độ (T)',
          unit: '°C',
          defaultValue: 25.0,
          min: 0.0,
          max: 60.0,
          step: 5.0,
        },
        {
          key: 'light',
          label: 'Cường độ sáng (I)',
          unit: '%',
          defaultValue: 70.0,
          min: 10.0,
          max: 100.0,
          step: 5.0,
        },
      ],
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, khí khổng lại đóng lại?',
    };

    render(
      <SimulationWidget
        blueprint={bioBlueprint}
        onParamChange={onParamChange}
      />
    );

    // Initial temperature value must be 25 °C
    const tempDisplay = screen.getByTestId('param-val-temperature');
    expect(tempDisplay.textContent).toContain('25 °C');

    // Measure latency of dragging the slider to 50°C
    const tempSlider = screen.getByTestId('slider-temperature') as HTMLInputElement;

    const tStart = performance.now();
    fireEvent.change(tempSlider, { target: { value: '50' } });
    const tEnd = performance.now();
    const latencyMs = tEnd - tStart;

    // Assert update occurs in < 16ms (60 FPS budget)
    expect(latencyMs).toBeLessThan(16);

    // Assert value updated immediately on screen
    expect(tempDisplay.textContent).toContain('50 °C');
    expect(onParamChange).toHaveBeenCalledWith('temperature', 50);

    // Assert ZERO network calls during local slider manipulation
    expect(fetchSpy).not.toHaveBeenCalled();

    // Test breathing Socratic lightbulb cue
    const cueBtn = screen.getByTestId('socratic-cue-btn');
    fireEvent.click(cueBtn);
    const socraticContent = screen.getByTestId('socratic-content');
    expect(socraticContent.textContent).toContain('Tại sao khi nhiệt độ vượt quá 45°C');

    // Test Reset button restoration
    const resetBtn = screen.getByTestId('reset-btn');
    fireEvent.click(resetBtn);
    expect(tempDisplay.textContent).toContain('25 °C');
  });

  /**
   * TEST 4: Tap & Swap OCR
   * Click an uncertain OCR token, select an alternative from the bubble menu,
   * and verify the formula updates and re-binds to the engine.
   */
  it('test_tap_and_swap_ocr', () => {
    const onFormulaChange = vi.fn();

    const chemBlueprint: SimulationBlueprint = {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_BALANCE_SCALE',
      recognizedLatex: 'Fe + O_2 -> Fe_2O_3',
      ocrAlternatives: [
        '4Fe + 3O_2 -> 2Fe_2O_3',
        'Fe_2O_3 + 3CO -> 2Fe + 3CO_2',
      ],
      parameters: [
        { key: 'c1', label: 'Fe', unit: '', defaultValue: 1, min: 1, max: 6, step: 1 },
      ],
      socraticQuestion: 'Hai vế đã cân bằng chưa?',
    };

    render(
      <SimulationWidget
        blueprint={chemBlueprint}
        onFormulaChange={onFormulaChange}
      />
    );

    // 1. Initial formula displayed
    const ocrToken = screen.getByTestId('ocr-token');
    const formulaDisplay = screen.getByTestId('current-formula-display');
    expect(formulaDisplay.textContent).toBe('Fe + O_2 -> Fe_2O_3');

    // 2. Click OCR token to trigger Tap & Swap bubble menu
    fireEvent.click(ocrToken);

    // Bubble menu appears
    const bubbleMenu = screen.getByTestId('ocr-bubble-menu');
    expect(bubbleMenu).toBeTruthy();
    expect(document.body.contains(bubbleMenu)).toBe(true);

    // 3. Select alternative 0: '4Fe + 3O_2 -> 2Fe_2O_3'
    const alt0 = screen.getByTestId('ocr-alt-0');
    expect(alt0.textContent).toContain('4Fe + 3O_2 -> 2Fe_2O_3');
    fireEvent.click(alt0);

    // 4. Assert formula updated in state and callback fired
    expect(formulaDisplay.textContent).toBe('4Fe + 3O_2 -> 2Fe_2O_3');
    expect(onFormulaChange).toHaveBeenCalledWith('4Fe + 3O_2 -> 2Fe_2O_3');
  });

  /**
   * TEST 5: OCR Review & Verification Dialog
   * Verify teacher can review the recognized formula, check confidence badge,
   * inspect KaTeX math typography, edit if needed, and confirm to push to the board.
   */
  it('test_ocr_verification_modal', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <OcrReviewModal
        isOpen={true}
        thumbnailUrl="data:image/webp;base64,mockThumbnail"
        recognizedLatex="x = 5\cos(2\pi t + \frac{\pi}{2})"
        confidence={0.98}
        alternatives={['y = \int x^3 dx', 'y = 2\sin(3x)']}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // 1. Verify modal is rendered
    const modal = screen.getByTestId('ocr-review-modal');
    expect(modal).toBeTruthy();

    // 2. Check confidence badge
    const badge = screen.getByTestId('ocr-confidence-badge');
    expect(badge.textContent).toContain('98%');

    // 3. Check handwriting thumbnail
    const thumb = screen.getByTestId('ocr-review-thumb') as HTMLImageElement;
    expect(thumb.src).toContain('data:image/webp;base64,mockThumbnail');

    // 4. Check formula input has the initial value
    const input = screen.getByTestId('ocr-review-input') as HTMLInputElement;
    expect(input.value).toBe('x = 5\\cos(2\\pi t + \\frac{\\pi}{2})');

    // 5. Test editing the formula
    fireEvent.change(input, { target: { value: 'y = \\int x^3 dx' } });
    expect(input.value).toBe('y = \\int x^3 dx');

    // 6. Test confirm button
    const confirmBtn = screen.getByTestId('ocr-confirm-btn');
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('y = \\int x^3 dx');
  });
});
