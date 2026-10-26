'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, Radio, ScanLine, Sparkles } from 'lucide-react';

type HealthPayload = {
  status?: string;
  runtime?: {
    rapidocr?: boolean;
    chromadb?: boolean;
    gemini_configured?: boolean;
    classroom_rooms?: number;
    classroom_students?: number;
  };
  engines_active?: string[];
};

type RailState = 'checking' | 'online' | 'degraded' | 'offline';

const backendUrl = () => {
  const configured = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  return (configured || 'http://127.0.0.1:8000').replace(/\/+$/, '');
};

export const EngineHealthRail: React.FC = () => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [state, setState] = useState<RailState>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        let response: Response;
        try {
          response = await fetch('/health', { cache: 'no-store' });
        } catch {
          response = await fetch(`${backendUrl()}/health`, { cache: 'no-store' });
        }
        if (!response.ok) throw new Error(`health_${response.status}`);
        const data = (await response.json()) as HealthPayload;
        if (cancelled) return;
        setHealth(data);
        const runtime = data.runtime;
        setState(runtime && runtime.rapidocr === false ? 'degraded' : 'online');
      } catch {
        if (!cancelled) setState('offline');
      }
    };
    void check();
    const timer = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const engineCount = health?.engines_active?.length ?? 0;
  const statusCopy = useMemo(() => ({
    checking: 'Đang bắt tay backend',
    online: 'AI Engine sẵn sàng',
    degraded: 'AI Engine chạy chế độ dự phòng',
    offline: 'Đang chạy offline',
  }[state]), [state]);
  const StatusIcon = state === 'offline' || state === 'degraded' ? AlertTriangle : state === 'checking' ? Activity : CheckCircle2;
  const statusColor = state === 'online' ? 'text-emerald-700' : state === 'checking' ? 'text-blue-700' : 'text-amber-700';

  return (
    <div className="pointer-events-none fixed right-4 top-12 z-40 hidden xl:flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-2.5 py-2 shadow-[0_12px_35px_-18px_rgba(24,24,27,0.55)] backdrop-blur-xl">
      <div className={`flex items-center gap-1.5 pr-2 border-r border-stone-200 text-[10px] font-mono font-semibold ${statusColor}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        <span>{statusCopy}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-600" title="Engine registrations">
        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
        <span>{engineCount || '—'} engines</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-600" title="OCR and semantic cache">
        <ScanLine className={`h-3.5 w-3.5 ${health?.runtime?.rapidocr ? 'text-cyan-600' : 'text-stone-400'}`} />
        <Database className={`h-3.5 w-3.5 ${health?.runtime?.chromadb ? 'text-indigo-600' : 'text-stone-400'}`} />
      </div>
      <div className="flex items-center gap-1 text-[10px] font-mono text-stone-500" title="Live classroom connections">
        <Radio className="h-3.5 w-3.5 text-rose-500" />
        <span>{health?.runtime?.classroom_students ?? 0}</span>
      </div>
    </div>
  );
};
