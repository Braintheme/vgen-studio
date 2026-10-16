import type React from 'react';
import { fitFontSize, fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { clamp01, cubicBezier, ease } from '../../core/motion.js';
import { placeAt, SUBPIXEL_TEXT_TRANSFORM } from '../../core/placement.js';
import { SlicedText } from '../../core/typography/SlicedText.js';
import type { PresetFlipProps } from './manifest.js';

type Params = PresetFlipProps['params'];

/** Design sizes at 1080 px on the short side (references/4, League Gothic: caps ~70 px and ~165 px). */
const LEAD_PX = 94;
const WORD_PX = 242;
/** Top of the block, share of the frame height (word centre at ~0.704 as in the reference). */
const TOP = 0.606;
/** Mask slope: the cyan edge then rises ~13° to the right, as measured on the reference. */
const SLICE_ANGLE = 16;
/** The cut crosses the word's middle a little low (cyan edge at 1354 px at x = 540 in the reference). */
const SLICE_CUT_Y = 0.087;
/** Slice-in: how far the layers travel along the cut, em. */
const SLICE_TRAVEL = 1.4;
const POP_EASE = cubicBezier(0.34, 1.56, 0.64, 1);
const SHADOW = '0 0.04em 0.18em rgba(0,0,0,0.45)';
/** League Gothic's width axis: the reference's big word is narrower than the regular width. */
const WORD_WIDTH = 86;

export interface CtaTitleProps {
  readonly layout: Layout;
  readonly lead: string | null;
  readonly word: string | null;
  /** Linear 0..1 entrance (1 = in place). */
  readonly enter: number;
  readonly params: Pick<
    Params,
    'ctaTopColor' | 'ctaBottomColor' | 'ctaLeadColor' | 'ctaSize' | 'ctaGrain' | 'ctaShadow' | 'ctaEntrance'
  >;
}

/** "COMMENT" over a big two-tone sliced "PRESET" (references/4's call to action). */
export const CtaTitle: React.FC<CtaTitleProps> = ({ layout, lead, word, enter, params }) => {
  if (!lead && !word) return null;
  const u = layout.unit * params.ctaSize;
  const maxWidth = layout.width - layout.safe.left - layout.safe.right;
  const gothic = fontFamily('league-gothic');
  const leadSize = lead ? fitFontSize(lead, 'league-gothic', maxWidth, LEAD_PX * u) : 0;
  const wordSize = word ? fitFontSize(word, 'league-gothic', maxWidth, WORD_PX * u) : 0;
  const blockHeight = leadSize + wordSize * 0.9;
  const top = Math.min(layout.height * TOP, layout.height - layout.safe.bottom - blockHeight);

  const t = clamp01(enter);
  const slice = params.ctaEntrance === 'slice' ? 1 - ease.outCubic(t) : 0;
  const pop = params.ctaEntrance === 'pop';
  const radians = (SLICE_ANGLE * Math.PI) / 180;
  const along = { x: Math.cos(radians) * SLICE_TRAVEL * slice, y: -Math.sin(radians) * SLICE_TRAVEL * slice };
  const opacity = params.ctaEntrance === 'cut' ? 1 : Math.min(1, t * 2.5);
  const scale = pop ? 0.7 + 0.3 * POP_EASE(t) : 1;

  return (
    <div
      style={{
        ...placeAt(layout.width / 2, top, { transform: `translateX(-50%) scale(${scale.toFixed(4)})` }),
        // The block may scale (pop): no `will-change` (it would freeze the raster scale).
        willChange: 'auto',
        transformOrigin: '50% 60%',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {lead ? (
        <div
          style={{
            fontFamily: gothic,
            fontSize: leadSize,
            lineHeight: 1,
            letterSpacing: '0.02em',
            color: params.ctaLeadColor,
            textShadow: params.ctaShadow ? SHADOW : undefined,
            transform: `translateY(${(slice * 0.3).toFixed(4)}em) ${SUBPIXEL_TEXT_TRANSFORM}`,
          }}
        >
          {lead}
        </div>
      ) : null}
      {word ? (
        <SlicedText
          text={word}
          style={{
            fontFamily: gothic,
            fontSize: wordSize,
            fontVariationSettings: `'wdth' ${WORD_WIDTH}`,
            lineHeight: 0.9,
            letterSpacing: '0.01em',
          }}
          topColor={params.ctaTopColor}
          bottomColor={params.ctaBottomColor}
          angle={SLICE_ANGLE}
          cutY={SLICE_CUT_Y}
          outline={0.009}
          grain={params.ctaGrain}
          shadow={params.ctaShadow}
          topOffset={{ x: -along.x, y: -along.y }}
          bottomOffset={along}
        />
      ) : null}
    </div>
  );
};
