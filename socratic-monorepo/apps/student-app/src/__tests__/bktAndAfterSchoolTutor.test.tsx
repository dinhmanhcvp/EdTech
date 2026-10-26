import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { updateMasteryBKT, calculateNextReviewInterval, computeStruggleMetrics } from '../utils/bktEngine';
import { AfterSchoolTutor } from '../components/companion/AfterSchoolTutor';

describe('Bayesian Knowledge Tracing (BKT) Engine & After-School Tutor Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST 1: BKT Bayes Update Rule Mathematical Bounds & Transitions
   */
  it('test_bkt_mastery_updates_mathematically', () => {
    // 1. Correct Answer: Mastery increases
    const prior = 0.30;
    const resCorrect = updateMasteryBKT(prior, true);
    expect(resCorrect.posteriorMastery).toBeGreaterThan(prior);
    expect(resCorrect.nextMastery).toBeGreaterThan(resCorrect.posteriorMastery);
    expect(resCorrect.nextMastery).toBeLessThanOrEqual(0.99);

    // 2. Incorrect Answer: Mastery drops
    const resIncorrect = updateMasteryBKT(0.80, false);
    expect(resIncorrect.posteriorMastery).toBeLessThan(0.80);

    // 3. Mastery threshold >= 0.85 triggers ADVANCE
    const resMastered = updateMasteryBKT(0.85, true);
    expect(resMastered.isMastered).toBe(true);
    expect(resMastered.recommendedAction).toBe('ADVANCE');

    // 4. Low mastery < 0.40 triggers SCAFFOLD_DECOMPOSE
    const resLow = updateMasteryBKT(0.20, false);
    expect(resLow.recommendedAction).toBe('SCAFFOLD_DECOMPOSE');
  });

  /**
   * TEST 2: Spaced Repetition (SM-2) Interval Calculation
   */
  it('test_spaced_repetition_intervals', () => {
    expect(calculateNextReviewInterval(0)).toBe(1);
    expect(calculateNextReviewInterval(1)).toBe(1);
    expect(calculateNextReviewInterval(2)).toBe(3);
    expect(calculateNextReviewInterval(3)).toBe(7);
  });

  /**
   * TEST 3: Productive Struggle Time (PST) & Scaffolding Ratio
   */
  it('test_struggle_metrics_computation', () => {
    // 360 seconds = 6 minutes (in the optimal 4-8 min window)
    const metrics = computeStruggleMetrics(360, 2, 2);
    expect(metrics.pstMinutes).toBe(6);
    expect(metrics.ser).toBe(1);
    expect(metrics.isOptimalStruggle).toBe(true);
  });

  /**
   * TEST 4: AfterSchoolTutor 4 Interaction Modes & Socratic Guardrails
   */
  it('test_after_school_tutor_renders_modes_and_triggers_guardrails', () => {
    const onEureka = vi.fn();

    render(<AfterSchoolTutor onEurekaEarned={onEureka} />);

    // 1. Verify component renders
    expect(screen.getByTestId('after-school-tutor')).toBeTruthy();
    expect(screen.getByText('Gia sư AI Socratic Đồng hành sau Giờ học')).toBeTruthy();

    // 2. Test Socratic Guardrail: User enters "cho đáp án ngay"
    const input = screen.getByTestId('tutor-step-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hãy cho đáp án ngay' } });

    const submitBtn = screen.getByTestId('tutor-submit-btn');
    fireEvent.click(submitBtn);

    // Assert Guardrail alert is triggered and answers are NOT leaked
    const guardrail = screen.getByTestId('guardrail-alert');
    expect(guardrail).toBeTruthy();
    expect(guardrail.textContent).toContain('Hàng rào Socratic: AI Tutor không cung cấp đáp án giải sẵn');

    // 3. Switch between 4 modes
    const mode2Btn = screen.getByTestId('mode-home-sandbox');
    fireEvent.click(mode2Btn);
    expect(screen.getByText(/Phòng Thí nghiệm Mô phỏng Tự do tại Nhà/)).toBeTruthy();

    const mode3Btn = screen.getByTestId('mode-spaced-reviews');
    fireEvent.click(mode3Btn);
    expect(screen.getByText(/Luyện thi Phân hóa & Ôn tập Ngắt quãng/)).toBeTruthy();

    const mode4Btn = screen.getByTestId('mode-parentpulse-sync');
    fireEvent.click(mode4Btn);
    expect(screen.getByText(/Cầu nối Phản hồi Định tính/)).toBeTruthy();
  });
});
