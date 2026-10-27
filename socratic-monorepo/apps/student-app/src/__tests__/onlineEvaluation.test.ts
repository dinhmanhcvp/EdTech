import {describe, it, expect, vi} from 'vitest';
import {evaluateOnline} from '../utils/onlineEvaluation';

describe('online grading boundary', () => {
  it('does not turn a network failure into an incorrect answer', async () => {
    const result = await evaluateOnline({student_answer: 'x=2'}, vi.fn().mockRejectedValue(new Error('offline')));
    expect(result.status).toBe('UNVERIFIED');
  });
  it('does not interpret a guidance-only response as grading evidence', async () => {
    const fetcher = vi.fn().mockResolvedValue({ok: true, json: async () => ({verification_source: 'LLM_FALLBACK', is_step_correct: false})});
    expect((await evaluateOnline({}, fetcher)).status).toBe('UNVERIFIED');
  });
  it('accepts deterministic verdicts only with a boolean result', async () => {
    const fetcher = vi.fn().mockResolvedValue({ok: true, json: async () => ({verification_source: 'SYMPY_DETERMINISTIC', is_step_correct: true, eureka_points_delta: 20})});
    expect((await evaluateOnline({}, fetcher)).status).toBe('VERIFIED_CORRECT');
  });
  it('rejects incomplete catalog results instead of accepting forged rewards', async () => {
    const fetcher = vi.fn().mockResolvedValue({ok: true, json: async () => ({status: 'VERIFIED_CORRECT', points: 999, mastery: 8})});
    const result = await evaluateOnline({problem_id: 'hw-phys-1'}, fetcher);
    expect(result.status).toBe('UNVERIFIED');
    expect(result.points).toBe(0);
  });
  it.each([401, 403, 409, 422])('reports actionable HTTP %s instead of a network outage', async status => {
    const result = await evaluateOnline({problem_id: 'hw-phys-1'}, vi.fn().mockResolvedValue({ok: false, status}));
    expect(result.status).toBe('UNVERIFIED');
    expect(result.feedback).not.toContain('Chưa kết nối');
    expect(result.points).toBe(0);
  });
});
