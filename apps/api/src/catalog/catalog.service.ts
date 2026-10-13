import { Injectable } from '@nestjs/common';
import { createCatalog, ENGINE_MANIFESTS } from '@vgen/catalog';
import type { CatalogRegistries, EngineManifest, TemplateDefinition } from '@vgen/shared';
import { NotFoundError } from '../common/errors.js';
import { TypedConfigService } from '../config/typed-config.service.js';

/** Read access to installed engines and templates (from @vgen/catalog, never from the DB). */
@Injectable()
export class CatalogService {
  private readonly registries: CatalogRegistries;

  constructor(config: TypedConfigService) {
    const disabled = new Set(config.get('DISABLED_ENGINES'));
    this.registries = createCatalog(ENGINE_MANIFESTS.filter((engine) => !disabled.has(engine.id)));
  }

  listEngines(): EngineManifest[] {
    return this.registries.engines.list();
  }

  getEngine(id: string): EngineManifest {
    const engine = this.registries.engines.find(id);
    if (!engine) throw new NotFoundError('Engine', id);
    return engine;
  }

  listTemplates(engine?: string): TemplateDefinition[] {
    return engine ? this.registries.templates.listByEngine(engine) : this.registries.templates.list();
  }

  getTemplate(id: string): TemplateDefinition {
    const template = this.registries.templates.find(id);
    if (!template) throw new NotFoundError('Template', id);
    return template;
  }
}
