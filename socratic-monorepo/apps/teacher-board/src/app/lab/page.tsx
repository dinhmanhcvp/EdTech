'use client';

import React, {useEffect, useState} from 'react';
import {HandsLab} from '../../engines/families/HandsLab';
import {fold} from '../../utils/presets';
import {SUBJECTS, type SubjectId} from '../../utils/lab/hands/sims/catalog';
import {KINDS, LAB_ALIAS, LESSONS, LESSON_BY_ID} from '../../engines/families/labLessons';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B544]';

/** Phòng thực hành ảo: trang riêng, tách khỏi bảng viết. Mọi bài là phòng 3D điều khiển bằng tay phủ kín màn hình. Bảng chọn bài: tab theo môn, ô tìm, hai nhóm bài; `/lab?bai=<mã>` mở thẳng một bài. */
export default function LabPage() {
  const [exp, setExp] = useState<string>('three-phase');
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<SubjectId>('kt');
  const [q, setQ] = useState('');
  // đọc ?bai sau khi gắn: tránh lệch HTML giữa máy chủ và trình duyệt
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('bai') ?? '';
    const id = LAB_ALIAS[raw] ?? raw;
    if (LESSON_BY_ID.has(id)) setExp(id);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const cur = LESSON_BY_ID.get(exp)!;
  const color = (s: SubjectId) => SUBJECTS.find((x) => x.id === s)!.color;
  const toggle = () => {
    // mở ra luôn ở môn của bài đang làm
    if (!open) {
      setSubject(cur.subject);
      setQ('');
    }
    setOpen(!open);
  };
  const pick = (id: string) => {
    setExp(id);
    setOpen(false);
    // tải lại trang vẫn ở đúng bài
    window.history.replaceState(null, '', `/lab?bai=${encodeURIComponent(id)}`);
  };
  const needle = fold(q.trim());
  const shown = LESSONS.filter((l) => l.subject === subject && (!needle || fold(l.name).includes(needle)));

  return (
    <main className="fixed inset-0 bg-[#0E1030]">
      <HandsLab key={exp} experiment={exp} />

      {open && <button type="button" aria-label="Đóng danh sách bài" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-20 cursor-default bg-[#0E1030]/50" />}
      <nav className="fixed left-4 top-4 z-20 pointer-events-none flex max-h-[calc(100vh-2rem)] w-[min(600px,calc(100vw-2rem))] flex-col items-start gap-2 [&>*]:pointer-events-auto" aria-label="Chọn bài thực hành">
        <button type="button" data-testid="lab-menu" aria-expanded={open} aria-controls="lab-picker" onClick={toggle} className={`flex min-h-[48px] max-w-full items-center gap-2.5 rounded-full border border-white bg-white py-1 pl-4 pr-3 text-left text-[#0E1030] shadow-lg hover:bg-[#F3EFE6] ${FOCUS}`}>
          <i className="h-3 w-3 shrink-0 rounded-full" style={{background: color(cur.subject)}} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0E1030]/60">{SUBJECTS.find((s) => s.id === cur.subject)!.label}</span>
            <span className="truncate text-sm font-semibold">{cur.name}</span>
          </span>
          <span className="shrink-0 rounded-full bg-[#0E1030] px-3 py-1.5 text-xs font-medium text-white">{open ? 'Đóng ✕' : 'Đổi bài ▾'}</span>
        </button>

        {open && (
          <div id="lab-picker" data-testid="lab-picker" className="flex min-h-0 w-full flex-col gap-3 rounded-3xl border border-white/15 bg-[#11143A]/95 p-3 shadow-2xl backdrop-blur">
            <div role="tablist" aria-label="Môn học" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[.07] p-1 sm:grid-cols-4">
              {SUBJECTS.map((s) => (
                <button key={s.id} type="button" role="tab" data-testid={`lab-subject-${s.id}`} aria-selected={subject === s.id} onClick={() => setSubject(s.id)} className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-2 text-[13px] font-semibold transition ${FOCUS} ${subject === s.id ? 'bg-white text-[#0E1030] shadow' : 'text-[#E8E6F5] hover:bg-white/10'}`}>
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/40" style={{background: s.color}} />
                  <span className="truncate" title={s.label}>{s.label.split(' – ')[0]}</span>
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${subject === s.id ? 'bg-[#0E1030]/10' : 'bg-white/15'}`}>{LESSONS.filter((l) => l.subject === s.id).length}</span>
                </button>
              ))}
            </div>
            <input type="search" data-testid="lab-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài trong môn này…" aria-label="Tìm bài trong môn này" className={`min-h-[44px] w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white placeholder:text-[#E8E6F5]/60 ${FOCUS}`} />
            <div role="tabpanel" className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              {KINDS.map(([kind, title]) => {
                const items = shown.filter((l) => l.kind === kind);
                if (!items.length) return null;
                return (
                  <section key={kind} data-testid={`lab-group-${kind}`}>
                    <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#E8E6F5]/70">
                      {title} · {items.length} bài
                    </h2>
                    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {items.map((l) => (
                        <li key={l.id}>
                          <button type="button" data-testid={`lab-tab-${l.id}`} aria-current={exp === l.id ? 'true' : undefined} onClick={() => pick(l.id)} className={`flex min-h-[48px] w-full items-center rounded-xl border px-3 py-2 text-left text-[13px] leading-snug transition ${FOCUS} ${exp === l.id ? 'border-white bg-white font-semibold text-[#0E1030]' : 'border-white/15 bg-white/[.06] text-[#E8E6F5] hover:border-white/40 hover:bg-white/15'}`}>
                            {l.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {!shown.length && <p data-testid="lab-empty" className="px-1 py-4 text-sm text-[#E8E6F5]/80">Không có bài nào khớp “{q}” trong môn này. Thử từ khác hoặc đổi môn.</p>}
            </div>
          </div>
        )}
      </nav>
    </main>
  );
}
