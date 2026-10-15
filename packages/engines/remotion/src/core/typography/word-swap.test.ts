import { describe, expect, it } from 'vitest';
import { decodeState, fadeState, rollState, SWAP_SNAP, typewriterState } from './word-swap.js';

describe('word swaps', () => {
  it('decode: scrambles the old word, then locks the new one letter by letter', () => {
    expect(
      decodeState('BEFORE', 'AFTER', 0, 1)
        .letters.map((letter) => letter.glyph)
        .join(''),
    ).toBe('BEFORE');
    const mid = decodeState('BEFORE', 'AFTER', 0.4, 1);
    expect(mid.layout).toBe('from');
    expect(mid.letters.some((letter) => letter.scrambling)).toBe(true);
    expect(decodeState('BEFORE', 'AFTER', SWAP_SNAP, 1).layout).toBe('to');
    const done = decodeState('BEFORE', 'AFTER', 1, 1);
    expect(done.letters.map((letter) => letter.glyph).join('')).toBe('AFTER');
    expect(done.letters.every((letter) => !letter.scrambling)).toBe(true);
    // Deterministic for a seed, varied across seeds.
    expect(decodeState('BEFORE', 'AFTER', 0.7, 1)).toEqual(decodeState('BEFORE', 'AFTER', 0.7, 1));
  });

  it('roll: old letters leave, new ones flip through a few glyphs and settle', () => {
    const start = rollState('BEFORE', 'AFTER', 0, 1);
    expect(start.letters.every((letter) => letter.offset === 0 && letter.opacity === 1)).toBe(true);
    const out = rollState('BEFORE', 'AFTER', 0.45, 1);
    expect(out.letters.every((letter) => letter.opacity === 0)).toBe(true);
    const end = rollState('BEFORE', 'AFTER', 1, 1);
    for (const letter of end.letters) {
      expect(letter.column.at(-1)).toBe('AFTER'[end.letters.indexOf(letter)]);
      expect(letter.offset).toBeCloseTo(letter.column.length - 1, 5);
    }
  });

  it('typewriter: erases, pauses on the cursor, types', () => {
    expect(typewriterState('BEFORE', 'AFTER', 0)).toEqual({ layout: 'from', visible: 6, cursor: false });
    expect(typewriterState('BEFORE', 'AFTER', 0.2).visible).toBe(3);
    expect(typewriterState('BEFORE', 'AFTER', 0.45).visible).toBe(0);
    expect(typewriterState('BEFORE', 'AFTER', 0.95)).toEqual({ layout: 'to', visible: 5, cursor: true });
    expect(typewriterState('BEFORE', 'AFTER', 1)).toEqual({ layout: 'to', visible: 5, cursor: false });
  });

  it('fade: out, snap, in', () => {
    expect(fadeState(0)).toEqual({ layout: 'from', opacity: 1 });
    expect(fadeState(SWAP_SNAP).layout).toBe('to');
    expect(fadeState(1)).toEqual({ layout: 'to', opacity: 1 });
  });
});
