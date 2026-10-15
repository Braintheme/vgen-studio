import { noise2D } from '@remotion/noise';
import { makeStar } from '@remotion/shapes';
import type React from 'react';
import { ease, type EasingFn } from '../motion.js';
import { particleFlight, type BurstParticle, type ParticleShape } from '../particles/burst.js';
import { placeAt } from '../placement.js';

export interface ParticleDrift {
  /** Largest offset, px. */
  readonly amplitude: number;
  /** Seconds since the start (drives the noise). */
  readonly time: number;
  readonly seed: number;
}

export interface ParticleBurstProps {
  readonly particles: readonly BurstParticle[];
  /** Burst origin, px. */
  readonly x: number;
  readonly y: number;
  /** Linear 0..1 progress of the flight (may run past 1: particles rest at their targets). */
  readonly progress: number;
  readonly easing?: EasingFn;
  /** Ghost copies behind each particle (sampled motion blur); 0 = no trail. */
  readonly trail?: number;
  /** How far back in progress the last ghost lags. */
  readonly trailSpan?: number;
  /** Per-particle opacity (fades after landing). */
  readonly opacity?: (particle: BurstParticle) => number;
  readonly shape?: ParticleShape;
  /** Slow organic wander (seeded simplex noise); grows in as each particle lands. */
  readonly drift?: ParticleDrift | null;
}

/** Ghosts closer than this share of the particle size to the head are not drawn. */
const MIN_GHOST_GAP = 0.2;
/** Noise speed of the drift (cycles per second, roughly). */
const DRIFT_SPEED = 0.35;

const Dot: React.FC<{ readonly shape: ParticleShape; readonly size: number; readonly color: string }> = ({
  shape,
  size,
  color,
}) => {
  if (shape === 'star') {
    const star = makeStar({
      points: 5,
      innerRadius: size * 0.24,
      outerRadius: size * 0.55,
      cornerRadius: size * 0.04,
    });
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${star.width} ${star.height}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path d={star.path} fill={color} />
      </svg>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'square' ? '18%' : '50%',
        ...(shape === 'ring'
          ? { border: `${(size * 0.22).toFixed(2)}px solid ${color}`, boxSizing: 'border-box' }
          : { background: color }),
      }}
    />
  );
};

/**
 * Dots bursting out of one point with dotted motion trails, like After Effects' sampled
 * motion blur. Every dot moves by translation only (`placeAt`).
 */
export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  particles,
  x,
  y,
  progress,
  easing = ease.outCubic,
  trail = 6,
  trailSpan = 0.14,
  opacity = () => 1,
  shape = 'circle',
  drift = null,
}) => {
  if (progress <= 0) {
    return null;
  }
  const dots: React.ReactNode[] = [];
  particles.forEach((particle, index) => {
    const alpha = opacity(particle);
    if (alpha <= 0) return;
    // The wander fades in with the landing, so the flight itself stays a clean line.
    const wander = drift ? drift.amplitude * particleFlight(particle, progress, easing) : 0;
    const offset = drift
      ? {
          x: noise2D(drift.seed, index * 3.7, drift.time * DRIFT_SPEED) * wander,
          y: noise2D(drift.seed, index * 3.7 + 100, drift.time * DRIFT_SPEED) * wander,
        }
      : { x: 0, y: 0 };
    const at = (t: number) => {
      const flight = particleFlight(particle, t, easing);
      return { x: x + particle.dx * flight + offset.x, y: y + particle.dy * flight + offset.y };
    };
    const head = at(progress);
    for (let ghost = trail; ghost >= 0; ghost -= 1) {
      const position = ghost === 0 ? head : at(progress - (ghost / trail) * trailSpan);
      if (ghost > 0 && Math.hypot(position.x - head.x, position.y - head.y) < particle.size * MIN_GHOST_GAP) {
        continue;
      }
      const ghostAlpha = ghost === 0 ? 1 : (1 - ghost / (trail + 1)) * 0.5;
      dots.push(
        <div
          key={`${String(index)}-${String(ghost)}`}
          style={{
            ...placeAt(position.x - particle.size / 2, position.y - particle.size / 2),
            opacity: alpha * ghostAlpha,
          }}
        >
          <Dot shape={shape} size={particle.size} color={particle.color} />
        </div>,
      );
    }
  });
  return <>{dots}</>;
};
