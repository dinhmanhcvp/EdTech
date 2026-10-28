/**
 * socratic-monorepo/apps/teacher-board/src/utils/vectorJournal.ts
 * Giao thức Ghi và Tua lại Bài giảng Dạng Vector Siêu nhẹ (< 2.5MB / Tiết học 45 phút)
 * Hỗ trợ Time-Travel Scrubbing, Interactive Replay và Delta Encoding.
 * 
 * Theo đặc tả Mục 7 của NGHIEN_CUU_HOAN_THIEN_TOAN_DIEN_HE_THONG_STEM_HOLOGRAPHIC.md
 */

import { Stroke, Point, TypesetMeta, ShapeMeta } from './lassoGeometry';

// ==========================================
// 1. DATA MODEL FOR VECTOR JOURNAL EVENTS
// ==========================================

export type StrokeStartEvent = {
  t: number;
  type: 'STROKE_START';
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
  color: string;
  width?: number;
  strokeId?: string;
};

export type StrokeMoveEvent = {
  t: number;
  type: 'STROKE_MOVE';
  pointerId: number;
  pts: [number, number, number][]; // [x, y, pressure]
};

export type StrokeEndEvent = {
  t: number;
  type: 'STROKE_END';
  pointerId: number;
  strokeId?: string;
};

export type SpawnSimEvent = {
  t: number;
  type: 'SPAWN_SIM';
  id: string;
  template: string;
  x: number;
  y: number;
  scale: number;
  params?: Record<string, any>;
};

export type ParamChangeEvent = {
  t: number;
  type: 'PARAM_CHANGE';
  simId: string;
  param: string;
  value: number | string | boolean;
};

export type PinchTransformEvent = {
  t: number;
  type: 'PINCH_TRANSFORM';
  simId: string;
  matrix: number[]; // [scale, rotation, translateX, translateY]
};

export type ClearCanvasEvent = {
  t: number;
  type: 'CLEAR_CANVAS';
};

export type EraseStrokeEvent = {
  t: number;
  type: 'ERASE_STROKE';
  strokeId: string;
};

/** Công thức chuẩn hoặc hình tại chỗ thay cho nét viết tay; neo tại (x, y) như `points[0]` của Stroke. */
export type AddObjectEvent = {
  t: number;
  type: 'ADD_OBJECT';
  strokeId: string;
  x: number;
  y: number;
  color: string;
  width?: number;
  typeset?: TypesetMeta;
  shape?: ShapeMeta;
};

export type RemoveSimEvent = {
  t: number;
  type: 'REMOVE_SIM';
  id: string;
};

export type BoardJournalEvent =
  | AddObjectEvent
  | RemoveSimEvent
  | StrokeStartEvent
  | StrokeMoveEvent
  | StrokeEndEvent
  | SpawnSimEvent
  | ParamChangeEvent
  | PinchTransformEvent
  | ClearCanvasEvent
  | EraseStrokeEvent;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type DraftBoardJournalEvent = DistributiveOmit<BoardJournalEvent, 't'> & { t?: number };

export interface BoardJournalHeader {
  version: string;
  createdAt: number;
  durationMs: number;
  eventCount: number;
  title?: string;
  subject?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface BoardJournalData {
  header: BoardJournalHeader;
  events: BoardJournalEvent[];
}

// ==========================================
// 2. VECTOR JOURNAL RECORDER
// ==========================================

export class VectorJournalRecorder {
  private events: BoardJournalEvent[] = [];
  private isRecording = false;
  private isPaused = false;
  private startTimestamp = 0;
  private pausedDuration = 0;
  private pauseTimestamp = 0;

  public start(startTime: number = Date.now()): void {
    this.events = [];
    this.isRecording = true;
    this.isPaused = false;
    this.startTimestamp = startTime;
    this.pausedDuration = 0;
    this.pauseTimestamp = 0;
  }

  public pause(currentTime: number = Date.now()): void {
    if (!this.isRecording || this.isPaused) return;
    this.isPaused = true;
    this.pauseTimestamp = currentTime;
  }

  public resume(currentTime: number = Date.now()): void {
    if (!this.isRecording || !this.isPaused) return;
    this.pausedDuration += currentTime - this.pauseTimestamp;
    this.isPaused = false;
  }

  public stop(currentTime: number = Date.now()): BoardJournalData {
    if (this.isPaused) {
      this.resume(currentTime);
    }
    this.isRecording = false;
    return this.exportJournal();
  }

