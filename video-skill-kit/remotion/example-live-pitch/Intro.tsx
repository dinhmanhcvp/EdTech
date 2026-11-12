import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile} from 'remotion';
import {ramp, useSec} from '../ui';
import {FONT} from '../theme';
import {BlurText} from '../flow/BlurText';
import {Letterbox} from '../flow/fx';
import {Device, Stage, SV, expo} from './parts';
import {LassoLockup, LOGO_CREAM, LOGO_INK, LOGO_RED} from './LassoLogo';
import {FPS} from './plan';

// Intro kiểu trailer: chuỗi shot cắt đúng phách nhạc (letterbox, chớp 2 frame), chữ câu hỏi, rồi logo trên nền kem.
// `cuts`: các mốc phách (giây trong cảnh) lấy từ lưới nhạc flow_bed; shot thứ i chạy từ cuts[i] tới cuts[i+1].
type Shot = {src: string; from: number; ui?: boolean};
// từng cặp shot đi với một câu trong WORDS
export const INTRO_SHOTS: Shot[] = [
  {src: '1671', from: 0.4},
  {src: '1679', from: 9.0},
  {src: '1690', from: 8.2},
  {src: '1690', from: 10.4},
  {src: '1696', from: 9.0},
  {src: '1690', from: 18.4},
  {src: '1709', from: 9.0},
  {src: '1794', from: 13.0},
];
const WORDS: [number, number, string][] = [
  [0, 2, 'Thầy giảng.'],
  [2, 4, 'Trò chép.'],
  [4, 6, 'AI giải hộ.'],
  [6, 8, 'Ai đang thực sự học?'],
];

