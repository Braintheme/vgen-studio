import { useForm, type GenericObject, type TypedSchema } from 'vee-validate';
import type { z } from 'zod';

/** Values of a schema-driven form while editing (shape known only at runtime). */
export type SchemaValues = Record<string, unknown>;

/**
 * zod 4 -> vee-validate TypedSchema. vee-validate 4 has no Standard Schema support and
 * `@vee-validate/zod` targets zod 3, hence this small adapter (drop it for vee-validate 5).
 */
export const zodTypedSchema = <TOutput>(schema: z.ZodType<TOutput>): TypedSchema<SchemaValues, TOutput> => ({
  __type: 'VVTypedSchema',
  async parse(values) {
    const result = await schema.safeParseAsync(values);
    if (result.success) return { value: result.data, errors: [] };
    return {
      errors: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        errors: [issue.message],
      })),
    };
  },
});

export interface SchemaFormState<TOutput> {
  /** Current (unvalidated) values: a reactive object, watch it with a getter. */
  readonly values: Readonly<SchemaValues>;
  /** Validates everything; returns the parsed output, or null (errors are shown on the fields). */
  readonly validate: () => Promise<TOutput | null>;
  /** Replaces all values (e.g. applying a preset); clears errors. */
  readonly replaceValues: (values: SchemaValues) => void;
  /** Sets one value by dot path (custom widgets). */
  readonly setFieldValue: (path: string, value: unknown) => void;
}

/** A vee-validate form driven by a zod schema; fields bind by dot path (`FormField name`). */
export const useSchemaForm = <TOutput extends GenericObject>(
  schema: z.ZodType<TOutput>,
  initialValues: SchemaValues,
): SchemaFormState<TOutput> => {
  const form = useForm<SchemaValues, TOutput>({
    validationSchema: zodTypedSchema(schema),
    initialValues,
    // Fields unmount while their popover is closed or their conditional group is hidden; their
    // values are still settings (vee-validate drops them by default).
    keepValuesOnUnmount: true,
  });
  return {
    values: form.values,
    validate: async () => {
      const result = await form.validate();
      // vee-validate types values as Partial; a valid result is the full schema output.
      return result.valid ? ((result.values ?? null) as TOutput | null) : null;
    },
    replaceValues: (values) => {
      form.resetForm({ values }, { force: true });
    },
    setFieldValue: (path, value) => {
      form.setFieldValue(path, value);
    },
  };
};
