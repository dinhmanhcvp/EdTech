import React, {useState} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {ControlPanel, initialP, initialS} from '../engines/families/Controls';
import type {Controls} from '../utils/presets/types';

afterEach(cleanup);

const C = {sliders: [{key: 'a', label: 'Biên độ', min: 0, max: 10, step: 1, value: 3}], toggles: [{key: 't', label: 'Hiện lực', value: false}]} as unknown as Controls;
const Host: React.FC = () => {
  const [p, setP] = useState(initialP(C));
  const [s, setS] = useState(initialS(C));
  return <ControlPanel prefix="x" c={C} p={p} s={s} setP={(k, v) => setP((q) => ({...q, [k]: v}))} setS={(k, v) => setS((q) => ({...q, [k]: v}))} />;
};

describe('bảng điều khiển template: đặt lại tham số', () => {
  it('nút chỉ hiện khi đã đổi; bấm thì mọi điều khiển về giá trị chuẩn; vùng chạm đủ lớn cho bảng cảm ứng', () => {
    const r = render(<Host />);
    expect(r.queryByTestId('x-reset')).toBeNull();
    fireEvent.change(r.getByTestId('x-param-a'), {target: {value: '8'}});
    fireEvent.click(r.getByTestId('x-toggle-t'));
    expect((r.getByTestId('x-param-a') as HTMLInputElement).value).toBe('8');
    expect(r.getByTestId('x-toggle-t').getAttribute('aria-pressed')).toBe('true');
    expect(r.getByTestId('x-toggle-t').className).toContain('min-h-[44px]');
    fireEvent.click(r.getByTestId('x-reset'));
    expect((r.getByTestId('x-param-a') as HTMLInputElement).value).toBe('3');
    expect(r.getByTestId('x-toggle-t').getAttribute('aria-pressed')).toBe('false');
    expect(r.queryByTestId('x-reset')).toBeNull();
  });
});
