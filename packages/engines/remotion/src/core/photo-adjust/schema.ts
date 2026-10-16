// Isomorphic (zod only): the before / after photo adjustments every before/after template
// shares, and the looks both columns offer. Values are Lightroom-like, -100..100.
import { z } from 'zod';

export const PHOTO_LOOKS = ['none', 'flat', 'clean', 'juicy', 'bright', 'moody', 'warm', 'cool'] as const;
export type PhotoLook = (typeof PHOTO_LOOKS)[number];

export const PHOTO_LOOK_LABELS: Readonly<Record<PhotoLook, string>> = {
  none: 'None',
  flat: 'Flat',
  clean: 'Clean',
  juicy: 'Juicy',
  bright: 'Bright',
  moody: 'Moody',
  warm: 'Warm',
  cool: 'Cool',
};

export const ADJUSTMENT_KEYS = [
  'exposure',
  'contrast',
  'highlights',
  'shadows',
  'clarity',
  'temperature',
  'tint',
  'saturation',
  'vibrance',
] as const;
export type AdjustmentKey = (typeof ADJUSTMENT_KEYS)[number];
export type Adjustments = Readonly<Record<AdjustmentKey, number>>;

const TITLES: Readonly<Record<AdjustmentKey, string>> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  highlights: 'Highlights',
  shadows: 'Shadows',
  clarity: 'Clarity',
  temperature: 'Temperature',
  tint: 'Tint',
  saturation: 'Saturation',
  vibrance: 'Vibrance',
};

/** What each look does, as slider offsets (the sliders move on top of it). */
export const PHOTO_LOOK_VALUES: Readonly<Record<PhotoLook, Partial<Adjustments>>> = {
  none: {},
  flat: { contrast: -45, highlights: -30, shadows: 35, clarity: -20, saturation: -20 },
  clean: { exposure: 8, contrast: 10, highlights: -15, shadows: 15, clarity: 15, vibrance: 15 },
  juicy: { contrast: 25, shadows: -5, clarity: 20, saturation: 15, vibrance: 35 },
  bright: { exposure: 20, contrast: -10, highlights: -10, shadows: 25, saturation: -5 },
  moody: { exposure: -15, contrast: 20, highlights: -25, shadows: -15, saturation: -25, temperature: -10 },
  warm: { temperature: 30, tint: 5, vibrance: 10 },
  cool: { temperature: -30, tint: -5 },
};

const slider = (key: AdjustmentKey) =>
  z.number().min(-100).max(100).default(0).meta({ title: TITLES[key], widget: 'slider', step: 1 });

const photoAdjustments = (title: string) =>
  z
    .object({
      look: z
        .enum(PHOTO_LOOKS)
        .default('none')
        .meta({ title: 'Look', widget: 'select', optionLabels: PHOTO_LOOK_LABELS }),
      ...(Object.fromEntries(ADJUSTMENT_KEYS.map((key) => [key, slider(key)])) as Record<
        AdjustmentKey,
        ReturnType<typeof slider>
      >),
    })
    .prefault({})
    .meta({ title });

/** `params.adjust`: before and after side by side (the admin shows them as two columns). */
export const photoAdjustmentsField = () =>
  z
    .object({ before: photoAdjustments('Before'), after: photoAdjustments('After') })
    .prefault({})
    .meta({ title: 'Photo adjustments', widget: 'columns' });

/**
 * `params.adjust` of templates whose "after" photos are finished edits (e.g. one per preset):
 * only the before photo is adjustable (one column in the admin).
 */
export const beforeAdjustmentsField = () =>
  z
    .object({ before: photoAdjustments('Before') })
    .prefault({})
    .meta({ title: 'Photo adjustments', widget: 'columns' });

export type PhotoAdjustments = z.output<ReturnType<typeof photoAdjustments>>;

/** The look plus the sliders, clamped: what actually gets applied. */
export const effectiveAdjustments = (value: PhotoAdjustments): Adjustments => {
  const look = PHOTO_LOOK_VALUES[value.look];
  return Object.fromEntries(
    ADJUSTMENT_KEYS.map((key) => [key, Math.max(-100, Math.min(100, value[key] + (look[key] ?? 0)))]),
  ) as Adjustments;
};

/** Nothing to do: the photo is used as it is. */
export const isNeutral = (adjustments: Adjustments): boolean =>
  ADJUSTMENT_KEYS.every((key) => adjustments[key] === 0);
