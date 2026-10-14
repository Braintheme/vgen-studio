// Pure JSON Schema -> form description. Turns the props JSON Schema of a template
// (with vgen field metadata: title, widget, optionLabels, unit, step) into typed field
// specs that the schema-form components render. No Vue here: fully unit-testable.
import { FONTS } from '@vgen/shared';

export interface FieldOption {
  readonly value: string | number;
  readonly label: string;
}

interface FieldBase {
  /** Dot path into the form values, e.g. `texts.title` or `style.colors.accent`. */
  readonly path: string;
  readonly label: string;
}

type ChoiceField<K extends string> = FieldBase & {
  readonly kind: K;
  readonly options: readonly FieldOption[];
};

export type FieldSpec =
  | ChoiceField<'select'>
  | ChoiceField<'segmented'>
  | ChoiceField<'font'>
  | (FieldBase & { readonly kind: 'switch' })
  | (FieldBase & { readonly kind: 'color' })
  | (FieldBase & {
      readonly kind: 'slider';
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly unit: string | null;
    })
  | (FieldBase & {
      readonly kind: 'number';
      readonly min: number | null;
      readonly max: number | null;
      readonly unit: string | null;
    })
  /** A template text: `{ enabled, value }` with an on/off switch. */
  | (FieldBase & { readonly kind: 'text'; readonly multiline: boolean; readonly maxLength: number | null })
  | (FieldBase & { readonly kind: 'string'; readonly maxLength: number | null })
  /**
   * A widget the generic form does not know (e.g. `music-track`); the screen supplies it.
   * Compound values (objects) with such a widget stay one field; `limits` are their bounds.
   */
  | (FieldBase & {
      readonly kind: 'custom';
      readonly widget: string;
      readonly limits: { readonly min: number; readonly max: number } | null;
    });

export type FieldKind = FieldSpec['kind'];

export interface SectionLayout {
  readonly id: string;
  readonly title: string;
  /** Field or object paths; objects expand into all their (visible) fields. */
  readonly paths: readonly string[];
}

export interface FormSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly FieldSpec[];
}

type Node = Readonly<Record<string, unknown>>;

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (node: Node, key: string): string | null => (typeof node[key] === 'string' ? node[key] : null);
const num = (node: Node, key: string): number | null => (typeof node[key] === 'number' ? node[key] : null);

const properties = (node: Node): Readonly<Record<string, Node>> => {
  const value = node['properties'];
  return isNode(value) ? (value as Readonly<Record<string, Node>>) : {};
};

/** Widgets the generic form renders itself; any other widget id becomes a `custom` field. */
const GENERIC_WIDGETS: ReadonlySet<string> = new Set([
  'text',
  'textarea',
  'number',
  'slider',
  'switch',
  'select',
  'segmented',
  'color',
  'font',
]);

const DEFAULT_SLIDER_STEP = 1;
/** Enums with at most this many options render as a segmented control. */
const SEGMENTED_MAX_OPTIONS = 3;
const FONT_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  FONTS.map((font) => [font.id, font.family]),
);

const humanize = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Sec$/, '')
    .replace(/^./, (first) => first.toUpperCase());

/** Enum values, or the consts of an `anyOf` of literals (e.g. fps 30 | 60). */
const enumValues = (node: Node): (string | number)[] | null => {
  const values = node['enum'];
  if (Array.isArray(values))
    return values.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
  const anyOf = node['anyOf'];
  if (Array.isArray(anyOf) && anyOf.every((option) => isNode(option) && 'const' in option)) {
    return anyOf
      .map((option) => (option as Node)['const'])
      .filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
  }
  return null;
};

const optionsOf = (
  node: Node,
  values: readonly (string | number)[],
  labels: Readonly<Record<string, string>> = {},
): FieldOption[] => {
  const optionLabels = isNode(node['optionLabels'])
    ? (node['optionLabels'] as Readonly<Record<string, string>>)
    : {};
  return values.map((value) => ({
    value,
    label: optionLabels[String(value)] ?? labels[String(value)] ?? String(value),
  }));
};

const isTextField = (node: Node): boolean => {
  const props = properties(node);
  return props['enabled']?.['type'] === 'boolean' && props['value']?.['type'] === 'string';
};

