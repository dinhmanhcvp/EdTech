import React, {Suspense} from 'react';
import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ADVANCED_ENGINES} from '../engines/AdvancedStemEngines';
import {lazyEngine} from '../engines/lazyEngine';
import {ADVANCED_TEMPLATES} from '../utils/advancedStemModels';

describe('engine nạp theo nhu cầu', () => {
  it('danh sách mã engine nâng cao khớp bảng engine thật (SimulationWidget chọn theo ADVANCED_TEMPLATES mà không nạp trước engine)', () => {
    expect(Object.keys(ADVANCED_TEMPLATES).sort()).toEqual(Object.keys(ADVANCED_ENGINES).sort());
  });

  it('chưa nạp thì treo (hiện phần thay thế), nạp xong thì dựng đúng; đã nạp rồi thì dựng ngay không treo', async () => {
    const Hello = lazyEngine(async () => (({name}: {name: string}) => <b data-testid="hi">xin chào {name}</b>));
    const first = render(
      <Suspense fallback={<i data-testid="wait">đang tải</i>}>
        <Hello name="A" />
      </Suspense>,
    );
    expect(first.getByTestId('wait')).toBeTruthy();
    expect(await first.findByTestId('hi')).toHaveTextContent('xin chào A');
    first.unmount();
    const again = render(
      <Suspense fallback={<i data-testid="wait">đang tải</i>}>
        <Hello name="B" />
      </Suspense>,
    );
    expect(again.queryByTestId('wait')).toBeNull();
    expect(again.getByTestId('hi')).toHaveTextContent('xin chào B');
  });

  it('nạp lỗi thì ném lỗi cho hàng rào lỗi, không treo mãi', async () => {
    const Broken = lazyEngine<React.FC>(() => Promise.reject(new Error('mất mạng')));
    await Broken.preload();
    const quiet = console.error;
    console.error = () => undefined;
    try {
      expect(() => render(<Broken />)).toThrow('mất mạng');
    } finally {
      console.error = quiet;
    }
  });
});
