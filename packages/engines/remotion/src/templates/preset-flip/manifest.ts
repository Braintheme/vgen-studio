import {
  ColorSchema,
  defineTemplate,
  FontIdSchema,
  FORMATS,
  imageSlot,
  soundEffectField,
  soundEffectTracks,
  textField,
  videoRangeField,
  videoRangeSec,
  videoSlot,
  type VideoRange,
} from '@vgen/shared';
import { z } from 'zod';
import { alignSetTo } from '../../core/pairs/align-set.js';
import { checkPhotoSetMedia } from '../../core/pairs/pair-checks.js';
import { PARTICLE_SHAPES } from '../../core/particles/burst.js';
import { beforeAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { REVEAL_EFFECTS, revealEffectField, type RevealEffectId } from '../../core/reveals/registry.js';
import { seamTransitionField } from '../../core/transitions/registry.js';
import { videoGradeField } from '../../core/video-grade/schema.js';
import { WORD_SWAP_LABELS, WORD_SWAPS } from '../../core/typography/word-swap.js';
import { DEFAULTS, flipTimeline, type FlipTimeline } from './timeline.js';

export const TITLE_STYLES = ['classic', 'plate', 'sticker', 'stack', 'editorial'] as const;
export const TITLE_ENTRANCES = ['none', 'rise', 'pop'] as const;
export const TITLE_POSITIONS = ['top', 'center', 'bottom'] as const;
export const LABEL_SWAPS = ['cut', ...WORD_SWAPS] as const;
export const LABEL_POSITIONS = ['top', 'center', 'bottom'] as const;
export const CTA_ENTRANCES = ['cut', 'slice', 'pop'] as const;
export const PALETTE_EFFECTS = ['off', 'dots', 'burst'] as const;
export const CAMERA_MOTIONS = ['push-in', 'handheld', 'push-handheld', 'pull-out', 'drift', 'still'] as const;
export type CameraMotion = (typeof CAMERA_MOTIONS)[number];

const CAMERA_MOTION_LABELS: Readonly<Record<CameraMotion, string>> = {
  'push-in': 'Slow push-in',
  handheld: 'Handheld (live camera)',
  'push-handheld': 'Push-in + handheld',
  'pull-out': 'Slow pull-out',
  drift: 'Slow drift',
  still: 'Still',
};

/** Transitions that suit the move from the clip into the photo. */
const SEAM_OPTIONS = ['punch-zoom', 'zoom-through', 'fade', 'soft-focus', 'none'] as const;

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

const segmented = <const T extends readonly [string, ...string[]]>(
  values: T,
  value: T[number],
  title: string,
  optionLabels: Readonly<Record<T[number], string>>,
) => z.enum(values).default(value).meta({ title, widget: 'segmented', optionLabels });

/**
 * One shot in several presets (reference: references/4): the user's clip with a POV title,
 * a shutter and a zoom into the photo, the unedited photo, then one look per preset with a
 * "PRESET #n" label, and a two-tone call to action on the last look.
 */
export const presetFlipTemplate = defineTemplate({
  id: 'preset-flip',
  engine: 'remotion',
  version: '1.4.0',
  name: 'Preset Flip',
  // Gallery card (admin static file; regenerate from fixture renders when the look changes).
  thumbnailUrl: '/template-previews/preset-flip.jpg',
  description:
    'Your clip with a POV title, a zoom into the shot, then the same photo flipping through your presets, ending on a call to action.',
  mediaSlots: [
    videoSlot('clip', {
      label: 'Clip',
      required: true,
      description: 'Video of taking the shot (MP4, MOV)',
      range: 'params.clip',
    }),
    imageSlot('before', { label: 'Before', required: true, description: 'The unedited photo' }),
    {
      key: 'presets',
      kind: 'image',
      label: 'Presets',
      required: true,
      description: 'The same photo with each preset, in the order they are shown',
      multiple: { min: 1, max: 10 },
    },
  ],
  // The length follows the content (clip + photos + call to action); this field is hidden.
  duration: { default: 13, min: 4, max: 60 },
  texts: {
    titleKicker: textField({ label: 'Title: first line', default: 'POV:', maxLength: 24 }),
    titleHero: textField({ label: 'Title: main line', default: 'They Ask', maxLength: 28 }),
    titleTail: textField({ label: 'Title: last line (*accent*)', default: 'For the *RAWs*', maxLength: 40 }),
    labelWord: textField({ label: 'Label word', default: 'PRESET', maxLength: 16, scope: 'style' }),
    labelPrefix: textField({ label: 'Before the number', default: '#', maxLength: 6, scope: 'style' }),
    ctaLead: textField({ label: 'Call to action: first line', default: 'COMMENT', maxLength: 24 }),
    ctaWord: textField({ label: 'Call to action: big word', default: 'PRESET', maxLength: 16 }),
  },
  params: {
    // Only the before photo: the preset photos are the finished edits.
    adjust: beforeAdjustmentsField(),

    // Clip
    clip: videoRangeField({ label: 'Clip fragment', minSec: 2, maxSec: 30, defaultSec: DEFAULTS.clipSec }),
    // Colour grading of the clip (preview = render; neutral by default).
    clipGrade: videoGradeField(),
    framing: z
      .object({
        zoom: slider('Zoom', 1, 3, 1, 0.05, '×'),
        x: slider('Move left / right', -1, 1, 0, 0.05),
        y: slider('Move up / down', -1, 1, 0, 0.05),
      })
      .prefault({})
      .meta({ title: 'Framing', scope: 'content' }),
    zoomPoint: z
      .object({
        x: slider('Zoom into: left / right', -1, 1, 0, 0.05),
        y: slider('Zoom into: up / down', -1, 1, 0, 0.05),
      })
      .prefault({})
      .meta({ title: 'Zoom point (e.g. the camera screen)', scope: 'content' }),
    clipAudio: z
      .object({
        enabled: z.boolean().default(false).meta({ title: 'Sound of the clip', widget: 'switch' }),
        volume: slider('Clip volume', 0, 1, 0.6, 0.05),
      })
      .prefault({}),
    toPhotos: seamTransitionField({ title: 'Clip → photo', allowed: SEAM_OPTIONS, default: 'punch-zoom' }),

    // Title
    titleStyle: z
      .enum(TITLE_STYLES)
      .default('classic')
      .meta({
        title: 'Title style',
        widget: 'select',
        optionLabels: {
          classic: 'Classic (POV)',
          plate: 'On a dark plate (bright videos)',
          sticker: 'Stickers',
          stack: 'Bold stack',
          editorial: 'Editorial',
        },
      }),
    titleColor: ColorSchema.default('#ffffff').meta({ title: 'Title colour' }),
    titleAccent: ColorSchema.default('#fccb04').meta({ title: 'Title accent colour' }),
    titleAccentFont: FontIdSchema.default('courgette').meta({ title: 'Accent word font', widget: 'font' }),
    titleSize: slider('Title size', 0.7, 1.4, 1, 0.05, '×'),
    titlePosition: segmented(TITLE_POSITIONS, 'top', 'Title position', {
      top: 'Top',
      center: 'Center',
      bottom: 'Bottom',
    }),
    titleOffsetY: slider('Title: move down / up', -300, 300, 0, 2, 'px'),
    titleKickerGap: slider('Space under the first line', -60, 80, 0, 1, 'px'),
    titleLineGap: slider('Space above the last line', -60, 80, -5, 1, 'px'),
    titleTailWeight: slider('Last line thickness', 100, 900, 500, 50),
    titleShadow: z
      .object({
        opacity: slider('Shadow strength', 0, 1, 0.45, 0.05),
        blur: slider('Shadow softness', 0, 60, 20, 1, 'px'),
        x: slider('Shadow left / right', -30, 30, 0, 1, 'px'),
        y: slider('Shadow up / down', -30, 30, 4, 1, 'px'),
      })
      .prefault({})
      .meta({ title: 'Title shadow' }),
    titleEntrance: segmented(TITLE_ENTRANCES, 'none', 'Title entrance', {
      none: 'None',
      rise: 'Rise',
      pop: 'Pop',
    }),

    // Photos
    revealEffect: revealEffectField({ title: 'Photo change', default: 'crossfade' }),
    changeSpeed: slider('Change speed', 0.5, 2, 1, 0.05, '×'),
    beforeHoldSec: slider('Before photo shows for', 0.3, 4, DEFAULTS.beforeHoldSec, 0.01, 's'),
    presetSec: slider('Time per preset', 0.4, 3, DEFAULTS.presetSec, 0.01, 's'),
    ctaHoldSec: slider('Call to action shows for', 0.5, 5, DEFAULTS.ctaHoldSec, 0.01, 's'),
    cameraMotion: z
      .enum(CAMERA_MOTIONS)
      .default('push-in')
      .meta({ title: 'Camera on the photos', widget: 'select', optionLabels: CAMERA_MOTION_LABELS }),
    cameraIntensity: slider('Camera amount', 0, 2.5, 1, 0.05, '×'),

    // Label
    labelSwap: z
      .enum(LABEL_SWAPS)
      .default('cut')
      .meta({
        title: 'Number change',
        widget: 'select',
        optionLabels: { cut: 'Cut', ...WORD_SWAP_LABELS },
      }),
    labelPosition: segmented(LABEL_POSITIONS, 'bottom', 'Label position', {
      top: 'Top',
      center: 'Center',
      bottom: 'Bottom',
    }),
    labelSize: slider('Label size', 0.6, 1.8, 1, 0.05, '×'),
    labelColor: ColorSchema.default('#ffffff').meta({ title: 'Label colour' }),
    numberColor: ColorSchema.default('#fcbf2b').meta({ title: 'Number colour' }),

    // Palette
    paletteEffect: z
      .enum(PALETTE_EFFECTS)
      .default('off')
      .meta({
        title: 'Palette on each change',
        widget: 'segmented',
        optionLabels: { off: 'Off', dots: 'Dots', burst: 'Burst' },
      }),
    paletteShape: z
      .enum(PARTICLE_SHAPES)
      .default('circle')
      .meta({
        title: 'Dot shape',
        widget: 'segmented',
        optionLabels: { circle: 'Circle', square: 'Square', ring: 'Ring', star: 'Star' },
      }),
    paletteSize: slider('Dot size', 0.5, 2, 1, 0.05, '×'),

    // Call to action
    ctaTopColor: ColorSchema.default('#39e4de').meta({ title: 'Big word: top colour' }),
    ctaBottomColor: ColorSchema.default('#f9ad14').meta({ title: 'Big word: bottom colour' }),
    ctaLeadColor: ColorSchema.default('#ffffff').meta({ title: 'First line colour' }),
    ctaSize: slider('Call to action size', 0.6, 1.5, 1, 0.05, '×'),
    ctaGrain: z.boolean().default(true).meta({ title: 'Grain in the bottom colour', widget: 'switch' }),
    ctaShadow: z.boolean().default(true).meta({ title: 'Shadow', widget: 'switch' }),
    ctaEntrance: segmented(CTA_ENTRANCES, 'cut', 'Call to action entrance', {
      cut: 'Cut',
      slice: 'Slice in',
      pop: 'Pop',
    }),

    // Sounds
    shutterSound: soundEffectField({ label: 'Shutter at the end of the clip' }),
    shutterBeforeSec: slider('Shutter before the zoom', 0, 1.5, DEFAULTS.shutterBeforeSec, 0.05, 's'),
    // A library track (synced to the changes) plays from the cut; the built-in ticks per change.
    photosSound: soundEffectField({ label: 'Sound over the photos' }),
    photosSoundOffsetSec: slider('Photos sound starts (from the cut)', -2, 2, 0, 0.01, 's'),
    // The music plays under the clip only and crossfades into the photos sound.
    musicUnderClipOnly: z
      .boolean()
      .default(true)
      .meta({ title: 'Music only under the clip', widget: 'switch' }),
    soundCrossfadeSec: slider('Music → photos sound crossfade', 0, 1.5, 0.4, 0.05, 's'),
    // Centred on every photo change, whatever its length (built-in: a tick).
    changeSound: soundEffectField({ label: 'Sound on each photo change', enabled: false, volume: 0.7 }),
    swooshSound: soundEffectField({ label: 'Swoosh on the zoom', enabled: false, volume: 0.6 }),
    swooshOffsetSec: slider('Swoosh (from the cut)', -1, 1, 0, 0.01, 's'),
  },
  defaults: {
    style: {
      colors: { background: '#000000', text: '#ffffff', accent: '#fccb04' },
      fonts: { heading: 'montserrat', body: 'montserrat' },
      vignette: 0,
      grain: 0,
    },
  },
  ui: {
    hiddenFields: ['durationSec'],
    groups: [
      {
        id: 'clip',
        label: 'Clip',
        fields: ['params.clip', 'params.framing', 'params.zoomPoint', 'params.clipAudio', 'params.toPhotos'],
      },
      { id: 'clip-grade', label: 'Clip color grading', fields: ['params.clipGrade'] },
      {
        id: 'title',
        label: 'Title',
        fields: [
          'texts.titleKicker',
          'texts.titleHero',
          'texts.titleTail',
          'params.titleStyle',
          'params.titleColor',
          'params.titleAccent',
          'params.titleAccentFont',
          'params.titleSize',
          'params.titlePosition',
          'params.titleOffsetY',
          'params.titleKickerGap',
          'params.titleLineGap',
          'params.titleTailWeight',
          'params.titleShadow',
          'params.titleEntrance',
        ],
      },
      {
        id: 'photos',
        label: 'Photos',
        fields: [
          'params.revealEffect',
          'params.changeSpeed',
          'params.beforeHoldSec',
          'params.presetSec',
          'params.ctaHoldSec',
          'params.cameraMotion',
          'params.cameraIntensity',
        ],
      },
      {
        id: 'label',
        label: 'Preset label',
        fields: [
          'texts.labelWord',
          'texts.labelPrefix',
          'params.labelSwap',
          'params.labelPosition',
          'params.labelSize',
          'params.labelColor',
          'params.numberColor',
        ],
      },
      {
        id: 'palette',
        label: 'Palette',
        fields: ['params.paletteEffect', 'params.paletteShape', 'params.paletteSize'],
      },
      {
        id: 'cta',
        label: 'Call to action',
        fields: [
          'texts.ctaLead',
          'texts.ctaWord',
          'params.ctaTopColor',
          'params.ctaBottomColor',
          'params.ctaLeadColor',
          'params.ctaSize',
          'params.ctaGrain',
          'params.ctaShadow',
          'params.ctaEntrance',
        ],
      },
      {
        id: 'sounds',
        label: 'Sounds',
        fields: [
          'params.shutterSound',
          'params.shutterBeforeSec',
          'params.photosSound',
          'params.photosSoundOffsetSec',
          'params.musicUnderClipOnly',
          'params.soundCrossfadeSec',
          'params.changeSound',
          'params.swooshSound',
          'params.swooshOffsetSec',
        ],
      },
      { id: 'adjust', label: 'Photo adjustments', fields: ['params.adjust'] },
    ],
  },
  resolveMetadata: (props) => ({
    ...FORMATS[props.format],
    fps: props.fps,
    durationInFrames: timelineOf(props).totalFrames,
  }),
  // The last look with the call to action in place.
  posterFrame: (props) => {
    const timeline = timelineOf(props);
    return Math.min(timeline.totalFrames - 1, timeline.ctaAt + Math.round(0.4 * props.fps));
  },
  checkMedia: checkPhotoSetMedia('before', 'presets'),
  prepareAssets: alignSetTo('before', 'presets'),
  soundTracks: (props) =>
    soundEffectTracks({
      shutter: props.params.shutterSound,
      photos: props.params.photosSound,
      change: props.params.changeSound,
      swoosh: props.params.swooshSound,
    }),
});

export type PresetFlipProps = z.output<typeof presetFlipTemplate.schema>;

/** What the timeline depends on (structural, so the manifest can use it before its own type exists). */
interface TimelineProps {
  readonly fps: number;
  readonly media: Readonly<Record<string, unknown>>;
  readonly params: {
    readonly clip: VideoRange;
    readonly revealEffect: RevealEffectId;
    readonly changeSpeed: number;
    readonly beforeHoldSec: number;
    readonly presetSec: number;
    readonly ctaHoldSec: number;
    readonly shutterBeforeSec: number;
  };
}

/** The timeline of given props (presets = uploaded photos; at least one look is shown). */
export function timelineOf(props: TimelineProps): FlipTimeline {
  const { params } = props;
  const presets = props.media['presets'];
  const effect = REVEAL_EFFECTS.get(params.revealEffect);
  return flipTimeline({
    fps: props.fps,
    clipSec: videoRangeSec(params.clip),
    presets: Array.isArray(presets) ? presets.length : 0,
    beforeHoldSec: params.beforeHoldSec,
    presetSec: params.presetSec,
    ctaHoldSec: params.ctaHoldSec,
    changeSec: effect.durationSec / params.changeSpeed,
    revealedAt: effect.revealedAt,
    shutterBeforeSec: params.shutterBeforeSec,
  });
}
