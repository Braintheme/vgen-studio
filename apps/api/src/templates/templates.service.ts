import { Injectable } from '@nestjs/common';
import {
  resolveTemplateDefaults,
  type TemplateDefinition,
  type TemplateDetailDto,
  type TemplateSummaryDto,
} from '@vgen/shared';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service.js';

@Injectable()
export class TemplatesService {
  /** JSON Schemas are derived from immutable template definitions; compute once. */
  private readonly schemaCache = new Map<string, Record<string, unknown>>();

  constructor(private readonly catalog: CatalogService) {}

  list(engine?: string): TemplateSummaryDto[] {
    return this.catalog.listTemplates(engine).map((template) => this.toSummary(template));
  }

  get(id: string): TemplateDetailDto {
    const template = this.catalog.getTemplate(id);
    return {
      ...this.toSummary(template),
      propsSchema: this.propsSchema(template),
      defaults: resolveTemplateDefaults(template),
      ui: template.ui
        ? {
            ...(template.ui.groups
              ? { groups: template.ui.groups.map((group) => ({ ...group, fields: [...group.fields] })) }
              : {}),
            ...(template.ui.slotActions
              ? {
                  slotActions: template.ui.slotActions.map((action) => ({
                    ...action,
                    slots: [...action.slots] as [string, string],
                  })),
                }
              : {}),
            ...(template.ui.hiddenFields ? { hiddenFields: [...template.ui.hiddenFields] } : {}),
          }
        : null,
    };
  }

  private toSummary(template: TemplateDefinition): TemplateSummaryDto {
    return {
      id: template.id,
      engine: template.engine,
      version: template.version,
      name: template.name,
      description: template.description,
      thumbnailUrl: template.thumbnailUrl ?? null,
      output: template.output,
      formats: [...template.formats],
      mediaSlots: template.mediaSlots.map((slot) => ({
        key: slot.key,
        kind: slot.kind,
        label: slot.label,
        required: slot.required,
        ...(slot.description ? { description: slot.description } : {}),
        ...(slot.multiple ? { multiple: { ...slot.multiple } } : {}),
        ...(slot.group ? { group: { size: slot.group.size, labels: [...slot.group.labels] } } : {}),
      })),
    };
  }

  private propsSchema(template: TemplateDefinition): Record<string, unknown> {
    const cached = this.schemaCache.get(template.id);
    if (cached) return cached;
    const schema = z.toJSONSchema(template.schema, { io: 'input', unrepresentable: 'any' }) as Record<
      string,
      unknown
    >;
    this.schemaCache.set(template.id, schema);
    return schema;
  }
}
