import { z } from 'zod';
import { computeOutputMetadata, FORMAT_IDS, type Format, type OutputMetadata } from '../formats.js';
import { baseShape, type BaseProps, type DurationSpec, type TextField } from '../schema/base.js';
import { deepMerge, type DeepPartial } from '../util.js';
import { mediaSchemaFromSlots, type MediaInfoMap, type MediaSlot, type MediaWarning } from './media-slots.js';
import type { PrepareAssetsContext, PreparedMediaMap } from './prepare.js';
import type { UiHints } from './ui-hints.js';

/**
 * Engine-independent description of a template. Lives in the engine package's
 * isomorphic "manifest" entry, so the API and the admin can import it safely.
 */
export interface TemplateDefinition<P extends BaseProps = BaseProps> {
  readonly id: string;
  readonly engine: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly thumbnailUrl?: string;
  /** Full props schema: base schema + template texts/params + media slots. */
  readonly schema: z.ZodType<P>;
  /** Same as `schema` without `media`; used for defaults and presets. */
  readonly settingsSchema: z.ZodType<Omit<P, 'media'>>;
  /** Template overrides of base defaults (partial props input without media). */
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly mediaSlots: readonly MediaSlot[];
  readonly formats: readonly Format[];
  readonly ui?: UiHints;
  resolveMetadata(props: P): OutputMetadata;
  /** Frame used for thumbnails / poster images. */
  posterFrame(props: P): number;
  /** Non-blocking checks shown in the UI (e.g. aspect mismatch). */
  checkMedia?(media: MediaInfoMap): readonly MediaWarning[];
  /** Template-specific asset preparation, run by the worker after generic normalization. */
  prepareAssets?(context: PrepareAssetsContext<P>): Promise<PreparedMediaMap>;
}

/** Text fields must be built with `textField()` (or produce the same shape). */
export type TextFieldsShape = Readonly<Record<string, z.ZodType<TextField>>>;

const buildSchemas = <
  const Slots extends readonly MediaSlot[],
  TTexts extends TextFieldsShape,
  TParams extends z.ZodRawShape,
>(parts: {
  mediaSlots: Slots;
  duration: DurationSpec;
  texts: TTexts;
  params: TParams;
}) => {
  const settingsShape = {
    ...baseShape(parts.duration),
    texts: z.object(parts.texts).prefault({} as z.input<z.ZodObject<TTexts>>),
    params: z.object(parts.params).prefault({} as z.input<z.ZodObject<TParams>>),
  };
  return {
    settings: z.object(settingsShape),
    props: z.object({ ...settingsShape, media: mediaSchemaFromSlots(parts.mediaSlots) }),
  };
};

type Schemas<
  Slots extends readonly MediaSlot[],
  TTexts extends TextFieldsShape,
  TParams extends z.ZodRawShape,
> = ReturnType<typeof buildSchemas<Slots, TTexts, TParams>>;

/**
 * Props output of a template built by `defineTemplate`. The generic constraints make
 * a contract-breaking spec fail to compile (see definition.test-d.ts); `Extract` is a
 * second line of defence that degrades props to `never` should the constraints drift.
 */
export type TemplatePropsOf<
  Slots extends readonly MediaSlot[],
  TTexts extends TextFieldsShape,
  TParams extends z.ZodRawShape,
> = Extract<z.output<Schemas<Slots, TTexts, TParams>['props']>, BaseProps>;

export interface TemplateSpec<
  Slots extends readonly MediaSlot[],
  TTexts extends TextFieldsShape,
  TParams extends z.ZodRawShape,
  P = TemplatePropsOf<Slots, TTexts, TParams>,
> {
  readonly id: string;
  readonly engine: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly thumbnailUrl?: string;
  readonly mediaSlots: Slots;
  readonly duration: DurationSpec;
  /** Text fields, built with `textField()`. */
  readonly texts: TTexts;
  /** Template-specific options (effects, transitions, ...). */
  readonly params: TParams;
  /** Supported formats; all formats by default. */
  readonly formats?: readonly Format[];
  readonly defaults?: DeepPartial<z.input<Schemas<Slots, TTexts, TParams>['settings']>>;
  readonly ui?: UiHints;
  resolveMetadata?(props: P): OutputMetadata;
  posterFrame(props: P): number;
  checkMedia?(media: MediaInfoMap): readonly MediaWarning[];
  prepareAssets?(context: PrepareAssetsContext<P>): Promise<PreparedMediaMap>;
}

/** Builds a template definition (including its props schema) from a declarative spec. */
export const defineTemplate = <
  const Slots extends readonly MediaSlot[],
  TTexts extends TextFieldsShape,
  TParams extends z.ZodRawShape,
>(
  spec: TemplateSpec<Slots, TTexts, TParams>,
): TemplateDefinition<TemplatePropsOf<Slots, TTexts, TParams>> => {
  type Props = TemplatePropsOf<Slots, TTexts, TParams>;
  const schemas = buildSchemas(spec);
  // TS cannot relate generic zod output types to BaseProps; TemplatePropsOf guarantees it
  // for every concrete template, so these two casts are the only unchecked spots.
  const schema = schemas.props as unknown as z.ZodType<Props>;
  const settingsSchema = schemas.settings as unknown as z.ZodType<Omit<Props, 'media'>>;
  return {
    id: spec.id,
    engine: spec.engine,
    version: spec.version,
    name: spec.name,
    description: spec.description,
    ...(spec.thumbnailUrl === undefined ? {} : { thumbnailUrl: spec.thumbnailUrl }),
    schema,
    settingsSchema,
    defaults: spec.defaults ?? {},
    mediaSlots: spec.mediaSlots,
    formats: spec.formats ?? FORMAT_IDS,
    ...(spec.ui === undefined ? {} : { ui: spec.ui }),
    resolveMetadata: (props) => spec.resolveMetadata?.(props) ?? computeOutputMetadata(props),
    posterFrame: (props) => spec.posterFrame(props),
    ...(spec.checkMedia === undefined ? {} : { checkMedia: spec.checkMedia.bind(spec) }),
    ...(spec.prepareAssets === undefined ? {} : { prepareAssets: spec.prepareAssets.bind(spec) }),
  };
};

/** Fully resolved default settings (everything except media) of a template. */
export const resolveTemplateDefaults = <P extends BaseProps>(
  template: TemplateDefinition<P>,
): Omit<P, 'media'> => template.settingsSchema.parse(template.defaults);

/**
 * Validates (partial) props input against a template: missing values are filled
 * from the template defaults first, then the full schema is applied.
 */
export const parseTemplateProps = <P extends BaseProps>(
  template: TemplateDefinition<P>,
  input: unknown,
): z.ZodSafeParseResult<P> => template.schema.safeParse(deepMerge(resolveTemplateDefaults(template), input));
