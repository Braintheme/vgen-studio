import { z } from 'zod';
import { FontIdSchema } from '../fonts.js';
import { DEFAULT_FORMAT, FormatSchema, FpsSchema } from '../formats.js';
import type { FieldScope } from './meta.js';
import './meta.js';

export const ColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #rrggbb color')
  .meta({ widget: 'color' });

/** Visual style shared by every template; templates override defaults, not the shape. */
export const StyleSchema = z
  .object({
    fonts: z
      .object({
        heading: FontIdSchema.default('montserrat').meta({ title: 'Heading font', widget: 'font' }),
        body: FontIdSchema.default('inter').meta({ title: 'Body font', widget: 'font' }),
      })
      .prefault({}),
    colors: z
      .object({
        background: ColorSchema.default('#0b0b0f').meta({ title: 'Background' }),
        text: ColorSchema.default('#ffffff').meta({ title: 'Text' }),
        accent: ColorSchema.default('#f5c518').meta({ title: 'Accent' }),
      })
      .prefault({}),
    radius: z
      .number()
      .min(0)
      .max(64)
      .default(16)
      .meta({ title: 'Corner radius', widget: 'slider', unit: 'px' }),
    vignette: z
      .number()
      .min(0)
      .max(1)
      .default(0.25)
      .meta({ title: 'Vignette', widget: 'slider', step: 0.05 }),
    // Grain hurts social re-compression the most, so it is off by default and capped.
    grain: z.number().min(0).max(0.5).default(0).meta({ title: 'Film grain', widget: 'slider', step: 0.05 }),
  })
  .meta({ scope: 'style' });
export type Style = z.output<typeof StyleSchema>;

export const MusicSchema = z
  .object({
    enabled: z.boolean().default(true).meta({ title: 'Music', widget: 'switch' }),
    /** `null` means "use the library's default track". */
    trackId: z.uuid().nullable().default(null).meta({ title: 'Track', widget: 'music-track' }),
    /** Offset into the track where the used fragment starts. */
    startSec: z
      .number()
      .min(0)
      .default(0)
      .meta({ title: 'Fragment start', widget: 'music-region', unit: 's' }),
    volume: z.number().min(0).max(1).default(0.8).meta({ title: 'Volume', widget: 'slider', step: 0.05 }),
    fadeInSec: z
      .number()
      .min(0)
      .max(10)
      .default(0.5)
      .meta({ title: 'Fade in', widget: 'slider', unit: 's', step: 0.1 }),
    fadeOutSec: z
      .number()
      .min(0)
      .max(10)
      .default(1.5)
      .meta({ title: 'Fade out', widget: 'slider', unit: 's', step: 0.1 }),
  })
  .meta({ scope: 'style' });
export type Music = z.output<typeof MusicSchema>;

export const SHARPEN_LEVELS = ['off', 'low', 'medium'] as const;
export type SharpenLevel = (typeof SHARPEN_LEVELS)[number];

export const ImageProcessingSchema = z
  .object({
    sharpen: z
      .enum(SHARPEN_LEVELS)
      .default('low')
      .meta({
        title: 'Sharpen',
        widget: 'segmented',
        optionLabels: { off: 'Off', low: 'Low', medium: 'Medium' },
      }),
  })
  .meta({ scope: 'style' });
export type ImageProcessing = z.output<typeof ImageProcessingSchema>;

export interface TextFieldOptions {
  readonly label: string;
  readonly default: string;
  readonly maxLength?: number;
  /** Whether the text is shown by default; every text can be switched off. */
  readonly enabled?: boolean;
  readonly multiline?: boolean;
  /** Text fields are content by default; labels that belong to a look can be `style`. */
  readonly scope?: FieldScope;
}

/** A template text: a value plus an on/off switch. */
export const textField = (options: TextFieldOptions) => {
  const enabled = options.enabled ?? true;
  return z
    .object({
      enabled: z.boolean().default(enabled),
      value: z
        .string()
        .max(options.maxLength ?? 120)
        .default(options.default),
    })
    .prefault({ enabled, value: options.default })
    .meta({
      title: options.label,
      scope: options.scope ?? 'content',
      widget: options.multiline ? 'textarea' : 'text',
    });
};

export type TextField = z.output<ReturnType<typeof textField>>;

