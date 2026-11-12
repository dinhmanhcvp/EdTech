import React from 'react';
import {AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ramp, useSec} from '../ui';
import {FONT} from '../theme';
import {BlurText} from '../flow/BlurText';
import {DIM, Grain} from '../flow/fx';
import {LassoLockup, LassoMark, LOGO_CREAM, LOGO_RED} from './LassoLogo';
import {Friction, Intro} from './Intro';
import {SvMontage} from './Montage';
import {CardCloud, OPEN_DUR} from '../flow/CardCloud';
import mask1728 from '../../public/sv/mask1728.json';
import bedJson from '../../public/sv/flow_bed.json';
import {beatsIn, musicStart, type Bed} from '../flow/music';
import {Bubble, LowerThird, ChapterTag, Chip, Device, FeatureTitle, Float, Panel, Phone, QrHolo, Rolling, Stage, Stamp, SV, Subtitle, expo} from './parts';
import {FPS, SEGS, STARTS, TOTAL_SEC, absOf, startOf, type Seg} from './plan';

// Phim dự thi SV_STARTUP IX: người thật (THCS Hùng Vương) xen giao diện thật, nhịp A-roll → UI → A-roll,
// chữ nổi theo lời, phụ đề toàn phim, nhạc tự tổng hợp (tools/sv_music.py) hạ khi có lời.

/** Mức to riêng từng nguồn lời (đo bằng ebur128) để các giọng đều nhau trước khi chuẩn hóa cả phim. */
const GAIN: Record<string, number> = {};
const gainOf = (k: string) => GAIN[k] ?? 1;

const LIGHT = new Set(['ui-lasso', 'ui-phys', 'results', 'finance']);

// ---------------------------------------------------------------- A-roll
const Clip: React.FC<{seg: Seg; vol?: number}> = ({seg, vol = 1}) => {
  const t = useSec();
  const push = interpolate(t, [0, seg.dur], [1.0, 1.035]);
  return (
    <AbsoluteFill style={{transform: `scale(${push})`}}>
      <OffthreadVideo
        src={staticFile(`sv/${seg.src}.mp4`)}
        startFrom={Math.round((seg.in ?? 0) * FPS)}
        playbackRate={seg.rate ?? 1}
        volume={(f) => {
          const s = f / FPS;
          const src = (seg.in ?? 0) + s * (seg.rate ?? 1);
          if ((seg.muteBefore && src < seg.muteBefore) || (seg.muteAfter !== undefined && src > seg.muteAfter)) return 0;
          const edge = Math.min(1, s / 0.08, (seg.dur - s) / 0.08, seg.muteBefore ? (src - seg.muteBefore) / 0.08 : 1, seg.muteAfter !== undefined ? (seg.muteAfter - src) / 0.08 : 1);
          return Math.max(0, edge) * vol * gainOf(seg.src!);
        }}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </AbsoluteFill>
  );
};

// Đội dự án (người dùng cung cấp 04/11); vai theo phần mỗi bạn đảm nhận trong phim.
const TEAM = {
  son_cvp: {name: 'Hà Thái Sơn', role: 'CEO', school: 'Lớp 10A13 · THPT Chuyên Vĩnh Phúc'},
  son_hv: {name: 'Trần Bảo Sơn', role: 'COO', school: 'Lớp 8A5 · THCS Hùng Vương'},
  lam: {name: 'Nguyễn Tùng Lâm', role: 'CTO', school: 'Lớp 8A8 · THCS Hùng Vương'},
  nhat: {name: 'Nguyễn Huy Nhật', role: 'CMO', school: 'Lớp 9A2 · THCS Hùng Vương'},
  nam: {name: 'Nguyễn Vũ Nam', role: 'CFO', school: 'Lớp 8A3 · THCS Hùng Vương'},
};

/** Ba chấm "đang suy nghĩ" + đồng hồ chạy (công cụ AI chậm), đổi màu khi nói "quá chậm". */
const AiWait: React.FC<{from: number; until: number; slowAt: number}> = ({from, until, slowAt}) => {
  const t = useSec();
  if (t < from || t > until) return null;
  const s = Math.floor((t - from) * 9 + 3);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, fontWeight: 600, color: t > slowAt ? '#C2410C' : SV.sub}}>
      <div style={{display: 'flex', gap: 6, padding: '12px 16px', background: '#fff', borderRadius: 16}}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{width: 10, height: 10, borderRadius: 9, background: '#8E8E93', opacity: 0.35 + 0.65 * Math.abs(Math.sin(t * 5 - i * 0.7))}} />
        ))}
      </div>
      Đang suy nghĩ… {`0:${String(s % 60).padStart(2, '0')}`}
    </div>
  );
};

/** Một bước giải trên thẻ chấm: dấu ✓ xanh hoặc ✗ đỏ. */
const StepLine: React.FC<{at: number; ok?: boolean; children: React.ReactNode}> = ({at, ok, children}) => {
  const t = useSec();
  const p = ramp(t, at, 0.4, expo);
  if (p <= 0) return null;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 40, fontWeight: 600, opacity: p, transform: `translateX(${(1 - p) * 20}px)`}}>
      <span style={{width: 40, height: 40, borderRadius: 20, background: ok ? SV.green : SV.red, color: '#fff', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{ok ? '✓' : '✗'}</span>
      <span style={{textDecoration: ok ? 'none' : `underline wavy ${SV.red}`}}>{children}</span>
    </div>
  );
};

/** Dòng nhận xét/gợi ý dưới bước giải. */
const Note: React.FC<{at: number; color: string; children: React.ReactNode}> = ({at, color, children}) => {
  const t = useSec();
  const p = ramp(t, at, 0.4, expo);
  if (p <= 0) return null;
  return <div style={{fontSize: 26, fontWeight: 600, color, padding: '8px 14px', borderRadius: 12, background: `${color}14`, opacity: p}}>{children}</div>;
};

