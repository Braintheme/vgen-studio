import type React from 'react';
import { fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { placeAt, SUBPIXEL_TEXT_TRANSFORM } from '../../core/placement.js';
import { WordSwap } from '../../core/typography/WordSwap.js';
import type { PresetFlipProps } from './manifest.js';

type Params = PresetFlipProps['params'];

/** Design sizes at 1080 px on the short side (references/4, Impact-like Anton: caps ~55 px). */
const WORD_PX = 86;
const NUMBER_PX = 80;
const SHADOW = '0 0.05em 0.22em rgba(0,0,0,0.5)';
/** Centre of the label block, share of the frame height (references/4: ~0.752). */
const CENTER_Y = { top: 0.24, center: 0.5, bottom: 0.752 } as const;

export interface LabelSwap {
  /** Number shown, or the old one while a swap runs. */
  readonly from: string;
  /** The new number while a swap runs, else null. */
  readonly to: string | null;
  readonly progress: number;
}

export interface PresetLabelProps {
  readonly layout: Layout;
  readonly word: string;
  readonly number: LabelSwap;
  readonly params: Pick<Params, 'labelSwap' | 'labelPosition' | 'labelSize' | 'labelColor' | 'numberColor'>;
  readonly seed: number;
}

/** Centre y of the label block (palette dots sit just above it). */
export const labelCenterY = (layout: Layout, position: Params['labelPosition']): number => {
  const y = layout.height * CENTER_Y[position];
  // Keep the block clear of the app's caption area at the bottom and the bar at the top.
  return Math.min(
    Math.max(y, layout.safe.top + 120 * layout.unit),
    layout.height - layout.safe.bottom - 60 * layout.unit,
  );
};

/** "PRESET" over "#n", centred; the number cuts or animates to the next one. */
export const PresetLabel: React.FC<PresetLabelProps> = ({ layout, word, number, params, seed }) => {
  const u = layout.unit * params.labelSize;
  const y = labelCenterY(layout, params.labelPosition);
  const animated = params.labelSwap !== 'cut';
  const numberStyle: React.CSSProperties = {
    fontFamily: fontFamily('anton'),
    fontSize: NUMBER_PX * u,
    lineHeight: 1,
    // Animated swaps space their letters themselves.
    ...(animated ? {} : { letterSpacing: '0.04em', marginRight: '-0.04em' }),
    color: params.numberColor,
    textShadow: SHADOW,
  };
  return (
    <div
      style={{
        ...placeAt(layout.width / 2, y, { transform: 'translate(-50%, -50%)' }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {word.trim().length > 0 ? (
        <div
          style={{
            fontFamily: fontFamily('anton'),
            fontSize: WORD_PX * u,
            lineHeight: 1.02,
            // Anton is narrower than the reference's Impact: a little tracking makes up for it.
            letterSpacing: '0.03em',
            marginRight: '-0.03em',
            color: params.labelColor,
            textShadow: SHADOW,
            transform: SUBPIXEL_TEXT_TRANSFORM,
          }}
        >
          {word}
        </div>
      ) : null}
      <div style={{ ...numberStyle, marginTop: '0.04em', transform: SUBPIXEL_TEXT_TRANSFORM }}>
        {params.labelSwap !== 'cut' ? (
          <WordSwap
            effect={params.labelSwap}
            from={number.from}
            to={number.to ?? number.from}
            progress={number.to === null ? 1 : number.progress}
            seed={seed}
            letterSpacing={0.04 * NUMBER_PX * u}
          />
        ) : (
          (number.to ?? number.from)
        )}
      </div>
    </div>
  );
};
