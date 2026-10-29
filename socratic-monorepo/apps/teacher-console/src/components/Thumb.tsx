import React from 'react';
import type {InkStroke} from '../lib/types';

// Không gian bài nộp của học sinh: 1200×675 (cùng hệ với bảng chiếu)
const W = 1200;
const H = 675;

/** Hình thu nhỏ của một bài làm vẽ tay. */
export function Thumb({strokes, width = 176, label}: {strokes: InkStroke[]; width?: number; label: string}) {
  const h = Math.round((width * H) / W);
  const pts = (s: InkStroke) => s.p.map(([x, y]) => `${Math.round(((x * width) / W) * 10) / 10},${Math.round(((y * h) / H) * 10) / 10}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${h}`} width="100%" role="img" aria-label={label} className="rounded bg-[#FCFBF9]">
      {strokes.map((s, i) => (
        <polyline key={i} points={pts(s)} fill="none" stroke={s.c} strokeWidth={Math.max(1, s.w * 0.5)} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
