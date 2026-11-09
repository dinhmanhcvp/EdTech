'use client';

import { useEffect, useState } from 'react';

/** Chia phổ âm (dải giọng nói, nửa dưới của phổ) thành `bars` nhóm, mỗi nhóm lấy trung bình, chuẩn hóa về 0–1. */
export function bandLevels(data: ArrayLike<number>, bars: number): number[] {
  const usable = Math.max(bars, Math.floor(data.length * 0.6));
  const per = Math.floor(usable / bars);
  return Array.from({ length: bars }, (_, b) => {
    let sum = 0;
    for (let i = b * per; i < (b + 1) * per; i++) sum += data[i] ?? 0;
    return Math.min(1, sum / per / 255);
  });
}

/**
 * Mức âm thật của micro theo từng thanh (đọc bằng AnalyserNode). Không có micro, bị từ chối quyền hoặc trình duyệt không hỗ trợ
 * thì các thanh đứng yên ở 0: không giả lập chuyển động để tránh làm em tưởng máy đang nghe.
 */
export function useMicLevel(active: boolean, bars = 5): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0));

  useEffect(() => {
    setLevels(Array(bars).fill(0));
    if (!active || typeof window === 'undefined') return;
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!media?.getUserMedia || !AudioCtx) return;

    let stopped = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    media
      .getUserMedia({ audio: true })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        ctx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          setLevels(bandLevels(data, bars));
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {});

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [active, bars]);

  return levels;
}
