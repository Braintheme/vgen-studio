import { defineTemplate, imageSlot } from '@vgen/shared';
import { z } from 'zod';

/**
 * Test template of the fake engine: the photo on a card of the style background color,
 * fading in and out, with the music track. Nothing in the core knows about it; it only
 * proves that an engine plugs in through its manifest, adapter and worker.
 */
export const testCardTemplate = defineTemplate({
  id: 'test-card',
  engine: 'fake',
  version: '1.1.0',
  name: 'Test card',
  description:
    'Engine stub for development: a photo on a colored card. No live preview, a poster frame instead.',
  mediaSlots: [imageSlot('photo', { label: 'Photo', required: true, description: 'Any photo' })],
  duration: { default: 4, min: 2, max: 10 },
  texts: {},
  params: {
    photoScale: z
      .number()
      .min(0.3)
      .max(1)
      .default(0.8)
      .meta({ title: 'Photo size', widget: 'slider', step: 0.05 }),
    fadeSec: z
      .number()
      .min(0)
      .max(1.5)
      .default(0.5)
      .meta({ title: 'Photo fade', widget: 'slider', unit: 's', step: 0.1 }),
  },
  posterFrame: (props) => Math.round((props.durationSec * props.fps) / 2),
});

export type TestCardProps = z.output<typeof testCardTemplate.schema>;