/** Thanh "kiến thức tự tích lũy" tụt về 0 khi nói "chẳng còn gì để tích lũy". */
const KnowledgeBar: React.FC<{from: number; to: number}> = ({from, to}) => {
  const t = useSec();
  const v = 72 * (1 - ramp(t, from, to - from, Easing.inOut(Easing.cubic)));
  const c = v < 20 ? SV.red : v < 45 ? '#FF9F0A' : SV.green;
  return (
    <Panel w={470} style={{padding: '22px 26px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 800}}>
        <span>Kiến thức tự tích lũy</span>
        <span style={{color: c, fontVariantNumeric: 'tabular-nums'}}>{Math.round(v)}%</span>
      </div>
      <div style={{height: 16, borderRadius: 9, background: '#E7E8EC', marginTop: 16, overflow: 'hidden'}}>
        <div style={{width: `${v}%`, height: '100%', borderRadius: 9, background: c}} />
      </div>
    </Panel>
  );
};

/** Thẻ "gần 3.000 trường": số chạy + lưới chấm sáng dần. */
const SchoolsCard: React.FC<{at: number}> = ({at}) => {
  const t = useSec();
  return (
    <Panel w={460}>
      <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 2, color: SV.green}}>KHÁT VỌNG</div>
      <div style={{fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05}}>
        ~<Rolling at={at} to={3000} dur={1.4} />
      </div>
      <div style={{fontSize: 26, fontWeight: 600, color: SV.sub}}>trường phổ thông</div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 6, marginTop: 16}}>
        {Array.from({length: 60}, (_, i) => (
          <span key={i} style={{width: 12, height: 12, borderRadius: 6, background: SV.green, opacity: 0.15 + 0.85 * ramp(t, at + (i / 60) * 1.4, 0.2)}} />
        ))}
      </div>
    </Panel>
  );
};

