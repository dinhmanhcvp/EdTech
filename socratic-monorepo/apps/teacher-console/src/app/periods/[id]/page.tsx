'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Trash2} from 'lucide-react';
import {ApiError, api, type PeriodInput} from '../../../lib/api';
import {useLiveRoom} from '../../../lib/live';
import type {ClassInfo, LessonMeta, Period, PeriodRecord} from '../../../lib/types';
import {ErrorNote, Shell} from '../../../components/Shell';
import {PeriodPrep} from '../../../components/PeriodPrep';
import {LiveControl} from '../../../components/LiveControl';
import {Thumb} from '../../../components/Thumb';
import {AssignmentLive} from '../../../components/AssignmentLive';

const when = (t: number | null) => (t ? new Date(t * 1000).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '');

function PeriodPage({id}: {id: string}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [lessons, setLessons] = useState<LessonMeta[]>([]);
  const [creds, setCreds] = useState<{roomId: string; token: string} | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [record, setRecord] = useState<PeriodRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {state: live, send} = useLiveRoom(creds);

  const fail = (e: unknown, fallback: string) => setError(e instanceof ApiError ? e.message : fallback);

  const load = useCallback(async () => {
    try {
      const [p, c, l] = await Promise.all([api.period(id), api.classes(), api.lessons()]);
      setPeriod(p);
      setClasses(c);
      setLessons(l);
      if (p.status === 'live') {
        try {
          setCreds(await api.live(id));
        } catch {
          setCreds(null); // phòng đã mất (máy chủ khởi động lại): giáo viên bấm "Mở lại phòng"
        }
      } else if (p.status === 'ended') {
        setRecord(await api.record(id));
      }
    } catch (e) {
      fail(e, 'Không tải được tiết học.');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (input: PeriodInput) => {
    setError(null);
    try {
      setPeriod(await api.updatePeriod(id, input));
    } catch (e) {
      fail(e, 'Không lưu được.');
    }
  };

  const start = async (input?: PeriodInput) => {
    setError(null);
    try {
      if (input) await api.updatePeriod(id, input);
      const r = await api.startPeriod(id);
      setPairCode(r.pairCode);
      setPeriod(r.period);
      setCreds(await api.live(id));
    } catch (e) {
      fail(e, 'Không bắt đầu được tiết.');
    }
  };

  const end = async () => {
    setError(null);
    try {
      await api.endPeriod(id);
      setCreds(null);
      setPairCode(null);
      await load();
    } catch (e) {
      fail(e, 'Không kết thúc được tiết.');
    }
  };

  if (!period) return error ? <ErrorNote error={error} /> : <p className="text-sm text-stone-500">Đang tải…</p>;
  const cls = classes.find((c) => c.id === period.class_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Tiết học
        </Link>
        <h1 data-testid="period-heading" className="min-w-0 flex-1 truncate text-lg font-semibold">
          {period.title}
        </h1>
        <span data-testid="period-status" data-status={period.status} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${period.status === 'live' ? 'bg-emerald-100 text-emerald-700' : period.status === 'ended' ? 'bg-stone-100 text-stone-600' : 'bg-blue-50 text-blue-700'}`}>
          {period.status === 'live' ? 'Đang dạy' : period.status === 'ended' ? 'Đã dạy' : 'Đã soạn'}
        </span>
      </div>
      <ErrorNote error={error} />

      {period.status === 'planned' && (
        <>
          <PeriodPrep period={period} classes={classes} lessons={lessons} onSave={save} onStart={start} />
          <div className="flex justify-end">
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                Xóa tiết này?
                <button
                  data-testid="delete-confirm"
                  onClick={async () => {
                    try {
                      await api.deletePeriod(id);
                      router.replace('/');
                    } catch (e) {
                      fail(e, 'Không xóa được.');
                    }
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white"
                >
                  Xóa
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
                  Hủy
                </button>
              </span>
            ) : (
              <button data-testid="delete-period" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> Xóa tiết
              </button>
            )}
          </div>
        </>
      )}

      {period.status === 'live' && (
        <>
          <details className="rounded-2xl border border-[#E6E4DD] bg-white p-3 text-sm" data-testid="live-prep-summary">
            <summary className="cursor-pointer font-medium text-stone-700">
              Chuẩn bị của tiết {cls ? `· ${cls.name}` : ''}
            </summary>
            {period.goals && <p className="mt-2 text-stone-600"><b>Mục tiêu:</b> {period.goals}</p>}
            {period.notes && <p className="mt-1 whitespace-pre-wrap text-stone-600"><b>Ghi chú:</b> {period.notes}</p>}
            {cls?.notes && <p className="mt-1 text-stone-600"><b>Về lớp:</b> {cls.notes}</p>}
            {!period.goals && !period.notes && !cls?.notes && <p className="mt-2 text-stone-400">Chưa có ghi chú.</p>}
          </details>
          {creds ? (
            <LiveControl roomId={creds.roomId} live={live} send={send} prompts={period.prompts} pairCode={pairCode} onRepair={() => void start()} onEnd={() => void end()} />
          ) : (
            <div data-testid="room-lost" className="flex flex-col items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Phòng học của tiết này không còn (máy chủ có thể đã khởi động lại). Mở lại phòng để tiếp tục; học sinh cần vào lại bằng mã mới.
              <div className="flex gap-2">
                <button data-testid="reopen-room" onClick={() => void start()} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white">
                  Mở lại phòng
                </button>
                <button onClick={() => void end()} className="rounded-lg border border-amber-300 px-3 py-1.5">
                  Kết thúc tiết
                </button>
              </div>
            </div>
          )}
          <AssignmentLive periodId={period.id} live />
        </>
      )}

      {period.status === 'ended' && (
        <section data-testid="period-record" className="flex flex-col gap-3 rounded-2xl border border-[#E6E4DD] bg-white p-4">
          <p className="text-sm text-stone-600">
            Dạy từ {when(period.started_at)} đến {when(period.ended_at)}
            {cls ? ` · ${cls.name}` : ''}.
          </p>
          {period.goals && <p className="text-sm text-stone-600"><b>Mục tiêu:</b> {period.goals}</p>}
          <p data-testid="record-board" className="text-sm text-stone-600">
            {record?.pages ? `Bảng cuối tiết đã được lưu (${record.pages.length} trang, ${record.pages.reduce((n, p) => n + p.length, 0)} đối tượng).` : 'Tiết này không lưu ảnh chụp bảng.'}
          </p>
          <h2 className="text-sm font-semibold text-stone-800">Bài học sinh đã nộp ({record?.submissions.length ?? 0})</h2>
          {record && record.submissions.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="record-submissions">
              {record.submissions.map((s, i) => (
                <li key={i} className="flex flex-col gap-1 rounded-lg border border-[#E6E4DD] p-1.5">
                  <Thumb strokes={s.strokes} label={`Bài của ${s.name}`} />
                  <span className="truncate text-[11px] font-semibold text-stone-800">{s.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-400">Không có bài nộp trong tiết này.</p>
          )}
          <AssignmentLive periodId={period.id} live={false} />
        </section>
      )}
    </div>
  );
}

export default function Page({params}: {params: {id: string}}) {
  return (
    <Shell>
      <PeriodPage id={params.id} />
    </Shell>
  );
}
