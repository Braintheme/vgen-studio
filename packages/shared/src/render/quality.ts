import { z } from 'zod';

/** Named delivery quality presets; concrete encoder values live in worker config. */
export const QUALITY_PRESETS = ['social', 'high'] as const;
export const QualityPresetSchema = z.enum(QUALITY_PRESETS);
export type QualityPreset = z.infer<typeof QualityPresetSchema>;
export const DEFAULT_QUALITY_PRESET: QualityPreset = 'social';
