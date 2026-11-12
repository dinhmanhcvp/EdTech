// Thiết kế âm thanh FlowCut: mọi chuyển động có tiếng (bút từng nét, gõ phím, khoanh, biên dịch, cửa sổ bay,
// chữ hiện, số liệu, chuyển cảnh, cắt montage, logo). Thời điểm tính theo frame tuyệt đối của video.
import {CLIPS} from '../demo2/clips';
import {segDur} from '../demo2/camera';
import type {Scene} from '../demo2/types';
import {sceneDur} from '../demo2/plan';
import {FPS, ITEMS, STARTS, startOf, type Item} from './plan';
import {montageCuts} from './Montage';
import {OPEN_DUR} from './CardCloud';
import {LOGO_LAND} from './LogoAnim';

export type Cue = {abs: number; file: string; vol: number; rate?: number};

const MARK: Record<string, [string, number][]> = {
  lasso: [['swoosh', 0.45]],
  lassoEnd: [['pop', 0.35]],
  click: [['click', 0.5]],
  'whoosh-out': [['hit', 0.3], ['swoosh', 0.45]],
  whoosh: [['swoosh', 0.4]],
  slide: [['slide', 0.35]],
  shield: [['thud', 0.8]],
  warn: [['warn', 0.45]],
  verified: [['glass', 0.4]],
  ding: [['glass', 0.45]],
  mic: [['blip', 0.5]],
  chime: [['chime', 0.6]],
};

/** Âm thanh bên trong một cảnh footage/thẻ (giây tính từ đầu cảnh). */
export const sceneCues = (sc: Scene): {t: number; file: string; vol: number; rate?: number}[] => {
  const out: {t: number; file: string; vol: number; rate?: number}[] = [];
  let base = sc.lead ?? 0;
  for (const s of sc.segs) {
    const end = s.to ?? CLIPS[s.clip].duration;
    const marks = CLIPS[s.clip].marks;
    const at = (tc: number) => base + (tc - s.from) / s.rate;
    marks.forEach((m, i) => {
      if (m.t < s.from || m.t > end) return;
      if (m.name === 'stroke') {
        // tiếng bút theo độ dài nét (tới mốc nét kế tiếp / hết viết), co theo tốc độ phát
        const next = marks.slice(i + 1).find((x) => x.name === 'stroke' || x.name === 'inkEnd');
        const d = ((next?.t ?? m.t + 0.4) - m.t) / s.rate;
        out.push({t: at(m.t), file: d < 0.2 ? 'pen1' : d < 0.38 ? 'pen2' : 'pen3', vol: 0.32, rate: Math.min(1.6, Math.max(1, 0.3 / Math.max(d, 0.12)))});
        return;
      }
      if (m.name === 'lassoEnd') {
        // gõ gợi ý ngay sau khi khoanh
        const te = marks.find((x) => x.name === 'typeEnd');
        if (te && te.t <= end) out.push({t: at(m.t) + 0.35, file: 'keys', vol: 0.32, rate: Math.min(2, s.rate / 1.5)});
      }
      if (m.name === 'compile') {
        const wo = marks.find((x) => x.name === 'whoosh-out' && x.t > m.t);
        out.push({t: Math.max(0, at(wo?.t ?? m.t + 1) - 1.5), file: 'swell', vol: 0.4}, {t: at(m.t), file: 'shimmer', vol: 0.35});
      }
      (MARK[m.name] ?? []).forEach(([file, vol]) => out.push({t: at(m.t), file, vol}));
    });
    base += segDur(s, CLIPS);
  }
  if (sc.kind === 'footage' && (sc.lead ?? 0) > 0) out.push({t: 0.45, file: 'swoosh', vol: 0.5});
  sc.side?.lines.forEach((_, i) => out.push({t: 0.2 + i * 0.22, file: 'tick', vol: 0.35}));
  sc.side?.stats?.forEach((s) => out.push({t: s.at, file: 'glass', vol: 0.3}));
  sc.side?.chips?.forEach((c) => out.push({t: c.at, file: 'pop', vol: 0.3}));
  sc.hud.forEach((h) => out.push({t: h.from, file: 'tick', vol: 0.28}));
  if (sc.id === 'brand') {
    [0.9, 1.9, 2.9].forEach((t) => out.push({t, file: 'pop', vol: 0.45}));
    [1.9, 2.9, 3.9].forEach((t) => out.push({t, file: 'whip', vol: 0.3}));
    // logo động: lasso khoanh (5,6) → nét bút (5,95) → vật rơi chạm (5,5 + LOGO_LAND)
    out.push({t: 4.3, file: 'riser', vol: 0.4}, {t: 5.6, file: 'swoosh', vol: 0.35}, {t: 5.95, file: 'pen2', vol: 0.45}, {t: 5.5 + LOGO_LAND, file: 'impact', vol: 0.6}, {t: 6.4, file: 'whip', vol: 0.3});
  }
  if (sc.id === 'ketqua') {
    out.push({t: 0.5, file: 'riser', vol: 0.25}, {t: 2.9, file: 'glass', vol: 0.45});
    [3.0, 4.2, 5.4, 6.6, 7.8].forEach((t) => out.push({t, file: 'tick', vol: 0.45}));
  }
  if (sc.id === 'pilot') {
    // cột điểm mọc lên, ba số liệu, bốn thanh phần đề, ba thẻ vận hành
    const d = sceneDur(sc);
    out.push({t: 0.3, file: 'whip', vol: 0.3}, {t: 2.2, file: 'riser', vol: 0.25}, {t: 4.2, file: 'hit', vol: 0.35});
    [4.6, 6.0, 7.2].forEach((t) => out.push({t, file: 'glass', vol: 0.3}));
    [0, 1, 2, 3].forEach((i) => out.push({t: d * 0.5 + 0.6 + i * 0.35, file: 'tick', vol: 0.4}));
    out.push({t: d * 0.5 + 0.6 + 1.85, file: 'pop', vol: 0.45});
    [0, 1, 2].forEach((i) => out.push({t: d * 0.7 + 0.6 + i * 0.6, file: 'pop', vol: 0.35}));
  }
  if (sc.id === 'closing') out.push({t: 0.2, file: 'swoosh', vol: 0.3}, {t: 0.55, file: 'pen2', vol: 0.4}, {t: 0.1 + LOGO_LAND, file: 'glass', vol: 0.45});
  return out;
};

