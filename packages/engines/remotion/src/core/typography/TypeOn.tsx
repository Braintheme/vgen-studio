import type React from 'react';
import { clamp01 } from '../motion.js';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';

export interface TypeOnProps {
  readonly text: string;
  /** Characters typed so far (fractional: the next character is fading in). */
  readonly typed: number;
  /** How many characters fade in at once (1 = strictly one after another). */
  readonly softness?: number;
  readonly style?: React.CSSProperties;
}

/**
 * Typewriter text: characters appear one by one, the newest one fading in. Untyped
 * characters keep their space, so the line never re-flows or jumps while typing.
 */
/** User-perceived characters (emoji and combining marks stay whole). */
const graphemes = (text: string): string[] =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment,
  );

export const TypeOn: React.FC<TypeOnProps> = ({ text, typed, softness = 1, style }) => (
  <span style={{ whiteSpace: 'pre', ...style }}>
    {graphemes(text).map((char, index) => (
      <span
        // Characters repeat; the index keeps keys unique and stable.
        key={`${String(index)}-${char}`}
        style={{
          opacity: clamp01((typed - index) / softness),
          display: 'inline-block',
          transform: SUBPIXEL_TEXT_TRANSFORM,
        }}
      >
        {char}
      </span>
    ))}
  </span>
);
