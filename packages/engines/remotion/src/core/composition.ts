import type { BaseProps, ResolvedImage, ResolvedMedia, ResolvedMediaItem } from '@vgen/shared';
import { z } from 'zod';

const ResolvedImageSchema = z.object({
  kind: z.literal('image'),
  src: z.string(),
  width: z.number(),
  height: z.number(),
});

const ResolvedVideoSchema = z.object({
  kind: z.literal('video'),
  src: z.string(),
  width: z.number(),
  height: z.number(),
  durationSec: z.number(),
});

const ResolvedItemSchema = z.discriminatedUnion('kind', [ResolvedImageSchema, ResolvedVideoSchema]);

/** Used as part of `<Composition schema>` so Remotion Studio can edit inputs. */
export const ResolvedAssetsSchema = z.object({
  media: z.record(z.string(), z.union([ResolvedItemSchema, z.array(ResolvedItemSchema), z.null()])),
  music: z.object({ src: z.string(), durationSec: z.number() }).nullable(),
});

/** Resolved assets as validated by the composition schema (structurally `ResolvedAssets`). */
export type RemotionAssets = z.output<typeof ResolvedAssetsSchema>;

/**
 * Input props of every Remotion template composition: validated template props plus
 * media resolved to URLs (worker asset server when rendering, API when previewing).
 */
export type RemotionTemplateProps<P extends BaseProps = BaseProps> = {
  readonly props: P;
  readonly assets: RemotionAssets;
};

export const imageAsset = (media: ResolvedMedia, key: string): ResolvedImage | null => {
  const value = media[key];
  if (!value || Array.isArray(value)) {
    return null;
  }
  // Array.isArray does not narrow readonly arrays, hence the explicit item type.
  const item = value as ResolvedMediaItem;
  return item.kind === 'image' ? item : null;
};

/** Neutral stand-in for media that has not been uploaded yet (live preview). */
export const placeholderImage = (label: string, from = '#2a2d36', to = '#14161c'): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><text x="540" y="980" fill="rgba(255,255,255,0.35)" font-family="sans-serif" font-size="64" font-weight="700" letter-spacing="12" text-anchor="middle">${label}</text></svg>`,
  )}`;
