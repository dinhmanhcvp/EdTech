// apps/teacher-board/src/utils/bioModels.ts
/**
 * Ba mô hình Sinh học tất định (từ tài liệu nghiên cứu), phần TÍNH TOÁN thuần túy + phần nhận từ khóa:
 *  - BIO_STOMATA_GAS  : độ mở khí khổng theo ánh sáng, độ ẩm đất, nhiệt độ (> 45 °C đóng kín)
 *  - BIO_OSMOSIS_CELL : thẩm thấu qua màng — tế bào thực vật (trương nước / co nguyên sinh) và hồng cầu (vỡ / teo)
 *  - BIO_OPERON_LAC   : điều hòa gen ở operon Lac: chất ức chế, CAP–cAMP, đột biến
 * Đây là mô hình sư phạm định tính–định lượng, không phải mô phỏng sinh lí chính xác tuyệt đối; các hằng số được ghi rõ.
 */

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (x: number, a: number, b: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ============================================================ Khí khổng
export interface StomataResult {
  /** độ mở 0..1 */
  aperture: number;
  /** nồng độ K⁺ trong tế bào bảo vệ (tương đối 0..1) */
  potassium: number;
  /** áp suất trương (tương đối 0..1) */
  turgor: number;
  state: 'closed' | 'narrow' | 'open';
  /** các tốc độ tương đối 0..1 */
  co2Uptake: number;
  waterLoss: number;
  photosynthesis: number;
  reason: string;
}

/** light 0–100 (% cường độ), moisture 0–100 (% độ ẩm đất), temp °C. */
export function stomata(light: number, moisture: number, temp: number): StomataResult {
  const lightF = clamp((light / (light + 18)) * 1.18); // bão hòa dần, ánh sáng xanh kích hoạt bơm H⁺ → K⁺ vào
  const waterF = smooth(moisture, 12, 50); // thiếu nước: ABA làm K⁺ thoát ra → đóng
  const heatF = 1 - smooth(temp, 32, 45); // ≥ 45 °C: mất nước, đóng kín
  const aperture = clamp(lightF * waterF * heatF);
  const potassium = clamp(lightF * (0.35 + 0.65 * waterF));
  const turgor = clamp(0.15 + 0.85 * aperture);
  const state = aperture < 0.08 ? 'closed' : aperture < 0.45 ? 'narrow' : 'open';
  const limiting = [
    ['ánh sáng yếu: bơm H⁺/K⁺ chưa được kích hoạt', lightF],
    ['đất thiếu nước: tín hiệu ABA làm K⁺ thoát ra, tế bào mất trương', waterF],
    ['nhiệt độ quá cao: mất nước nhanh, khí khổng đóng để giữ nước', heatF],
  ] as [string, number][];
  const worst = limiting.reduce((m, x) => (x[1] < m[1] ? x : m));
  const reason = state === 'open' ? 'Ánh sáng đủ, đất đủ nước, nhiệt độ vừa phải → K⁺ vào, nước vào, tế bào bảo vệ trương và cong ra → lỗ mở.' : `Hạn chế chính: ${worst[0]}.`;
  const transp = aperture * (0.55 + 0.45 * clamp((temp - 10) / 30));
  return {aperture, potassium, turgor, state, co2Uptake: aperture, waterLoss: clamp(transp), photosynthesis: clamp(aperture * (light / (light + 25))), reason};
}

// ============================================================ Thẩm thấu
export type CellType = 'plant' | 'rbc';
export interface OsmosisResult {
  type: CellType;
  cOut: number;
  cIn: number;
  /** thể tích tương đối so với lúc cân bằng (1 = cân bằng) */
  volume: number;
  /** áp suất thẩm thấu (atm) của dịch ngoài và trong */
  piOut: number;
  piIn: number;
  /** áp suất trương (atm) — chỉ tế bào thực vật */
  turgor: number;
  /** mức co nguyên sinh 0..1 */
  plasmolysis: number;
  state: 'turgid' | 'equilibrium' | 'plasmolysis' | 'burst' | 'swollen' | 'crenated';
  label: string;
  waterFlow: 'in' | 'out' | 'none';
}

const OSM_NACL = 1.86; // hệ số van 't Hoff của NaCl (độ phân li không hoàn toàn)
const R_T = 0.0821 * 310; // atm·L/mol/K × 37 °C
/** Áp suất thẩm thấu (atm) của dung dịch NaCl nồng độ % (g/100 mL). */
export const osmoticPressure = (percent: number) => OSM_NACL * ((percent * 10) / 58.44) * R_T;

/** cOut: % NaCl bên ngoài. cIn: nồng độ đẳng trương của tế bào (mặc định 0,9 %). */
export function osmosis(type: CellType, cOut: number, cIn = 0.9): OsmosisResult {
  const piOut = osmoticPressure(cOut);
  const piIn = osmoticPressure(cIn);
  const diff = piIn - piOut; // > 0: nước đi vào
  const waterFlow = Math.abs(diff) < 0.12 ? 'none' : diff > 0 ? 'in' : 'out';
  if (type === 'rbc') {
    const b = 0.2; // phần thể tích không tham gia thẩm thấu (hemoglobin, màng)
    const volume = cOut <= 1e-9 ? 9 : b + (1 - b) * (cIn / cOut);
    const state = volume > 1.45 ? 'burst' : volume > 1.07 ? 'swollen' : volume < 0.93 ? 'crenated' : 'equilibrium';
    const label = {burst: 'Hồng cầu vỡ (tan huyết)', swollen: 'Hồng cầu trương phồng', crenated: 'Hồng cầu teo nhăn (răng cưa)', equilibrium: 'Đẳng trương: thể tích không đổi', turgid: '', plasmolysis: ''}[state];
    return {type, cOut, cIn, volume: Math.min(volume, 1.6), piOut, piIn, turgor: 0, plasmolysis: 0, state, label, waterFlow};
  }
  // tế bào thực vật: thành xenlulozơ chặn vỡ
  if (diff > 0.12) {
    const turgor = diff; // thành tế bào cân bằng áp suất → P = Π_trong − Π_ngoài
    const volume = 1 + 0.1 * clamp(diff / Math.max(piIn, 1e-9));
    return {type, cOut, cIn, volume, piOut, piIn, turgor, plasmolysis: 0, state: 'turgid', label: 'Trương nước: thành tế bào giữ cho tế bào không vỡ', waterFlow};
  }
  if (diff < -0.12) {
    const plasmolysis = clamp((piOut - piIn) / Math.max(piIn, 1e-9) / 1.4);
    const volume = 1 - 0.55 * plasmolysis;
    return {type, cOut, cIn, volume, piOut, piIn, turgor: 0, plasmolysis, state: 'plasmolysis', label: plasmolysis > 0.6 ? 'Co nguyên sinh mạnh: màng tách khỏi thành' : 'Bắt đầu co nguyên sinh', waterFlow};
  }
  return {type, cOut, cIn, volume: 1, piOut, piIn, turgor: 0, plasmolysis: 0, state: 'equilibrium', label: 'Cân bằng: nước ra vào như nhau', waterFlow};
}

// ============================================================ Operon Lac
export type LacMutant = 'none' | 'lacI-' | 'lacOc' | 'cap-';
export interface LacResult {
  glucose: boolean;
  lactose: boolean;
  mutant: LacMutant;
  repressorBound: boolean; // chất ức chế đang bám toán tử O
  allolactose: boolean;
  capActive: boolean; // CAP–cAMP gắn vùng CAP
  rnaPol: 'transcribing' | 'weak' | 'blocked';
  /** mức biểu hiện lacZYA 0..1 */
  expression: number;
  enzymes: {lacZ: number; lacY: number; lacA: number};
  lactoseBreakdown: number;
  explanation: string;
}

export function operonLac(glucose: boolean, lactose: boolean, mutant: LacMutant = 'none'): LacResult {
  const allolactose = lactose; // lactose được β-galactosidase nền biến đổi thành allolactose (chất cảm ứng)
  const repressorWorks = mutant !== 'lacI-' && mutant !== 'lacOc';
  const repressorBound = repressorWorks && !allolactose;
  const cAMPhigh = !glucose; // glucose thấp → cAMP cao
  const capActive = cAMPhigh && mutant !== 'cap-';
  let expression: number;
  let rnaPol: LacResult['rnaPol'];
  if (repressorBound) {
    expression = 0.01; // rò rỉ cơ bản
    rnaPol = 'blocked';
  } else if (capActive) {
    expression = 1;
    rnaPol = 'transcribing';
  } else {
    expression = 0.1; // promoter yếu khi thiếu CAP–cAMP
    rnaPol = 'weak';
  }
  const enzymes = {lacZ: expression, lacY: expression, lacA: expression};
  const lactoseBreakdown = lactose ? expression : 0;
  let explanation: string;
  if (mutant === 'lacI-') explanation = 'Đột biến lacI⁻: chất ức chế hỏng, không bám được toán tử → operon luôn mở (không cần lactose); mức cao hay thấp còn tùy glucose.';
  else if (mutant === 'lacOc') explanation = 'Đột biến toán tử lacOc: chất ức chế bình thường nhưng không nhận ra O → operon biểu hiện cả khi không có lactose.';
  else if (mutant === 'cap-') explanation = 'Đột biến CAP⁻: không hoạt hóa promoter → dù có lactose, biểu hiện tối đa chỉ ~10 %.';
  else if (!lactose) explanation = 'Không có lactose: chất ức chế bám toán tử O, chặn RNA polymerase → operon tắt.';
  else if (glucose) explanation = 'Có cả glucose và lactose: lactose gỡ chất ức chế nhưng glucose làm cAMP thấp → CAP không hoạt động → biểu hiện yếu. Vi khuẩn ưu tiên glucose (ức chế dị hóa).';
  else explanation = 'Có lactose, không glucose: allolactose gỡ chất ức chế, CAP–cAMP hoạt hóa promoter → phiên mã mạnh lacZ, lacY, lacA.';
  return {glucose, lactose, mutant, repressorBound, allolactose, capActive, rnaPol, expression, enzymes, lactoseBreakdown, explanation};
}

// ============================================================ nhận từ khóa / cú pháp
export interface BioMatch {
  templateId: 'BIO_STOMATA_GAS' | 'BIO_OSMOSIS_CELL' | 'BIO_OPERON_LAC';
  meta: Record<string, unknown>;
  title: string;
}

const num = (s: string) => parseFloat(s.replace(',', '.'));

export function matchBioKeywords(text: string): BioMatch | null {
  const t = (text || '').toLowerCase();
  if (/operon|opêron|\blac\s*(?:z|y|a|i)\b|lactose.*glucose|glucose.*lactose/.test(t)) {
    return {templateId: 'BIO_OPERON_LAC', meta: {glucose: /glucose\s*(?:\(\+\)|có|cao)/.test(t) && !/không\s*glucose|glucose\s*\(-\)/.test(t), lactose: !/không\s*lactose|lactose\s*\(-\)/.test(t)}, title: 'Operon Lac'};
  }
  if (/khí khổng|khi khong|stomata|tế bào hạt đậu|tế bào bảo vệ/.test(t)) {
    return {templateId: 'BIO_STOMATA_GAS', meta: {}, title: 'Khí khổng'};
  }
  if (/co nguyên sinh|thẩm thấu|tham thau|ưu trương|nhược trương|đẳng trương|hồng cầu|plasmolysis|osmosis/.test(t)) {
    const plant = !/hồng cầu|động vật/.test(t);
    const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(t);
    let c = m ? num(m[1]) : /ưu trương/.test(t) ? 3 : /nhược trương/.test(t) ? 0.2 : 0.9;
    c = clamp(c, 0, 10);
    return {templateId: 'BIO_OSMOSIS_CELL', meta: {cellType: plant ? 'plant' : 'rbc', cOut: c}, title: 'Thẩm thấu'};
  }
  return null;
}
