import type { MediaAssetEntity, ProjectEntity } from '@vgen/db';
import {
  QualityPresetSchema,
  StillScaleSchema,
  type ProjectDto,
  type ProjectLastRender,
  type RenderFileDto,
} from '@vgen/shared';
import { toMediaDto } from '../media/media.mapper.js';
import type { LastRenderRow } from './projects.repository.js';

/** A project's thumbnail: a photo's preview, or a clip's poster. */
export const toThumbnail = (asset: MediaAssetEntity | undefined): RenderFileDto | null => {
  if (!asset) return null;
  const dto = toMediaDto(asset);
  const url = dto.previewUrl ?? (asset.kind === 'image' ? dto.url : null);
  return url ? { assetId: asset.id, url, size: asset.size } : null;
};

const toLastRender = (row: LastRenderRow): ProjectLastRender => ({
  id: row.id,
  status: row.status,
  progress: row.progress,
  error: row.error,
  createdAt: row.createdAt.toISOString(),
  finishedAt: row.finishedAt?.toISOString() ?? null,
});

export const toProjectDto = (
  project: ProjectEntity,
  lastRender: LastRenderRow | undefined,
  thumbnail: RenderFileDto | null,
): ProjectDto => ({
  id: project.id,
  name: project.name,
  templateId: project.templateId,
  templateVersion: project.templateVersion,
  settings: project.settings,
  media: project.media,
  quality: QualityPresetSchema.parse(project.quality),
  scale: StillScaleSchema.parse(project.scale),
  presetId: project.presetId,
  thumbnail,
  lastRender: lastRender ? toLastRender(lastRender) : null,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});