/** Lớp chữ của từng cảnh A-roll; `l(src)` đổi giây nguồn sang giây trong cảnh. */
const ARollOverlay: React.FC<{seg: Seg}> = ({seg}) => {
  const l = (s: number) => (s - (seg.in ?? 0)) / (seg.rate ?? 1);
  const col = (top: number, children: React.ReactNode, side: 'left' | 'right' = 'right') => (
    <div style={{position: 'absolute', top, [side]: 96, display: 'flex', flexDirection: 'column', gap: 18, alignItems: side === 'right' ? 'flex-end' : 'flex-start'}}>{children}</div>
  );
  switch (seg.id) {
    case 'A1-phan':
      return (
        <>
          {col(130, <Chip at={l(11.62)} color="#9CA3AF">Hình vẽ tĩnh · không chuyển động</Chip>, 'left')}
          <LowerThird at={l(5.9)} until={l(11.6)} {...TEAM.son_cvp} />
        </>
      );
    case 'A2-ai':
      return (
        <>
          <Float at={0.3} x={110} y={170} tilt={14}>
            <Panel w={540} style={{display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(244,245,248,0.95)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 800}}>
                <span style={{width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#8E8E93,#3A3A3C)'}} />
                Trợ lý AI
                <span style={{marginLeft: 'auto', fontSize: 20, fontWeight: 600, color: SV.sub}}>chat</span>
              </div>
              <Bubble at={0.6} me>Giải giúp em bài này</Bubble>
              <AiWait from={1.0} until={l(10.8)} slowAt={l(8.39)} />
              <Bubble at={l(9.55)} color="#FF9F0A" size={22}>Hết lượt miễn phí · nâng cấp gói trả phí</Bubble>
              <Bubble at={l(10.81)} color={SV.red}>Đáp án: x = 5 (sai bản chất)</Bubble>
            </Panel>
          </Float>
          {col(250, <>
            <Chip at={l(8.39)} color={SV.red}>Quá chậm</Chip>
            <Chip at={l(9.55)} color={SV.red}>Đắt đỏ</Chip>
            <Chip at={l(10.81)} color={SV.red}>Sai lệch bản chất</Chip>
          </>)}
        </>
      );
    case 'A3-chep':
      return (
        <>
          <div style={{position: 'absolute', left: 330, top: 230, display: 'flex', flexDirection: 'column', gap: 18}}>
            <Chip at={0.3} color="#FF9F0A">1 · Chụp đề</Chip>
            <Chip at={1.2} color="#FF9F0A">2 · AI giải hộ</Chip>
            <Chip at={2.1} color="#FF9F0A">3 · Chép đáp án</Chip>
          </div>
          <Float at={2.9} x={1330} y={110} tilt={-10}>
            <Panel w={470} style={{borderLeft: `8px solid ${SV.red}`, padding: '22px 28px'}}>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 3, color: SV.red}}>KẾT QUẢ</div>
              <div style={{fontSize: 46, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginTop: 6}}>Chép xong.</div>
              <div style={{fontSize: 46, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, color: SV.red}}>Vẫn chưa hiểu.</div>
            </Panel>
          </Float>
        </>
      );
    case 'A4-x':
      return (
        <>
          <Float at={0.15} x={150} y={120} tilt={16}>
            <div style={{position: 'relative'}}>
              <Phone w={300}>
                <div style={{padding: '26px 18px', display: 'flex', flexDirection: 'column', gap: 12}}>
                  <div style={{fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6}}>Giải bài bằng ảnh</div>
                  <div style={{height: 150, borderRadius: 14, background: 'repeating-linear-gradient(180deg,#E3E5EA 0 6px,#F4F5F8 6px 22px)'}} />
                  <Bubble at={0.5} size={22}>Đáp án: C. x = 4</Bubble>
                  <Bubble at={0.8} size={20}>Lời giải đầy đủ ↓</Bubble>
                  <Bubble at={1.1} me size={22}>Sao chép</Bubble>
                </div>
              </Phone>
              <div style={{position: 'absolute', left: -20, top: 250}}>
                <Stamp at={1.4} text="✕ Không hiểu" />
              </div>
            </div>
          </Float>
          {col(220, <Chip at={l(16.4)} color={SV.red} size={40}>Lời giải sẵn ≠ hiểu bài</Chip>)}
          <LowerThird at={l(12.3)} until={l(17.4)} {...TEAM.nam} />
        </>
      );
    case 'A5-nhat':
      return (
        <>
          <Float at={l(21.4)} until={l(26.6)} x={1360} y={60} tilt={-10}>
            <KnowledgeBar from={l(22.3)} to={l(24.0)} />
          </Float>
          <LowerThird at={l(21.6)} until={l(26.6)} {...TEAM.nhat} />
        </>
      );
    case 'A7-hesinhthai':
      return (
        <>
          {/* mỗi mốc bật lên đúng lúc nói rồi tắt, đứng một mình trên đầu khung */}
          {([[7.37, 7.75, 'Trước giờ học'], [7.75, 8.27, 'Trong giờ học'], [8.27, 9.3, 'Sau giờ học']] as const).map(([a, b, txt]) => (
            <div key={txt} style={{position: 'absolute', top: 80, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
              <Chip at={l(a)} until={l(b) + 0.15} size={40}>{txt}</Chip>
            </div>
          ))}
          <Device cuts={[[0, 'P', 20]]} w={460} cx={300} cy={500} tilt={16} enter={l(6.11)} cam={[{t: 0, z: 1.3, x: 0.62, y: 0.5}]} />
          <Device cuts={[[0, 'C', 8]]} w={460} cx={1620} cy={500} tilt={-16} enter={l(6.81)} cam={[{t: 0, z: 1.2, x: 0.4, y: 0.5}]} />
          <div style={{position: 'absolute', left: 300 - 230, width: 460, top: 650, display: 'flex', justifyContent: 'center'}}><Chip at={l(6.3)} size={28}>Giáo viên · bảng lớp</Chip></div>
          <div style={{position: 'absolute', left: 1620 - 230, width: 460, top: 650, display: 'flex', justifyContent: 'center'}}><Chip at={l(7.0)} size={28} color={SV.cyan}>Học sinh · gia sư</Chip></div>
          <LowerThird at={l(2.75)} until={l(6.0)} {...TEAM.son_hv} />
        </>
      );
    case 'U2-toan':
      // 1794: khoanh lúc 12 s, cầu 3D hiện trên bảng lúc 13 s → màn hình app bay ra phóng to quả cầu
      return (
        <>
          {col(130, <Chip at={l(12.0)} size={32}>Khoanh vùng → AI dựng mô hình 3D</Chip>, 'left')}
          <Device cuts={[[0, 'Noxyz', 10.0]]} w={640} cx={1470} cy={400} tilt={-14} enter={l(13.0)} cam={[{t: 0, z: 1.6, x: 0.6, y: 0.52}]} />
          <div style={{position: 'absolute', left: 1470 - 160, top: 600}}><Chip at={l(13.3)} size={28}>Toán · không gian 3D</Chip></div>
        </>
      );
    case 'U4-cham':
      // 1805: trên bảng "2x − 4 = 6 → 2x = 6 − 4 → x = 1", AI tô đỏ bước chuyển vế lúc 4,5 s
      return (
        <Float at={l(3.0)} x={1330} y={120} tilt={-12}>
          <Panel w={500} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 2, color: SV.blue}}>AI CHẤM TỪNG BƯỚC</div>
            <StepLine at={l(3.3)} ok>2x − 4 = 6</StepLine>
            <StepLine at={l(4.5)}>2x = 6 − 4</StepLine>
            <Note at={l(5.3)} color={SV.red}>Chuyển vế phải đổi dấu: −4 → +4</Note>
            <Note at={l(6.4)} color={SV.green}>Gợi ý: 2x = 6 + 4 → x = ?</Note>
          </Panel>
        </Float>
      );
    case 'U5-giongnoi':
      // 1813: Lâm hỏi bằng giọng thật 16,4–20,5 s; câu trả lời hiện trên bảng lúc 21 s
      return (
        <>
          <MicBadge at={l(16.4)} until={l(20.6)} x={180} y={690} />
          {col(130, <Chip at={l(21.0)} size={32} color={SV.cyan}>AI trả lời ngay trên bảng</Chip>, 'left')}
        </>
      );
    case 'A11-thunghiem':
      return <>{col(230, <>
        {([[3.77, '8', 'tuần'], [4.89, '412', 'học sinh'], [6.05, '18', 'giáo viên']] as const).map(([at, n, u]) => (
          <Chip key={u} at={l(at)} size={34} color={SV.green}>
            <span style={{fontSize: 56, fontWeight: 800, letterSpacing: -1.5}}>{n}</span> {u}
          </Chip>
        ))}
      </>)}
        <LowerThird at={l(1.33)} until={l(6.4)} {...TEAM.lam} />
      </>;
    case 'A12-taichinh':
      return col(220, <>
        <Chip at={l(5.94)} color={SV.cyan}>Xử lý trên thiết bị</Chip>
        <Chip at={l(6.2)} color={SV.blue}>Máy chủ của trường</Chip>
        <Chip at={l(6.44)} color="#BF5AF2">Đám mây · chỉ khi cần</Chip>
      </>, 'left');
    case 'A13-tamnhin':
      // 1751: "đến gần 3.000 trường" lúc 4,0 s
      return (
        <Float at={l(3.8)} until={l(7.7)} x={80} y={150} tilt={12}>
          <SchoolsCard at={l(3.9)} />
        </Float>
      );
    default:
      return null;
  }
};

/** Cảnh quét QR: hologram nổi trên điện thoại khi nói "quét mã". */
const QrOverlay: React.FC<{seg: Seg}> = ({seg}) => {
  const vo = (s: number) => (s - seg.vo!.from) / (seg.rate ?? 1) + seg.vo!.at;
  return (
    <>
      <QrHolo at={vo(3.28)} x={1250} y={150} size={230} from={[905, 330]} />
      <div style={{position: 'absolute', left: 1250 - 210, top: 450, width: 420, display: 'flex', justifyContent: 'center'}}>
        <Chip at={vo(4.56)} color={SV.cyan}>Kết nối bài giảng tại nhà</Chip>
      </div>
    </>
  );
};

