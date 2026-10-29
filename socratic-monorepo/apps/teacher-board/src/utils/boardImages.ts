/**
 * Ảnh của đối tượng ảnh trên bảng (Stroke.image): tải một lần qua hub (X-Board-Token), báo canvas vẽ lại khi xong.
 * Không tải được (bảng đã ngắt ghép, mất mạng) → canvas vẽ khung xám thay ảnh.
 */
import {hubBoard} from './hubBoard';

export type BoardImageState = {state: 'loading'} | {state: 'error'} | {state: 'ready'; img: HTMLImageElement};

export function createBoardImageLoader(onChange: () => void) {
  const cache = new Map<string, BoardImageState>();
  return (ref: {assignmentId: string; page: number}): BoardImageState => {
    const key = `${ref.assignmentId}:${ref.page}`;
    const hit = cache.get(key);
    if (hit) return hit;
    cache.set(key, {state: 'loading'});
    const fail = () => {
      cache.set(key, {state: 'error'});
      onChange();
    };
    hubBoard
      .pageUrl(ref.assignmentId, ref.page)
      .then((url) => {
        const img = new Image();
        img.onload = () => {
          cache.set(key, {state: 'ready', img});
          onChange();
        };
        img.onerror = fail;
        img.src = url;
      })
      .catch(fail);
    return {state: 'loading'};
  };
}
