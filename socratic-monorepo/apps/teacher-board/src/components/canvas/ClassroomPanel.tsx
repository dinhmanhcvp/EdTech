'use client';

import React, {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {X, Users, Copy, Check, Hand, BarChart3, Power, Loader2, Wifi, WifiOff} from 'lucide-react';
import type {ClassroomApi} from '../../hooks/useClassroom';

const SELF_CONTROLLED_NOTE = ['MATH_GRAPH', 'GEO_SOLID', 'MATH_LINEAR_PROGRAMMING', 'MATH_COBWEB_CHAOS', 'BIO_PUNNETT_SQUARE', 'BIO_HARDY_WEINBERG'];

export const ClassroomPanel: React.FC<{room: ClassroomApi; templateId?: string | null; onClose: () => void}> = ({room, templateId, onClose}) => {
  const {state} = room;
  const live = state.role === 'teacher' && state.roomId && (state.status === 'open' || state.status === 'reconnecting');
  const link = typeof window !== 'undefined' && state.roomId ? `${window.location.origin}/join/${state.roomId}` : '';
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState('Dự đoán: kết quả sẽ thay đổi thế nào?');
  const [optionsText, setOptionsText] = useState('Tăng\nGiảm\nKhông đổi');

  useEffect(() => {
    let alive = true;
    if (!link) return;
    QRCode.toDataURL(link, {margin: 1, width: 360, color: {dark: '#18181B', light: '#FFFFFF'}})
      .then((u) => alive && setQr(u))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [link]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const options = optionsText.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const poll = state.poll;
  const result = state.result;
  const selfControlled = templateId ? SELF_CONTROLLED_NOTE.includes(templateId) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 backdrop-blur-[2px] p-3" data-testid="classroom-overlay">
      <div data-testid="classroom-panel" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#E6E4DD] shadow-[0_20px_60px_-10px_rgba(20,20,19,0.35)]">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#E6E4DD] sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Lớp học tương tác</h2>
              <p className="text-[11px] text-stone-500">Học sinh quét mã, xem mô phỏng trên điện thoại và tham gia bình chọn.</p>
            </div>
          </div>
          <button onClick={onClose} data-testid="classroom-close" className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" title="Đóng (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!live ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-stone-600 max-w-md">Tạo một phòng học để học sinh vào bằng mã hoặc quét QR. Mô phỏng và thanh trượt trên bảng sẽ đồng bộ tới mọi thiết bị.</p>
            <button
              data-testid="classroom-create"
              onClick={() => room.createRoom()}
              disabled={state.status === 'connecting'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm"
            >
              {state.status === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Tạo lớp học
            </button>
            {state.error && <p data-testid="classroom-error" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-md">{state.error}</p>}
          </div>
        ) : (
          <div className="p-5 grid md:grid-cols-[220px_1fr] gap-5">
            <div className="flex flex-col items-center gap-2">
              {qr ? <img src={qr} alt="QR vào lớp" data-testid="classroom-qr" className="w-full max-w-[220px] rounded-xl border border-[#E6E4DD]" /> : <div className="w-[220px] h-[220px] rounded-xl border border-dashed border-[#DCD9D0]" />}
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Mã phòng</div>
              <div data-testid="classroom-code" className="text-3xl font-mono font-bold tracking-[0.25em] text-stone-900">{state.roomId}</div>
              <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCD9D0] text-xs text-stone-700 hover:bg-stone-50">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Đã chép liên kết' : 'Chép liên kết'}
              </button>
              <div className={`flex items-center gap-1.5 text-[11px] ${state.status === 'open' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {state.status === 'open' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {state.status === 'open' ? 'Đang trực tuyến' : 'Đang nối lại…'}
              </div>
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <section>
                <h3 className="flex items-center gap-2 text-xs font-semibold text-stone-800 mb-2">
                  <Users className="w-3.5 h-3.5" /> Học sinh (<span data-testid="classroom-count">{state.studentCount}</span>)
                </h3>
                {state.roster.length === 0 ? (
                  <p className="text-xs text-stone-400">Chưa có ai vào. Chiếu mã hoặc QR lên bảng.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5" data-testid="classroom-roster">
                    {state.roster.map((s) => {
                      const has = state.control === s.id;
                      return (
                        <li key={s.id} className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border text-xs ${has ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-[#F8F7F4] border-[#E6E4DD] text-stone-700'}`}>
                          {s.name}
                          <button
                            data-testid={`classroom-delegate-${s.id}`}
                            onClick={() => room.send({type: 'DELEGATE', studentId: has ? null : s.id})}
                            title={has ? 'Thu hồi quyền điều khiển' : 'Giao quyền điều khiển mô phỏng'}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${has ? 'bg-amber-500 text-white' : 'bg-white border border-[#DCD9D0] text-stone-600 hover:bg-stone-100'}`}
                          >
                            <Hand className="w-3 h-3" /> {has ? 'Thu hồi' : 'Giao quyền'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {selfControlled && <p className="text-[11px] text-stone-500 mt-2">Mô phỏng này (đồ thị, khối 3D, di truyền…) tự điều khiển bên trong: học sinh xem cùng nội dung và tự thao tác trên máy mình; thanh trượt chung chỉ đồng bộ ở các mô phỏng Lý/Hóa/Sinh có thanh trượt.</p>}
              </section>

              <section className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] p-3 flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <BarChart3 className="w-3.5 h-3.5" /> Bình chọn dự đoán (Socratic)
                </h3>
                {poll?.open || result ? (
                  <>
                    <p className="text-sm text-stone-900 font-medium">{poll?.question}</p>
                    <div className="flex flex-col gap-1.5" data-testid="classroom-results">
                      {(poll?.options ?? []).map((o) => {
                        const pct = result?.percents[o] ?? 0;
                        return (
                          <div key={o} className="relative h-8 rounded-lg bg-white border border-[#E6E4DD] overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-blue-200/70 transition-all duration-300" style={{width: `${pct}%`}} />
                            <div className="relative h-full flex items-center justify-between px-3 text-xs">
                              <span className="font-medium text-stone-800">{o}</span>
                              <span className="font-mono text-stone-700">{result?.counts[o] ?? 0} · {pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span>{result?.total ?? 0}/{state.studentCount} đã trả lời</span>
                      {poll?.open ? (
                        <button data-testid="classroom-poll-end" onClick={() => room.send({type: 'POLL_END'})} className="ml-auto px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold">Kết thúc & công bố</button>
                      ) : (
                        <button data-testid="classroom-poll-new" onClick={() => room.send({type: 'POLL_START', question, options})} className="ml-auto px-3 py-1.5 rounded-lg border border-[#DCD9D0] text-xs text-stone-700 hover:bg-stone-50">Câu hỏi mới</button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <input value={question} onChange={(e) => setQuestion(e.target.value)} data-testid="classroom-poll-question" className="px-3 py-1.5 rounded-lg border border-[#E6E4DD] text-sm bg-white focus:outline-none focus:border-blue-500" />
                    <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} data-testid="classroom-poll-options" rows={3} placeholder="Mỗi lựa chọn một dòng" className="px-3 py-1.5 rounded-lg border border-[#E6E4DD] text-sm bg-white font-mono focus:outline-none focus:border-blue-500" />
                    <button
                      data-testid="classroom-poll-start"
                      onClick={() => room.send({type: 'POLL_START', question, options})}
                      disabled={!question.trim() || options.length < 2}
                      className="self-start px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold"
                    >
                      Gửi câu hỏi cho lớp
                    </button>
                  </>
                )}
                {state.error && <p className="text-xs text-rose-700">{state.error}</p>}
              </section>

              <button
                data-testid="classroom-end"
                onClick={() => {
                  room.send({type: 'CLOSE'});
                  setTimeout(room.leave, 150);
                }}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs hover:bg-rose-50"
              >
                <Power className="w-3.5 h-3.5" /> Kết thúc lớp học
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