/** Mặt nạ theo mép lưng người đeo cặp đi ngang (1728): bên trái mép lộ cảnh học ở nhà (1709). */
// [giây clip 1728, mép lưng (0–1 bề ngang)] đo từng khung bằng |khung − trung vị cả clip| (xem HANDOFF B8)
const EDGE = (mask1728 as [number, number][]).concat([[6.15, 1.02]]);
const MaskWipe: React.FC<{seg: Seg}> = ({seg}) => {
  const t = useSec() + (seg.in ?? 0);
  const next = SEGS.find((s) => s.id === 'A10-nha')!;
  const e = interpolate(t, EDGE.map((x) => x[0]), EDGE.map((x) => x[1] * 100), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Clip seg={seg} vol={0.6} />
      <AbsoluteFill style={{WebkitMaskImage: `linear-gradient(90deg, #000 ${e - 1.5}%, transparent ${e}%)`, maskImage: `linear-gradient(90deg, #000 ${e - 1.5}%, transparent ${e}%)`}}>
        <OffthreadVideo src={staticFile(`sv/${next.src}.mp4`)} startFrom={Math.round((next.in! - seg.dur) * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Cảnh học ở nhà: màn hình gia sư Socratic nổi bên trái (phía rèm tối), ba chữ nổi theo lời. */
const HomeOverlay: React.FC<{seg: Seg}> = ({seg}) => {
  const vo = (s: number) => (s - seg.vo!.from) / (seg.rate ?? 1) + seg.vo!.at;
  return (
    <>
      <Device cuts={[[0, 'C', 0.6], [4.4, 'C', 2.6]]} w={620} cx={420} cy={350} tilt={-10} enter={0.5} cam={[{t: 0, z: 1, x: 0.5, y: 0.5}, {t: 4.4, z: 1, x: 0.5, y: 0.5}, {t: 6.2, z: 1.3, x: 0.35, y: 0.45}]} />
      <div style={{position: 'absolute', left: 120, top: 600, display: 'flex', flexDirection: 'column', gap: 14}}>
        <Chip at={vo(7.42)} color={SV.red}>Khóa lối tắt — không giải hộ</Chip>
        <Chip at={vo(9.34)} color={SV.cyan}>Mở công cụ trực quan</Chip>
        <Chip at={vo(10.62)} color={SV.green}>Đặt câu hỏi gợi mở</Chip>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- cảnh đồ họa / giao diện
const SlideMock: React.FC<{n: number}> = ({n}) => (
  <div style={{position: 'absolute', inset: 0, background: '#FDFDFD', padding: '54px 70px', fontFamily: FONT, color: '#1F2A44'}}>
    <div style={{fontSize: 46, fontWeight: 800, color: '#1E3A8A'}}>Bài 5. Dao động điều hòa{n > 12 ? ' (tiếp)' : ''}</div>
    <div style={{height: 4, width: 220, background: '#1E3A8A', margin: '18px 0 34px'}} />
    {['Định nghĩa dao động điều hòa', 'Phương trình: x = A·cos(ωt + φ)', 'Chu kì: T = 2π / ω', 'Ghi nhớ công thức để làm bài tập'].map((s, i) => (
      <div key={i} style={{fontSize: 34, margin: '14px 0', opacity: 0.85}}>• {s}</div>
    ))}
    <div style={{position: 'absolute', right: 40, bottom: 26, fontSize: 24, color: '#94A3B8'}}>{n} / 48</div>
  </div>
);

const ProblemView: React.FC = () => {
  const t = useSec();
  const n = t < 1.7 ? 12 : t < 2.9 ? 13 : 14;
  const flip = Math.max(ramp(t, 1.7, 0.12), 0) * (1 - ramp(t, 1.82, 0.12)) + ramp(t, 2.9, 0.12) * (1 - ramp(t, 3.02, 0.12));
  const z = interpolate(t, [0, 5.6], [1.0, 1.08]);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(90% 80% at 50% 45%, #2B2E35 0%, #15161A 70%, #0C0C0E 100%)'}}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <div style={{position: 'absolute', left: 410, top: 250, width: 1100, height: 619, borderRadius: 18, padding: 16, background: '#0A0A0C', boxShadow: '0 40px 120px rgba(0,0,0,0.7)'}}>
          <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 6, filter: `saturate(0.55) brightness(${1 - flip * 0.35})`}}>
            <SlideMock n={n} />
          </div>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <BlurText text="Bảng tương tác thông minh…" at={0.25} size={58} weight={600} color={DIM} stagger={0.06} />
        <BlurText text="…chỉ để chiếu slide." at={1.25} size={78} weight={800} color="#fff" stagger={0.08} />
      </div>
      <div style={{position: 'absolute', bottom: 64, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Chip at={3.4} color={SV.red} size={38}>Học sinh thấy công thức — không thấy bản chất</Chip>
      </div>
    </AbsoluteFill>
  );
};

/** Ô "đang nghe" có sóng âm, nổi trên màn hình cảnh hỏi đáp bằng giọng nói. */
const MicBadge: React.FC<{at: number; until: number; x: number; y: number}> = ({at, until, x, y}) => {
  const t = useSec();
  const p = ramp(t, at, 0.6, expo) * (1 - ramp(t, until, 0.4));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: 540, height: 96, borderRadius: 999, whiteSpace: 'nowrap',
        background: 'rgba(17,18,22,0.86)', backdropFilter: 'blur(16px)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 22, padding: '0 30px', fontFamily: FONT, color: '#fff',
        opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`,
      }}
    >
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
        <rect x={9} y={3} width={6} height={11} rx={3} fill={SV.red} stroke="none" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
      <div style={{display: 'flex', alignItems: 'center', gap: 5, height: 50}}>
        {Array.from({length: 18}, (_, i) => (
          <div key={i} style={{width: 6, borderRadius: 3, background: SV.cyan, height: 8 + 36 * Math.abs(Math.sin(t * 7 + i * 0.9) * Math.sin(t * 3.1 + i * 0.4))}} />
        ))}
      </div>
      <div style={{fontSize: 30, fontWeight: 600}}>Đang nghe…</div>
    </div>
  );
};

const UiView: React.FC<{seg: Seg}> = ({seg}) => {
  const t = useSec();
  switch (seg.view) {
    case 'ui-lasso': {
      const vo = (s: number) => (s - seg.vo!.from) / (seg.rate ?? 1) + seg.vo!.at;
      const g = vo(6.3);
      const gp = ramp(t, g, 0.7, expo);
      const grid: [string, string, number, number, number][] = [
        ['Toán', 'Noxyz', 18, vo(7.38), 0],
        ['Lý', 'Npendulum', 16, vo(8.08), 1],
        ['Hóa', 'H', 20.5, vo(8.6), 2],
        ['Sinh', 'B', 18.5, vo(9.24), 3],
      ];
      return (
        <Stage>
          <div style={{opacity: 1 - gp}}>
            <FeatureTitle label="Khoanh vùng" title="Nét phấn tĩnh thành mô phỏng sống" />
            {t < g + 0.7 && (
              <Device
                cuts={[[0, 'P', 10.0], [3.1, 'P', 18.4]]}
                cam={[{t: 0, z: 1.12, x: 0.2, y: 0.42}, {t: 1.2, z: 1.45, x: 0.18, y: 0.42}, {t: 3.1, z: 1, x: 0.5, y: 0.5}, {t: 3.6, z: 1.25, x: 0.62, y: 0.5}]}
              />
            )}
          </div>
          {t >= g &&
            grid.map(([lab, clip, from, at, i]) => {
              const cx = i % 2 ? 1400 : 520;
              const cy = i < 2 ? 285 : 700;
              return (
                <React.Fragment key={lab}>
                  <Sequence from={Math.round(g * FPS)} layout="none">
                    <Device cuts={[[0, clip, from]]} w={700} cx={cx} cy={cy} tilt={i % 2 ? -8 : 8} enter={i * 0.1} cam={[{t: 0, z: 1.35, x: 0.62, y: 0.5}]} />
                  </Sequence>
                  <div style={{position: 'absolute', left: cx - 350 + 24, top: cy - 197 + 22}}>
                    <Chip at={at} dark={false} size={32}>{lab}</Chip>
                  </div>
                </React.Fragment>
              );
            })}
        </Stage>
      );
    }
    case 'ui-phys':
      return (
        <Stage>
          <FeatureTitle label="Vật lý" title="Con lắc chạy theo thông số thời gian thực" />
          <Device cuts={[[0, 'Npendulum', 12.0]]} cam={[{t: 0, z: 1.15, x: 0.6, y: 0.5}, {t: 0.9, z: 1.5, x: 0.6, y: 0.55}]} />
        </Stage>
      );
    default:
      return null;
  }
};

const Results: React.FC<{seg: Seg}> = ({seg}) => {
  const t = useSec();
  const vo = (s: number) => (s - seg.vo!.from) / (seg.rate ?? 1) + seg.vo!.at;
  const p = ramp(t, 0.1, 0.8, expo);
  return (
    <Stage>
      <div style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontFamily: FONT}}>
        <div style={{fontSize: 28, fontWeight: 800, letterSpacing: 4, color: SV.blue, opacity: p}}>KẾT QUẢ THỰC NGHIỆM</div>
        <div
          style={{
            fontSize: 300,
            fontWeight: 800,
            letterSpacing: -12,
            lineHeight: 1.05,
            marginTop: 10,
            background: 'linear-gradient(100deg, #2F6BFF 10%, #22C3EE 60%, #30D158 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <Rolling at={0.2} to={0.85} dur={vo(5.1) - 0.2} decimals={2} prefix="+" />
        </div>
        <div style={{fontSize: 46, fontWeight: 600, color: SV.ink, opacity: ramp(t, vo(4.4), 0.6), letterSpacing: -0.8}}>điểm — nhóm thực nghiệm so với lớp đối chứng</div>
      </div>
      <div style={{position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22}}>
        {[0, 1, 2].map((i) => (
          <Chip key={i} at={vo(6.97) + i * 0.18} dark={false} color={SV.green} size={34}>
            Mô hình trường {i + 1} · tiến bộ
          </Chip>
        ))}
      </div>
    </Stage>
  );
};

const Card: React.FC<{at: number; x: number; children: React.ReactNode}> = ({at, x, children}) => {
  const t = useSec();
  const p = ramp(t, at, 0.8, expo);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 290,
        width: 400,
        height: 470,
        borderRadius: 32,
        background: '#fff',
        boxShadow: '0 30px 70px rgba(20,22,30,0.12), 0 4px 14px rgba(20,22,30,0.06)',
        padding: 36,
        fontFamily: FONT,
        color: SV.ink,
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
};

const Finance: React.FC<{seg: Seg}> = ({seg}) => {
  const t = useSec();
  const vo = (s: number) => (s - seg.vo!.from) / (seg.rate ?? 1) + seg.vo!.at;
  const big: React.CSSProperties = {fontSize: 92, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1};
  const small: React.CSSProperties = {fontSize: 30, fontWeight: 600, color: SV.sub, marginTop: 14, lineHeight: 1.3};
  const ring = ramp(t, vo(3.67), 1.3, expo) * 0.814;
  const be = ramp(t, vo(15.71), 1.1, expo);
  return (
    <Stage>
      <FeatureTitle label="Mô hình tài chính" title="Xử lý phân tầng — chi phí tối thiểu" />
      <Card at={vo(3.0)} x={95}>
        <svg width={170} height={170} viewBox="0 0 100 100" style={{marginBottom: 26}}>
          <circle cx={50} cy={50} r={42} fill="none" stroke="#E7E8EC" strokeWidth={10} />
          <circle cx={50} cy={50} r={42} fill="none" stroke={SV.blue} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${ring * 263.9} 263.9`} transform="rotate(-90 50 50)" />
        </svg>
        <div style={big}><Rolling at={vo(3.67)} to={81.4} decimals={1} dur={1.3} suffix="%" /></div>
        <div style={small}>lượt tự học xử lý cục bộ — không cần gọi đám mây</div>
      </Card>
      <Card at={vo(8.29)} x={535}>
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 2, color: SV.cyan, marginBottom: 'auto'}}>CHI PHÍ AI</div>
        <div style={big}><span style={{fontSize: 52}}>≤ </span><Rolling at={vo(10.4)} to={350} dur={1.0} /><span style={{fontSize: 52}}> đ</span></div>
        <div style={small}>tối đa cho mỗi tiết học</div>
      </Card>
      <Card at={vo(12.4)} x={975}>
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 2, color: SV.green, marginBottom: 'auto'}}>BIÊN LỢI NHUẬN GỘP</div>
        <div style={big}><Rolling at={vo(13.7)} to={89.5} decimals={1} dur={1.2} suffix="%" /></div>
        <div style={small}>trên mỗi lượt sử dụng</div>
      </Card>
      <Card at={vo(15.3)} x={1415}>
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 2, color: '#BF5AF2', marginBottom: 'auto'}}>HÒA VỐN</div>
        <svg width={330} height={110} viewBox="0 0 330 110">
          <line x1={10} y1={70} x2={320} y2={70} stroke="#E7E8EC" strokeWidth={6} strokeLinecap="round" />
          <line x1={10} y1={70} x2={10 + (6 / 11) * 310 * be} y2={70} stroke="#BF5AF2" strokeWidth={6} strokeLinecap="round" />
          {Array.from({length: 12}, (_, i) => (
            <circle key={i} cx={10 + (i / 11) * 310} cy={70} r={i === 6 ? 11 : 5} fill={i <= 6 * be ? '#BF5AF2' : '#D4D5DB'} />
          ))}
          <text x={10 + (6 / 11) * 310} y={36} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={SV.ink} opacity={be}>T7</text>
        </svg>
        <div style={{...big, fontSize: 56, letterSpacing: -2}}>Tháng thứ 7</div>
      </Card>
    </Stage>
  );
};

