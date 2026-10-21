import type { BaseProps, TemplateDefinition } from '@vgen/shared';
import { z } from 'zod';
import { useSchemaForm, type SchemaFormState, type SchemaValues } from '@/composables/useSchemaForm';
import { buildFormSections, childPaths, type FormSectionSpec, type SectionLayout } from '@/lib/schema-form';
import {
  HIDDEN_PATHS,
  LEADING_SECTIONS,
  STILLS_HIDDEN_PATHS,
  OTHER_SECTION,
  TEMPLATE_ROOTS,
  TRAILING_SECTIONS,
} from '@/features/compose/constants';

/** Editable values are free-form while typing; the validated output is the template settings. */
export type SettingsValues = SchemaValues;
export type TemplateSettings = Omit<BaseProps, 'media'>;

export interface ComposeFormState extends SchemaFormState<TemplateSettings> {
  readonly sections: readonly FormSectionSpec[];
}

/** Section layout: base sections, the template's own groups, leftovers, then style/music. */
const layoutFor = (template: TemplateDefinition, schema: Record<string, unknown>): SectionLayout[] => {
  const groups = (template.ui?.groups ?? []).map((group) => ({
    id: group.id,
    title: group.label,
    paths: group.fields,
    ...(group.visibleWhen ? { visibleWhen: group.visibleWhen } : {}),
  }));
  const grouped = new Set(groups.flatMap((group) => group.paths));
  const leftovers = TEMPLATE_ROOTS.flatMap((root) => childPaths(schema, root)).filter(
    (path) => !grouped.has(path),
  );
  return [...LEADING_SECTIONS, ...groups, { ...OTHER_SECTION, paths: leftovers }, ...TRAILING_SECTIONS];
};

/** The settings form of a template (everything except media), generated from its schema. */
export const useComposeForm = (
  template: TemplateDefinition,
  initialSettings: Readonly<Record<string, unknown>>,
): ComposeFormState => {
  const schema = z.toJSONSchema(template.settingsSchema, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  const hidden = [
    ...HIDDEN_PATHS,
    ...(template.output === 'stills' ? STILLS_HIDDEN_PATHS : []),
    ...(template.ui?.hiddenFields ?? []),
  ];
  const form = useSchemaForm(template.settingsSchema, { ...initialSettings });
  return { ...form, sections: buildFormSections(schema, layoutFor(template, schema), hidden) };
};
