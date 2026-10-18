// apps/student-app/src/__tests__/student-companion.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MathNumpad } from '../components/companion/MathNumpad';
import { ChemicalBalanceScale } from '../components/companion/VisualDebugWidgets';
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
});
