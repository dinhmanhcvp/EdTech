import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile} from 'remotion';
import {ramp, useSec} from '../ui';
import {FONT} from '../theme';

// Bảng màu phim SV: ánh sáng ban ngày (giống tham chiếu Apple), một màu nhấn xanh thương hiệu + đỏ cho "vấn đề".
export const SV = {
  ink: '#111216',
  sub: '#5B5E6B',
  paper: '#F5F5F7',
  blue: '#2F6BFF',
  cyan: '#22C3EE',
  red: '#FF453A',
  green: '#30D158',
};
export const expo = Easing.bezier(0.16, 1, 0.3, 1);

/** Chip chú thích nổi lên theo lời (kính mờ, chấm màu), tự ẩn sau `until`. */
export const Chip: React.FC<{at: number; until?: number; color?: string; dark?: boolean; size?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at,
  until = 1e9,
  color = SV.blue,
  dark = true,
  size = 34,
  style,
  children,
}) => {
  const t = useSec();
  const p = ramp(t, at, 0.5, expo);
  const o = 1 - ramp(t, until, 0.35);
  if (p <= 0 || o <= 0) return null;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        padding: `${size * 0.42}px ${size * 0.8}px ${size * 0.42}px ${size * 0.6}px`,
        borderRadius: 999,
        background: dark ? 'rgba(18,18,22,0.62)' : 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        color: dark ? '#fff' : SV.ink,
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: -0.3,
        whiteSpace: 'nowrap',
        opacity: Math.min(p * 1.4, 1) * o,
        transform: `translateY(${(1 - p) * 26}px) scale(${0.92 + 0.08 * p})`,
        filter: `blur(${(1 - p) * 8}px)`,
        ...style,
      }}
    >
      <span style={{width: size * 0.36, height: size * 0.36, borderRadius: 99, background: color, boxShadow: `0 0 ${size * 0.5}px ${color}`}} />
      {children}
    </div>
  );
};

/** Khung nổi trên shot người thật: bay ra từ chiều sâu (mờ → nét, nghiêng → thẳng), lơ lửng nhẹ, ẩn sau `until`. */
export const Float: React.FC<{at: number; until?: number; x: number; y: number; tilt?: number; children: React.ReactNode}> = ({at, until = 1e9, x, y, tilt = 10, children}) => {
  const t = useSec();
  const p = ramp(t, at, 0.8, expo);
  const o = 1 - ramp(t, until, 0.4);
  if (p <= 0 || o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: Math.min(1, p * 1.5) * o,
        filter: `blur(${(1 - p) * 12}px)`,
        transform: `perspective(1600px) translateY(${(1 - p) * 60 + Math.sin((t - at) * 1.6) * 6}px) rotateY(${tilt * (1 - p) + tilt * 0.35}deg) scale(${0.82 + 0.18 * p - (1 - o) * 0.08})`,
      }}
    >
      {children}
    </div>
  );
};

/** Thẻ trắng bo góc dùng trong khung nổi. */
export const Panel: React.FC<{w: number; style?: React.CSSProperties; children: React.ReactNode}> = ({w, style, children}) => (
  <div style={{width: w, borderRadius: 26, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 80px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.18)', padding: 26, fontFamily: FONT, color: SV.ink, ...style}}>
    {children}
  </div>
);

/** Khung điện thoại (viền đen, màn trắng). */
export const Phone: React.FC<{w?: number; children: React.ReactNode}> = ({w = 330, children}) => (
  <div style={{width: w, height: w * 2.05, borderRadius: w * 0.14, background: '#0B0B0E', padding: w * 0.04, boxShadow: '0 40px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)'}}>
    <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.11, background: '#F4F5F8', overflow: 'hidden', fontFamily: FONT, color: SV.ink}}>{children}</div>
  </div>
);

