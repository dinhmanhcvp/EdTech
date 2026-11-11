import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, within} from '@testing-library/react';
import {GeoCoachPanel} from '../components/canvas/GeoCoachPanel';
import type {GeoController} from '../components/canvas/GeometryProblemPanel';
import {buildScene} from '../utils/geometryProblem';

const T = 'Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi M là trung điểm BC. Chứng minh rằng AM = BM.';
const setup = (askFn?: any) => {
  const scene = buildScene(T).scene!;
  const geo = {scene, applyTool: vi.fn()} as unknown as GeoController;
  render(<GeoCoachPanel geo={geo} onClose={vi.fn()} askFn={askFn} />);
  return geo;
};
const RES = (headline: string, actions: any[] = []) => ({source: 'gemini', model: 'm', answer: {headline, steps: [], formula_latex: '', highlights: [], follow_ups: [], actions, clarify: '', used: []}});

describe('panel gợi ý Socratic', () => {
  it('nêu yêu cầu rồi dẫn từng mức bằng câu hỏi; mức 3 có nút vẽ đường phụ', () => {
    const geo = setup();
    expect(screen.getByTestId('geo-coach-log').textContent).toContain('AM = BM');
    fireEvent.click(screen.getByTestId('geo-coach-ask'));
    expect(screen.getByTestId('geo-coach-log').textContent).toMatch(/Tìm hiểu đề.*\?/);
    fireEvent.click(screen.getByTestId('geo-coach-next')); // mức 2
    fireEvent.click(screen.getByTestId('geo-coach-next')); // mức 3
    expect(screen.getByTestId('geo-coach-log').textContent).toContain('cần vẽ thêm');
    fireEvent.click(screen.getByTestId('geo-coach-draw'));
    expect(geo.applyTool).toHaveBeenCalledTimes(1);
  });

  it('không bao giờ nói kết luận: các câu hỏi không chứa lời giải', () => {
    setup();
    fireEvent.click(screen.getByTestId('geo-coach-ask'));
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByTestId('geo-coach-next'));
    const t = screen.getByTestId('geo-coach-log').textContent!;
    expect(t).not.toMatch(/vậy AM = BM|suy ra AM = BM|do đó AM = BM/i);
  });

  it('kiểm tra khẳng định của học sinh trên hình: đúng/sai đều hỏi lại, không chứng minh hộ', () => {
    setup();
    fireEvent.change(screen.getByTestId('geo-coach-input'), {target: {value: 'AM = BM'}});
    fireEvent.click(screen.getByTestId('geo-coach-check'));
    expect(screen.getByTestId('geo-coach-log').textContent).toMatch(/Vì sao|vì sao/);
    fireEvent.change(screen.getByTestId('geo-coach-input'), {target: {value: 'AB = AC'}});
    fireEvent.click(screen.getByTestId('geo-coach-check'));
    expect(screen.getByTestId('geo-coach-log').textContent).toMatch(/KHÔNG đúng/);
  });

  it('Hỏi AI (Socratic): gửi chế độ coach + mức gợi ý + hình; hiện câu hỏi và nút vẽ đường phụ do AI đề xuất', async () => {
    const askFn = vi.fn().mockResolvedValue(RES('Em thấy M có vai trò gì với BC?', [{type: 'construct', label: 'Nối AM', tool: 'segment', names: ['A', 'M']}]));
    const geo = setup(askFn);
    fireEvent.click(screen.getByTestId('geo-coach-ai'));
    expect(await screen.findByText(/vai trò gì với BC/)).toBeInTheDocument();
    const call = askFn.mock.calls[0][0];
    expect(call.mode).toBe('coach');
    expect(call.context.items[0].geo.points).toContain('M');
    expect(call.context.items[0].geo.goal).toContain('AM = BM');
    fireEvent.click(within(screen.getByTestId('geo-coach-ai-actions')).getByText(/Nối AM/));
    expect(geo.applyTool).toHaveBeenCalledWith('segment', ['A', 'M']);
  });

  it('AI không dùng được / trả rỗng: quay về gợi ý có sẵn, không báo lỗi trống', async () => {
    setup(vi.fn().mockResolvedValue(RES('')));
    fireEvent.click(screen.getByTestId('geo-coach-ai'));
    expect(await screen.findByText(/Tìm hiểu đề/)).toBeInTheDocument();
  });
});
