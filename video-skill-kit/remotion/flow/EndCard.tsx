import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {LogoAnim, Wordmark} from './LogoAnim';
import {C, FONT} from '../theme';
import {BlurText} from './BlurText';
import {AUTHOR} from '../demo2/plan';

// Kết kiểu Flow: chữ khổng lồ "lồng" footage bên trong thu nhỏ thành câu kêu gọi → logo hiện từ mờ trên nền đen.
// Đặt trùng phần outro của nhạc (music.ts) nên nốt cuối rơi đúng logo.
export const END_DUR = 7.2;

/** credits = false: bản giới thiệu sản phẩm, không ghi tác giả / cuộc thi. */
export const EndCard: React.FC<{credits?: boolean}> = ({credits = true}) => {
  const t = useSec();
  const shrink = ramp(t, 0, 1.6, Easing.out(Easing.cubic));
  const fill = ramp(t, 1.0, 0.6); // ảnh trong chữ → chữ trắng
  const out1 = ramp(t, 2.5, 0.5, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{background: '#000', alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          position: 'absolute',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: lerp(520, 120, shrink),
          letterSpacing: -6,
          whiteSpace: 'nowrap',
          // khung app nền giấy quá sáng để lồng vào chữ → lồng dải màu thương hiệu đang trôi, rồi chuyển trắng
          backgroundImage: `linear-gradient(rgba(255,255,255,${fill}), rgba(255,255,255,${fill})), linear-gradient(100deg, ${C.violet}, ${C.cyan}, ${C.green}, ${C.amber}, ${C.violet})`,
          backgroundSize: '100% 100%, 300% 100%',
          backgroundPosition: `0 0, ${t * 60}% 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          opacity: 1 - out1,
          filter: `blur(${out1 * 14}px)`,
        }}
      >
        Bắt đầu dạy.
      </div>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26}}>
        <LogoAnim at={2.7} size={250} />
        <Wordmark at={3.7} size={100} />
        {credits && <BlurText text={`${AUTHOR.name} · ${AUTHOR.role}`} at={4.6} size={30} stagger={0.03} weight={600} color={C.muted} />}
      </AbsoluteFill>
      {credits && (
        <div style={{position: 'absolute', bottom: 48, fontFamily: FONT, fontSize: 22, color: 'rgba(255,255,255,0.45)', opacity: ramp(t, 4.8, 0.8)}}>
          Ngày hội Nhà giáo sáng tạo với công nghệ số và trí tuệ nhân tạo 2026 · Bảng B
        </div>
      )}
    </AbsoluteFill>
  );
};
