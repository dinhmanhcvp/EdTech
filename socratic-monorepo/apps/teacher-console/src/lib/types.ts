// Hợp đồng dữ liệu với máy chủ AI (services/ai-engine/routers/console.py, classroom_ws.py). Trang quản lý không nhập mã của bảng chiếu:
// bài soạn là JSON "mờ" (danh sách trang), chỉ bảng chiếu mới hiểu nét vẽ bên trong.
export interface Teacher {
  id: string;
  username: string;
  display_name: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  subject: string;
  size: number;
  notes: string;
}

export interface LessonMeta {
  id: string;
  title: string;
  folder: string;
  page_count: number;
  stroke_count: number;
  created_at: number;
  updated_at: number;
}

export type PeriodStatus = 'planned' | 'live' | 'ended';

export interface Period {
  id: string;
  class_id: string | null;
  lesson_id: string | null;
  title: string;
  goals: string;
  notes: string;
  prompts: string[];
  status: PeriodStatus;
  room_id: string | null;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  has_snapshot: boolean;
  submission_count: number;
  class?: ClassInfo | null;
}

export type Pt = [number, number];
export interface InkStroke {
  p: Pt[];
  c: string;
  w: number;
}

export interface Submission {
  studentId: string;
  name: string;
  rev: number;
  at: number;
  strokes: InkStroke[];
}

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

export interface StartResult {
  pairCode: string;
  expiresIn: number;
  roomId: string;
  period: Period;
}

export interface PeriodRecord {
  period: Period;
  pages: unknown[][] | null;
  submissions: {name: string; rev: number; at: number; strokes: InkStroke[]}[];
}
