'use client';

import React, {useState} from 'react';
import {Link2, Link2Off, Save, X} from 'lucide-react';
import type {BoardSession} from '../../utils/boardSession';

interface Props {
  session: BoardSession | null;
  /** bảng đang có nội dung chưa thuộc tiết nào: ghép sẽ thay thế */
  boardHasContent: boolean;
  /** nhập mã ghép; trả về lời báo lỗi (null = thành công) */
  onPair: (code: string) => Promise<string | null>;
  /** lưu bảng đang dạy vào kho bài của giáo viên đang dạy; trả về lời báo (đã lưu/lỗi) */
  onSaveLesson: (title: string) => Promise<{ok: boolean; text: string}>;
  /** ngắt ghép mà KHÔNG kết thúc tiết (kết thúc làm ở trang quản lý) */
  onUnpair: () => void;
}

/**
 * Ghép bảng chung với tiết học của giáo viên (mã 6 ký tự lấy ở trang quản lý). Khi đã ghép: hiện tên tiết/giáo viên, các đề chuẩn bị sẵn,
 * và cho lưu bảng vào bài của giáo viên đó. Mọi quản lý lớp (thu bài, chiếu bài, bình chọn, kết thúc) nằm ở trang quản lý.
 */
export const PairPanel: React.FC<Props> = ({session, boardHasContent, onPair, onSaveLesson, onUnpair}) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState<{ok: boolean; text: string} | null>(null);
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [switching, setSwitching] = useState(false); // đang ghép: mở ô nhập mã để chuyển sang tiết khác

  if (!open) {
    return (
      <button
        data-testid="pair-open"
        onClick={() => {
          setError(null);
          setNote(null);
          setConfirmUnpair(false);
          setSwitching(false);
          setTitle(session?.title ?? '');
          setOpen(true);
        }}
        title={session ? `Đang ghép với tiết "${session.title}"` : 'Ghép bảng với tiết học của giáo viên'}
        className={`absolute left-3 bottom-[11.25rem] z-30 pointer-events-auto flex max-w-[15rem] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-md ${session ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-[#DCD9D0] bg-white/95 text-stone-700 hover:bg-stone-50'}`}
      >
        {session ? <Link2 className="h-3.5 w-3.5 shrink-0" /> : <Link2Off className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{session ? `${session.teacherName || 'Tiết'} · ${session.title}` : 'Ghép tiết'}</span>
      </button>
    );
  }

  const pair = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onPair(code);
    setBusy(false);
    if (err) setError(err);
    else {
      setCode('');
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <div data-testid="pair-panel" className="absolute inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 pointer-events-auto">
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-auto rounded-2xl border border-[#DCD9D0] bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-emerald-600" />
          <h2 className="flex-1 text-sm font-semibold text-stone-900">{session ? 'Bảng đang ghép với tiết học' : 'Ghép bảng với tiết học'}</h2>
          <button data-testid="pair-close" onClick={() => setOpen(false)} className="rounded-full p-1 text-stone-500 hover:bg-stone-100" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!session || switching ? (
          <form onSubmit={pair} className="flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              {session ? 'Ghép sang tiết của giáo viên khác: tiết hiện tại sẽ được khép lại và lưu riêng, bảng bắt đầu sạch. ' : ''}
              Trên trang quản lý, mở tiết của bạn rồi bấm “Bắt đầu tiết”. Nhập mã 6 ký tự hiện ra ở đây. Bảng sẽ nạp bài soạn của tiết và lưu mọi thứ vào tiết đó, không lẫn với giáo viên khác.
            </p>
            <input data-testid="pair-code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} autoFocus placeholder="______" aria-label="Mã ghép" className="rounded-xl border border-[#DCD9D0] px-3 py-3 text-center font-mono text-3xl font-bold tracking-[0.4em] focus:border-emerald-500 focus:outline-none" />
            {boardHasContent && !session && (
              <p data-testid="pair-warning" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Bảng đang có nội dung. Ghép sẽ thay toàn bộ bảng bằng bài của tiết; hãy lưu nội dung hiện tại vào thư viện trước nếu cần.
              </p>
            )}
            {error && (
              <p data-testid="pair-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button data-testid="pair-submit" disabled={busy || code.length !== 6} className="rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300">
              {busy ? 'Đang ghép…' : 'Ghép bảng'}
            </button>
            {session && (
              <button type="button" onClick={() => setSwitching(false)} className="self-start rounded-lg px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100">
                Quay lại
              </button>
            )}
          </form>
        ) : (
          <>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <div data-testid="pair-title" className="font-semibold">
                {session.title}
              </div>
              <div className="text-xs">
                {session.teacherName}
                {session.classInfo ? ` · lớp ${session.classInfo.name}` : ''}
              </div>
              {session.goals && <div className="mt-1 text-xs text-emerald-800">Mục tiêu: {session.goals}</div>}
            </div>
            {session.prompts.length > 0 && (
              <div className="text-xs text-stone-600">
                <div className="font-semibold text-stone-700">Đề thu bài đã chuẩn bị</div>
                <ul className="list-disc pl-5">
                  {session.prompts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-stone-500">Thu bài, chiếu bài học sinh, bình chọn và kết thúc tiết được điều khiển ở trang quản lý. Bảng tự lưu theo tiết mỗi vài giây.</p>
            <div className="flex flex-col gap-2 rounded-xl border border-stone-200 p-2.5">
              <label className="flex flex-col gap-0.5 text-[11px] text-stone-500">
                Lưu bảng này vào bài soạn của tôi
                <input data-testid="pair-save-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên bài" className="rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900" />
              </label>
              <button
                data-testid="pair-save"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setNote(await onSaveLesson(title));
                  setBusy(false);
                }}
                className="flex items-center gap-1.5 self-start rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-stone-300"
              >
                <Save className="h-3.5 w-3.5" /> Lưu vào bài của tôi
              </button>
              {note && (
                <p data-testid="pair-note" role={note.ok ? 'status' : 'alert'} className={`rounded-lg px-3 py-1.5 text-xs ${note.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {note.text}
                </p>
              )}
            </div>
            <button data-testid="pair-switch" onClick={() => (setSwitching(true), setError(null))} className="self-start rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50">
              Ghép sang tiết khác
            </button>
            {confirmUnpair ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-600">Ngắt ghép? Bảng sẽ được dọn; tiết vẫn tiếp tục ở trang quản lý.</span>
                <button
                  data-testid="pair-unpair-confirm"
                  onClick={() => {
                    onUnpair();
                    setOpen(false);
                  }}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white"
                >
                  Ngắt ghép
                </button>
                <button onClick={() => setConfirmUnpair(false)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
                  Hủy
                </button>
              </div>
            ) : (
              <button data-testid="pair-unpair" onClick={() => setConfirmUnpair(true)} className="self-start rounded-lg px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50">
                Ngắt ghép
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
