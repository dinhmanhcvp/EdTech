'use client';

import {useCallback, useEffect, useReducer, useRef} from 'react';
import {wsUrl} from './api';
import type {PollResult, PollView, Submission} from './types';

export interface LiveState {
  status: 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';
  roster: {id: string; name: string}[];
  studentCount: number;
  control: string | null;
  collect: {prompt: string; open: boolean} | null;
  submissions: Submission[];
  poll: PollView | null;
  result: PollResult | null;
  boardOnline: boolean;
  error: string | null;
}

export const initialLive: LiveState = {status: 'connecting', roster: [], studentCount: 0, control: null, collect: null, submissions: [], poll: null, result: null, boardOnline: false, error: null};

export const ERROR_TEXT: Record<string, string> = {
  bad_poll: 'Câu hỏi cần nội dung và ít nhất 2 lựa chọn.',
  unknown_student: 'Học sinh này đã rời phòng.',
  unknown_submission: 'Bài này không còn trong đợt thu.',
  use_console: 'Hãy kết thúc tiết bằng nút trên trang quản lý.',
};

type Msg = {type: string; [k: string]: any};

const toSub = (m: Msg): Submission => ({studentId: String(m.studentId), name: String(m.name ?? ''), rev: Number(m.rev) || 1, at: Number(m.at) || 0, strokes: Array.isArray(m.strokes) ? m.strokes : []});

/** Bộ rút gọn thuần cho tin nhắn từ phòng học (kiểm thử được, không dính WebSocket). */
export function liveReducer(s: LiveState, m: Msg): LiveState {
  switch (m.type) {
    case 'STATE':
      return {
        ...s,
        status: 'open',
        control: m.control ?? null,
        collect: m.collect ?? null,
        poll: m.poll ?? null,
        submissions: Array.isArray(m.submissions) ? m.submissions.map(toSub) : [],
        boardOnline: !!m.teacherOnline,
        error: null,
      };
    case 'ROSTER':
      return {...s, studentCount: m.count ?? 0, roster: Array.isArray(m.students) ? m.students : s.roster, control: m.control ?? null};
    case 'CONTROL':
      return {...s, control: m.studentId ?? null};
    case 'COLLECT':
      // đợt mới (đang mở) xóa bài của đợt trước; đóng đợt thì giữ để chiếu/xem
      return m.open && !s.collect?.open ? {...s, collect: {prompt: m.prompt ?? '', open: true}, submissions: []} : {...s, collect: {prompt: m.prompt ?? '', open: !!m.open}};
    case 'SUBMISSION': {
      const sub = toSub(m);
      const i = s.submissions.findIndex((x) => x.studentId === sub.studentId);
      return {...s, submissions: i < 0 ? [...s.submissions, sub] : s.submissions.map((x, k) => (k === i ? sub : x))};
    }
    case 'POLL':
      return {...s, poll: {question: m.question, options: m.options, open: !!m.open}, result: m.open ? null : s.result};
    case 'POLL_RESULT':
      return {...s, result: {counts: m.counts, percents: m.percents, total: m.total, students: m.students ?? 0, final: !!m.final}};
    case 'TEACHER_STATUS':
      return {...s, boardOnline: !!m.online};
    case 'CLOSED':
      return {...s, status: 'closed'};
    case 'ERROR':
      return {...s, error: ERROR_TEXT[m.code] ?? `Lỗi: ${m.code}`};
    default:
      return s;
  }
}

type Action = {kind: 'msg'; msg: Msg} | {kind: 'patch'; patch: Partial<LiveState>};
const reduce = (s: LiveState, a: Action): LiveState => (a.kind === 'msg' ? liveReducer(s, a.msg) : {...s, ...a.patch});

/** Kết nối WebSocket vai trò `console` vào phòng của tiết đang dạy; tự nối lại (tối đa 6 lần). */
export function useLiveRoom(creds: {roomId: string; token: string} | null) {
  const [state, dispatch] = useReducer(reduce, initialLive);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!creds || typeof WebSocket === 'undefined') return;
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      dispatch({kind: 'patch', patch: {status: tries ? 'reconnecting' : 'connecting'}});
      const sock = new WebSocket(wsUrl(creds.roomId, {role: 'console', token: creds.token}));
      ws.current = sock;
      sock.onopen = () => {
        tries = 0;
      };
      sock.onmessage = (ev) => {
        try {
          dispatch({kind: 'msg', msg: JSON.parse(ev.data)});
        } catch {
          /* bỏ qua thông điệp hỏng */
        }
      };
      sock.onclose = (ev) => {
        if (!alive || ws.current !== sock) return;
        if (ev.code === 4404 || ev.code === 4401 || ev.code === 4429 || tries >= 6) {
          dispatch({kind: 'patch', patch: {status: 'error', error: ev.code === 4404 ? 'Phòng đã đóng. Bấm Bắt đầu để mở lại.' : 'Mất kết nối tới phòng học.'}});
          return;
        }
        tries += 1;
        timer = setTimeout(connect, Math.min(8000, 700 * 2 ** (tries - 1)));
        dispatch({kind: 'patch', patch: {status: 'reconnecting'}});
      };
    };
    connect();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      const s = ws.current;
      ws.current = null;
      try {
        s?.close();
      } catch {
        /* bỏ qua */
      }
    };
  }, [creds?.roomId, creds?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((msg: Record<string, unknown>) => {
    const s = ws.current;
    if (!s || s.readyState !== WebSocket.OPEN) return false;
    s.send(JSON.stringify(msg));
    return true;
  }, []);

  return {state, send};
}
