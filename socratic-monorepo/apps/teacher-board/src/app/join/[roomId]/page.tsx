'use client';

import React, {useEffect, useState} from 'react';
import {Hand, Wifi, WifiOff, LogOut} from 'lucide-react';
import {SimulationWidget} from '../../../components/canvas/SimulationWidget';
import {useClassroom} from '../../../hooks/useClassroom';
import {inControl} from '../../../utils/classroomState';

/** Màn hình học sinh: vào bằng mã/QR, xem mô phỏng của giáo viên, bình chọn, và điều khiển khi được giao quyền. */
export default function JoinPage({params}: {params: {roomId: string}}) {
  const roomId = decodeURIComponent(params.roomId).toUpperCase();
  const room = useClassroom();
  const {state} = room;
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem('socratic_student_name') || '');
    } catch {
      /* bỏ qua */
    }
  }, []);

  const join = () => {
    const n = name.trim();
    if (!n) return;
    try {
      localStorage.setItem('socratic_student_name', n);
    } catch {
      /* bỏ qua */
    }
    room.joinRoom(roomId, n);
    setJoined(true);
  };

  const mine = inControl(state);
  const poll = state.poll;
  const result = state.result;

  if (!joined) {
    return (
      <main className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            join();
          }}
          className="w-full max-w-sm rounded-2xl bg-white border border-[#E6E4DD] shadow-lg p-6 flex flex-col gap-4"
          data-testid="join-form"
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Vào lớp học</div>
            <div className="text-3xl font-mono font-bold tracking-[0.2em] text-stone-900" data-testid="join-code">{roomId}</div>
          </div>
          <label className="flex flex-col gap-1.5 text-sm text-stone-700">
            Tên của bạn
            <input
              data-testid="join-name"
              autoFocus
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="px-3 py-2.5 rounded-xl border border-[#DCD9D0] text-base focus:outline-none focus:border-blue-500"
            />
          </label>
          <button data-testid="join-submit" type="submit" disabled={!name.trim()} className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold">
            Vào lớp
          </button>
        </form>
      </main>
    );
  }

  if (state.status === 'closed' || (state.status === 'error' && !state.blueprint)) {
    return (
      <main className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-5">
        <div className="max-w-sm text-center rounded-2xl bg-white border border-[#E6E4DD] p-6 shadow" data-testid="join-ended">
          <p className="text-base font-semibold text-stone-900">{state.status === 'closed' ? 'Lớp học đã kết thúc' : 'Không vào được lớp'}</p>
          <p className="text-sm text-stone-600 mt-1">{state.error ?? 'Cảm ơn bạn đã tham gia.'}</p>
          <button onClick={() => { room.leave(); setJoined(false); }} className="mt-4 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm">Thử lại</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F7F4] pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 bg-white/95 backdrop-blur border-b border-[#E6E4DD]">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono font-bold tracking-widest text-stone-900" data-testid="join-room">{roomId}</span>
          <span className={`flex items-center gap-1 text-[11px] ${state.status === 'open' && state.teacherOnline ? 'text-emerald-700' : 'text-amber-700'}`} data-testid="join-status">
            {state.status === 'open' && state.teacherOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {state.status !== 'open' ? 'Đang nối lại…' : state.teacherOnline ? 'Giáo viên đang trực tuyến' : 'Giáo viên đang tạm vắng'}
          </span>
        </div>
        <button onClick={() => { room.leave(); setJoined(false); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" title="Rời lớp">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {mine && (
        <div data-testid="join-control-banner" className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium">
          <Hand className="w-4 h-4" /> Giáo viên đã giao quyền cho bạn: kéo thanh trượt để điều khiển bảng!
        </div>
      )}
      {state.error && <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs" data-testid="join-error">{state.error}</div>}

      <section className="p-3 flex flex-col gap-3">
        {state.blueprint ? (
          <SimulationWidget
            key={`${state.blueprint.templateId}|${state.blueprint.recognizedLatex}|${(state.blueprint.expressions || []).join('|')}`}
            blueprint={state.blueprint}
            remoteParams={state.params}
            locked={!mine}
            onParamChange={(k, v) => {
              if (mine) room.send({type: 'INTERACT', key: k, value: v});
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[#DCD9D0] bg-white p-8 text-center text-sm text-stone-500" data-testid="join-waiting">
            Chờ giáo viên bật mô phỏng trên bảng…
          </div>
        )}

        {poll && (
          <div className="rounded-2xl bg-white border border-[#E6E4DD] shadow-sm p-4 flex flex-col gap-2.5" data-testid="join-poll">
            <div className="text-[11px] font-mono uppercase tracking-wider text-blue-700">Câu hỏi dự đoán</div>
            <p className="text-base font-semibold text-stone-900">{poll.question}</p>
            {poll.open ? (
              <div className="grid gap-2">
                {poll.options.map((o) => (
                  <button
                    key={o}
                    data-testid={`join-vote-${o}`}
                    onClick={() => room.send({type: 'VOTE', choice: o})}
                    className={`py-3 rounded-xl border text-base font-medium transition ${state.myVote === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-stone-800 border-[#DCD9D0] hover:bg-stone-50 active:scale-[0.99]'}`}
                  >
                    {o}
                  </button>
                ))}
                <p className="text-xs text-stone-500">{state.myVote ? `Bạn đã chọn "${state.myVote}". Có thể đổi ý trước khi giáo viên công bố.` : 'Chọn một đáp án.'}</p>
              </div>
            ) : result ? (
              <div className="grid gap-1.5" data-testid="join-result">
                {poll.options.map((o) => (
                  <div key={o} className="relative h-9 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-blue-200/70" style={{width: `${result.percents[o] ?? 0}%`}} />
                    <div className="relative h-full flex items-center justify-between px-3 text-sm">
                      <span className={state.myVote === o ? 'font-bold' : ''}>{o}{state.myVote === o ? ' (bạn)' : ''}</span>
                      <span className="font-mono">{result.percents[o] ?? 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">Câu hỏi đã đóng.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
