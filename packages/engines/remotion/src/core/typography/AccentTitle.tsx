import type React from 'react';
import { placeAt, SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';
import { parseAccentText } from './accent-text.js';

export interface AccentTitleLine {
  readonly text: string;
  readonly style: React.CSSProperties;
  /** 0..1 entrance of this line (rises and fades in). */
  readonly enter: number;
}

export interface AccentTitleProps {
  readonly lines: readonly AccentTitleLine[];
  /** Style of `*accented*` runs (on top of the line style). */
  readonly accentStyle: React.CSSProperties;
  /** Horizontal center and top of the block, output pixels. */
  readonly x: number;
  readonly y: number;
  /** 0..1 exit of the whole block (fades and grows slightly). */
  readonly exit: number;
  /** Rise distance of the entrance, in em of each line. */
  readonly riseEm?: number;
}

/**
 * A centered multi-line title where each line has its own type style and inline `*accents*`
 * get another one (e.g. a thin italic lead, a black italic hero word, an accented tool name).
 */
export const AccentTitle: React.FC<AccentTitleProps> = ({
  lines,
  accentStyle,
  x,
  y,
  exit,
  riseEm = 0.45,
}) => {
  if (lines.length === 0 || exit >= 1) return null;
  return (
    <div
      style={{
        ...placeAt(x, y, { transform: `translateX(-50%) scale(${(1 + 0.06 * exit).toFixed(4)})` }),
        // The block scales on exit: no `will-change` (it would freeze the raster scale).
        willChange: 'auto',
        transformOrigin: '50% 40%',
        opacity: 1 - exit,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            ...line.style,
            opacity: line.enter,
            transform: `translateY(${((1 - line.enter) * riseEm).toFixed(4)}em) ${SUBPIXEL_TEXT_TRANSFORM}`,
          }}
        >
          {parseAccentText(line.text).map((run, runIndex) => (
            <span key={runIndex} style={run.accent ? accentStyle : undefined}>
              {run.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
