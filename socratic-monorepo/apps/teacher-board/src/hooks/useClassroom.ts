'use client';

import {useCallback, useEffect, useReducer, useRef} from 'react';
import {classroomReducer, initialClassroom, backendBase, wsUrl, type ClassroomState, type ServerMsg} from '../utils/classroomState';

type Action = {kind: 'server'; msg: ServerMsg} | {kind: 'patch'; patch: Partial<ClassroomState>} | {kind: 'reset'};
const reduce = (s: ClassroomState, a: Action): ClassroomState => (a.kind === 'server' ? classroomReducer(s, a.msg) : a.kind === 'patch' ? {...s, ...a.patch} : initialClassroom);

export interface ClassroomApi {
  state: ClassroomState;
  teacherToken: string | null;
  createRoom: () => Promise<string | null>;
  joinRoom: (roomId: string, name: string) => void;
  /** bảng ghép với tiết do trang quản lý mở: nối vào phòng có sẵn bằng mã phòng (vai trò giáo viên) */
  attachTeacher: (roomId: string, roomToken: string) => void;
  send: (msg: Record<string, unknown>) => boolean;
  leave: () => void;
}

/** Kết nối WebSocket tới phòng học, tự nối lại (tối đa 6 lần, giãn cách tăng dần) nếu đứt mạng. */
export function useClassroom(): ClassroomApi {
  const [state, dispatch] = useReducer(reduce, initialClassroom);
  const ws = useRef<WebSocket | null>(null);
  const target = useRef<{roomId: string; query: Record<string, string>} | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tries = useRef(0);
  const wantOpen = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const t = target.current;
    if (!t || typeof WebSocket === 'undefined') return;
    dispatch({kind: 'patch', patch: {status: tries.current ? 'reconnecting' : 'connecting', roomId: t.roomId}});
    const sock = new WebSocket(wsUrl(t.roomId, t.query));
    ws.current = sock;
    sock.onopen = () => {
      tries.current = 0;
    };
    sock.onmessage = (ev) => {
      try {
        dispatch({kind: 'server', msg: JSON.parse(ev.data)});
      } catch {
        /* bỏ qua thông điệp hỏng */
      }
    };
    sock.onclose = (ev) => {
      if (ws.current !== sock) return;
      if (!wantOpen.current || ev.code === 4404 || ev.code === 4401 || ev.code === 4409 || ev.code === 4429) {
        const reason: Record<number, string> = {4404: 'Không tìm thấy phòng học (sai mã hoặc đã đóng).', 4401: 'Sai mã quản trị phòng.', 4409: 'Phòng đang được mở ở thiết bị khác.', 4429: 'Phòng học đã đủ người.'};
        dispatch({kind: 'patch', patch: {status: wantOpen.current ? 'error' : 'closed', error: reason[ev.code] ?? null}});
        return;
      }
      if (tries.current >= 6) {
        dispatch({kind: 'patch', patch: {status: 'error', error: 'Mất kết nối tới máy chủ.'}});
        return;
      }
      tries.current += 1;
      timer.current = setTimeout(connect, Math.min(8000, 700 * 2 ** (tries.current - 1)));
      dispatch({kind: 'patch', patch: {status: 'reconnecting'}});
    };
  }, []);

  const leave = useCallback(() => {
    wantOpen.current = false;
    if (timer.current) clearTimeout(timer.current);
    const s = ws.current;
    ws.current = null;
    try {
      s?.close();
    } catch {
      /* bỏ qua */
    }
    target.current = null;
    tokenRef.current = null;
    dispatch({kind: 'reset'});
  }, []);

  const createRoom = useCallback(async () => {
    try {
      const r = await fetch(`${backendBase()}/api/v1/rooms`, {method: 'POST'});
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as {roomId: string; teacherToken: string};
      tokenRef.current = j.teacherToken;
      target.current = {roomId: j.roomId, query: {role: 'teacher', token: j.teacherToken}};
      wantOpen.current = true;
      tries.current = 0;
      connect();
      return j.roomId;
    } catch {
      dispatch({kind: 'patch', patch: {status: 'error', error: 'Không tạo được phòng: máy chủ AI chưa chạy hoặc không truy cập được.'}});
      return null;
    }
  }, [connect]);

  const joinRoom = useCallback(
    (roomId: string, name: string) => {
      target.current = {roomId: roomId.toUpperCase(), query: {role: 'student', name}};
      wantOpen.current = true;
      tries.current = 0;
      connect();
    },
    [connect],
  );

  const attachTeacher = useCallback(
    (roomId: string, roomToken: string) => {
      tokenRef.current = roomToken;
      target.current = {roomId, query: {role: 'teacher', token: roomToken}};
      wantOpen.current = true;
      tries.current = 0;
      connect();
    },
    [connect],
  );

  const send = useCallback((msg: Record<string, unknown>) => {
    const s = ws.current;
    if (!s || s.readyState !== WebSocket.OPEN) return false;
    s.send(JSON.stringify(msg));
    return true;
  }, []);

  useEffect(() => () => {
    wantOpen.current = false;
    if (timer.current) clearTimeout(timer.current);
    ws.current?.close();
  }, []);

  return {state, teacherToken: tokenRef.current, createRoom, joinRoom, attachTeacher, send, leave};
}
