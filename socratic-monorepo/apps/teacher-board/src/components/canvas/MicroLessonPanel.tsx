'use client';

import React, {useMemo, useState} from 'react';
import {BookOpen, Copy, Download, Sparkles, X} from 'lucide-react';
import type {BoardJournalData} from '../../utils/vectorJournal';
import {buildMicroLesson, fmtClock, lessonMindMap, lessonToMarkdown, type LessonNotes, type MomentKind} from '../../utils/microLesson';
import {askLessonNotes} from '../../utils/lessonNotes';
import {MathView} from '../common/MathView';
import {MathText} from '../ui/MathText';

interface Props {
  /** lấy nhật ký tiết học hiện tại (cùng nguồn với thanh tua lại) */
  getJournal: () => BoardJournalData;
  /** thay được khi kiểm thử */
  askFn?: typeof askLessonNotes;
}

const ICON: Record<MomentKind, string> = {formula: 'ƒ', plane: '△', solid: '⬡', sim: '▶'};
const COLOR: Record<MomentKind, string> = {formula: '#2563EB', plane: '#059669', solid: '#7C3AED', sim: '#D97706'};

/**
 * Vi bài giảng: dàn bài có mốc giờ + sơ đồ tư duy dựng từ những gì đã hiện trên bảng trong tiết học,
 * tải về Markdown để gửi học sinh. Dàn bài và sơ đồ chỉ liệt kê đúng những gì có thật trong nhật ký; lời giảng chỉ có khi người dùng
 * bấm "AI viết lời giảng" (AI diễn đạt lại dàn bài, không có AI thì không bịa).
 */
