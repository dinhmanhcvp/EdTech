import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { diffStrokesToEvents, diffSimEvents } from '../utils/journalDiff';
import { drawBoardState } from '../utils/journalRender';
import { parseSocr, serializeSocr } from '../utils/socrFile';
import { reconstructBoardState, type BoardJournalData } from '../utils/vectorJournal';
import type { Stroke } from '../utils/lassoGeometry';
import { VectorTimeTravelBar } from '../components/canvas/VectorTimeTravelBar';

const mk = (id: string, n = 14, dx = 0): Stroke => ({
  id,
  color: '#18181B',
  width: 3.5,
  points: Array.from({ length: n }, (_, i) => ({ x: 10 + i * 5 + dx, y: 20 + i })),
});

const toData = (events: ReturnType<typeof diffStrokesToEvents>): BoardJournalData => {
  const full = events.map((e) => ({ ...e, t: e.t ?? 0 })) as BoardJournalData['events'];
  return {
    header: { version: '2.0.0', createdAt: 0, durationMs: full[full.length - 1]?.t ?? 0, eventCount: full.length },
    events: full,
  };
};

describe('journalDiff', () => {
  it('rebuilds a newly drawn stroke point for point', () => {
    const s = mk('a');
    const ev = diffStrokesToEvents([], [s], 1000, 2000);
    const board = reconstructBoardState(ev as any);
    expect(board.strokes).toHaveLength(1);
    expect(board.strokes[0].points.map((p) => [p.x, p.y])).toEqual(s.points.map((p) => [p.x, p.y]));
  });

  it('spreads drawing over the elapsed time so scrubbing shows partial ink', () => {
    const ev = diffStrokesToEvents([], [mk('a', 30)], 0, 1000);
    const mid = reconstructBoardState(ev.filter((e) => (e.t ?? 0) <= 500) as any);
    expect(mid.strokes[0].points.length).toBeGreaterThan(1);
    expect(mid.strokes[0].points.length).toBeLessThan(30);
  });

  it('records erase, move and clear', () => {
    const a = mk('a');
    const b = mk('b');
    const erased = diffStrokesToEvents([a, b], [a], 0, 10);
    expect(erased).toEqual([{ type: 'ERASE_STROKE', strokeId: 'b', t: 10 }]);

    const moved = diffStrokesToEvents([a], [mk('a', 14, 100)], 0, 10);
    const board = reconstructBoardState([...(diffStrokesToEvents([], [a], 0, 5) as any), ...(moved as any)]);
    expect(board.strokes).toHaveLength(1);
    expect(board.strokes[0].points[0].x).toBe(110);

    expect(diffStrokesToEvents([a, b], [], 0, 10)).toEqual([{ type: 'CLEAR_CANVAS', t: 10 }]);
  });

  it('ignores strokes that did not change', () => {
    const a = mk('a');
    expect(diffStrokesToEvents([a], [a, mk('b')].slice(0, 1), 0, 1)).toEqual([]);
  });

  it('records a typeset formula and a shape as objects, and ink→formula swap', () => {
    const ink = mk('ink');
    const formula: Stroke = {
      id: 'f',
      color: '#111',
      width: 3,
      points: [{ x: 50, y: 60 }],
      typeset: { latex: 'x^2', text: 'x²', size: 30, w: 40, h: 30 },
    };
    const shape: Stroke = {
      id: 's',
      color: '#111',
      width: 3,
      points: [{ x: 300, y: 100 }],
      typeset: { latex: '', text: '', size: 1, w: 100, h: 80 },
      shape: { kind: 'plane', title: 'Tam giác', plane: { verts: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 60 }], euler: false } },
    };
    const ev = [
      ...(diffStrokesToEvents([], [ink], 0, 5) as any),
      ...(diffStrokesToEvents([ink], [formula, shape], 5, 9) as any),
    ];
    const board = reconstructBoardState(ev);
    expect(board.strokes).toHaveLength(0);
    expect(board.objects.map((o) => o.id)).toEqual(['f', 's']);
    expect(board.objects[0].typeset?.text).toBe('x²');
    expect(board.objects[1].shape?.plane?.verts).toHaveLength(3);

    const gone = reconstructBoardState([...ev, ...(diffStrokesToEvents([formula, shape], [shape], 10, 11) as any)]);
    expect(gone.objects.map((o) => o.id)).toEqual(['s']);
    const cleared = reconstructBoardState([...ev, { type: 'CLEAR_CANVAS', t: 12 } as any]);
    expect(cleared.objects).toHaveLength(0);
  });

  it('tracks a simulation spawning, being replaced and closing', () => {
    const s1 = diffSimEvents(null, { id: 'sim-1', template: 'PHYS_PENDULUM', x: 580, y: 35 }, 3);
    const s2 = diffSimEvents('sim-1', { id: 'sim-2', template: 'MATH_GRAPH', x: 580, y: 35 }, 6);
    const s3 = diffSimEvents('sim-2', null, 9);
    expect(diffSimEvents('sim-2', { id: 'sim-2', template: 'x', x: 0, y: 0 }, 1)).toEqual([]);
    const at = (n: number, evs: any[]) => reconstructBoardState(evs.filter((e) => e.t <= n)).simulations;
    const all = [...s1, ...s2, ...s3];
    expect([...at(4, all).keys()]).toEqual(['sim-1']);
    expect([...at(7, all).keys()]).toEqual(['sim-2']);
    expect(at(10, all).size).toBe(0);
  });
});

