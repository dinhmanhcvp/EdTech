import type {P, PresetSpec} from './types';

function integrate(start: number, at: number, tau: number, amount: number, rate: (v: number, t: number) => number): number[] {
  const out: number[] = [];
  const dt = 0.5;
  let v = start;
  for (let t = 0; t <= 240 + 1e-9; t += dt) {
    if (Math.abs(t - Math.round(t)) < 1e-9) out.push(v);
    const inp = t >= at ? (amount / tau) * Math.exp(-(t - at) / tau) : 0;
    v += dt * (inp + rate(v, t));
  }
  return out;
}

const OSM_SET = 300;
/** Áp suất thẩm thấu máu (mOsm/L). loss > 0: mất nước; loss < 0: uống quá nhiều nước. Rượu ức chế ADH. */
export function simulateOsmolality(p: P, on: Record<string, boolean>): number[] {
  const out = integrate(OSM_SET, 30, 30, p.loss, (o) => {
    const d = o - OSM_SET;
    let k = 0.004;
    if (on.loop) k += d > 0 ? 0.03 * (on.alcohol ? 0.2 : 1) : 0.03;
    return -k * d;
  });
  return out.map((o) => Math.min(400, Math.max(250, o)));
}

const BP_SET = 115;
/** Huyết áp tâm thu (mmHg). shock < 0: mất máu/đứng dậy đột ngột; shock > 0: căng thẳng đột ngột. */
export function simulatePressure(p: P, on: Record<string, boolean>): number[] {
  const out = integrate(BP_SET, 10, 20, p.shock, (v) => {
    const d = v - BP_SET;
    const k = 0.003 + (on.loop ? (on.weak ? 0.04 : 0.12) : 0);
    return -k * d;
  });
  return out.map((v) => Math.min(220, Math.max(40, v)));
}

export const SINH_FEEDBACK_PRESETS: Record<string, PresetSpec> = {
  BIO_OSMOREGULATION_ADH: {
    family: 'FEEDBACK_SYSTEM',
    engine: 'BIOLOGY',
    title: 'Điều hòa áp suất thẩm thấu của máu (ADH)',
    question:
      'Khi áp suất thẩm thấu máu tăng, vùng dưới đồi, tuyến yên và thận phối hợp thế nào để đưa nó về mức bình thường? Vì sao uống rượu bia làm khát nước và đi tiểu nhiều?',
    keywords: /\badh\b|ap suat tham thau (?:cua )?mau|dieu hoa (?:ap suat )?tham thau|hormone chong bai nieu/,
    examples: ['hormone ADH', 'ADH và thận tái hấp thu nước'],
    data: {
      variable: {label: 'Áp suất thẩm thấu máu', unit: 'mOsm/L', setpoint: OSM_SET, band: [290, 310], yRange: [260, 340]},
      params: [{key: 'loss', label: 'Thay đổi gây ra (+ mất nước, − uống quá nhiều nước)', unit: 'mOsm/L', min: -30, max: 60, step: 1, value: 30}],
      toggles: [
        {key: 'loop', label: 'Điều hòa ngược ADH + thận', value: true},
        {key: 'alcohol', label: 'Rượu bia (ức chế ADH)', value: false},
      ],
      tMax: 240,
      dt: 1,
      timeUnit: 'phút',
      eventAt: 30,
      eventLabel: 'thay đổi',
      simulate: simulateOsmolality,
      sense: 'Thụ thể thẩm thấu ở vùng dưới đồi nhận biết áp suất thẩm thấu máu',
      states: {
        high: {control: 'Vùng dưới đồi gây cảm giác khát; tuyến yên sau tiết ADH', effect: 'Ống thận và ống góp tái hấp thu nhiều nước hơn, nước tiểu cô đặc', result: 'Áp suất thẩm thấu máu giảm'},
        low: {control: 'Tuyến yên giảm tiết ADH', effect: 'Thận tái hấp thu ít nước, thải nhiều nước tiểu loãng', result: 'Áp suất thẩm thấu máu tăng'},
        ok: {control: 'Tiết ADH ở mức nền', effect: 'Cân bằng nước và muối', result: 'Áp suất thẩm thấu máu ≈ 300 mOsm/L'},
      },
      note: 'Áp suất thẩm thấu máu trung bình khoảng 300 mOsm/L; vùng xanh là khoảng dao động coi như bình thường (mô phỏng định tính).',
    },
  },

  BIO_BLOOD_PRESSURE_REFLEX: {
    family: 'FEEDBACK_SYSTEM',
    engine: 'BIOLOGY',
    title: 'Điều hòa huyết áp bằng phản xạ thần kinh',
    question:
      'Khi huyết áp đột ngột giảm, thụ thể áp lực, trung khu điều hòa tim mạch và dây giao cảm phối hợp thế nào để huyết áp trở lại bình thường?',
    keywords: /dieu hoa huyet ap|huyet ap (?:giam|tang) dot ngot|phan xa (?:dieu hoa )?(?:huyet ap|tim mach)|thu the ap luc|xoang dong mach canh/,
    examples: ['điều hòa huyết áp', 'phản xạ điều hòa tim mạch', 'thụ thể áp lực xoang động mạch cảnh'],
    data: {
      variable: {label: 'Huyết áp tâm thu', unit: 'mmHg', setpoint: BP_SET, band: [110, 120], yRange: [60, 170]},
      params: [{key: 'shock', label: 'Biến động đột ngột (− mất máu/đứng dậy nhanh, + căng thẳng)', unit: 'mmHg', min: -50, max: 50, step: 1, value: -40}],
      toggles: [
        {key: 'loop', label: 'Phản xạ điều hòa tim mạch', value: true},
        {key: 'weak', label: 'Đáp ứng yếu (mạch kém đàn hồi)', value: false},
      ],
      tMax: 240,
      dt: 1,
      timeUnit: 'phút',
      eventAt: 10,
      eventLabel: 'biến động',
      simulate: simulatePressure,
      sense: 'Thụ thể áp lực ở xoang động mạch cảnh và cung động mạch chủ',
      states: {
        high: {control: 'Trung khu ở hành não tăng xung đối giao cảm', effect: 'Tim đập chậm, yếu; mạch giãn', result: 'Huyết áp giảm'},
        low: {control: 'Trung khu ở hành não tăng xung giao cảm; tuyến trên thận tiết adrenaline, noradrenaline', effect: 'Tim đập nhanh, mạnh; mạch máu nhỏ co lại', result: 'Huyết áp tăng'},
        ok: {control: 'Xung thần kinh ở mức nền', effect: 'Tim mạch hoạt động bình thường', result: 'Huyết áp tâm thu khoảng 110–120 mmHg'},
      },
      note: 'Huyết áp tâm thu bình thường của người trưởng thành khoảng 110–120 mmHg (mô phỏng định tính).',
    },
  },
};
