// Launch v3: phim giới thiệu sản phẩm (< 3 phút), nhạc dẫn dắt, không thuyết minh, không số liệu kiểu "60 khung/giây".
// Trục: viết tay trên bảng → mô phỏng thật. Footage tính năng mới quay từ app (tools/clips4.mjs → clips N*).
import {FPS, SCENES, XFADE} from '../demo2/plan';
import {CLIPS} from '../demo2/clips';
import {segDur} from '../demo2/camera';
import type {Scene, Seg, Side} from '../demo2/types';
import {OPEN_DUR} from '../flow/CardCloud';
import {MONTAGE_DUR, type Shot} from '../flow/Montage';
import {END_DUR} from '../flow/EndCard';

export {FPS, XFADE};
export const BRAND_DUR = 5.6;

type Tr = 'blur' | 'whip' | 'through';
export type Item =
  | {id: 'open' | 'brand' | 'montage' | 'end'; kind: 'flow'; frames: number; music: number; cut?: boolean; tr?: Tr}
  | {id: string; kind: 'scene'; scene: Scene; index: number; frames: number; music: number; cut?: boolean; tr?: Tr; words?: [string, number, number][]};

const mk = (clip: string, name: string, nth = 0) => CLIPS[clip].marks.filter((m) => m.name === name)[nth]?.t;
const dur = (sc: Scene) => (sc.lead ?? 0) + sc.segs.reduce((n, s) => n + segDur(s, CLIPS), 0) + sc.hold;
const base = (id: string, side: Side | undefined, segs: Seg[], layout: Scene['layout'], lead: number): Scene => ({
  id: `V3-${id}`,
  chapter: null,
  kind: 'footage',
  segs,
  hold: 0.35,
  lead,
  layout,
  voice: '',
  hud: [],
  side,
  transition: 'fade',
});
const item = (sc: Scene, tr: Tr | 'cut', music = 0.78, words?: [string, number, number][]): Item => ({
  id: sc.id,
  kind: 'scene',
  scene: sc,
  index: 0,
  frames: Math.round(dur(sc) * FPS),
  music,
  cut: tr === 'cut',
  tr: tr === 'cut' ? undefined : tr,
  words,
});

/** Cảnh tính năng mới, đầy đủ: viết tay (tua nhanh) → khoanh → gõ gợi ý → mô phỏng chạy thật. */
const fullFeature = (key: string, side: Side, simSec = 5.5): Scene => {
  const c = `N${key}`;
  const ink = mk(c, 'inkEnd') ?? 2;
  const type = mk(c, 'typeEnd') ?? ink + 3;
  const wo = mk(c, 'whoosh-out') ?? type + 1;
  const end = Math.min(CLIPS[c].duration - 0.2, wo + simSec * 1.3);
  return base(key, side, [
    {clip: c, from: 0.2, to: ink, rate: 2.6},
    {clip: c, from: ink, to: type, rate: 3.6},
    {clip: c, from: type, to: wo, rate: 1.6},
    {clip: c, from: wo, to: end, rate: 1.3},
  ], [{t: 0, mode: 'hero'}, {t: 0.5, mode: 'split', ms: 900}], 1.0);
};

/** Cảnh tính năng nhanh: chỉ phần mô phỏng (đã quen nhịp viết → mô phỏng ở các cảnh trước). */
const quickFeature = (key: string, side: Side, simSec = 4.3): Scene => {
  const c = `N${key}`;
  const wo = mk(c, 'whoosh-out') ?? 5;
  const end = Math.min(CLIPS[c].duration - 0.2, wo + 1.2 + simSec * 1.35);
  return base(key, side, [{clip: c, from: wo + 1.0, to: end, rate: 1.35}], [{t: 0, mode: 'split'}], 0);
};

/** Cảnh footage cũ (gia sư, chốt chặn, lớp học) bỏ lời, bỏ số liệu, chữ mới. */
const legacy = (id: string, side: Side, from?: number, to?: number, rate = 1.7): Scene => {
  const src = SCENES.find((s) => s.id === id)!;
  const clip = src.segs[src.segs.length - 1].clip;
  return base(`L-${id}`, {...side, stats: [], chips: side.chips ?? []}, [{clip, from: from ?? src.segs[0].from, to, rate}], [{t: 0, mode: 'hero'}, {t: 0.5, mode: 'split', ms: 900}], 1.0);
};

/** Hologram: đoạn kéo mô phỏng đi trên mặt bảng (mốc 'slide' cuối) rồi phóng to. */
const holo = (): Scene => {
  const c = 'Nholo';
  const drag = [...CLIPS[c].marks].reverse().find((m) => m.name === 'slide')?.t ?? CLIPS[c].duration - 6;
  return base('holo', S('Hologram', 'Nổi trên', '*mặt bảng.*', 'Kéo, phóng to, viết tiếp ngay bên cạnh.', '#7FA6FF'), [{clip: c, from: drag - 0.8, to: CLIPS[c].duration - 0.2, rate: 1.15}], [{t: 0, mode: 'split'}], 0);
};

const coldSrc = SCENES.find((s) => s.id === 'cold')!;
const cold = base('cold', undefined, coldSrc.segs, [{t: 0, mode: 'full'}], 0);
const S = (kicker: string, a: string, b: string, sub: string, accent: string): Side => ({kicker, lines: [a, b], accent, sub});

