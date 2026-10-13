import type { MediaAssetEntity } from '@vgen/db';
import type { MediaAssetDto } from '@vgen/shared';

export const mediaFileUrl = (id: string): string => `/api/v1/media/${id}/file`;

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
  previewUrl:
    typeof asset.meta['previewKey'] === 'string' ? `${mediaFileUrl(asset.id)}?variant=preview` : null,
  peaksUrl: typeof asset.meta['peaksKey'] === 'string' ? `${mediaFileUrl(asset.id)}?variant=peaks` : null,
});
