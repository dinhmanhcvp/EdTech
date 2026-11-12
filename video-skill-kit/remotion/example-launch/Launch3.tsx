import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {TransitionSeries, springTiming} from '@remotion/transitions';
import {FootageScene} from '../demo2/FootageScene';
import {CLIPS} from '../demo2/clips';
import {toScene} from '../demo2/plan';
import {blurZoom} from '../flow/blurZoom';
import {through, whip} from '../flow/whip';
import {DirBlurDefs, DIM, Grain, StudioBg} from '../flow/fx';
import {CardCloud, OPEN_DUR} from '../flow/CardCloud';
import {Montage, montageCuts} from '../flow/Montage';
import {EndCard} from '../flow/EndCard';
import {BlurText} from '../flow/BlurText';
import {LogoAnim, LOGO_LAND, Wordmark} from '../flow/LogoAnim';
import {sceneCues} from '../flow/sfx';
import {musicStart, type Bed} from '../flow/music';
import bedJson from '../../public/music/launch3_bed.json';
import voJson from './vo.json';
import {FPS, ITEMS, SHOTS3, STARTS, TOTAL_FRAMES, XFADE, startOf, type Item} from './plan';

// Phim giới thiệu Socratic Vision Board v3: nhạc dẫn dắt, demo app thật (gồm các tính năng mới), không lời đọc.
const BED = bedJson as Bed;
const TOTAL_SEC = TOTAL_FRAMES / FPS;

const BrandReveal: React.FC = () => (
  <AbsoluteFill>
    <StudioBg spot={{x: 50, y: 45}} intensity={0.9} />
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34}}>
      <LogoAnim at={0.15} size={230} />
      <Wordmark at={1.1} size={124} tagline="" />
      <BlurText text="Biến nét phấn thành thực tại." at={2.2} size={46} stagger={0.08} weight={500} color={DIM} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Chữ lớn trên cảnh viết tay mở đầu: Viết. → Khoanh. → Thấy. (mực đen trên nền giấy của app, góc phải). */
