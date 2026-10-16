import type { TextField } from '@vgen/shared';
import type React from 'react';
import { useMemo } from 'react';
import { mixHex } from '../color.js';
import type { Layout } from '../layout.js';
import { cubicBezier, ease, mix, progress } from '../motion.js';
import { ACCENT_MIN_CHROMA, darkestColor, paletteWedges } from '../palette/extract.js';
import { usePhotoPalette } from '../palette/usePhotoPalette.js';
import { burstParticles } from '../particles/burst.js';
import { PaletteWheel } from '../primitives/PaletteWheel.js';
import { ParticleBurst } from '../primitives/ParticleBurst.js';
import { PhotoPlane } from '../primitives/PhotoPlane.js';
import { Ripple } from '../primitives/Ripple.js';
import type { PaletteGradeOptions } from './fields.js';
import { GradeLabel } from './GradeLabel.js';
import { CAMERA, type GradeTimeline } from './timeline.js';

/** Fitted to the reference's measured camera scale (references/3). */
const PUSH_EASE = cubicBezier(0.4, 0.2, 0.25, 1);
const PULL_EASE = cubicBezier(1, 0.05, 0.4, 1);
/** Fitted to the saturation of the reference while the colour comes back. */
const COLOR_EASE = cubicBezier(0.45, 0.05, 0.1, 1);
/** Fitted to the pie radius: it collapses a little ahead of the camera. */
const COLLAPSE_EASE = cubicBezier(0.9, 0.05, 0.25, 1);
/** Sizes relative to the frame's short side (reference: 720 px wide). */
const WHEEL_RADIUS = 0.27;
const DOT_DIAMETER = 0.058;
const PARTICLE_DIAMETER = 0.035;
/**
 * The first (darkest) wedge starts at 10:30, as in the reference, while the wedges pop in from
 * 12 o'clock: the dark colour wraps around the top.
 */
const WHEEL_START = -45;
/** The pie turns this far (degrees, clockwise) while collapsing. */
const COLLAPSE_TURN = 30;
/** Wedges enter as a light translucent tint and settle into their colour. */
const WEDGE_ENTER = { fill: '#ffffff', opacity: 0.4 } as const;
/** Ghost copies and their lag for each trail length (`normal` = the reference). */
const TRAILS = {
  off: { trail: 0, span: 0 },
  short: { trail: 5, span: 0.06 },
  normal: { trail: 10, span: 0.12 },
  long: { trail: 16, span: 0.24 },
} as const;
/** Drift after landing, fraction of the short side. */
const DRIFT_AMPLITUDE = 0.02;
/** Ripples: radius from/to (particle diameters) and length, seconds. */
const RIPPLE = { from: 0.5, to: 4, sec: 0.7 } as const;
/** "From the dots": colour spreads with a soft edge (fraction of the short side), a bit slower. */
const SPREAD = { feather: 0.35, stretch: 1.6 } as const;
/** The spreading front moves at an even pace (the even return's curve is front-loaded). */
const SPREAD_EASE = cubicBezier(0.3, 0, 0.4, 1);

/** How many particles land (the rest scatter): 1 for small bursts, up to 3. */
const landingCount = (count: number): number => (count <= 6 ? 1 : count <= 14 ? 2 : 3);

export interface PaletteGradeSceneProps {
  /** Frame local to the process's timeline. */
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly timeline: GradeTimeline;
  /** Photo sources (already adjusted). */
  readonly before: string;
  readonly after: string;
  readonly params: PaletteGradeOptions;
  readonly texts: { readonly beforeLabel: TextField; readonly afterLabel: TextField };
  readonly fontFamily: string;
  readonly textColor: string;
  /** The template's seed (the variation option is applied on top). */
  readonly seed: number;
  readonly fontsLoaded: boolean;
}

/**
 * The palette grade process (references/3) over the full frame: a pie of the after photo's
 * palette, black and white, the pie collapsing into a dot that bursts into colour particles,
 * the grade's tones, then colour while BEFORE turns into AFTER. Renders its layers only:
 * the caller provides the (black) container and any overlays.
 */
