import {RULES} from './rules';
import {SPECIES, SUB_BY_ID} from './species';
import type {Action, CheckCtx, Derived, Experiment, LabState, Rule, Vessel} from './types';

const EPS = 1e-9;
const SORTED: Rule[] = RULES.map((r, i) => ({r, i})).sort((a, b) => (a.r.priority ?? 5) - (b.r.priority ?? 5) || a.i - b.i).map((x) => x.r);
const INSTANT = SORTED.filter((r) => r.k === undefined);
const RATE = SORTED.filter((r) => r.k !== undefined);

export const newVessel = (i: number, kind: 'tube' | 'beaker' = 'tube'): Vessel => ({
  id: `${kind === 'tube' ? 'Ống' : 'Cốc'} ${i + 1}`,
  kind,
  capacityMl: kind === 'tube' ? 20 : 150,
  moles: {},
  liquidMl: 0,
  waterMl: 0,
  temp: 25,
  t: 0,
  gasRate: 0,
  fired: [],
  light: false,
  turbidAt: null,
  log: [],
});

export const newLab = (): LabState => ({
  vessels: [newVessel(0), newVessel(1), newVessel(2), newVessel(3), newVessel(4, 'beaker')],
  added: [],
  goggles: false,
  violations: [],
  log: [],
  clock: 0,
});

export const conc = (v: Vessel, sp: string): number => (v.liquidMl > 0 ? (v.moles[sp] ?? 0) / (v.liquidMl / 1000) : 0);
const has = (v: Vessel, sp: string, min = 1e-7) => (v.moles[sp] ?? 0) > min;

function ready(r: Rule, v: Vessel): boolean {
  if (r.wet && v.waterMl < 0.5) return false;
  if (r.minTemp !== undefined && v.temp < r.minTemp) return false;
  if (r.needsLight && !v.light) return false;
  return (r.catalysts ?? []).every((c) => has(v, c, 1e-6));
}
const extentMax = (r: Rule, v: Vessel): number => {
  let m = Infinity;
  for (const [s, c] of Object.entries(r.reactants)) m = Math.min(m, (v.moles[s] ?? 0) / c);
  return m;
};

interface Ev {text: string}
function apply(r: Rule, v: Vessel, fraction: number, evs: Ev[]): {ext: number; gas: number} {
  const ext = extentMax(r, v) * fraction;
  if (!(ext > EPS)) return {ext: 0, gas: 0};
  let gas = 0;
  for (const [s, c] of Object.entries(r.reactants)) {
    v.moles[s] = Math.max(0, (v.moles[s] ?? 0) - c * ext);
    if (v.moles[s] < 1e-13) delete v.moles[s];
  }
  for (const [s, c] of Object.entries(r.products)) {
    v.moles[s] = (v.moles[s] ?? 0) + c * ext;
    if (SPECIES[s]?.phase === 'g') gas += c * ext;
  }
  if (r.heat) v.temp += (-r.heat * ext * 1000) / (Math.max(v.liquidMl, 2) * 4.18);
  if (!v.fired.includes(r.id)) {
    v.fired.push(r.id);
    if (r.text) evs.push({text: r.text});
  }
  return {ext, gas};
}

function settle(v: Vessel, evs: Ev[]): number {
  let gas = 0;
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (const r of INSTANT) {
      if (!ready(r, v)) continue;
      const o = apply(r, v, 1, evs);
      if (o.ext > 0) {
        changed = true;
        gas += o.gas;
      }
    }
    if (!changed) break;
  }
  return gas;
}

/** Tốc độ hiệu dụng (1/s): k · Π(c/0,1) · Π(hệ số bề mặt) · 2^((T−25)/10). */
export function effectiveRate(r: Rule, v: Vessel): number {
  let k = r.k ?? 0;
  for (const s of r.rateSpecies ?? []) k *= conc(v, s) / 0.1;
  for (const s of Object.keys(r.reactants)) k *= SPECIES[s]?.speed ?? 1;
  return k * Math.pow(2, (v.temp - 25) / 10);
}

