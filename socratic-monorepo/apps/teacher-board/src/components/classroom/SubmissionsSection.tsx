'use client';

import React, {useState} from 'react';
import {Eye, EyeOff, MonitorUp, PenLine} from 'lucide-react';
import type {ClassroomState} from '../../utils/classroomState';
import {PAD_H, PAD_W, anonymousLabel, thumbPoints, type Submission} from '../../utils/submissionInk';

interface Props {
  state: Pick<ClassroomState, 'collect' | 'submissions' | 'studentCount'>;
  send: (msg: Record<string, unknown>) => boolean;
  /** chiếu một bài lên bảng (nhãn ẩn danh) */
  onShow?: (sub: Submission, label: string) => void;
}

const TW = 176;
const TH = Math.round((TW * PAD_H) / PAD_W);

/**
 * Thu bài làm vẽ tay của học sinh: mở đợt thu bài với một đề, xem lưới bài đã nộp (ẩn danh theo mặc định), chọn một bài chiếu lên bảng
 * để cả lớp cùng chữa hoặc chấm từng bước. Tên chỉ hiện trên màn hình giáo viên khi bật, không bao giờ đưa lên bảng.
 */
export const SubmissionsSection: React.FC<Props> = ({state, send, onShow}) => {
  const [prompt, setPrompt] = useState('');
  const [showNames, setShowNames] = useState(false);
  const {collect, submissions, studentCount} = state;

  return (
    <section data-testid="submissions-section" className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] p-3 flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-stone-800">
        <PenLine className="w-3.5 h-3.5" /> Thu bài làm vẽ tay
      </h3>

      {collect?.open ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span data-testid="submissions-count" className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
            {submissions.length}/{studentCount} đã nộp
          </span>
          {collect.prompt && <span className="min-w-0 truncate text-stone-500">“{collect.prompt}”</span>}
          <button data-testid="submissions-end" onClick={() => send({type: 'COLLECT_END'})} className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
            Đóng thu bài
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            data-testid="submissions-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={200}
            placeholder="Đề cho học sinh (VD: Giải phương trình x² − 5x + 6 = 0)"
            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button data-testid="submissions-start" onClick={() => send({type: 'COLLECT_START', prompt})} disabled={studentCount === 0} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {collect ? 'Thu bài đợt mới' : 'Bắt đầu thu bài'}
            </button>
            {studentCount === 0 && <span className="text-[11px] text-stone-400">Cần có học sinh trong phòng.</span>}
            {collect && !collect.open && submissions.length > 0 && <span className="text-[11px] text-stone-500">Đã đóng · {submissions.length} bài. Đợt mới sẽ xóa các bài này.</span>}
          </div>
        </div>
      )}

      {submissions.length > 0 && (
        <>
          <label className="flex items-center gap-1.5 self-start text-[11px] text-stone-600">
            <button data-testid="submissions-names" aria-pressed={showNames} onClick={() => setShowNames((v) => !v)} className="flex items-center gap-1 rounded-md border border-stone-300 px-2 py-0.5 hover:bg-stone-50 aria-pressed:bg-stone-900 aria-pressed:text-white">
              {showNames ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showNames ? 'Đang hiện tên' : 'Ẩn danh'}
            </button>
            <span className="text-stone-400">Tên chỉ hiện ở màn hình này, không lên bảng.</span>
          </label>
          <ul data-testid="submissions-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {submissions.map((sub, i) => {
              const label = anonymousLabel(i);
              return (
                <li key={sub.studentId} data-testid="submission-card" data-student={sub.studentId} className="flex flex-col gap-1 rounded-lg border border-[#E6E4DD] bg-white p-1.5">
                  <svg viewBox={`0 0 ${TW} ${TH}`} width="100%" role="img" aria-label={`Bản xem trước ${label}`} className="rounded bg-[#FCFBF9]">
                    {sub.strokes.map((s, k) => (
                      <polyline key={k} points={thumbPoints(s, TW, TH)} fill="none" stroke={s.c} strokeWidth={Math.max(1, s.w * 0.5)} strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                  </svg>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span data-testid="submission-label" className="font-semibold text-stone-800">
                      {showNames ? sub.name : label}
                    </span>
                    {sub.rev > 1 && <span className="rounded bg-amber-50 px-1 text-[10px] text-amber-700">lần {sub.rev}</span>}
                    <button data-testid="submission-show" onClick={() => onShow?.(sub, label)} disabled={!onShow} className="ml-auto flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                      <MonitorUp className="h-3 w-3" /> Chiếu
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