/** Bong bóng chat hiện theo thời điểm. */
export const Bubble: React.FC<{at: number; me?: boolean; color?: string; children: React.ReactNode; size?: number}> = ({at, me, color, children, size = 24}) => {
  const t = useSec();
  const p = ramp(t, at, 0.35, expo);
  if (p <= 0) return null;
  return (
    <div
      style={{
        alignSelf: me ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        padding: '10px 16px',
        borderRadius: 18,
        background: color ?? (me ? SV.blue : '#fff'),
        color: me || color ? '#fff' : SV.ink,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px) scale(${0.9 + 0.1 * p})`,
        transformOrigin: me ? 'right bottom' : 'left bottom',
      }}
    >
      {children}
    </div>
  );
};

/** Dấu đóng chéo kiểu con dấu (chốt câu "vấn đề"). */
export const Stamp: React.FC<{at: number; text: string; color?: string}> = ({at, text, color = SV.red}) => {
  const t = useSec();
  const p = ramp(t, at, 0.28, Easing.out(Easing.back(2)));
  if (p <= 0) return null;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 64,
        color: '#fff',
        background: color,
        padding: '14px 34px',
        borderRadius: 14,
        transform: `rotate(-4deg) scale(${2.2 - 1.2 * p})`,
        opacity: Math.min(1, p * 2),
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        letterSpacing: -1,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

/** Số chạy (rolling digits) dạng Việt: dấu phẩy thập phân, dấu chấm hàng nghìn. */
export const Rolling: React.FC<{at: number; to: number; dur?: number; decimals?: number; prefix?: string; suffix?: string; style?: React.CSSProperties}> = ({
  at,
  to,
  dur = 1.1,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
}) => {
  const t = useSec();
  const p = ramp(t, at, dur, expo);
  const v = (to * p).toFixed(decimals).split('.');
  const txt = v[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (v[1] ? ',' + v[1] : '');
  return <span style={{fontVariantNumeric: 'tabular-nums', opacity: t < at ? 0 : 1, ...style}}>{prefix + txt + suffix}</span>;
};

/** Nhãn chương góc trên trái (đánh số), hiện 3,4 giây. */
export const ChapterTag: React.FC<{n: number; label: string; dark: boolean}> = ({n, label, dark}) => {
  const t = useSec();
  const p = ramp(t, 0.15, 0.6, expo);
  const o = 1 - ramp(t, 3.2, 0.5);
  const c = dark ? SV.ink : '#fff';
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        top: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        opacity: p * o,
        fontFamily: FONT,
        color: c,
        // trên footage trời/tường sáng chữ trắng bị chìm: lót kính tối
        ...(dark ? {} : {padding: '10px 24px', borderRadius: 999, background: 'rgba(14,14,18,0.5)', backdropFilter: 'blur(14px)'}),
      }}
    >
      <span style={{fontWeight: 800, fontSize: 26, letterSpacing: 2, color: dark ? SV.blue : '#fff', opacity: 0.95}}>{String(n).padStart(2, '0')}</span>
      <span style={{width: 70 * p, height: 2, background: c, opacity: 0.7}} />
      <span style={{fontWeight: 600, fontSize: 30, letterSpacing: 0.5, transform: `translateX(${(1 - p) * -20}px)`}}>{label}</span>
    </div>
  );
};

/** Thẻ tên kiểu Apple (góc dưới trái, trên phụ đề): vạch màu + tên + vai trò · lớp, trường. */
export const LowerThird: React.FC<{at: number; until: number; name: string; role: string; school: string}> = ({at, until, name, role, school}) => {
  const t = useSec();
  const p = ramp(t, at, 0.6, expo);
  const o = 1 - ramp(t, until, 0.4);
  if (p <= 0 || o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 72, bottom: 215, display: 'flex', gap: 18, opacity: o, fontFamily: FONT, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.55)'}}>
      <div style={{width: 5, borderRadius: 3, background: SV.blue, transform: `scaleY(${p})`, transformOrigin: 'top'}} />
      <div style={{clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}}>
        <div style={{fontSize: 44, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1}}>{name}</div>
        <div style={{fontSize: 26, fontWeight: 600, marginTop: 6, opacity: 0.92}}>
          <span style={{padding: '2px 10px', borderRadius: 6, background: SV.blue, marginRight: 10, letterSpacing: 1.5}}>{role}</span>
          {school}
        </div>
      </div>
    </div>
  );
};

/** Phụ đề cố định chân khung: chữ trắng trên dải tối mờ, chuyển câu bằng mờ nhanh. */
export const Subtitle: React.FC<{text: string; age: number; left: number}> = ({text, age, left}) => {
  const o = Math.min(1, age / 0.12, left / 0.12);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div
        style={{
          maxWidth: 1520,
          padding: '10px 26px 12px',
          borderRadius: 14,
          background: 'rgba(10,10,14,0.5)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.3,
          textAlign: 'center',
          letterSpacing: -0.2,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Sân khấu sáng kiểu Apple: nền xám trắng có quầng sáng giữa. */
export const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 42%, #FFFFFF 0%, #F1F1F4 55%, #DEDFE4 100%)'}}>{children}</AbsoluteFill>
);

export type Cam = {t: number; z: number; x: number; y: number};
/** Camera 2.5D trong màn hình: phóng vào điểm (x, y theo tỉ lệ khung) theo keyframe, ease-out-expo giữa các mốc. */
const camAt = (keys: Cam[], t: number) => {
  let k = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= a.t) break;
    const p = ramp(t, a.t, Math.max(0.01, b.t - a.t), expo);
    k = {t, z: a.z + (b.z - a.z) * p, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p};
  }
  return k;
};

/**
 * Clip lấy từ public/sv/ui/ (bản public/clips đã nội suy bỏ khung lặp lẻ của quay màn hình CDP).
 * Màn hình bảng (viền tối, bo góc, bóng tiếp xúc) chứa footage app thật, nghiêng nhẹ 3D,
 * camera trong màn hình đẩy vào điểm chạm. `cuts`: chuỗi [giây trong cảnh, clip, giây bắt đầu trong clip].
 */
export const Device: React.FC<{
  cuts: [number, string, number][];
  cam?: Cam[];
  w?: number;
  cx?: number;
  cy?: number;
  tilt?: number;
  enter?: number;
}> = ({cuts, cam = [{t: 0, z: 1, x: 0.5, y: 0.5}], w = 1300, cx = 960, cy = 520, tilt = 7, enter = 0}) => {
  const t = useSec();
  const h = (w * 9) / 16;
  const e = ramp(t, enter, 0.9, expo);
  const k = camAt(cam, t);
  const cur = [...cuts].reverse().find((c) => t >= c[0]) ?? cuts[0];
  const ry = tilt * (1 - e) + interpolate(t, [0, 12], [-1.5, 1.5]);
  return (
    <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, perspective: 2600}}>
      {/* bóng tiếp xúc trên "sàn" */}
      <div style={{position: 'absolute', left: '8%', right: '8%', bottom: -46, height: 60, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.28), rgba(0,0,0,0))', opacity: e}} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 26,
          padding: 14,
          background: 'linear-gradient(160deg, #2A2B30, #0B0B0E 40%, #1B1C20)',
          boxShadow: '0 50px 90px rgba(20,22,30,0.28), 0 10px 26px rgba(20,22,30,0.2), inset 0 1px 0 rgba(255,255,255,0.18)',
          transform: `translateY(${(1 - e) * 80}px) rotateX(${(1 - e) * 10}deg) rotateY(${ry}deg) scale(${0.94 + 0.06 * e})`,
          opacity: Math.min(1, e * 1.6),
        }}
      >
        <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 14, background: '#fff'}}>
          <div style={{position: 'absolute', inset: 0, transformOrigin: `${k.x * 100}% ${k.y * 100}%`, transform: `scale(${k.z})`}}>
            {cuts.map(([at, clip, from], i) =>
              cur !== cuts[i] ? null : (
                <Sequence key={i} from={Math.round(at * 30)} layout="none">
                  <OffthreadVideo
                    src={staticFile(`sv/ui/${clip}.mp4`)}
                    startFrom={Math.round(from * 30)}
                    muted
                    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
                  />
                </Sequence>
              ),
            )}
          </div>
          {/* phản chiếu kính */}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)', pointerEvents: 'none'}} />
        </div>
      </div>
    </div>
  );
};

/** Tiêu đề tính năng phía trên thiết bị: nhãn môn (màu nhấn) + một dòng lợi ích. */
export const FeatureTitle: React.FC<{label: string; title: string; at?: number; color?: string}> = ({label, title, at = 0.15, color = SV.blue}) => {
  const t = useSec();
  const p = ramp(t, at, 0.7, expo);
  const p2 = ramp(t, at + 0.12, 0.8, expo);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 26, textAlign: 'center', fontFamily: FONT}}>
      <div style={{fontSize: 26, fontWeight: 800, letterSpacing: 3, color, opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>{label.toUpperCase()}</div>
      <div
        style={{
          fontSize: 50,
          fontWeight: 800,
          letterSpacing: -1.4,
          color: SV.ink,
          marginTop: 2,
          opacity: p2,
          filter: `blur(${(1 - p2) * 10}px)`,
          transform: `translateY(${(1 - p2) * 20}px)`,
        }}
      >
        {title}
      </div>
    </div>
  );
};

/** Mã QR "hologram": lưới ô phát sáng xanh (trang trí, không quét được) nổi trên điện thoại, có tia chiếu. */
export const QrHolo: React.FC<{at: number; x: number; y: number; size?: number; from: [number, number]}> = ({at, x, y, size = 250, from}) => {
  const t = useSec();
  const p = ramp(t, at, 0.9, expo);
  if (p <= 0) return null;
  const n = 21;
  const cell = size / n;
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      const i = r - fr;
      const j = c - fc;
      if (i >= 0 && i < 7 && j >= 0 && j < 7) return i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4) ? 1 : 0;
    }
    return -1;
  };
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const f = finder(r, c);
      const on = f === -1 ? Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1 > 0.52 : f === 1;
      if (!on) continue;
      // ô hiện lần lượt theo đường chéo
      const d = ramp(t, at + 0.2 + ((r + c) / (2 * n)) * 0.6, 0.25);
      cells.push(<rect key={`${r}-${c}`} x={c * cell + 1} y={r * cell + 1} width={cell - 2} height={cell - 2} rx={1.5} fill="#7FE7FF" opacity={d} />);
    }
  const scan = ((t - at) * 0.7) % 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#7FE7FF" stopOpacity={0.45} />
            <stop offset="1" stopColor="#7FE7FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={`${from[0] - 18},${from[1]} ${from[0] + 18},${from[1]} ${x + size / 2},${y + size} ${x - size / 2},${y + size}`} fill="url(#beam)" opacity={p * 0.8} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x - size / 2 - 18,
          top: y - 18,
          width: size + 36,
          height: size + 36,
          borderRadius: 22,
          background: 'rgba(10,40,60,0.35)',
          border: '1.5px solid rgba(127,231,255,0.7)',
          boxShadow: '0 0 40px rgba(34,195,238,0.55), inset 0 0 30px rgba(34,195,238,0.25)',
          transform: `perspective(900px) rotateX(${(1 - p) * 40}deg) rotateY(-12deg) scale(${0.6 + 0.4 * p}) translateY(${Math.sin(t * 2.2) * 5}px)`,
          opacity: p,
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg width={size} height={size} style={{position: 'absolute', left: 18, top: 18, filter: 'drop-shadow(0 0 6px #22C3EE)'}}>
          {cells}
        </svg>
        <div style={{position: 'absolute', left: 10, right: 10, top: 18 + scan * size, height: 3, background: 'linear-gradient(90deg, transparent, #BFF6FF, transparent)', opacity: 0.9}} />
      </div>
    </AbsoluteFill>
  );
};
