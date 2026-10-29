/**
 * Trang /demo phát lại các cảnh quay đã ghi sẵn từ phần mềm thật (tools/demo-video). Không có nút nào hiện trên màn hình:
 * điều khiển bằng phím (bàn phím hoặc bút trình chiếu gửi PageDown/PageUp/B) và một vùng chạm vô hình ở góc dưới trái.
 */
/** replay: tua về đầu rồi phát lại ngay (bấm phát khi cảnh cuối / link một cảnh đã hết: quay lại shot không cần thao tác thêm). */
export type DemoPhase = 'ready' | 'playing' | 'replay' | 'ended' | 'black';

export interface DemoState {
  index: number;
  count: number;
  phase: DemoPhase;
}

export interface DemoScene {
  id: string;
  title: string;
  device: 'board' | 'laptop' | 'tablet' | 'phone';
  file: string;
  poster: string;
  duration: number;
  width: number;
  height: number;
}

const PLAY = new Set([' ', 'Enter', 'PageDown', 'ArrowRight']);
const BACK = new Set(['PageUp', 'ArrowLeft']);
const BLANK = new Set(['b', 'B', '.']);

/** Phím → trạng thái mới. Phím phát khi đang chạy thì bỏ qua để bấm đúp trên bút trình chiếu không nhảy cảnh. */
export function demoKey(s: DemoState, key: string): DemoState {
  const at = (index: number): DemoState => ({...s, index: Math.min(s.count - 1, Math.max(0, index)), phase: 'ready'});
  if (s.phase === 'black') return {...s, phase: 'ready'};
  if (BLANK.has(key)) return {...s, phase: 'black'};
  if (PLAY.has(key)) {
    if (s.phase === 'ready') return {...s, phase: 'playing'};
    if (s.phase === 'ended') return s.index < s.count - 1 ? at(s.index + 1) : {...s, phase: 'replay'};
    return s;
  }
  if (BACK.has(key)) return at(s.index - 1);
  if (key === 'r' || key === 'R') return at(s.index);
  if (/^[1-9]$/.test(key)) {
    const i = Number(key) - 1;
    return i < s.count ? at(i) : s;
  }
  return s;
}
