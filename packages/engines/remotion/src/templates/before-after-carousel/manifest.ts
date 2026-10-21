import { ColorSchema, defineTemplate, FORMATS, textField } from '@vgen/shared';
import { z } from 'zod';
import { photoAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { typographyField } from '../../core/typography/typography-field.js';
import { ANCHORS, FRAMINGS, LABEL_POSITIONS, SPLITS } from './layout.js';
import { checkCarouselMedia, prepareCarousel } from './prepare.js';

export const ORDERS = ['edited-first', 'original-first'] as const;

/** Most slides of an Instagram carousel. */
export const MAX_SLIDES = 20;

/** Slides of a photo list (at least one: an empty carousel previews placeholders). */
const slideCount = (photos: unknown): number =>
  Math.max(1, Math.floor((Array.isArray(photos) ? photos.length : 0) / 2));

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

const switchField = (title: string, value: boolean) =>
  z.boolean().default(value).meta({ title, widget: 'switch' });

/**
 * Carousel slides from before/after pairs: each slide is the frame cut in two (one above the
 * other, or side by side), the edited photo first (or the other way round) with a bold label at
 * the bottom of each half
 * ("YES" / "BUT") and the edit's palette on the seam. Images, not a video: one JPEG per pair.
 */
export const beforeAfterCarouselTemplate = defineTemplate({
  id: 'before-after-carousel',
  engine: 'remotion',
  version: '2.1.0',
  name: 'Before / After — Carousel',
  thumbnailUrl: '/template-previews/before-after-carousel.jpg',
  description:
    'Carousel slides: the edited photo over or beside the original, bold labels and the palette on the seam. One image per pair, downloaded as a ZIP.',
  output: 'stills',
  mediaSlots: [
    {
      key: 'photos',
      kind: 'image',
      label: 'Photos',
      description:
        'Pairs in order: before, after, before, after… Sorted by file name on upload; drag to fix.',
      required: true,
      multiple: { min: 2, max: MAX_SLIDES * 2 },
      group: { size: 2, labels: ['Before', 'After'] },
    },
  ],
  // Images have no length: one frame per slide (see resolveMetadata).
  duration: { default: 1, min: 1, max: 1 },
  texts: {
    afterLabel: textField({
      label: 'Edited photo label',
      default: 'YES',
      maxLength: 40,
      multiline: true,
      scope: 'style',
    }),
    afterCaption: textField({
      label: 'Edited photo caption',
      default: 'Edited with my preset',
      maxLength: 80,
      multiline: true,
      scope: 'style',
    }),
    beforeLabel: textField({
      label: 'Original photo label',
      default: 'BUT',
      maxLength: 40,
      multiline: true,
      scope: 'style',
    }),
    beforeCaption: textField({
      label: 'Original photo caption',
      default: 'Raw photo',
      maxLength: 80,
      multiline: true,
      scope: 'style',
    }),
  },
  params: {
    split: z
      .enum(SPLITS)
      .default('top-bottom')
      .meta({
        title: 'Photos',
        widget: 'segmented',
        optionLabels: { 'top-bottom': 'One above the other', 'left-right': 'Side by side' },
        optionIcons: { 'top-bottom': 'layout-rows', 'left-right': 'layout-columns' },
      }),
    order: z
      .enum(ORDERS)
      .default('edited-first')
      .meta({
        title: 'Order',
        widget: 'segmented',
        optionLabels: { 'edited-first': 'Edited first', 'original-first': 'Original first' },
      }),
    framing: z
      .enum(FRAMINGS)
      .default('fill')
      .meta({
        title: 'Framing',
        widget: 'segmented',
        optionLabels: { fill: 'Fill (crop)', fit: 'Whole photo on blur' },
      }),
    anchor: z
      .enum(ANCHORS)
      .default('center')
      .meta({
        title: 'Crop position',
        widget: 'segmented',
        optionLabels: { top: 'Top / left', center: 'Center', bottom: 'Bottom / right' },
      }),
    blur: slider('Background blur', 10, 120, 60, 5, 'px'),
    blurBrightness: slider('Background brightness', 0.3, 1, 0.75, 0.05),
    gap: slider('Gap between photos', 0, 40, 0, 1, 'px'),
    border: z
      .object({
        enabled: switchField('Border', false),
        color: ColorSchema.default('#ffffff').meta({ title: 'Colour' }),
        width: slider('Width', 1, 60, 5, 1, 'px'),
      })
      .prefault({})
      .meta({ title: 'Border around the slide', widget: 'popover' }),

    labelPosition: z
      .enum(LABEL_POSITIONS)
      .default('bottom')
      .meta({
        title: 'Position in each photo',
        widget: 'segmented',
        optionLabels: { top: 'Top', center: 'Center', bottom: 'Bottom' },
        optionIcons: { top: 'align-top', center: 'align-middle', bottom: 'align-bottom' },
      }),
    // Typography of the big labels and of the captions under them: compact popover rows.
    labelType: typographyField(
      'Label typography',
      {
        font: 'montserrat',
        weight: 900,
        size: 110,
        sizeRange: [30, 260],
        letterSpacing: 0.02,
        lineHeight: 1,
      },
      {
        afterColor: ColorSchema.default('#ffffff').meta({ title: 'Edited label colour' }),
        beforeColor: ColorSchema.default('#ffffff').meta({ title: 'Original label colour' }),
      },
    ),
    captionType: typographyField(
      'Caption typography',
      { font: 'inter', weight: 400, size: 34, sizeRange: [12, 120], letterSpacing: 0.02, lineHeight: 1.2 },
      {
        afterColor: ColorSchema.default('#ffffff').meta({ title: 'Edited caption colour' }),
        beforeColor: ColorSchema.default('#ffffff').meta({ title: 'Original caption colour' }),
        gap: slider('Gap below the label', 0, 80, 6, 1, 'px'),
      },
    ),
    // One shadow for labels and captions (scaled to the caption's size).
    labelShadow: z
      .object({
        enabled: switchField('Shadow', true),
        color: ColorSchema.default('#000000').meta({ title: 'Colour' }),
        opacity: slider('Opacity', 0, 1, 0.55, 0.05),
        blur: slider('Blur', 0, 60, 18, 1, 'px'),
        offset: slider('Offset', 0, 30, 4, 1, 'px'),
      })
      .prefault({})
      .meta({ title: 'Shadow', widget: 'popover' }),
    labelOffset: slider('Distance from the edge', 0, 300, 36, 1, 'px'),
    labelAutoContrast: switchField('Auto contrast on bright areas', false),
    labelContrastColor: ColorSchema.default('#111111').meta({ title: 'Colour on bright areas' }),

    palette: switchField('Palette on the seam', true),
    paletteCount: slider('Colours', 3, 7, 5, 1),
    paletteSize: slider('Dot size', 20, 120, 52, 1, 'px'),
    paletteSpacing: slider('Dot spacing', 0, 60, 14, 1, 'px'),
    paletteOutline: switchField('White outline', true),

    // Shared by every before/after template (two columns in the admin), for all pairs at once.
    adjust: photoAdjustmentsField(),
  },
  defaults: {
    format: '3:4',
    music: { enabled: false },
    style: { colors: { background: '#000000' } },
  },
  ui: {
    groups: [
      {
        id: 'layout',
        label: 'Layout',
        fields: ['params.split', 'params.order', 'params.framing', 'params.gap', 'params.border'],
      },
      {
        id: 'crop',
        label: 'Crop',
        fields: ['params.anchor'],
        visibleWhen: { field: 'params.framing', equals: ['fill'] },
      },
      {
        id: 'blur',
        label: 'Blurred background',
        fields: ['params.blur', 'params.blurBrightness'],
        visibleWhen: { field: 'params.framing', equals: ['fit'] },
      },
      {
        id: 'labels',
        label: 'Labels',
        fields: [
          'params.labelPosition',
          'texts.afterLabel',
          'texts.afterCaption',
          'texts.beforeLabel',
          'texts.beforeCaption',
          'params.labelType',
          'params.captionType',
          'params.labelShadow',
          'params.labelOffset',
          'params.labelAutoContrast',
          'params.labelContrastColor',
        ],
      },
      {
        id: 'palette',
        label: 'Palette',
        fields: [
          'params.palette',
          'params.paletteCount',
          'params.paletteSize',
          'params.paletteSpacing',
          'params.paletteOutline',
        ],
      },
      { id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] },
    ],
    // Only the background colour (gap, blur fringe) of the shared style applies.
    hiddenFields: [
      'style.fonts',
      'style.colors.text',
      'style.colors.accent',
      'style.radius',
      'style.vignette',
      'style.grain',
    ],
  },
  // One frame per slide: a pair of photos (the admin asks before anything is uploaded).
  resolveMetadata: (props) => ({
    ...FORMATS[props.format],
    fps: props.fps,
    durationInFrames: slideCount(props.media['photos']),
  }),
  posterFrame: () => 0,
  checkMedia: checkCarouselMedia,
  prepareAssets: prepareCarousel,
});

export type BeforeAfterCarouselProps = z.output<typeof beforeAfterCarouselTemplate.schema>;
