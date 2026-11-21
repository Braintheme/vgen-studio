// Settings of the `instagram` title style (free text like Instagram Stories). Flat params next to
// the other title settings; all `style`, so presets keep the text and the look. Isomorphic.
import { ColorSchema, FontIdSchema, textField, type PropPath, type UiFieldGroup } from '@vgen/shared';
import { z } from 'zod';
import { INSTAGRAM_TITLE } from './fields.js';

export const TITLE_ALIGNS = ['left', 'center', 'right'] as const;
export type TitleAlign = (typeof TITLE_ALIGNS)[number];
export const TITLE_FILLS = ['off', 'solid', 'see-through'] as const;
export type TitleFill = (typeof TITLE_FILLS)[number];

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

/** The style's own text: any lines, broken where the owner breaks them. */
export const instagramTitleText = (defaultText: string) =>
  textField({ label: 'Title text', default: defaultText, maxLength: 160, multiline: true, scope: 'style' });

/** `params.titleIg*`: font, alignment, colours, background and outline. */
export const instagramTitleFields = () => ({
  titleIgFont: FontIdSchema.default('inter').meta({ title: 'Font', widget: 'font' }),
  titleIgWeight: slider('Thickness', 300, 900, 700, 100),
  titleIgAlign: z
    .enum(TITLE_ALIGNS)
    .default('center')
    .meta({
      title: 'Alignment',
      widget: 'segmented',
      optionLabels: { left: 'Left', center: 'Center', right: 'Right' },
    }),
  titleIgColor: ColorSchema.default('#111111').meta({ title: 'Text colour' }),
  titleIgFill: z
    .object({
      mode: z
        .enum(TITLE_FILLS)
        .default('solid')
        .meta({
          title: 'Background',
          widget: 'segmented',
          optionLabels: { off: 'Off', solid: 'Solid', 'see-through': 'See-through' },
        }),
      color: ColorSchema.default('#ffffff').meta({ title: 'Background colour' }),
    })
    .prefault({})
    .meta({ title: 'Background' }),
  titleIgOutline: z
    .object({
      enabled: z.boolean().default(false).meta({ title: 'Outline', widget: 'switch' }),
      color: ColorSchema.default('#000000').meta({ title: 'Outline colour' }),
      width: slider('Outline thickness', 1, 24, 6, 1, 'px'),
    })
    .prefault({})
    .meta({ title: 'Outline' }),
});

export interface TitleGroupsOptions {
  /** The three-line title group as the template had it (shown for every other style). */
  readonly title: UiFieldGroup;
  /** Every style the template offers. */
  readonly styles: readonly string[];
  readonly textPath: PropPath;
  /** The template's entrance field, e.g. `params.titleEntrance`. */
  readonly entranceField: PropPath;
  /** The template's size fields plus position and offset. */
  readonly layoutFields: readonly PropPath[];
}

/**
 * The title's form groups: the three-line group for the classic styles and an `instagram` one
 * (its text, the style select and its own settings). Only one is shown at a time.
 */
export const titleGroups = (options: TitleGroupsOptions): UiFieldGroup[] => [
  {
    ...options.title,
    visibleWhen: {
      field: 'params.titleStyle',
      equals: options.styles.filter((style) => style !== INSTAGRAM_TITLE),
    },
  },
  {
    id: 'title-instagram',
    label: options.title.label,
    visibleWhen: { field: 'params.titleStyle', equals: [INSTAGRAM_TITLE] },
    fields: [options.textPath, 'params.titleStyle'],
    popovers: [
      {
        id: 'title-ig-font',
        label: 'Font & entrance',
        fields: ['params.titleIgFont', 'params.titleIgWeight', 'params.titleIgAlign', options.entranceField],
      },
      {
        id: 'title-ig-colors',
        label: 'Colours & background',
        fields: ['params.titleIgColor', 'params.titleIgFill', 'params.titleIgOutline'],
      },
      { id: 'title-ig-layout', label: 'Size & position', fields: options.layoutFields },
      { id: 'title-ig-shadow', label: 'Shadow', fields: ['params.titleShadow'] },
    ],
  },
];