  public getElapsedTime(currentTime: number = Date.now()): number {
    if (!this.isRecording) return 0;
    if (this.isPaused) {
      return this.pauseTimestamp - this.startTimestamp - this.pausedDuration;
    }
    return Math.max(0, currentTime - this.startTimestamp - this.pausedDuration);
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getEvents(): BoardJournalEvent[] {
    return [...this.events];
  }

  public recordEvent<E extends BoardJournalEvent>(event: DistributiveOmit<E, 't'> & { t?: number }): E {
    if (!this.isRecording || this.isPaused) {
      return { ...event, t: event.t ?? 0 } as E;
    }

    const t = event.t ?? this.getElapsedTime();
    const fullEvent = { ...event, t } as E;
    this.events.push(fullEvent);
    return fullEvent;
  }

  public recordStrokeStart(
    pointerId: number,
    x: number,
    y: number,
    pressure = 0.5,
    color = '#18181B',
    width = 3.5,
    strokeId?: string
  ): StrokeStartEvent {
    return this.recordEvent<StrokeStartEvent>({
      type: 'STROKE_START',
      pointerId,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      pressure: Math.round(pressure * 100) / 100,
      color,
      width,
      strokeId,
    });
  }

  public recordStrokeMove(
    pointerId: number,
    pts: [number, number, number][]
  ): StrokeMoveEvent {
    const compactPts = pts.map(
      ([x, y, p]) =>
        [
          Math.round(x * 10) / 10,
          Math.round(y * 10) / 10,
          Math.round(p * 100) / 100,
        ] as [number, number, number]
    );
    return this.recordEvent<StrokeMoveEvent>({
      type: 'STROKE_MOVE',
      pointerId,
      pts: compactPts,
    });
  }

  public recordStrokeEnd(pointerId: number, strokeId?: string): StrokeEndEvent {
    return this.recordEvent<StrokeEndEvent>({
      type: 'STROKE_END',
      pointerId,
      strokeId,
    });
  }

  public recordSpawnSim(
    id: string,
    template: string,
    x: number,
    y: number,
    scale = 1.0,
    params?: Record<string, any>
  ): SpawnSimEvent {
    return this.recordEvent<SpawnSimEvent>({
      type: 'SPAWN_SIM',
      id,
      template,
      x: Math.round(x),
      y: Math.round(y),
      scale: Math.round(scale * 100) / 100,
      params,
    });
  }

  public recordParamChange(
    simId: string,
    param: string,
    value: number | string | boolean
  ): ParamChangeEvent {
    return this.recordEvent<ParamChangeEvent>({
      type: 'PARAM_CHANGE',
      simId,
      param,
      value: typeof value === 'number' ? Math.round(value * 1000) / 1000 : value,
    });
  }

  public recordPinchTransform(simId: string, matrix: number[]): PinchTransformEvent {
    return this.recordEvent<PinchTransformEvent>({
      type: 'PINCH_TRANSFORM',
      simId,
      matrix: matrix.map((v) => Math.round(v * 1000) / 1000),
    });
  }

  public recordClear(): ClearCanvasEvent {
    return this.recordEvent<ClearCanvasEvent>({
      type: 'CLEAR_CANVAS',
    });
  }

  public recordEraseStroke(strokeId: string): EraseStrokeEvent {
    return this.recordEvent<EraseStrokeEvent>({
      type: 'ERASE_STROKE',
      strokeId,
    });
  }

  public exportJournal(title = 'Socratic STEM Lecture', subject = 'STEM'): BoardJournalData {
    const durationMs = this.events.length > 0 ? this.events[this.events.length - 1].t : 0;
    return {
      header: {
        version: '2.0.0',
        createdAt: this.startTimestamp || Date.now(),
        durationMs,
        eventCount: this.events.length,
        title,
        subject,
      },
      events: [...this.events],
    };
  }

  public exportJson(pretty = false): string {
    return JSON.stringify(this.exportJournal(), null, pretty ? 2 : 0);
  }

  public static importJson(jsonString: string): BoardJournalData {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.events)) {
      throw new Error('Invalid BoardJournal JSON format: events array missing');
    }
    return {
      header: parsed.header || {
        version: '2.0.0',
        createdAt: Date.now(),
        durationMs: parsed.events.length > 0 ? parsed.events[parsed.events.length - 1].t : 0,
        eventCount: parsed.events.length,
      },
      events: parsed.events,
    };
  }

  public reset(): void {
    this.events = [];
    this.isRecording = false;
    this.isPaused = false;
    this.startTimestamp = 0;
    this.pausedDuration = 0;
    this.pauseTimestamp = 0;
  }
}

// ==========================================
// 3. VECTOR JOURNAL PLAYER (TIME-TRAVEL SCRUBBING)
// ==========================================

export interface PlayerState {
  currentTime: number;
  duration: number;
  progress: number;
  isPlaying: boolean;
  speed: number;
}

export type EventCallback = (event: BoardJournalEvent) => void;
export type StateCallback = (state: PlayerState) => void;
export type SeekCallback = (timeMs: number, eventsUpToTime: BoardJournalEvent[]) => void;