export const PaletteGradeScene: React.FC<PaletteGradeSceneProps> = ({
  frame,
  fps,
  layout,
  timeline: t,
  before,
  after,
  params,
  texts,
  fontFamily,
  textColor,
  seed: baseSeed,
  fontsLoaded,
}) => {
  // Variation 1 keeps the template's own seed: the default look never changes.
  const seed = baseSeed + (params.variation - 1) * 7919;
  const palette = usePhotoPalette(after);
  const wedges = useMemo(() => paletteWedges(palette), [palette]);
  const dotColor = darkestColor(palette);

  const short = Math.min(layout.width, layout.height);
  const centerX = layout.width / 2;
  const centerY = layout.height / 2;

  const particles = useMemo(() => {
    const land = landingCount(params.particleCount);
    const darks = [...new Set(wedges.filter((wedge) => !wedge.accent).map((wedge) => wedge.color))];
    return burstParticles({
      seed,
      scatter: params.particleCount - land,
      land,
      scatterColors: darks.length > 0 ? darks : [dotColor],
      landColor: palette.accent.chroma >= ACCENT_MIN_CHROMA ? palette.accent.hex : dotColor,
      reach: short,
      size: PARTICLE_DIAMETER * short * params.particleSize,
      spread: params.particleSpread,
    });
  }, [
    params.particleCount,
    params.particleSize,
    params.particleSpread,
    wedges,
    dotColor,
    palette.accent,
    seed,
    short,
  ]);
  const landings = particles
    .filter((particle) => particle.kind === 'land')
    .map((particle) => ({ x: centerX + particle.dx, y: centerY + particle.dy, particle }));

  // Camera: a push-in while the palette builds, a pull-back as it collapses, then a slow push.
  const push = params.cameraMotion
    ? progress(frame, t.pushIn.from, t.pushIn.duration, PUSH_EASE) *
      (1 - progress(frame, t.pullBack.from, t.pullBack.duration, PULL_EASE))
    : 0;
  const slow = params.cameraMotion
    ? Math.min(CAMERA.slowPushMax - 1, (Math.max(0, frame - t.slowPushAt) / fps) * CAMERA.slowPushPerSec)
    : 0;
  const camera = { scale: 1 + (CAMERA.pushIn - 1) * push + slow, x: 0, y: 0, rotate: 0 };

  // The colour comes back evenly, or spreads out from where the accent dots landed.
  const spread = params.colorReturn === 'spread' && landings.length > 0;
  const colorFrom = params.monochrome ? t.color.from : t.darken.from;
  const colorFrames = params.monochrome ? t.color.duration : t.color.from + t.color.duration - t.darken.from;
  const colorIn = spread
    ? progress(frame, colorFrom, Math.round(colorFrames * SPREAD.stretch), SPREAD_EASE)
    : progress(frame, colorFrom, colorFrames, params.monochrome ? COLOR_EASE : ease.inOutSine);
  const feather = SPREAD.feather * short;
  const spreadMask = spread
    ? landings
        .map(({ x, y }) => {
          const far = Math.max(
            Math.hypot(x, y),
            Math.hypot(layout.width - x, y),
            Math.hypot(x, layout.height - y),
            Math.hypot(layout.width - x, layout.height - y),
          );
          const radius = colorIn * (far + feather);
          return `radial-gradient(circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 ${Math.max(0, radius - feather).toFixed(1)}px, transparent ${radius.toFixed(1)}px)`;
        })
        .join(', ')
    : null;

  // Photo stages: before -> before in B&W -> after in B&W (the grade's tones) -> after.
  const colorStage = {
    src: after,
    mono: false,
    opacity: spread ? (colorIn > 0 ? 1 : 0) : colorIn,
    mask: spread && colorIn < 1 ? spreadMask : null,
  };
  const stages: { src: string; mono: boolean; opacity: number; mask: string | null }[] = params.monochrome
    ? [
        { src: before, mono: false, opacity: 1, mask: null },
        {
          src: before,
          mono: true,
          opacity: progress(frame, t.desaturate.from, t.desaturate.duration, ease.outCubic),
          mask: null,
        },
        {
          src: after,
          mono: true,
          opacity: progress(frame, t.darken.from, t.darken.duration, ease.inOutSine),
          mask: null,
        },
        colorStage,
      ]
    : [{ src: before, mono: false, opacity: 1, mask: null }, colorStage];
  // Layers under a fully opaque (unmasked) one are never seen.
  const topOpaque = stages.reduce(
    (top, stage, index) => (stage.opacity >= 1 && !stage.mask ? index : top),
    0,
  );

  // Palette pie: wedges pop in clockwise, settle into their colours, then collapse into a dot.
  const collapse = progress(frame, t.collapse.from, t.collapse.duration, COLLAPSE_EASE);
  const solid = progress(
    frame,
    t.collapse.from + Math.round(t.collapse.duration / 2),
    t.solidAt - t.collapse.from - Math.round(t.collapse.duration / 2),
  );
  const firstAtNoon = Math.round(-WHEEL_START / (360 / Math.max(1, wedges.length)));
  const wheel = wedges.map((wedge, index) => {
    const appear = t.wedgeAt((index - firstAtNoon + wedges.length) % wedges.length);
    if (frame < appear) return { fill: wedge.color, opacity: 0 };
    const settle = progress(frame, appear, t.wedgeMorph, ease.outCubic);
    return {
      fill: mixHex(mixHex(WEDGE_ENTER.fill, wedge.color, settle), dotColor, solid),
      opacity: mix(WEDGE_ENTER.opacity, 1, settle),
    };
  });
  const showWheel = frame < t.burst.from;

  // Burst: the dot flies apart; the far particles fade with the darkening, the landed ones
  // dissolve as the colour comes back.
  const burst = (frame - t.burst.from) / t.burst.duration;
  const scatterAlpha = 1 - progress(frame, t.scatterFade.from, t.scatterFade.duration);
  const landAlpha = 1 - progress(frame, t.landFade.from, t.landFade.duration);
  const trail = TRAILS[params.particleTrail];
  const landedAt = t.burst.from + t.burst.duration - 1;
  const ripple = (frame - landedAt) / Math.round(RIPPLE.sec * fps);

  return (
    <>
      {stages.map((stage, index) =>
        index >= topOpaque && stage.opacity > 0 ? (
          <PhotoPlane
            // Stages are positional.
            key={index}
            src={stage.src}
            camera={camera}
            style={{
              opacity: stage.opacity,
              ...(stage.mask ? { maskImage: stage.mask, WebkitMaskImage: stage.mask } : {}),
            }}
            imageStyle={stage.mono ? { filter: 'grayscale(1)' } : undefined}
          />
        ) : null,
      )}
      {showWheel ? (
        <PaletteWheel
          wedges={wheel}
          x={centerX}
          y={centerY}
          radius={WHEEL_RADIUS * short}
          scale={mix(1, DOT_DIAMETER / (2 * WHEEL_RADIUS), collapse)}
          rotate={COLLAPSE_TURN * collapse}
          startAngle={WHEEL_START}
        />
      ) : null}
      {params.ripples
        ? landings.map(({ x, y, particle }, index) => (
            <Ripple
              key={index}
              x={x}
              y={y}
              progress={ripple}
              from={particle.size * RIPPLE.from}
              to={particle.size * RIPPLE.to}
              color={particle.color}
              strokeWidth={Math.max(1.5 * layout.unit, particle.size * 0.1)}
              rotate={-90 + index * 137}
            />
          ))
        : null}
      {burst > 0 && (scatterAlpha > 0 || landAlpha > 0) ? (
        <ParticleBurst
          particles={particles}
          x={centerX}
          y={centerY}
          progress={burst}
          trail={trail.trail}
          trailSpan={trail.span}
          shape={params.particleShape}
          drift={
            params.particleDrift ? { amplitude: DRIFT_AMPLITUDE * short, time: frame / fps, seed } : null
          }
          opacity={(particle) => (particle.kind === 'land' ? landAlpha : scatterAlpha)}
        />
      ) : null}
      <GradeLabel
        frame={frame}
        fps={fps}
        layout={layout}
        swap={t.label}
        texts={texts}
        params={params}
        fontFamily={fontFamily}
        textColor={textColor}
        seed={seed}
        fontsLoaded={fontsLoaded}
      />
    </>
  );
};