const customField = (node: Node, path: string, label: string, widget: string): FieldSpec => {
  const limits = isNode(node['limits']) ? node['limits'] : null;
  const min = limits ? num(limits, 'min') : null;
  const max = limits ? num(limits, 'max') : null;
  return { kind: 'custom', path, label, widget, limits: min !== null && max !== null ? { min, max } : null };
};

/** One leaf field, or null when no widget fits it. */
const describeLeaf = (node: Node, path: string, label: string): FieldSpec | null => {
  const widget = str(node, 'widget');
  const values = enumValues(node);
  const type = str(node, 'type');
  const unit = str(node, 'unit');
  // zod's `.int()` emits ±MAX_SAFE_INTEGER bounds; they mean "unbounded" for a form.
  const bound = (key: string): number | null => {
    const value = num(node, key);
    return value === null || Math.abs(value) >= Number.MAX_SAFE_INTEGER ? null : value;
  };
  const min = bound('minimum');
  const max = bound('maximum');

  if (widget !== null && !GENERIC_WIDGETS.has(widget)) return customField(node, path, label, widget);
  if (widget === 'font' && values)
    return { kind: 'font', path, label, options: optionsOf(node, values, FONT_LABELS) };
  if (values && (widget === 'select' || widget === 'segmented' || widget === null)) {
    const segmented = widget === 'segmented' || (widget === null && values.length <= SEGMENTED_MAX_OPTIONS);
    return { kind: segmented ? 'segmented' : 'select', path, label, options: optionsOf(node, values) };
  }
  if (widget === 'color') return { kind: 'color', path, label };
  if (type === 'boolean' && (widget === null || widget === 'switch')) return { kind: 'switch', path, label };
  if (
    (type === 'number' || type === 'integer') &&
    (widget === null || widget === 'slider' || widget === 'number')
  ) {
    if (widget !== 'number' && min !== null && max !== null) {
      return { kind: 'slider', path, label, min, max, step: num(node, 'step') ?? DEFAULT_SLIDER_STEP, unit };
    }
    return { kind: 'number', path, label, min, max, unit };
  }
  if (type === 'string' && (widget === null || widget === 'text')) {
    return { kind: 'string', path, label, maxLength: num(node, 'maxLength') };
  }
  return null;
};

const expand = (node: Node, path: string, hidden: ReadonlySet<string>): FieldSpec[] => {
  if (hidden.has(path)) return [];
  const label = str(node, 'title') ?? humanize(path.split('.').at(-1) ?? path);
  if (isTextField(node)) {
    const maxLength = num(properties(node)['value'] ?? {}, 'maxLength');
    return [{ kind: 'text', path, label, multiline: str(node, 'widget') === 'textarea', maxLength }];
  }
  // An object with a screen-supplied widget (e.g. `video-range`) is edited as a whole.
  const widget = str(node, 'widget');
  if (widget !== null && !GENERIC_WIDGETS.has(widget)) return [customField(node, path, label, widget)];
  const children = properties(node);
  if (str(node, 'type') === 'object' && Object.keys(children).length > 0) {
    return Object.entries(children).flatMap(([key, child]) => expand(child, `${path}.${key}`, hidden));
  }
  const leaf = describeLeaf(node, path, label);
  return leaf ? [leaf] : [];
};

const nodeAt = (schema: Node, path: string): Node | null => {
  let node: Node | undefined = schema;
  for (const key of path.split('.')) {
    node = node ? properties(node)[key] : undefined;
  }
  return node ?? null;
};

/** Child paths of an object node (e.g. every `texts.*`). */
export const childPaths = (schema: Node, path: string): string[] => {
  const node = nodeAt(schema, path);
  return node ? Object.keys(properties(node)).map((key) => `${path}.${key}`) : [];
};

/** Builds form sections from a layout; empty sections are dropped. */
export const buildFormSections = (
  schema: Node,
  layout: readonly SectionLayout[],
  hiddenPaths: readonly string[] = [],
): FormSectionSpec[] => {
  const hidden = new Set(hiddenPaths);
  return layout
    .map((section) => ({
      id: section.id,
      title: section.title,
      fields: section.paths.flatMap((path) => {
        const node = nodeAt(schema, path);
        return node ? expand(node, path, hidden) : [];
      }),
    }))
    .filter((section) => section.fields.length > 0);
};
