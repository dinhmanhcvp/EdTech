/**
 * Ba mô phỏng trước đây chỉ mở được qua backend/Gemini (PHYS_OPTICS_LENS, BIO_HEART_CYCLE, CHEM_REACTION_LAB).
 * Nay có đường định tuyến cục bộ (offline, 0 API) với cùng bộ thông số mà backend (`routers/visualize.py`) dùng.
 * Mọi mẫu nhận dạng đều đòi từ khóa cụ thể để không nuốt nhầm chữ thường hay công thức khác.
 */
import type {SimulationBlueprint} from '@socratic/types';

const base = {ocrAlternatives: [] as string[], curriculumLevel: 'THPT_STANDARD' as const};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const num = (s: string) => parseFloat(s.replace(',', '.'));
const param = (key: string, label: string, unit: string, defaultValue: number, min: number, max: number, step: number) => ({key, label, unit, defaultValue, min, max, step});

const OPTICS = /thấu kính|thau kinh|\blens\b|tiêu cự|tieu cu|ảnh ảo|ảnh thật|quang hình|kính lúp|1\s*\/\s*f\b|\\frac\{1\}\{f\}/i;
const HEART = /nhịp tim|chu (?:kỳ|kì) tim|điện tâm đồ|dien tam do|\becg\b|\bekg\b|\bbpm\b|tim đập|\bheart\b|wiggers/i;
// khí sinh ra khi kim loại tác dụng axit, hoặc nói thẳng về tốc độ phản ứng/bọt khí
const REACTION_WORDS = /tốc độ phản ứng|toc do phan ung|bọt khí|bot khi|phản ứng tạo khí|arrhenius|nồng độ axit|diện tích bề mặt/i;
const METAL_ACID = /(?:mg|zn|al|fe)\+(?:hcl|h2so4)|(?:hcl|h2so4)\+(?:mg|zn|al|fe)|(?:mg|zn|al)(?:tácdụng|\+)?(?:hcl|h2so4|axit)/;

export function makeOpticsBlueprint(f?: number, d?: number): SimulationBlueprint {
  return {
    ...base,
    engine: 'PHYSICS',
    templateId: 'PHYS_OPTICS_LENS',
    recognizedLatex: "\\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d'}",
    parameters: [
      param('f', 'Tiêu cự (f)', 'px', clamp(f ?? 100, 40, 180), 40, 180, 10),
      param('d', 'Khoảng cách vật (d)', 'px', clamp(d ?? 220, 50, 350), 50, 350, 10),
      param('h', 'Chiều cao vật (h)', 'px', 50, 20, 80, 5),
    ],
    socraticQuestion: 'Khi di chuyển vật lại gần thấu kính sao cho d < f, ảnh thu được là ảnh thật hay ảnh ảo? Vì sao ảnh đổi chiều và đổi kích thước?',
  };
}

export function makeHeartBlueprint(bpm?: number): SimulationBlueprint {
  return {
    ...base,
    engine: 'BIOLOGY',
    templateId: 'BIO_HEART_CYCLE',
    recognizedLatex: '\\text{ECG Pulse: } S(t) = f(BPM)',
    parameters: [param('BPM', 'Nhịp tim (BPM)', 'nhịp/phút', clamp(bpm ?? 75, 40, 180), 40, 180, 5)],
    socraticQuestion: 'Khi cơ thể vận động mạnh, nhịp tim tăng lên 150 BPM nhằm mục đích sinh học gì đối với các mô cơ bắp? Pha tâm trương ngắn lại có ảnh hưởng gì tới việc đổ đầy tâm thất?',
  };
}

export function makeReactionLabBlueprint(temperature?: number, concentration?: number): SimulationBlueprint {
  return {
    ...base,
    engine: 'CHEMISTRY',
    templateId: 'CHEM_REACTION_LAB',
    recognizedLatex: '\\text{Rate} \\propto C_M \\cdot e^{-\\frac{E_a}{RT}}',
    parameters: [
      param('temperature', 'Nhiệt độ (T)', '°C', clamp(temperature ?? 25, 10, 80), 10, 80, 5),
      param('concentration', 'Nồng độ axit (C_M)', 'M', clamp(concentration ?? 1.5, 0.2, 5), 0.2, 5, 0.2),
      param('surfaceArea', 'Diện tích hạt', 'm²/g', 3, 1, 10, 1),
    ],
    socraticQuestion: 'Tại sao tăng nhiệt độ lại làm số bọt khí thoát ra trong một giây tăng lên theo hàm số mũ?',
  };
}

/** Văn bản → một trong ba mô phỏng trên, hoặc null. */
export function matchLegacyTemplate(text: string): SimulationBlueprint | null {
  const raw = text || '';
  if (OPTICS.test(raw)) {
    const f = /(?:^|[^a-z])f\s*=\s*(\d+(?:[.,]\d+)?)/i.exec(raw);
    const d = /(?:^|[^a-z])d\s*=\s*(\d+(?:[.,]\d+)?)/i.exec(raw);
    return makeOpticsBlueprint(f ? num(f[1]) : undefined, d ? num(d[1]) : undefined);
  }
  if (HEART.test(raw)) {
    const m = /(\d{2,3})\s*bpm|bpm\s*[=:]?\s*(\d{2,3})|nhịp tim\s*[=:]?\s*(\d{2,3})|(\d{2,3})\s*nhịp\s*\/\s*phút/i.exec(raw);
    const v = m ? m[1] ?? m[2] ?? m[3] ?? m[4] : undefined;
    return makeHeartBlueprint(v ? Number(v) : undefined);
  }
  const flat = raw.toLowerCase().replace(/[\s_{}]/g, '');
  if (REACTION_WORDS.test(raw) || METAL_ACID.test(flat)) {
    const t = /(\d{2})\s*°\s*c/i.exec(raw);
    const c = /(\d+(?:[.,]\d+)?)\s*(?:M\b|mol\/l)/.exec(raw);
    return makeReactionLabBlueprint(t ? Number(t[1]) : undefined, c ? num(c[1]) : undefined);
  }
  return null;
}
