import React from 'react';
import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {PrepPanel} from '../components/canvas/PrepPanel';
import {hasPrep, lessonContext, pairBoard, parsePrep} from '../utils/boardSession';

afterEach(cleanup);

const RAW = {
  resources: [{id: 'r1', title: 'Đề 15 phút', kind: 'exam', pageCount: 2}, {title: 'hỏng, thiếu id'}],
  sims: [{id: 'BIO_LAB_ENZYME', title: 'Thực hành: enzyme'}],
  plan: {id: 'plan1', version: 2, body: {title: 'Bài 12', boardContext: 'Lớp yếu phần vectơ', sections: [{id: 's1', title: 'Khởi động', objective: 'Nhớ lại', items: [
    {id: 'a', type: 'formula', latex: 'x = v_0 t'},
    {id: 'b', type: 'problem', text: 'Tính tầm xa', answer: 'không được tới bảng'},
    {id: 'c', type: 'sim', templateId: 'PHYS_LAB_PENDULUM_G', params: {}},
    {id: 'd', type: 'poll', question: 'Vật nào rơi trước?', options: ['Nặng', 'Nhẹ', 'Cùng lúc']},
    {id: 'e', type: 'la'},
  ]}]}},
  simTitles: {PHYS_LAB_PENDULUM_G: 'Thực hành: con lắc đơn'},
};

describe('chuẩn bị của tiết trên bảng', () => {
  it('đọc dữ liệu máy chủ, bỏ mục hỏng và không giữ đáp án', () => {
    const p = parsePrep(RAW);
    expect(p.resources).toEqual([{id: 'r1', title: 'Đề 15 phút', kind: 'exam', pageCount: 2}]);
    expect(p.plan?.body.sections[0].items.map((i) => i.type)).toEqual(['formula', 'problem', 'sim', 'poll']);
    expect(JSON.stringify(p)).not.toContain('không được tới bảng');
    expect(hasPrep(p)).toBe(true);
    expect(hasPrep(parsePrep(undefined))).toBe(false);
  });

  it('ghép tiết nhận phần chuẩn bị; ghi chú giáo án đi vào ngữ cảnh AI', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({boardToken: 'b', roomId: 'r', roomToken: 't', period: {id: 'p', title: 'Tiết', goals: 'Hiểu ném ngang'}, pages: [], prep: RAW})));
    const r = await pairBoard('abc123', null, fetchImpl as unknown as typeof fetch);
    expect(r.session.prep?.sims[0].id).toBe('BIO_LAB_ENZYME');
    expect(lessonContext(r.session)?.goals).toBe('Hiểu ném ngang\nLớp yếu phần vectơ');
  });

  it('một chạm mở tài nguyên, mô phỏng định mở và mô phỏng trong giáo án', () => {
    const onOpenResource = vi.fn();
    const onOpenSim = vi.fn();
    const r = render(<PrepPanel prep={parsePrep(RAW)} onOpenResource={onOpenResource} onOpenSim={onOpenSim} />);
    fireEvent.click(r.getByTestId('prep-toggle'));
    fireEvent.click(r.getByTestId('prep-resource'));
    expect(onOpenResource).toHaveBeenCalledWith('r1');
    fireEvent.click(r.getByTestId('prep-toggle'));
    fireEvent.click(r.getByTestId('prep-sim'));
    expect(onOpenSim).toHaveBeenLastCalledWith('BIO_LAB_ENZYME');
    fireEvent.click(r.getByTestId('prep-toggle'));
    expect(r.getByTestId('prep-plan').textContent).toContain('Vật nào rơi trước?');
    expect(r.getByTestId('prep-plan-sim').textContent).toContain('con lắc đơn');
    fireEvent.click(r.getByTestId('prep-plan-sim'));
    expect(onOpenSim).toHaveBeenLastCalledWith('PHYS_LAB_PENDULUM_G');
  });
});
