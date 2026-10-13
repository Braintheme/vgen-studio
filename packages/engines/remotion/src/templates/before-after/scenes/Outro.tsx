import type { Style, TextField } from '@vgen/shared';
import type React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { withAlpha } from '../../../core/color.js';
import { fitFontSize, fontFamily } from '../../../core/fonts.js';
import type { Layout } from '../../../core/layout.js';
import { bell, ease, keyframes, mix, progress } from '../../../core/motion.js';
import { placeAt } from '../../../core/placement.js';
import { BlurredBackdrop } from '../../../core/primitives/BlurredBackdrop.js';
import { PhotoPlane } from '../../../core/primitives/PhotoPlane.js';
import { WordReveal } from '../../../core/typography/WordReveal.js';

export interface OutroProps {
  readonly before: string;
  readonly after: string;
  readonly title: TextField;
  readonly outroText: TextField;
  readonly style: Style;
  readonly layout: Layout;
  readonly duration: number;
  /** Frames during which the scene is still transitioning in. */
  readonly enterOffset: number;
}

/** End card: a floating before/after comparison card and the call to action. */
export const Outro: React.FC<OutroProps> = ({
  before,
  after,
  title,
  outroText,
  style,
  layout,
  duration,
  enterOffset,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, width, height, safe, orientation } = layout;
  const landscape = orientation === 'landscape';

  const cardIn = spring({ frame: frame - enterOffset + 2, fps, config: { damping: 18, stiffness: 110 } });
  const cardWidth = landscape ? height * 0.6 * 0.8 : width * (orientation === 'square' ? 0.42 : 0.6);
  const cardHeight = cardWidth * 1.25;
  const radius = Math.max(12, style.radius * 1.5) * unit;
  // The end card must sell the result: the divider rests near the middle, then sweeps
  // right-to-left so the video ends on (mostly) AFTER.
  const sweepStart = enterOffset + (duration - enterOffset) * 0.35;
  const divider = keyframes(
    progress(frame, enterOffset, duration - enterOffset),
    [
      { at: 0, value: 0.62 },
      { at: 0.35, value: 0.56 },
      { at: 0.85, value: 0.1 },
      { at: 1, value: 0.08 },
    ],
    ease.inOutCubic,
  );
  const sweeping = progress(frame, sweepStart, (duration - sweepStart) * 0.5);

  const cardLeft = landscape ? safe.left + 60 * unit : (width - cardWidth) / 2;
  const cardTop = landscape ? (height - cardHeight) / 2 : safe.top + 40 * unit;
  const textLeft = landscape ? cardLeft + cardWidth + 90 * unit : safe.left + 20 * unit;
  const textWidth = width - textLeft - safe.right - 20 * unit;
  const ctaSize = fitFontSize(
    outroText.value,
    style.fonts.heading,
    textWidth,
    landscape ? 84 * unit : 80 * unit,
  );

  return (
    <AbsoluteFill>
      <BlurredBackdrop src={after} zoom={mix(1.04, 1.14, progress(frame, 0, duration))} brightness={0.5} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${withAlpha(style.colors.background, 0.35)} 0%, ${withAlpha(style.colors.background, 0.75)} 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: cardWidth,
          height: cardHeight,
          left: cardLeft,
          top: cardTop,
          borderRadius: radius,
          overflow: 'hidden',
          boxShadow: `0 ${30 * unit}px ${90 * unit}px rgba(0,0,0,0.55), 0 0 0 ${2 * unit}px rgba(255,255,255,0.14)`,
          opacity: cardIn,
          transform: `translateY(${((1 - cardIn) * 60 * unit).toFixed(2)}px) scale(${mix(0.9, 1, cardIn).toFixed(4)}) rotate(${((1 - cardIn) * -3).toFixed(3)}deg)`,
        }}
      >
        <PhotoPlane src={before} />
        <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${(divider * 100).toFixed(3)}%)` }}>
          <PhotoPlane src={after} />
        </AbsoluteFill>
        <div
          style={{
            // Sweeps across the card: transforms only (see core/placement.ts).
            ...placeAt(divider * cardWidth - 1.5 * unit, 0),
            bottom: 0,
            width: 3 * unit,
            background: '#fff',
            boxShadow: `0 0 ${(18 + 22 * bell(sweeping)) * unit}px rgba(255,255,255,0.8)`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: textLeft,
          width: textWidth,
          ...(landscape
            ? { top: '50%', transform: 'translateY(-50%)' }
            : { top: cardTop + cardHeight + 70 * unit, textAlign: 'center' as const }),
          color: style.colors.text,
        }}
      >
        {title.enabled && title.value ? (
          <div
            style={{
              fontFamily: fontFamily(style.fonts.body),
              fontWeight: 600,
              fontSize: 28 * unit,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: style.colors.accent,
              marginBottom: 22 * unit,
              opacity: progress(frame, enterOffset, 14, ease.outCubic),
            }}
          >
            {title.value}
          </div>
        ) : null}
        {outroText.enabled && outroText.value ? (
          <WordReveal
            text={outroText.value}
            start={Math.round(enterOffset * 0.4)}
            stagger={2}
            spring={{ damping: 20, stiffness: 190, mass: 0.8 }}
            align={landscape ? 'start' : 'center'}
            style={{
              fontFamily: fontFamily(style.fonts.heading),
              fontWeight: 700,
              fontSize: ctaSize,
              lineHeight: 1.08,
              letterSpacing: '-0.015em',
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
