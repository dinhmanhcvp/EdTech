'use client';

import React, {useEffect, useState} from 'react';
import {SimulationWidget} from '../../components/canvas/SimulationWidget';
import {PRESETS, isLabTemplate, labHref, makePresetBlueprint} from '../../utils/presets';

/**
 * Một mô phỏng đứng riêng, không có bảng viết: `/xem?id=<mã preset>`. App học sinh nhúng trang này (iframe) ở tab "Học theo SGK".
 * Bài thực hành thì chuyển sang `/lab?bai=` để luôn dựng 3D.
 */
export default function ViewSimPage() {
  // đọc ?id sau khi gắn: tránh lệch HTML giữa máy chủ và trình duyệt
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('id') ?? '';
    if (Object.prototype.hasOwnProperty.call(PRESETS, raw) && isLabTemplate(raw)) {
      window.location.replace(labHref(raw));
      return;
    }
    setId(raw);
  }, []);

  if (id === null) return <main className="min-h-screen bg-white" />;
  if (!Object.prototype.hasOwnProperty.call(PRESETS, id)) {
    return <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-slate-600">Không tìm thấy mô phỏng “{id}”.</main>;
  }
  return (
    <main className="min-h-screen bg-white p-2 sm:p-4">
      <SimulationWidget blueprint={makePresetBlueprint(id)} />
    </main>
  );
}
