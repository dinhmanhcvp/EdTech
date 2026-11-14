import React from 'react';
import {labHref} from '../utils/presets';

/** Thẻ thay cho mô phỏng trên bảng khi bài thuộc phòng thực hành /lab. */
export const LabMoved: React.FC<{id: string; title: string}> = ({id, title}) => (
  <div data-testid="lab-moved" data-preset={id} className="flex flex-col items-start gap-3 rounded-2xl border border-[#1D1B16]/15 bg-white p-5 text-sm text-[#1D1B16]">
    <p className="font-semibold">{title}</p>
    <p>Bài thực hành, thí nghiệm nay làm trong Phòng thực hành ảo (trang riêng, toàn màn hình).</p>
    <a data-testid="lab-moved-link" href={labHref(id)} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-full bg-[#1D1B16] px-5 font-medium text-[#F3EFE6]">
      Mở trong Phòng thực hành
    </a>
  </div>
);
