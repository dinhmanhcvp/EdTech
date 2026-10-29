// apps/teacher-board/src/utils/classroomState.ts
/** Trạng thái phía client của phòng học BYOD: bộ rút gọn thuần (không dính WebSocket) để kiểm thử được. */
import type {SimulationBlueprint} from '@socratic/types';
import {apiBase} from './apiBase';
import type {Submission} from './submissionInk';

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
export interface CollectView {
  prompt: string;
  open: boolean;
}
/** Bài làm giáo viên chọn chiếu từ trang quản lý: chỉ có nhãn ẩn danh và nét vẽ, KHÔNG có tên học sinh. */
export interface ShownSubmission {
  studentId: string;
  rev: number;
  label: string;
  strokes: Submission['strokes'];
  nonce: number;
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
  /** đợt thu bài làm đang mở/đã đóng (học sinh vẽ và nộp) */
  collect: CollectView | null;
  /** giáo viên: các bài đã nhận, theo thứ tự nộp đầu tiên; học sinh: luôn rỗng */
  submissions: Submission[];
  /** học sinh: số lần nộp đã được máy chủ xác nhận (0 = chưa nộp) */
  mySubmitRev: number;
  /** bảng ghép với tiết học: bài vừa được giáo viên chọn chiếu (đổi `nonce` = có bài mới) */
  shown: ShownSubmission | null;
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
  collect: null,
  submissions: [],
  mySubmitRev: 0,
  shown: null,
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
  no_open_collect: 'Giáo viên chưa mở (hoặc đã đóng) việc nộp bài.',
  use_console: 'Phòng này do trang quản lý điều khiển: hãy kết thúc tiết ở đó.',
  unknown_submission: 'Bài này không còn trong đợt thu.',
  bad_submission: 'Bài làm không hợp lệ hoặc quá lớn; hãy xóa bớt nét rồi nộp lại.',
};

export type ServerMsg = {type: string; [k: string]: any};

const toSubmission = (m: ServerMsg): Submission => ({studentId: String(m.studentId), name: String(m.name ?? ''), rev: Number(m.rev) || 1, at: Number(m.at) || 0, strokes: Array.isArray(m.strokes) ? m.strokes : []});

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
        collect: m.collect ?? null,
        submissions: Array.isArray(m.submissions) ? m.submissions.map(toSubmission) : [],
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
    case 'COLLECT':
      // đợt mới (đang mở) xóa bài cũ và dấu "đã nộp"; đóng đợt thì giữ nguyên để xem lại
      return m.open && !(s.collect?.open) ? {...s, collect: {prompt: m.prompt ?? '', open: true}, submissions: [], mySubmitRev: 0} : {...s, collect: {prompt: m.prompt ?? '', open: !!m.open}};
    case 'SUBMISSION': {
      const sub = toSubmission(m);
      const i = s.submissions.findIndex((x) => x.studentId === sub.studentId);
      return {...s, submissions: i < 0 ? [...s.submissions, sub] : s.submissions.map((x, k) => (k === i ? sub : x))};
    }
    case 'SHOW_SUBMISSION':
      return {...s, shown: {studentId: String(m.studentId), rev: Number(m.rev) || 1, label: String(m.label || 'Bài làm').slice(0, 30), strokes: Array.isArray(m.strokes) ? m.strokes : [], nonce: (s.shown?.nonce ?? 0) + 1}};
    case 'SUBMIT_ACK':
      return {...s, mySubmitRev: m.rev ?? s.mySubmitRev, error: null};
    case 'TEACHER_STATUS':
      return {...s, teacherOnline: !!m.online};
    case 'CLOSED':
      return {...s, status: 'closed', blueprint: null, poll: null, control: null, collect: null};
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
  const base = apiBase();
  // WebSocket cần địa chỉ tuyệt đối; trang công khai chưa cấu hình máy chủ thì dùng tên miền hiện tại (kết nối sẽ báo lỗi rõ ràng)
  return (base || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000')).replace(/\/+$/, '');
}
export const wsUrl = (roomId: string, query: Record<string, string>) => {
  const u = new URL(`${backendBase()}/ws/rooms/${encodeURIComponent(roomId)}`);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
};