export const ITEMS: Item[] = [
  {id: 'open', kind: 'flow', frames: Math.round(OPEN_DUR * FPS), music: 0.9},
  item(cold, 'cut', 0.8),
  {id: 'brand', kind: 'flow', frames: Math.round(BRAND_DUR * FPS), music: 0.92, tr: 'through'},
  item(fullFeature('conv', S('Viết như mọi ngày', 'Chữ tay thành', '*công thức.*', 'Nhận dạng ngay trên bảng, rồi vẽ đồ thị.', '#7FA6FF'), 6.5), 'through'),
  item(fullFeature('oxyz', S('Toán · Hình không gian', 'Không gian', '*Oxyz.*', 'Mặt cầu cắt mặt phẳng, xoay bằng tay.', '#7FA6FF')), 'whip'),
  item(quickFeature('revolve', S('Toán · Tích phân', 'Khối', '*tròn xoay.*', 'Từng lát cắt ghép thành thể tích.', '#7FA6FF')), 'whip'),
  item(quickFeature('lattice', S('Hóa · Tinh thể', 'Ô mạng', '*tinh thể.*', 'Lập phương đơn giản, tâm khối, tâm diện.', '#F5A524')), 'whip'),
  item(quickFeature('sn2', S('Hóa · Cơ chế', 'Phản ứng', '*SN2.*', 'Nghịch đảo Walden diễn ra trước mắt.', '#F5A524')), 'whip'),
  item(quickFeature('cyclo', S('Hóa hữu cơ', 'Cấu dạng', '*ghế.*', 'Cyclohexane lật vòng trong không gian.', '#F5A524')), 'whip'),
  item(quickFeature('etc', S('Sinh · Tế bào', 'Bên trong', '*ti thể.*', 'Chuỗi truyền electron và ATP synthase.', '#34D399')), 'whip'),
  item(quickFeature('lotka', S('Sinh · Sinh thái', 'Thỏ và', '*sói.*', 'Hai quần thể dao động theo nhau.', '#34D399')), 'whip'),
  item(quickFeature('pendulum', S('Vật lý · Chuyên', 'Con lắc', '*kép.*', 'Lệch một chút, quỹ đạo khác hẳn.', '#FB7185')), 'whip'),
  item(holo(), 'through'),
  item(legacy('gia', {kicker: 'Gia sư Socratic', lines: ['Gợi mở.', '*Không giải hộ.*'], accent: '#FB7185', sub: 'Khóa bước sau, chỉ ra vì sao lời giải sai.'}, 8.5, 27, 1.75), 'through'),
  item(legacy('chot', {kicker: 'Chốt chặn bản chất', lines: ['Hiểu rồi', '*mới qua.*'], accent: '#F5A524', sub: 'Tự giải thích, hoặc săn bẫy Đúng / Sai.'}, 2, 24, 2.0), 'whip'),
  item(legacy('hoi5', {kicker: 'Cả lớp', lines: ['Một chạm,', '*cả lớp.*'], accent: '#22D3EE', sub: 'Vở ghi QR về điện thoại, điểm nghẽn về bảng.'}, undefined, undefined, 1.6), 'blur'),
  {id: 'montage', kind: 'flow', frames: Math.round(MONTAGE_DUR * FPS), music: 0.95, tr: 'blur'},
  {id: 'end', kind: 'flow', frames: Math.round(END_DUR * FPS), music: 0.95, tr: 'blur'},
];

/** Montage: mỗi phách một khoảnh khắc mô phỏng của tính năng mới (tâm = camera đã ghi khi quay, phóng thêm). */
export const SHOTS3: Shot[] = (['conv', 'oxyz', 'revolve', 'lattice', 'sn2', 'cyclo', 'etc', 'lotka', 'pendulum'] as const).map((k) => {
  const c = `N${k}`;
  const cam = [...CLIPS[c].cams].reverse().find((x) => x.s > 1.2) ?? {cx: 0.65, cy: 0.45, s: 1.4};
  const tag: Record<string, string> = {conv: 'Chữ tay → công thức', oxyz: 'Không gian Oxyz', revolve: 'Khối tròn xoay', lattice: 'Ô mạng tinh thể', sn2: 'Cơ chế SN2', cyclo: 'Cấu dạng ghế', etc: 'Chuỗi truyền electron', lotka: 'Thỏ và sói', pendulum: 'Con lắc kép'};
  return {clip: c, t: Math.min(CLIPS[c].duration - 1.5, (mk(c, 'whoosh-out') ?? 6) + 3.0), cx: cam.cx, cy: cam.cy, s: Math.min(1.9, cam.s * 1.15), tag: tag[k]};
});

export const overlap = (i: number) => (i > 0 && !ITEMS[i].cut ? XFADE : 0);
export const STARTS = (() => {
  const out: number[] = [];
  let acc = 0;
  ITEMS.forEach((it, i) => {
    acc -= overlap(i);
    out.push(acc);
    acc += it.frames;
  });
  return out;
})();
export const TOTAL_FRAMES = STARTS[STARTS.length - 1] + ITEMS[ITEMS.length - 1].frames;
export const startOf = (id: string) => STARTS[ITEMS.findIndex((it) => it.id === id)];