export interface VideoRangeOptions {
  readonly label: string;
  /** Shortest and longest allowed fragment, seconds. */
  readonly minSec: number;
  readonly maxSec: number;
  /** Fragment length before the user picks one (starts at 0). */
  readonly defaultSec: number;
}

/**
 * The used fragment of a video slot (the slot points at it with `range`): per-video content.
 * The admin clamps it to the uploaded video; the worker cuts exactly this part.
 */
export const videoRangeField = (options: VideoRangeOptions) =>
  z
    .object({
      startSec: z.number().min(0).default(0),
      endSec: z.number().min(0).default(options.defaultSec),
    })
    .prefault({})
    .refine(
      (range) =>
        range.endSec - range.startSec >= options.minSec - 0.001 &&
        range.endSec - range.startSec <= options.maxSec + 0.001,
      `The fragment must be ${options.minSec}–${options.maxSec} s long`,
    )
    .meta({
      title: options.label,
      scope: 'content',
      widget: 'video-range',
      unit: 's',
      limits: { min: options.minSec, max: options.maxSec },
    });

export type VideoRange = z.output<ReturnType<typeof videoRangeField>>;

/** Length of a video fragment, seconds. */
export const videoRangeSec = (range: VideoRange): number => Math.max(0, range.endSec - range.startSec);

export interface SoundEffectOptions {
  readonly label: string;
  readonly enabled?: boolean;
  readonly volume?: number;
}

/**
 * A sound cue of a template (shutter click, swoosh): `trackId: null` plays the engine's
 * built-in sound, otherwise a track from the music library.
 */
export const soundEffectField = (options: SoundEffectOptions) => {
  const enabled = options.enabled ?? true;
  return z
    .object({
      enabled: z.boolean().default(enabled),
      trackId: z.uuid().nullable().default(null),
      volume: z
        .number()
        .min(0)
        .max(1)
        .default(options.volume ?? 0.8),
    })
    .prefault({})
    .meta({ title: options.label, scope: 'style', widget: 'sound-effect' });
};

export type SoundEffect = z.output<ReturnType<typeof soundEffectField>>;

/** Library tracks of the enabled cues (for `TemplateDefinition.soundTracks`). */
export const soundEffectTracks = (
  cues: Readonly<Record<string, SoundEffect>>,
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(cues).flatMap(([key, cue]) =>
      cue.enabled && cue.trackId !== null ? [[key, cue.trackId] as const] : [],
    ),
  );

export interface DurationSpec {
  readonly default: number;
  readonly min: number;
  readonly max: number;
}

export const SEED_MAX = 2_147_483_647;

/** Base (template-independent) part of every template's props. */
export const baseShape = (duration: DurationSpec) => ({
  format: FormatSchema.default(DEFAULT_FORMAT).meta({
    title: 'Format',
    scope: 'style',
    widget: 'select',
    optionLabels: {
      '9:16': 'Vertical 9:16 · 1080×1920',
      '16:9': 'Landscape 16:9 · 1920×1080',
      '1:1': 'Square 1:1 · 1080×1080',
      '4:5': 'Portrait 4:5 · 1080×1350',
      '3:4': 'Portrait 3:4 · 1080×1440',
    },
  }),
  durationSec: z
    .number()
    .min(duration.min)
    .max(duration.max)
    .default(duration.default)
    .meta({ title: 'Duration', scope: 'style', widget: 'slider', unit: 's', step: 0.5 }),
  fps: FpsSchema.default(30).meta({
    title: 'Frame rate',
    scope: 'style',
    widget: 'segmented',
    optionLabels: { '30': '30 fps', '60': '60 fps' },
  }),
  /** Seed for every pseudo-random decision; keeps renders reproducible. */
  seed: z.number().int().min(0).max(SEED_MAX).default(1).meta({ scope: 'style' }),
  style: StyleSchema.prefault({}),
  music: MusicSchema.prefault({}),
  imageProcessing: ImageProcessingSchema.prefault({}),
});

/** Engine/template-agnostic view of validated props. */
export interface BaseProps {
  readonly format: z.output<typeof FormatSchema>;
  readonly durationSec: number;
  readonly fps: z.output<typeof FpsSchema>;
  readonly seed: number;
  readonly media: Readonly<Record<string, string | readonly string[] | null>>;
  readonly texts: Readonly<Record<string, TextField>>;
  readonly params: Readonly<Record<string, unknown>>;
  readonly style: Style;
  readonly music: Music;
  readonly imageProcessing: ImageProcessing;
}
