'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, Radio, ScanLine, Sparkles, Settings2 } from 'lucide-react';
import { AiBackendConfigModal } from './AiBackendConfigModal';
import { apiBase } from '../../utils/apiBase';

type HealthPayload = {
  status?: string;
  runtime?: {
    rapidocr?: boolean;
    latex_onnx?: boolean;
    chromadb?: boolean;
    gemini_configured?: boolean;
    key_pool?: {
      gemini_total?: number;
      gemini_active?: number;
      openrouter_total?: number;
      openrouter_active?: number;
      total_active?: number;
    };
    classroom_rooms?: number;
    classroom_students?: number;
  };
  engines_active?: string[];
};

type RailState = 'checking' | 'online' | 'degraded' | 'offline';

const backendUrl = () => apiBase();

export const EngineHealthRail: React.FC = () => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [state, setState] = useState<RailState>('checking');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // /?clean=1: ẩn thanh chẩn đoán khi quay video/trình chiếu; vẫn mở được hộp cấu hình qua sự kiện
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(new URLSearchParams(window.location.search).has('clean'));
  }, []);

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
      {!hidden && (
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
        {health?.runtime?.key_pool && ((health.runtime.key_pool.gemini_total || 0) + (health.runtime.key_pool.openrouter_total || 0)) > 1 && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-200" title="Bể khóa AI đang xoay vòng">
            <span>⚡ {health.runtime.key_pool.total_active ?? 0} keys</span>
          </div>
        )}
        <div className="pl-1 border-l border-stone-200 text-stone-400 group-hover:text-violet-600 transition" title="Cấu hình kết nối">
          <Settings2 className="h-3.5 w-3.5" />
        </div>
      </div>
      )}

      <AiBackendConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void check()}
      />
    </>
  );
};
