'use client';

import React, {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {Eye, EyeOff, Hand, MonitorUp, PenLine, Power, RefreshCw, Wifi, WifiOff} from 'lucide-react';
import {boardBase} from '../lib/api';
import type {LiveState} from '../lib/live';
import {Thumb} from './Thumb';

interface Props {
  roomId: string;
  live: LiveState;
  send: (msg: Record<string, unknown>) => boolean;
  prompts: string[];
  pairCode: string | null;
  onRepair: () => void;
  onEnd: () => void;
}

/**
 * Điều khiển tiết đang dạy (thay panel Lớp học trên bảng): mã ghép bảng, học sinh trong phòng (có tên, chỉ ở màn hình này),
 * thu bài vẽ tay và chọn bài chiếu lên bảng (bảng chỉ nhận nhãn ẩn danh), bình chọn nhanh, kết thúc tiết.
 */
export function LiveControl({roomId, live, send, prompts, pairCode, onRepair, onEnd}: Props) {
  const [prompt, setPrompt] = useState('');
  const [showNames, setShowNames] = useState(true);
  const [question, setQuestion] = useState('Dự đoán: kết quả sẽ thay đổi thế nào?');
  const [optionsText, setOptionsText] = useState('Tăng\nGiảm\nKhông đổi');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const joinUrl = `${boardBase()}/join/${roomId}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(joinUrl, {margin: 1, width: 220, color: {dark: '#18181B', light: '#FFFFFF'}})
      .then((u) => alive && setQr(u))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [joinUrl]);

  const options = optionsText.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const {collect, submissions, poll, result} = live;
  const online = live.status === 'open';

  return (
    <div className="flex flex-col gap-4" data-testid="live-control">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span data-testid="live-conn" className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? 'Đang kết nối phòng' : live.status === 'closed' ? 'Phòng đã đóng' : live.status === 'error' ? 'Mất kết nối' : 'Đang nối lại…'}
        </span>
        <span data-testid="live-board" className={`rounded-full px-2.5 py-1 font-medium ${live.boardOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
          {live.boardOnline ? 'Bảng đã ghép' : 'Bảng chưa ghép'}
        </span>
        <span data-testid="live-count" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
          {live.studentCount} học sinh
        </span>
        {live.error && (
          <span data-testid="live-error" role="alert" className="text-rose-700">
            {live.error}
          </span>
        )}
      </div>

      <section className="grid gap-4 rounded-2xl border border-[#E6E4DD] bg-white p-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-stone-800">Ghép với bảng</h3>
          {pairCode ? (
            <>
              <div data-testid="pair-code" className="font-mono text-4xl font-bold tracking-[0.3em] text-stone-900">
                {pairCode}
              </div>
              <p className="text-xs text-stone-500">Trên bảng chiếu, mở mục “Ghép tiết” và nhập mã này. Mã dùng một lần, hết hạn sau 10 phút.</p>
            </>
          ) : (
            <p className="text-xs text-stone-500">{live.boardOnline ? 'Bảng đang ghép với tiết này.' : 'Bảng chưa ghép hoặc cần ghép lại (ví dụ sau khi làm mới trang bảng).'}</p>
          )}
          <button data-testid="repair" onClick={onRepair} className="flex items-center gap-1.5 self-start rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <RefreshCw className="h-3.5 w-3.5" /> Lấy mã ghép mới
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          {qr ? <img src={qr} alt="QR cho học sinh vào lớp" className="h-28 w-28 rounded-lg border border-[#E6E4DD]" /> : <div className="h-28 w-28 rounded-lg border border-dashed border-[#DCD9D0]" />}
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Học sinh vào lớp</div>
          <div data-testid="room-code" className="font-mono text-lg font-bold tracking-[0.2em] text-stone-900">
            {roomId}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E6E4DD] bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-stone-800">Học sinh trong phòng ({live.studentCount})</h3>
        {live.roster.length === 0 ? (
          <p className="text-xs text-stone-400">Chưa có ai vào. Cho học sinh quét QR hoặc nhập mã lớp.</p>
        ) : (
          <ul data-testid="roster" className="flex flex-wrap gap-1.5">
            {live.roster.map((s) => {
              const has = live.control === s.id;
              return (
                <li key={s.id} className={`flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-xs ${has ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#E6E4DD] bg-[#F8F7F4] text-stone-700'}`}>
                  {s.name}
                  <button data-testid={`delegate-${s.id}`} onClick={() => send({type: 'DELEGATE', studentId: has ? null : s.id})} title={has ? 'Thu hồi quyền điều khiển mô phỏng' : 'Giao quyền điều khiển mô phỏng'} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${has ? 'bg-amber-500 text-white' : 'border border-[#DCD9D0] bg-white text-stone-600 hover:bg-stone-100'}`}>
                    <Hand className="h-3 w-3" /> {has ? 'Thu hồi' : 'Giao quyền'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section data-testid="collect-section" className="flex flex-col gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <PenLine className="h-4 w-4" /> Thu bài làm vẽ tay
        </h3>
        {collect?.open ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span data-testid="collect-count" className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              {submissions.length}/{live.studentCount} đã nộp
            </span>
            {collect.prompt && <span className="min-w-0 truncate text-stone-500">“{collect.prompt}”</span>}
            <button data-testid="collect-end" onClick={() => send({type: 'COLLECT_END'})} className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
              Đóng thu bài
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {prompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="prepared-prompts">
                {prompts.map((p, i) => (
                  <button key={i} data-testid="prepared-prompt" onClick={() => setPrompt(p)} className="max-w-full truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-800 hover:bg-blue-100" title={p}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <input data-testid="collect-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={200} placeholder="Đề cho học sinh (chọn đề chuẩn bị sẵn hoặc tự gõ)" className="rounded-lg border border-[#E6E4DD] px-3 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <button data-testid="collect-start" onClick={() => send({type: 'COLLECT_START', prompt})} disabled={live.studentCount === 0} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                {collect ? 'Thu bài đợt mới' : 'Bắt đầu thu bài'}
              </button>
              {live.studentCount === 0 && <span className="text-[11px] text-stone-400">Cần có học sinh trong phòng.</span>}
              {collect && !collect.open && submissions.length > 0 && <span className="text-[11px] text-stone-500">Đã đóng · {submissions.length} bài. Đợt mới sẽ xóa các bài này khỏi màn hình (bài đã nộp vẫn được lưu khi kết thúc tiết).</span>}
            </div>
          </div>
        )}

        {submissions.length > 0 && (
          <>
            <button data-testid="names-toggle" aria-pressed={showNames} onClick={() => setShowNames((v) => !v)} className="flex items-center gap-1 self-start rounded-md border border-stone-300 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-stone-50 aria-pressed:bg-stone-900 aria-pressed:text-white">
              {showNames ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showNames ? 'Đang hiện tên (chỉ ở màn hình này)' : 'Ẩn tên'}
            </button>
            <ul data-testid="submissions-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {submissions.map((sub, i) => {
                const anon = `Bài ${i + 1}`;
                return (
                  <li key={sub.studentId} data-testid="submission-card" data-student={sub.studentId} className="flex flex-col gap-1 rounded-lg border border-[#E6E4DD] bg-white p-1.5">
                    <Thumb strokes={sub.strokes} label={`Bản xem trước ${anon}`} />
                    <div className="flex items-center gap-1 text-[11px]">
                      <span data-testid="submission-label" className="min-w-0 truncate font-semibold text-stone-800">
                        {showNames ? sub.name : anon}
                      </span>
                      {sub.rev > 1 && <span className="rounded bg-amber-50 px-1 text-[10px] text-amber-700">lần {sub.rev}</span>}
                      <button data-testid="submission-show" onClick={() => send({type: 'SHOW', studentId: sub.studentId, label: anon})} disabled={!live.boardOnline} title={live.boardOnline ? 'Chiếu lên bảng (ẩn danh)' : 'Cần ghép bảng trước'} className="ml-auto flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                        <MonitorUp className="h-3 w-3" /> Chiếu
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-stone-400">Bảng chỉ nhận “{`Bài k`}” và nét vẽ, không bao giờ nhận tên học sinh.</p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-800">Bình chọn dự đoán</h3>
        {poll?.open || result ? (
          <>
            <p className="text-sm font-medium text-stone-900">{poll?.question}</p>
            <div className="flex flex-col gap-1.5" data-testid="poll-results">
              {(poll?.options ?? []).map((o) => {
                const pct = result?.percents[o] ?? 0;
                return (
                  <div key={o} className="relative h-8 overflow-hidden rounded-lg border border-[#E6E4DD] bg-white">
                    <div className="absolute inset-y-0 left-0 bg-blue-200/70 transition-all" style={{width: `${pct}%`}} />
                    <div className="relative flex h-full items-center justify-between px-3 text-xs">
                      <span className="font-medium text-stone-800">{o}</span>
                      <span className="font-mono text-stone-700">
                        {result?.counts[o] ?? 0} · {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-500">
              <span>
                {result?.total ?? 0}/{live.studentCount} đã trả lời
              </span>
              {poll?.open ? (
                <button data-testid="poll-end" onClick={() => send({type: 'POLL_END'})} className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
                  Kết thúc và công bố
                </button>
              ) : (
                <button data-testid="poll-new" onClick={() => send({type: 'POLL_START', question, options})} className="ml-auto rounded-lg border border-[#DCD9D0] px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50">
                  Câu hỏi mới
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <input data-testid="poll-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="rounded-lg border border-[#E6E4DD] px-3 py-1.5 text-sm" />
            <textarea data-testid="poll-options" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={3} placeholder="Mỗi lựa chọn một dòng" className="rounded-lg border border-[#E6E4DD] px-3 py-1.5 font-mono text-sm" />
            <button data-testid="poll-start" onClick={() => send({type: 'POLL_START', question, options})} disabled={!question.trim() || options.length < 2} className="self-start rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
              Gửi câu hỏi cho lớp
            </button>
          </>
        )}
      </section>

      <div className="flex items-center gap-2">
        {confirmEnd ? (
          <>
            <span className="text-sm text-stone-700">Kết thúc tiết? Bảng sẽ được dọn sạch cho giáo viên sau.</span>
            <button data-testid="end-confirm" onClick={onEnd} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
              Kết thúc
            </button>
            <button onClick={() => setConfirmEnd(false)} className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
              Hủy
            </button>
          </>
        ) : (
          <button data-testid="end-period" onClick={() => setConfirmEnd(true)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
            <Power className="h-4 w-4" /> Kết thúc tiết
          </button>
        )}
      </div>
    </div>
  );
}
