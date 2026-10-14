import { defineTemplate, imageSlot, textField } from '@vgen/shared';
import { z } from 'zod';
import { revealEffectField } from '../../core/reveals/registry.js';
import { seamTransitionField } from '../../core/transitions/registry.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { beforeAfterPosterFrame } from './timeline.js';

export const FINALES = ['split', 'rereveal'] as const;
export const MOTION_LEVELS = ['subtle', 'balanced', 'dynamic'] as const;

export const beforeAfterTemplate = defineTemplate({
  id: 'before-after',
  engine: 'remotion',
  version: '1.0.0',
  name: 'Before / After',
  description: 'Shows a photo before and after editing (e.g. a Lightroom preset) with a cinematic reveal.',
  mediaSlots: [
    imageSlot('before', { label: 'Before', required: true, description: 'Original photo' }),
    imageSlot('after', { label: 'After', required: true, description: 'Edited photo, same framing' }),
  ],
  duration: { default: 13, min: 8, max: 30 },
  texts: {
    title: textField({ label: 'Title', default: 'Lightroom Preset', maxLength: 48 }),
    subtitle: textField({ label: 'Subtitle', default: 'Before → After', maxLength: 64 }),
    beforeLabel: textField({ label: 'Before label', default: 'Before', maxLength: 16, scope: 'style' }),
    afterLabel: textField({ label: 'After label', default: 'After', maxLength: 16, scope: 'style' }),
    outroText: textField({ label: 'Outro text', default: 'Get the preset — link in bio', maxLength: 64 }),
  },
  params: {
    // Pinned: effects added to the registry later are opt-in per template.
    revealEffect: revealEffectField({
      title: 'Reveal effect',
      allowed: ['diagonal-wipe', 'circle-reveal', 'blinds', 'split-slider'],
      default: 'diagonal-wipe',
    }),
    finale: z
      .enum(FINALES)
      .default('split')
      .meta({
        title: 'Finale',
        widget: 'segmented',
        optionLabels: { split: 'Split compare', rereveal: 'Quick re-reveal' },
      }),
    motion: z
      .enum(MOTION_LEVELS)
      .default('balanced')
      .meta({
        title: 'Motion intensity',
        widget: 'segmented',
        optionLabels: { subtle: 'Subtle', balanced: 'Balanced', dynamic: 'Dynamic' },
      }),
    // Calm entry by default; the energetic zoom stays available as an option.
    // Pinned to the transitions that existed when the template shipped (new ones are opt-in).
    introTransition: seamTransitionField({
      title: 'Intro → Before',
      allowed: ['soft-focus', 'fade', 'light-pass', 'slide-up', 'zoom-through', 'none'],
      default: 'soft-focus',
    }),
    // The end card should settle, not punch: no zoom on this seam.
    outroTransition: seamTransitionField({
      title: 'Finale → Outro',
      allowed: ['fade', 'soft-focus', 'light-pass', 'slide-up', 'none'],
      default: 'fade',
    }),
  },
  defaults: {
    style: {
      fonts: { heading: 'unbounded', body: 'inter' },
    },
  },
  ui: {
    groups: [
      { id: 'texts', label: 'Texts', fields: ['texts.title', 'texts.subtitle', 'texts.outroText'] },
      { id: 'labels', label: 'Labels', fields: ['texts.beforeLabel', 'texts.afterLabel'] },
      {
        id: 'effect',
        label: 'Effect',
        fields: [
          'params.revealEffect',
          'params.finale',
          'params.motion',
          'params.introTransition',
          'params.outroTransition',
        ],
      },
    ],
    slotActions: [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }],
  },
  posterFrame: (props) => beforeAfterPosterFrame(props),
  checkMedia: checkBeforeAfterMedia,
  prepareAssets: alignBeforeAfter,
});

export type BeforeAfterProps = z.output<typeof beforeAfterTemplate.schema>;
