// Pure state of a glitchy word swap (no React): which letters of the old and the new word are
// visible at a given progress. Letters drop out / appear one by one in a seeded order, each
// flickering dim for a moment first; a single garbled moment sits between the two words.
import { seeded } from '../random.js';

/** User-perceived characters (emoji and combining marks stay whole). */
export const graphemes = (text: string): string[] =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment,
  );

/** Progress windows of the swap (shares of its whole length). */
export const GLITCH_PHASES = {
  /** The old word's letters drop out within this window. */
  out: [0, 0.4],
  /** The box switches to the new word's width here. */
  snap: 0.1,
  /** Both words superimposed as outlines. */
  garble: [0.4, 0.5],
  /** The new word's letters appear within this window. */
  in: [0.5, 1],
} as const;

/** Opacity of a letter during its flicker. */
export const FLICKER_OPACITY = 0.35;

export interface GlitchSwapState {
  /** Which word sizes the box. */
  readonly layout: 'from' | 'to';
  readonly from: readonly number[];
  readonly to: readonly number[];
  readonly garble: boolean;
}

/** Seeded order of `count` letters (a permutation). */
const order = (count: number, seed: number, key: string): number[] =>
  Array.from({ length: count }, (_, index) => index).sort(
    (a, b) => seeded(seed, `${key}:${a}`) - seeded(seed, `${key}:${b}`) || a - b,
  );

/**
 * @param flicker how long (share of the swap) a letter flickers dim before it drops out or
 *   settles, ~one frame.
 */
export const glitchSwapState = (
  from: string,
  to: string,
  progress: number,
  seed: number,
  flicker = 0.09,
): GlitchSwapState => {
  const fromLetters = graphemes(from);
  const toLetters = graphemes(to);
  if (progress <= 0) {
    return { layout: 'from', from: fromLetters.map(() => 1), to: toLetters.map(() => 0), garble: false };
  }
  if (progress >= 1) {
    return { layout: 'to', from: fromLetters.map(() => 0), to: toLetters.map(() => 1), garble: false };
  }
  const [outFrom, outTo] = GLITCH_PHASES.out;
  const [inFrom, inTo] = GLITCH_PHASES.in;
  const fromOrder = order(fromLetters.length, seed, 'glitch:out');
  const toOrder = order(toLetters.length, seed, 'glitch:in');
  const slot = (rank: number, count: number, start: number, end: number): number =>
    start + flicker + (count <= 1 ? 0 : (rank / (count - 1)) * (end - start - flicker));

  const fromOpacity = fromLetters.map((_, index) => {
    const drop = slot(fromOrder.indexOf(index), fromLetters.length, outFrom, outTo);
    return progress >= drop ? 0 : progress >= drop - flicker ? FLICKER_OPACITY : 1;
  });
  const toOpacity = toLetters.map((_, index) => {
    const settle = slot(toOrder.indexOf(index), toLetters.length, inFrom, inTo);
    return progress >= settle ? 1 : progress >= settle - flicker ? FLICKER_OPACITY : 0;
  });
  return {
    layout: progress >= GLITCH_PHASES.snap ? 'to' : 'from',
    from: fromOpacity,
    to: toOpacity,
    garble: progress >= GLITCH_PHASES.garble[0] && progress < GLITCH_PHASES.garble[1],
  };
};
