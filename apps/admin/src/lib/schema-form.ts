// Pure JSON Schema -> form description. Turns the props JSON Schema of a template
// (with vgen field metadata: title, widget, optionLabels, unit, step) into typed field
// specs that the schema-form components render. No Vue here: fully unit-testable.
import { FONTS, type UiVisibleWhen } from '@vgen/shared';
import { valueAtPath } from './utils';

export interface FieldOption {
  readonly value: string | number;
  readonly label: string;
  /** Generic icon id from the schema's `optionIcons` (e.g. `layout-rows`), or null. */
  readonly icon: string | null;
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
      /** The schema default (double-click resets to it), or null when there is none. */
      readonly defaultValue: number | null;
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
   * An object whose child objects are shown side by side (e.g. before | after adjustments);
   * their fields line up row by row.
   */
  | (FieldBase & { readonly kind: 'columns'; readonly columns: readonly ColumnSpec[] })
  /**
   * An object shown as one compact row (its label, a summary of its values) whose fields open in
   * a popover, e.g. typography: font, weight, size, spacing, colours.
   */
  | (FieldBase & { readonly kind: 'popover'; readonly fields: readonly FieldSpec[] })
  /**
   * A widget the generic form does not know (e.g. `music-track`); the screen supplies it.
   * Compound values (objects) with such a widget stay one field; `limits` are their bounds.
   */
  | (FieldBase & {
      readonly kind: 'custom';
      readonly widget: string;
      readonly limits: { readonly min: number; readonly max: number } | null;
      /** Schema defaults of a compound value's parts (e.g. a sound cue's `volume`). */
      readonly defaults: Readonly<Record<string, unknown>>;
    });

export type FieldKind = FieldSpec['kind'];

export interface ColumnSpec {
  readonly key: string;
  readonly label: string;
  /** Generic fields only (no custom widgets inside columns). */
  readonly fields: readonly FieldSpec[];
}

export interface SectionLayout {
  readonly id: string;
  readonly title: string;
  /** Field or object paths; objects expand into all their (visible) fields. */
  readonly paths: readonly string[];
  /** Shown only while another field holds one of the values (see `visibleSections`). */
  readonly visibleWhen?: UiVisibleWhen;
}

export interface FormSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly FieldSpec[];
  readonly visibleWhen?: UiVisibleWhen;
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
  'columns',
  'popover',
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
  const optionIcons = isNode(node['optionIcons'])
    ? (node['optionIcons'] as Readonly<Record<string, string>>)
    : {};
  return values.map((value) => ({
    value,
    label: optionLabels[String(value)] ?? labels[String(value)] ?? String(value),
    icon: optionIcons[String(value)] ?? null,
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
  const defaults = Object.fromEntries(
    Object.entries(properties(node)).flatMap(([key, child]) =>
      'default' in child ? [[key, child['default']]] : [],
    ),
  );
  return {
    kind: 'custom',
    path,
    label,
    widget,
    limits: min !== null && max !== null ? { min, max } : null,
    defaults,
  };
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
      return {
        kind: 'slider',
        path,
        label,
        min,
        max,
        step: num(node, 'step') ?? DEFAULT_SLIDER_STEP,
        unit,
        defaultValue: num(node, 'default'),
      };
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
  if (widget === 'columns' && Object.keys(children).length > 0) {
    const columns = Object.entries(children).map(([key, child]) => ({
      key,
      label: str(child, 'title') ?? humanize(key),
      fields: expand(child, `${path}.${key}`, hidden).filter((field) => field.kind !== 'custom'),
    }));
    return [{ kind: 'columns', path, label, columns }];
  }
  if (widget === 'popover' && Object.keys(children).length > 0) {
    const fields = Object.entries(children)
      .flatMap(([key, child]) => expand(child, `${path}.${key}`, hidden))
      .filter((field) => field.kind !== 'custom' && field.kind !== 'columns' && field.kind !== 'popover');
    return fields.length > 0 ? [{ kind: 'popover', path, label, fields }] : [];
  }
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
      ...(section.visibleWhen ? { visibleWhen: section.visibleWhen } : {}),
      fields: section.paths.flatMap((path) => {
        const node = nodeAt(schema, path);
        return node ? expand(node, path, hidden) : [];
      }),
    }))
    .filter((section) => section.fields.length > 0);
};

/** The sections to show for the current values (conditional groups follow their field). */
export const visibleSections = (sections: readonly FormSectionSpec[], values: unknown): FormSectionSpec[] =>
  sections.filter((section) => {
    const when = section.visibleWhen;
    if (!when) return true;
    const value = valueAtPath(values, when.field);
    return when.equals.some((expected) => expected === value);
  });

export interface FieldsSummary {
  /** e.g. `Montserrat · 900 · 110 px`, or `Off` when the group's first switch is off. */
  readonly text: string;
  /** The colours among the fields, shown as swatches. */
  readonly colors: readonly string[];
}

/** Most values a summary lists before it is cut. */
const SUMMARY_PARTS = 3;

/** A one-line summary of a group of fields (the compact row of a `popover` field). */
export const summarizeFields = (fields: readonly FieldSpec[], values: unknown): FieldsSummary => {
  const parts: string[] = [];
  const colors: string[] = [];
  for (const [index, field] of fields.entries()) {
    const value = valueAtPath(values, field.path);
    // A group led by a switch (e.g. a shadow) is just "Off" while it is off.
    if (field.kind === 'switch' && index === 0 && value === false) return { text: 'Off', colors: [] };
    if (field.kind === 'color' && typeof value === 'string') colors.push(value);
    else if (field.kind === 'select' || field.kind === 'segmented' || field.kind === 'font') {
      const option = field.options.find((candidate) => String(candidate.value) === String(value));
      if (option) parts.push(option.label);
    } else if ((field.kind === 'slider' || field.kind === 'number') && typeof value === 'number') {
      parts.push(field.unit ? `${String(value)} ${field.unit}` : String(value));
    }
  }
  return { text: parts.slice(0, SUMMARY_PARTS).join(' · '), colors };
};
