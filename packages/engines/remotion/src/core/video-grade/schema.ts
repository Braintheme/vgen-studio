// Isomorphic (zod only): colour grading of a template's video clip. The basics mirror the photo
// adjustments (Lightroom-like, -100..100, the same looks); colour wheels tint the shadows,
// midtones and highlights like Final Cut's (a hue around the wheel and an amount).
import { z } from 'zod';
import { PHOTO_LOOK_LABELS, PHOTO_LOOK_VALUES, PHOTO_LOOKS } from '../photo-adjust/schema.js';

/** Per-pixel adjustments only (clarity is local contrast: not possible on a video filter). */
export const VIDEO_GRADE_KEYS = [
  'exposure',
  'contrast',
  'highlights',
  'shadows',
  'temperature',
  'tint',
  'saturation',
  'vibrance',
] as const;
export type VideoGradeKey = (typeof VIDEO_GRADE_KEYS)[number];

const TITLES: Readonly<Record<VideoGradeKey, string>> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  highlights: 'Highlights',
  shadows: 'Shadows',
  temperature: 'Temperature',
  tint: 'Tint',
  saturation: 'Saturation',
  vibrance: 'Vibrance',
};

export const COLOR_WHEEL_ZONES = ['shadows', 'midtones', 'highlights'] as const;
export type ColorWheelZone = (typeof COLOR_WHEEL_ZONES)[number];

const slider = (key: VideoGradeKey) =>
  z.number().min(-100).max(100).default(0).meta({ title: TITLES[key], widget: 'slider', step: 1 });

const wheel = (title: string) =>
  z
    .object({
      /** Degrees around the wheel, 0 = red at the top, clockwise. */
      hue: z.number().min(0).max(360).default(0),
      /** 0 = no tint, 100 = the strongest. */
      amount: z.number().min(0).max(100).default(0),
    })
    .prefault({})
    .meta({ title });

/** `params.<clip>Grade`: basics, then the three colour wheels (one admin widget). */
export const videoGradeField = () =>
  z
    .object({
      look: z
        .enum(PHOTO_LOOKS)
        .default('none')
        .meta({ title: 'Look', widget: 'select', optionLabels: PHOTO_LOOK_LABELS }),
      ...(Object.fromEntries(VIDEO_GRADE_KEYS.map((key) => [key, slider(key)])) as Record<
        VideoGradeKey,
        ReturnType<typeof slider>
      >),
      wheels: z
        .object({
          shadows: wheel('Shadows'),
          midtones: wheel('Midtones'),
          highlights: wheel('Highlights'),
        })
        .prefault({})
        .meta({ title: 'Colour wheels', widget: 'color-wheels' }),
    })
    .prefault({})
    .meta({ title: 'Clip color grading' });

export type VideoGrade = z.output<ReturnType<typeof videoGradeField>>;
export type ColorWheel = VideoGrade['wheels']['shadows'];

/** The look plus the sliders, clamped. */
export const effectiveGrade = (grade: VideoGrade): Readonly<Record<VideoGradeKey, number>> => {
  const look = PHOTO_LOOK_VALUES[grade.look];
  return Object.fromEntries(
    VIDEO_GRADE_KEYS.map((key) => [key, Math.max(-100, Math.min(100, grade[key] + (look[key] ?? 0)))]),
  ) as Record<VideoGradeKey, number>;
};

/** Nothing to do: the clip is shown as it is (no filter at all). */
export const isNeutralGrade = (grade: VideoGrade): boolean => {
  const values = effectiveGrade(grade);
  return (
    VIDEO_GRADE_KEYS.every((key) => values[key] === 0) &&
    COLOR_WHEEL_ZONES.every((zone) => grade.wheels[zone].amount === 0)
  );
};
