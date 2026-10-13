import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MusicLayer } from '../../core/audio/MusicLayer.js';
import { imageAsset, placeholderImage, type RemotionTemplateProps } from '../../core/composition.js';
import { fontFamily, useFonts } from '../../core/fonts.js';
import { useLayout } from '../../core/hooks.js';
import { clamp01, cubicBezier, ease, mix, progress } from '../../core/motion.js';
import { placeAt } from '../../core/placement.js';
import { Grain, Vignette } from '../../core/primitives/Overlays.js';
import { coverCamera, IDENTITY_CAMERA } from '../../core/primitives/camera.js';
import { PhotoCard } from '../../core/primitives/PhotoCard.js';
import { PhotoPlane } from '../../core/primitives/PhotoPlane.js';
import { REVEAL_EFFECTS } from '../../core/reveals/registry.js';
import { SceneRenderer } from '../../core/scene/SceneRenderer.js';
import { TypeOn } from '../../core/typography/TypeOn.js';
import type { BeforeAfterCardProps } from './manifest.js';
import { cardTimeline, LABEL_SEC } from './timeline.js';

const BEFORE_PLACEHOLDER = placeholderImage('BEFORE');
const AFTER_PLACEHOLDER = placeholderImage('AFTER', '#3a3328', '#191510');

/** Card tilt around the vertical axis, degrees. */
const TILT_DEG = { flat: 0, soft: 9, strong: 17 } as const;
/** Card size relative to the frame (the card is the whole frame scaled down). */
const CARD_SCALE = { portrait: 0.58, square: 0.62, landscape: 0.62 } as const;
/** From the reference: dark, soft, bottom-right, fixed light. */
const SHADOW = { x: 0.03, y: 0.042, blur: 0.035, opacity: 0.7 } as const;
/** Gap between the card and its label, fraction of the frame height. */
const LABEL_GAP = 0.047;
/** Fitted to the reference motion curve (references/1): a short wind-up, a very long landing. */
const SHRINK_EASE = cubicBezier(0.35, 0.1, 0, 1);
/** Fitted as well: an almost symmetric ease-in-out. */
const EXPAND_EASE = cubicBezier(0.45, 0.1, 0.45, 1);
const CROSSFADE_SEC = 0.15;
/** Optional first-photo motion: a gentle push-in with a slight drift. */
const INTRO_PUSH = { scale: 1.07, x: -0.012, y: -0.006 } as const;
const SETTLE_ZOOM = 1.035;
/** The end settle loses speed almost linearly in the reference (outQuad). */
const SETTLE_EASE = cubicBezier(0.5, 1, 0.89, 1);

