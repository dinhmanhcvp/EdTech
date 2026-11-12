import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {MONO} from '../theme';
import {BlurText} from '../flow/BlurText';
import {Letterbox} from '../flow/fx';

// Montage cuối kiểu FlowCut (src/flow/Montage): lướt toàn bộ tính năng, cắt cứng mỗi nửa phách, chớp 2 frame,
// letterbox; rồi tường thẻ nghiêng trượt ngang + tên sản phẩm. Khác bản gốc: nhận sẵn mốc cắt (nửa phách) và
// clip lấy từ public/sv/ui (bản đã bỏ khung lặp) khi có.
const FPS = 30;
export type MShot = {clip: string; t: number; cx: number; cy: number; s: number; tag: string};
const SMOOTH = new Set(['P', 'Npendulum', 'Noxyz', 'H', 'B', 'C']);
// Như montage của bản mentor duyệt (Launch3 SHOTS3): ưu tiên tính năng mới, khung = 3 s sau khi mô phỏng hiện
// (mốc whoosh-out trong src/demo2/marks), khung đặt giữa bảng mô phỏng (tâm y 0,47, phóng 1,4 lần) để không cắt mất phần trên.
export const MSHOTS: MShot[] = [
  {clip: 'Nconv', t: 19.9, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Chữ tay → công thức'},
  {clip: 'Noxyz', t: 16.45, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Không gian Oxyz'},
  {clip: 'Nrevolve', t: 16.65, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Khối tròn xoay'},
  {clip: 'Nlattice', t: 12.14, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Ô mạng tinh thể'},
  {clip: 'Nsn2', t: 15.28, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Cơ chế SN2'},
  {clip: 'Ncyclo', t: 12.67, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Cấu dạng ghế'},
  {clip: 'Netc', t: 17.41, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Chuỗi truyền electron'},
  {clip: 'Nlotka', t: 17.58, cx: 0.634, cy: 0.47, s: 1.4, tag: 'Thỏ và sói'},
  {clip: 'Npendulum', t: 14.52, cx: 0.634, cy: 0.422, s: 1.67, tag: 'Con lắc kép'},
  {clip: 'C', t: 4.6, cx: 0.3, cy: 0.5, s: 1.7, tag: 'Gia sư Socratic'},
];
const WALL = Array.from({length: 14}, (_, i) => `flow/tiles/m_${String(i + 1).padStart(2, '0')}.jpg`);
const clampN = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const ShotView: React.FC<{shot: MShot; frames: number}> = ({shot, frames}) => {
  const t = useSec();
  const s = shot.s * (1 + 0.05 * (t / (frames / FPS)));
  const tx = clampN(960 - shot.cx * 1920 * s, 1920 - 1920 * s, 0);
  const ty = clampN(540 - shot.cy * 1080 * s, 1080 - 1080 * s, 0);
  return (
    <AbsoluteFill style={{background: '#F7F6F2', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <OffthreadVideo src={staticFile(`${SMOOTH.has(shot.clip) ? 'sv/ui' : 'clips'}/${shot.clip}.mp4`)} startFrom={Math.round(shot.t * FPS)} muted style={{width: 1920, height: 1080}} />
      </div>
      <div style={{position: 'absolute', left: 64, bottom: 156, padding: '10px 20px', borderRadius: 12, background: 'rgba(10,10,12,0.8)', color: '#fff', fontFamily: MONO, fontSize: 26, letterSpacing: 1}}>{shot.tag}</div>
    </AbsoluteFill>
  );
};

/** `cuts`: mốc cắt (giây trong cảnh), cuts[i]→cuts[i+1] là shot i; mốc cuối mở tường thẻ. */
export const SvMontage: React.FC<{cuts: number[]}> = ({cuts}) => {
  const t = useSec();
  const wallAt = cuts[cuts.length - 1];
  const w = t - wallAt;
  const lastCut = [...cuts].reverse().find((c) => c <= t) ?? -9;
  const flash = Math.max(0, 1 - (t - lastCut) * 10) * 0.35;
  const lb = Math.min(ramp(t, 0, 0.3), 1 - ramp(t, wallAt - 0.1, 0.4));
  const titleP = ramp(t, wallAt + 0.7, 0.8, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {cuts.slice(0, -1).map((c, i) => {
        const from = Math.round(c * FPS);
        const to = Math.round(cuts[i + 1] * FPS);
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            <ShotView shot={MSHOTS[i % MSHOTS.length]} frames={to - from} />
          </Sequence>
        );
      })}
      {w < 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
      <Letterbox p={lb} />
      {w > 0 && (
        <AbsoluteFill style={{perspective: 1600, background: '#000'}}>
          <div style={{position: 'absolute', left: 960, top: 540, transformStyle: 'preserve-3d', transform: `rotateY(${lerp(-22, -16, ramp(t, wallAt, 3))}deg) rotateX(8deg) scale(${lerp(1.25, 1.0, ramp(t, wallAt, 1.2, Easing.out(Easing.cubic)))})`}}>
            {[0, 1, 2].map((row) =>
              WALL.map((_, i) => {
                const x = (i - 6) * 470 - w * 120 * (row % 2 ? -1 : 1) + (row % 2) * 235;
                return (
                  <div key={`${row}-${i}`} style={{position: 'absolute', left: x - 220, top: (row - 1) * 270 - 124, width: 440, height: 248, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', filter: 'brightness(0.55)', opacity: ramp(t, wallAt + ((i + row) % 5) * 0.05, 0.3)}}>
                    <Img src={staticFile(WALL[(i + row * 5) % WALL.length])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                );
              }),
            )}
          </div>
          <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${0.7 * titleP}), rgba(0,0,0,${0.35 * titleP}) 70%)`}} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <BlurText text="Một nét phấn. Mọi môn học." at={wallAt + 0.05} out={wallAt + 1.2} size={92} stagger={0.06} />
          </AbsoluteFill>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10}}>
            <BlurText text="Socratic Vision Board" at={wallAt + 1.25} size={150} stagger={0.1} weight={800} />
            <BlurText text="Tự học bản chất. Làm chủ tương lai." at={wallAt + 1.75} size={46} stagger={0.04} weight={600} color="rgba(245,245,247,0.6)" />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
