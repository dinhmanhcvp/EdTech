'use client';

import React, {useState} from 'react';
import {ALL_EXPERIMENTS, HandsLab, type Experiment} from '../../engines/families/HandsLab';
import {SUBJECTS, SUBJECT_OF} from '../../utils/lab/hands/sims/catalog';

const TAB = (on: boolean) => `min-h-[44px] rounded-full border px-4 text-xs font-medium backdrop-blur ${on ? 'border-white bg-white text-[#0E1030]' : 'border-white/25 bg-[#0E1030]/60 text-[#E8E6F5] hover:bg-white/15'}`;

/** Phòng thực hành ảo điều khiển bằng tay: trang riêng, tách khỏi bảng viết. Cảnh 3D phủ kín màn hình; danh sách bài thu gọn thành một nút và chia theo môn, mỗi môn một chấm màu. */
export default function LabPage() {
  const [exp, setExp] = useState<Experiment>('three-phase');
  const [open, setOpen] = useState(false);
  const label = ALL_EXPERIMENTS.find(([id]) => id === exp)?.[1];
  const dot = SUBJECTS.find((s) => s.id === SUBJECT_OF[exp])?.color ?? '#E8E6F5';
  return (
    <main className="fixed inset-0 bg-[#0E1030]">
      <HandsLab key={exp} experiment={exp} />
      <nav className="fixed left-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-400px)] flex-col items-start gap-2 overflow-y-auto" aria-label="Chọn bài thực hành">
        <button type="button" data-testid="lab-menu" aria-expanded={open} onClick={() => setOpen(!open)} className={TAB(true)}>
          <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{background: dot}} />
          {open ? 'Đóng danh sách bài' : `Bài: ${label} ▾`}
        </button>
        {open &&
          SUBJECTS.map((s) => (
            <section key={s.id} data-testid={`lab-subject-${s.id}`} className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-[#11143A]/80 p-2 backdrop-blur">
              <h2 className="mr-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#E8E6F5]/80">
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{background: s.color}} />
                {s.label}
              </h2>
              {ALL_EXPERIMENTS.filter(([id]) => SUBJECT_OF[id] === s.id).map(([id, name]) => (
                <button key={id} type="button" data-testid={`lab-tab-${id}`} aria-pressed={exp === id} onClick={() => { setExp(id as Experiment); setOpen(false); }} className={TAB(exp === id)}>
                  {name}
                </button>
              ))}
            </section>
          ))}
      </nav>
    </main>
  );
}
