import type { MediaAssetEntity, RenderJobEntity } from '@vgen/db';
import { FormatSchema, QualityPresetSchema, type RenderJobDto } from '@vgen/shared';
import { mediaFileUrl } from '../media/media.mapper.js';

export const toRenderDto = (
  job: RenderJobEntity,
  assets: ReadonlyMap<string, MediaAssetEntity>,
): RenderJobDto => {
  const output = job.outputAssetId ? assets.get(job.outputAssetId) : undefined;
  const thumbnail = job.thumbnailAssetId ? assets.get(job.thumbnailAssetId) : undefined;
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    engine: job.engine,
    engineVersion: job.engineVersion,
    templateId: job.templateId,
    templateVersion: job.templateVersion,
    props: job.props,
    format: FormatSchema.parse(job.format),
    quality: QualityPresetSchema.parse(job.quality),
    presetId: job.presetId,
    outputName: job.outputName,
    output: output
      ? {
          assetId: output.id,
          url: mediaFileUrl(output.id),
          downloadUrl: `${mediaFileUrl(output.id)}?download=1`,
          size: output.size,
          durationSec: output.durationSec,
        }
      : null,
    thumbnail: thumbnail
      ? { assetId: thumbnail.id, url: mediaFileUrl(thumbnail.id), size: thumbnail.size }
      : null,
    error: job.error,
    attempts: job.attempts,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
};
