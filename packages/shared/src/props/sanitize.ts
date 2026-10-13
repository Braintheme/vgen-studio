import { AssetIdSchema } from '../ids.js';
import type { BaseProps } from '../schema/base.js';
import { resolveTemplateDefaults, type TemplateDefinition } from '../template/definition.js';
import { deepMerge, isPlainObject, type PlainObject } from '../util.js';

export interface SanitizeResult<T> {
  readonly value: T;
  /** Dot paths that were invalid and fell back to the template defaults. */
  readonly resetPaths: readonly string[];
}

/** Bounded: every round removes at least one offending value. */
const MAX_ROUNDS = 20;
const ROOT_PATH = '(all)';

/** Removes `path` from `target`, or the deepest existing ancestor of it. */
const removePath = (target: PlainObject, path: readonly string[]): void => {
  let node: unknown = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index] ?? '';
    const next: unknown = isPlainObject(node) ? node[key] : undefined;
    if (!isPlainObject(next)) {
      if (isPlainObject(node)) Reflect.deleteProperty(node, key);
      return;
    }
    node = next;
  }
  const last = path[path.length - 1];
  if (last !== undefined && isPlainObject(node)) Reflect.deleteProperty(node, last);
};

/**
 * Brings stored settings (a draft, an old preset) in line with the CURRENT template
 * schema: valid values are kept, invalid ones fall back to the template defaults.
 * Never throws.
 */
export const sanitizeTemplateSettings = <P extends BaseProps>(
  template: TemplateDefinition<P>,
  input: unknown,
): SanitizeResult<Omit<P, 'media'>> => {
  const defaults = resolveTemplateDefaults(template);
  const working = (isPlainObject(input) ? deepMerge({}, input) : {}) as PlainObject;
  delete working['media'];
  const resetPaths: string[] =
    isPlainObject(input) || input === undefined || input === null ? [] : [ROOT_PATH];

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const parsed = template.settingsSchema.safeParse(deepMerge(defaults, working));
    if (parsed.success) return { value: parsed.data, resetPaths };
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String);
      if (path.length === 0) return { value: defaults, resetPaths: [ROOT_PATH] };
      removePath(working, path);
      resetPaths.push(path.join('.'));
    }
  }
  return { value: defaults, resetPaths: [ROOT_PATH] };
};

export type MediaRefs = Readonly<Record<string, string | readonly string[] | null>>;

/** Keeps only well-formed asset references for the template's current slots. */
export const sanitizeMediaRefs = (template: TemplateDefinition, input: unknown): MediaRefs => {
  const source: PlainObject = isPlainObject(input) ? input : {};
  const isAssetId = (value: unknown): value is string => AssetIdSchema.safeParse(value).success;
  return Object.fromEntries(
    template.mediaSlots.map((slot): [string, MediaRefs[string]] => {
      const value = source[slot.key];
      if (slot.multiple) {
        const ids: string[] = Array.isArray(value) ? (value as unknown[]).filter(isAssetId) : [];
        return [slot.key, ids.slice(0, slot.multiple.max)];
      }
      return [slot.key, isAssetId(value) ? value : null];
    }),
  );
};
