import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {dirBlur} from './fx';

// Whip pan: cả khung lia ngang thật nhanh với nhòe chuyển động một chiều (cần <DirBlurDefs /> trong cây).
const Whip: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const x = entering ? (1 - p) * 1150 : -p * 1150;
  const b = entering ? (1 - p) * 90 : p * 90;
  return <AbsoluteFill style={{transform: `translateX(${x}px)`, filter: dirBlur(b)}}>{children}</AbsoluteFill>;
};

export const whip = (): TransitionPresentation<Record<string, never>> => ({component: Whip, props: {}});

// Zoom xuyên: cảnh cũ lao về phía camera (phóng 1 → 2,6 + nhòe), cảnh mới hiện từ xa lại.
const Through: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const style: React.CSSProperties = entering
    ? {opacity: Math.min(1, p * 1.8), transform: `scale(${0.82 + 0.18 * p})`, filter: `blur(${(1 - p) * 18}px)`}
    : {opacity: 1 - p, transform: `scale(${1 + 1.6 * p * p})`, filter: `blur(${p * 22}px)`};
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const through = (): TransitionPresentation<Record<string, never>> => ({component: Through, props: {}});
