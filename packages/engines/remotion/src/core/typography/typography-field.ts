// A typography control (font, weight, size, spacing) as one schema field: the admin shows it as a
// compact row that opens a popover. Isomorphic (manifests import it).
import { FontIdSchema, type FontId } from '@vgen/shared';
import { z } from 'zod';

export interface TypographyDefaults {
  readonly font: FontId;
  /** 100..900; applies to variable fonts (static ones have one weight). */
  readonly weight: number;
  /** Design pixels (1080 px on the short side) and the slider's range. */
  readonly size: number;
  readonly sizeRange: readonly [number, number];
  /** Em. */
  readonly letterSpacing: number;
  /** Multiple of the size. */
  readonly lineHeight: number;
}

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

/** The typography part of the object; templates may add their own fields (colours, gaps). */
export const typographyShape = (defaults: TypographyDefaults) => ({
  font: FontIdSchema.default(defaults.font).meta({ title: 'Font', widget: 'font' }),
  weight: slider('Weight (variable fonts)', 100, 900, defaults.weight, 100),
  size: slider('Size', defaults.sizeRange[0], defaults.sizeRange[1], defaults.size, 1, 'px'),
  letterSpacing: slider('Letter spacing', -0.1, 0.5, defaults.letterSpacing, 0.01, 'em'),
  lineHeight: slider('Line height', 0.7, 2, defaults.lineHeight, 0.05),
});

/**
 * Typography plus the template's `extra` fields (colours, gaps; `{}` for none) as one popover
 * field, e.g. `params.labelType`.
 */
export const typographyField = <const Extra extends z.ZodRawShape>(
  title: string,
  defaults: TypographyDefaults,
  extra: Extra,
) => {
  const object = z.object({ ...typographyShape(defaults), ...extra });
  // Every field has a default; TypeScript cannot see it through the generic `extra`.
  return object.prefault({} as z.input<typeof object>).meta({ title, widget: 'popover' });
};

export interface Typography {
  readonly font: FontId;
  readonly weight: number;
  readonly size: number;
  readonly letterSpacing: number;
  readonly lineHeight: number;
}
