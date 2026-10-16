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
  /** An object whose child objects are shown side by side, fields lined up (e.g. before | after). */
  | 'columns'
  | 'music-track'
  | 'music-region'
  /** `{ startSec, endSec }` of a video slot (see `videoRangeField`). */
  | 'video-range'
  /** `{ enabled, trackId, volume }`: a built-in sound or a library track (see `soundEffectField`). */
  | 'sound-effect'
  /** `{ shadows, midtones, highlights }` of `{ hue, amount }`: Final Cut-like colour wheels. */
  | 'color-wheels'
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
    /** Bounds of compound widgets, e.g. the allowed fragment length of a `video-range`. */
    limits?: { min: number; max: number };
  }
}

export {};
