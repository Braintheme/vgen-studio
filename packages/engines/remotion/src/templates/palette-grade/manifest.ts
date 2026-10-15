import { ColorSchema, defineTemplate, imageSlot, textField } from '@vgen/shared';
import { z } from 'zod';
import { photoAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { PARTICLE_SHAPES } from '../../core/particles/burst.js';
import { TAG_LABEL_VARIANTS } from '../../core/primitives/tag-label-variants.js';
import { WORD_SWAP_LABELS, WORD_SWAPS } from '../../core/typography/word-swap.js';
import { gradeTimeline, HOLD_SEC } from './timeline.js';

export const LABEL_POSITIONS = ['top', 'center', 'bottom'] as const;
export const PARTICLE_TRAILS = ['off', 'short', 'normal', 'long'] as const;
export const COLOR_RETURNS = ['even', 'spread'] as const;

/**
 * A colour-grading "process" in one shot (reference: references/3): a pie of the after
 * photo's palette builds over the original, the photo turns black and white, the pie
 * collapses into a dot that bursts into colour particles, the image darkens into the grade's
 * tones and the colour comes back while BEFORE turns into AFTER.
 */
export const paletteGradeTemplate = defineTemplate({
  id: 'palette-grade',
  engine: 'remotion',
  version: '1.3.0',
  name: 'Before / After — Palette Grade',
  description:
    'The edit’s colour palette appears as a pie, collapses into a dot and bursts into the photo as the grade comes in.',
  mediaSlots: [
    imageSlot('before', { label: 'Before', required: true, description: 'Original photo' }),
    imageSlot('after', {
      label: 'After',
      required: true,
      description: 'Edited photo, same framing; its colours make the palette',
    }),
  ],
  duration: { default: 7, min: 6, max: 12 },
  texts: {
    beforeLabel: textField({ label: 'Before label', default: 'BEFORE', maxLength: 16, scope: 'style' }),
    afterLabel: textField({ label: 'After label', default: 'AFTER', maxLength: 16, scope: 'style' }),
  },
  params: {
    // Shared by every before/after template (two columns in the admin).
    adjust: photoAdjustmentsField(),
    // Timing
    introHoldSec: z
      .number()
      .min(HOLD_SEC.minIntro)
      .max(3)
      .default(HOLD_SEC.intro)
      .meta({ title: 'Before photo holds', widget: 'slider', unit: 's', step: 0.1 }),
    processSpeed: z
      .number()
      .min(0.7)
      .max(1.5)
      .default(1)
      .meta({ title: 'Process speed', widget: 'slider', unit: '×', step: 0.05 }),
    beforeLabelDelaySec: z
      .number()
      .min(0)
      .max(3)
      .default(0)
      .meta({ title: 'BEFORE label appears after', widget: 'slider', unit: 's', step: 0.1 }),
    afterLabelToEnd: z
      .boolean()
      .default(true)
      .meta({ title: 'AFTER label stays to the end', widget: 'switch' }),
    afterLabelSec: z
      .number()
      .min(0.5)
      .max(8)
      .default(2)
      .meta({ title: 'AFTER label shows for (when not to the end)', widget: 'slider', unit: 's', step: 0.5 }),

    // Label
    labelSwap: z
      .enum(WORD_SWAPS)
      .default('glitch')
      .meta({ title: 'BEFORE → AFTER animation', widget: 'select', optionLabels: WORD_SWAP_LABELS }),
    labelStyle: z
      .enum(TAG_LABEL_VARIANTS)
      .default('plate')
      .meta({
        title: 'Label style',
        widget: 'segmented',
        optionLabels: { plate: 'Plate', outline: 'Outline', glass: 'Glass', text: 'Text only' },
      }),
    labelPosition: z
      .enum(LABEL_POSITIONS)
      .default('top')
      .meta({
        title: 'Label position',
        widget: 'segmented',
        optionLabels: { top: 'Top', center: 'Center', bottom: 'Bottom' },
      }),
    labelSize: z
      .number()
      .min(0.6)
      .max(1.8)
      .default(1)
      .meta({ title: 'Label size', widget: 'slider', unit: '×', step: 0.05 }),
    labelTracking: z
      .number()
      .min(0)
      .max(0.8)
      .default(0.4)
      .meta({ title: 'Letter spacing', widget: 'slider', unit: 'em', step: 0.02 }),
    labelColor: ColorSchema.default('#141416').meta({ title: 'Plate colour' }),
    labelOpacity: z
      .number()
      .min(0)
      .max(1)
      .default(0.8)
      .meta({ title: 'Plate opacity', widget: 'slider', step: 0.05 }),

    // Particles
    particleCount: z.int().min(4).max(24).default(10).meta({ title: 'Particles', widget: 'slider', step: 1 }),
    particleSize: z
      .number()
      .min(0.5)
      .max(2)
      .default(1)
      .meta({ title: 'Particle size', widget: 'slider', unit: '×', step: 0.05 }),
    particleSpread: z
      .number()
      .min(0.5)
      .max(1.6)
      .default(1)
      .meta({ title: 'How far they fly', widget: 'slider', unit: '×', step: 0.05 }),
    particleTrail: z
      .enum(PARTICLE_TRAILS)
      .default('normal')
      .meta({
        title: 'Trail',
        widget: 'segmented',
        optionLabels: { off: 'Off', short: 'Short', normal: 'Normal', long: 'Long' },
      }),
    particleShape: z
      .enum(PARTICLE_SHAPES)
      .default('circle')
      .meta({
        title: 'Particle shape',
        widget: 'segmented',
        optionLabels: { circle: 'Circle', square: 'Square', ring: 'Ring', star: 'Star' },
      }),
    particleDrift: z
      .boolean()
      .default(false)
      .meta({ title: 'Particles drift after landing', widget: 'switch' }),
    variation: z
      .int()
      .min(1)
      .max(99)
      .default(1)
      .meta({ title: 'Variation (particle layout, letter order)', widget: 'slider', step: 1 }),

    // Process
    monochrome: z.boolean().default(true).meta({ title: 'Black-and-white stage', widget: 'switch' }),
    colorReturn: z
      .enum(COLOR_RETURNS)
      .default('even')
      .meta({
        title: 'Colour comes back',
        widget: 'segmented',
        optionLabels: { even: 'Evenly', spread: 'From the dots' },
      }),
    ripples: z.boolean().default(false).meta({ title: 'Ripples where the dots land', widget: 'switch' }),
    cameraMotion: z.boolean().default(true).meta({ title: 'Camera push', widget: 'switch' }),
  },
  defaults: {
    style: {
      colors: { text: '#ffffff' },
      fonts: { heading: 'unbounded', body: 'unbounded' },
      vignette: 0,
      grain: 0,
    },
    // The template's own track starts on a hit: no fade-in.
    music: { fadeInSec: 0, fadeOutSec: 0.4 },
  },
  ui: {
    groups: [
      {
        id: 'timing',
        label: 'Timing',
        fields: [
          'params.introHoldSec',
          'params.processSpeed',
          'params.beforeLabelDelaySec',
          'params.afterLabelToEnd',
          'params.afterLabelSec',
        ],
      },
      {
        id: 'labels',
        label: 'Labels',
        fields: [
          'texts.beforeLabel',
          'texts.afterLabel',
          'params.labelSwap',
          'params.labelStyle',
          'params.labelPosition',
          'params.labelSize',
          'params.labelTracking',
          'params.labelColor',
          'params.labelOpacity',
        ],
      },
      {
        id: 'particles',
        label: 'Particles',
        fields: [
          'params.particleCount',
          'params.particleSize',
          'params.particleSpread',
          'params.particleTrail',
          'params.particleShape',
          'params.particleDrift',
          'params.variation',
        ],
      },
      {
        id: 'process',
        label: 'Process',
        fields: ['params.monochrome', 'params.colorReturn', 'params.ripples', 'params.cameraMotion'],
      },
      { id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] },
    ],
    slotActions: [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }],
  },
  // The graded photo with AFTER in place.
  posterFrame: (props) => {
    const t = gradeTimeline({
      durationSec: props.durationSec,
      fps: props.fps,
      introHoldSec: props.params.introHoldSec,
      speed: props.params.processSpeed,
    });
    return Math.min(t.totalFrames - 1, t.end + Math.round(0.3 * props.fps));
  },
  checkMedia: checkBeforeAfterMedia,
  prepareAssets: alignBeforeAfter,
});

export type PaletteGradeProps = z.output<typeof paletteGradeTemplate.schema>;
