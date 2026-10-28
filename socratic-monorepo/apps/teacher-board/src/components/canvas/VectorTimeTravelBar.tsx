'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, History, Pause, Play, X } from 'lucide-react';
import {
  VectorJournalPlayer,
  reconstructBoardState,
  type BoardJournalData,
  type PlayerState,
} from '../../utils/vectorJournal';
import { drawBoardState, BOARD_W, BOARD_H } from '../../utils/journalRender';
import { parseSocr, serializeSocr } from '../../utils/socrFile';

interface Props {
  /** lấy bản ghi hiện tại của tiết học */
  getJournal: () => BoardJournalData;
  /** số sự kiện đã ghi; chỉ để cập nhật nhãn nút */
  eventCount: number;
}

const SPEEDS = [1, 2, 4];

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Thanh tua lại bài giảng: phát/tạm dừng/kéo mốc thời gian trên nhật ký vector.
 * Nét được dựng lại trên một lớp phủ riêng, bảng thật không bị thay đổi.
 */
export const VectorTimeTravelBar: React.FC<Props> = ({ getJournal, eventCount }) => {
  const [open, setOpen] = useState(false);
  const [journal, setJournal] = useState<BoardJournalData | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [loaded, setLoaded] = useState<BoardJournalData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const playerRef = useRef<VectorJournalPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const data = loaded ?? getJournal();
    const player = new VectorJournalPlayer(data);
    playerRef.current = player;
    setJournal(data);
    setState({ currentTime: 0, duration: player.getDuration(), progress: 0, isPlaying: false, speed: 1 });
    const off = player.onStateChange(setState);
    return () => {
      off();
      player.destroy();
      playerRef.current = null;
    };
  }, [open, getJournal, loaded]);

  const board = useMemo(() => {
    if (!journal || !state) return null;
    return reconstructBoardState(journal.events.filter((e) => e.t <= state.currentTime));
  }, [journal, state?.currentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx || !board) return;
    drawBoardState(ctx, board);
  }, [board]);

  if (!open) {
    return (
      <button
        data-testid="journal-open"
        onClick={() => setOpen(true)}
        title="Tua lại bài giảng"
        className="absolute left-3 bottom-3 z-30 pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
      >
        <History className="w-3.5 h-3.5" />
        Tua lại{eventCount > 0 ? ` · ${eventCount}` : ''}
      </button>
    );
  }

  const player = playerRef.current;

  const save = () => {
    const data = loaded ?? getJournal();
    const url = URL.createObjectURL(new Blob([serializeSocr(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bai-giang-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.socr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setLoaded(parseSocr(await f.text()));
      setNotice(`Đã mở ${f.name}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không mở được tệp.');
    }
  };

  const empty = !state || state.duration === 0;

  return (
    <>
      <canvas
        data-testid="journal-replay-canvas"
        ref={canvasRef}
        width={BOARD_W}
        height={BOARD_H}
        className="absolute inset-0 z-20 w-full h-full pointer-events-auto"
      />
      <div
        data-testid="journal-bar"
        className="absolute left-3 right-3 bottom-3 z-30 pointer-events-auto flex items-center gap-3 rounded-xl bg-white/95 backdrop-blur border border-[#DCD9D0] shadow-md px-3 py-2"
      >
        <button
          data-testid="journal-play"
          disabled={empty}
          onClick={() => (state?.isPlaying ? player?.pause() : player?.play())}
          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40"
          title={state?.isPlaying ? 'Tạm dừng' : 'Phát'}
        >
          {state?.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <input
          data-testid="journal-scrub"
          type="range"
          min={0}
          max={Math.max(1, state?.duration ?? 0)}
          value={state?.currentTime ?? 0}
          disabled={empty}
          onChange={(e) => player?.seek(Number(e.target.value))}
          className="flex-1"
          aria-label="Mốc thời gian bài giảng"
        />
        <span data-testid="journal-time" className="text-[11px] font-mono text-stone-600 tabular-nums">
          {empty ? 'Chưa có nét nào' : `${fmt(state!.currentTime)} / ${fmt(state!.duration)}`}
        </span>
        <button
          data-testid="journal-speed"
          onClick={() => {
            const i = SPEEDS.indexOf(state?.speed ?? 1);
            player?.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
          }}
          className="text-[11px] font-mono px-2 py-1 rounded-md border border-[#DCD9D0] text-stone-700"
        >
          {state?.speed ?? 1}×
        </button>
        {notice && (
          <span data-testid="journal-notice" className="text-[11px] text-stone-500 max-w-[180px] truncate">
            {notice}
          </span>
        )}
        <button data-testid="journal-save" onClick={save} disabled={empty} title="Lưu .socr" className="text-stone-500 hover:text-stone-800 disabled:opacity-40">
          <Download className="w-4 h-4" />
        </button>
        <button data-testid="journal-load" onClick={() => fileRef.current?.click()} title="Mở .socr" className="text-stone-500 hover:text-stone-800">
          <FolderOpen className="w-4 h-4" />
        </button>
        <input ref={fileRef} data-testid="journal-file" type="file" accept=".socr,application/json" className="hidden" onChange={onFile} />
        <button
          data-testid="journal-close"
          onClick={() => {
            setOpen(false);
            setLoaded(null);
            setNotice(null);
          }}
          className="text-stone-400 hover:text-stone-700"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};