const TRANS: Record<NonNullable<Item['tr']>, [string, number][]> = {
  whip: [['whip', 0.6]],
  through: [['swoosh', 0.5], ['hit', 0.3]],
  blur: [['swoosh', 0.35]],
};

export const allCues = (totalSec: number): Cue[] => {
  const out: Cue[] = [];
  const abs = (i: number, t: number) => STARTS[i] + Math.round(t * FPS);
  ITEMS.forEach((it, i) => {
    if (i > 0 && !it.cut) (TRANS[it.tr ?? 'blur'] ?? []).forEach(([file, vol]) => out.push({abs: STARTS[i] - 2, file, vol}));
    if (it.kind === 'scene') sceneCues(it.scene).forEach((c) => out.push({...c, abs: abs(i, c.t)}));
  });
  // mở đầu: riser kéo lên tới lúc thẻ hội tụ, va mạnh khi lao vào thẻ giữa
  const o = ITEMS.findIndex((x) => x.id === 'open');
  out.push({abs: abs(o, 0.0), file: 'swell', vol: 0.3}, {abs: abs(o, 1.9), file: 'riser', vol: 0.45}, {abs: abs(o, 4.3), file: 'swoosh', vol: 0.5}, {abs: abs(o, 6.75), file: 'riser', vol: 0.25}, {abs: abs(o, OPEN_DUR - 0.25), file: 'impact', vol: 0.55});
  // montage: mỗi vết cắt một cú hit (xen tiếng màn trập), tường thẻ + tên sản phẩm
  const m = ITEMS.findIndex((x) => x.id === 'montage');
  const ms = startOf('montage') / FPS;
  const {cuts, wallAt} = montageCuts(ms, totalSec);
  cuts.forEach((c, k) => out.push({abs: abs(m, c), file: k % 3 === 2 ? 'shutter' : 'hit', vol: k % 3 === 2 ? 0.45 : 0.4}));
  out.push({abs: abs(m, wallAt), file: 'swoosh', vol: 0.55}, {abs: abs(m, wallAt + 1.6), file: 'riser', vol: 0.3}, {abs: abs(m, wallAt + 2.0), file: 'impact', vol: 0.6});
  // kết: chữ lớn lướt vào, logo rơi xuống nền sub
  const e = ITEMS.findIndex((x) => x.id === 'end');
  out.push({abs: abs(e, 0.0), file: 'whip', vol: 0.5}, {abs: abs(e, 2.4), file: 'swell', vol: 0.3}, {abs: abs(e, 2.8), file: 'swoosh', vol: 0.35}, {abs: abs(e, 3.15), file: 'pen2', vol: 0.45}, {abs: abs(e, 2.7 + LOGO_LAND), file: 'impact', vol: 0.55}, {abs: abs(e, 2.7 + LOGO_LAND), file: 'sub', vol: 0.6}, {abs: abs(e, 3.7), file: 'whip', vol: 0.3});
  return out.filter((c) => c.abs >= 0).sort((a, b) => a.abs - b.abs);
};
