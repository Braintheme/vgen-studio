import type { MediaAssetEntity, RenderJobEntity } from '@vgen/db';
import { FormatSchema, QualityPresetSchema, StillScaleSchema, type RenderJobDto } from '@vgen/shared';
import { mediaFileUrl } from '../media/media.mapper.js';

export const toRenderDto = (
  job: RenderJobEntity,
  assets: ReadonlyMap<string, MediaAssetEntity>,
): RenderJobDto => {
  const output = job.outputAssetId ? assets.get(job.outputAssetId) : undefined;
  const thumbnail = job.thumbnailAssetId ? assets.get(job.thumbnailAssetId) : undefined;
  const slides = job.slideAssetIds.flatMap((assetId) => {
    const slide = assets.get(assetId);
    return slide ? [slide] : [];
  });
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
    scale: StillScaleSchema.parse(job.scale),
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
    stills:
      slides.length > 0
        ? {
            slides: slides.map((slide) => ({
              assetId: slide.id,
              name: slide.originalName,
              url: mediaFileUrl(slide.id),
              downloadUrl: `${mediaFileUrl(slide.id)}?download=1`,
              size: slide.size,
              width: slide.width,
              height: slide.height,
            })),
            archiveUrl: `/api/v1/renders/${job.id}/archive`,
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
