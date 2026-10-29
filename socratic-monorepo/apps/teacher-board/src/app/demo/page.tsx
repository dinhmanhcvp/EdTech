'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {demoKey, type DemoScene, type DemoState} from '../../utils/demoPlayer';

/**
 * Phát cảnh quay dựng sẵn toàn màn hình, không có nút nào hiện ra.
 * Phím: Space/Enter/PageDown/→ phát (hết cảnh thì sang cảnh sau, dừng ở khung đầu) · PageUp/← cảnh trước · R về đầu cảnh ·
 * 1–9 chọn cảnh · B hoặc . màn đen · F toàn màn hình · H hiện/ẩn tên cảnh (chỉ người điều khiển cần).
 * Chạm: vùng vô hình 110 px ở góc dưới trái = phím phát.
 * URL: /demo?scenes=08,11 (thứ tự riêng) hoặc ?device=phone, ?scene=13 (cảnh bắt đầu).
 */
export default function DemoPage() {
  const [scenes, setScenes] = useState<DemoScene[] | null>(null);
  const [state, setState] = useState<DemoState>({index: 0, count: 0, phase: 'ready'});
  const [help, setHelp] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    fetch('/demo/scenes.json', {cache: 'no-store'}).then((r) => r.json()).then((m: {scenes: DemoScene[]}) => {
      let list = m.scenes;
      const pick = q.get('scenes');
      if (pick) list = pick.split(',').map((id) => list.find((s) => s.id === id.trim())).filter((s): s is DemoScene => !!s);
      const device = q.get('device');
      if (device) list = list.filter((s) => s.device === device);
      const start = Math.max(0, list.findIndex((s) => s.id === q.get('scene')));
      setScenes(list);
      setState({index: start, count: list.length, phase: 'ready'});
    }).catch(() => setScenes([]));
  }, []);

  const press = useCallback((key: string) => setState((s) => demoKey(s, key)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setHelp((v) => !v);
        return;
      }
      e.preventDefault();
      press(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const scene = scenes?.[state.index];

  // đổi cảnh hoặc về đầu: nạp và dừng ở khung đầu; phát khi chuyển sang 'playing'
  useEffect(() => {
    const v = video.current;
    if (!v || !scene) return;
    if (state.phase === 'ready') {
      if (!v.src.endsWith(scene.file)) v.src = scene.file;
      v.pause();
      v.currentTime = 0;
    } else if (state.phase === 'playing') {
      void v.play().catch(() => undefined);
    } else if (state.phase === 'black') {
      v.pause();
    }
  }, [scene, state.phase, state.index]);

  return (
    <main className="fixed inset-0 bg-black" style={{cursor: 'none'}}>
      {scene && (
        <video
          ref={video}
          key={scene.id}
          src={scene.file}
          poster={scene.poster}
          preload="auto"
          playsInline
          muted
          onEnded={() => setState((s) => ({...s, phase: 'ended'}))}
          className="h-full w-full object-contain"
          style={{visibility: state.phase === 'black' ? 'hidden' : 'visible'}}
        />
      )}
      {scenes?.length === 0 && <p className="p-6 text-sm text-stone-500">Chưa có cảnh nào: chạy tools/demo-video/record.py để ghi.</p>}
      {/* vùng chạm vô hình cho bảng cảm ứng / điện thoại */}
      <div aria-hidden onPointerDown={() => press(' ')} className="absolute bottom-0 left-0 h-[110px] w-[110px]" />
      {help && scene && (
        <div className="absolute right-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
          {state.index + 1}/{state.count} · {scene.id} · {scene.title} · {state.phase}
        </div>
      )}
    </main>
  );
}
