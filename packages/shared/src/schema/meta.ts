/**
 * Field-level metadata attached with zod's `.meta()`. It is stored in zod's global
 * registry and is emitted by `z.toJSONSchema()`, so API clients see it too.
 */

/** `content` fields carry per-video content; `style` fields are what presets save. */
export type FieldScope = 'content' | 'style';

/** Admin form widget for a field; engines/templates may introduce custom ids. */
export type FieldWidget =
  | 'text'
  | 'textarea'
  | 'number'
  | 'slider'
  | 'switch'
  | 'select'
  | 'segmented'
  | 'color'
  | 'font'
  | 'music-track'
  | 'music-region'
  /** Engine/template specific widgets. */
  | `custom:${string}`;

declare module 'zod' {
  interface GlobalMeta {
    scope?: FieldScope;
    widget?: FieldWidget;
    /** Human-readable labels for enum options, keyed by option value. */
    optionLabels?: Record<string, string>;
    /** Step for numeric widgets. */
    step?: number;
    /** Unit suffix shown next to numeric widgets (e.g. `s`, `%`). */
    unit?: string;
  }
}

export {};