describe('journalRender', () => {
  it('draws strokes, formula text, shape edges and simulation tags', () => {
    const calls: string[] = [];
    const ctx: any = new Proxy(
      {},
      {
        get: (_t, k: string) => (k === 'setLineDash' ? () => undefined : (...a: any[]) => calls.push(`${k}:${a[0] ?? ''}`)),
        set: () => true,
      },
    );
    const board = reconstructBoardState([
      ...(diffStrokesToEvents([], [mk('a')], 0, 5) as any),
      { type: 'ADD_OBJECT', strokeId: 'f', x: 5, y: 5, color: '#000', typeset: { latex: 'x', text: 'x²', size: 30, w: 1, h: 1 }, t: 6 },
      { type: 'SPAWN_SIM', id: 's', template: 'PHYS_PENDULUM', x: 10, y: 10, scale: 1, t: 7 },
    ] as any);
    drawBoardState(ctx, board);
    expect(calls).toContain('fillText:x²');
    expect(calls).toContain('fillText:Mô phỏng: PHYS_PENDULUM');
    expect(calls.filter((c) => c.startsWith('lineTo')).length).toBeGreaterThan(10);
  });
});

describe('.socr file', () => {
  it('round-trips a journal', () => {
    const data = toData(diffStrokesToEvents([], [mk('a', 20)], 0, 2000));
    const back = parseSocr(serializeSocr(data));
    expect(back.events).toEqual(data.events);
    expect(back.header.durationMs).toBe(2000);
  });

  it('rejects garbage and drops malformed events', () => {
    expect(() => parseSocr('not json')).toThrow(/JSON/);
    expect(() => parseSocr('{"x":1}')).toThrow(/sự kiện/);
    expect(() => parseSocr(JSON.stringify({ events: [{ type: 'HACK', t: 1 }] }))).toThrow(/hợp lệ/);
    const ok = parseSocr(JSON.stringify({ events: [{ type: 'CLEAR_CANVAS', t: 5 }, { type: 'X', t: 1 }, { type: 'CLEAR_CANVAS', t: -1 }] }));
    expect(ok.events).toHaveLength(1);
  });
});

describe('VectorTimeTravelBar', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
  });

  const journal = toData(diffStrokesToEvents([], [mk('a', 20)], 0, 2000));

  it('shows an empty state before anything is written', () => {
    render(<VectorTimeTravelBar eventCount={0} getJournal={() => toData([])} />);
    fireEvent.click(screen.getByTestId('journal-open'));
    expect(screen.getByTestId('journal-time').textContent).toMatch(/Chưa có nét/);
    expect((screen.getByTestId('journal-play') as HTMLButtonElement).disabled).toBe(true);
  });

  it('scrubs to a timestamp and reports it', () => {
    render(<VectorTimeTravelBar eventCount={journal.events.length} getJournal={() => journal} />);
    fireEvent.click(screen.getByTestId('journal-open'));
    expect(screen.getByTestId('journal-time').textContent).toBe('0:00 / 0:02');
    act(() => {
      fireEvent.change(screen.getByTestId('journal-scrub'), { target: { value: '1000' } });
    });
    expect(screen.getByTestId('journal-time').textContent).toBe('0:01 / 0:02');
  });

  it('closes back to the launcher button', () => {
    render(<VectorTimeTravelBar eventCount={3} getJournal={() => journal} />);
    fireEvent.click(screen.getByTestId('journal-open'));
    fireEvent.click(screen.getByTestId('journal-close'));
    expect(screen.getByTestId('journal-open').textContent).toContain('3');
  });
});
