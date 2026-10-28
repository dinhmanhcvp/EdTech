import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import type {SimulationBlueprint} from '@socratic/types';
import {useEased} from '../engines/visualKit';
import {LeChatelierEngine, DaniellEngine} from '../engines/ChemEngines';
import {GasEngine, DoublePendulumEngine, CoriolisEngine, FraunhoferEngine} from '../engines/PhysEngines';
import {StomataEngine, OsmosisEngine, OperonLacEngine, BoxplotEngine} from '../engines/MoreStemEngines';

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

const Probe: React.FC<{target: number}> = ({target}) => <span data-testid="probe">{useEased(target, 10).toFixed(3)}</span>;

describe('visualKit.useEased', () => {
  afterEach(() => vi.restoreAllMocks());

  it('giảm chuyển động → nhảy thẳng tới đích', () => {
    mockReducedMotion(true);
    const {rerender} = render(<Probe target={1} />);
    rerender(<Probe target={5} />);
    expect(screen.getByTestId('probe').textContent).toBe('5.000');
  });

  it('bình thường → đi dần tới đích, không nhảy ngay và không vượt quá', async () => {
    mockReducedMotion(false);
    const {rerender} = render(<Probe target={1} />);
    rerender(<Probe target={5} />);
    expect(Number(screen.getByTestId('probe').textContent)).toBeLessThan(5);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900));
    });
    const v = Number(screen.getByTestId('probe').textContent);
    expect(v).toBeGreaterThan(1);
    expect(v).toBeLessThanOrEqual(5);
  });
});

describe('hai engine sau khi nâng cấp hình vẽ', () => {
  const bp = {meta: {}} as unknown as SimulationBlueprint;

  it('giảm chuyển động: không còn phần tử <animate>/<animateTransform>/<animateMotion>', () => {
    mockReducedMotion(true);
    const lc = render(<LeChatelierEngine blueprint={bp} />);
    expect(lc.container.querySelectorAll('animate, animateTransform, animateMotion').length).toBe(0);
    lc.unmount();
    const dn = render(<DaniellEngine blueprint={bp} />);
    act(() => {
      (screen.getByTestId('daniell-toggle') as HTMLButtonElement).click();
    });
    expect(dn.container.querySelectorAll('animate, animateTransform, animateMotion').length).toBe(0);
  });

  it('id của gradient không trùng nhau giữa hai widget cùng trang', () => {
    mockReducedMotion(false);
    const a = render(<DaniellEngine blueprint={bp} />);
    const b = render(<DaniellEngine blueprint={bp} />);
    const ids = Array.from(a.container.querySelectorAll('[id$="-metal"]')).concat(Array.from(b.container.querySelectorAll('[id$="-metal"]'))).map((e) => e.id);
    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('mọi engine lý/hóa/sinh đã nâng cấp tôn trọng giảm chuyển động', () => {
  const bp = {meta: {}} as unknown as SimulationBlueprint;
  const cases: [string, React.ReactElement][] = [
    ['Khí p–V', <GasEngine key="g" blueprint={bp} />],
    ['Con lắc kép', <DoublePendulumEngine key="d" blueprint={bp} />],
    ['Coriolis', <CoriolisEngine key="c" blueprint={bp} />],
    ['Fraunhofer', <FraunhoferEngine key="f" blueprint={bp} />],
    ['Khí khổng', <StomataEngine key="s" blueprint={bp} />],
    ['Thẩm thấu', <OsmosisEngine key="o" blueprint={bp} />],
    ['Operon lac', <OperonLacEngine key="l" blueprint={bp} />],
    ['Hộp tứ phân vị', <BoxplotEngine key="b" blueprint={bp} />],
  ];

  it.each(cases)('%s: không có <animate*> khi giảm chuyển động', (_name, el) => {
    mockReducedMotion(true);
    const {container} = render(el);
    expect(container.querySelectorAll('animate, animateTransform, animateMotion').length).toBe(0);
  });

  it.each(cases)('%s: id gradient không trùng giữa hai bản cùng trang', (_name, el) => {
    mockReducedMotion(false);
    const a = render(el);
    const b = render(React.cloneElement(el, {key: 'second'}));
    const idsOf = (c: HTMLElement) => Array.from(c.querySelectorAll('[id]')).map((e) => e.id).filter((id) => id.startsWith('vk'));
    const ia = idsOf(a.container);
    const ib = idsOf(b.container);
    for (const id of ia) expect(ib).not.toContain(id);
  });

  it('con lắc kép và chu trình khí không tự chạy khi giảm chuyển động', () => {
    mockReducedMotion(true);
    const dp = render(<DoublePendulumEngine blueprint={bp} />);
    expect(dp.getByTestId('dp-run').textContent).toContain('Chạy');
    dp.unmount();
    const gas = render(<GasEngine blueprint={bp} />);
    expect(gas.getByTestId('gas-play').textContent).toContain('Chạy');
  });
});
