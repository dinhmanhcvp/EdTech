import type {AssemblyKind, AssemblySpec} from './assembly';

/**
 * Tháo lắp bằng DỤNG CỤ như làm thật: mỗi chi tiết được giữ bằng vít, bu-lông, phe cài hay kẹt chặt trên trục (cần cảo).
 * Phải chọn đúng dụng cụ rồi vặn các chi tiết giữ ra hết thì mới nhấc được chi tiết; lắp lại thì đặt chi tiết vào chỗ rồi siết đủ.
 * Logic thuần (kiểm thử được); cảnh 3D chỉ vẽ và đọc tay, mọi luật nằm ở đây.
 */
export type ToolId = 'ph1' | 'ph2' | 'flat' | 'hex25' | 'hex4' | 'sock10' | 'sock13' | 'sparksock' | 'spanner' | 'puller' | 'pliers' | 'torque';
export type DriveShape = 'upright' | 'flat';
export interface ToolSpec {
  id: ToolId;
  name: string;
  /** tên bộ phận trong `tools-parts.glb` */
  model: string;
  /** dùng cho loại chi tiết giữ nào (hiện ở hộp dụng cụ) */
  use: string;
  shape: DriveShape;
}
export const TOOLS: Record<ToolId, ToolSpec> = {
  ph1: {id: 'ph1', name: 'Tua vít chữ thập PH1', model: 'DriverPH1', use: 'vít chữ thập nhỏ (M2 – M3): vi mạch, servo, bo mạch', shape: 'upright'},
  ph2: {id: 'ph2', name: 'Tua vít chữ thập PH2', model: 'DriverPH2', use: 'vít chữ thập cỡ vừa (M4 – M5): nắp che, thùng máy, bộ nguồn', shape: 'upright'},
  flat: {id: 'flat', name: 'Tua vít dẹt', model: 'DriverFlat', use: 'vít rãnh thẳng: nắp hộp đấu dây', shape: 'upright'},
  hex25: {id: 'hex25', name: 'Chìa lục giác 2,5 mm', model: 'HexKey25', use: 'vít lục giác chìm M3: khung drone, khớp robot nhỏ', shape: 'upright'},
  hex4: {id: 'hex4', name: 'Chìa lục giác 4 mm', model: 'HexKey4', use: 'vít lục giác chìm M5: các khâu cánh tay robot', shape: 'upright'},
  sock10: {id: 'sock10', name: 'Tuýp 10 mm + cần tự động', model: 'Socket10', use: 'bu-lông đầu lục giác M6 (đầu 10 mm)', shape: 'upright'},
  sock13: {id: 'sock13', name: 'Tuýp 13 mm + cần tự động', model: 'Socket13', use: 'bu-lông đầu lục giác M8 (đầu 13 mm)', shape: 'upright'},
  sparksock: {id: 'sparksock', name: 'Tuýp bugi + tay quay chữ T', model: 'SparkSocket', use: 'bugi (tuýp dài ôm sứ cách điện)', shape: 'upright'},
  spanner: {id: 'spanner', name: 'Cờ lê vòng miệng', model: 'Spanner', use: 'đai ốc lộ ra ngoài: bánh đà, cánh quạt', shape: 'flat'},
  puller: {id: 'puller', name: 'Cảo ba chấu', model: 'Puller', use: 'chi tiết ép chặt trên trục: ổ bi, puli (không gõ búa)', shape: 'upright'},
  pliers: {id: 'pliers', name: 'Kìm mở phe', model: 'Pliers', use: 'vòng hãm (phe) cài trong rãnh trục', shape: 'upright'},
  torque: {id: 'torque', name: 'Cờ lê lực', model: 'TorqueWrench', use: 'siết bu-lông quan trọng đúng lực (kêu cạch khi đủ)', shape: 'upright'},
};

export interface Fastener {
  /** dụng cụ để nới / tháo */
  tool: ToolId;
  /** dụng cụ để siết lại (mặc định như `tool`) */
  tighten?: ToolId;
  /** mô tả: loại và cỡ */
  what: string;
  count: number;
  /** số vòng vặn cho mỗi con (một vòng = quay trọn 360° mũi dụng cụ) */
  turns: number;
  /** siết / nới theo đường chéo (đều lực, gioăng kín) */
  cross?: boolean;
  /** lắp lại không cần vặn (ép vào chỗ): mọi chi tiết giữ coi như đã khoá khi chi tiết được đặt vào */
  press?: boolean;
}
const f = (tool: ToolId, what: string, count: number, turns: number, extra: Partial<Fastener> = {}): Fastener => ({tool, what, count, turns, ...extra});

