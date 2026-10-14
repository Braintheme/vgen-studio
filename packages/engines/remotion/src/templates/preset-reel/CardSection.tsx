import type React from 'react';
import { fontFamily } from '../../core/fonts.js';
import { computeLayout, type Layout } from '../../core/layout.js';
import { ease, mix, progress } from '../../core/motion.js';
import { placeAt } from '../../core/placement.js';
import { BlurredBackdrop } from '../../core/primitives/BlurredBackdrop.js';
import { INSTANT_CARD_RATIO, InstantCard, instantCardGeometry } from '../../core/primitives/InstantCard.js';
import { PhotoPlane } from '../../core/primitives/PhotoPlane.js';
import { REVEAL_EFFECTS } from '../../core/reveals/registry.js';
import { SceneRenderer } from '../../core/scene/SceneRenderer.js';
import { CardCaption } from './CardCaption.js';
import type { PresetReelProps } from './manifest.js';
import { TIMING, type ReelTimeline } from './timeline.js';

/** Card width relative to the frame width at most (references/2: 880 px of 1080). */
const CARD_MAX_WIDTH = 0.815;
const CARD_COLOR = '#f7f7f5';
/** The photo settles inside the window after the cut. */
const SETTLE_FROM = 1.08;

export interface CardSectionProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly props: PresetReelProps;
  readonly before: string;
  readonly after: string;
  readonly timeline: ReelTimeline;
}

/** The before/after inside an instant-photo card, over a blurred, dimmed copy of the photo. */
export const CardSection: React.FC<CardSectionProps> = ({
  frame,
  fps,
  layout,
  props,
  before,
  after,
  timeline,
}) => {
  const { params, texts, style } = props;
  const effect = REVEAL_EFFECTS.get(params.revealEffect);
  const revealFrom = timeline.reveal.from - timeline.card.from;
  const revealProgress = progress(frame, revealFrom, timeline.reveal.duration);

  // The card fits between the top safe area and most of the bottom one (as in the reference).
  const top = layout.safe.top;
  const bottom = layout.height - layout.safe.bottom * 0.6;
  const width = Math.min(layout.width * CARD_MAX_WIDTH, (bottom - top) / INSTANT_CARD_RATIO);
  const card = instantCardGeometry(width);
  const x = (layout.width - card.width) / 2;
  const y = (top + bottom) / 2 - card.height / 2;

  const settle = mix(SETTLE_FROM, 1, progress(frame, 0, Math.round(TIMING.cardSettle * fps), ease.outCubic));
  const camera = { scale: settle, x: 0, y: 0, rotate: 0 };
  const windowLayout = computeLayout(card.window.width, card.window.height);
  const nodes = effect.render({
    progress: revealProgress,
    layout: windowLayout,
    accent: style.colors.accent,
    beforeLabel: null,
    afterLabel: null,
    seed: props.seed,
  });
  const afterBackdrop = ease.inOutSine(revealProgress);
  const brightness = 1 - params.backdropDim;
  const text = (field: { enabled: boolean; value: string }): string | null =>
    field.enabled && field.value.trim() ? field.value : null;

  return (
    <>
      <BlurredBackdrop src={before} brightness={brightness} saturation={0.9} zoom={1.05} />
      {afterBackdrop > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: afterBackdrop }}>
          <BlurredBackdrop src={after} brightness={brightness} saturation={0.9} zoom={1.05} />
        </div>
      ) : null}
      <div style={{ ...placeAt(x, y), width: card.width, height: card.height }}>
        <InstantCard
          geometry={card}
          color={CARD_COLOR}
          radius={style.radius * layout.unit}
          shadow={70 * layout.unit}
          caption={
            <CardCaption
              cardWidth={card.width}
              fontFamily={fontFamily(style.fonts.body)}
              title={text(texts.cardTitle)}
              lens={text(texts.cardLens)}
              exposure={text(texts.cardExposure)}
              footer={text(texts.cardFooter)}
            />
          }
        >
          <SceneRenderer
            nodes={nodes}
            renderBefore={() => <PhotoPlane src={before} camera={camera} />}
            renderAfter={() => <PhotoPlane src={after} camera={camera} />}
            layout={windowLayout}
            labelFont={fontFamily(style.fonts.heading)}
            accent={style.colors.accent}
            textColor={style.colors.text}
            radius={style.radius}
          />
        </InstantCard>
      </div>
    </>
  );
};