export class VectorJournalPlayer {
  private events: BoardJournalEvent[] = [];
  private header: BoardJournalHeader | null = null;
  private currentTime = 0;
  private duration = 0;
  private isPlaying = false;
  private speed = 1.0;
  private nextEventIndex = 0;
  private timerId: any = null;
  private lastRafTimestamp = 0;

  private onEventCallbacks: EventCallback[] = [];
  private onStateChangeCallbacks: StateCallback[] = [];
  private onSeekCallbacks: SeekCallback[] = [];
  private onCompleteCallbacks: (() => void)[] = [];

  constructor(data?: BoardJournalData | BoardJournalEvent[] | string) {
    if (data) {
      this.load(data);
    }
  }

  public load(data: BoardJournalData | BoardJournalEvent[] | string): void {
    this.pause();

    if (typeof data === 'string') {
      const parsed = VectorJournalRecorder.importJson(data);
      this.header = parsed.header;
      this.events = parsed.events.sort((a, b) => a.t - b.t);
    } else if (Array.isArray(data)) {
      this.events = [...data].sort((a, b) => a.t - b.t);
      this.header = {
        version: '2.0.0',
        createdAt: Date.now(),
        durationMs: this.events.length > 0 ? this.events[this.events.length - 1].t : 0,
        eventCount: this.events.length,
      };
    } else {
      this.header = data.header;
      this.events = [...data.events].sort((a, b) => a.t - b.t);
    }

    this.duration = this.events.length > 0 ? this.events[this.events.length - 1].t : 0;
    this.seek(0);
  }

  public play(speed?: number): void {
    if (speed !== undefined) {
      this.speed = Math.max(0.1, Math.min(10, speed));
    }

    if (this.events.length === 0) return;

    if (this.currentTime >= this.duration) {
      this.seek(0);
    }

    this.isPlaying = true;
    this.lastRafTimestamp = Date.now();
    this.emitState();
    this.scheduleNextTick();
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.emitState();
  }

  public seek(targetTimeMs: number): void {
    const clampedTime = Math.max(0, Math.min(this.duration, targetTimeMs));
    this.currentTime = clampedTime;

    // Find next event index: the first event that will occur strictly after clampedTime
    this.nextEventIndex = this.events.findIndex((e) => e.t > clampedTime);
    if (this.nextEventIndex === -1) {
      this.nextEventIndex = this.events.length;
    }

    // Collect all events up to clampedTime for instant state reconstruction
    const pastEvents = this.events.slice(0, this.nextEventIndex);
    for (const cb of this.onSeekCallbacks) {
      try {
        cb(clampedTime, pastEvents);
      } catch (err) {
        console.error('[VectorJournalPlayer] Error in onSeek callback:', err);
      }
    }

    this.emitState();
  }

  public stepForward(deltaMs = 500): void {
    this.seek(this.currentTime + deltaMs);
  }

