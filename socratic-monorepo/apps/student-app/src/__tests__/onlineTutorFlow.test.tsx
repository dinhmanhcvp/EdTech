import React from 'react';
import {it, expect, vi, afterEach, beforeEach} from 'vitest';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {AfterSchoolTutor} from '../components/companion/AfterSchoolTutor';

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => sessionStorage.clear());

const initialProgress = {catalog_version: 1, total_points: 0, problems: [
  {problem_id: 'hw-phys-1', kc_id: 'PHYSICS_PROJECTILE', step_count: 2, completed_step: 0, mastery: .25},
  {problem_id: 'hw-chem-1', kc_id: 'CHEM_REDOX', step_count: 2, completed_step: 0, mastery: .2},
]};
const response = (body: unknown) => ({ok: true, json: async () => body});
const input = () => screen.getByTestId('tutor-step-input') as HTMLInputElement;
const submit = () => fireEvent.click(screen.getByTestId('tutor-submit-btn'));
const ready = () => screen.findByText('Đã khôi phục tiến độ từ máy chủ.');

it('recovers separate drafts after exercise switching and tab reload', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (url.endsWith('/progress')) return response(initialProgress);
    throw new Error('unrelated');
  }));
  const first = render(<AfterSchoolTutor />);
  await ready();
  fireEvent.change(input(), {target: {value: 'vx = v0*cos(alpha)'}});
  fireEvent.click(screen.getByText('Cân bằng Oxi hóa Sắt & Bảo toàn Electron').closest('button')!);
  fireEvent.change(input(), {target: {value: 'nFe=0.2'}});
  fireEvent.click(screen.getByText('Ném xiên trong Trọng trường').closest('button')!);
  expect(input().value).toBe('vx = v0*cos(alpha)');
  first.unmount();
  render(<AfterSchoolTutor />);
  await ready();
  expect(input().value).toBe('vx = v0*cos(alpha)');
  fireEvent.click(screen.getByText('Cân bằng Oxi hóa Sắt & Bảo toàn Electron').closest('button')!);
  expect(input().value).toBe('nFe=0.2');
});

it('retries an uncertain submission after remount with the same id and restores server points', async () => {
  const bodies: Record<string, unknown>[] = [];
  const reward = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/progress')) return response(bodies.length ? {...initialProgress, total_points: 20, problems: [{...initialProgress.problems[0], completed_step: 1, mastery: .8}, initialProgress.problems[1]]} : initialProgress);
    if (!url.endsWith('/attempts')) throw new Error('unrelated');
    bodies.push(JSON.parse(String(init?.body)));
    if (bodies.length === 1) throw new Error('response lost after commit');
    return response({status: 'VERIFIED_CORRECT', points: 20, mastery: .8, completed_step: 1, catalog_version: 1, feedback: 'Biểu thức đã được xác thực.',
      progress: {...initialProgress, total_points: 40, problems: [{...initialProgress.problems[0], completed_step: 2, mastery: .95}, initialProgress.problems[1]]}});
  }));
  const first = render(<AfterSchoolTutor />);
  await ready();
  fireEvent.change(input(), {target: {value: 'vx=v0*cos(alpha)'}});
  submit();
  await screen.findByText(/Thử lại sẽ kiểm tra cùng lần gửi/);
  first.unmount();
  render(<AfterSchoolTutor onEurekaEarned={reward} />);
  await ready();
  expect(input().value).toBe('vx=v0*cos(alpha)');
  submit();
  await screen.findByText('40 Hạt Eureka');
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0].request_id).toEqual(expect.any(String));
  expect(reward).not.toHaveBeenCalled();
  expect(screen.getByTestId('tutor-completion').textContent).toContain('2/2');
});

it('does not move a newly typed answer to another step when restoration arrives late', async () => {
  let resolveProgress!: (value: unknown) => void;
  const pending = new Promise(resolve => { resolveProgress = resolve; });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (url.endsWith('/progress')) return pending;
    throw new Error('unrelated');
  }));
  render(<AfterSchoolTutor />);
  fireEvent.change(input(), {target: {value: 'vx = unfinished'}});
  await act(async () => resolveProgress(response({...initialProgress, total_points: 20, problems: [{...initialProgress.problems[0], completed_step: 1, mastery: .8}]})));
  await ready();
  expect(screen.getByText('Bước 1: Viết phương trình vận tốc theo phương ngang Ox')).toBeTruthy();
  expect(input().value).toBe('vx = unfinished');
});

it('restores the next step and earned points without awarding them again', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (!url.endsWith('/progress')) throw new Error('unrelated');
    return {ok: true, json: async () => ({catalog_version: 1, total_points: 20, problems: [
      {problem_id: 'hw-phys-1', kc_id: 'PHYSICS_PROJECTILE', step_count: 2, completed_step: 1, mastery: .8},
    ]})};
  }));
  const reward = vi.fn();
  render(<AfterSchoolTutor onEurekaEarned={reward} />);
  await waitFor(() => expect(screen.getByText('20 Hạt Eureka')).toBeTruthy());
  expect(screen.getByText('Bước 2: Viết phương trình tọa độ y(t) theo phương thẳng đứng')).toBeTruthy();
  expect(reward).not.toHaveBeenCalled();
});

it('keeps the answer and awards no points when online verification is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const reward = vi.fn();
  render(<AfterSchoolTutor onEurekaEarned={reward} />);
  const input = screen.getByTestId('tutor-step-input') as HTMLInputElement;
  await screen.findByText('Thử tải lại');
  fireEvent.change(input, {target: {value: 'vx = v0*cos(alpha)'}});
  fireEvent.click(screen.getByTestId('tutor-submit-btn'));
  await waitFor(() => expect(screen.getByTestId('tutor-feedback').textContent).toContain('chưa cộng điểm'));
  expect(input.value).toBe('vx = v0*cos(alpha)');
  expect(reward).not.toHaveBeenCalled();
});
