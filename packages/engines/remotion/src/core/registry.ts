// Pure, typed registries of engine building blocks (reveal effects, transitions).
import { z } from 'zod';

export interface Registrable {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface BlockRegistry<T extends Registrable> {
  readonly kind: string;
  readonly items: readonly T[];
  readonly ids: readonly [T['id'], ...T['id'][]];
  get(id: T['id']): T;
  labels(ids?: readonly T['id'][]): Record<string, string>;
}

/** Builds a registry from definitions; ids are checked for uniqueness at load time. */
export const defineBlockRegistry = <const T extends readonly [Registrable, ...Registrable[]]>(
  kind: string,
  items: T,
): BlockRegistry<T[number]> => {
  const byId = new Map<string, T[number]>();
  for (const item of items) {
    if (byId.has(item.id)) {
      throw new Error(`${kind} "${item.id}" is registered twice`);
    }
    byId.set(item.id, item);
  }
  return {
    kind,
    items,
    ids: items.map((item) => item.id) as unknown as readonly [T[number]['id'], ...T[number]['id'][]],
    get: (id) => {
      const item = byId.get(id);
      if (!item) {
        throw new Error(`${kind} "${id}" is not registered`);
      }
      return item;
    },
    labels: (ids) =>
      Object.fromEntries((ids ?? items.map((item) => item.id)).map((id) => [id, byId.get(id)?.label ?? id])),
  };
};

export interface RegistryFieldOptions<Id extends string, A extends readonly [Id, ...Id[]]> {
  readonly title: string;
  /** Options offered by the template; defaults to every registered entry. */
  readonly allowed?: A;
  readonly default: A[number];
}

/**
 * A template prop whose options come from a registry (rendered as a select in the
 * admin): the template picks which entries are allowed and the default.
 */
export const registryField = <T extends Registrable, const A extends readonly [T['id'], ...T['id'][]]>(
  registry: BlockRegistry<T>,
  options: RegistryFieldOptions<T['id'], A>,
) => {
  const allowed = options.allowed ?? (registry.ids as unknown as A);
  for (const id of allowed) {
    registry.get(id);
  }
  if (!allowed.includes(options.default)) {
    throw new Error(`Default ${registry.kind} "${options.default}" is not in the allowed list`);
  }
  return z
    .enum(allowed)
    .default(options.default)
    .meta({ title: options.title, widget: 'select', optionLabels: registry.labels(allowed) });
};
