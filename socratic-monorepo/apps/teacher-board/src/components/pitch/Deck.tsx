'use client';
// Bộ slide trình bày AXIOMA: sân khấu cố định 1920×1080 co giãn theo cửa sổ.
// Phím: → / Space tới, ← lùi, F toàn màn hình. In (Ctrl+P) ra PDF vector, mỗi slide một trang 16:9.
import React, {useCallback, useEffect, useState} from 'react';
import {SLIDES} from './slides';

export default function Deck() {
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(1);
  const total = SLIDES.length;

  const go = useCallback((d: number) => setI((x) => Math.min(total - 1, Math.max(0, x + d))), [total]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      } else if (e.key === 'Home') setI(0);
      else if (e.key === 'End') setI(total - 1);
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', key);
    };
  }, [go, total]);

  const Cur = SLIDES[i];
  return (
    <>
      <style>{`
        .pitch-screen { position: fixed; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .pitch-print { display: none; }
        .pitch-nav { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; opacity: 0.35; transition: opacity .2s; }
        .pitch-nav:hover { opacity: 1; }
        .pitch-nav button { width: 10px; height: 10px; border-radius: 5px; border: 0; background: #FFF; cursor: pointer; padding: 0; }
        .pitch-live:hover { background: #E5E5E5 !important; }
        .pitch-body > :last-child:not([style*='absolute']) { margin-top: auto !important; margin-bottom: auto; }
        @page { size: 1920px 1080px; margin: 0; }
        @media print {
          html, body { background: #000 !important; }
          .pitch-screen, .pitch-nav { display: none !important; }
          .pitch-print { display: block; }
          .pitch-print > div { break-after: page; page-break-after: always; }
        }
      `}</style>
      <div className="pitch-screen" onClick={(e) => go(e.clientX > window.innerWidth / 2 ? 1 : -1)}>
        <div style={{width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'center', flex: 'none', boxShadow: '0 30px 80px rgba(24,24,27,0.18)'}}>
          <Cur n={i + 1} total={total} />
        </div>
      </div>
      <div className="pitch-nav">
        {SLIDES.map((_, k) => (
          <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} style={{opacity: k === i ? 1 : 0.3}} />
        ))}
      </div>
      <div className="pitch-print">
        {SLIDES.map((S, k) => (
          <div key={k}>
            <S n={k + 1} total={total} />
          </div>
        ))}
      </div>
    </>
  );
}
