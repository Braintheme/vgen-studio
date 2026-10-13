import type React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, ease, progress } from '../motion.js';

export interface WordRevealProps {
  readonly text: string;
  /** Frame at which the first word starts entering. */
  readonly start: number;
  /** Frames between consecutive words. */
  readonly stagger?: number;
  /** Optional frame at which words start leaving (upwards, staggered). */
  readonly exitStart?: number;
  readonly exitDuration?: number;
  readonly style?: React.CSSProperties;
  /** Word index (0-based) rendered in the accent color. */
  readonly accentWord?: number;
  readonly accentColor?: string;
  readonly align?: 'start' | 'center';
  /** Spring settings per word; snappier springs suit short scenes. */
  readonly spring?: { readonly damping: number; readonly stiffness: number; readonly mass: number };
}

/**
 * Word-by-word entrance: every word rises out of its own mask with a spring,
 * a slight tilt and a blur-to-sharp focus pull.
 */
export const WordReveal: React.FC<WordRevealProps> = ({
  text,
  start,
  stagger = 4,
  exitStart,
  exitDuration = 12,
  style,
  accentWord,
  accentColor,
  align = 'start',
  spring: springConfig = { damping: 16, stiffness: 120, mass: 0.9 },
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: '0.28em',
        rowGap: '0.04em',
        ...style,
      }}
    >
      {words.map((word, index) => {
        const enter = spring({
          frame: frame - start - index * stagger,
          fps,
          config: springConfig,
        });
        const leave =
          exitStart === undefined
            ? 0
            : progress(frame, exitStart + index * Math.max(1, stagger / 2), exitDuration, ease.inCubic);
        const settle = clamp01(enter);
        return (
          <span
            // Words can repeat; the index keeps keys unique and stable.
            key={`${index}-${word}`}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              padding: '0.06em 0 0.14em',
              margin: '-0.06em 0 -0.14em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${((1 - enter) * 105 - leave * 105).toFixed(3)}%) rotate(${((1 - enter) * 5).toFixed(3)}deg)`,
                transformOrigin: '0% 100%',
                filter: `blur(${((1 - settle) * 10 + leave * 6).toFixed(2)}px)`,
                opacity: clamp01(settle * 1.4) * (1 - leave),
                color: index === accentWord ? accentColor : undefined,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};
