// Isomorphic (zod only): the options of the palette grade process (references/3), shared by the
// `palette-grade` template (flat in its params) and other templates' palette finales (nested).
import { ColorSchema } from '@vgen/shared';
import { z } from 'zod';
import { PARTICLE_SHAPES } from '../particles/burst.js';
import { TAG_LABEL_VARIANTS } from '../primitives/tag-label-variants.js';
import { WORD_SWAP_LABELS, WORD_SWAPS } from '../typography/word-swap.js';
import { HOLD_SEC } from './timeline.js';

export const LABEL_POSITIONS = ['top', 'center', 'bottom'] as const;
export const PARTICLE_TRAILS = ['off', 'short', 'normal', 'long'] as const;
export const COLOR_RETURNS = ['even', 'spread'] as const;

/** The process's fields, in the admin's order (spread into `params`, or into a nested object). */
export const paletteGradeFields = () => ({
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
});

/** The process's admin groups for fields at `prefix` (e.g. `params.` or `params.palette.`). */
export const paletteGradeGroups = (
  prefix: string,
  labelTexts: readonly string[],
  idPrefix = '',
  extraTiming: readonly string[] = [],
) => [
  {
    id: `${idPrefix}timing`,
    label: 'Timing',
    fields: [
      `${prefix}introHoldSec`,
      `${prefix}processSpeed`,
      ...extraTiming,
      `${prefix}beforeLabelDelaySec`,
      `${prefix}afterLabelToEnd`,
      `${prefix}afterLabelSec`,
    ],
  },
  {
    id: `${idPrefix}labels`,
    label: 'Labels',
    fields: [
      ...labelTexts,
      `${prefix}labelSwap`,
      `${prefix}labelStyle`,
      `${prefix}labelPosition`,
      `${prefix}labelSize`,
      `${prefix}labelTracking`,
      `${prefix}labelColor`,
      `${prefix}labelOpacity`,
    ],
  },
  {
    id: `${idPrefix}particles`,
    label: 'Particles',
    fields: [
      `${prefix}particleCount`,
      `${prefix}particleSize`,
      `${prefix}particleSpread`,
      `${prefix}particleTrail`,
      `${prefix}particleShape`,
      `${prefix}particleDrift`,
      `${prefix}variation`,
    ],
  },
  {
    id: `${idPrefix}process`,
    label: 'Process',
    fields: [`${prefix}monochrome`, `${prefix}colorReturn`, `${prefix}ripples`, `${prefix}cameraMotion`],
  },
];

export type PaletteGradeOptions = z.output<z.ZodObject<ReturnType<typeof paletteGradeFields>>>;
