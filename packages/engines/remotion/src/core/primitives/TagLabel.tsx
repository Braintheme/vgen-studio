import type React from 'react';
import { withAlpha } from '../color.js';
import { placeAt } from '../placement.js';
import type { TagLabelVariant } from './tag-label-variants.js';

export interface TagLabelProps {
  /** Horizontal centre and top edge, px. */
  readonly x: number;
  readonly y: number;
  readonly unit: number;
  readonly fontFamily: string;
  readonly textColor: string;
  /** plate: a filled box; outline: a thin frame; glass: frosted; text: no box. */
  readonly variant?: TagLabelVariant;
  /** Plate fill (`#rrggbb`) and its opacity. */
  readonly boxColor?: string;
  readonly boxOpacity?: number;
  /** Design font size (multiplied by `unit`). */
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly opacity?: number;
  readonly children: React.ReactNode;
}

const variantStyle = (
  variant: TagLabelVariant,
  boxColor: string,
  boxOpacity: number,
  textColor: string,
  unit: number,
): React.CSSProperties => {
  switch (variant) {
    case 'outline':
      return { border: `${(2 * unit).toFixed(2)}px solid ${withAlpha(textColor, 0.9)}` };
    case 'glass':
      return {
        background: 'rgba(255,255,255,0.14)',
        border: `${(1.5 * unit).toFixed(2)}px solid rgba(255,255,255,0.28)`,
        backdropFilter: `blur(${(16 * unit).toFixed(2)}px)`,
      };
    case 'text':
      return { textShadow: `0 0 ${(14 * unit).toFixed(2)}px rgba(0,0,0,0.55)` };
    case 'plate':
      return { background: withAlpha(boxColor, boxOpacity) };
  }
};

/**
 * A square-cornered caption box ("BEFORE" stamped over the photo): small wide uppercase type
 * on a plate that hugs the word. Static by design; the text inside may animate (e.g.
 * `WordSwap`).
 */
export const TagLabel: React.FC<TagLabelProps> = ({
  x,
  y,
  unit,
  fontFamily,
  textColor,
  variant = 'plate',
  boxColor = '#141416',
  boxOpacity = 0.8,
  fontSize = 34,
  fontWeight = 400,
  opacity = 1,
  children,
}) =>
  opacity <= 0 ? null : (
    <div
      style={{
        ...placeAt(x, y, { transform: 'translateX(-50%)' }),
        padding: `${(fontSize * 0.52 * unit).toFixed(2)}px ${(fontSize * 1.05 * unit).toFixed(2)}px`,
        ...variantStyle(variant, boxColor, boxOpacity, textColor, unit),
        color: textColor,
        fontFamily,
        fontWeight,
        fontSize: fontSize * unit,
        lineHeight: 1,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        opacity,
      }}
    >
      {children}
    </div>
  );
