import {gauss, seeded} from '../../presets/sceneKit';
import type {P, S} from '../../presets/types';
import type {PhysAction, PhysCtx, PhysExperiment, PhysState, Result, Row} from './types';

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
/** Sai số tuyệt đối trung bình ΔA = trung bình |Aᵢ − Ā| (cách SGK). */
export const meanAbsDev = (xs: number[]) => {
  const m = mean(xs);
  return mean(xs.map((x) => Math.abs(x - m)));
};
export const sd = (xs: number[]) => {
  const m = mean(xs);
  return xs.length > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) : 0;
};
/** Làm tròn theo độ chia nhỏ nhất của dụng cụ. */
export const roundTo = (v: number, res: number) => Math.round(v / res) * res;
export const noisy = (v: number, sigma: number, res: number, rng: () => number) => roundTo(v + sigma * gauss(rng), res);

/** Hồi quy tuyến tính y = a·x + b (bình phương tối thiểu). */
export function linearFit(xs: number[], ys: number[]): {slope: number; intercept: number; r2: number} {
  const n = xs.length;
  if (n < 2) return {slope: NaN, intercept: NaN, r2: NaN};
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return {slope: NaN, intercept: NaN, r2: NaN};
  const slope = sxy / sxx;
  return {slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy)};
}

export const initialPhys = (e: PhysExperiment): PhysState => ({
  p: Object.fromEntries(e.sliders.map((q) => [q.key, q.value])),
  s: Object.fromEntries((e.choices ?? []).map((c) => [c.key, c.value])),
  rows: [],
  count: 0,
});

export function physReducer(e: PhysExperiment, st: PhysState, a: PhysAction): PhysState {
  switch (a.type) {
    case 'set':
      return {...st, p: {...st.p, [a.key]: a.value}};
    case 'choose':
      return {...st, s: {...st.s, [a.key]: a.value}};
    case 'measure': {
      if (e.columns.length === 0 || st.rows.length >= 40) return st;
      const rng = seeded(1000 + st.count * 7919);
      return {...st, rows: [...st.rows, e.measure(st.p, st.s, rng, st.count)], count: st.count + 1};
    }
    case 'delete':
      return {...st, rows: st.rows.filter((_, i) => i !== a.i)};
    case 'clear':
      return {...st, rows: []};
  }
}

export const runPhys = (e: PhysExperiment, script: PhysAction[]): PhysState => script.reduce((s, a) => physReducer(e, s, a), initialPhys(e));

export function physCtx(e: PhysExperiment, st: PhysState): PhysCtx {
  const res = e.results(st.rows, st.p, st.s);
  return {
    rows: st.rows,
    p: st.p,
    s: st.s,
    results: Object.fromEntries(res.map((r: Result) => [r.key, r.value])),
    distinct: (key: string) => new Set(st.rows.map((r) => r[key])).size,
  };
}
export const physStepsDone = (e: PhysExperiment, st: PhysState): boolean[] => {
  const c = physCtx(e, st);
  return e.steps.map((s) => {
    try {
      return s.done(c);
    } catch {
      return false;
    }
  });
};
export type {P, S, Row};
