export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PlainObject = Record<string, unknown>;

export const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

/**
 * Recursively merges plain objects; arrays and scalars from `override` replace `base`.
 * `undefined` values in `override` are ignored. Inputs are never mutated.
 */
export const deepMerge = (base: unknown, override: unknown): unknown => {
  if (override === undefined) {
    return clone(base);
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return clone(override);
  }
  const result: PlainObject = clone(base) as PlainObject;
  for (const [key, value] of Object.entries(override)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
};

const clone = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
};

/** Structural equality of JSON-like data (key order does not matter). */
export const isDeepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isDeepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length && keys.every((key) => key in b && isDeepEqual(a[key], b[key]))
    );
  }
  return false;
};

/** Value at a dot path (`params.clip.startSec`), or undefined. */
export const valueAtPath = (root: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (isPlainObject(node) ? node[key] : undefined), root);