/** mỗi chi tiết có thể có MỘT nhóm chi tiết giữ; chi tiết không có là cắm / đặt vào (rôto, RAM, cáp…) */
export const FASTENERS: Record<AssemblyKind, Record<string, Fastener>> = {
  motor: {
    cowl: f('ph2', 'vít chữ thập M5 giữ nắp che quạt', 4, 1.2),
    fan: f('pliers', 'phe cài đuôi trục giữ quạt', 1, 1, {press: false}),
    rear_shield: f('sock13', 'bu-lông xuyên M8 (đầu 13) giữ nắp máy sau', 4, 1.5, {cross: true}),
    rear_bearing: f('puller', 'ổ bi ép chặt trên trục (cần cảo)', 1, 3, {press: true}),
    pulley: f('puller', 'puli ép chặt trên trục (cần cảo ba chấu)', 1, 3, {press: true}),
    front_shield: f('sock13', 'bu-lông xuyên M8 (đầu 13) giữ nắp máy trước', 4, 1.5, {cross: true}),
    front_bearing: f('puller', 'ổ bi ép chặt trên trục (cần cảo)', 1, 3, {press: true}),
    box_cover: f('flat', 'vít rãnh thẳng giữ nắp hộp đấu dây', 2, 1),
  },
  engine: {
    head_cover: f('ph2', 'vít chữ thập M5 giữ nắp dàn cò', 4, 1.2),
    spark: f('sparksock', 'bugi ren M10', 1, 2.5),
    camshaft: f('sock10', 'bu-lông M6 (đầu 10) giữ gối đỡ trục cam', 2, 1.5),
    head: f('sock13', 'bu-lông nắp máy M8 (đầu 13): nới theo đường chéo', 4, 1.5, {tighten: 'torque', cross: true}),
    cylinder: f('sock10', 'bu-lông M6 (đầu 10) chân xi-lanh', 4, 1.5, {cross: true}),
    piston: f('pliers', 'phe cài chốt pít-tông', 2, 1),
    conrod: f('sock10', 'bu-lông M6 (đầu 10) nắp đầu to thanh truyền', 2, 1.5),
    flywheel: f('spanner', 'đai ốc giữ bánh đà', 1, 2.5),
  },
  robot: {
    base_servo: f('ph1', 'vít chữ thập M3 bắt servo đế', 4, 1.2),
    turntable: f('hex4', 'vít lục giác chìm M5 bắt mâm xoay', 4, 1.2),
    shoulder_servo: f('ph1', 'vít chữ thập M3 bắt servo vai', 4, 1.2),
    lower_arm: f('hex4', 'vít lục giác chìm M5 bắt cánh tay dưới', 2, 1.2),
    elbow_servo: f('ph1', 'vít chữ thập M3 bắt servo khuỷu', 4, 1.2),
    forearm: f('hex4', 'vít lục giác chìm M5 bắt cánh tay trên', 2, 1.2),
    gripper: f('ph1', 'vít chữ thập M3 bắt tay kẹp', 2, 1.2),
    board: f('ph1', 'vít chữ thập M3 bắt bo mạch lên đế', 4, 1),
  },
  drone: {
    frame: f('hex25', 'vít lục giác chìm M3 ghép hai tấm khung', 4, 1.2),
    motors_a: f('ph1', 'vít chữ thập M3 bắt động cơ quay thuận', 4, 1.2),
    motors_b: f('ph1', 'vít chữ thập M3 bắt động cơ quay ngược', 4, 1.2),
    fc: f('hex25', 'vít lục giác M3 bắt mạch điều khiển bay (qua cột đệm)', 4, 1),
    props_a: f('spanner', 'đai ốc khoá cánh quay thuận', 2, 2),
    props_b: f('spanner', 'đai ốc khoá cánh quay ngược', 2, 2),
  },
  pc: {
    mainboard: f('ph2', 'vít M3 bắt bo mạch chủ lên chân đỡ', 6, 1.2, {cross: false}),
    cooler: f('ph2', 'vít bắt tản nhiệt lên đế CPU', 4, 1.2, {cross: true}),
    ssd: f('ph1', 'vít M2 giữ SSD M.2', 1, 1),
    gpu: f('ph2', 'vít bắt thanh chắn card đồ họa', 2, 1.2),
    psu: f('ph2', 'vít bắt bộ nguồn vào thùng', 4, 1.2, {cross: true}),
    panel: f('ph2', 'vít tai hồng giữ nắp kính', 4, 1),
  },
};

/** hộp dụng cụ của từng bài: dụng cụ cần dùng cộng vài dụng cụ không đúng cỡ để học sinh phải chọn */
export const KITS: Record<AssemblyKind, ToolId[]> = {
  motor: ['ph2', 'flat', 'sock10', 'sock13', 'pliers', 'puller', 'hex4', 'spanner'],
  engine: ['ph2', 'sock10', 'sock13', 'sparksock', 'torque', 'pliers', 'spanner', 'flat'],
  robot: ['ph1', 'ph2', 'hex25', 'hex4', 'flat', 'sock10'],
  drone: ['ph1', 'ph2', 'hex25', 'hex4', 'spanner', 'flat'],
  pc: ['ph1', 'ph2', 'flat', 'hex4', 'sock10'],
};

