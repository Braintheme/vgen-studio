import { z } from 'zod';

/** Kebab-case identifier used for engines and templates (e.g. `before-after`). */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const SlugSchema = z.string().regex(SLUG_PATTERN, 'Must be a kebab-case identifier');

export const AssetIdSchema = z.uuid();
export type AssetId = z.infer<typeof AssetIdSchema>;
