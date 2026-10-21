import { z } from 'zod';

/** Named delivery quality presets; concrete encoder values live in worker config. */
export const QUALITY_PRESETS = ['social', 'high'] as const;
export const QualityPresetSchema = z.enum(QUALITY_PRESETS);
export type QualityPreset = z.infer<typeof QualityPresetSchema>;
export const DEFAULT_QUALITY_PRESET: QualityPreset = 'social';

/** Pixel density of image outputs: 1 = the format's size (1080 px wide), 2 = twice as large. */
export const STILL_SCALES = [1, 2] as const;
export const StillScaleSchema = z.union([z.literal(1), z.literal(2)]);
export type StillScale = z.infer<typeof StillScaleSchema>;
export const DEFAULT_STILL_SCALE: StillScale = 1;

/** JPEG quality of delivered images (re-compressed by social apps anyway). */
export const STILL_JPEG_QUALITY = 90;
