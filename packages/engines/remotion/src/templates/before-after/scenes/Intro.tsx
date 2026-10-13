import type { Style, TextField } from '@vgen/shared';
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { withAlpha } from '../../../core/color.js';
import { fitFontSize, fontFamily } from '../../../core/fonts.js';
import type { Layout } from '../../../core/layout.js';
import { ease, mix, progress } from '../../../core/motion.js';
import { BlurredBackdrop } from '../../../core/primitives/BlurredBackdrop.js';
import { WordReveal } from '../../../core/typography/WordReveal.js';

export interface IntroProps {
  readonly src: string;
  readonly title: TextField;
  readonly subtitle: TextField;
  readonly style: Style;
  readonly layout: Layout;
  readonly duration: number;
}

/** Title card over a slowly settling, blurred "before" photo. */
export const Intro: React.FC<IntroProps> = ({ src, title, subtitle, style, layout, duration }) => {
  const frame = useCurrentFrame();
  const { unit, width, safe, orientation } = layout;
  const textWidth = width - safe.left - safe.right - 40 * unit;
  const titleSize = fitFontSize(
    title.value,
    style.fonts.heading,
    textWidth,
    orientation === 'landscape' ? 104 * unit : 116 * unit,
  );
  const titleWords = title.enabled ? title.value.split(/\s+/).filter(Boolean).length : 0;
  const subtitleStart = 6 + titleWords * 4 + 4;
  const subtitleIn = progress(frame, subtitleStart, 16, ease.outCubic);

  return (
    <AbsoluteFill>
      <BlurredBackdrop
        src={src}
        blur={44}
        zoom={mix(1.2, 1.04, progress(frame, 0, duration, ease.outCubic))}
        brightness={0.8}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${withAlpha(style.colors.background, 0)} 0%, ${withAlpha(style.colors.background, 0.45)} 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: safe.left + 20 * unit,
          right: safe.right + 20 * unit,
          top: orientation === 'landscape' ? '30%' : '36%',
          color: style.colors.text,
        }}
      >
        <div
          style={{
            width: 110 * unit,
            height: 8 * unit,
            borderRadius: 4 * unit,
            marginBottom: 36 * unit,
            background: style.colors.accent,
            boxShadow: `0 0 ${24 * unit}px ${withAlpha(style.colors.accent, 0.6)}`,
            transform: `scaleX(${progress(frame, 2, 18, ease.outExpo).toFixed(4)})`,
            transformOrigin: '0% 50%',
          }}
        />
        {title.enabled ? (
          <WordReveal
            text={title.value}
            start={6}
            stagger={4}
            style={{
              fontFamily: fontFamily(style.fonts.heading),
              fontWeight: 700,
              fontSize: titleSize,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              textShadow: `0 ${4 * unit}px ${30 * unit}px rgba(0,0,0,0.35)`,
            }}
          />
        ) : null}
        {subtitle.enabled && subtitle.value ? (
          <div
            style={{
              marginTop: 30 * unit,
              fontFamily: fontFamily(style.fonts.body),
              fontWeight: 500,
              fontSize: 40 * unit,
              letterSpacing: '0.04em',
              opacity: 0.88 * subtitleIn,
              transform: `translateY(${((1 - subtitleIn) * 24 * unit).toFixed(2)}px)`,
            }}
          >
            {subtitle.value}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
