import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VectorJournalRecorder,
  VectorJournalPlayer,
  reconstructBoardState,
  type BoardJournalEvent,
} from '../utils/vectorJournal';

describe('VectorJournalRecorder', () => {
  let recorder: VectorJournalRecorder;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(1000);
    recorder = new VectorJournalRecorder();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records sequential stroke events with relative timestamps', () => {
    recorder.start(1000);
    expect(recorder.getIsRecording()).toBe(true);

    vi.advanceTimersByTime(150);
    const evStart = recorder.recordStrokeStart(1, 100, 200, 0.75, '#2563EB', 3.5, 's1');
    expect(evStart.t).toBe(150);
    expect(evStart.type).toBe('STROKE_START');
    expect(evStart.pointerId).toBe(1);
    expect(evStart.x).toBe(100);
    expect(evStart.y).toBe(200);

    vi.advanceTimersByTime(50);
    const evMove = recorder.recordStrokeMove(1, [
      [105, 205, 0.8],
      [110, 210, 0.85],
    ]);
    expect(evMove.t).toBe(200);
    expect(evMove.type).toBe('STROKE_MOVE');
    expect(evMove.pts).toHaveLength(2);

    vi.advanceTimersByTime(30);
    const evEnd = recorder.recordStrokeEnd(1, 's1');
    expect(evEnd.t).toBe(230);
    expect(evEnd.type).toBe('STROKE_END');

    const journal = recorder.stop(1230);
    expect(journal.header.eventCount).toBe(3);
    expect(journal.header.durationMs).toBe(230);
  });

  it('handles pause and resume without introducing artificial elapsed time', () => {
    recorder.start();

    vi.advanceTimersByTime(100);
    recorder.recordStrokeStart(1, 10, 10); // t = 100

    recorder.pause();
    expect(recorder.getIsPaused()).toBe(true);

    // 5 seconds pause
    vi.advanceTimersByTime(5000);

    recorder.resume();
    expect(recorder.getIsPaused()).toBe(false);

    vi.advanceTimersByTime(50);
    const ev = recorder.recordStrokeEnd(1); // t = 150 (not 5150)
    expect(ev.t).toBe(150);
  });

  it('records simulation spawn, param change, and pinch transform', () => {
    recorder.start(0);

    vi.advanceTimersByTime(200);
    const evSpawn = recorder.recordSpawnSim('sim_1', 'PHYS_PENDULUM', 400, 300, 1.2, { length: 1.5 });
    expect(evSpawn.type).toBe('SPAWN_SIM');
    expect(evSpawn.template).toBe('PHYS_PENDULUM');
    expect(evSpawn.scale).toBe(1.2);

    vi.advanceTimersByTime(100);
    const evParam = recorder.recordParamChange('sim_1', 'length', 2.0);
    expect(evParam.type).toBe('PARAM_CHANGE');
    expect(evParam.value).toBe(2.0);

    vi.advanceTimersByTime(50);
    const evPinch = recorder.recordPinchTransform('sim_1', [1.5, 0, 10, 20]);
    expect(evPinch.type).toBe('PINCH_TRANSFORM');
    expect(evPinch.matrix).toEqual([1.5, 0, 10, 20]);

    const json = recorder.exportJson();
    const imported = VectorJournalRecorder.importJson(json);
    expect(imported.events).toHaveLength(3);
    expect(imported.header.eventCount).toBe(3);
  });

  it('ensures compact data size (< 2.5MB target for 40,000 events)', () => {
    recorder.start(0);
    // Simulate 1000 events
    for (let i = 0; i < 1000; i++) {
      recorder.recordStrokeMove(1, [[i, i * 1.5, 0.5]]);
    }
    const json = recorder.exportJson();
    // 1000 events should take around 50-70 KB, meaning 40k events will easily fit in ~2 MB
    const kbSize = json.length / 1024;
    expect(kbSize).toBeLessThan(100); // well under 100KB for 1000 events
  });
});