/** Tên sản phẩm hiện trên nền trời trắng lúc máy tilt (cuối A6 → đầu A7), chữ mực tối. */
const SkyTitle: React.FC = () => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, paddingBottom: 160}}>
    <LassoMark at={0} size={150} halo="#F2F3F3" />
    <BlurText text="Socratic Vision Board" at={0} out={1.85} size={118} weight={800} color={SV.ink} stagger={0.1} style={{textShadow: 'none'}} />
  </AbsoluteFill>
);

/**
 * Kết: logo lasso cube (bản trên nền tối) vẽ ra ngay trên nền đen, trùng phần outro của nhạc,
 * rồi dòng khẩu hiệu (bỏ chữ khổng lồ "Làm chủ tương lai." vì đứng một mình — người dùng 05/11).
 */
const Outro: React.FC<{dur: number}> = ({dur}) => {
  const t = useSec();
  const fade = 1 - ramp(t, dur - 0.7, 0.7, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{background: '#000', opacity: fade}}>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 60}}>
        <Sequence from={Math.round(0.3 * FPS)} layout="none">
          <LassoLockup at={0} scale={0.95} onDark />
        </Sequence>
        <BlurText text="Tự học bản chất. Làm chủ tương lai." at={2.8} size={46} stagger={0.06} weight={600} color="#FF8A80" style={{textShadow: 'none'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lắp cảnh
/**
 * Mask cut búng tay A5 → A6: 1690 chạy tiếp bên dưới (từ 27,3 s), cảnh hô bung ra thành vòng tròn
 * từ đúng bàn tay búng (≈ 790,460 trên khung 1690) trong 0,4 s, mép vòng có viền sáng.
 */
const SNAP_XY = [800, 470];
const SnapCut: React.FC<{children: React.ReactNode}> = ({children}) => {
  const t = useSec();
  const p = ramp(t, 0.03, 0.42, Easing.in(Easing.cubic));
  if (p >= 1) return <>{children}</>;
  const r = 2300 * p;
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('sv/1690.mp4')} startFrom={Math.round(27.3 * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{clipPath: `circle(${r}px at ${SNAP_XY[0]}px ${SNAP_XY[1]}px)`}}>{children}</AbsoluteFill>
      <div style={{position: 'absolute', left: SNAP_XY[0] - r, top: SNAP_XY[1] - r, width: 2 * r, height: 2 * r, borderRadius: '50%', boxShadow: `0 0 0 ${6 * (1 - p) + 2}px rgba(255,255,255,${0.9 * (1 - p)}), 0 0 60px rgba(255,255,255,${0.6 * (1 - p)})`}} />
    </AbsoluteFill>
  );
};

const SegView: React.FC<{seg: Seg; n: number}> = ({seg, n}) => {
  let body: React.ReactNode;
  if (seg.id === 'A9-mask') body = <MaskWipe seg={seg} />;
  else if (seg.src) {
    const ambient = seg.id === 'A10-nha' || seg.id === 'A8-qr' ? 0.35 : seg.id === 'A3-chep' ? 0.6 : 1;
    body = (
      <>
        <Clip seg={seg} vol={ambient} />
        {/* dải tối mờ chân khung để phụ đề nổi trên footage sáng */}
        <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 22%)'}} />
        {seg.id === 'A8-qr' && <QrOverlay seg={seg} />}
        {seg.id === 'A10-nha' && <HomeOverlay seg={seg} />}
        <ARollOverlay seg={seg} />
      </>
    );
  } else if (seg.view === 'problem') body = <ProblemView />;
  else if (seg.view === 'results') body = <Results seg={seg} />;
  else if (seg.view === 'finance') body = <Finance seg={seg} />;
  else if (seg.view === 'outro') body = <Outro dur={seg.dur} />;
  else if (seg.view === 'intro') body = <Intro cuts={INTRO_CUTS} logoAt={INTRO_LOGO} />;
  else if (seg.view === 'flow-open') body = <CardCloud />;
  else if (seg.view === 'montage') body = <SvMontage cuts={MONTAGE_CUTS} />;
  else if (seg.view === 'friction') body = <Friction />;
  else body = <UiView seg={seg} />;
  if (seg.id === 'A6-ho') body = <SnapCut>{body}</SnapCut>;
  return (
    <AbsoluteFill>
      {body}
      {seg.chapter && <ChapterTag n={n} label={seg.chapter} dark={LIGHT.has(seg.view ?? '')} />}
    </AbsoluteFill>
  );
};

