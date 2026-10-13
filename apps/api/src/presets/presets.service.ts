import { Injectable } from '@nestjs/common';
import type { StylePresetEntity } from '@vgen/db';
import {
  deepMerge,
  extractPresetProps,
  resolveTemplateDefaults,
  type CreateStylePresetRequest,
  type StylePresetDto,
  type TemplateDefinition,
  type UpdateStylePresetRequest,
} from '@vgen/shared';
import { CatalogService } from '../catalog/catalog.service.js';
import { NotFoundError, ValidationFailedError, issueToDetail } from '../common/errors.js';
import { PresetsRepository } from './presets.repository.js';

const toPresetDto = (preset: StylePresetEntity): StylePresetDto => ({
  id: preset.id,
  name: preset.name,
  templateId: preset.templateId,
  templateVersion: preset.templateVersion,
  props: preset.props,
  isDefault: preset.isDefault,
  createdAt: preset.createdAt.toISOString(),
  updatedAt: preset.updatedAt.toISOString(),
});

/** Style presets: the reusable look of a template (never its content). */
@Injectable()
export class PresetsService {
  constructor(
    private readonly repository: PresetsRepository,
    private readonly catalog: CatalogService,
  ) {}

  async list(templateId?: string): Promise<StylePresetDto[]> {
    return (await this.repository.list(templateId)).map(toPresetDto);
  }

  async get(id: string): Promise<StylePresetDto> {
    return toPresetDto(await this.require(id));
  }

  async findName(id: string): Promise<string | null> {
    return (await this.repository.findById(id))?.name ?? null;
  }

  /** The first preset of a template becomes its default. */
  async create(request: CreateStylePresetRequest): Promise<StylePresetDto> {
    const template = this.catalog.getTemplate(request.templateId);
    const preset = await this.repository.save({
      name: request.name,
      templateId: template.id,
      templateVersion: template.version,
      props: this.styleOf(template, request.props),
      isDefault: !(await this.repository.hasDefault(template.id)),
    });
    return toPresetDto(preset);
  }

  async update(id: string, request: UpdateStylePresetRequest): Promise<StylePresetDto> {
    const preset = await this.require(id);
    const template = this.catalog.getTemplate(preset.templateId);
    if (request.name !== undefined) preset.name = request.name;
    if (request.props !== undefined) {
      preset.props = this.styleOf(template, request.props);
      preset.templateVersion = template.version;
    }
    const saved = await this.repository.save(preset);
    return toPresetDto(saved);
  }

  /** How many presets use each music track (shown before a track is deleted). */
  countByTrack(): Promise<Map<string, number>> {
    return this.repository.countByTrack();
  }

  async setDefault(id: string): Promise<StylePresetDto> {
    const preset = await this.require(id);
    await this.repository.setDefault(id, preset.templateId);
    return this.get(id);
  }

  /** Renders that used the preset keep working (their props snapshot is self-contained). */
  async remove(id: string): Promise<void> {
    await this.require(id);
    await this.repository.delete(id);
  }

  /**
   * Keeps only style-scoped fields and checks that, applied to the template defaults,
   * they form valid settings for the CURRENT template version.
   */
  private styleOf(
    template: TemplateDefinition,
    props: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const style = extractPresetProps(template, props);
    const parsed = template.settingsSchema.safeParse(deepMerge(resolveTemplateDefaults(template), style));
    if (!parsed.success) {
      throw new ValidationFailedError(
        `Preset does not match template "${template.id}"`,
        parsed.error.issues.map((issue) => issueToDetail(issue, 'props')),
      );
    }
    return extractPresetProps(template, parsed.data);
  }

  private async require(id: string): Promise<StylePresetEntity> {
    const preset = await this.repository.findById(id);
    if (!preset) throw new NotFoundError('Style preset', id);
    return preset;
  }
}
