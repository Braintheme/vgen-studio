import { Injectable } from '@nestjs/common';
import type { MediaAssetEntity, ProjectEntity } from '@vgen/db';
import {
  copyName,
  deepMerge,
  extractPresetProps,
  resolveTemplateDefaults,
  sanitizeMediaRefs,
  type ApiErrorDetail,
  type CreateProjectRequest,
  type CreateProjectRequestSchema,
  type DeleteProjectsResponse,
  type Paginated,
  type ProjectDayDto,
  type ProjectDaysQuery,
  type ProjectDto,
  type ProjectListQuery,
  type ProjectNeighborsDto,
  type ProjectSelectableQuery,
  type RenderProjectsResponse,
  type TemplateDefinition,
  type UpdateProjectRequest,
} from '@vgen/shared';
import { QueryFailedError } from 'typeorm';
import type { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service.js';
import { AppError, NotFoundError, ValidationFailedError, issueToDetail } from '../common/errors.js';
import { MediaService } from '../media/media.service.js';
import { PresetsService } from '../presets/presets.service.js';
import { RendersService } from '../renders/renders.service.js';
import { toProjectDto, toThumbnail } from './projects.mapper.js';
import { ProjectsRepository } from './projects.repository.js';

type CreateProjectInput = z.output<typeof CreateProjectRequestSchema>;
type MediaInput = NonNullable<CreateProjectRequest['media']>;

const isForeignKeyError = (error: unknown): boolean =>
  error instanceof QueryFailedError && (error.driverError as { code?: unknown }).code === '23503';

const idsOf = (value: string | readonly string[] | null | undefined): readonly string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : value;

/** "Props do not match…: props.title: Required" — the reason a project could not start, in one line. */
const describe = (error: AppError): string => {
  const details = (error.details ?? []).map((detail) => `${detail.path}: ${detail.message}`);
  return details.length > 0 ? `${error.message}: ${details.join('; ')}` : error.message;
};

/**
 * Projects: one future video each (template, settings, media), kept on the server so a script
 * (Claude) can prepare them and the owner reviews, fixes and renders them later.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly catalog: CatalogService,
    private readonly media: MediaService,
    private readonly presets: PresetsService,
    private readonly renders: RendersService,
  ) {}

  /**
   * From a preset (its template) or a template (with its default preset, as a fresh editor
   * draft): template defaults <- preset style <- the request's settings. Settings and media are
   * checked strictly, so a script learns at once what is wrong.
   */
  async create(request: CreateProjectInput): Promise<ProjectDto> {
    const preset = request.presetId
      ? await this.presets.get(request.presetId)
      : request.templateId
        ? ((await this.presets.list(request.templateId)).find((candidate) => candidate.isDefault) ?? null)
        : null;
    const templateId = request.presetId ? preset?.templateId : request.templateId;
    if (request.presetId && request.templateId && request.templateId !== templateId) {
      throw new ValidationFailedError('The preset belongs to another template', [
        { path: 'presetId', message: `Preset of "${templateId ?? ''}", not "${request.templateId}"` },
      ]);
    }
    const template = this.catalog.getTemplate(templateId ?? '');
    const settings = this.checkSettings(
      template,
      deepMerge(
        deepMerge(
          resolveTemplateDefaults(template),
          preset ? extractPresetProps(template, preset.props) : {},
        ),
        request.settings ?? {},
      ),
    );
    const media = await this.checkMedia(template, request.media ?? {});
    const project = await this.repository.create({
      name: request.name ?? preset?.name ?? template.name,
      templateId: template.id,
      templateVersion: template.version,
      settings,
      media,
      quality: request.quality,
      scale: request.scale,
      presetId: preset?.id ?? null,
    });
    return this.get(project.id);
  }

  async get(id: string): Promise<ProjectDto> {
    const [dto] = await this.toDtos([await this.require(id)]);
    if (!dto) throw new NotFoundError('Project', id);
    return dto;
  }

  /** For the editor's Prev / Next: the project's place in the list and its neighbours. */
  async neighbors(id: string): Promise<ProjectNeighborsDto> {
    const found = await this.repository.neighbors(id);
    if (!found) throw new NotFoundError('Project', id);
    const link = (pos: number) => {
      const row = found.rows.find((candidate) => candidate.pos === pos);
      return row ? { id: row.id, name: row.name } : null;
    };
    return {
      position: found.position,
      total: found.total,
      previous: link(found.position - 1),
      next: link(found.position + 1),
    };
  }

  async list(query: ProjectListQuery): Promise<Paginated<ProjectDto>> {
    const { items, total } = await this.repository.list(query);
    return { items: await this.toDtos(items), total, page: query.page, pageSize: query.pageSize };
  }

  days(query: ProjectDaysQuery): Promise<ProjectDayDto[]> {
    return this.repository.days(query);
  }

  /** Projects in a scope, optionally of one day: what "select the day" picks. */
  async selectable(query: ProjectSelectableQuery): Promise<ProjectDto[]> {
    return this.toDtos(await this.repository.selectable(query));
  }

  /**
   * Saves the editor's changes. Settings are stored as the editor holds them (they may be
   * incomplete while the owner works); a content change moves `updatedAt` ("edited since render").
   */
  async update(id: string, patch: UpdateProjectRequest): Promise<ProjectDto> {
    const project = await this.require(id);
    const template = this.catalog.getTemplate(project.templateId);
    const contentChanged = (['settings', 'media', 'quality', 'scale', 'presetId'] as const).some(
      (key) => patch[key] !== undefined,
    );
    await this.repository
      .update(id, {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.settings === undefined ? {} : { settings: patch.settings }),
        ...(patch.media === undefined
          ? {}
          : { media: sanitizeMediaRefs(template, patch.media) as ProjectEntity['media'] }),
        ...(patch.quality === undefined ? {} : { quality: patch.quality }),
        ...(patch.scale === undefined ? {} : { scale: patch.scale }),
        ...(patch.presetId === undefined ? {} : { presetId: patch.presetId }),
        ...(contentChanged ? { updatedAt: new Date(), templateVersion: template.version } : {}),
      })
      .catch((error: unknown) => {
        if (isForeignKeyError(error)) {
          throw new ValidationFailedError('Unknown style preset', [
            { path: 'presetId', message: 'Unknown preset' },
          ]);
        }
        throw error;
      });
    return this.get(id);
  }

  /**
   * A copy of the project's content (template, settings, media, quality, scale, preset), as it
   * is, even if unfinished; renders are not copied, so the copy is "not rendered".
   */
  async duplicate(id: string, name?: string): Promise<ProjectDto> {
    const source = await this.require(id);
    const copy = await this.repository.create({
      name: name ?? copyName(source.name),
      templateId: source.templateId,
      templateVersion: source.templateVersion,
      settings: structuredClone(source.settings),
      media: structuredClone(source.media),
      quality: source.quality,
      scale: source.scale,
      presetId: source.presetId,
    });
    return this.get(copy.id);
  }

  async remove(id: string): Promise<void> {
    const [deleted] = await this.repository.delete([id]);
    if (!deleted) throw new NotFoundError('Project', id);
  }

  async removeMany(ids: readonly string[]): Promise<DeleteProjectsResponse> {
    return { deleted: await this.repository.delete([...new Set(ids)]) };
  }

  /**
   * Queues a render per project, built exactly as the editor builds it. A project that cannot
   * start (invalid settings, missing media, unknown project) is reported; the others go on.
   */
  async render(ids: readonly string[]): Promise<RenderProjectsResponse> {
    const unique = [...new Set(ids)];
    const projects = new Map(
      (await this.repository.findByIds(unique)).map((project) => [project.id, project]),
    );
    const result: RenderProjectsResponse = { queued: [], failed: [] };
    for (const projectId of unique) {
      const project = projects.get(projectId);
      if (!project) {
        result.failed.push({ projectId, message: 'Project not found' });
        continue;
      }
      try {
        const missing = this.missingMedia(project);
        if (missing.length > 0) {
          result.failed.push({ projectId, message: `Missing media: ${missing.join(', ')}` });
          continue;
        }
        const render = await this.renders.create({
          templateId: project.templateId,
          props: { ...project.settings, media: project.media },
          quality: project.quality,
          scale: project.scale === 2 ? 2 : 1,
          presetId: project.presetId,
          projectId,
        });
        result.queued.push({ projectId, renderId: render.id });
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        result.failed.push({ projectId, message: describe(error) });
      }
    }
    return result;
  }

  /** Labels of the required slots a project leaves empty (conditional slots are left to the render's checks). */
  private missingMedia(project: ProjectEntity): string[] {
    return this.catalog
      .getTemplate(project.templateId)
      .mediaSlots.filter((slot) => slot.required && !slot.requiredWhen)
      .filter((slot) => idsOf(project.media[slot.key]).length < (slot.multiple?.min ?? 1))
      .map((slot) => slot.label);
  }

  private checkSettings(template: TemplateDefinition, input: unknown): Record<string, unknown> {
    const merged = { ...(input as Record<string, unknown>) };
    delete merged['media'];
    const parsed = template.settingsSchema.safeParse(merged);
    if (!parsed.success) {
      throw new ValidationFailedError(
        `Settings do not match template "${template.id}"`,
        parsed.error.issues.map((issue) => issueToDetail(issue, 'settings')),
      );
    }
    return parsed.data;
  }

  /** Known slots only, files that exist and are of the slot's kind, lists within their size. */
  private async checkMedia(template: TemplateDefinition, input: MediaInput): Promise<ProjectEntity['media']> {
    const details: ApiErrorDetail[] = [];
    const slots = new Map(template.mediaSlots.map((slot) => [slot.key, slot]));
    for (const key of Object.keys(input)) {
      if (!slots.has(key))
        details.push({
          path: `media.${key}`,
          message: `Unknown slot; slots: ${[...slots.keys()].join(', ')}`,
        });
    }
    const ids = Object.values(input).flatMap(idsOf);
    const assets = new Map((await this.media.findMany(ids)).map((asset) => [asset.id, asset]));
    for (const slot of template.mediaSlots) {
      const value = input[slot.key];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) !== Boolean(slot.multiple)) {
        details.push({
          path: `media.${slot.key}`,
          message: slot.multiple ? 'Expected a list of ids' : 'Expected one id',
        });
        continue;
      }
      if (slot.multiple && idsOf(value).length > slot.multiple.max) {
        details.push({ path: `media.${slot.key}`, message: `At most ${String(slot.multiple.max)} files` });
      }
      for (const id of idsOf(value)) {
        const asset = assets.get(id);
        if (!asset) details.push({ path: `media.${slot.key}`, message: `Media "${id}" not found` });
        else if (asset.kind !== slot.kind) {
          details.push({
            path: `media.${slot.key}`,
            message: `"${asset.originalName}" is ${asset.kind}, the slot takes ${slot.kind}`,
          });
        }
      }
    }
    if (details.length > 0) throw new ValidationFailedError('Media do not fit the template', details);
    return sanitizeMediaRefs(template, input) as ProjectEntity['media'];
  }

  private async require(id: string): Promise<ProjectEntity> {
    const project = await this.repository.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  /** DTOs with each project's last render and thumbnail (first file in slot order). */
  private async toDtos(projects: readonly ProjectEntity[]): Promise<ProjectDto[]> {
    const firstIds = new Map(projects.map((project) => [project.id, this.firstMediaId(project)] as const));
    const ids = [...firstIds.values()].filter((id): id is string => id !== null);
    const [renders, assets] = await Promise.all([
      this.repository.lastRenders(projects.map((project) => project.id)),
      this.media.findMany(ids),
    ]);
    const byId = new Map<string, MediaAssetEntity>(assets.map((asset) => [asset.id, asset]));
    return projects.map((project) => {
      const first = firstIds.get(project.id);
      return toProjectDto(project, renders.get(project.id), toThumbnail(first ? byId.get(first) : undefined));
    });
  }

  /** Slot keys in the template's order (stored order if the template is gone). */
  private slotKeys(project: ProjectEntity): readonly string[] {
    try {
      return this.catalog.getTemplate(project.templateId).mediaSlots.map((slot) => slot.key);
    } catch (error) {
      if (error instanceof NotFoundError) return Object.keys(project.media);
      throw error;
    }
  }

  private firstMediaId(project: ProjectEntity): string | null {
    const keys = this.slotKeys(project);
    for (const key of keys) {
      const [first] = idsOf(project.media[key]);
      if (first) return first;
    }
    return null;
  }
}
