import type React from 'react';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';

interface Offset {
  readonly x: number;
  readonly y: number;
}

export interface SlicedTextProps {
  readonly text: string;
  /** Font, size, weight; applied to every copy of the text. */
  readonly style: React.CSSProperties;
  /** The masked top layer. */
  readonly topColor: string;
  /** The whole word underneath (and the outline of the top layer). */
  readonly bottomColor: string;
  /** Slope of the cut, degrees: positive rises to the right. */
  readonly angle?: number;
  /** Where the cut crosses the word's centre line, em below the centre (negative: above). */
  readonly cutY?: number;
  /** Outline of the top layer in the bottom colour, em (0: none). */
  readonly outline?: number;
  /** Fine speckle texture in both colours. */
  readonly grain?: boolean;
  /** Dark shadows: the word's own, and the top layer's on the word below the cut. */
  readonly shadow?: boolean;
  /** Offsets of the layers, em (entrances: the layers slide in along the cut). */
  readonly topOffset?: Offset;
  readonly bottomOffset?: Offset;
}

/** Fine noise as an image (seedless SVG turbulence: identical in every render). */
const GRAIN_IMAGE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 0.6"/></filter><rect width="160" height="160" filter="url(#n)"/></svg>',
)}")`;
/** The word's own shadow: dark, close, down and to the right (references/4). */
const WORD_SHADOW = 'drop-shadow(0.03em 0.035em 0.015em rgba(8, 6, 6, 0.85))';
/** The top layer's shadow on the word below the cut, plus a light one up and to the right. */
const TOP_SHADOW =
  'drop-shadow(0.01em 0.045em 0.04em rgba(0, 0, 0, 0.85)) drop-shadow(0.012em -0.012em 0.01em rgba(0, 0, 0, 0.3))';
/** Room around the word inside the mask, em (outlines and shadows reach past the glyphs). */
const PAD = 0.3;

const fill = (color: string, grain: boolean): React.CSSProperties =>
  grain
    ? {
        color: 'transparent',
        backgroundImage: `${GRAIN_IMAGE}, linear-gradient(${color}, ${color})`,
        backgroundSize: '0.6em 0.6em, 100% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
      }
    : { color };

/** One copy of the text, laid exactly over the sizing copy. */
const Copy: React.FC<{
  readonly text: string;
  readonly style: React.CSSProperties;
  readonly at?: number;
}> = ({ text, style, at = 0 }) => (
  <span
    style={{
      ...style,
      position: 'absolute',
      left: `${at}em`,
      top: `${at}em`,
      whiteSpace: 'pre',
      transform: SUBPIXEL_TEXT_TRANSFORM,
    }}
  >
    {text}
  </span>
);

const layer = (offset: Offset, filter: string | undefined): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transform: `translate(${offset.x.toFixed(4)}em, ${offset.y.toFixed(4)}em)`,
  ...(filter ? { filter } : {}),
});

/**
 * Two copies of a word stacked (references/4's "PRESET"): the whole word in one colour, and
 * on top of it the same word in another colour, outlined in the first, cut along a slanted
 * line by a mask (no gap: the word underneath shows below the cut) and casting a dark shadow
 * on it. Sized by an invisible copy, so it lays out like plain text; layers move by transforms.
 */
export const SlicedText: React.FC<SlicedTextProps> = ({
  text,
  style,
  topColor,
  bottomColor,
  angle = 15,
  cutY = 0,
  outline = 0.018,
  grain = false,
  shadow = false,
  topOffset = { x: 0, y: 0 },
  bottomOffset = { x: 0, y: 0 },
}) => {
  const radians = (angle * Math.PI) / 180;
  // The gradient runs across the cut (down and a little right for a cut rising to the right);
  // its middle is the box's centre, moved by the cut's offset measured along the gradient.
  const edge = `calc(50% + ${(cutY * Math.cos(radians)).toFixed(4)}em)`;
  const mask = `linear-gradient(${(180 - angle).toFixed(3)}deg, #000 ${edge}, transparent ${edge})`;
  return (
    <span style={{ ...style, position: 'relative', display: 'inline-block', whiteSpace: 'pre' }}>
      <span style={{ visibility: 'hidden' }}>{text}</span>
      <div style={layer(bottomOffset, shadow ? WORD_SHADOW : undefined)}>
        <Copy text={text} style={{ ...style, ...fill(bottomColor, grain) }} />
      </div>
      <div style={layer(topOffset, shadow ? TOP_SHADOW : undefined)}>
        <div
          style={{
            position: 'absolute',
            inset: `${-PAD}em`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        >
          {outline > 0 ? (
            <Copy
              text={text}
              at={PAD}
              style={{
                ...style,
                color: bottomColor,
                WebkitTextStroke: `${(outline * 2).toFixed(4)}em ${bottomColor}`,
              }}
            />
          ) : null}
          <Copy text={text} at={PAD} style={{ ...style, ...fill(topColor, grain) }} />
        </div>
      </div>
    </span>
  );
};
