import type React from 'react';
import { AbsoluteFill, Img } from 'remotion';

export interface BlurredBackdropProps {
  readonly src: string;
  /** Effective blur radius in output pixels. */
  readonly blur?: number;
  readonly zoom?: number;
  readonly brightness?: number;
  readonly saturation?: number;
}

/**
 * Heavily blurred background. The image is drawn at 1/4 size and scaled up, which
 * makes large blur radii ~16x cheaper to render than blurring at full size.
 */
export const BlurredBackdrop: React.FC<BlurredBackdropProps> = ({
  src,
  blur = 60,
  zoom = 1,
  brightness = 0.75,
  saturation = 1.1,
}) => {
  const factor = 4;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          position: 'absolute',
          left: `${50 - 50 / factor}%`,
          top: `${50 - 50 / factor}%`,
          width: `${100 / factor}%`,
          height: `${100 / factor}%`,
          objectFit: 'cover',
          filter: `blur(${(blur / factor).toFixed(2)}px) brightness(${brightness}) saturate(${saturation})`,
          // Extra scale hides the transparent fringe that blur creates at the edges.
          transform: `scale(${(factor * 1.12 * zoom).toFixed(4)})`,
          transformOrigin: '50% 50%',
        }}
      />
    </AbsoluteFill>
  );
};