const ColdWords: React.FC<{item: Extract<Item, {kind: 'scene'}>}> = ({item}) => {
  const sc = item.scene;
  const mk = (n: string) => CLIPS.P.marks.find((m) => m.name === n)?.t ?? 0;
  const words: [string, number, number][] = [
    ['Viết.', 0.4, toScene(sc, 'P', mk('inkEnd')) - 0.2],
    ['Khoanh.', toScene(sc, 'P', mk('lasso')), toScene(sc, 'P', mk('lassoEnd')) + 0.3],
    ['Thấy.', toScene(sc, 'P', mk('whoosh-out')) + 0.2, 999],
  ];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {words.map(([w, a, b]) => (
        <div key={w} style={{position: 'absolute', right: 120, bottom: 110}}>
          <BlurText text={w} at={a} out={b} size={170} weight={800} color="#18181B" stagger={0} style={{textShadow: '0 2px 30px rgba(248,247,244,0.9)'}} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

const node = (it: Item) => {
  if (it.kind === 'flow') {
    if (it.id === 'open') return <CardCloud />;
    if (it.id === 'brand') return <BrandReveal />;
    if (it.id === 'montage') return <Montage startSec={startOf('montage') / FPS} totalSec={TOTAL_SEC} bed={BED} shots={SHOTS3} />;
    return <EndCard credits={false} />;
  }
  return (
    <AbsoluteFill>
      <FootageScene scene={it.scene} index={it.index} prevChapter={null} />
      {it.id === 'V3-cold' && <ColdWords item={it} />}
    </AbsoluteFill>
  );
};

const musicLevel = (f: number) => {
  const pts: number[] = [];
  const vals: number[] = [];
  ITEMS.forEach((it, i) => {
    const a = STARTS[i] + (i ? 9 : 0);
    const b = STARTS[i] + it.frames - 9;
    if (pts.length && a <= pts[pts.length - 1]) return;
    pts.push(a, Math.max(a + 1, b));
    vals.push(it.music, it.music);
  });
  return interpolate(f, pts, vals, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * interpolate(f, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
};

// ---- giọng thuyết minh (tools/tts-launch3.mjs): mỗi cảnh một câu, vào sau mở cảnh một nhịp ngắn
const VO_AT: Record<string, number> = {open: 1.2, 'V3-cold': 0.3, brand: 0.5, end: 2.6};
const VO_LINES = Object.entries(voJson as Record<string, {dur: number}>)
  .map(([id, v]) => {
    const i = ITEMS.findIndex((x) => x.id === id);
    return i < 0 ? null : {id, from: STARTS[i] + Math.round((VO_AT[id] ?? 0.35) * FPS), frames: Math.ceil(v.dur * FPS)};
  })
  .filter((x): x is {id: string; from: number; frames: number} => !!x);

/** Hạ nhạc còn ~40% khi có lời đọc (vào/ra mềm 8 frame). */
const duck = (f: number) => {
  let k = 1;
  for (const v of VO_LINES) {
    const a = v.from - 8;
    const b = v.from + v.frames + 8;
    if (f < a || f > b) continue;
    const p = Math.min(1, (f - a) / 8, (b - f) / 8);
    k = Math.min(k, 1 - 0.6 * Math.max(0, p));
  }
  return k;
};

const Voice: React.FC = () => (
  <>
    {VO_LINES.map((v) => (
      <Sequence key={v.id} from={v.from} durationInFrames={v.frames + 10}>
        <Audio src={staticFile(`voice3/${v.id}.mp3`)} volume={1} />
      </Sequence>
    ))}
  </>
);

const Music: React.FC = () => {
  const off = Math.round(musicStart(TOTAL_SEC, BED) * FPS);
  return off >= 0 ? (
    <Sequence from={off}>
      <Audio src={staticFile('music/launch3_bed.mp3')} volume={(f) => musicLevel(f + off) * duck(f + off)} />
    </Sequence>
  ) : (
    <Audio src={staticFile('music/launch3_bed.mp3')} startFrom={-off} volume={(f) => musicLevel(f) * duck(f)} />
  );
};

type Cue = {abs: number; file: string; vol: number; rate?: number};
const TRANS: Record<string, [string, number][]> = {whip: [['whip', 0.55]], through: [['swoosh', 0.5], ['hit', 0.3]], blur: [['swoosh', 0.35]]};
const cues = (): Cue[] => {
  const out: Cue[] = [];
  const abs = (i: number, t: number) => STARTS[i] + Math.round(t * FPS);
  const idx = (id: string) => ITEMS.findIndex((x) => x.id === id);
  ITEMS.forEach((it, i) => {
    if (i > 0 && !it.cut) (TRANS[it.tr ?? 'blur'] ?? []).forEach(([file, vol]) => out.push({abs: STARTS[i] - 2, file, vol}));
    if (it.kind === 'scene') sceneCues(it.scene).forEach((c) => out.push({...c, abs: abs(i, c.t)}));
  });
  const o = idx('open');
  out.push({abs: abs(o, 0), file: 'swell', vol: 0.3}, {abs: abs(o, 1.9), file: 'riser', vol: 0.45}, {abs: abs(o, 4.3), file: 'swoosh', vol: 0.5}, {abs: abs(o, OPEN_DUR - 0.25), file: 'impact', vol: 0.55});
  const b = idx('brand');
  out.push({abs: abs(b, 0.3), file: 'swoosh', vol: 0.35}, {abs: abs(b, 0.6), file: 'pen2', vol: 0.45}, {abs: abs(b, 0.15 + LOGO_LAND), file: 'impact', vol: 0.6}, {abs: abs(b, 1.1), file: 'whip', vol: 0.3});
  const m = idx('montage');
  const {cuts, wallAt} = montageCuts(startOf('montage') / FPS, TOTAL_SEC, BED, SHOTS3);
  cuts.forEach((c, k) => out.push({abs: abs(m, c), file: k % 3 === 2 ? 'shutter' : 'hit', vol: 0.4}));
  out.push({abs: abs(m, wallAt), file: 'swoosh', vol: 0.55}, {abs: abs(m, wallAt + 2.0), file: 'impact', vol: 0.6});
  const e = idx('end');
  out.push({abs: abs(e, 0), file: 'whip', vol: 0.5}, {abs: abs(e, 2.7 + LOGO_LAND), file: 'impact', vol: 0.55}, {abs: abs(e, 2.7 + LOGO_LAND), file: 'sub', vol: 0.6});
  return out.filter((c) => c.abs >= 0);
};

const presentation = (it: Item) => (it.tr === 'whip' ? whip() : it.tr === 'through' ? through() : blurZoom());

export const Launch3: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <DirBlurDefs />
    <TransitionSeries>
      {ITEMS.flatMap((it, i) => {
        const seq = (
          <TransitionSeries.Sequence key={it.id} durationInFrames={it.frames}>
            {node(it)}
          </TransitionSeries.Sequence>
        );
        if (i === 0 || it.cut) return [seq];
        return [<TransitionSeries.Transition key={`${it.id}-t`} presentation={presentation(it)} timing={springTiming({config: {damping: 200}, durationInFrames: XFADE})} />, seq];
      })}
    </TransitionSeries>
    <Grain opacity={0.06} />
    <Music />
    <Voice />
    {cues().map((s, i) => (
      <Sequence key={i} from={s.abs} durationInFrames={110}>
        <Audio src={staticFile(`sfx/${s.file}.mp3`)} volume={s.vol} playbackRate={s.rate ?? 1} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
