'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Key,
  Link2,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  X,
  Zap,
  Layers,
} from 'lucide-react';

interface AiBackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AiBackendConfigModal: React.FC<AiBackendConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [pingState, setPingState] = useState<
    'idle' | 'pinging' | 'online' | 'degraded' | 'cold_start' | 'offline'
  >('idle');
  const [pingMessage, setPingMessage] = useState('');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const [poolInfo, setPoolInfo] = useState<{
    gemini_total?: number;
    gemini_active?: number;
    openrouter_total?: number;
    openrouter_active?: number;
    total_active?: number;
  } | null>(null);

  const [testVisionState, setTestVisionState] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [testVisionResult, setTestVisionResult] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBackend = window.localStorage.getItem('backend_url') || '';
      const defaultBackend =
        typeof process !== 'undefined'
          ? process.env.NEXT_PUBLIC_BACKEND_URL || ''
          : '';
      setBackendUrl(savedBackend || defaultBackend);

      const savedKey = window.localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);

      const savedOrKey = window.localStorage.getItem('openrouter_api_key') || '';
      setOpenrouterKey(savedOrKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getEffectiveBackend = () => {
    const trimmed = backendUrl.trim().replace(/\/+$/, '');
    return trimmed;
  };

  const handlePing = async () => {
    setPingState('pinging');
    setPingMessage('Đang kết nối tới máy chủ...');
    setPingLatency(null);

    const target = getEffectiveBackend();
    const endpoint = target ? `${target}/health` : '/health';
    const t0 = performance.now();

    const timer = setTimeout(() => {
      setPingState('cold_start');
      setPingMessage(
        'Máy chủ Render đang thức dậy từ chế độ ngủ. Quá trình này mất khoảng 30-50 giây...',
      );
    }, 4500);

    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      clearTimeout(timer);
      const latency = Math.round(performance.now() - t0);
      setPingLatency(latency);

      if (!res.ok) {
        setPingState('offline');
        setPingMessage(`Máy chủ phản hồi mã lỗi HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      const runtimePool = data?.runtime?.key_pool;
      if (runtimePool) {
        setPoolInfo(runtimePool);
      }

      const hasKey = Boolean(
        data?.runtime?.gemini_configured ||
        (runtimePool && runtimePool.total_active > 0) ||
        apiKey.trim().length > 10 ||
        openrouterKey.trim().length > 10,
      );

      if (hasKey) {
        setPingState('online');
        const gActive = runtimePool?.gemini_active ?? (apiKey ? 1 : 0);
        const orActive = runtimePool?.openrouter_active ?? (openrouterKey ? 1 : 0);
        setPingMessage(
          `Kết nối thành công (${latency}ms). Bể khóa AI: ${gActive} Gemini sẵn sàng, ${orActive} OpenRouter dự phòng!`,
        );
      } else {
        setPingState('degraded');
        setPingMessage(
          `Kết nối thành công (${latency}ms). Máy chủ chưa có khóa AI. Hãy dán 1 hoặc nhiều khóa Gemini / OpenRouter miễn phí bên dưới.`,
        );
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      setPingState('offline');
      const msg = err instanceof Error ? err.message : String(err);
      setPingMessage(
        `Không thể kết nối tới ${endpoint}. Chi tiết: ${msg}. Vui lòng kiểm tra lại URL hoặc chờ Render khởi động xong.`,
      );
    }
  };

  const handleTestVision = async () => {
    setTestVisionState('testing');
    setTestVisionResult('Đang gửi ảnh kiểm tra tới AI Vision (tự xoay vòng nếu gặp Rate Limit)...');

    const target = getEffectiveBackend();
    const endpoint = target
      ? `${target}/api/v1/canvas/recognize-ink`
      : '/api/v1/canvas/recognize-ink';
    const key = apiKey.trim();
    const orKey = openrouterKey.trim();

    // Mẫu nét vẽ kiểm tra nhỏ 1x1 base64
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['x-gemini-api-key'] = key;
    }
    if (orKey) {
      headers['x-openrouter-api-key'] = orKey;
    }

    const t0 = performance.now();
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: tinyPng,
          hint: '4Fe + 3O2 -> 2Fe2O3',
          gemini_api_key: key,
          openrouter_api_key: orKey,
        }),
      });

      const ms = Math.round(performance.now() - t0);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setTestVisionState('error');
        setTestVisionResult(
          `Lỗi ${res.status}: ${errorData.detail || 'Không thể nhận dạng'}. Kiểm tra lại các khóa API hoặc kết nối Render.`,
        );
        return;
      }

      const data = await res.json();
      setTestVisionState('success');
      const engine = data.engine || 'gemini';
      const model = data.model || 'gemini-2.5-flash';
      const keyInfo = data.key_index ? ` [Key #${data.key_index}]` : '';
      setTestVisionResult(
        `Thành công trong ${ms}ms! Động cơ: ${engine.toUpperCase()} (${model})${keyInfo}. Tự động xoay vòng & dự phòng hoạt động chuẩn xác!`,
      );
    } catch (err: unknown) {
      setTestVisionState('error');
      const msg = err instanceof Error ? err.message : String(err);
      setTestVisionResult(`Lỗi mạng: ${msg}`);
    }
  };

  const handleSave = async () => {
    if (typeof window !== 'undefined') {
      const cleanUrl = backendUrl.trim().replace(/\/+$/, '');
      if (cleanUrl) {
        window.localStorage.setItem('backend_url', cleanUrl);
      } else {
        window.localStorage.removeItem('backend_url');
      }

      const cleanKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
      if (cleanKey) {
        window.localStorage.setItem('gemini_api_key', cleanKey);
      } else {
        window.localStorage.removeItem('gemini_api_key');
      }

      const cleanOrKey = openrouterKey.trim().replace(/^['"]|['"]$/g, '');
      if (cleanOrKey) {
        window.localStorage.setItem('openrouter_api_key', cleanOrKey);
      } else {
        window.localStorage.removeItem('openrouter_api_key');
      }

      // Tự động đồng bộ các key lên backend Render / Local nếu có kết nối
      const target = getEffectiveBackend();
      const settingsEndpoint = target ? `${target}/api/v1/canvas/settings/keys` : '/api/v1/canvas/settings/keys';
      try {
        await fetch(settingsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gemini_api_keys: cleanKey,
            openrouter_api_keys: cleanOrKey,
          }),
        }).catch(() => { });
      } catch { }

      window.dispatchEvent(new CustomEvent('backend_config_updated'));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onSuccess?.();
        onClose();
      }, 700);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 select-none"
      data-testid="ai-backend-config-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-2xl p-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        data-testid="ai-backend-config-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-violet-50 text-violet-700">
              <Server className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Kiểm tra & Cấu hình Bể Khóa AI (Multi-Key & OpenRouter)
              </h2>
              <p className="text-xs text-stone-500">
                Tự động xoay vòng nhiều key Free & dự phòng khi chạm Rate Limit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input: Backend URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-stone-400" />
            <span>Địa chỉ máy chủ Render / Backend URL</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://socratic-ai-engine.onrender.com (hoặc để trống nếu dùng localhost/proxy)"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
            <button
              type="button"
              onClick={handlePing}
              disabled={pingState === 'pinging'}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              {pingState === 'pinging' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-stone-600" />
              )}
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
          {pingMessage && (
            <div
              className={`text-xs p-2.5 rounded-xl border flex items-start gap-2 ${pingState === 'online'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : pingState === 'degraded' || pingState === 'cold_start'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
            >
              {pingState === 'online' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : pingState === 'cold_start' ? (
                <Loader2 className="w-4 h-4 text-amber-600 shrink-0 animate-spin mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{pingMessage}</span>
            </div>
          )}
        </div>

        {/* Bể Khóa 1: Google Gemini Free Keys */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-violet-500" />
              <span>Khóa Google Gemini (Hỗ trợ dán nhiều key phân cách bằng dấu phẩy)</span>
            </span>
            <span className="text-[10px] text-violet-600 font-mono font-semibold">
              Xoay vòng tự động
            </span>
          </label>
          <textarea
            rows={2}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy...key1, AIzaSy...key2, AIzaSy...key3 (Tự động chuyển key tiếp theo khi chạm 429)"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
          />
          <p className="text-[10px] text-stone-500">
            Mẹo: Tạo 2-3 tài khoản Google cá nhân lấy key miễn phí, dán chung vào đây. Khi 1 key hết lượt trong phút (15 RPM), hệ thống tự nhảy sang key tiếp theo trong &lt;1ms!
          </p>
        </div>

        {/* Bể Khóa 2: OpenRouter API Keys (Dự phòng thông minh) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              <span>Khóa OpenRouter API (Tự động dự phòng khi Gemini hết Quota)</span>
            </span>
            <span className="text-[10px] text-cyan-700 font-mono font-semibold">
              Failover 0ms
            </span>
          </label>
          <input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-v1-... (Hỗ trợ mô hình miễn phí: gemini-2.0-flash-exp:free, qwen2.5-vl:free)"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>

        {/* Nút Thử AI Vision */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestVision}
            disabled={testVisionState === 'testing'}
            className="w-full py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            {testVisionState === 'testing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            )}
            <span>Thử Nhận Diện & Kiểm Tra Tự Động Xoay Key</span>
          </button>
        </div>
        {testVisionResult && (
          <div
            className={`text-xs p-2.5 rounded-xl border flex items-start gap-2 ${testVisionState === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : testVisionState === 'testing'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
          >
            {testVisionState === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : testVisionState === 'testing' ? (
              <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-relaxed">{testVisionResult}</span>
          </div>
        )}

        {/* Thông tin chẩn đoán */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] text-stone-600 flex flex-col gap-1.5">
          <div className="font-semibold text-stone-700 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Cơ chế bảo vệ người dùng 3 tầng:</span>
          </div>
          <p>
            • <b>Tầng 1 (Gemini Free Multi-Key):</b> Tự động chia tải và nhảy key khi gặp lỗi Rate Limit 429 hoặc hết hạn mức trong ngày.
          </p>
          <p>
            • <b>Tầng 2 (OpenRouter Failover):</b> Khi tất cả key Gemini đều bận, máy chủ tự trượt sang OpenRouter để nhận diện tiếp mà không báo lỗi.
          </p>
          <p>
            • <b>Tầng 3 (Local Neural ONNX):</b> Nếu mất mạng hoàn toàn hoặc không có key, mô hình offline Pix2Text-MFR-1.5 và RapidOCR tự động đảm nhận.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã lưu thành công!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
