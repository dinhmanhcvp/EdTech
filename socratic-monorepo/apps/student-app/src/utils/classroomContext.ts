export type ClassroomArtifactKind = 'BOARD' | 'SLIDE' | 'STUDENT_WORK';

export interface ClassroomBoardSnapshot {
  id: string;
  kind: ClassroomArtifactKind;
  title: string;
  subject: 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';
  latex: string;
  templateId: string;
  note: string;
  parameters: Record<string, number>;
}

export interface StudentWorkLine {
  id: string;
  latex: string;
  diagnosis: string;
  status: 'correct' | 'warning' | 'error';
}

export interface ClassroomStudentWork {
  id: string;
  title: string;
  subject: 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';
  capturedAt: string;
  confidence: number;
  lines: StudentWorkLine[];
  remediation: string;
}

export interface ClassroomSessionSnapshot {
  sessionId: string;
  className: string;
  lessonTitle: string;
  updatedAt: string;
  boardSnapshots: ClassroomBoardSnapshot[];
  studentWork: ClassroomStudentWork[];
}

const FALLBACK: ClassroomSessionSnapshot = {
  sessionId: 'demo-12a1-today',
  className: '12A1',
  lessonTitle: 'Từ bảng lớp đến bài làm cá nhân',
  updatedAt: 'Hôm nay · 10:42',
  boardSnapshots: [
    {
      id: 'board-rlc', kind: 'BOARD', title: 'Giản đồ Fresnel RLC', subject: 'PHYSICS',
      latex: '\\vec{U} = \\vec{U}_R + \\vec{U}_L + \\vec{U}_C', templateId: 'PHYS_RLC_PHASOR',
      note: 'Cộng vector theo pha; không cộng đại số độ lớn.', parameters: {omega: 200, R: 50},
    },
    {
      id: 'board-friction', kind: 'SLIDE', title: 'Công của lực ma sát', subject: 'PHYSICS',
      latex: 'A_{ms} = -\\mu mg\\cos\\alpha \\cdot s', templateId: 'PHYS_INCLINED',
      note: 'Dấu âm biểu diễn lực ma sát ngược chiều chuyển động.', parameters: {alpha: 30, mu: 0.2},
    },
    {
      id: 'board-redox', kind: 'BOARD', title: 'Bảo toàn electron trong Fe₃O₄', subject: 'CHEMISTRY',
      latex: '\\bar{x}_{Fe} = +\\frac{8}{3}', templateId: 'CHEM_BALANCE_SCALE',
      note: 'Số oxi hóa trung bình của Fe trong Fe₃O₄ là +8/3.', parameters: {Fe: 3, O: 4},
    },
  ],
  studentWork: [
    {
      id: 'work-01', title: 'Bài chữa trên bảng · Trần Minh Quân', subject: 'PHYSICS', capturedAt: '09:58', confidence: 0.68,
      lines: [
        {id: 'l1', latex: 'U = U_R + U_L + U_C', status: 'error', diagnosis: 'Cần cộng vector theo pha; độ lớn không cộng đại số trong mạch RLC.'},
        {id: 'l2', latex: 'A_{ms} = \\mu mg\\cos\\alpha \\cdot s', status: 'warning', diagnosis: 'Thiếu dấu âm vì lực ma sát ngược chiều dịch chuyển.'},
      ],
      remediation: 'So sánh hai giản đồ: cộng đại số và cộng vector khi ω đi qua cộng hưởng.',
    },
    {
      id: 'work-02', title: 'Bài chữa trên bảng · Lê Hoàng Nam', subject: 'CHEMISTRY', capturedAt: '10:16', confidence: 0.91,
      lines: [{id: 'l3', latex: '\\text{Fe} = +3', status: 'error', diagnosis: 'Fe₃O₄ có 1 Fe²⁺ và 2 Fe³⁺, nên số oxi hóa trung bình là +8/3.'}],
      remediation: 'Tính lại số oxi hóa từ tổng điện tích của hợp chất trung hòa.',
    },
  ],
};

/** Read-only bridge. Teacher Board owns the writer; Student Board only consumes this snapshot. */
export function readClassroomSessionSnapshot(): ClassroomSessionSnapshot {
  if (typeof window === 'undefined') return FALLBACK;
  try {
    const raw = window.localStorage.getItem('socratic_classroom_session_snapshot');
    if (!raw) return FALLBACK;
    const parsed = JSON.parse(raw) as Partial<ClassroomSessionSnapshot>;
    if (!Array.isArray(parsed.boardSnapshots) || !Array.isArray(parsed.studentWork)) return FALLBACK;
    return {...FALLBACK, ...parsed};
  } catch {
    return FALLBACK;
  }
}

export async function fetchClassroomSessionContext(studentId = 'student_default'): Promise<{
  snapshot: ClassroomSessionSnapshot;
  profile: Record<string, unknown>;
  errors: unknown[];
  roadmap: {steps?: {title: string; detail: string}[]};
} | null> {
  try {
    const response = await fetch(`/api/v1/student/context/${encodeURIComponent(studentId)}`, {cache: 'no-store', headers: contextHeaders()});
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function saveStudentProfile(studentId: string, profile: Record<string, unknown>) {
  try {
    await fetch(`/api/v1/student/profile/${encodeURIComponent(studentId)}`, {method: 'PUT', headers: {...contextHeaders(), 'Content-Type': 'application/json'}, body: JSON.stringify(profile)});
  } catch {
    // Offline mode keeps the profile in localStorage.
  }
}

export async function recordStudentError(studentId: string, payload: {subject: string; concept: string; diagnosis: string}) {
  try {
    await fetch(`/api/v1/student/errors/${encodeURIComponent(studentId)}`, {method: 'POST', headers: {...contextHeaders(), 'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  } catch {
    // The local snapshot remains available when the backend is offline.
  }
}

export async function recordStudentEvent(studentId: string, eventType: string, payload: Record<string, unknown> = {}) {
  try {
    await fetch(`/api/v1/student/events/${encodeURIComponent(studentId)}`, {method: 'POST', headers: {...contextHeaders(), 'Content-Type': 'application/json'}, body: JSON.stringify({event_type: eventType, payload})});
  } catch {
    // Best-effort telemetry; it must never block tutoring.
  }
}

export async function fetchStudentRoadmap(studentId = 'student_default') {
  try {
    const response = await fetch(`/api/v1/student/roadmap/${encodeURIComponent(studentId)}`, {cache: 'no-store', headers: contextHeaders()});
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export const getClassroomContextFallback = () => FALLBACK;

function contextHeaders(): Record<string, string> {
  const token = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STUDENT_CONTEXT_TOKEN : undefined;
  return token ? {Authorization: `Bearer ${token}`} : {};
}

/** Máy chủ trả mốc cập nhật dạng giây Unix ("1793165802.45"); hiển thị giờ Việt Nam thay vì số thô. */
export function formatUpdatedAt(raw: string | number): string {
  const text = String(raw);
  if (!/^\d{9,11}(\.\d+)?$/.test(text)) return text;
  const d = new Date(Number(text) * 1000);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
  return `Hôm nay · ${time}`;
}
