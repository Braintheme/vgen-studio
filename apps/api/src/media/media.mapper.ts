import type { MediaAssetEntity } from '@vgen/db';
import type { MediaAssetDto, VideoInfoDto } from '@vgen/shared';
import { z } from 'zod';

export const mediaFileUrl = (id: string): string => `/api/v1/media/${id}/file`;

const FilmstripMetaSchema = z.object({
  frames: z.number(),
  frameWidth: z.number(),
  frameHeight: z.number(),
  intervalSec: z.number(),
});

const variantUrl = (asset: MediaAssetEntity, metaKey: string, variant: string): string | null =>
  typeof asset.meta[metaKey] === 'string' ? `${mediaFileUrl(asset.id)}?variant=${variant}` : null;

const videoInfo = (asset: MediaAssetEntity): VideoInfoDto | null => {
  if (asset.kind !== 'video') return null;
  const filmstrip = FilmstripMetaSchema.safeParse(asset.meta['filmstrip']);
  const filmstripUrl = variantUrl(asset, 'filmstripKey', 'filmstrip');
  return {
    fps: typeof asset.meta['fps'] === 'number' ? asset.meta['fps'] : 30,
    hasAudio: asset.meta['hasAudio'] === true,
    proxyUrl: variantUrl(asset, 'proxyKey', 'proxy'),
    filmstrip: filmstrip.success && filmstripUrl ? { url: filmstripUrl, ...filmstrip.data } : null,
  };
};

export const toMediaDto = (asset: MediaAssetEntity): MediaAssetDto => ({
  id: asset.id,
  kind: asset.kind,
  role: asset.role,
  originalName: asset.originalName,
  mime: asset.mime,
  size: asset.size,
  width: asset.width,
  height: asset.height,
  durationSec: asset.durationSec,
  createdAt: asset.createdAt.toISOString(),
  url: mediaFileUrl(asset.id),
  previewUrl: variantUrl(asset, 'previewKey', 'preview'),
  peaksUrl: variantUrl(asset, 'peaksKey', 'peaks'),
  video: videoInfo(asset),
});