  public stepBackward(deltaMs = 500): void {
    this.seek(this.currentTime - deltaMs);
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
    this.emitState();
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getProgress(): number {
    if (this.duration <= 0) return 0;
    return Math.min(1, Math.max(0, this.currentTime / this.duration));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getHeader(): BoardJournalHeader | null {
    return this.header;
  }

  // --- Subscriptions ---

  public onEvent(callback: EventCallback): () => void {
    this.onEventCallbacks.push(callback);
    return () => {
      this.onEventCallbacks = this.onEventCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onStateChange(callback: StateCallback): () => void {
    this.onStateChangeCallbacks.push(callback);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onSeek(callback: SeekCallback): () => void {
    this.onSeekCallbacks.push(callback);
    return () => {
      this.onSeekCallbacks = this.onSeekCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onComplete(callback: () => void): () => void {
    this.onCompleteCallbacks.push(callback);
    return () => {
      this.onCompleteCallbacks = this.onCompleteCallbacks.filter((cb) => cb !== callback);
    };
  }

  // --- Internal Tick Engine ---

  private scheduleNextTick(): void {
    if (!this.isPlaying) return;

    this.timerId = setTimeout(() => {
      if (!this.isPlaying) return;

      const now = Date.now();
      const dt = (now - this.lastRafTimestamp) * this.speed;
      this.lastRafTimestamp = now;

      this.currentTime += dt;

      // Dispatch any events whose time has arrived
      while (this.nextEventIndex < this.events.length && this.events[this.nextEventIndex].t <= this.currentTime) {
        const ev = this.events[this.nextEventIndex];
        for (const cb of this.onEventCallbacks) {
          try {
            cb(ev);
          } catch (err) {
            console.error('[VectorJournalPlayer] Error in onEvent callback:', err);
          }
        }
        this.nextEventIndex++;
      }

      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.pause();
        for (const cb of this.onCompleteCallbacks) {
          try {
            cb();
          } catch (err) {
            console.error('[VectorJournalPlayer] Error in onComplete callback:', err);
          }
        }
        return;
      }

      this.emitState();
      this.scheduleNextTick();
    }, 16);
  }

  private emitState(): void {
    const state: PlayerState = {
      currentTime: this.currentTime,
      duration: this.duration,
      progress: this.getProgress(),
      isPlaying: this.isPlaying,
      speed: this.speed,
    };
    for (const cb of this.onStateChangeCallbacks) {
      try {
        cb(state);
      } catch (err) {
        console.error('[VectorJournalPlayer] Error in onStateChange callback:', err);
      }
    }
  }

  public destroy(): void {
    this.pause();
    this.onEventCallbacks = [];
    this.onStateChangeCallbacks = [];
    this.onSeekCallbacks = [];
    this.onCompleteCallbacks = [];
  }
}

// ==========================================
// 4. INSTANT RECONSTRUCTION OF BOARD STATE
// ==========================================

export interface ReconstructedSim {
  id: string;
  template: string;
  x: number;
  y: number;
  scale: number;
  params: Record<string, any>;
  matrix?: number[];
}

export interface ReconstructedObject {
  id: string;
  x: number;
  y: number;
  color: string;
  width: number;
  typeset?: TypesetMeta;
  shape?: ShapeMeta;
}

export interface ReconstructedBoardState {
  strokes: Stroke[];
  simulations: Map<string, ReconstructedSim>;
  /** công thức chuẩn / hình tại chỗ, theo thứ tự thêm vào */
  objects: ReconstructedObject[];
}

/**
 * Tái tạo trạng thái bảng phấn và mô phỏng tức thì từ chuỗi sự kiện vector
 * Giúp Time-travel scrubber nhảy đến bất kỳ mốc thời gian nào trong O(N) không giật lag.
 */
export function reconstructBoardState(events: BoardJournalEvent[]): ReconstructedBoardState {
  const strokes: Stroke[] = [];
  const activeStrokePointers = new Map<number, Stroke>();
  const simulations = new Map<string, ReconstructedSim>();
  const objects: ReconstructedObject[] = [];

  let strokeCounter = 0;

  for (const ev of events) {
    switch (ev.type) {
      case 'CLEAR_CANVAS': {
        strokes.length = 0;
        activeStrokePointers.clear();
        simulations.clear();
        objects.length = 0;
        break;
      }

      case 'ADD_OBJECT': {
        objects.push({
          id: ev.strokeId,
          x: ev.x,
          y: ev.y,
          color: ev.color,
          width: ev.width || 3,
          typeset: ev.typeset,
          shape: ev.shape,
        });
        break;
      }

      case 'REMOVE_SIM': {
        simulations.delete(ev.id);
        break;
      }

      case 'STROKE_START': {
        const id = ev.strokeId || `stroke_${++strokeCounter}`;
        const newStroke: Stroke = {
          id,
          color: ev.color,
          width: ev.width || 3.5,
          points: [{ x: ev.x, y: ev.y, p: ev.pressure }],
        };
        activeStrokePointers.set(ev.pointerId, newStroke);
        strokes.push(newStroke);
        break;
      }

      case 'STROKE_MOVE': {
        const stroke = activeStrokePointers.get(ev.pointerId);
        if (stroke && ev.pts) {
          for (const [x, y, p] of ev.pts) {
            stroke.points.push({ x, y, p });
          }
        }
        break;
      }

      case 'STROKE_END': {
        activeStrokePointers.delete(ev.pointerId);
        break;
      }

      case 'ERASE_STROKE': {
        const index = strokes.findIndex((s) => s.id === ev.strokeId);
        if (index !== -1) {
          strokes.splice(index, 1);
        }
        const oi = objects.findIndex((o) => o.id === ev.strokeId);
        if (oi !== -1) objects.splice(oi, 1);
        break;
      }

      case 'SPAWN_SIM': {
        simulations.set(ev.id, {
          id: ev.id,
          template: ev.template,
          x: ev.x,
          y: ev.y,
          scale: ev.scale,
          params: { ...(ev.params || {}) },
        });
        break;
      }

      case 'PARAM_CHANGE': {
        const sim = simulations.get(ev.simId);
        if (sim) {
          sim.params[ev.param] = ev.value;
        }
        break;
      }

      case 'PINCH_TRANSFORM': {
        const sim = simulations.get(ev.simId);
        if (sim) {
          sim.matrix = [...ev.matrix];
          if (ev.matrix.length >= 1) {
            sim.scale = ev.matrix[0];
          }
          if (ev.matrix.length >= 4) {
            sim.x += ev.matrix[2];
            sim.y += ev.matrix[3];
          }
        }
        break;
      }
    }
  }

  return {
    strokes,
    simulations,
    objects,
  };
}
