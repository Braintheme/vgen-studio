import { z } from 'zod';

export const MusicTrackDtoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  assetId: z.uuid(),
  durationSec: z.number(),
  isDefault: z.boolean(),
  /** Audio file (supports HTTP Range). */
  url: z.string(),
  peaksUrl: z.string().nullable(),
  /** Style presets that use this track; after deletion they fall back to the default track. */
  presetCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});
export type MusicTrackDto = z.infer<typeof MusicTrackDtoSchema>;

const TitleSchema = z.string().trim().min(1).max(256);

/** Registers an uploaded audio asset (POST /media first) as a library track. */
export const CreateMusicTrackRequestSchema = z.object({
  assetId: z.uuid(),
  title: TitleSchema,
});
export type CreateMusicTrackRequest = z.infer<typeof CreateMusicTrackRequestSchema>;

export const UpdateMusicTrackRequestSchema = z.object({ title: TitleSchema });
export type UpdateMusicTrackRequest = z.infer<typeof UpdateMusicTrackRequestSchema>;
