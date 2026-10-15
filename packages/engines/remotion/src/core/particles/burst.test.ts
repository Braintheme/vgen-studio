import { describe, expect, it } from 'vitest';
import { ease } from '../motion.js';
import { burstParticles, particleFlight } from './burst.js';

const input = {
  seed: 7,
  scatter: 8,
  land: 2,
  scatterColors: ['#111111', '#555555'],
  landColor: '#aa2211',
  reach: 1000,
  size: 35,
};

describe('burstParticles', () => {
  it('is seeded: same seed, same burst; another seed, another burst', () => {
    expect(burstParticles(input)).toEqual(burstParticles(input));
    expect(burstParticles({ ...input, seed: 8 })).not.toEqual(burstParticles(input));
  });

  it('scatters far, lands near, and keeps the colours', () => {
    const particles = burstParticles(input);
    const far = particles.filter((particle) => particle.kind === 'scatter');
    const near = particles.filter((particle) => particle.kind === 'land');
    expect(far).toHaveLength(8);
    expect(near).toHaveLength(2);
    for (const particle of far) expect(Math.hypot(particle.dx, particle.dy)).toBeGreaterThanOrEqual(350);
    for (const particle of near) {
      expect(Math.hypot(particle.dx, particle.dy)).toBeLessThanOrEqual(380);
      expect(particle.color).toBe('#aa2211');
    }
    expect(new Set(far.map((particle) => particle.color))).toEqual(new Set(['#111111', '#555555']));
  });

  it('spreads the scatter all around the origin', () => {
    const angles = burstParticles(input)
      .filter((particle) => particle.kind === 'scatter')
      .map((particle) => (Math.atan2(particle.dy, particle.dx) * 180) / Math.PI + 180)
      .sort((a, b) => a - b);
    const gaps = angles.map(
      (angle, index) => ((angles[(index + 1) % angles.length] ?? 0) - angle + 360) % 360,
    );
    expect(Math.max(...gaps)).toBeLessThan(100);
  });

  it('flies from 0 to 1 and rests at the target; the scatter drifts for longer', () => {
    for (const particle of burstParticles(input)) {
      expect(particleFlight(particle, 0, ease.outCubic)).toBe(0);
      expect(particleFlight(particle, particle.pace, ease.outCubic)).toBe(1);
      expect(particleFlight(particle, 3, ease.outCubic)).toBe(1);
      if (particle.kind === 'land') expect(particleFlight(particle, 1, ease.outCubic)).toBe(1);
      else expect(particleFlight(particle, 1, ease.outCubic)).toBeLessThan(1);
    }
  });
});
