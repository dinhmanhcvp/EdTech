/**
 * Số liệu thí điểm 4 tuần (2026): nguồn duy nhất cho dashboard Mode 03, slide, poster và video.
 * Dữ liệu nằm trong pilot2026.json để các script Python (slide, poster) đọc được cùng một file.
 */
import data from './pilot2026.json';

export interface MeanSd {
  mean: number;
  sd: number;
}

export interface PilotPart {
  key: string;
  label: string;
  short: string;
  control: number;
  exp: number;
  delta: number;
}

export interface PilotFeedback {
  who: string;
  meta: string;
  quote: string;
}

export interface PilotData {
  study: {
    weeks: number;
    lessons: number;
    tutorSessions: number;
    N: number;
    n1: number;
    n1Core: number;
    n1Gifted: number;
    n2: number;
    teachers: number;
    grades: string;
    topics: string[];
    assessment: string;
  };
  scores: {
    pre: { control: MeanSd; exp: MeanSd; delta: number; p: string };
    post: { control: MeanSd; exp: MeanSd; delta: number; p: string };
    growth: { control: { pts: number; pct: number }; exp: { pts: number; pct: number } };
    cohenD: number;
  };
  parts: PilotPart[];
  ops: {
    prepMin: { before: number; after: number; pct: number };
    persistence: { before: number; after: number; times: number };
    guard: { blocked: number; total: number; pct: number; bypassesWeek1: number };
    offload: { zeroToken: number; sympy: number; cache: number; llm: number; sympyMs: number; cacheMs: number };
    api: { inkMs: number; callsPerLesson: number; cropKB: number; costUsd: number; costVnd: number; reductionPct: number };
  };
  feedback: PilotFeedback[];
  iterations: { week: string; what: string; fix: string }[];
}

export const PILOT: PilotData = data as PilotData;

/** Số kiểu Việt Nam: dấu phẩy thập phân, dấu chấm hàng nghìn (7,74 · 1.420). */
export const vn = (n: number, digits = 1): string =>
  n.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