/** Phụ đề toàn phim theo giờ tuyệt đối. */
const SUBS = SEGS.flatMap((s) => (s.subs ?? []).map(([a, b, text]) => ({a: absOf(s.id, a), b: Math.min(absOf(s.id, b), startOf(s.id) + s.dur), text, weak: text.startsWith('“')})));
const Subtitles: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cur = SUBS.find((s) => t >= s.a && t < s.b);
  return cur ? <Subtitle key={cur.text} text={cur.text} age={t - cur.a} left={cur.b - t} /> : null;
};

// ---------------------------------------------------------------- âm thanh
const VOICES = SEGS.filter((s) => s.vo).map((s) => ({s, from: Math.round((startOf(s.id) + s.vo!.at) * FPS)}));
const Voices: React.FC = () => (
  <>
    {VOICES.map(({s, from}) => (
      <Sequence key={s.id} from={from} durationInFrames={Math.round(((s.vo!.to - s.vo!.from) / (s.rate ?? 1)) * FPS)}>
        <Audio
          src={staticFile(`sv/vo_${s.vo!.file}.wav`)}
          startFrom={Math.round(s.vo!.from * FPS)}
          playbackRate={s.rate ?? 1}
          volume={(f) => Math.min(1, f / 3, ((s.vo!.to - s.vo!.from) / (s.rate ?? 1)) * FPS - f > 4 ? 1 : 0.4) * gainOf(s.vo!.file)}
        />
      </Sequence>
    ))}
  </>
);

