import { TemplateDefinitionError } from '../errors.js';
import type { EngineManifest } from '../engine/engine.js';
import { SLUG_PATTERN } from '../ids.js';
import type { TemplateDefinition } from '../template/definition.js';

const SLOT_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Static sanity checks run when a template is registered. Throws on problems. */
export const assertValidTemplate = (template: TemplateDefinition, engine?: EngineManifest): void => {
  const problems: string[] = [];

  if (!SLUG_PATTERN.test(template.id)) {
    problems.push(`id "${template.id}" must be kebab-case`);
  }
  if (!template.version) {
    problems.push('version is required');
  }
  if (template.formats.length === 0) {
    problems.push('at least one format is required');
  }

  const slotKeys = template.mediaSlots.map((slot) => slot.key);
  const duplicates = slotKeys.filter((key, index) => slotKeys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    problems.push(`duplicate media slot keys: ${[...new Set(duplicates)].join(', ')}`);
  }
  for (const key of slotKeys) {
    if (!SLOT_KEY_PATTERN.test(key)) {
      problems.push(`media slot key "${key}" must be camelCase`);
    }
  }
  for (const slot of template.mediaSlots) {
    const { group, multiple } = slot;
    if (!group) continue;
    if (!multiple) {
      problems.push(`media slot "${slot.key}": a group needs a list slot (multiple)`);
    } else if (group.size < 2 || multiple.min % group.size !== 0 || multiple.max % group.size !== 0) {
      problems.push(`media slot "${slot.key}": min and max must be multiples of the group size (>= 2)`);
    }
    if (group.labels.length !== group.size) {
      problems.push(`media slot "${slot.key}": the group needs one label per item`);
    }
  }
  for (const action of template.ui?.slotActions ?? []) {
    for (const slot of action.slots) {
      if (!slotKeys.includes(slot)) {
        problems.push(`ui slot action "${action.type}" references unknown slot "${slot}"`);
      }
    }
  }

  const defaults = template.settingsSchema.safeParse(template.defaults);
  if (!defaults.success) {
    const details = defaults.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    problems.push(`defaults do not match the schema (${details.join('; ')})`);
  }

  if (engine) {
    if (template.engine !== engine.id) {
      problems.push(`declares engine "${template.engine}" but is provided by "${engine.id}"`);
    }
    const unsupported = template.formats.filter((format) => !engine.capabilities.formats.includes(format));
    if (unsupported.length > 0) {
      problems.push(`formats not supported by engine "${engine.id}": ${unsupported.join(', ')}`);
    }
    if (template.output === 'stills' && !engine.capabilities.stills) {
      problems.push(`engine "${engine.id}" does not render image outputs`);
    }
  }

  if (problems.length > 0) {
    throw new TemplateDefinitionError(template.id, problems);
  }
};
