'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {Power, RefreshCw, Wifi, WifiOff} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import {useLiveRoom} from '../../lib/live';
import {readPair, startAndRemember} from '../../lib/pairing';
import type {Period} from '../../lib/types';
import {AssignmentLive} from '../AssignmentLive';
import {useConsole} from '../Shell';

const card = 'rounded-2xl border border-rule bg-white p-5 shadow-card';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[.14em] text-mute';

function Dot({on}: {on: boolean}) {
  return <span className={`h-2 w-2 rounded-full ${on ? 'bg-mastery-fg shadow-[0_0_8px_#15803D]' : 'bg-hint-fg'}`} />;
}

/** Trạng thái 2, Đang dạy: mã ghép bảng cỡ lớn, bảng và học sinh đã vào chưa, thu bài và chiếu bài ẩn danh. */
export function StageLive() {
  const {periods, classId, classes, reload, setStage} = useConsole();
  const [error, setError] = useState<string | null>(null);
  const live = periods.find((p) => p.status === 'live' && p.class_id === classId) ?? periods.find((p) => p.status === 'live');
  const next = periods.filter((p) => p.status === 'planned' && (!classId || p.class_id === classId)).sort((a, b) => a.created_at - b.created_at)[0];

  const start = async (p: Period) => {
    setError(null);
    try {
      await startAndRemember(p.id);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không bắt đầu được tiết.');
    }
  };

  if (live) return <LiveCard key={live.id} period={live} size={classes.find((c) => c.id === live.class_id)?.size ?? 0} className={classes.find((c) => c.id === live.class_id)?.name} onEnded={() => (reload(), setStage('after'))} />;
  return (
    <section data-testid="live-empty" className={`${card} flex max-w-xl flex-col gap-3`}>
      <div className={eyebrow}>Đang dạy</div>
      <h2 className="font-serif text-2xl font-medium">Chưa có tiết nào đang dạy</h2>
      {next ? (
        <>
          <p className="text-sm text-mute">Tiết đã soạn kế tiếp: <b className="text-ink">{next.title}</b>. Bắt đầu để lấy mã ghép bảng.</p>
          <button data-testid="live-start" onClick={() => void start(next)} className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Bắt đầu tiết
          </button>
        </>
      ) : (
        <p className="text-sm text-mute">
          Chưa có tiết đã soạn. <Link href="/periods" className="font-medium text-brand-600 underline">Soạn một tiết</Link> trước khi vào lớp.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-stuck-fg">{error}</p>}
    </section>
  );
}

function LiveCard({period, size, className, onEnded}: {period: Period; size: number; className?: string; onEnded: () => void}) {
  const [creds, setCreds] = useState<{roomId: string; token: string} | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const {state} = useLiveRoom(creds);

  useEffect(() => {
    setCode(readPair(period.id));
    api.live(period.id).then(setCreds).catch(() => setCreds(null)); // phòng đã mất (máy chủ khởi động lại): lấy mã mới ở nút bên cạnh
  }, [period.id]);

  const online = state.status === 'open';
  const repair = async () => {
    setError(null);
    try {
      setCode(await startAndRemember(period.id));
      setCreds(await api.live(period.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lấy được mã ghép mới.');
    }
  };
  const end = async () => {
    try {
      await api.endPeriod(period.id);
      onEnded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không kết thúc được tiết.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section data-testid="pairing" className={`${card} lg:col-span-7`}>
        <div className={eyebrow}>Ghép bảng · {period.title}</div>
        {code ? (
          <div data-testid="pair-code" className="mt-2 font-mono text-5xl font-semibold tracking-[.28em] text-ink">
            {code}
          </div>
        ) : (
          <p className="mt-2 text-sm text-mute">Mã ghép chỉ hiện lúc bắt đầu tiết. Lấy mã mới nếu cần ghép bảng.</p>
        )}
        <p className="mt-2 text-sm text-mute">Trên bảng bấm “Ghép tiết” và nhập mã. Mã dùng một lần, sống 10 phút.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span data-testid="live-board" className="flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-1">
            <Dot on={state.boardOnline} />
            {state.boardOnline ? 'Bảng đã ghép' : 'Chờ bảng ghép'}
          </span>
          <span data-testid="live-conn" className="flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-1">
            {online ? <Wifi className="h-3.5 w-3.5 text-mastery-fg" /> : <WifiOff className="h-3.5 w-3.5 text-hint-fg" />}
            {online ? 'Phòng đang mở' : state.status === 'closed' ? 'Phòng đã đóng' : 'Đang nối phòng…'}
          </span>
          <button onClick={() => void repair()} className="ml-auto flex items-center gap-1.5 rounded-lg border border-rule px-3 py-1.5 hover:bg-sunk">
            <RefreshCw className="h-3.5 w-3.5" /> Lấy mã ghép mới
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-stuck-fg">{error}</p>}
      </section>

      <section className={`${card} flex flex-col lg:col-span-5`}>
        <div className={eyebrow}>Học sinh trong phòng{className ? ` · ${className}` : ''}</div>
        <div className="mt-2 font-mono text-5xl font-semibold" data-testid="live-count">
          {state.studentCount}
          {size > 0 && <span className="text-2xl text-mute">/{size}</span>}
        </div>
        <p className="mt-1 text-sm text-mute">đã vào lớp bằng mã QR hoặc đường dẫn phòng học.</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Link href={`/periods/${period.id}`} className="rounded-lg border border-rule px-3 py-2 text-sm font-medium hover:bg-sunk">
            Mở bảng điều khiển đầy đủ
          </Link>
          {confirmEnd ? (
            <span className="flex items-center gap-1.5 text-sm">
              Kết thúc tiết?
              <button data-testid="live-end-confirm" onClick={() => void end()} className="rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white">Kết thúc</button>
              <button onClick={() => setConfirmEnd(false)} className="rounded-lg px-2 py-1.5 text-mute hover:bg-sunk">Hủy</button>
            </span>
          ) : (
            <button data-testid="live-end" onClick={() => setConfirmEnd(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-mute hover:bg-sunk">
              <Power className="h-4 w-4" /> Kết thúc tiết
            </button>
          )}
        </div>
      </section>

      <section className={`${card} lg:col-span-12`}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <div className={eyebrow}>Thu bài</div>
            <h2 className="font-serif text-xl font-medium">Chữa trên bảng</h2>
          </div>
          <span className="text-xs text-mute">Bài chiếu lên bảng luôn ẩn tên (Bài 1, Bài 2…); tên chỉ hiện ở màn hình này.</span>
        </div>
        <AssignmentLive periodId={period.id} live />
      </section>
    </div>
  );
}
