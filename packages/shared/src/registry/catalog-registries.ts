import type { EngineManifest } from '../engine/engine.js';
import type { TemplateDefinition } from '../template/definition.js';
import { Registry } from './registry.js';
import { assertValidTemplate } from './validate-template.js';

export class EngineRegistry<E extends EngineManifest = EngineManifest> extends Registry<E> {
  constructor() {
    super('Engine');
  }
}

export class TemplateRegistry extends Registry<TemplateDefinition> {
  constructor() {
    super('Template');
  }

  listByEngine(engineId: string): TemplateDefinition[] {
    return this.list().filter((template) => template.engine === engineId);
  }
}

export interface CatalogRegistries<E extends EngineManifest = EngineManifest> {
  readonly engines: EngineRegistry<E>;
  readonly templates: TemplateRegistry;
}

/**
 * Builds engine + template registries from engine manifests. Template ids are
 * global, so two engines cannot ship templates with the same id.
 */
export const buildRegistries = <E extends EngineManifest>(manifests: readonly E[]): CatalogRegistries<E> => {
  const engines = new EngineRegistry<E>();
  const templates = new TemplateRegistry();
  for (const manifest of manifests) {
    engines.register(manifest);
    for (const template of manifest.templates) {
      assertValidTemplate(template, manifest);
      templates.register(template);
    }
  }
  return { engines, templates };
};