export function stepVessel(v: Vessel, dt: number, evs: Ev[]): void {
  let gas = settle(v, evs);
  if (dt > 0) {
    v.t += dt;
    for (const r of RATE) {
      if (!ready(r, v) || extentMax(r, v) <= EPS) continue;
      const kEff = effectiveRate(r, v);
      if (kEff <= 0) continue;
      gas += apply(r, v, 1 - Math.exp(-kEff * dt), evs).gas;
    }
    gas += settle(v, evs);
    const tau = v.liquidMl > 0.5 ? 150 : 40;
    v.temp = 25 + (v.temp - 25) * Math.exp(-dt / tau);
    for (const s of Object.keys(v.moles)) {
      if (SPECIES[s]?.phase === 'g') {
        v.moles[s] *= Math.exp(-dt / 30);
        if (v.moles[s] < 1e-10) delete v.moles[s];
      }
    }
  }
  v.gasRate = gas / Math.max(dt, 3);
  if (v.turbidAt === null && turbidity(v) > 0.35) {
    v.turbidAt = v.t;
    evs.push({text: `dung dịch bắt đầu đục sau ${Math.round(v.t)} s`});
  }
}

const turbidity = (v: Vessel): number => {
  let c = 0;
  for (const [s, m] of Object.entries(v.moles)) if (SPECIES[s]?.turbid && v.liquidMl > 0) c += m / (v.liquidMl / 1000);
  return Math.min(1, c / 0.004) * 0.85;
};

// ------------------------------------------------------------------ pH, màu, trạng thái hiển thị
export function pHOf(v: Vessel): number | null {
  if (v.waterMl < 0.3) return null;
  const V = v.liquidMl / 1000;
  const net = (v.moles['H+'] ?? 0) - (v.moles['OH-'] ?? 0);
  if (net > 1e-9) return Math.max(0, -Math.log10(net / V));
  if (net < -1e-9) return Math.min(14, 14 + Math.log10(-net / V));
  const c = (s: string) => (v.moles[s] ?? 0) / V;
  if (c('CH3COOH') > 1e-4) return 0.5 * (4.76 - Math.log10(c('CH3COOH')));
  if (c('NH3(aq)') > 1e-4) return 14 - 0.5 * (4.75 - Math.log10(c('NH3(aq)')));
  if (c('CH3COO-') > 1e-4) return 7 + 0.5 * (4.76 + Math.log10(c('CH3COO-')));
  let best = 7;
  for (const [s, m] of Object.entries(v.moles)) {
    const sp = SPECIES[s];
    if (sp?.ph !== undefined && m / V >= (sp.phMinConc ?? 0.002) && Math.abs(sp.ph - 7) > Math.abs(best - 7)) best = sp.ph;
  }
  return best;
}

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: number[]) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

function indicatorColor(v: Vessel, ph: number | null): string | null {
  if (ph === null) return null;
  if (has(v, 'PP', 1e-8) && ph >= 8.2) return '#EC4899';
  if (has(v, 'MO', 1e-8)) return ph < 3.1 ? '#DC2626' : ph < 4.4 ? '#F97316' : '#FACC15';
  if (has(v, 'litmus', 1e-8)) return ph < 5 ? '#EF4444' : ph > 8 ? '#3B82F6' : '#A78BFA';
  return null;
}

