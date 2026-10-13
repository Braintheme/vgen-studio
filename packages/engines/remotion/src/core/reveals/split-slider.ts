import { clamp01, ease, keyframes } from '../motion.js';
import { splitCompareNodes } from '../scene/split-compare.js';
import { defineReveal } from './types.js';

/** Divider path: enters from the right, swings back and forth, then clears to "after". */
const PATH = [
  { at: 0, value: 1.02 },
  { at: 0.34, value: 0.22 },
  { at: 0.64, value: 0.74 },
  { at: 1, value: -0.02 },
];

export const splitSlider = defineReveal({
  id: 'split-slider',
  durationSec: 2,
  revealedAt: 0.78,
  label: 'Split slider',
  description: 'A divider with BEFORE / AFTER labels sweeps back and forth before clearing.',
  render: (input) =>
    splitCompareNodes({
      ...input,
      position: keyframes(input.progress, PATH, ease.inOutCubic),
      chrome: clamp01(Math.min(input.progress / 0.08, (1 - input.progress) / 0.1)),
    }),
});
