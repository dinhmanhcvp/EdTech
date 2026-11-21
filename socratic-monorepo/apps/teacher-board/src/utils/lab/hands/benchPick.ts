/**
 * CHỌN phương án bằng cách CẦM VẬT THẬT (thay cho vòng vàng "chạm để đổi"): mỗi phương án của một lựa chọn là một vật trên khay ở mép bàn
 * (lọ thuốc thử, tiêu bản, điện trở, cuộn dây, lò xo, tấm bề mặt, âm thoa, thẻ…); học sinh chụm cầm một vật rồi đặt vào chỗ dùng (vòng vàng ở dụng cụ).
 * Vật được đặt là phương án đang chọn, vật trước đó tự về khay. Lựa chọn kiểu "có / không" ("Chưa / Rồi", "Không thêm / Thêm…") chỉ có MỘT vật:
 * đặt vào là "có", nhấc ra / để trên khay là "không". Chỉ dùng cử chỉ 2D của webcam thường (chụm, kéo, buông).
 */
export type PickProp = 'bottle' | 'slide' | 'resistor' | 'coil' | 'spring' | 'plate' | 'card' | 'fork' | 'jar' | 'ruler' | 'caliper' | 'objective' | 'paper' | 'pot' | 'frog' | 'butterfly' | 'grasshopper' | 'foil';

/** vật dùng cho từng lựa chọn (mã bài → khoá lựa chọn); lựa chọn không có ở đây dùng thẻ đứng có nhãn */
export const PICK_PROP: Record<string, Record<string, PickProp | PickProp[]>> = {
  ERROR_MEASURE: {inst: ['ruler', 'caliper']},
  COLLISION_MOMENTUM: {type: ['spring', 'plate']},
  SOUND_FREQUENCY: {fork: 'fork'},
  FRICTION: {surf: 'plate'},
  HOOKE: {spring: 'spring'},
  OHM_LAW: {res: 'resistor'},
  CAPACITOR_RC: {R: 'resistor'},
  EM_INDUCTION: {N: 'coil'},
  TRANSFORMER: {ratio: 'coil'},
  SAFETY: {r1: 'paper', r2: 'paper', r3: 'paper'},
  BIOMOLECULES: {sample: 'bottle', reagent: 'bottle'},
  CELL_OBSERVE: {sample: 'slide', obj: 'objective'},
  PLASMOLYSIS: {sol: 'bottle'},
  ENZYME: {inh: 'bottle'},
  MITOSIS_SLIDE: {sample: 'slide', stain: 'bottle'},
  YOGURT: {st: 'jar'},
  VIRUS_SURVEY: {d: 'paper'},
  TRANSPIRATION: {c: 'pot'},
  PIGMENT: {b: 'paper'},
  LEAF_STARCH: {dark: 'pot', leaf: ['pot', 'foil']},
  SEED_RESPIRATION: {g: 'jar'},
  TROPISM: {ty: 'pot', grp: 'pot'},
  APICAL_DOMINANCE: {cut: 'pot'},
  METAMORPHOSIS: {sp: ['frog', 'butterfly', 'grasshopper']},
  PROPAGATION: {m: 'pot', tr: 'pot'},
  DNA_EXTRACT: {eth: 'bottle', filter: 'paper'},
  CHROMOSOME_MUTATION: {sl: 'slide'},
  MODIFICATION: {g: 'pot'},
  QUADRAT: {site: 'paper'},
  COMMUNITY: {site: 'paper'},
};
/** cờ "Chưa / Rồi" do chính bước chuẩn bị đặt: làm xong bước `n` (đếm từ 0) thì cờ tự thành "Rồi" và không còn vật để đặt */
export const AUTO_FLAG: Record<string, Record<string, number>> = {
  DNA_EXTRACT: {grind: 0, lysis: 1},
  MITOSIS_SLIDE: {stain: 0},
};
export function pickProp(expId: string, key: string, opt = 0): PickProp {
  const v = PICK_PROP[expId]?.[key];
  return Array.isArray(v) ? v[Math.min(opt, v.length - 1)] : v ?? 'card';
}

/** lựa chọn kiểu có / không: hai phương án mà phương án đầu là "chưa làm / không thêm" */
export const isToggle = (labels: string[]): boolean => labels.length === 2 && /^(chưa|không thêm)/i.test(labels[0]);

/** bảng màu của các phương án (tô lên vật liệu `tint` của vật): cam, tím, lục, lam, đỏ, lơ */
export const TINTS = ['#E8A03A', '#7A3FB0', '#3F8F3A', '#2B6BD6', '#C4261A', '#17A2B8', '#8A6A3A'];
/** màu riêng cho các phương án có nghĩa màu sắc rõ (mẫu thử, tấm bề mặt…); không khớp thì lấy theo thứ tự */
export function tintOf(label: string, index: number): string {
  const l = label.toLowerCase();
  const by: [RegExp, string][] = [
    [/iodine|lugol/, '#8A4A12'], [/benedict/, '#2B6BD6'], [/biuret/, '#7A3FB0'], [/sudan/, '#C4261A'],
    [/nước cất|đối chứng/, '#CFE6F5'], [/nho/, '#7A2E6B'], [/khoai/, '#E8D9A8'], [/trứng/, '#F2EBD0'], [/dầu/, '#E3B341'],
    [/nacl/, '#DDE6EE'], [/cuso/, '#2B8AD6'], [/gỗ/, '#9A6B3A'], [/kính/, '#BFE3F2'], [/cao su/, '#2B2F3A'],
    [/cồn.*lạnh|để lạnh/, '#9ED0F0'], [/cồn/, '#E6F0F5'], [/orcein|nhuộm/, '#C0392B'],
  ];
  return by.find(([re]) => re.test(l))?.[1] ?? TINTS[index % TINTS.length];
}

/**
 * Xếp các vật của mọi lựa chọn thành một hàng trên khay: `groups[i]` = số vật của lựa chọn i. Trả về x (hệ bộ dụng cụ) của từng vật theo nhóm;
 * các nhóm cách nhau `gap`, vật cách nhau `step` (co lại cho vừa `width` nếu quá chật), cả hàng căn giữa.
 */
export function trayLayout(groups: number[], width = 5.6, gap = 0.4, maxStep = 0.7): number[][] {
  const items = groups.reduce((a, b) => a + b, 0);
  const G = groups.filter((g) => g > 0).length;
  if (!items) return groups.map(() => []);
  // bề rộng cả hàng = (số vật − 1) bước + (số nhóm − 1) khe; khe là khoảng cách THÊM giữa hai nhóm
  const step = items > 1 ? Math.min(maxStep, (width - (G - 1) * gap) / (items - 1)) : maxStep;
  let x = -((items - 1) * step + (G - 1) * gap) / 2;
  return groups.map((g) => {
    const row = Array.from({length: g}, (_, i) => x + i * step);
    if (g) x += g * step + gap;
    return row;
  });
}