const SNAP = startOf('A6-ho');
const OPEN_VO = 1.2;
// giọng AI ở outro: dùng lại public/sv/ai_slogan.mp3 (Daniel, "Socratic Vision Board! Tự học bản chất. Làm chủ tương lai!", 5 s;
// tên 0–1,6 s, khẩu hiệu 2,3–5 s) — tên trùng lúc wordmark hiện, khẩu hiệu trùng dòng chữ đỏ, hết trước khi hình tắt
const OUTRO_VO = 0.6;
// nhạc nền như bản FlowCut (tools/flow_music.py trên nhạc trailer Flow): outro bài trùng điểm kết phim
const BED = bedJson as Bed;
const MUSIC_OFF = Math.round(musicStart(TOTAL_SEC, BED) * FPS);
// montage nằm sau đám thẻ CardCloud: 8 shot mỗi shot một phách, logo đúng vạch ô nhịp kế tiếp (giây trong cảnh I1)
const I1 = startOf('I1-intro');
const INTRO_BEATS = beatsIn(TOTAL_SEC, I1 - 0.05, I1 + 7, 'beats', BED).map((b) => b - I1);
const INTRO_CUTS = [0, ...INTRO_BEATS.slice(1, 8)];
const INTRO_LOGO = beatsIn(TOTAL_SEC, I1 + INTRO_CUTS[7] + 0.3, I1 + 8, 'bars', BED)[0] - I1;
const OUTRO = startOf('O1-outro');
// montage cuối: 10 shot mỗi shot nửa phách (lưới phách flow_bed), mốc cuối mở tường thẻ
const M1 = startOf('M1-montage');
const MONTAGE_CUTS = (() => {
  const b = beatsIn(TOTAL_SEC, M1 - 0.05, M1 + 6, 'beats', BED).map((x) => x - M1);
  const half = b.flatMap((x, i) => (i + 1 < b.length ? [x, (x + b[i + 1]) / 2] : [x]));
  return [0, ...half.filter((x) => x > 0.15).slice(0, 10)];
})();
const musicVol = (f: number) => {
  const t = f / FPS;
  const base = t < startOf('A1-phan') ? 1 : t < OUTRO ? 0.55 : 1;
  // hạ nhạc khi có lời (vào/ra 0,25 s)
  let k = 1;
  for (const s of SUBS) {
    const d = Math.max(s.a - 0.25 - t, t - s.b - 0.25);
    // nhạc Flow dày: hạ còn ~15% dưới lời, câu hỏi thu xa của Lâm (U5) còn 6%
    const floor = s.weak ? 0.06 : 0.15;
    if (d < 0.25) k = Math.min(k, floor + (1 - floor) * Math.max(0, d / 0.25));
  }
  if (t > OPEN_VO - 0.2 && t < OPEN_VO + 3.1) k = Math.min(k, 0.45);
  if (t > OUTRO + OUTRO_VO - 0.2 && t < OUTRO + OUTRO_VO + 5.1) k = Math.min(k, 0.4);
  return base * k * Math.min(1, t / 1.5);
};

