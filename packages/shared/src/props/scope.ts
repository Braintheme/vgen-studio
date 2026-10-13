import { z } from 'zod';
import type { FieldScope } from '../schema/meta.js';
import type { BaseProps } from '../schema/base.js';
import { resolveTemplateDefaults, type TemplateDefinition } from '../template/definition.js';
import { deepMerge, isPlainObject, type PlainObject } from '../util.js';

/** Fields without an explicit scope (anywhere up the tree) are treated as style. */
const DEFAULT_SCOPE: FieldScope = 'style';

const unwrap = (schema: z.ZodType): { inner: z.ZodType; scope: FieldScope | undefined } => {
  let current: z.ZodType = schema;
  let scope: FieldScope | undefined;
  for (;;) {
    // The outermost explicit scope wins.
    scope ??= current.meta()?.scope;
    if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodPrefault ||
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable
    ) {
      current = current.unwrap() as z.ZodType;
      continue;
    }
    return { inner: current, scope };
  }
};

/**
 * Returns the subset of `value` whose fields belong to `scope`, following the
 * schema's `.meta({ scope })` annotations (inherited by nested fields).
 */
export const pickByScope = (
  schema: z.ZodType,
  value: unknown,
  scope: FieldScope,
  inherited: FieldScope = DEFAULT_SCOPE,
): unknown => {
  const { inner, scope: own } = unwrap(schema);
  const effective = own ?? inherited;

  if (inner instanceof z.ZodObject && isPlainObject(value)) {
    const shape = inner.shape as Record<string, z.ZodType>;
    const result: PlainObject = {};
    for (const [key, child] of Object.entries(shape)) {
      if (!(key in value)) {
        continue;
      }
      const picked = pickByScope(child, value[key], scope, effective);
      if (picked !== undefined) {
        result[key] = picked;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  return effective === scope ? value : undefined;
};

const pickObject = (schema: z.ZodType, value: unknown, scope: FieldScope): PlainObject => {
  const picked = pickByScope(schema, value, scope);
  return isPlainObject(picked) ? picked : {};
};

/** Style-only part of props: what a style preset stores. */
export const extractPresetProps = (template: TemplateDefinition, props: unknown): PlainObject =>
  pickObject(template.schema, props, 'style');

/** Content-only part of props: media and per-video texts. */
export const extractContentProps = (template: TemplateDefinition, props: unknown): PlainObject =>
  pickObject(template.schema, props, 'content');

/**
 * Applies a style preset to the current (possibly incomplete) props input:
 * template defaults <- preset style <- current content. Validate the result with
 * `parseTemplateProps` once media is complete.
 */
export const applyPreset = <P extends BaseProps>(
  template: TemplateDefinition<P>,
  presetProps: unknown,
  current: unknown,
): PlainObject => {
  const style = extractPresetProps(template, presetProps);
  const content = extractContentProps(template, current);
  const merged = deepMerge(deepMerge(resolveTemplateDefaults(template), style), content);
  return isPlainObject(merged) ? merged : {};
};
