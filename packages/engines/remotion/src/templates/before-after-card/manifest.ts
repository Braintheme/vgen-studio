import { defineTemplate, imageSlot, textField } from '@vgen/shared';
import { z } from 'zod';
import { photoAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { REVEAL_EFFECTS, revealEffectField } from '../../core/reveals/registry.js';
import { cardTimeline, LABEL_SEC } from './timeline.js';

export const CARD_TILTS = ['flat', 'soft', 'strong'] as const;

/**
 * Before/after as a floating 3D card (reference: references/1): the before photo shrinks
 * into a tilted card, the after photo slides over it, the card grows back to full bleed,
 * and a quick before/after flash closes the clip.
 */
export const beforeAfterCardTemplate = defineTemplate({
  id: 'before-after-card',
  engine: 'remotion',
  version: '1.3.0',
  name: 'Before / After — Card',
  // Gallery card (admin static file; regenerate from fixture renders when the look changes).
  thumbnailUrl: '/template-previews/before-after-card.jpg',
  description:
    'The photo shrinks into a floating 3D card, the edit is revealed inside it, and the card opens back up.',
  mediaSlots: [
    imageSlot('before', { label: 'Before', required: true, description: 'Original photo' }),
    imageSlot('after', { label: 'After', required: true, description: 'Edited photo, same framing' }),
  ],
  duration: { default: 9, min: 8, max: 15 },
  texts: {
    beforeLabel: textField({ label: 'Before label', default: 'BEFORE', maxLength: 16, scope: 'style' }),
    afterLabel: textField({ label: 'After label', default: 'AFTER', maxLength: 16, scope: 'style' }),
  },
  params: {
    // Shared by every before/after template (two columns in the admin).
    adjust: photoAdjustmentsField(),
    // Any of the shared reveal effects it shipped with (new ones are opt-in); each one sets
    // its own pace (its natural length).
    revealEffect: revealEffectField({
      title: 'Reveal inside the card',
      allowed: ['diagonal-wipe', 'circle-reveal', 'blinds', 'split-slider', 'slide-over'],
      default: 'split-slider',
    }),
    introMotion: z.boolean().default(false).meta({ title: 'Move the first photo', widget: 'switch' }),
    tilt: z
      .enum(CARD_TILTS)
      .default('strong')
      .meta({
        title: 'Card tilt',
        widget: 'segmented',
        optionLabels: { flat: 'Flat', soft: 'Soft', strong: 'Strong' },
      }),
    endFlash: z.boolean().default(true).meta({ title: 'Before / after flash at the end', widget: 'switch' }),
  },
  defaults: {
    style: {
      colors: { background: '#e9e9e9', text: '#3e3833' },
      fonts: { heading: 'unbounded', body: 'unbounded' },
      vignette: 0,
      grain: 0,
    },
  },
  ui: {
    groups: [
      { id: 'labels', label: 'Labels', fields: ['texts.beforeLabel', 'texts.afterLabel'] },
      {
        id: 'card',
        label: 'Card',
        fields: ['params.revealEffect', 'params.tilt', 'params.introMotion', 'params.endFlash'],
      },
      { id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] },
    ],
    slotActions: [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }],
  },
  // The after card with its label fully typed.
  posterFrame: (props) => {
    const timeline = cardTimeline({
      durationSec: props.durationSec,
      fps: props.fps,
      endFlash: props.params.endFlash,
      revealSec: REVEAL_EFFECTS.get(props.params.revealEffect).durationSec,
      revealedAt: REVEAL_EFFECTS.get(props.params.revealEffect).revealedAt,
    });
    const typed = Math.ceil(props.texts.afterLabel.value.length * LABEL_SEC.perChar * props.fps);
    return Math.min(timeline.expand.from - 1, timeline.labelSwap + typed + 2);
  },
  checkMedia: checkBeforeAfterMedia,
  prepareAssets: alignBeforeAfter,
});

export type BeforeAfterCardProps = z.output<typeof beforeAfterCardTemplate.schema>;
