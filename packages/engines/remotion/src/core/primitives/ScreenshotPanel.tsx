import type React from 'react';
import { Img } from 'remotion';

export interface PanelBorder {
  /** Output pixels. */
  readonly width: number;
  readonly color: string;
  readonly radius: number;
}

export interface ScreenshotPanelProps {
  readonly src: string;
  /** Outer size including the border, output pixels. */
  readonly width: number;
  readonly height: number;
  readonly border: PanelBorder;
  /** Shadow length, output pixels (0 = none). */
  readonly shadow: number;
  readonly style?: React.CSSProperties;
}

/** Largest size of `aspect` (width / height) that fits into `box`. */
export const fitInside = (
  aspect: number,
  box: { readonly width: number; readonly height: number },
): { readonly width: number; readonly height: number } =>
  box.width / box.height > aspect
    ? { width: box.height * aspect, height: box.height }
    : { width: box.width, height: box.width / aspect };

/** A screenshot (UI panel) with a frame-like border, rounded corners and a soft drop shadow. */
export const ScreenshotPanel: React.FC<ScreenshotPanelProps> = ({
  src,
  width,
  height,
  border,
  shadow,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width,
      height,
      boxSizing: 'border-box',
      border: border.width > 0 ? `${border.width.toFixed(2)}px solid ${border.color}` : undefined,
      borderRadius: border.radius,
      overflow: 'hidden',
      background: '#1d1d1f',
      boxShadow:
        shadow > 0
          ? `0 ${(shadow * 0.45).toFixed(1)}px ${shadow.toFixed(1)}px rgba(0,0,0,0.55), 0 ${(shadow * 0.08).toFixed(1)}px ${(shadow * 0.2).toFixed(1)}px rgba(0,0,0,0.35)`
          : undefined,
      ...style,
    }}
  >
    <Img src={src} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
);
