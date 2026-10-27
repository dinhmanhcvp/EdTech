import {OnlineTutorAttemptResultSchema, OnlineTutorProgressSchema, type OnlineTutorProgress} from '@socratic/types';

export async function fetchTutorProgress(signal: AbortSignal): Promise<OnlineTutorProgress> {
  const response = await fetch('/api/v1/student/tutor/student_default/progress', {cache: 'no-store', signal});
  if (!response.ok) throw new Error('progress_unavailable');
  return OnlineTutorProgressSchema.parse(await response.json());
}

export interface OnlineVerdict {
  status: 'VERIFIED_CORRECT' | 'VERIFIED_INCORRECT' | 'UNVERIFIED';
  feedback: string;
  points: number;
  mastery?: number;
  progress?: OnlineTutorProgress;
  /** False means the response may have been lost: reuse the request ID. */
  acknowledged?: boolean;
}

/** Guidance and network failures are not evidence for updating knowledge state. */
export async function evaluateOnline(payload: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<OnlineVerdict> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const catalog = typeof payload.problem_id === 'string';
    const response = await fetcher(catalog ? '/api/v1/student/tutor/student_default/attempts' : '/api/v1/companion/evaluate-step', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại; bài làm vẫn được giữ.',
        403: 'Tài khoản hiện tại không có quyền chấm bài này. Hãy kiểm tra tài khoản học sinh.',
        409: 'Tiến độ hoặc mã lần gửi không khớp. Hãy tải lại tiến độ rồi gửi lại bài.',
        422: 'Nội dung gửi chưa hợp lệ. Hãy kiểm tra biểu thức (tối đa 200 ký tự).',
      };
      if (messages[response.status]) return {status: 'UNVERIFIED', feedback: messages[response.status], points: 0, acknowledged: false};
      throw new Error('service_unavailable');
    }
    const result = await response.json();
    if (catalog) {
      const parsed = OnlineTutorAttemptResultSchema.safeParse(result);
      if (!parsed.success || !parsed.data.progress.problems.some(p => p.problem_id === payload.problem_id)) {
        return {status: 'UNVERIFIED', points: 0, acknowledged: false, feedback: 'Phản hồi máy chấm chưa hợp lệ. Bài làm vẫn được giữ; hãy thử lại.'};
      }
      return {...parsed.data, acknowledged: true};
    }
    if (result.verification_source !== 'SYMPY_DETERMINISTIC' || typeof result.is_step_correct !== 'boolean' || result.error_category === 'SYNTAX_ERROR') {
      return {status: 'UNVERIFIED', feedback: result.socratic_feedback || 'Chưa đủ bằng chứng để chấm. Hãy kiểm tra lại biểu thức.', points: 0};
    }
    return {status: result.is_step_correct ? 'VERIFIED_CORRECT' : 'VERIFIED_INCORRECT', feedback: result.socratic_feedback || '', points: result.is_step_correct ? Math.max(0, Number(result.eureka_points_delta) || 0) : 0};
  } catch {
    return {status: 'UNVERIFIED', feedback: 'Chưa nhận được kết quả máy chấm. Bài được giữ nguyên; giao diện chưa cộng điểm. Thử lại sẽ kiểm tra cùng lần gửi.', points: 0, acknowledged: false};
  } finally { clearTimeout(timeout); }
}
