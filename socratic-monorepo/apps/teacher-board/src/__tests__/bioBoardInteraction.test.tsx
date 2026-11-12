import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {PresetEngine} from '../engines/families';
import {PRESETS} from '../utils/presets';

afterEach(cleanup);

const blueprint = (id: string) => ({templateId: id, title: id, meta: {preset: id}}) as never;
const family = (f: string) => Object.entries(PRESETS).find(([, v]) => (v as {family?: string}).family === f)?.[0];

describe('template Sinh trên bảng: chạm và vuốt', () => {
  it('quá trình: vuốt ngang trên hình đổi bước; thanh tiến độ theo bước', () => {
    const id = family('PROCESS_STEPS');
    expect(id).toBeTruthy();
    const r = render(<PresetEngine blueprint={blueprint(id!)} />);
    const stage = r.getByTestId('process-stage');
    const step = () => Number(r.getByTestId('process-steps').getAttribute('data-step'));
    expect(step()).toBe(0);
    fireEvent.pointerDown(stage, {clientX: 300});
    fireEvent.pointerUp(stage, {clientX: 200});
    expect(step()).toBe(1);
    fireEvent.pointerDown(stage, {clientX: 100});
    fireEvent.pointerUp(stage, {clientX: 300});
    expect(step()).toBe(0);
    fireEvent.pointerDown(stage, {clientX: 100});
    fireEvent.pointerUp(stage, {clientX: 120});
    expect(step()).toBe(0);
    expect(r.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  });
  it('giải phẫu: chạm bộ phận chọn được, có vùng chạm rộng trong suốt và nút đủ lớn', () => {
    const id = family('ANATOMY_FLOW');
    expect(id).toBeTruthy();
    const r = render(<PresetEngine blueprint={blueprint(id!)} />);
    const part = r.container.querySelector('[data-testid^="anatomy-part-"]') as SVGElement;
    expect(part.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
    expect(part.querySelector('path[stroke="transparent"]')).toBeTruthy();
    fireEvent.click(part);
    expect(part.getAttribute('data-on')).toBe('true');
  });
});
