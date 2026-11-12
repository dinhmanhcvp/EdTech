'use client';

import React from 'react';
import type {Mishap} from '../../utils/lab/hands/mishap';

/**
 * Thẻ sự cố: hiện ngay khi thao tác sai gây hậu quả, nói rõ chuyện gì vừa xảy ra, ngoài đời sẽ ra sao và cách tránh.
 * Nằm ở góc trên bên trái (không che dụng cụ ở giữa bàn), đóng bằng nút "Đã hiểu"; nút "Làm lại" đưa thí nghiệm về trạng thái ban đầu nếu bài có.
 */
export const IncidentCard: React.FC<{m: Mishap | null; onClose: () => void; onReset?: () => void}> = ({m, onClose, onReset}) => {
  if (!m) return null;
  const danger = m.level === 'danger';
  return (
    <aside role="alertdialog" aria-labelledby="incident-title" data-testid="incident" data-id={m.id} data-level={m.level} className={`absolute left-4 top-24 z-20 w-[min(400px,calc(100vw-440px))] overflow-hidden rounded-2xl border-2 bg-[#FBF9F4]/95 text-xs leading-relaxed text-[#1D1B16] shadow-2xl backdrop-blur ${danger ? 'border-[#C4261A]' : 'border-[#E3B341]'}`}>
      <div className={`flex items-center gap-2 px-4 py-2 text-white ${danger ? 'bg-[#C4261A]' : 'bg-[#B8860B]'}`}>
        <span aria-hidden className="text-base">⚠</span>
        <b id="incident-title" className="text-sm font-bold">
          {danger ? 'SỰ CỐ' : 'SAI QUY TRÌNH'}: {m.title}
        </b>
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <p data-testid="incident-what">
          <b className="block text-[11px] font-semibold uppercase tracking-wide text-[#C4261A]">Chuyện gì vừa xảy ra</b>
          {m.what}
        </p>
        <p data-testid="incident-real">
          <b className="block text-[11px] font-semibold uppercase tracking-wide text-[#C4261A]">Ngoài đời thật</b>
          {m.real}
        </p>
        <p data-testid="incident-avoid" className="rounded-xl bg-[#1F7A4D]/[.09] px-3 py-2">
          <b className="block text-[11px] font-semibold uppercase tracking-wide text-[#1F7A4D]">Cách phòng tránh</b>
          {m.avoid}
        </p>
        <div className="flex gap-2">
          <button type="button" data-testid="incident-ok" onClick={onClose} className="min-h-[44px] rounded-full border border-[#1D1B16] bg-[#1D1B16] px-5 font-semibold text-[#F3EFE6]">
            Đã hiểu
          </button>
          {onReset && (
            <button type="button" data-testid="incident-reset" onClick={() => { onReset(); onClose(); }} className="min-h-[44px] rounded-full border border-[#1D1B16]/25 bg-white px-5 font-semibold">
              Làm lại thí nghiệm
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
