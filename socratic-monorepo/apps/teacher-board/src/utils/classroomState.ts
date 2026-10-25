// apps/teacher-board/src/utils/classroomState.ts
/** Trạng thái phía client của phòng học BYOD: bộ rút gọn thuần (không dính WebSocket) để kiểm thử được. */
import type {SimulationBlueprint} from '@socratic/types';

export interface PollView {
  question: string;
  options: string[];
  open: boolean;
}
export interface PollResult {
  counts: Record<string, number>;
  percents: Record<string, number>;
  total: number;
  students: number;
  final: boolean;
}
export interface RosterEntry {
  id: string;
  name: string;
}
export interface SyncEvent {
  key: string;
  value: number;
  by: string;
  byName?: string | null;
  nonce: number;
}

export interface ClassroomState {
  status: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';
  role: 'teacher' | 'student' | null;
  roomId: string | null;
  youId: string | null;
  blueprint: SimulationBlueprint | null;
  params: Record<string, number>;
  control: string | null;
  controlName: string | null;
  poll: PollView | null;
  result: PollResult | null;
  myVote: string | null;
  roster: RosterEntry[];
  studentCount: number;
  teacherOnline: boolean;
  lastSync: SyncEvent | null;
  error: string | null;
}

export const initialClassroom: ClassroomState = {
  status: 'idle',
  role: null,
  roomId: null,
  youId: null,
  blueprint: null,
  params: {},
  control: null,
  controlName: null,
  poll: null,
  result: null,
  myVote: null,
  roster: [],
  studentCount: 0,
  teacherOnline: false,
  lastSync: null,
  error: null,
};

export const ERROR_TEXT: Record<string, string> = {
  not_in_control: 'Bạn chưa được giáo viên giao quyền điều khiển.',
  room_full: 'Phòng học đã đủ người.',
  no_open_poll: 'Câu hỏi đã đóng.',
  bad_choice: 'Lựa chọn không hợp lệ.',
  bad_param: 'Giá trị không hợp lệ.',
  bad_poll: 'Câu hỏi cần nội dung và ít nhất 2 lựa chọn.',
  bad_blueprint: 'Mô phỏng quá lớn hoặc không hợp lệ để gửi cho lớp.',
  unknown_student: 'Học sinh này đã rời phòng.',
};

export type ServerMsg = {type: string; [k: string]: any};

export function classroomReducer(s: ClassroomState, m: ServerMsg): ClassroomState {
  switch (m.type) {
    case 'STATE':
      return {
        ...s,
        status: 'open',
        role: m.role === 'teacher' ? 'teacher' : 'student',
        roomId: m.roomId ?? s.roomId,
        youId: m.youId ?? s.youId,
        blueprint: m.blueprint ?? null,
        params: m.params ?? {},
        control: m.control ?? null,
        controlName: m.controlName ?? null,
        poll: m.poll ?? null,
        result: m.poll ? s.result : null,
        myVote: m.poll ? s.myVote : null,
        teacherOnline: !!m.teacherOnline,
        error: null,
      };
    case 'SYNC':
      return {...s, params: {...s.params, [m.key]: m.value}, lastSync: {key: m.key, value: m.value, by: m.by, byName: m.byName ?? null, nonce: (s.lastSync?.nonce ?? 0) + 1}};
    case 'CONTROL':
      return {...s, control: m.studentId ?? null, controlName: m.name ?? null};
    case 'ROSTER':
      return {...s, studentCount: m.count ?? 0, roster: Array.isArray(m.students) ? m.students : s.roster, control: m.control ?? null};
    case 'POLL':
      return {...s, poll: {question: m.question, options: m.options, open: !!m.open}, result: m.open ? null : s.result, myVote: m.open ? null : s.myVote};
    case 'POLL_RESULT':
      return {...s, result: {counts: m.counts, percents: m.percents, total: m.total, students: m.students ?? 0, final: !!m.final}};
    case 'VOTE_ACK':
      return {...s, myVote: m.choice};
    case 'TEACHER_STATUS':
      return {...s, teacherOnline: !!m.online};
    case 'CLOSED':
      return {...s, status: 'closed', blueprint: null, poll: null, control: null};
    case 'ERROR':
      return {...s, error: ERROR_TEXT[m.code] ?? `Lỗi: ${m.code}`};
    default:
      return s;
  }
}

/** Học sinh `youId` có đang được giao quyền điều khiển không. */
export const inControl = (s: ClassroomState) => s.role === 'student' && !!s.youId && s.control === s.youId;

/** Lược bớt phần nặng của blueprint trước khi gửi cho lớp (máy chủ giới hạn ~60 KB). */
export function slimBlueprint(bp: SimulationBlueprint): SimulationBlueprint {
  const {custom_interactive_svg: _svg, ...rest} = bp as SimulationBlueprint & {custom_interactive_svg?: string};
  void _svg;
  return rest as SimulationBlueprint;
}

export function backendBase(): string {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  return (env || 'http://127.0.0.1:8000').replace(/\/+$/, '');
}
export const wsUrl = (roomId: string, query: Record<string, string>) => {
  const u = new URL(`${backendBase()}/ws/rooms/${encodeURIComponent(roomId)}`);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
};