export const Intro: React.FC<{cuts: number[]; logoAt: number}> = ({cuts, logoAt}) => {
  const t = useSec();
  const i = Math.max(0, cuts.findIndex((c, k) => t >= c && t < (cuts[k + 1] ?? logoAt)));
  const flash = cuts.some((c) => t >= c && t < c + 2 / FPS) ? 0.55 : 0;
  const lb = ramp(t, 0, 0.6, expo) * (1 - ramp(t, logoAt - 0.3, 0.3));
  const word = WORDS.find(([a, b]) => i >= a && i < b);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {t < logoAt &&
        INTRO_SHOTS.map((s, k) =>
          k !== i ? null : (
            <Sequence key={k} from={Math.round(cuts[k] * FPS)} layout="none">
              <AbsoluteFill style={{transform: `scale(${interpolate(t - cuts[k], [0, 1], [1.08, 1.0], {extrapolateRight: 'clamp'})})`}}>
                {s.ui ? (
                  <Stage>
                    <Device cuts={[[0, s.src, s.from]]} w={1500} cy={540} tilt={0} cam={[{t: 0, z: 1.5, x: 0.62, y: 0.5}]} />
                  </Stage>
                ) : (
                  <OffthreadVideo src={staticFile(`sv/${s.src}.mp4`)} startFrom={Math.round(s.from * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                )}
              </AbsoluteFill>
            </Sequence>
          ),
        )}
      {t < logoAt && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
      {t < logoAt && <Letterbox p={lb} />}
      {t < logoAt && word && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <BlurText key={word[2]} text={word[2]} at={cuts[word[0]]} out={cuts[word[1]] ?? logoAt} size={word[0] === 6 ? 104 : 120} weight={800} stagger={0.05} style={{textShadow: '0 4px 40px rgba(0,0,0,0.65)'}} />
        </AbsoluteFill>
      )}
      {t >= logoAt && (
        <Sequence from={Math.round(logoAt * FPS)} layout="none">
          <AbsoluteFill style={{background: `radial-gradient(110% 90% at 50% 45%, #FFFDF8 0%, ${LOGO_CREAM} 60%, #EFEADF 100%)`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 54}}>
            <LassoLockup at={0.05} scale={0.9} />
            <LogoLine />
          </AbsoluteFill>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const LogoLine: React.FC = () => {
  const t = useSec();
  const p = ramp(t, 1.5, 0.7, expo);
  return (
    <div style={{fontFamily: FONT, fontSize: 40, fontWeight: 600, color: LOGO_INK, opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}>
      Biến nét phấn tĩnh thành <span style={{color: LOGO_RED}}>tư duy sống</span>.
    </div>
  );
};

/**
 * "Ma sát nhận thức có chủ đích": lối tắt tới đáp án bị khóa, học sinh phải đi qua từng bậc gợi mở.
 * Bên trái: màn hình gia sư thật lúc khiên chặn bật lên (clip C, mốc shield 4,3 s).
 */
export const Friction: React.FC = () => {
  const t = useSec();
  const steps = ['Đề bài', 'Câu hỏi gợi mở', 'Công cụ trực quan', 'Tự giải'];
  const lock = ramp(t, 1.6, 0.35, Easing.out(Easing.back(2)));
  return (
    <AbsoluteFill style={{background: 'radial-gradient(90% 80% at 60% 40%, #23262E 0%, #121318 65%, #0A0A0C 100%)'}}>
      <Device cuts={[[0, 'C', 3.4]]} w={760} cx={470} cy={430} tilt={14} cam={[{t: 0, z: 1, x: 0.5, y: 0.5}, {t: 0.9, z: 1.35, x: 0.3, y: 0.45}]} />
      <div style={{position: 'absolute', left: 930, top: 150, width: 900, fontFamily: FONT, color: '#fff'}}>
        <div style={{fontSize: 26, fontWeight: 800, letterSpacing: 4, color: '#FF6B61', opacity: ramp(t, 0.2, 0.6)}}>NGUYÊN LÝ CỐT LÕI</div>
        <BlurText text="Ma sát nhận thức" at={0.35} size={92} weight={800} stagger={0.07} style={{textShadow: 'none'}} />
        <BlurText text="có chủ đích." at={0.75} size={92} weight={800} stagger={0.07} color="#FF6B61" style={{textShadow: 'none'}} />
        <div style={{fontSize: 34, fontWeight: 500, color: 'rgba(255,255,255,0.72)', marginTop: 18, lineHeight: 1.35, opacity: ramp(t, 1.2, 0.7)}}>
          Không đưa sẵn đáp án. Lối tắt bị khóa,<br />học sinh tự đi từng bậc để hiểu bản chất.
        </div>
        {/* lối tắt bị khóa */}
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 40, opacity: ramp(t, 1.4, 0.4)}}>
          <Pill>Đề bài</Pill>
          <div style={{position: 'relative', width: 180, height: 4, background: 'rgba(255,255,255,0.35)'}}>
            <div style={{position: 'absolute', left: 70, top: -26, width: 52, height: 52, borderRadius: 14, background: SV.red, color: '#fff', fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${lock})`}}>✕</div>
          </div>
          <Pill dim>Đáp án có sẵn</Pill>
        </div>
        {/* con đường có ma sát */}
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 34}}>
          {steps.map((s, k) => {
            const p = ramp(t, 2.3 + k * 0.45, 0.5, expo);
            return (
              <React.Fragment key={s}>
                {k > 0 && <div style={{width: 34 * p, height: 4, background: SV.green, opacity: p}} />}
                <div style={{opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
                  <Pill color={k === steps.length - 1 ? SV.green : undefined}>{s}</Pill>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{fontSize: 24, color: 'rgba(255,255,255,0.45)', marginTop: 34, opacity: ramp(t, 4.2, 0.6)}}>Dựa trên nguyên lý “desirable difficulties” (R. A. Bjork)</div>
      </div>
    </AbsoluteFill>
  );
};

const Pill: React.FC<{children: React.ReactNode; dim?: boolean; color?: string}> = ({children, dim, color}) => (
  <div
    style={{
      padding: '12px 22px',
      borderRadius: 999,
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      color: dim ? 'rgba(255,255,255,0.4)' : '#fff',
      background: color ?? (dim ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'),
      border: `1px solid ${dim ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)'}`,
      textDecoration: dim ? 'line-through' : 'none',
    }}
  >
    {children}
  </div>
);
