// apps/student-app/src/__tests__/student-companion.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MathNumpad } from '../components/companion/MathNumpad';
import {
  ChemicalBalanceScale,
  VectorForcePolygon,
  FunctionExtremaTangent,
  CellOsmosisPressure,
} from '../components/companion/VisualDebugWidgets';
import { ConceptCheckGate } from '../components/companion/ConceptCheckGate';
import { LockedStepper, StepItem } from '../components/companion/LockedStepper';
import { TeacherHeatmap, StudentMastery } from '../components/dashboards/TeacherHeatmap';
import { ParentPulse } from '../components/dashboards/ParentPulse';
import { SocraticCompanionSession } from '../components/companion/SocraticCompanionSession';

describe('Student Socratic Companion & Dashboards (Phase 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST 1: MathNumpad Anti-Cheat (Paste Blocked) & Math Input
   */
  it('test_math_numpad_anti_cheat_blocks_paste', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <MathNumpad
        value="Fe + "
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByTestId('numpad-input');

    // Simulate paste event via React fireEvent
    fireEvent.paste(input);

    // Verify warning alert is rendered
    const alert = screen.getByTestId('paste-blocked-alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa');

    // Test virtual keys
    const keyO2 = screen.getByTestId('key-O₂');
    fireEvent.click(keyO2);
    expect(onChange).toHaveBeenCalledWith('Fe + O₂');

    // Test Submit
    const submitBtn = screen.getByTestId('numpad-submit');
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith('Fe + ');
  });

  /**
   * TEST 2: Visual Debugger - Chemical Balance Scale Tilting
   */
  it('test_chemical_balance_scale_tilts_on_imbalance', () => {
    // Left: 2 O atoms, Right: 3 O atoms -> diff = +1 (tilts right)
    const { rerender } = render(
      <ChemicalBalanceScale
        leftAtomsCount={2}
        rightAtomsCount={3}
        elementName="Oxi (O)"
        feedbackText="Vế phải đang thừa 1 nguyên tử Oxi"
      />
    );

    expect(screen.getByText('2 Oxi (O)')).toBeTruthy();
    expect(screen.getByText('3 Oxi (O)')).toBeTruthy();
    expect(screen.getByText(/Vế phải đang thừa 1 nguyên tử Oxi/)).toBeTruthy();

    // Rerender with balanced equation
    rerender(
      <ChemicalBalanceScale
        leftAtomsCount={6}
        rightAtomsCount={6}
        elementName="Oxi (O)"
        feedbackText="Cân bằng"
      />
    );

    expect(screen.getByText(/Cân bằng hoàn hảo!/)).toBeTruthy();
  });

  /**
   * TEST 3: Concept Check Gate (Reverse Explanation & Eureka Reward)
   */
  it('test_concept_check_gate_awards_eureka_particles', () => {
    const onPassGate = vi.fn();

    render(
      <ConceptCheckGate
        onPassGate={onPassGate}
        conceptTitle="Định luật Bảo toàn Khối lượng"
        pointsAwarded={50}
      />
    );

    const rewardBadge = screen.getByTestId('eureka-reward-badge');
    expect(rewardBadge.textContent).toContain('+50 Eureka Particles');

    // Fallback explanation test
    const input = screen.getByTestId('concept-input-fallback');
    fireEvent.change(input, {
      target: {
        value: 'Theo định luật bảo toàn khối lượng, tổng số nguyên tử của các chất không đổi.',
      },
    });

    const verifyBtn = screen.getByTestId('btn-verify-explanation');
    fireEvent.click(verifyBtn);

    // Verify pass feedback and callback
    const feedback = screen.getByTestId('concept-feedback');
    expect(feedback.textContent).toContain('Tuyệt vời!');
    expect(feedback.textContent).toContain('+50 Eureka Particles');
    expect(onPassGate).toHaveBeenCalledWith(50);
  });

  /**
   * TEST 4: Teacher Heatmap & Parent Pulse Dashboards
   */
  it('test_dashboards_render_mastery_and_grit', () => {
    const students: StudentMastery[] = [
      {
        name: 'Nguyễn Văn An',
        mathWave: 'green',
        physicsProjectile: 'green',
        chemRedox: 'red',
        bioStomata: 'amber',
        gritScore: 88,
      },
      {
        name: 'Trần Thị Mai',
        mathWave: 'green',
        physicsProjectile: 'amber',
        chemRedox: 'green',
        bioStomata: 'green',
        gritScore: 95,
      },
    ];

    render(<TeacherHeatmap students={students} />);
    expect(screen.getByText('Ma trận Nhận thức KHTN')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn An')).toBeTruthy();
    expect(screen.getByText('Trần Thị Mai')).toBeTruthy();
    expect(screen.getByText('88/100')).toBeTruthy();
    expect(screen.getByText('95/100')).toBeTruthy();

    render(
      <ParentPulse
        studentName="Nguyễn Văn An"
        gritScore={88}
        narrativeText="An đã kiên trì thử 4 lần để cân bằng phản ứng Sắt và Oxi."
        conversationStarters={['Hôm nay con đã khám phá ra quy luật nào về Oxi?']}
      />
    );
    expect(screen.getByText('88 / 100')).toBeTruthy();
    expect(screen.getByText(/An đã kiên trì thử 4 lần/)).toBeTruthy();
    expect(screen.getByText(/Hôm nay con đã khám phá ra quy luật nào về Oxi?/)).toBeTruthy();
  });

  /**
   * TEST 5: Smart Token Numpad & Quiet Mode Causal Blocks (v3.0)
   */
  it('test_token_chips_and_quiet_mode_causal_blocks', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    // 1. Context Token Chips
    render(
      <MathNumpad
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
        tokenChips={['4Fe', '3O₂', '2Fe₂O₃']}
      />
    );

    const chip4Fe = screen.getByTestId('token-chip-4Fe');
    fireEvent.click(chip4Fe);
    expect(onChange).toHaveBeenCalledWith('4Fe');

    // 2. Quiet Mode in ConceptCheckGate
    const onPassGate = vi.fn();
    render(
      <ConceptCheckGate
        onPassGate={onPassGate}
        conceptTitle="Định luật Bảo toàn Khối lượng"
        pointsAwarded={50}
      />
    );

    const quietToggle = screen.getByTestId('quiet-mode-toggle');
    fireEvent.click(quietToggle);
    expect(screen.getByText(/Chế độ Yên tĩnh \(Bật\)/)).toBeTruthy();

    const verifyBlocksBtn = screen.getByTestId('btn-verify-causal-blocks');
    expect(verifyBlocksBtn).toBeTruthy();
  });

  /**
   * TEST 6: Interactive Balance Scale & Micro-Step Lifeline (v3.0)
   */
  it('test_interactive_chemical_scale_and_lifeline_modal', () => {
    const onAdjustLeft = vi.fn();
    const onAdjustRight = vi.fn();
    const onApply = vi.fn();

    render(
      <ChemicalBalanceScale
        leftAtomsCount={6}
        rightAtomsCount={6}
        elementName="Oxi (O)"
        feedbackText="Cân bằng"
        onAdjustLeft={onAdjustLeft}
        onAdjustRight={onAdjustRight}
        onApplyBalanced={onApply}
      />
    );

    const minusLeft = screen.getByTestId('adjust-left-minus');
    fireEvent.click(minusLeft);
    expect(onAdjustLeft).toHaveBeenCalledWith(-2);

    const plusRight = screen.getByTestId('adjust-right-plus');
    fireEvent.click(plusRight);
    expect(onAdjustRight).toHaveBeenCalledWith(3);

    const applyBtn = screen.getByTestId('apply-balanced-btn');
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalled();
  });

  /**
   * TEST 7: Homework-to-Board Push & Parent Fireworks Cheer (v3.0)
   */
  it('test_homework_to_board_push_and_parent_fireworks', () => {
    // 1. Teacher Heatmap push to board button
    render(
      <TeacherHeatmap
        students={[
          {
            name: 'Nguyễn Văn An',
            mathWave: 'red',
            physicsProjectile: 'green',
            chemRedox: 'red',
            bioStomata: 'green',
            gritScore: 75,
          },
        ]}
      />
    );

    const pushBtn = screen.getByTestId('push-to-board-btn');
    fireEvent.click(pushBtn);

    const toast = screen.getByTestId('pushed-board-toast');
    expect(toast.textContent).toContain('Đã đẩy bài toán Cân bằng Oxi');

    // 2. Parent Pulse fireworks cheer
    render(
      <ParentPulse
        studentName="Nguyễn Văn An"
        gritScore={92}
        narrativeText="An làm chủ rất tốt dao động điều hòa"
        conversationStarters={['Con thấy thế nào khi kéo con lắc?']}
      />
    );

    const cheerBtn = screen.getByTestId('btn-cheer-fireworks');
    fireEvent.click(cheerBtn);

    const cheerToast = screen.getByTestId('cheer-toast');
    expect(cheerToast.textContent).toContain('Đã bắn pháo hoa');
  });

  /**
   * TEST 8: Olympiad Edition: Format 2025+ Trap Hunter Mode (True/False 4-Statement)
   */
  it('test_trap_hunter_mode_2025_evaluates_four_statements', () => {
    const onPass = vi.fn();
    render(<ConceptCheckGate onPassGate={onPass} />);

    // Toggle Trap Hunter mode
    const toggle = screen.getByTestId('trap-hunter-toggle');
    fireEvent.click(toggle);

    // Verify 4 statements are displayed
    expect(screen.getByTestId('trap-stmt-a')).toBeTruthy();
    expect(screen.getByTestId('trap-stmt-b')).toBeTruthy();
    expect(screen.getByTestId('trap-stmt-c')).toBeTruthy();
    expect(screen.getByTestId('trap-stmt-d')).toBeTruthy();

    // Select answers: a: True, b: True, c: False, d: True
    fireEvent.click(screen.getByTestId('btn-stmt-a-true'));
    fireEvent.click(screen.getByTestId('btn-stmt-b-true'));
    fireEvent.click(screen.getByTestId('btn-stmt-c-false'));
    fireEvent.click(screen.getByTestId('btn-stmt-d-true'));

    // Submit
    const submitBtn = screen.getByTestId('btn-verify-trap-statements');
    fireEvent.click(submitBtn);

    // Verify pass
    expect(onPass).toHaveBeenCalledWith(50);
    const feedback = screen.getByTestId('concept-feedback');
    expect(feedback.textContent).toContain('Xuất sắc! Em đã vượt qua toàn bộ 4 bẫy đề thi THPT 2025+');
  });

  /**
   * TEST 9: Multi-Subject Problem Bank & 3-Tab Diagnostic Workbench (Mode 02 Upgrade)
   */
  it('test_socratic_multi_subject_problem_bank_and_3tab_workbench', () => {
    render(<SocraticCompanionSession />);

    // 1. Initial problem is Physics Incline
    expect(screen.getByText('Chuyển động trên Mặt phẳng nghiêng có Ma sát & Bảo toàn Cơ năng')).toBeTruthy();
    expect(screen.getByTestId('visual-debugger-workbench')).toBeTruthy();

    // 2. Switch to Chemistry
    const chemTab = screen.getByTestId('problem-tab-chemistry');
    fireEvent.click(chemTab);
    expect(screen.getByText('Cân bằng Oxi hóa - Khử Bảo toàn Electron & Chuyển dịch Le Chatelier')).toBeTruthy();

    // 3. Switch to Math
    const mathTab = screen.getByTestId('problem-tab-math');
    fireEvent.click(mathTab);
    expect(screen.getByText('Cực trị Hàm bậc ba Đối xứng qua Gốc tọa độ & Tích phân Riemann')).toBeTruthy();

    // 4. Test 3 tabs in Left Diagnostic Workbench
    const tabDimensional = screen.getByTestId('tab-dimensional-audit');
    fireEvent.click(tabDimensional);
    expect(screen.getByText(/Kiểm tra Thứ nguyên & Điều kiện Biên/)).toBeTruthy();

    const tabGraph = screen.getByTestId('tab-knowledge-graph');
    fireEvent.click(tabGraph);
    expect(screen.getByText(/Sơ đồ Phân rã Tư duy & Năng lực/)).toBeTruthy();
  });

  /**
   * TEST 10: Director Triggers & Red-Team Guardrail Shield
   */
  it('test_director_triggers_and_guardrail_shield', () => {
    render(<SocraticCompanionSession />);

    // 1. Click Director Trigger 1: Begging for answer (Guardrail)
    const guardrailBtn = screen.getByTestId('director-guardrail-btn');
    fireEvent.click(guardrailBtn);

    const guardrailCard = screen.getByTestId('guardrail-alert-card');
    expect(guardrailCard).toBeTruthy();
    expect(guardrailCard.textContent).toContain('KHIÊN BẢO VỆ SOCRATIC');

    // 2. Click Director Trigger 4: Jump to Concept Gate
    const jumpGateBtn = screen.getByTestId('director-jump-gate-btn');
    fireEvent.click(jumpGateBtn);

    const gate = screen.getByTestId('concept-check-gate');
    expect(gate).toBeTruthy();
    const waveform = screen.getByTestId('voice-defense-waveform');
    expect(waveform).toBeTruthy();
  });

  /**
   * TEST 11: Vector Force Polygon Widget (Gap on Unbalanced & Closed Loop on Balanced)
   */
  it('test_vector_force_polygon_gap_and_balance', () => {
    const onApplyBalanced = vi.fn();
    const { rerender } = render(
      <VectorForcePolygon
        fGravity={50}
        fNormal={43.3}
        fFriction={10}
        angleDeg={30}
        onApplyBalanced={onApplyBalanced}
      />
    );

    // Initial state: F_ms = 10 N -> Gap = |10 - 25| = 15 N -> Unbalanced
    expect(screen.getByTestId('vector-force-polygon')).toBeTruthy();
    const gapWarning = screen.getByTestId('polygon-gap-warning');
    expect(gapWarning.textContent).toContain('Hở đa giác (ΔF = 15.0 N)');

    // Click "Tự khép kín" button to snap to equilibrium F_ms = 25 N
    const autoCloseBtn = screen.getByTestId('auto-close-polygon-btn');
    fireEvent.click(autoCloseBtn);

    // Verify polygon closes
    const successBadge = screen.getByTestId('polygon-closed-success');
    expect(successBadge.textContent).toContain('Đa giác khép kín (ΣF = 0)');

    // Test apply button
    const applyBtn = screen.getByTestId('apply-polygon-btn');
    fireEvent.click(applyBtn);
    expect(onApplyBalanced).toHaveBeenCalledTimes(1);
  });

  /**
   * TEST 12: Function Extrema Tangent Widget (Tilted Slope vs Horizontal Extrema)
   */
  it('test_function_extrema_tangent_tilted_and_horizontal', () => {
    const onApplyExtremum = vi.fn();
    render(
      <FunctionExtremaTangent
        x0={0.0}
        functionExpression="f(x) = x³ - 3x"
        onApplyExtremum={onApplyExtremum}
      />
    );

    // At x0 = 0.0, f'(0) = -3.00 != 0 -> Tilted tangent warning
    expect(screen.getByTestId('function-extrema-tangent')).toBeTruthy();
    const tiltedWarning = screen.getByTestId('tangent-tilted-warning');
    expect(tiltedWarning.textContent).toContain('Tiếp tuyến dốc nghiêng');
    expect(tiltedWarning.textContent).toContain('k = -3.00');

    // Click "Căn ngang (k=0)" button -> sets x0 = -1.0 or +1.0 where f'(x) = 0
    const snapExtremumBtn = screen.getByTestId('snap-extremum-btn');
    fireEvent.click(snapExtremumBtn);

    // Verify horizontal success
    const horizontalBadge = screen.getByTestId('tangent-horizontal-success');
    expect(horizontalBadge.textContent).toContain('Tiếp tuyến nằm ngang (k = 0)');

    // Test apply button
    const applyBtn = screen.getByTestId('apply-extremum-btn');
    fireEvent.click(applyBtn);
    expect(onApplyExtremum).toHaveBeenCalledTimes(1);
  });

  /**
   * TEST 13: Cell Osmosis Pressure Widget (Plasmolysis, Turgor Swelling, Isotonic)
   */
  it('test_cell_osmosis_pressure_plasmolysis_and_isotonic', () => {
    const onApplyBalanced = vi.fn();
    render(
      <CellOsmosisPressure
        cOut={2.5}
        cIn={0.9}
        onApplyBalanced={onApplyBalanced}
      />
    );

    // At C_out = 2.5% > 0.9% -> Hypertonic (Ưu trương), Plasmolysis (Co nguyên sinh)
    expect(screen.getByTestId('cell-osmosis-pressure')).toBeTruthy();
    const shrivelWarning = screen.getByTestId('osmosis-shrivel-warning');
    expect(shrivelWarning.textContent).toContain('Ưu trương • Tế bào co nguyên sinh');

    // Switch to Hypotonic (Nhược trương 0.1%)
    const hypotonicBtn = screen.getByTestId('preset-hypotonic-btn');
    fireEvent.click(hypotonicBtn);
    const swellWarning = screen.getByTestId('osmosis-swell-warning');
    expect(swellWarning.textContent).toContain('Nhược trương • Trương nước');

    // Switch to Isotonic (Đẳng trương 0.9%)
    const isotonicBtn = screen.getByTestId('preset-isotonic-btn');
    fireEvent.click(isotonicBtn);
    const balancedBadge = screen.getByTestId('osmosis-balanced-success');
    expect(balancedBadge.textContent).toContain('Đẳng trương hoàn hảo (P ≈ 0)');

    // Test apply button
    const applyBtn = screen.getByTestId('apply-osmosis-btn');
    fireEvent.click(applyBtn);
    expect(onApplyBalanced).toHaveBeenCalledTimes(1);
  });

  /**
   * TEST 14: All 4 Visual Debuggers Render in Socratic Session on Director/Wrong Inputs
   */
  it('test_all_four_visual_debuggers_render_in_session_on_wrong_inputs', () => {
    render(<SocraticCompanionSession />);

    // 1. Initial problem: Physics -> Trigger wrong input (missing friction)
    const wrongBtn = screen.getByTestId('director-wrong-btn');
    fireEvent.click(wrongBtn);

    // Verify Vector Force Polygon is rendered
    expect(screen.getByTestId('vector-polygon-wrapper')).toBeTruthy();
    expect(screen.getByTestId('vector-force-polygon')).toBeTruthy();
    expect(screen.getByTestId('polygon-gap-warning')).toBeTruthy();

    // 2. Switch to Math problem
    const mathTab = screen.getByTestId('problem-tab-math');
    fireEvent.click(mathTab);

    // Trigger wrong input in Math
    fireEvent.click(wrongBtn);
    expect(screen.getByTestId('extrema-tangent-wrapper')).toBeTruthy();
    expect(screen.getByTestId('function-extrema-tangent')).toBeTruthy();
    expect(screen.getByTestId('tangent-tilted-warning')).toBeTruthy();

    // 3. Switch to Biology problem
    const bioTab = screen.getByTestId('problem-tab-biology');
    fireEvent.click(bioTab);

    // Trigger wrong input in Biology
    fireEvent.click(wrongBtn);
    expect(screen.getByTestId('cell-osmosis-wrapper')).toBeTruthy();
    expect(screen.getByTestId('cell-osmosis-pressure')).toBeTruthy();
    expect(screen.getByTestId('osmosis-shrivel-warning')).toBeTruthy();

    // 4. Switch to Chemistry problem
    const chemTab = screen.getByTestId('problem-tab-chemistry');
    fireEvent.click(chemTab);

    // Trigger wrong input in Chemistry
    fireEvent.click(wrongBtn);
    expect(screen.getByTestId('balance-scale-wrapper')).toBeTruthy();
    expect(screen.getAllByTestId('chemical-balance-scale').length).toBeGreaterThanOrEqual(1);
  });
});


