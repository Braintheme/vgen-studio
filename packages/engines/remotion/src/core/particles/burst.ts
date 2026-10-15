// Pure, seeded layout of a particle burst (no React): where every particle flies.
import { clamp01, type EasingFn } from '../motion.js';
import { seeded, seededRange } from '../random.js';

export type BurstKind = 'scatter' | 'land';

export const PARTICLE_SHAPES = ['circle', 'square', 'ring', 'star'] as const;
export type ParticleShape = (typeof PARTICLE_SHAPES)[number];

export interface BurstParticle {
  readonly kind: BurstKind;
  /** Landing offset from the burst origin, px. */
  readonly dx: number;
  readonly dy: number;
  readonly color: string;
  /** Diameter, px. */
  readonly size: number;
  /** Start delay as a share of the burst (0..1). */
  readonly delay: number;
  /** Flight length relative to the burst's (far particles keep drifting for longer). */
  readonly pace: number;
}

export interface BurstInput {
  readonly seed: number;
  /** Particles flying far out (some leave the frame). */
  readonly scatter: number;
  /** Particles landing close to the origin and staying for a while. */
  readonly land: number;
  /** Colours cycled through by the scatter particles. */
  readonly scatterColors: readonly string[];
  readonly landColor: string;
  /** Distance unit, px (e.g. the frame's short side). */
  readonly reach: number;
  readonly size: number;
  /** How far the scatter flies, relative to the default (the landing stays close). */
  readonly spread?: number;
}

/** Scatter distance range and landing distance range, in `reach` units. */
const SCATTER_REACH = [0.35, 0.95] as const;
const LAND_REACH = [0.12, 0.38] as const;
const MAX_DELAY = 0.08;
/** The scatter keeps drifting after the landing particles have settled (reference: f86-104+). */
const SCATTER_PACE = 1.4;

export const burstParticles = (input: BurstInput): BurstParticle[] => {
  const { seed, reach, size } = input;
  const key = (kind: string, index: number, what: string): string => `burst:${kind}:${index}:${what}`;
  const ring = seeded(seed, 'burst:ring') * 360;
  const scatterStep = 360 / Math.max(1, input.scatter);
  const scatter = Array.from({ length: input.scatter }, (_, index): BurstParticle => {
    // Evenly around the circle with jitter, so the burst reads as radial, never clumped.
    const angle =
      ring + (index + 0.5) * scatterStep + seededRange(seed, key('s', index, 'a'), -0.3, 0.3) * scatterStep;
    const distance =
      reach *
      (input.spread ?? 1) *
      seededRange(seed, key('s', index, 'd'), SCATTER_REACH[0], SCATTER_REACH[1]);
    const radians = (angle * Math.PI) / 180;
    return {
      kind: 'scatter',
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      color: input.scatterColors[index % Math.max(1, input.scatterColors.length)] ?? '#000000',
      size: size * seededRange(seed, key('s', index, 'z'), 0.85, 1.1),
      delay: seededRange(seed, key('s', index, 't'), 0, MAX_DELAY),
      pace: SCATTER_PACE,
    };
  });
  const landStart = seeded(seed, 'burst:land') * 360;
  const landStep = 360 / Math.max(1, input.land);
  const land = Array.from({ length: input.land }, (_, index): BurstParticle => {
    const angle =
      landStart + index * landStep + seededRange(seed, key('l', index, 'a'), -0.2, 0.2) * landStep;
    const distance = reach * seededRange(seed, key('l', index, 'd'), LAND_REACH[0], LAND_REACH[1]);
    const radians = (angle * Math.PI) / 180;
    return {
      kind: 'land',
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      color: input.landColor,
      size: size * 1.1,
      delay: seededRange(seed, key('l', index, 't'), 0, MAX_DELAY),
      pace: 1,
    };
  });
  return [...scatter, ...land];
};

/** Eased flight progress of one particle at the burst's linear progress `t`. */
export const particleFlight = (particle: BurstParticle, t: number, easing: EasingFn): number =>
  easing(clamp01((t - particle.delay) / (particle.pace - particle.delay)));
