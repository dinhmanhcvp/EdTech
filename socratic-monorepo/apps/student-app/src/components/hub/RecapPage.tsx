'use client';

import React, {useEffect, useState} from 'react';
import {apiBase} from '../../utils/apiBase';
import {MathView} from '../common/MathView';
import {MathText} from '../ui/MathText';

interface Section {id: string; title: string; latex?: string; note?: string}
interface Recap {
  className?: string;
  lessonTitle?: string;
  summary?: string;
  keyPoints?: string[];
  reviewQuestions?: string[];
  boardSnapshots: Section[];
}

/** Trang xem lại cả tiết học qua QR của thầy cô: công khai theo mã, chỉ đọc. */
export function RecapPage({code}: {code: string}) {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${apiBase()}/api/v1/student/recap/${encodeURIComponent(code)}`, {cache: 'no-store'})
      .then(async (r) => {
        if (r.status === 404) throw new Error('Mã xem lại không còn hiệu lực. Hãy quét lại mã thầy cô vừa chiếu.');
        if (!r.ok) throw new Error('Chưa tải được bài học. Thử lại sau nhé.');
        return (await r.json()) as {snapshot: Recap};
      })
      .then((d) => setRecap(d.snapshot))
      .catch((e: Error) => setError(e.message));
  }, [code]);

  if (error) return <main className="p-6 text-center text-sm text-rose-700">{error}</main>;
  if (!recap) return <main className="p-6 text-center text-sm text-stone-500">Đang tải bài học…</main>;
  return (
    <main data-testid="recap-page" className="mx-auto flex max-w-xl flex-col gap-3 p-4 text-stone-800">
      <p className="text-xs font-medium text-stone-500">Xem lại tiết học{recap.className ? ` · ${recap.className}` : ''}</p>
      <h1 className="text-xl font-bold">{recap.lessonTitle || 'Bài học hôm nay'}</h1>
      {recap.summary && <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-relaxed"><MathText text={recap.summary} /></p>}
      {recap.keyPoints && recap.keyPoints.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">Ý cần nhớ</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed">{recap.keyPoints.map((k) => <li key={k}><MathText text={k} /></li>)}</ul>
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Diễn biến trên bảng</h2>
        {recap.boardSnapshots.map((s, i) => (
          <article key={s.id} className="rounded-xl border border-[#E6E4DD] bg-white p-3">
            <h3 className="text-sm font-semibold">{i + 1}. {s.title}</h3>
            {s.latex && <div className="my-1 overflow-x-auto text-sm"><MathView latex={s.latex} displayMode={false} /></div>}
            {s.note && <p className="text-[13px] leading-relaxed text-stone-600"><MathText text={s.note} /></p>}
          </article>
        ))}
      </section>
      {recap.reviewQuestions && recap.reviewQuestions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">Câu hỏi ôn</h2>
          <ol className="list-decimal pl-5 text-sm leading-relaxed">{recap.reviewQuestions.map((q) => <li key={q}><MathText text={q} /></li>)}</ol>
        </section>
      )}
    </main>
  );
}
