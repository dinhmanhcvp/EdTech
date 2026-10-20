/**
 * End-to-End User Flow Integration Test Suite
 * Scenario 1 (Teacher Flow):
 *   Draw equation -> Lasso select -> Click [Trực quan hóa] -> Engine renders ->
 *   Click breathing Socratic lightbulb -> Drag Sandbox slider from 25 to 50 -> Click Reset.
 *
 * Scenario 2 (Student Anti-Cheat Flow):
 *   Open Problem -> Attempt paste (blocked) -> Enter wrong stoichiometry (Fe + O2 -> Fe2O3) ->
 *   Visual Balance Scale tilts right -> Fix coefficients (4Fe + 3O2 -> 2Fe2O3) ->
 *   Step 2 unlocks -> Pass Concept Check Gate -> Receive +50 Eureka Particles.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartboardCanvas } from '../apps/teacher-board/src/components/canvas/SmartboardCanvas';
import { SocraticCompanionSession } from '../apps/student-app/src/components/companion/SocraticCompanionSession';
import { SimulationBlueprint } from '@socratic/types';

describe('Socratic Vision Board v2.0 - End-to-End User Scenarios', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * SCENARIO 1: Teacher Smartboard Flow
   * Draw equation -> Lasso select -> Click [Trực quan hóa] -> Engine renders ->
   * Click breathing Socratic lightbulb -> Drag Sandbox slider from 25 to 50 -> Click Reset.
   */
  it('Scenario 1: Full Teacher Smartboard Experience', async () => {
    const apiCallSpy = vi.fn();

    // Mock API response for compile-lasso
    const mockBlueprint: SimulationBlueprint = {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{Quang hợp: } Rate = f(T, I)',
      ocrAlternatives: ['Rate = f(T, I)', 'Rate = f(CO_2, I)'],
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
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, khí khổng lại đóng lại để chống mất nước?',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          simulation_blueprint: mockBlueprint,
          ocr_result: {
            recognized_latex: mockBlueprint.recognizedLatex,
            subject: 'BIOLOGY',
            confidence: 0.98,
            alternatives: mockBlueprint.ocrAlternatives,
          },
          socratic_cue: {
            question: mockBlueprint.socraticQuestion,
            target_parameter: 'temperature',
          },
        }),
      } as Response;
    });

    render(<SmartboardCanvas onApiCallSpy={apiCallSpy} />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // 1. Teacher writes formula strokes in PEN mode
    fireEvent.pointerDown(canvas, { clientX: 120, clientY: 150 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 150 });
    fireEvent.pointerMove(canvas, { clientX: 240, clientY: 150 });
    fireEvent.pointerUp(canvas);

    // 2. Teacher switches to Magic Lasso mode
    const lassoBtn = screen.getByTestId('tool-lasso');
    fireEvent.click(lassoBtn);

    // 3. Teacher circles the equation strokes with lasso loop
    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 300, clientY: 220 });
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 220 });
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 100 });
    fireEvent.pointerUp(canvas);

    // 4. Floating [Trực quan hóa] button appears
    const visualizeBtn = await screen.findByTestId('btn-visualize');
    expect(visualizeBtn).toBeTruthy();

    // Click [Trực quan hóa]
    fireEvent.click(visualizeBtn);

    // 5. Assert Engine renders modal with SimulationWidget
    const simWidget = await screen.findByTestId('simulation-widget');
    expect(simWidget).toBeTruthy();
    expect(screen.getByTestId('engine-canvas-container')).toBeTruthy();

    // 6. Teacher clicks breathing Socratic lightbulb cue
    const socraticBtn = screen.getByTestId('socratic-cue-btn');
    fireEvent.click(socraticBtn);
    const socraticContent = screen.getByTestId('socratic-content');
    expect(socraticContent.textContent).toContain('Tại sao khi nhiệt độ vượt quá 45°C');

    // 7. Teacher drags temperature Macro Slider from 25 to 50
    const tempDisplay = screen.getByTestId('param-val-temperature');
    expect(tempDisplay.textContent).toContain('25 °C');

    const tempSlider = screen.getByTestId('slider-temperature');
    fireEvent.change(tempSlider, { target: { value: '50' } });
    expect(tempDisplay.textContent).toContain('50 °C');

    // 8. Teacher clicks Reset button to restore original state
    const resetBtn = screen.getByTestId('reset-btn');
    fireEvent.click(resetBtn);
    expect(tempDisplay.textContent).toContain('25 °C');
  });

  /**
   * SCENARIO 2: Student Anti-Cheat Companion Flow
   * Open Problem -> Attempt paste (blocked) -> Enter wrong stoichiometry (Fe + O2 -> Fe2O3) ->
   * Visual Balance Scale tilts right -> Fix coefficients (4Fe + 3O2 -> 2Fe2O3) ->
   * Step 2 unlocks -> Pass Concept Check Gate -> Receive +50 Eureka Particles.
   */
  it('Scenario 2: Full Student Anti-Cheat & Cognitive Scaffolding Experience', async () => {
    const onSessionComplete = vi.fn();

    // Mock companion evaluate-step API
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      const body = JSON.parse((options?.body as string) || '{}');
      const ans = body.student_answer;

      if (ans.includes('4Fe') && ans.includes('3O2') && ans.includes('2Fe2O3')) {
        // Balanced
        return {
          ok: true,
          status: 200,
          json: async () => ({
            verification_source: 'SYMPY_DETERMINISTIC',
            is_step_correct: true,
            error_category: null,
            step_status: 'UNLOCKED_NEXT',
            socratic_feedback: 'Chính xác! Cả hai vế đều có 4 Fe và 6 O.',
            eureka_points_delta: 20,
          }),
        } as Response;
      } else {
        // Imbalanced
        return {
          ok: true,
          status: 200,
          json: async () => ({
            verification_source: 'SYMPY_DETERMINISTIC',
            is_step_correct: false,
            error_category: 'STOICHIOMETRY_IMBALANCE',
            step_status: 'IN_PROGRESS',
            socratic_feedback: 'Vế phải đang có 3 Oxi, vế trái chỉ có 2. Hãy tìm BCNN là 6!',
            visual_debugger: {
              widget_type: 'CHEMICAL_BALANCE_SCALE',
              payload: {
                left_atoms: { Fe: 1, O: 2 },
                right_atoms: { Fe: 2, O: 3 },
              },
            },
            eureka_points_delta: 0,
          }),
        } as Response;
      }
    });

    render(<SocraticCompanionSession onSessionComplete={onSessionComplete} />);

    // 1. Initial State: Step 1 is ACTIVE, Step 2 is LOCKED
    expect(screen.getByText(/Bước 1: Cân bằng phương trình Hóa học/)).toBeTruthy();
    expect(screen.getByText(/Bước 2: Cổng Khái Niệm Ngược/)).toBeTruthy();

    const eurekaCounter = screen.getByTestId('eureka-particles-counter');
    expect(eurekaCounter.textContent).toContain('0 Eureka');

    // 2. Anti-Cheat: Attempt paste into input box (Blocked!)
    const numpadInput = screen.getByTestId('numpad-input');
    fireEvent.paste(numpadInput);
    const pasteAlert = screen.getByTestId('paste-blocked-alert');
    expect(pasteAlert).toBeTruthy();
    expect(pasteAlert.textContent).toContain('Tính năng dán (Paste) bị vô hiệu hóa');

    // 3. Student enters incorrect, imbalanced equation: Fe + O₂ → Fe₂O₃
    fireEvent.click(screen.getByTestId('key-Fe'));
    fireEvent.click(screen.getByTestId('key-+'));
    fireEvent.click(screen.getByTestId('key-O₂'));
    fireEvent.click(screen.getByTestId('key-→'));
    fireEvent.click(screen.getByTestId('key-Fe₂O₃'));

    // Submit step 1
    const submitBtn = screen.getByTestId('numpad-submit');
    fireEvent.click(submitBtn);

    // 4. Assert Visual Balance Scale appears and tilts right (Left: 2, Right: 3)
    const balanceWrapper = await screen.findByTestId('balance-scale-wrapper');
    expect(balanceWrapper).toBeTruthy();
    expect(screen.getByText('2 Oxi (O)')).toBeTruthy();
    expect(screen.getByText('3 Oxi (O)')).toBeTruthy();
    expect(screen.getByText(/Vế phải đang có 3 Oxi, vế trái chỉ có 2/)).toBeTruthy();

    // 5. Student corrects the equation to balanced coefficients: 4Fe + 3O₂ → 2Fe₂O₃
    const clearBtn = screen.getByTestId('numpad-clear');
    fireEvent.click(clearBtn);

    fireEvent.click(screen.getByTestId('key-4'));
    fireEvent.click(screen.getByTestId('key-Fe'));
    fireEvent.click(screen.getByTestId('key-+'));
    fireEvent.click(screen.getByTestId('key-3'));
    fireEvent.click(screen.getByTestId('key-O₂'));
    fireEvent.click(screen.getByTestId('key-→'));
    fireEvent.click(screen.getByTestId('key-2'));
    fireEvent.click(screen.getByTestId('key-Fe₂O₃'));

    fireEvent.click(submitBtn);

    // 6. Assert Step 1 completed, and Step 2 UNLOCKED!
    const conceptGate = await screen.findByTestId('concept-check-gate');
    expect(conceptGate).toBeTruthy();

    // 7. Pass Concept Check Gate by providing explanation
    const explanationInput = screen.getByTestId('concept-input-fallback');
    fireEvent.change(explanationInput, {
      target: {
        value: 'Số nguyên tử của mỗi nguyên tố ở hai vế được bảo toàn, do đó khối lượng bảo toàn.',
      },
    });

    const verifyExplanationBtn = screen.getByTestId('btn-verify-explanation');
    fireEvent.click(verifyExplanationBtn);

    // 8. Assert +50 Eureka Particles awarded and Session Completed banner displayed
    await waitFor(() => {
      expect(screen.getByTestId('session-completed-banner')).toBeTruthy();
      expect(eurekaCounter.textContent).toContain('50 Eureka');
      expect(onSessionComplete).toHaveBeenCalledWith(50);
    });
  });
});
