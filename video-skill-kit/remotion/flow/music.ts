// Nhạc nền kéo dài từ video tham chiếu (tools/flow_music.py) + lưới phách để cắt hình đúng nhịp.
// Nhạc được đặt sao cho phần outro của bài khớp đúng điểm kết thúc video.
// Mỗi bản dựng có độ dài riêng nên có file nhạc riêng (flow_bed cho FlowCut, launch_bed cho Launch).
import bed from '../../public/music/flow_bed.json';

export type Bed = {
  duration: number;
  bpm: number;
  beat: number;
  bar: number;
  outroAt: number;
  beats: number[];
  bars: number[];
};
export const BED = bed as Bed;

/** Thời điểm (giây video) bắt đầu phát nhạc; âm = cắt bớt đầu nhạc. */
export const musicStart = (totalSec: number, b: Bed = BED) => totalSec - b.duration;

/** Các phách (giây video) trong khoảng [a, b). */
export const beatsIn = (totalSec: number, a: number, b: number, grid: 'beats' | 'bars' = 'beats', bd: Bed = BED) => {
  const off = musicStart(totalSec, bd);
  return bd[grid].map((t) => t + off).filter((t) => t >= a && t < b);
};
