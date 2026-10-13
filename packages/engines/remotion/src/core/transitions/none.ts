import { defineTransition } from './types.js';

export const none = defineTransition({
  id: 'none',
  label: 'Hard cut',
  description: 'A straight cut in the middle of the seam.',
  frame: ({ progress, direction }) => ({
    style: { opacity: direction === 'entering' ? (progress < 0.5 ? 0 : 1) : 1 },
  }),
});