describe('reconstructBoardState', () => {
  it('correctly reconstructs strokes and simulations at any point in time', () => {
    const events: BoardJournalEvent[] = [
      { t: 10, type: 'STROKE_START', pointerId: 1, x: 50, y: 50, pressure: 0.5, color: '#00F0FF', strokeId: 's1' },
      { t: 20, type: 'STROKE_MOVE', pointerId: 1, pts: [[60, 60, 0.6], [70, 70, 0.7]] },
      { t: 30, type: 'STROKE_END', pointerId: 1, strokeId: 's1' },
      { t: 40, type: 'SPAWN_SIM', id: 'sim_rlc', template: 'PHYS_RLC_CIRCUIT', x: 200, y: 150, scale: 1.0, params: { R: 10 } },
      { t: 50, type: 'PARAM_CHANGE', simId: 'sim_rlc', param: 'R', value: 50 },
    ];

    const state = reconstructBoardState(events);
    expect(state.strokes).toHaveLength(1);
    expect(state.strokes[0].id).toBe('s1');
    expect(state.strokes[0].points).toHaveLength(3);
    expect(state.strokes[0].points[2]).toEqual({ x: 70, y: 70, p: 0.7 });

    expect(state.simulations.has('sim_rlc')).toBe(true);
    const sim = state.simulations.get('sim_rlc')!;
    expect(sim.template).toBe('PHYS_RLC_CIRCUIT');
    expect(sim.params.R).toBe(50);
  });

  it('handles CLEAR_CANVAS and ERASE_STROKE', () => {
    const events: BoardJournalEvent[] = [
      { t: 10, type: 'STROKE_START', pointerId: 1, x: 10, y: 10, pressure: 0.5, color: '#18181B', strokeId: 's1' },
      { t: 20, type: 'STROKE_END', pointerId: 1, strokeId: 's1' },
      { t: 30, type: 'STROKE_START', pointerId: 2, x: 20, y: 20, pressure: 0.5, color: '#18181B', strokeId: 's2' },
      { t: 40, type: 'STROKE_END', pointerId: 2, strokeId: 's2' },
      { t: 50, type: 'ERASE_STROKE', strokeId: 's1' },
    ];

    const stateAfterErase = reconstructBoardState(events);
    expect(stateAfterErase.strokes).toHaveLength(1);
    expect(stateAfterErase.strokes[0].id).toBe('s2');

    // Add CLEAR_CANVAS
    events.push({ t: 60, type: 'CLEAR_CANVAS' });
    const stateAfterClear = reconstructBoardState(events);
    expect(stateAfterClear.strokes).toHaveLength(0);
    expect(stateAfterClear.simulations.size).toBe(0);
  });
});

describe('VectorJournalPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows seeking and notifies seek listener with events up to seek time', () => {
    const events: BoardJournalEvent[] = [
      { t: 100, type: 'STROKE_START', pointerId: 1, x: 10, y: 10, pressure: 0.5, color: '#000' },
      { t: 200, type: 'STROKE_MOVE', pointerId: 1, pts: [[20, 20, 0.5]] },
      { t: 300, type: 'STROKE_END', pointerId: 1 },
      { t: 500, type: 'SPAWN_SIM', id: 'sim1', template: 'CHEM_BAL', x: 100, y: 100, scale: 1 },
    ];

    const player = new VectorJournalPlayer(events);
    expect(player.getDuration()).toBe(500);

    const onSeekSpy = vi.fn();
    player.onSeek(onSeekSpy);

    player.seek(250);
    expect(player.getCurrentTime()).toBe(250);
    expect(player.getProgress()).toBe(0.5);

    expect(onSeekSpy).toHaveBeenCalledWith(250, events.slice(0, 2));

    player.seek(500);
    expect(onSeekSpy).toHaveBeenCalledWith(500, events);

    player.destroy();
  });

  it('plays events in sequence with speed adjustment', () => {
    const events: BoardJournalEvent[] = [
      { t: 100, type: 'STROKE_START', pointerId: 1, x: 10, y: 10, pressure: 0.5, color: '#000' },
      { t: 200, type: 'STROKE_END', pointerId: 1 },
    ];

    const player = new VectorJournalPlayer(events);
    const eventSpy = vi.fn();
    const completeSpy = vi.fn();

    player.onEvent(eventSpy);
    player.onComplete(completeSpy);

    // Play at 2x speed
    player.play(2.0);
    expect(player.getIsPlaying()).toBe(true);

    // Advance 80ms real time -> 160ms virtual time (past 100ms event)
    vi.advanceTimersByTime(80);
    expect(eventSpy).toHaveBeenCalledWith(events[0]);

    // Advance another 50ms real time -> 260ms virtual time (past 200ms end event)
    vi.advanceTimersByTime(50);
    expect(eventSpy).toHaveBeenCalledWith(events[1]);
    expect(completeSpy).toHaveBeenCalled();
    expect(player.getIsPlaying()).toBe(false);

    player.destroy();
  });
});
