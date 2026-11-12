import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';

// Chuyển cảnh kiểu Flow: cảnh cũ nở ra + nhòe, cảnh mới thu về từ nhòe sang nét (giống khoảnh khắc "đang tạo" → "đã tạo").
const BlurZoom: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const style: React.CSSProperties = entering
    ? {opacity: p, filter: `blur(${(1 - p) * 26}px)`, transform: `scale(${1.08 - 0.08 * p})`}
    : {filter: `blur(${p * 26}px)`, transform: `scale(${1 + 0.12 * p})`};
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const blurZoom = (): TransitionPresentation<Record<string, never>> => ({component: BlurZoom, props: {}});