export const BeforeAfterCard: React.FC<RemotionTemplateProps<BeforeAfterCardProps>> = ({ props, assets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { style, texts, params } = props;
  useFonts([style.fonts.heading]);
  const effect = REVEAL_EFFECTS.get(params.revealEffect);
  const t = useMemo(
    () =>
      cardTimeline({
        durationSec: props.durationSec,
        fps,
        endFlash: params.endFlash,
        revealSec: effect.durationSec,
        revealedAt: effect.revealedAt,
      }),
    [props.durationSec, fps, params.endFlash, effect.durationSec, effect.revealedAt],
  );

  // Optional slow push on the first photo, settling before the reveal; both photos share it
  // so the pair stays aligned (as in the before/after template).
  const push = params.introMotion ? progress(frame, 0, t.reveal.from, ease.inOutSine) : 0;
  const camera = params.introMotion
    ? coverCamera(
        { scale: mix(1, INTRO_PUSH.scale, push), x: INTRO_PUSH.x * push, y: INTRO_PUSH.y * push, rotate: 0 },
        layout.width,
        layout.height,
      )
    : IDENTITY_CAMERA;

  const before = imageAsset(assets.media, 'before')?.src ?? BEFORE_PLACEHOLDER;
  const after = imageAsset(assets.media, 'after')?.src ?? AFTER_PLACEHOLDER;

  const card =
    frame < t.expand.from
      ? progress(frame, t.shrink.from, t.shrink.duration, SHRINK_EASE)
      : 1 - progress(frame, t.expand.from, t.expand.duration, EXPAND_EASE);

  // The card floats: it keeps drifting while it holds, and swings to the other side as the
  // after photo slides in, about half as far (as in the reference). Positive = the right edge
  // recedes (the before card).
  const tilt = -TILT_DEG[params.tilt];
  const revealEnd = t.reveal.from + t.reveal.duration;
  const drift = (from: number, to: number) => progress(frame, from, Math.max(1, to - from), ease.inOutSine);
  const rotateY =
    frame < t.reveal.from
      ? mix(-0.92, -1.05, drift(t.shrink.from, t.reveal.from)) * tilt * card
      : frame < revealEnd
        ? mix(-1.05, 0.45, progress(frame, t.reveal.from, t.reveal.duration, ease.inOutCubic)) * tilt
        : mix(0.45, 0.55, drift(revealEnd, t.expand.from)) * tilt * card;

  // End flash (softened): crossfade to before, hold, crossfade back with a settle zoom.
  const fade = Math.round(CROSSFADE_SEC * fps);
  const flashBefore = t.flash
    ? progress(frame, t.flash.before.from, fade, ease.inOutSine) *
      (1 - progress(frame, t.flash.after.from, fade, ease.inOutSine))
    : 0;
  const settle = t.flash
    ? mix(SETTLE_ZOOM, 1, progress(frame, t.flash.after.from, t.flash.after.duration, SETTLE_EASE))
    : 1;

  const reveal = effect.render({
    progress: progress(frame, t.reveal.from, t.reveal.duration),
    layout,
    accent: style.colors.accent,
    beforeLabel: null,
    afterLabel: null,
    seed: props.seed,
  });

  // Labels: centered under the card at rest.
  const scale = CARD_SCALE[layout.orientation];
  const labelX = layout.width / 2;
  const labelY = (layout.height * (1 + scale)) / 2 + LABEL_GAP * layout.height;
  const labelFont = fontFamily(style.fonts.heading);
  const beforeShown =
    frame < t.labelSwap
      ? progress(
          frame,
          t.shrink.from + Math.round(LABEL_SEC.beforeIn * fps),
          Math.round(LABEL_SEC.beforeFade * fps),
          ease.outCubic,
        )
      : 0;
  const typed = (frame - t.labelSwap) / (LABEL_SEC.perChar * fps);
  const afterShown =
    frame >= t.labelSwap
      ? 1 -
        progress(
          frame,
          t.expand.from + Math.round(LABEL_SEC.afterOut * fps),
          Math.round(LABEL_SEC.afterFade * fps),
          ease.inCubic,
        )
      : 0;
  const labelStyle: React.CSSProperties = {
    fontFamily: labelFont,
    fontWeight: 800,
    fontSize: 32 * layout.unit,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    color: style.colors.text,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background }}>
      <PhotoCard
        progress={card}
        scale={scale}
        rotateY={rotateY}
        radius={Math.min(style.radius, 40) * layout.unit}
        shadow={SHADOW}
        frameWidth={layout.width}
        contentScale={settle}
      >
        <SceneRenderer
          nodes={reveal}
          renderBefore={() => <PhotoPlane src={before} camera={camera} />}
          renderAfter={() => <PhotoPlane src={after} camera={camera} />}
          layout={layout}
          labelFont={labelFont}
          accent={style.colors.accent}
          textColor={style.colors.text}
          radius={style.radius}
        />
        {flashBefore > 0 ? (
          <PhotoPlane src={before} camera={camera} style={{ opacity: flashBefore }} />
        ) : null}
      </PhotoCard>
      {texts.beforeLabel.enabled && beforeShown > 0 ? (
        <div
          style={{
            ...placeAt(labelX, labelY + (1 - beforeShown) * 14 * layout.unit, {
              transform: 'translateX(-50%)',
            }),
            ...labelStyle,
            opacity: beforeShown,
          }}
        >
          {texts.beforeLabel.value}
        </div>
      ) : null}
      {texts.afterLabel.enabled && afterShown > 0 ? (
        <div
          style={{
            ...placeAt(labelX, labelY, { transform: 'translateX(-50%)' }),
            ...labelStyle,
            opacity: clamp01(afterShown),
          }}
        >
          <TypeOn text={texts.afterLabel.value} typed={typed} />
        </div>
      ) : null}
      <Vignette strength={style.vignette} />
      <Grain strength={style.grain} seed={props.seed} />
      <MusicLayer track={assets.music} settings={props.music} />
    </AbsoluteFill>
  );
};