export function derive(v: Vessel): Derived {
  const V = v.liquidMl / 1000;
  const ph = pHOf(v);
  let r = 0;
  let g = 0;
  let b = 0;
  let wsum = 0;
  const parts: {c: [number, number, number]; w: number}[] = [];
  for (const [s, m] of Object.entries(v.moles)) {
    const sp = SPECIES[s];
    if (!sp || sp.phase !== 'aq' || !sp.color || V <= 0) continue;
    const w = Math.min(1, m / V / 0.03);
    if (w > 0.02) parts.push({c: hex(sp.color), w});
  }
  const ind = indicatorColor(v, ph);
  if (ind) parts.push({c: hex(ind), w: 0.9});
  for (const p of parts) {
    r += p.c[0] * p.w;
    g += p.c[1] * p.w;
    b += p.c[2] * p.w;
    wsum += p.w;
  }
  const color = wsum > 0 ? toHex([r / wsum, g / wsum, b / wsum]) : '#E0F2FE';
  const precipitates = Object.entries(v.moles)
    .filter(([s, m]) => SPECIES[s]?.phase === 's' && m > 1e-6)
    .map(([s, m]) => ({species: s, name: SPECIES[s].name, color: SPECIES[s].color ?? '#E5E7EB', mol: m}));
  const smell = [
    ...Object.entries(v.moles).filter(([s, m]) => SPECIES[s]?.smell && m > 1e-6 && (SPECIES[s].phase === 'g' || s === 'CH3COOH' || s === 'NH3(aq)' && m / V > 0.01)).map(([s]) => SPECIES[s].smell as string),
  ].filter((x, i, a) => a.indexOf(x) === i);
  let I = 0;
  for (const [s, m] of Object.entries(v.moles)) {
    const sp = SPECIES[s];
    if (sp?.charge && V > 0) I += 0.5 * (m / V) * sp.charge * sp.charge;
  }
  return {
    color,
    colorAlpha: wsum > 0 ? Math.min(0.9, 0.25 + wsum * 0.6) : 0.35,
    precipitates,
    turbidity: turbidity(v),
    bubbles: v.gasRate <= 0 ? 0 : Math.min(1, Math.log10(1 + v.gasRate * 2e5) / 3),
    ph,
    temp: v.temp,
    volumeMl: v.liquidMl,
    smell,
    conducts: Math.min(1, I / 0.2),
    species: Object.keys(v.moles),
  };
}

// ------------------------------------------------------------------ thao tác
const clone = (s: LabState): LabState => ({
  ...s,
  vessels: s.vessels.map((v) => ({...v, moles: {...v.moles}, fired: [...v.fired], log: [...v.log]})),
  added: [...s.added],
  violations: [...s.violations],
  log: [...s.log],
});

function flush(s: LabState, vi: number, evs: Ev[]) {
  for (const e of evs) {
    s.log.push({t: s.clock, v: vi, text: e.text});
    s.vessels[vi].log.push(e.text);
  }
}
const violate = (s: LabState, msg: string) => {
  if (!s.violations.includes(msg)) s.violations.push(msg);
};

