// Settings of the styled three-line title over a clip. Flat params, so templates keep their stored
// values; the admin groups them into compact rows with `ui.groups[].popovers`. Isomorphic.
import type { FontId } from '@vgen/shared';
import { z } from 'zod';

/** The looks every template with this title offers. */
export const TITLE_STYLES = ['classic', 'plate', 'sticker', 'stack', 'editorial'] as const;
export const TITLE_STYLE_LABELS = {
  classic: 'Classic (POV)',
  plate: 'On a dark plate (bright videos)',
  sticker: 'Stickers',
  stack: 'Bold stack',
  editorial: 'Editorial',
} as const;

/** `reel` is preset-reel's original look, offered only there. */
export type TitleStyle = 'reel' | (typeof TITLE_STYLES)[number];

export const TITLE_POSITIONS = ['top', 'center', 'bottom'] as const;
export type TitlePosition = (typeof TITLE_POSITIONS)[number];

export const TITLE_ENTRANCES = ['none', 'rise', 'pop'] as const;
export type TitleEntrance = (typeof TITLE_ENTRANCES)[number];
export const TITLE_ENTRANCE_LABELS = { none: 'None', rise: 'Rise', pop: 'Pop' } as const;

export interface TitleShadow {
  readonly opacity: number;
  readonly blur: number;
  readonly x: number;
  readonly y: number;
}

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

/** Where the block sits, its line gaps and its shadow (`params.title*`). */
export const titleLayoutFields = (defaults: { readonly lineGap: number; readonly shadow: TitleShadow }) => ({
  titlePosition: z
    .enum(TITLE_POSITIONS)
    .default('top')
    .meta({
      title: 'Title position',
      widget: 'segmented',
      optionLabels: { top: 'Top', center: 'Center', bottom: 'Bottom' },
    }),
  titleOffsetY: slider('Title: move down / up', -300, 300, 0, 2, 'px'),
  titleKickerGap: slider('Space under the first line', -60, 80, 0, 1, 'px'),
  titleLineGap: slider('Space above the last line', -60, 80, defaults.lineGap, 1, 'px'),
  titleTailWeight: slider('Last line thickness', 100, 900, 500, 50),
  titleShadow: z
    .object({
      opacity: slider('Shadow strength', 0, 1, defaults.shadow.opacity, 0.05),
      blur: slider('Shadow softness', 0, 60, defaults.shadow.blur, 1, 'px'),
      x: slider('Shadow left / right', -30, 30, defaults.shadow.x, 1, 'px'),
      y: slider('Shadow up / down', -30, 30, defaults.shadow.y, 1, 'px'),
    })
    .prefault({})
    .meta({ title: 'Title shadow' }),
});

/** Fonts a look draws with, besides the accent font (`reel` uses the template's heading font). */
export const titleFonts = (style: TitleStyle): readonly FontId[] => {
  if (style === 'reel') return [];
  if (style === 'stack') return ['montserrat', 'bebas-neue'];
  if (style === 'editorial') return ['montserrat', 'playfair-display'];
  return ['montserrat'];
};
