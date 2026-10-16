import { defineReveal } from './types.js';

/** Fitted to references/4: the next look dissolves in over ~0.45 s at an even pace. */
export const crossfade = defineReveal({
  id: 'crossfade',
  durationSec: 0.45,
  // The new look reads about a third of the way in (the reference cuts its label there).
  revealedAt: 0.4,
  label: 'Crossfade',
  description: 'A plain dissolve: the after photo fades in over the before one.',
  render: ({ progress }) => [
    { kind: 'photo', source: 'before' },
    { kind: 'photo', source: 'after', style: { opacity: Math.min(1, Math.max(0, progress)).toFixed(4) } },
  ],
});