export function labReducer(state: LabState, a: Action): LabState {
  if (a.type === 'reset') return newLab();
  const s = clone(state);
  if (a.type === 'goggles') {
    s.goggles = !!a.on;
    return s;
  }
  if (a.type === 'wait') {
    const total = Math.max(0, a.seconds ?? 10);
    const chunk = 5;
    for (let done = 0; done < total - 1e-9; done += chunk) {
      const dt = Math.min(chunk, total - done);
      s.clock += dt;
      s.vessels.forEach((v, i) => {
        const evs: Ev[] = [];
        stepVessel(v, dt, evs);
        flush(s, i, evs);
      });
    }
    return s;
  }
  const vi = a.v ?? 0;
  const v = s.vessels[vi];
  if (!v) return s;
  const evs: Ev[] = [];
  if (a.type === 'discard') {
    s.vessels[vi] = {...newVessel(vi, v.kind), log: []};
    return s;
  }
  if (a.type === 'light') {
    v.light = !!a.on;
    stepVessel(v, 0, evs);
  } else if (a.type === 'heat') {
    if (has(v, 'C2H5OH', 1e-6) || has(v, 'hexane', 1e-6)) violate(s, `Đun trực tiếp chất dễ cháy trong ${v.id}`);
    v.temp = v.liquidMl > 0.5 ? Math.min(100, v.temp + 20) : Math.min(600, v.temp + 80);
    if (v.liquidMl > 0.5 && v.temp >= 100) evs.push({text: 'chất lỏng sôi'});
    stepVessel(v, 0, evs);
    flush(s, vi, evs);
    evs.length = 0;
    const secs = 10;
    s.clock += secs;
    s.vessels.forEach((w, i) => {
      const e2: Ev[] = [];
      stepVessel(w, secs, e2);
      flush(s, i, e2);
    });
    return s;
  } else if (a.type === 'transferGas') {
    const to = s.vessels[a.to ?? -1];
    if (to && to !== v) {
      const moved: string[] = [];
      for (const sp of Object.keys(v.moles)) {
        if (SPECIES[sp]?.phase === 'g') {
          to.moles[sp] = (to.moles[sp] ?? 0) + v.moles[sp];
          delete v.moles[sp];
          moved.push(SPECIES[sp].name);
        }
      }
      if (moved.length) evs.push({text: `dẫn khí (${moved.join(', ')}) sang ${to.id}`});
      const e2: Ev[] = [];
      stepVessel(to, 0, e2);
      flush(s, a.to ?? 0, e2);
    }
  } else if (a.type === 'add') {
    const sub = a.sub ? SUB_BY_ID[a.sub] : undefined;
    const amt = a.amount ?? 1;
    if (!sub) return s;
    if (sub.hazard && !s.goggles) violate(s, `Chưa đeo kính bảo hộ khi dùng ${sub.label}`);
    if (sub.id === 'na' && amt > 0.1) violate(s, 'Dùng quá nhiều natri: chỉ lấy mẩu bằng hạt đậu');
    if ((sub.kind === 'solution' || sub.kind === 'indicator') && has(v, 'H2SO4(conc)', 1e-6)) violate(s, 'Rót nước vào acid đặc: phải rót acid vào nước');
    const volume = sub.kind === 'solid' ? 0 : amt;
    if (v.liquidMl + volume > v.capacityMl) {
      evs.push({text: `${v.id} đầy, chất lỏng tràn ra ngoài`});
      violate(s, `Làm đầy tràn ${v.id}`);
    } else {
      let n = 0;
      if (sub.kind === 'solution' || sub.kind === 'indicator') n = ((sub.conc ?? 0) * amt) / 1000;
      else if (sub.kind === 'liquid') n = (amt * (sub.density ?? 1)) / (sub.molar ?? 1);
      else n = amt / (sub.molar ?? 1);
      for (const [sp, c] of Object.entries(sub.species)) v.moles[sp] = (v.moles[sp] ?? 0) + c * n;
      v.liquidMl += volume;
      if (sub.kind === 'solution' || sub.kind === 'indicator') v.waterMl += amt;
      if (!s.added.includes(sub.id)) s.added.push(sub.id);
      evs.push({text: `cho ${sub.kind === 'solid' ? `${amt} g` : `${amt} mL`} ${sub.label} vào ${v.id}`});
      s.clock += 0.5;
      stepVessel(v, 0.5, evs);
    }
  }
  flush(s, vi, evs);
  return s;
}

export function runScript(actions: Action[]): LabState {
  return actions.reduce(labReducer, newLab());
}

export function checkContext(state: LabState): CheckCtx {
  const d = state.vessels.map(derive);
  return {
    state,
    d,
    added: (id) => state.added.includes(id),
    seen: (text) => state.log.some((l) => l.text.includes(text)),
    has: (vi, sp) => (state.vessels[vi]?.moles[sp] ?? 0) > 1e-7,
  };
}

export const stepsDone = (e: Experiment, state: LabState): boolean[] => {
  const c = checkContext(state);
  return e.steps.map((st) => {
    try {
      return st.done(c);
    } catch {
      return false;
    }
  });
};
