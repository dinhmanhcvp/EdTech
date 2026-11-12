import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {C, MONO} from '../theme';
import {BlurText} from './BlurText';
import {BED, beatsIn, type Bed} from './music';
import {Letterbox} from './fx';

// Montage cắt cứng đúng phách (như đoạn 43-52s của Flow): mỗi phách một khoảnh khắc mô phỏng thật, camera đẩy nhẹ liên tục,
// rồi bức tường thẻ nghiêng trượt ngang + tên sản phẩm phóng lớn.
export const MONTAGE_DUR = 10.8;
const FPS = 30;

export type Shot = {clip: string; t: number; cx: number; cy: number; s: number; tag: string};
const SHOTS: Shot[] = [
  {clip: 'P', t: 12.0, cx: 0.43, cy: 0.46, s: 1.9, tag: 'Viết tay · khoanh vùng'},
  {clip: 'P', t: 28.8, cx: 0.66, cy: 0.52, s: 2.5, tag: 'Vật lý · Ném xiên'},
  {clip: 'R', t: 31.0, cx: 0.667, cy: 0.46, s: 2.5, tag: 'Vật lý · Mạch RLC'},
  {clip: 'H', t: 28.7, cx: 0.667, cy: 0.48, s: 2.5, tag: 'Hóa học · Haber'},
  {clip: 'B', t: 22.6, cx: 0.656, cy: 0.59, s: 2.3, tag: 'Sinh học · ADN'},
  {clip: 'C', t: 11.3, cx: 0.3, cy: 0.51, s: 1.8, tag: 'Gia sư Socratic'},
  {clip: 'C', t: 24.0, cx: 0.5, cy: 0.57, s: 1.6, tag: 'SymPy xác minh'},
  {clip: 'D', t: 22.0, cx: 0.64, cy: 0.8, s: 1.7, tag: 'Săn bẫy Đúng / Sai'},
  {clip: 'E', t: 13.5, cx: 0.64, cy: 0.13, s: 1.6, tag: 'Bản đồ nhiệt lớp học'},
];
const WALL = Array.from({length: 14}, (_, i) => `flow/tiles/m_${String(i + 1).padStart(2, '0')}.jpg`);

const clampN = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const ShotView: React.FC<{shot: Shot; frames: number}> = ({shot, frames}) => {
  const t = useSec();
  const k = 1 + 0.05 * (t / (frames / FPS)); // đẩy camera liên tục, không bao giờ đứng yên
  const s = shot.s * k;
  const tx = clampN(960 - shot.cx * 1920 * s, 1920 - 1920 * s, 0);
  const ty = clampN(540 - shot.cy * 1080 * s, 1080 - 1080 * s, 0);
  return (
    <AbsoluteFill style={{background: '#F7F6F2', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <OffthreadVideo src={staticFile(`clips/${shot.clip}.mp4`)} startFrom={Math.round(shot.t * FPS)} muted style={{width: 1920, height: 1080}} />
      </div>
      <div style={{position: 'absolute', left: 64, bottom: 156, padding: '10px 20px', borderRadius: 12, background: 'rgba(10,10,12,0.8)', color: '#fff', fontFamily: MONO, fontSize: 26, letterSpacing: 1}}>
        {shot.tag}
      </div>
    </AbsoluteFill>
  );
};

/** Vết cắt = các phách nhạc trong cảnh (giây tính từ đầu cảnh); phách cuối mở tường thẻ. */
export const montageCuts = (startSec: number, totalSec: number, bed: Bed = BED, shots: Shot[] = SHOTS) => {
  const cuts = beatsIn(totalSec, startSec + 0.1, startSec + MONTAGE_DUR, 'beats', bed).map((b) => b - startSec);
  const shotCuts = cuts.slice(0, shots.length + 1);
  return {cuts: shotCuts, wallAt: shotCuts[shotCuts.length - 1] ?? 7};
};

export const Montage: React.FC<{startSec: number; totalSec: number; bed?: Bed; shots?: Shot[]}> = ({startSec, totalSec, bed = BED, shots = SHOTS}) => {
  const t = useSec();
  const {cuts: shotCuts, wallAt} = montageCuts(startSec, totalSec, bed, shots);
  const w = t - wallAt;
  // chớp sáng 2 frame ở mỗi vết cắt + letterbox điện ảnh trong lúc montage
  const lastCut = [...shotCuts].reverse().find((c) => c <= t) ?? -9;
  const flash = Math.max(0, 1 - (t - lastCut) * 10) * 0.35;
  const lb = Math.min(ramp(t, (shotCuts[0] ?? 0.5) - 0.3, 0.35), 1 - ramp(t, wallAt - 0.1, 0.4));
  const slideX = -w * 120;
  const titleP = ramp(t, wallAt + 0.9, 0.8, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* trước phách đầu: khung đen ngắn tạo "hơi thở" trước nhịp vào */}
      {shotCuts.slice(0, -1).map((c, i) => {
        const from = Math.round(c * FPS);
        const to = Math.round(shotCuts[i + 1] * FPS);
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}>
            <ShotView shot={shots[i]} frames={to - from} />
          </Sequence>
        );
      })}
      {w < 0 && <AbsoluteFill style={{background: '#fff', opacity: flash, pointerEvents: 'none'}} />}
      <Letterbox p={lb} />
      {w > 0 && (
        <AbsoluteFill style={{perspective: 1600, background: '#000'}}>
          <div style={{position: 'absolute', left: 960, top: 540, transformStyle: 'preserve-3d', transform: `rotateY(${lerp(-22, -16, ramp(t, wallAt, 3))}deg) rotateX(8deg) scale(${lerp(1.25, 1.0, ramp(t, wallAt, 1.2, Easing.out(Easing.cubic)))})`}}>
            {[0, 1, 2].map((row) =>
              WALL.map((src, i) => {
                const x = (i - 6) * 470 + slideX * (row % 2 ? -1 : 1) + (row % 2) * 235;
                return (
                  <div key={`${row}-${i}`} style={{position: 'absolute', left: x - 220, top: (row - 1) * 270 - 124, width: 440, height: 248, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', filter: 'brightness(0.55)', opacity: ramp(t, wallAt + ((i + row) % 5) * 0.05, 0.3)}}>
                    <Img src={staticFile(WALL[(i + row * 5) % WALL.length])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  </div>
                );
              }),
            )}
          </div>
          <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${0.7 * titleP}), rgba(0,0,0,${0.35 * titleP}) 70%)`}} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18}}>
            <BlurText text="Một nét phấn. Mọi môn học." at={wallAt + 0.15} out={wallAt + 1.9} size={92} stagger={0.1} />
          </AbsoluteFill>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10}}>
            <BlurText text="Socratic Vision Board" at={wallAt + 2.0} size={150} stagger={0.16} weight={800} />
            <BlurText text="Phòng thí nghiệm sinh ra từ bảng viết" at={wallAt + 2.7} size={46} stagger={0.06} weight={600} color={C.muted} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