type Cue = [number, string, number];
const CUES: Cue[] = (() => {
  const a = absOf;
  const S = startOf;
  const out: Cue[] = [
    // thực trạng
    [S('P1-slide') + 1.7, 'click', 0.5], [S('P1-slide') + 2.9, 'click', 0.5], [S('P1-slide') + 1.25, 'thud', 0.45], [S('P1-slide') + 3.4, 'warn', 0.3],
    [a('A2-ai', 8.39), 'pop', 0.4], [a('A2-ai', 9.55), 'pop', 0.4], [a('A2-ai', 10.81), 'pop', 0.4],
    [S('A3-chep') + 0.3, 'shutter', 0.45], [S('A3-chep') + 1.2, 'pop', 0.4], [S('A3-chep') + 2.1, 'pen2', 0.4], [S('A3-chep') + 3.0, 'thud', 0.6],
    [a('A4-x', 16.4), 'warn', 0.3],
    // khung nổi trên shot người thật
    [S('A2-ai') + 0.3, 'swoosh', 0.3], [S('A2-ai') + 0.6, 'blip', 0.3], [a('A2-ai', 10.81), 'warn', 0.25],
    [S('A4-x') + 0.15, 'swoosh', 0.3], [S('A4-x') + 0.5, 'blip', 0.3], [S('A4-x') + 1.4, 'thud', 0.55],
    [a('A5-nhat', 21.4), 'swoosh', 0.25], [a('A5-nhat', 23.4), 'warn', 0.25],
    [a('A7-hesinhthai', 6.11), 'swoosh', 0.35], [a('A7-hesinhthai', 6.81), 'swoosh', 0.35],
    [a('A13-tamnhin', 3.8), 'swoosh', 0.3], [a('A13-tamnhin', 3.9), 'keys', 0.2],
    // búng tay → bừng sáng
    [SNAP - 2.6, 'riser', 0.35], [SNAP, 'tick', 0.9], [SNAP, 'impact', 0.55], [SNAP, 'sub', 0.5],
    [a('A6-ho', 10.9), 'swoosh', 0.35], [a('A6-ho', 11.0), 'shimmer', 0.35], [SNAP + 0.02, 'swoosh', 0.4],
    [a('A7-hesinhthai', 7.37), 'blip', 0.3], [a('A7-hesinhthai', 7.75), 'blip', 0.3], [a('A7-hesinhthai', 8.27), 'blip', 0.3],
    // giao diện
    [S('U1-khoanh') - 0.15, 'whoosh', 0.4], [S('U1-khoanh') + 1.2, 'pen2', 0.4], [S('U1-khoanh') + 3.1, 'swell', 0.35],
    [a('U1-khoanh', 6.3), 'swoosh', 0.4], [a('U1-khoanh', 7.38), 'tick', 0.35], [a('U1-khoanh', 8.08), 'tick', 0.35], [a('U1-khoanh', 8.6), 'tick', 0.35], [a('U1-khoanh', 9.24), 'tick', 0.35],
    [S('U2-toan') + 2.6, 'pen2', 0.35], [S('U2-toan') + 3.6, 'swoosh', 0.4], [S('U2-toan') + 3.7, 'shimmer', 0.3],
    [S('U3-ly') - 0.1, 'whip', 0.35], [S('U4-cham') + 0.6, 'swoosh', 0.3], [S('U4-cham') + 0.9, 'tick', 0.35], [S('U4-cham') + 2.1, 'warn', 0.35], [S('U4-cham') + 4.0, 'ding', 0.3],
    [S('U5-giongnoi') + 0.5, 'chime', 0.35], [S('U5-giongnoi') + 5.1, 'blip', 0.35],
    [S('F1-masat'), 'swell', 0.35], [S('F1-masat') + 1.6, 'thud', 0.55], ...[0, 1, 2, 3].map((k): Cue => [S('F1-masat') + 2.3 + k * 0.45, 'tick', 0.35]),
    ...INTRO_CUTS.slice(1).map((c): Cue => [I1 + c, 'hit', 0.4]), [I1 + INTRO_LOGO, 'impact', 0.5], [I1 + INTRO_LOGO + 0.05, 'pen2', 0.35],
    // đám thẻ FlowCut (cùng mốc như Launch3)
    [0, 'swell', 0.3], [1.9, 'riser', 0.45], [4.3, 'swoosh', 0.5], [OPEN_DUR - 0.25, 'impact', 0.55],
    // sau giờ học
    [a('A8-qr', 3.28), 'glass', 0.35], [a('A8-qr', 3.4), 'shimmer', 0.4], [a('A8-qr', 4.56), 'blip', 0.35],
    [S('A9-mask') + 1.4, 'swoosh', 0.45],
    [a('A10-nha', 7.42), 'pop', 0.35], [a('A10-nha', 9.34), 'pop', 0.35], [a('A10-nha', 10.62), 'pop', 0.35],
    // thực nghiệm, tài chính
    [a('A11-thunghiem', 3.77), 'tick', 0.4], [a('A11-thunghiem', 4.89), 'tick', 0.4], [a('A11-thunghiem', 6.05), 'tick', 0.4],
    [S('G1-ketqua') - 0.1, 'whoosh', 0.35], [a('G1-ketqua', 3.67), 'keys', 0.25], [a('G1-ketqua', 4.97), 'ding', 0.35], [a('G1-ketqua', 6.97), 'pop', 0.3],
    [a('A12-taichinh', 5.94), 'blip', 0.3], [a('A12-taichinh', 6.2), 'blip', 0.3], [a('A12-taichinh', 6.44), 'blip', 0.3],
    [S('G2-taichinh') - 0.1, 'whoosh', 0.35], [a('G2-taichinh', 3.0), 'pop', 0.35], [a('G2-taichinh', 8.29), 'pop', 0.35], [a('G2-taichinh', 12.4), 'pop', 0.35], [a('G2-taichinh', 15.3), 'pop', 0.35], [a('G2-taichinh', 16.8), 'ding', 0.35],
    // tầm nhìn, kết
    ...MONTAGE_CUTS.slice(1).map((c, k): Cue => [M1 + c, k === 9 ? 'impact' : k % 3 === 2 ? 'shutter' : 'hit', k === 9 ? 0.5 : 0.35]), [M1 + MONTAGE_CUTS[10] + 1.25, 'swoosh', 0.4],
    [OUTRO, 'whip', 0.5], [OUTRO + 0.3, 'pen2', 0.4], [OUTRO + 1.55, 'impact', 0.55], [OUTRO + 1.55, 'sub', 0.6],
  ];
  return out.filter((c) => c[0] >= 0 && c[0] < TOTAL_SEC - 0.2);
})();

export const SvStartup: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {SEGS.map((s, i) => (
      <Sequence key={s.id} from={Math.round(STARTS[i] * FPS)} durationInFrames={Math.round(s.dur * FPS)}>
        <SegView seg={s} n={SEGS.slice(0, i + 1).filter((x) => x.chapter).length} />
      </Sequence>
    ))}
    {/* tên sản phẩm trên nền trời, gói gọn trong shot máy ngước lên trời của A6 */}
    <Sequence from={Math.round(absOf('A6-ho', 11.0) * FPS)} durationInFrames={Math.round(2.2 * FPS)}>
      <SkyTitle />
    </Sequence>
    <Subtitles />
    <Grain opacity={0.035} />
    <Sequence from={Math.max(0, MUSIC_OFF)}>
      <Audio src={staticFile('sv/flow_bed.mp3')} startFrom={Math.max(0, -MUSIC_OFF)} volume={(f) => musicVol(f + Math.max(0, MUSIC_OFF))} />
    </Sequence>
    <Voices />
    <Sequence from={Math.round((OUTRO + OUTRO_VO) * FPS)} durationInFrames={Math.round(5.1 * FPS)}>
      <Audio src={staticFile('sv/ai_slogan.mp3')} volume={1} />
    </Sequence>
    {/* giọng mở đầu trên đám thẻ (public/voice3/open.mp3 của Launch v3): "Mỗi bài giảng, đều bắt đầu từ một nét phấn." */}
    <Sequence from={Math.round(OPEN_VO * FPS)} durationInFrames={Math.round(3.2 * FPS)}>
      <Audio src={staticFile('voice3/open.mp3')} volume={1} />
    </Sequence>
    {CUES.map(([at, file, vol], i) => (
      <Sequence key={i} from={Math.round(at * FPS)} durationInFrames={90}>
        <Audio src={staticFile(`sfx/${file}.mp3`)} volume={vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
