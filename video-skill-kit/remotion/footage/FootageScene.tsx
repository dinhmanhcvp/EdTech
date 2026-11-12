import React from 'react';
import {AbsoluteFill, Easing, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Captions, lerp as ulerp, ramp, useSec} from '../ui';
import {C, FONT, MONO} from '../theme';
import {ChapterTag} from '../demo/parts';
import {CLIPS} from './clips';
import {camAt, camTransform, clamp, fullness, layoutAt, lerp, segAt, segDur, type Rect} from './camera';
import {FPS, H, W, type Scene, type Seg} from './types';
import {sceneDur, splitVoice, toScene} from './plan';
import {CHAPTERS} from './plan';
import {DIM, INK, LightSweep, SelectGlow, SlideText, StudioBg, dirBlur} from '../flow/fx';

/** Một đoạn footage + camera zoom bên trong cửa sổ. */
const CamVideo: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame();
  const t = seg.from + (f / FPS) * seg.rate;
  const {tx, ty, s} = camTransform(camAt(CLIPS[seg.clip].cams, t));
  return (
    <AbsoluteFill style={{background: '#F8F7F4'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <OffthreadVideo src={staticFile(`clips/${seg.clip}.mp4`)} startFrom={Math.round(seg.from * FPS)} playbackRate={seg.rate} muted style={{width: W, height: H}} />
      </div>
    </AbsoluteFill>
  );
};

const SceneVideo: React.FC<{scene: Scene}> = ({scene}) => {
  let at = Math.round((scene.lead ?? 0) * FPS);
  const nodes: React.ReactNode[] = [];
  scene.segs.forEach((seg, i) => {
    const frames = Math.round(segDur(seg, CLIPS) * FPS);
    nodes.push(
      <Sequence key={`s${i}`} from={at} durationInFrames={frames}>
        <CamVideo seg={seg} />
      </Sequence>,
    );
    at += frames;
  });
  const last = scene.segs[scene.segs.length - 1];
  const lastFrames = Math.round(segDur(last, CLIPS) * FPS);
  nodes.push(
    <Sequence key="hold" from={at} durationInFrames={Math.round(scene.hold * FPS) + 400}>
      <Freeze frame={lastFrames - 1}>
        <CamVideo seg={last} />
      </Freeze>
    </Sequence>,
  );
  return <AbsoluteFill>{nodes}</AbsoluteFill>;
};

/** Cửa sổ app: nghiêng 3D, bo góc, đổ bóng; nội dung quay 1920x1080 được co theo kích thước cửa sổ. */
const AppWindow: React.FC<{scene: Scene; rect: Rect; land: number; select: number | null}> = ({scene, rect, land, select}) => {
  const k = rect.w / W;
  const framed = rect.r > 0.5;
  // lấy nét khi bay vào (nhòe → nét), phản chiếu xuống sàn studio, viền sáng khi khoanh/biên dịch
  const focus = (1 - Math.min(1, rect.op)) * 14;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        opacity: rect.op,
        borderRadius: rect.r,
        background: '#F8F7F4',
        transform: `perspective(2400px) rotateY(${rect.rot}deg)`,
        filter: focus > 0.3 ? `blur(${focus}px)` : undefined,
        boxShadow: framed ? '0 50px 120px rgba(0,0,0,0.75), 0 12px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.10)' : 'none',
        WebkitBoxReflect: framed ? 'below 18px linear-gradient(transparent 72%, rgba(255,255,255,0.12))' : undefined,
      }}
    >
      <div style={{position: 'absolute', inset: 0, borderRadius: rect.r, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${k})`}}>
          <SceneVideo scene={scene} />
        </div>
        {framed && <div style={{position: 'absolute', inset: 0, borderRadius: rect.r, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)', pointerEvents: 'none'}} />}
        <LightSweep at={land} dur={1.3} strength={0.28} />
      </div>
      {select !== null && <SelectGlow at={select} radius={rect.r} />}
    </div>
  );
};

/** Nhãn chỉ vào phần tử giao diện, bám theo camera zoom và vị trí cửa sổ. */
const Callouts: React.FC<{scene: Scene; rect: Rect; ts: number}> = ({scene, rect, ts}) => {
  const st = segAt(scene, CLIPS, ts);
  if (!st) return null;
  const clip = CLIPS[st.seg.clip];
  const out: React.ReactNode[] = [];
  (clip.callouts ?? []).forEach((c, i) => {
    if (c.t < st.seg.from) return;
    const tStart = (scene.lead ?? 0) + st.start + (c.t - st.seg.from) / st.seg.rate;
    const dur = c.dur / st.seg.rate;
    const local = ts - tStart;
    if (local < 0 || local > dur) return;
    const p = Math.min(ramp(local, 0, 0.5), 1 - ramp(local, dur - 0.45, 0.4));
    const {tx, ty, s} = camTransform(camAt(clip.cams, st.tc));
    const k = rect.w / W;
    const ax = rect.x + (tx + c.cx * W * s) * k;
    const ay = rect.y + (ty + c.cy * H * s) * k;
    const flip = ax + c.dx + 560 > W - 30; // sát mép phải: đặt nhãn sang trái điểm neo
    const lx = clamp(flip ? ax - Math.abs(c.dx) : ax + c.dx, 40, W - 40);
    const ly = clamp(ay + c.dy, 60, H - 160);
    const pulse = (Math.sin(ts * 5 + i) + 1) / 2;
    out.push(
      <React.Fragment key={`${c.label}${i}`}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: p, overflow: 'visible'}}>
          <line x1={ax} y1={ay} x2={lerp(ax, lx, p)} y2={lerp(ay, ly, p)} stroke={c.color} strokeWidth={3} />
          <circle cx={ax} cy={ay} r={10 + pulse * 8} fill="none" stroke={c.color} strokeWidth={2.5} opacity={0.55} />
          <circle cx={ax} cy={ay} r={6.5} fill={c.color} />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: lx,
            top: ly,
            opacity: p,
            transform: `translate(${flip || c.dx < 0 ? '-100%' : '0'}, -50%) scale(${lerp(0.88, 1, p)})`,
            padding: '10px 22px',
            borderRadius: 999,
            background: 'rgba(24,24,27,0.94)',
            border: `2px solid ${c.color}`,
            boxShadow: `0 10px 34px rgba(0,0,0,0.45), 0 0 26px ${c.color}55`,
            color: '#F8F7F4',
            fontFamily: FONT,
            fontSize: 29,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {c.label}
        </div>
      </React.Fragment>,
    );
  });
  return <>{out}</>;
};

/** Tiêu đề chủ đề: bắt đầu to ở giữa, thu nhỏ dần vào cột trái khi cửa sổ app bay vào. */
const SideColumn: React.FC<{scene: Scene; rect: Rect; ts: number}> = ({scene, rect, ts}) => {
  const side = scene.side;
  if (!side) return null;
  const dock = ramp(rect.op, 0, 1); // 0 = hero, 1 = đã vào cửa sổ
  const dk = Math.min(1, Math.max(0, (rect.op - 0.05) / 0.9));
  const vis = 1 - fullness(rect);
  const maxLen = Math.max(...side.lines.map((l) => l.replace(/\*/g, '').length));
  const dockSize = Math.min(86, Math.floor(400 / (maxLen * 0.6)));
  const size = ulerp(168, dockSize, dk);
  const left = ulerp(130, 70, dk);
  const top = ulerp(330, 214, dk);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: vis, pointerEvents: 'none'}}>
      {side.kicker && (
        <div style={{position: 'absolute', left, top: top - 50, fontFamily: FONT, fontSize: ulerp(26, 20, dk), fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: DIM, opacity: ramp(ts, 0.1, 0.5)}}>{side.kicker}</div>
      )}
      <div style={{position: 'absolute', left, top, width: ulerp(1400, 430, dk)}}>
        {side.lines.map((l, i) => (
          <SlideText key={l} text={l} at={0.2 + i * 0.22} size={size} accent={side.accent} weight={700} />
        ))}
        {side.sub && (
          <div style={{fontFamily: FONT, fontSize: ulerp(40, 26, dk), color: DIM, fontWeight: 500, marginTop: ulerp(26, 14, dk), lineHeight: 1.3, opacity: ramp(ts, 0.9, 0.6)}}>{side.sub}</div>
        )}
      </div>
      {(side.stats ?? []).map((s) => {
        const on = Math.min(ramp(ts, s.at, 0.6), 1 - (s.to ? ramp(ts, s.to, 0.5) : 0)) * dk;
        if (on <= 0.01) return null;
        const sz = Math.max(54, Math.min(110, Math.round(430 / (s.value.length * 0.6))));
        // số liệu kiểu keynote: số lớn trắng nét mảnh, vạch màu nhấn ngắn, nhãn mờ
        return (
          <div key={s.value} style={{position: 'absolute', left: 70, top: 470, opacity: on, filter: `blur(${(1 - on) * 10}px)`, transform: `translateY(${(1 - on) * 22}px)`, width: 440}}>
            <div style={{width: 44 * on, height: 3, borderRadius: 2, background: s.color, marginBottom: 18}} />
            <div style={{fontFamily: FONT, fontSize: sz, fontWeight: 600, letterSpacing: -sz * 0.035, color: INK, lineHeight: 1}}>{s.value}</div>
            <div style={{fontFamily: FONT, fontSize: 24, fontWeight: 500, color: DIM, marginTop: 14}}>{s.label}</div>
          </div>
        );
      })}
      {(side.chips ?? []).map((c, i) => {
        const on = ramp(ts, c.at, 0.5) * dk;
        return (
          <div key={c.text} style={{position: 'absolute', left: 70, top: 712 + i * 62, opacity: on, filter: dirBlur((1 - on) * 30), transform: `translateX(${(1 - on) * -40}px)`}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: INK, fontFamily: FONT, fontSize: 24, fontWeight: 500}}>
              <span style={{width: 8, height: 8, borderRadius: 4, background: c.color}} />
              {c.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Metric Pill: trượt theo bố cục (dưới cửa sổ khi split, góc dưới trái khi full). */
const Pill: React.FC<{scene: Scene; rect: Rect; ts: number}> = ({scene, rect, ts}) => {
  const ev = scene.hud.find((e) => ts >= e.from && ts < e.to);
  if (!ev) return null;
  const f = fullness(rect);
  const inP = ramp(ts, ev.from, 0.45);
  const outP = ramp(ts, ev.to - 0.4, 0.4);
  const o = Math.min(inP, 1 - outP);
  const pulse = (Math.sin(ts * 4) + 1) / 2;
  return (
    <div style={{position: 'absolute', left: ulerp(500, 64, f), top: ulerp(862, 822, f), opacity: o, transform: `translateY(${(1 - inP) * 16 - outP * 8}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px 12px 14px', borderRadius: 999, background: 'rgba(24,24,27,0.94)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 14px 40px rgba(0,0,0,0.45)', color: '#F8F7F4', fontFamily: MONO, fontSize: 25}}>
        <span style={{display: 'inline-flex', alignItems: 'center', gap: 10, padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', fontWeight: 700, fontSize: 21, color: INK}}>
          <span style={{width: 10, height: 10, borderRadius: 5, background: '#34D399', boxShadow: `0 0 ${6 + pulse * 10}px #34D399`}} />
          {ev.tag}
        </span>
        <span style={{whiteSpace: 'nowrap'}}>{ev.text}</span>
      </div>
    </div>
  );
};

// Gợi ý giáo viên gõ khi quay (tools/clips3.mjs) – hiện lại phóng lớn như ô prompt của Flow.
const HINTS: Record<string, string> = {
  P: 'v_0 = 24 m/s, góc ném 45° (Ném xiên)',
  R: 'Z = √(R² + (Z_L − Z_C)²) (Mạch RLC)',
  H: 'N2 + 3H2 ⇌ 2NH3 (Haber), nồng độ, xúc tác, Ea',
  B: 'ADN: A = T, G ≡ X (chuỗi xoắn kép)',
};

/** Khoảng gõ gợi ý + bấm biên dịch, tính theo giây của cảnh (null nếu cảnh không có). */
const promptWindow = (scene: Scene) => {
  const seg = scene.segs[0];
  if (!seg || !HINTS[seg.clip]) return null;
  const mk = (n: string) => CLIPS[seg.clip].marks.find((m) => m.name === n)?.t;
  const a = mk('lassoEnd');
  const b = mk('typeEnd');
  const c = mk('click');
  if (a === undefined || b === undefined || c === undefined) return null;
  return {start: toScene(scene, seg.clip, a) + 0.15, typed: toScene(scene, seg.clip, b), click: toScene(scene, seg.clip, c), text: HINTS[seg.clip]};
};

/** Ô prompt kính tối nghiêng 3D trồi lên, chữ chạy theo nhịp gõ thật, nút gửi lún xuống khi bấm. */
const PromptCard: React.FC<{pw: NonNullable<ReturnType<typeof promptWindow>>; ts: number}> = ({pw, ts}) => {
  const inP = ramp(ts, pw.start - 0.1, 0.5, Easing.out(Easing.cubic));
  const outP = ramp(ts, pw.click + 0.25, 0.4, Easing.in(Easing.cubic));
  if (inP <= 0 || outP >= 1) return null;
  const n = Math.round(pw.text.length * clamp((ts - pw.start) / Math.max(0.3, pw.typed - pw.start), 0, 1));
  const press = Math.max(0, 1 - Math.abs(ts - pw.click) * 8);
  const caret = Math.floor(ts * 3) % 2 === 0 && ts < pw.typed + 0.1;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 390, display: 'flex', justifyContent: 'center', perspective: 1400, pointerEvents: 'none'}}>
      <div
        style={{
          width: 1180,
          padding: '34px 40px 26px',
          borderRadius: 34,
          background: 'rgba(28,28,31,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
          opacity: inP * (1 - outP),
          filter: `blur(${(1 - inP) * 10 + outP * 12}px)`,
          transform: `translateY(${(1 - inP) * 160 - outP * 40}px) rotateX(${(1 - inP) * 24}deg) scale(${1 - outP * 0.06})`,
        }}
      >
        <div style={{fontFamily: FONT, fontSize: 46, fontWeight: 500, color: INK, minHeight: 58, whiteSpace: 'nowrap'}}>
          {pw.text.slice(0, n)}
          <span style={{opacity: caret ? 1 : 0, color: '#5B8DEF'}}>|</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22}}>
          <div style={{fontFamily: MONO, fontSize: 22, color: DIM, letterSpacing: 2}}>＋ VÙNG KHOANH · MÔ PHỎNG</div>
          <div style={{width: 64, height: 64, borderRadius: 32, background: n >= pw.text.length ? '#F5F5F7' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - press * 0.14})`, boxShadow: press > 0 ? '0 0 0 10px rgba(255,255,255,0.12)' : 'none'}}>
            <span style={{fontSize: 34, color: '#18181B', fontWeight: 700}}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FootageScene: React.FC<{scene: Scene; index: number; prevChapter: number | null; productFilm?: boolean}> = ({scene, index, prevChapter, productFilm = false}) => {
  const ts = useSec();
  const dur = sceneDur(scene);
  const rect = layoutAt(scene.layout, ts);
  // đèn rọi studio bám tâm cửa sổ app; ánh màu rất nhẹ theo accent của cảnh
  const accent = scene.side?.accent ?? C.violet;
  const spot = {x: ((rect.x + rect.w / 2) / W) * 100, y: ((rect.y + rect.h / 2) / H) * 100};
  const splitKf = scene.layout.find((k) => k.mode === 'split');
  const land = splitKf ? splitKf.t + (splitKf.ms ?? 1100) / 1000 - 0.2 : 0.3;
  const seg0 = scene.segs[0];
  const compile = seg0 ? CLIPS[seg0.clip].marks.find((m) => m.name === 'compile') : undefined;
  const select = compile ? toScene(scene, seg0.clip, compile.t) - 0.6 : null;
  // lấy nét chuyển sang ô prompt khi đang gõ: cảnh app lùi mờ, tối đi
  const pw = productFilm ? null : promptWindow(scene);
  const pf = pw ? Math.min(ramp(ts, pw.start - 0.1, 0.45), 1 - ramp(ts, pw.click + 0.2, 0.45)) : 0;
  return (
    <AbsoluteFill>
      <StudioBg spot={rect.op > 0.2 ? spot : {x: 30, y: 45}} tint={accent} />
      <div style={{position: 'absolute', inset: 0, filter: pf > 0.02 ? `blur(${pf * 9}px) brightness(${1 - pf * 0.35})` : undefined, transform: `scale(${1 - pf * 0.03})`}}>
        <SideColumn scene={scene} rect={rect} ts={ts} />
        <AppWindow scene={scene} rect={rect} land={land} select={select} />
      </div>
      {pw && <PromptCard pw={pw} ts={ts} />}
      {!productFilm && <Callouts scene={scene} rect={rect} ts={ts} />}
      <Pill scene={scene} rect={rect} ts={ts} />
      <ChapterTag index={scene.chapter} labels={CHAPTERS} show={prevChapter !== scene.chapter} />
      <Captions caps={splitVoice(scene.voice, dur)} />
    </AbsoluteFill>
  );
};
