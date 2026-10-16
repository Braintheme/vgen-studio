import { measureText } from '@remotion/layout-utils';
import type React from 'react';
import { useMemo } from 'react';
import type { Layout } from '../layout.js';
import { ease, progress } from '../motion.js';
import { TagLabel } from '../primitives/TagLabel.js';
import { graphemes } from '../typography/glitch-swap.js';
import { WordSwap } from '../typography/WordSwap.js';
import { SWAP_SNAP } from '../typography/word-swap.js';
import type { TextField } from '@vgen/shared';
import type { PaletteGradeOptions } from './fields.js';
import type { Span } from './timeline.js';

/** Design font size (at 1080 px on the short side) and the plate's padding, in ems. */
const FONT_SIZE = 34;
const PADDING = { y: 0.52, x: 1.05 } as const;
/** Gap between the label and the safe area's edge, fraction of the frame height. */
const GAP = 0.01;
const FONT_WEIGHT = 400;
const FADE_SEC = { in: 0.2, out: 0.25 } as const;

export interface GradeLabelProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  /** The BEFORE -> AFTER swap. */
  readonly swap: Span;
  readonly texts: { readonly beforeLabel: TextField; readonly afterLabel: TextField };
  readonly params: PaletteGradeOptions;
  readonly fontFamily: string;
  readonly textColor: string;
  readonly seed: number;
  /** Measure only real glyphs: until the font is in, the label keeps its design size. */
  readonly fontsLoaded: boolean;
}

/** BEFORE / AFTER on a plate: placed by the chosen position, shrunk to fit, swapped with an effect. */
export const GradeLabel: React.FC<GradeLabelProps> = ({
  frame,
  fps,
  layout,
  swap,
  texts,
  params,
  fontFamily,
  textColor,
  seed,
  fontsLoaded,
}) => {
  const beforeText = texts.beforeLabel.enabled ? texts.beforeLabel.value : '';
  const afterText = texts.afterLabel.enabled ? texts.afterLabel.value : '';

  // Long labels shrink to fit between the safe margins.
  const designSize = FONT_SIZE * params.labelSize;
  const fit = useMemo(() => {
    if (!fontsLoaded) return 1;
    const size = designSize * layout.unit;
    const spacing = params.labelTracking * size;
    const widest = Math.max(
      ...[beforeText, afterText].map(
        (text) =>
          measureText({
            text,
            fontFamily,
            fontSize: size,
            fontWeight: FONT_WEIGHT,
            textTransform: 'uppercase',
          }).width +
          Math.max(0, graphemes(text).length - 1) * spacing,
      ),
    );
    const available = layout.width - layout.safe.left - layout.safe.right;
    return Math.min(1, available / (widest + 2 * PADDING.x * size));
  }, [fontsLoaded, designSize, layout, params.labelTracking, beforeText, afterText, fontFamily]);
  const fontSize = designSize * fit;
  const boxHeight = fontSize * layout.unit * (1 + 2 * PADDING.y);
  const y =
    params.labelPosition === 'top'
      ? layout.safe.top + GAP * layout.height
      : params.labelPosition === 'center'
        ? (layout.height - boxHeight) / 2
        : layout.height - layout.safe.bottom - GAP * layout.height - boxHeight;

  // Timing: BEFORE may come in later; AFTER may leave before the end.
  const swapProgress = progress(frame, swap.from, swap.duration);
  const swapEnd = swap.from + swap.duration;
  const beforeIn = Math.min(Math.round(params.beforeLabelDelaySec * fps), swap.from);
  const shown =
    swapProgress < SWAP_SNAP
      ? beforeIn > 0
        ? progress(frame, beforeIn, Math.round(FADE_SEC.in * fps), ease.outCubic)
        : 1
      : params.afterLabelToEnd
        ? 1
        : 1 -
          progress(
            frame,
            swapEnd + Math.round(params.afterLabelSec * fps),
            Math.round(FADE_SEC.out * fps),
            ease.inCubic,
          );

  const letterSpacing = params.labelTracking * fontSize * layout.unit;
  const both = beforeText !== '' && afterText !== '';
  const single = swapProgress < SWAP_SNAP ? beforeText : afterText;
  if (shown <= 0 || (!both && single === '')) {
    return null;
  }
  return (
    <TagLabel
      x={layout.width / 2}
      y={y}
      unit={layout.unit}
      fontFamily={fontFamily}
      textColor={textColor}
      variant={params.labelStyle}
      boxColor={params.labelColor}
      boxOpacity={params.labelOpacity}
      fontSize={fontSize}
      fontWeight={FONT_WEIGHT}
      opacity={shown}
    >
      <WordSwap
        effect={params.labelSwap}
        from={both ? beforeText : single}
        to={both ? afterText : single}
        progress={both ? swapProgress : 0}
        seed={seed}
        letterSpacing={letterSpacing}
      />
    </TagLabel>
  );
};
