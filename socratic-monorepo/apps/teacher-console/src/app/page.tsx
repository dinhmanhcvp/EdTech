'use client';

import React from 'react';
import {STAGES, Shell, useConsole} from '../components/Shell';
import {StageAfter} from '../components/cockpit/StageAfter';
import {StageBefore} from '../components/cockpit/StageBefore';
import {StageLive} from '../components/cockpit/StageLive';

const SUBTITLE = {
  before: 'Số liệu học sau giờ của lớp và kịch bản của tiết kế tiếp.',
  live: 'Ghép bảng, theo dõi học sinh vào lớp, thu bài và chữa trên bảng.',
  after: 'Học sinh nào đang mắc kẹt ở kiến thức nào, và vì sao.',
};

/** Tổng quan xoay quanh ba trạng thái của một tiết dạy; đổi bằng thanh gạt trên đầu trang hoặc phím 1, 2, 3. */
function Cockpit() {
  const {stage} = useConsole();
  const label = STAGES.find((s) => s.key === stage)?.label;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">{label}</h1>
        <p className="text-sm text-mute">{SUBTITLE[stage]}</p>
      </div>
      {stage === 'before' && <StageBefore />}
      {stage === 'live' && <StageLive />}
      {stage === 'after' && <StageAfter />}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Cockpit />
    </Shell>
  );
}