export const MicroLessonPanel: React.FC<Props> = ({getJournal, askFn = askLessonNotes}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'outline' | 'map'>('outline');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [notes, setNotes] = useState<LessonNotes | null>(null);
  const [ai, setAi] = useState<{state: 'idle' | 'loading' | 'error'; msg?: string; source?: string}>({state: 'idle'});

  // lấy bản ghi mới mỗi lần mở (bảng vẫn đang ghi tiếp)
  const lesson = useMemo(() => (open ? buildMicroLesson(getJournal()) : null), [open, getJournal]);
  const map = useMemo(() => (lesson ? lessonMindMap({...lesson, title: title.trim() || lesson.title}) : null), [lesson, title]);

  if (!open) {
    return (
      <button
        data-testid="micro-lesson-open"
        onClick={() => {
          setTitle('');
          setNote(null);
          setNotes(null);
          setAi({state: 'idle'});
          setOpen(true);
        }}
        title="Tóm tắt tiết học thành vi bài giảng"
        className="absolute left-3 bottom-14 z-30 pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Vi bài giảng
      </button>
    );
  }

  const finalTitle = lesson ? title.trim() || lesson.title : '';
  const markdown = lesson ? lessonToMarkdown({...lesson, title: finalTitle}, notes) : '';

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], {type: 'text/markdown;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vi-bai-giang-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const writeNotes = async () => {
    if (!lesson) return;
    setAi({state: 'loading'});
    try {
      const r = await askFn({...lesson, title: finalTitle});
      if (!r.notes) setAi({state: 'error', msg: `${r.note ?? 'AI không trả được lời giảng.'} Dàn bài vẫn dùng được.`});
      else {
        setNotes(r.notes);
        setAi({state: 'idle', source: r.source});
      }
    } catch (e) {
      setAi({state: 'error', msg: e instanceof Error ? e.message : 'Không gọi được AI.'});
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setNote('Đã sao chép Markdown.');
    } catch {
      setNote('Trình duyệt không cho sao chép; hãy dùng nút Tải về.');
    }
  };

  return (
    <div data-testid="micro-lesson" className="absolute inset-0 z-40 pointer-events-auto flex items-center justify-center bg-stone-900/30 p-4">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <input
            data-testid="micro-lesson-title"
            value={title}
            placeholder={lesson?.title ?? 'Vi bài giảng'}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-blue-400"
            aria-label="Tên bài giảng"
          />
          <button data-testid="micro-lesson-close" onClick={() => setOpen(false)} className="rounded-full p-1 text-stone-500 hover:bg-stone-100" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!lesson ? (
          <p data-testid="micro-lesson-empty" className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-600">
            Bảng chưa có công thức, hình hay mô phỏng nào để tóm tắt. Hãy viết công thức, vẽ hình hoặc mở một mô phỏng rồi quay lại.
          </p>
        ) : (
          <>
            <div data-testid="micro-lesson-stats" className="flex flex-wrap gap-1.5 text-[11px] text-stone-600">
              {[`${fmtClock(lesson.durationMs)} phút`, `${lesson.stats.formulas} công thức`, `${lesson.stats.figures} hình`, `${lesson.stats.sims} mô phỏng`].map((t) => (
                <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
            {notes?.summary && (
              <p data-testid="micro-lesson-summary" className="rounded-lg bg-blue-50 px-3 py-2 text-[13px] text-stone-800">
                <MathText text={notes.summary} />
              </p>
            )}
            <div className="flex gap-1.5" role="tablist">
              {(['outline', 'map'] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  data-testid={`micro-lesson-tab-${k}`}
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  {k === 'outline' ? 'Dàn bài' : 'Sơ đồ tư duy'}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              {tab === 'outline' ? (
                <ol data-testid="micro-lesson-outline" className="flex flex-col gap-3">
                  {lesson.sections.map((s, i) => (
                    <li key={`${s.start}-${i}`} data-testid="micro-lesson-section">
                      <div className="text-sm font-semibold text-stone-900">
                        {i + 1}. {s.title} <span className="font-mono text-[11px] font-normal text-stone-500">{fmtClock(s.start)}</span>
                      </div>
                      {notes?.narrations[i] && (
                        <p data-testid="micro-lesson-narration" className="mt-0.5 text-[13px] leading-snug text-stone-700">
                          <MathText text={notes.narrations[i]} />
                        </p>
                      )}
                      <ul className="mt-1 flex flex-col gap-1 pl-4">
                        {s.moments.map((m, k) => (
                          <li key={k} data-testid="micro-lesson-moment" data-kind={m.kind} className="text-[13px] text-stone-700">
                            <span style={{color: COLOR[m.kind]}} className="mr-1 font-bold">
                              {ICON[m.kind]}
                            </span>
                            {m.label}
                            <span className="ml-1.5 font-mono text-[10px] text-stone-400">{fmtClock(m.t)}</span>
                            {m.kind === 'formula' && m.detail ? (
                              <div className="pl-5">
                                <MathView latex={m.detail} />
                              </div>
                            ) : m.detail ? (
                              <div className="pl-5 font-mono text-[11px] text-stone-500">{m.detail}</div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                  {notes && (notes.key_points.length > 0 || notes.review_questions.length > 0) && (
                    <li data-testid="micro-lesson-review" className="rounded-lg bg-white px-3 py-2 text-[13px] text-stone-800 ring-1 ring-stone-200">
                      {notes.key_points.length > 0 && (
                        <>
                          <div className="font-semibold">Ý cần nhớ</div>
                          <ul className="mb-2 list-disc pl-5">
                            {notes.key_points.map((k, i) => (
                              <li key={i}>
                                <MathText text={k} />
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {notes.review_questions.length > 0 && (
                        <>
                          <div className="font-semibold">Câu hỏi ôn tập</div>
                          <ol className="list-decimal pl-5">
                            {notes.review_questions.map((q, i) => (
                              <li key={i}>
                                <MathText text={q} />
                              </li>
                            ))}
                          </ol>
                        </>
                      )}
                    </li>
                  )}
                </ol>
              ) : (
                map && (
                  <svg data-testid="micro-lesson-map" viewBox={`0 0 ${map.width} ${map.height}`} className="w-full" style={{minWidth: 560}}>
                    {map.edges.map((e) => {
                      const a = map.nodes.find((n) => n.id === e.from)!;
                      const b = map.nodes.find((n) => n.id === e.to)!;
                      const mx = (a.x + b.x) / 2;
                      return <path key={`${e.from}-${e.to}`} d={`M ${a.x + 6} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 6} ${b.y}`} fill="none" stroke="#CBD5E1" strokeWidth={1.5} />;
                    })}
                    {map.nodes.map((n) => (
                      <g key={n.id} data-testid={`mind-node-${n.level}`}>
                        <circle cx={n.x} cy={n.y} r={n.level === 0 ? 6 : n.level === 1 ? 5 : 3.5} fill={n.kind ? COLOR[n.kind] : n.level === 0 ? '#1D4ED8' : '#64748B'} />
                        <text x={n.x + 10} y={n.y + 4} fontSize={n.level === 0 ? 14 : 12} fontWeight={n.level < 2 ? 700 : 400} fill="#1C1917">
                          {n.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                data-testid="micro-lesson-ai"
                disabled={ai.state === 'loading'}
                onClick={() => void writeNotes()}
                className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {ai.state === 'loading' ? 'AI đang viết…' : notes ? 'Viết lại lời giảng' : 'AI viết lời giảng'}
              </button>
              <button data-testid="micro-lesson-download" onClick={download} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                <Download className="h-3.5 w-3.5" />
                Tải về (Markdown)
              </button>
              <button data-testid="micro-lesson-copy" onClick={() => void copy()} className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Copy className="h-3.5 w-3.5" />
                Sao chép
              </button>
              {ai.state === 'error' && (
                <span data-testid="micro-lesson-ai-error" role="alert" className="text-[11px] text-rose-600">
                  {ai.msg}
                </span>
              )}
              {notes && ai.source && (
                <span data-testid="micro-lesson-ai-source" className="text-[11px] text-stone-500">
                  Lời giảng do AI viết từ dàn bài; hãy đọc lại trước khi dùng.
                </span>
              )}
              {note && (
                <span data-testid="micro-lesson-note" className="text-[11px] text-stone-500">
                  {note}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
