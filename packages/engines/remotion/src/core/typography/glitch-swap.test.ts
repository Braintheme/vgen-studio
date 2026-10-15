import { describe, expect, it } from 'vitest';
import { FLICKER_OPACITY, GLITCH_PHASES, glitchSwapState } from './glitch-swap.js';

describe('glitchSwapState', () => {
  it('starts with the old word and ends with the new one', () => {
    expect(glitchSwapState('BEFORE', 'AFTER', 0, 1)).toEqual({
      layout: 'from',
      from: [1, 1, 1, 1, 1, 1],
      to: [0, 0, 0, 0, 0],
      garble: false,
    });
    expect(glitchSwapState('BEFORE', 'AFTER', 1, 1)).toEqual({
      layout: 'to',
      from: [0, 0, 0, 0, 0, 0],
      to: [1, 1, 1, 1, 1],
      garble: false,
    });
  });

  it('drops the old letters one by one, flickering first, and never brings them back', () => {
    let previous = 6;
    for (let step = 1; step <= 40; step += 1) {
      const state = glitchSwapState('BEFORE', 'AFTER', step / 100, 3);
      const shown = state.from.filter((opacity) => opacity > 0).length;
      expect(shown).toBeLessThanOrEqual(previous);
      expect(state.from.every((opacity) => [0, FLICKER_OPACITY, 1].includes(opacity))).toBe(true);
      previous = shown;
    }
    expect(previous).toBe(0);
  });

  it('garbles between the words and snaps the box once', () => {
    expect(glitchSwapState('BEFORE', 'AFTER', GLITCH_PHASES.snap - 0.01, 3).layout).toBe('from');
    expect(glitchSwapState('BEFORE', 'AFTER', GLITCH_PHASES.snap, 3).layout).toBe('to');
    expect(glitchSwapState('BEFORE', 'AFTER', 0.45, 3).garble).toBe(true);
    expect(glitchSwapState('BEFORE', 'AFTER', 0.55, 3).garble).toBe(false);
  });

  it('brings the new letters in a seeded order', () => {
    const order = (seed: number) =>
      Array.from({ length: 50 }, (_, step) => glitchSwapState('BEFORE', 'AFTER', 0.5 + step / 100, seed).to)
        .map((opacities) => opacities.map((opacity) => (opacity === 1 ? 1 : 0)).join(''))
        .filter((value, index, all) => all.indexOf(value) === index);
    expect(order(3)).toEqual(order(3));
    // One letter at a time, the last one still flickering just before the end.
    expect(order(3).map((state) => state.replaceAll('0', '').length)).toEqual([0, 1, 2, 3, 4]);
  });
});
