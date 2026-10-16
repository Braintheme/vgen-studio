import type React from 'react';
import { useMemo } from 'react';
import type { Layout } from '../../core/layout.js';
import { clamp01, cubicBezier, ease, progress } from '../../core/motion.js';
import { ACCENT_MIN_CHROMA, type PhotoPalette } from '../../core/palette/extract.js';
import { usePhotoPalette } from '../../core/palette/usePhotoPalette.js';
import { burstParticles, type ParticleShape } from '../../core/particles/burst.js';
import { ParticleBurst } from '../../core/primitives/ParticleBurst.js';
import { placeAt } from '../../core/placement.js';
import { TIMING } from './timeline.js';

/** Sizes relative to the frame's short side. */
const DOT = 0.05;
const DOT_GAP = 0.022;
const BURST_DOT = 0.03;
/** How far the burst flies (short side units, before the template's spread). */
const BURST_REACH = 0.55;
const BURST_COUNT = 14;
/** Dots sit this far above the label's centre (share of the short side). */
const DOTS_ABOVE = 0.15;
const POP_EASE = cubicBezier(0.34, 1.56, 0.64, 1);

/** The photo's colours for a row of dots: main colours, then the accent when it is vivid. */
export const paletteDots = (palette: PhotoPalette, max = 5): string[] => {
  const colors = palette.main.map((swatch) => swatch.hex);
  if (palette.accent.chroma >= ACCENT_MIN_CHROMA) colors.push(palette.accent.hex);
  return [...new Set(colors)].slice(-max);
};

export interface PaletteFxProps {
  readonly mode: 'dots' | 'burst';
  /** The incoming look (its colours are shown). */
  readonly src: string;
  readonly frame: number;
  readonly fps: number;
  /** When the change starts and when the next one does (the dots leave before it). */
  readonly from: number;
  readonly until: number;
  readonly layout: Layout;
  /** Label centre: the burst starts there, the dots sit above it. */
  readonly x: number;
  readonly y: number;
  readonly shape: ParticleShape;
  readonly size: number;
  readonly seed: number;
}

/**
 * The colours of the look coming in (palette-grade's palette), on each change: a row of dots
 * popping in one by one above the label, or a burst of dots flying out from it.
 */
export const PaletteFx: React.FC<PaletteFxProps> = (props) => {
  const palette = usePhotoPalette(props.src);
  const colors = useMemo(() => paletteDots(palette), [palette]);
  const short = Math.min(props.layout.width, props.layout.height);
  return props.mode === 'dots' ? (
    <PaletteDots {...props} colors={colors} short={short} />
  ) : (
    <PaletteBurst {...props} colors={colors} short={short} />
  );
};

type Inner = PaletteFxProps & { readonly colors: readonly string[]; readonly short: number };

const PaletteDots: React.FC<Inner> = ({ frame, fps, from, until, x, y, shape, size, colors, short }) => {
  const frames = (sec: number) => Math.max(1, Math.round(sec * fps));
  const diameter = DOT * short * size;
  const step = diameter + DOT_GAP * short * size;
  const left = x - ((colors.length - 1) * step) / 2;
  const out = progress(frame, until - frames(TIMING.dotOut), frames(TIMING.dotOut), ease.inCubic);
  return (
    <>
      {colors.map((color, index) => {
        const t = progress(frame, from + index * frames(TIMING.dotStagger), frames(TIMING.dotIn));
        const scale = POP_EASE(t) * (1 - out);
        if (scale <= 0.001) return null;
        return (
          <div
            key={index}
            style={{
              ...placeAt(left + index * step - diameter / 2, y - DOTS_ABOVE * short - diameter / 2, {
                transform: `scale(${scale.toFixed(4)})`,
              }),
              // Scaling layer: no `will-change` (it would freeze the raster scale).
              willChange: 'auto',
              width: diameter,
              height: diameter,
              opacity: clamp01(t * 3),
              borderRadius: shape === 'square' ? '18%' : '50%',
              boxSizing: 'border-box',
              boxShadow: `0 ${(0.08 * diameter).toFixed(1)}px ${(0.35 * diameter).toFixed(1)}px rgba(0,0,0,0.35)`,
              ...(shape === 'ring'
                ? { border: `${(diameter * 0.22).toFixed(2)}px solid ${color}` }
                : shape === 'star'
                  ? {
                      background: color,
                      clipPath:
                        'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                      boxShadow: 'none',
                    }
                  : { background: color, border: '2px solid rgba(255,255,255,0.85)' }),
            }}
          />
        );
      })}
    </>
  );
};

const PaletteBurst: React.FC<Inner> = ({ frame, fps, from, x, y, shape, size, colors, short, seed }) => {
  const particles = useMemo(
    () =>
      burstParticles({
        seed,
        scatter: BURST_COUNT,
        land: 0,
        scatterColors: colors,
        landColor: colors[0] ?? '#ffffff',
        reach: BURST_REACH * short,
        size: BURST_DOT * short * size,
      }),
    [seed, colors, short, size],
  );
  const flight = (frame - from) / Math.max(1, Math.round(TIMING.burst * fps));
  if (flight <= 0 || flight >= 1.4) return null;
  // Fades over the second half of the flight.
  const alpha = 1 - clamp01((flight - 0.5) / 0.7);
  return (
    <ParticleBurst
      particles={particles}
      x={x}
      y={y}
      progress={flight}
      trail={5}
      trailSpan={0.06}
      shape={shape}
      opacity={() => alpha}
    />
  );
};
