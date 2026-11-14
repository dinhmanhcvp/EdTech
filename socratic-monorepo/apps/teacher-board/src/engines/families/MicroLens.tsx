'use client';

import React, {useEffect, useRef, useState} from 'react';
import type {MicroView} from '../../utils/lab/hands/sims/micro';
import {StageShift} from './Stage3D';

interface Atom {
  g: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
}
const R = 96; // bán kính kính (px)

/**
 * Cửa sổ vi mô: vòng kính phóng to hạt (học từ "View microscopic" của phòng thí nghiệm ảo và `lensFrame` của hệ thống).
 * Hạt chuyển động nhiệt hỗn loạn trong vòng tròn; số hạt mỗi loại bám theo `view` (thêm hoặc bớt dần, mỗi khung một hạt).
 */
export const MicroLens: React.FC<{view: MicroView}> = ({view}) => {
  const cv = useRef<HTMLCanvasElement>(null);
  const live = useRef(view);
  live.current = view;
  const shift = React.useContext(StageShift);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const c = cv.current;
    if (!c || !open) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = 2 * R * dpr;
    ctx.scale(dpr, dpr);
    const atoms: Atom[] = [];
    let raf = 0;
    let last = performance.now();
    const spawn = (g: string, still?: boolean): Atom => {
      const r = Math.sqrt(Math.random()) * (still ? 30 : R - 16);
      const t = Math.random() * 2 * Math.PI;
      return {g, x: r * Math.cos(t), y: r * Math.sin(t), vx: 0, vy: 0, a: Math.random() * 6.28};
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const v = live.current;
      // số hạt từng nhóm tiến dần tới đích
      for (const grp of v.groups) {
        const have = atoms.filter((a) => a.g === grp.id);
        if (have.length < grp.n) atoms.push(spawn(grp.id, grp.still));
        else if (have.length > grp.n) atoms.splice(atoms.indexOf(have[Math.floor(Math.random() * have.length)]), 1);
      }
      for (let i = atoms.length - 1; i >= 0; i--) if (!v.groups.some((g) => g.id === atoms[i].g)) atoms.splice(i, 1);

      ctx.clearRect(0, 0, 2 * R, 2 * R);
      ctx.save();
      ctx.translate(R, R);
      for (const a of atoms) {
        const grp = v.groups.find((g) => g.id === a.g)!;
        if (grp.still) {
          // đám ngưng tụ: dao động rất nhẹ quanh tâm bẫy, hút dần vào giữa
          a.vx += (-a.x * 4 - a.vx * 3) * dt + (Math.random() - 0.5) * 6 * dt;
          a.vy += (-a.y * 4 - a.vy * 3) * dt + (Math.random() - 0.5) * 6 * dt;
        } else {
          const sp = 40 + 110 * v.heat;
          a.vx += (Math.random() - 0.5) * sp * 6 * dt;
          a.vy += (Math.random() - 0.5) * sp * 6 * dt;
          const m = Math.hypot(a.vx, a.vy) || 1;
          const k = Math.min(1, sp / m);
          a.vx *= k > 1 ? 1 : 0.5 + 0.5 * k;
          a.vy *= k > 1 ? 1 : 0.5 + 0.5 * k;
        }
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        const d = Math.hypot(a.x, a.y);
        if (d > R - 12) {
          // phản xạ ở thành kính
          const nx = a.x / d;
          const ny = a.y / d;
          const dot = a.vx * nx + a.vy * ny;
          if (dot > 0) {
            a.vx -= 2 * dot * nx;
            a.vy -= 2 * dot * ny;
          }
          a.x = nx * (R - 12);
          a.y = ny * (R - 12);
        }
        a.a += dt * (grp.bond ? 2 : 0);
        ctx.fillStyle = grp.color;
        const atom = (x: number, y: number, r: number) => {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.45)'; // điểm sáng cho có khối
          ctx.beginPath();
          ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = grp.color;
        };
        if (grp.bond) {
          const dx = Math.cos(a.a) * 6;
          const dy = Math.sin(a.a) * 6;
          ctx.strokeStyle = 'rgba(232,230,245,.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.x - dx, a.y - dy);
          ctx.lineTo(a.x + dx, a.y + dy);
          ctx.stroke();
          atom(a.x - dx, a.y - dy, 6);
          atom(a.x + dx, a.y + dy, 6);
        } else atom(a.x, a.y, grp.still ? 5 : 6);
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    // sát mép phải khi bảng điều khiển thu gọn, lùi sang trái bảng khi bảng mở; thu nhỏ để không che dụng cụ
    <div data-testid="micro-lens" style={{right: shift ? 372 : 16}} className="absolute bottom-6 z-10 flex w-[216px] origin-bottom-right scale-[.8] flex-col items-center gap-1.5 text-[11px] text-[#E8E6F5]">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-[44px] rounded-full border border-white/25 bg-[#11143A]/85 px-4 font-medium backdrop-blur hover:bg-white/15">
        <i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#FFB35C] align-middle" />
        Kính hiển vi · {view.title}
      </button>
      {open && (
        <>
          <div className="relative rounded-full p-1" style={{width: 2 * R + 8, height: 2 * R + 8, background: 'linear-gradient(135deg,rgba(255,255,255,.55),rgba(255,255,255,.12))', boxShadow: '0 10px 28px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.4)'}}>
            <canvas ref={cv} data-testid="micro-canvas" style={{width: 2 * R, height: 2 * R, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #1B1F5C 0%, #0B0E2A 70%)'}} />
            <span className="pointer-events-none absolute left-5 top-4 h-8 w-14 rotate-[-30deg] rounded-full bg-white/15 blur-md" />
          </div>
          <ul className="flex flex-wrap justify-center gap-1">
            {view.groups.map((g) => (
              <li key={g.id} data-testid={`micro-count-${g.id}`} className="rounded-full border border-white/20 bg-[#11143A]/85 px-2.5 py-1 tabular-nums backdrop-blur">
                <i className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{background: g.color}} />
                {g.label} <b className="ml-0.5 font-mono text-[#FBF9F4]">{g.n}</b>
              </li>
            ))}
          </ul>
          <p className="rounded-xl bg-[#11143A]/80 px-2.5 py-1.5 text-center leading-snug text-[#E8E6F5]/80 backdrop-blur">{view.note}</p>
          <p className="text-center text-[10px] text-[#E8E6F5]/55">Hình minh họa tỉ lệ số lượng, không đúng kích thước thật</p>
        </>
      )}
    </div>
  );
};
