// Pure states of word swaps (one word turning into another; no React). Every swap runs over a
// 0..1 progress; the box hugs the old word in the first half and snaps once to the new one.
import { clamp01, cubicBezier, ease } from '../motion.js';
import { seeded } from '../random.js';
import { graphemes } from './glitch-swap.js';

export const WORD_SWAPS = ['glitch', 'decode', 'roll', 'typewriter', 'fade'] as const;
export type WordSwapEffect = (typeof WORD_SWAPS)[number];

export const WORD_SWAP_LABELS: Readonly<Record<WordSwapEffect, string>> = {
  glitch: 'Glitch',
  decode: 'Decode',
  roll: 'Flip board',
  typewriter: 'Typewriter',
  fade: 'Fade',
};

/** Where the box switches from the old word's width to the new one's. */
export const SWAP_SNAP = 0.5;

/** Glyphs a decoding letter cycles through. */
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
/** Scramble changes per swap (about every frame at the reference's ~11 frame swap). */
const SCRAMBLE_STEPS = 24;

const scrambled = (seed: number, index: number, progress: number, salt: string): string => {
  const step = Math.floor(progress * SCRAMBLE_STEPS);
  return SCRAMBLE[Math.floor(seeded(seed, `${salt}:${index}:${step}`) * SCRAMBLE.length)] ?? '#';
};

export interface DecodeLetter {
  /** The glyph drawn in this letter's slot (the slot keeps the real letter's width). */
  readonly glyph: string;
  /** Still scrambling (drawn dimmer). */
  readonly scrambling: boolean;
}

export interface DecodeState {
  readonly layout: 'from' | 'to';
  readonly letters: readonly DecodeLetter[];
}

/**
 * Decode: the old word's letters start scrambling one by one; after the snap the new word
 * scrambles and its letters lock into place in a seeded order.
 */
export const decodeState = (from: string, to: string, progress: number, seed: number): DecodeState => {
  const p = clamp01(progress);
  if (p < SWAP_SNAP) {
    const letters = graphemes(from);
    return {
      layout: 'from',
      letters: letters.map((letter, index) => {
        const start = seeded(seed, `decode:out:${index}`) * 0.35;
        const scrambling = p > 0 && p >= start;
        return { glyph: scrambling ? scrambled(seed, index, p, 'out') : letter, scrambling };
      }),
    };
  }
  const letters = graphemes(to);
  return {
    layout: 'to',
    letters: letters.map((letter, index) => {
      const lock = SWAP_SNAP + 0.1 + seeded(seed, `decode:in:${index}`) * (1 - SWAP_SNAP - 0.1);
      const scrambling = p < 1 && p < lock;
      return { glyph: scrambling ? scrambled(seed, index, p, 'in') : letter, scrambling };
    }),
  };
};

export interface RollLetter {
  /** Glyphs of the letter's column, top to bottom; the column scrolls up through them. */
  readonly column: readonly string[];
  /** Scroll position in lines (0 = the first glyph shows). */
  readonly offset: number;
  readonly opacity: number;
}

export interface RollState {
  readonly layout: 'from' | 'to';
  readonly letters: readonly RollLetter[];
}

/** Old letters leave within this window (left to right), new ones arrive in the second. */
const ROLL_OUT = [0, 0.45] as const;
const ROLL_IN = [SWAP_SNAP, 1] as const;
/** Each letter's own share of its window. */
const ROLL_LETTER = 0.55;
/** Glyphs a new letter flips through before it settles. */
const ROLL_FLIPS = 3;
/** Settles with a small overshoot, like a mechanical flap. */
const ROLL_EASE = cubicBezier(0.25, 0.9, 0.35, 1.18);

const letterWindow = (index: number, count: number, window: readonly [number, number], p: number): number => {
  const span = window[1] - window[0];
  const own = span * ROLL_LETTER;
  const start = window[0] + (count <= 1 ? 0 : (index / (count - 1)) * (span - own));
  return clamp01((p - start) / own);
};

/** Flip board: letters roll up and away, then the new ones roll in through a few glyphs. */
export const rollState = (from: string, to: string, progress: number, seed: number): RollState => {
  const p = clamp01(progress);
  if (p < SWAP_SNAP) {
    const letters = graphemes(from);
    return {
      layout: 'from',
      letters: letters.map((letter, index) => {
        const out = ease.inCubic(letterWindow(index, letters.length, ROLL_OUT, p));
        return { column: [letter], offset: out * 1.1, opacity: 1 - out };
      }),
    };
  }
  const letters = graphemes(to);
  return {
    layout: 'to',
    letters: letters.map((letter, index) => {
      const local = letterWindow(index, letters.length, ROLL_IN, p);
      const flips = Array.from({ length: ROLL_FLIPS }, (_, flip) =>
        scrambled(seed, index * 10 + flip, 0, 'roll'),
      );
      return {
        column: [...flips, letter],
        offset: ROLL_EASE(local) * ROLL_FLIPS,
        opacity: local > 0 ? 1 : 0,
      };
    }),
  };
};

export interface TypewriterState {
  readonly layout: 'from' | 'to';
  /** Letters of the layout word that show. */
  readonly visible: number;
  readonly cursor: boolean;
}

/** Typewriter: the old word is erased from the end, a beat of an empty cursor, the new one typed. */
export const typewriterState = (from: string, to: string, progress: number): TypewriterState => {
  const p = clamp01(progress);
  const fromCount = graphemes(from).length;
  const toCount = graphemes(to).length;
  // The cursor blinks while idle, solid while it works.
  const blink = Math.floor(p * 12) % 2 === 0;
  if (p < 0.4) {
    return { layout: 'from', visible: Math.ceil(fromCount * (1 - p / 0.4)), cursor: p > 0 };
  }
  if (p < SWAP_SNAP) {
    return { layout: 'from', visible: 0, cursor: blink };
  }
  if (p >= 1) {
    return { layout: 'to', visible: toCount, cursor: false };
  }
  // Typed by 90 % of the swap; the cursor rests on the finished word for a moment.
  const typed = Math.floor(toCount * ((p - SWAP_SNAP) / (1 - SWAP_SNAP - 0.1)));
  return { layout: 'to', visible: Math.min(toCount, typed), cursor: true };
};

/** Fade: the old word fades out, the box snaps, the new word fades in. */
export const fadeState = (progress: number): { readonly layout: 'from' | 'to'; readonly opacity: number } => {
  const p = clamp01(progress);
  return p < SWAP_SNAP
    ? { layout: 'from', opacity: 1 - ease.inOutSine(p / SWAP_SNAP) }
    : { layout: 'to', opacity: ease.inOutSine((p - SWAP_SNAP) / (1 - SWAP_SNAP)) };
};
