export const FPS = 30;
export const W = 1920;
export const H = 1080;

export type CamKF = {t: number; ms: number; cx: number; cy: number; s: number};
export type CalloutData = {t: number; dur: number; label: string; cx: number; cy: number; dx: number; dy: number; color: string};
export type ClipData = {
  marks: {name: string; t: number}[];
  cams: CamKF[];
  callouts?: CalloutData[];
  duration: number;
};

export type Seg = {clip: string; from: number; to?: number; rate: number};
export type Hud = {from: number; to: number; tag: string; text: string};

// Bố cục cửa sổ app theo thời gian: hero (ẩn, chờ bay vào) → split (cửa sổ nghiêng bên phải + cột chữ bên trái) → full (toàn màn hình)
export type Mode = 'hero' | 'split' | 'full';
export type LayoutKF = {t: number; mode: Mode; ms?: number};

export type SideStat = {at: number; to?: number; value: string; label: string; color: string};
export type Side = {
  kicker?: string;
  lines: string[]; // dùng *từ* để tô màu nhấn
  accent: string;
  sub?: string;
  stats?: SideStat[];
  chips?: {at: number; text: string; color: string}[];
};

export type Scene = {
  id: string;
  chapter: number | null;
  kind: 'footage' | 'brand' | 'results' | 'pilot' | 'closing';
  segs: Seg[];
  hold: number; // giữ khung cuối
  lead?: number; // thời gian chờ trước khi footage bắt đầu (cửa sổ app đang bay vào)
  minDur?: number;
  layout: LayoutKF[];
  voice: string;
  hud: Hud[];
  side?: Side;
  transition: 'fade' | 'slide-right' | 'slide-bottom' | 'wipe' | 'iris' | 'flip';
};