/** thứ tự siết / nới theo đường chéo cho n con (4 con: 1 → 3 → 2 → 4; nhiều hơn: xen kẽ hai nửa) */
export const crossOrder = (n: number): number[] => {
  if (n <= 2) return Array.from({length: n}, (_, i) => i);
  const h = Math.ceil(n / 2);
  return Array.from({length: n}, (_, i) => (i % 2 === 0 ? i / 2 : h + (i - 1) / 2));
};

export type Dir = 'loosen' | 'tighten';
/** dụng cụ cần cho thao tác này */
export const toolFor = (fa: Fastener, dir: Dir): ToolId => (dir === 'tighten' ? fa.tighten ?? fa.tool : fa.tool);

/** null nếu dùng đúng dụng cụ; ngược lại là lời nhắc nêu rõ dụng cụ đúng */
export function toolMistake(fa: Fastener, dir: Dir, held: ToolId): string | null {
  const need = toolFor(fa, dir);
  if (held === need) return null;
  const h = TOOLS[held];
  const n = TOOLS[need];
  return `${h.name} không vừa ${fa.what}: ${dir === 'loosen' ? 'tháo' : 'siết'} bằng ${n.name} (${n.use}). Dùng sai dụng cụ làm toét đầu vít.`;
}

/**
 * Con thứ `idx` của nhóm có được vặn lúc này không? `state[i]` = true khi con i đang siết chặt. Trả null nếu được, hoặc lời nhắc thứ tự đường chéo.
 */
export function orderMistake(fa: Fastener, state: readonly boolean[], idx: number, dir: Dir): string | null {
  if (!fa.cross || state.length < 3) return null;
  const order = crossOrder(state.length);
  const done = state.filter(Boolean).length;
  const want = dir === 'loosen' ? order[done - 1] : order[done];
  return idx === want ? null : `${dir === 'loosen' ? 'Nới' : 'Siết'} theo đường chéo để lực đều và gioăng kín: con kế tiếp là con số ${want + 1} (con số ${idx + 1} chưa tới lượt).`;
}

/** số con còn siết trên chi tiết, hoặc 0 nếu chi tiết không có chi tiết giữ */
export const tightCount = (state: readonly boolean[] | undefined): number => (state ? state.filter(Boolean).length : 0);

/** lời nhắc khi cố nhấc chi tiết còn được giữ; null nếu đã tự do */
export function holdingMessage(kind: AssemblyKind, id: string, state: readonly boolean[] | undefined): string | null {
  const fa = FASTENERS[kind][id];
  const n = tightCount(state);
  if (!fa || !n) return null;
  return `Còn ${n} ${fa.what} đang giữ chi tiết này: nới ra bằng ${TOOLS[fa.tool].name} trước khi nhấc.`;
}

/** trạng thái ban đầu của mọi chi tiết giữ: lắp sẵn thì siết chặt hết, còn nằm trên khay thì chưa có gì */
export function initialScrews(kind: AssemblyKind, spec: AssemblySpec): Record<string, boolean[]> {
  const out: Record<string, boolean[]> = {};
  for (const p of spec.parts) {
    const fa = FASTENERS[kind][p.id];
    if (fa) out[p.id] = Array.from({length: fa.count}, () => spec.start === 'built');
  }
  return out;
}

/** mọi chi tiết giữ của các chi tiết đã lắp đều siết đủ (điều kiện hoàn thành cùng với việc lắp đủ chi tiết) */
export const allTight = (kind: AssemblyKind, screws: Record<string, boolean[]>): boolean => Object.keys(FASTENERS[kind]).every((id) => (screws[id] ?? []).every(Boolean));

/** Khi chi tiết vừa được đặt vào chỗ: lắp kiểu ép thì các con coi như đã khoá, còn lại tất cả còn lỏng. */
export const seated = (fa: Fastener | undefined): boolean[] | undefined => (fa ? Array.from({length: fa.count}, () => !!fa.press) : undefined);

/** Vặn vít bằng cử chỉ chỉ cần vị trí 2D (webcam thường không có độ sâu nên không dùng xoay cổ tay). */
export const DWELL = 0.25; // giây giữ mũi trên đầu vít trước khi bắt đầu vặn (lướt qua không vặn nhầm)
export const HOLD_REV = 0.5; // giây cho một vòng khi chỉ giữ
export const CIRC_GAIN = 2; // một vòng tròn của tay quanh đầu vít = bấy nhiêu vòng vặn
/**
 * Số vòng vặn trong một khung hình: giữ yên đủ `DWELL` thì tự vặn (một vòng mỗi `HOLD_REV` giây), cộng thêm phần do tay vẽ vòng tròn quanh đầu vít
 * (`dAngle` = góc điểm chụm quay quanh đầu vít trong khung hình này, rad, dương = ngược chiều kim đồng hồ). Chỉ chiều đúng mới tính: nới = ngược, siết = thuận.
 */
export function driveRev(dwell: number, dt: number, dAngle: number, dir: Dir): number {
  const circ = (dir === 'loosen' ? dAngle : -dAngle) > 0 ? Math.abs(dAngle) / (2 * Math.PI) : 0;
  return (dwell >= DWELL ? dt / HOLD_REV : 0) + circ * CIRC_GAIN;
}
