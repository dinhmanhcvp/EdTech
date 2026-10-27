'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, Radio, ScanLine, Sparkles, Settings2 } from 'lucide-react';
import { AiBackendConfigModal } from './AiBackendConfigModal';

type HealthPayload = {
  status?: string;
  runtime?: {
    rapidocr?: boolean;
    latex_onnx?: boolean;
    chromadb?: boolean;
    gemini_configured?: boolean;
    classroom_rooms?: number;
    classroom_students?: number;
  };
  engines_active?: string[];
};

type RailState = 'checking' | 'online' | 'degraded' | 'offline';

const backendUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('backend_url');
    if (saved) return saved.replace(/\/+$/, '');
  }
  const configured = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  return (configured || 'http://127.0.0.1:8000').replace(/\/+$/, '');
};

export const EngineHealthRail: React.FC = () => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [state, setState] = useState<RailState>('checking');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setHealth(data);
      const runtime = data.runtime;
      const hasLocalKey = typeof window !== 'undefined' && Boolean(window.localStorage.getItem('gemini_api_key'));
      const isGeminiReady = Boolean(runtime?.gemini_configured || hasLocalKey);
      const isLocalOnnxReady = Boolean(runtime?.latex_onnx || runtime?.rapidocr);

      if (!isGeminiReady && !isLocalOnnxReady) {
        setState('degraded');
      } else {
        setState('online');
      }
    } catch {
      setState('offline');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const runCheck = async () => {
      if (!cancelled) await check();
    };
    void runCheck();
    const timer = window.setInterval(runCheck, 15000);

    const onOpen = () => setIsModalOpen(true);
    const onUpdated = () => void runCheck();

    window.addEventListener('open-ai-backend-config', onOpen);
    window.addEventListener('backend_config_updated', onUpdated);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('open-ai-backend-config', onOpen);
      window.removeEventListener('backend_config_updated', onUpdated);
    };
  }, []);

  const engineCount = health?.engines_active?.length ?? 0;
  const statusCopy = useMemo(() => {
    if (state === 'online') {
      if (health?.runtime?.latex_onnx) return 'Neural ONNX Offline · Sẵn sàng';
      return 'AI Vision sẵn sàng · Gemini 2.5';
    }
    if (state === 'degraded') return 'Backend OK · Cần khóa Gemini';
    if (state === 'checking') return 'Đang bắt tay backend...';
    return 'Render ngủ / Ngoại tuyến';
  }, [state, health]);

  const StatusIcon = state === 'offline' ? AlertTriangle : state === 'degraded' ? AlertTriangle : state === 'checking' ? Activity : CheckCircle2;
  const statusColor = state === 'online' ? 'text-emerald-700' : state === 'checking' ? 'text-blue-700' : state === 'degraded' ? 'text-amber-700' : 'text-rose-700';

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
        title="Nhấp để kiểm tra và cấu hình kết nối AI Backend (Render / Gemini API)"
        className="pointer-events-auto cursor-pointer fixed right-4 top-12 z-40 hidden xl:flex items-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 py-2 shadow-[0_12px_35px_-18px_rgba(24,24,27,0.55)] backdrop-blur-xl hover:bg-white hover:border-violet-300 hover:shadow-lg transition-all group select-none"
      >
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
        <div className="pl-1 border-l border-stone-200 text-stone-400 group-hover:text-violet-600 transition" title="Cấu hình kết nối">
          <Settings2 className="h-3.5 w-3.5" />
        </div>
      </div>

      <AiBackendConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void check()}
      />
    </>
  );
};
