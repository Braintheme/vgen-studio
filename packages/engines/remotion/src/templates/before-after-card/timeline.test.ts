import { describe, expect, it } from 'vitest';
import { REVEAL_EFFECTS } from '../../core/reveals/registry.js';
import { cardTimeline, LABEL_SEC } from './timeline.js';

/** The reference reveal: a slide-over (f114-145; labels swap at f132). */
const REFERENCE_REVEAL = REVEAL_EFFECTS.get('slide-over');

describe('before/after card timeline', () => {
  it('matches the reference cut at its own length, 8.9 s (±2 frames)', () => {
    const t = cardTimeline({
      durationSec: 8.9,
      fps: 30,
      endFlash: true,
      revealSec: REFERENCE_REVEAL.durationSec,
      revealedAt: REFERENCE_REVEAL.revealedAt,
    });
    // Reference frames: breakdown.md and the easing fit on its motion curve.
    const pairs: [number, number][] = [
      [t.shrink.from, 53],
      [t.shrink.from + t.shrink.duration, 109],
      [t.reveal.from, 114],
      [t.labelSwap, 132],
      [t.expand.from, 165],
      [t.expand.from + t.expand.duration, 217],
      [t.flash?.before.from ?? -1, 237],
      [t.flash?.after.from ?? -1, 254],
    ];
    for (const [actual, reference] of pairs) expect(Math.abs(actual - reference)).toBeLessThanOrEqual(2);
  });

  it.each([8, 9, 10, 12, 15])(
    'keeps every phase in order at %i s, for every reveal effect, with and without the end flash',
    (durationSec) => {
      for (const { durationSec: revealSec, revealedAt } of REVEAL_EFFECTS.items)
        for (const endFlash of [true, false]) {
          for (const fps of [30, 60]) {
            const t = cardTimeline({ durationSec, fps, endFlash, revealSec, revealedAt });
            const typedEnd = t.labelSwap + Math.ceil('AFTER'.length * LABEL_SEC.perChar * fps);
            expect(t.shrink.from).toBeGreaterThan(0);
            expect(t.reveal.from).toBeGreaterThan(t.shrink.from + t.shrink.duration);
            expect(typedEnd).toBeLessThanOrEqual(t.expand.from);
            const end = t.flash
              ? t.flash.after.from + t.flash.after.duration
              : t.expand.from + t.expand.duration;
            expect(end).toBeLessThanOrEqual(t.totalFrames);
            // Without the flash the last full-bleed after still holds for a while.
            if (!t.flash) expect(t.totalFrames - end).toBeGreaterThanOrEqual(fps / 2);
          }
        }
    },
  );
});
