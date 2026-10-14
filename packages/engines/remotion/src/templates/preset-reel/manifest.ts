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
import { backgroundField } from '../../core/backgrounds/registry.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { REVEAL_EFFECTS, revealEffectField, type RevealEffectId } from '../../core/reveals/registry.js';
import { seamTransitionField } from '../../core/transitions/registry.js';
import { reelTimeline, type ReelTimeline } from './timeline.js';

export const TITLE_SIZES = ['s', 'm', 'l'] as const;
export const TITLE_ANIMATIONS = ['rise', 'none'] as const;

/** Transitions that suit a zoom between sections. */
const SEAM_OPTIONS = ['punch-zoom', 'zoom-through', 'fade', 'soft-focus', 'none'] as const;

const slider = (title: string, min: number, max: number, value: number, step: number, unit?: string) =>
  z
    .number()
    .min(min)
    .max(max)
    .default(value)
    .meta({ title, widget: 'slider', step, ...(unit ? { unit } : {}) });

/**
 * A preset showcase (reference: references/2): the user's clip of taking the shot with a
 * styled title, a zoom into the camera, the Lightroom settings as a screenshot slideshow on
 * an animated background, another zoom, and the before/after inside an instant-photo card.
 */
export const presetReelTemplate = defineTemplate({
  id: 'preset-reel',
  engine: 'remotion',
  version: '1.1.0',
  name: 'Preset Reel',
  description:
    'Your clip with a title, a zoom into the camera, the Lightroom settings screenshots, then the before/after on an instant-photo card.',
  mediaSlots: [
    videoSlot('clip', {
      label: 'Clip',
      required: true,
      description: 'Video of taking the shot (MP4, MOV)',
      range: 'params.clip',
    }),
    {
      key: 'settings',
      kind: 'image',
      label: 'Settings screenshots',
      required: true,
      description: 'In the order they are shown',
      multiple: { min: 1, max: 20 },
    },
    imageSlot('before', { label: 'Before', required: true, description: 'Original photo' }),
    imageSlot('after', { label: 'After', required: true, description: 'Edited photo, same framing' }),
  ],
  // The length follows the content (clip + screenshots + card); this field is hidden.
  duration: { default: 20, min: 4, max: 90 },
  texts: {
    titleLead: textField({ label: 'Title: first line', default: 'How to get that', maxLength: 40 }),
    titleHero: textField({ label: 'Title: main line', default: '"Aesthetic"', maxLength: 28 }),
    titleTail: textField({
      label: 'Title: last line (*accent*)',
      default: 'Look in *Lightroom*',
      maxLength: 40,
    }),
    settingsTitle: textField({
      label: 'Settings title',
      default: 'Lightroom Settings',
      maxLength: 32,
      scope: 'style',
    }),
    cardTitle: textField({ label: 'Card title', default: 'Shot on Canon T1000', maxLength: 40 }),
    cardLens: textField({ label: 'Lens', default: '50MM', maxLength: 24 }),
    cardExposure: textField({ label: 'Exposure', default: '1/2500  F1.2  ISO 100', maxLength: 40 }),
    cardFooter: textField({
      label: 'Card footer',
      default: 'YOURSITE.COM - Premium Lightroom Presets',
      maxLength: 60,
      scope: 'style',
    }),
  },
  params: {
    clip: videoRangeField({ label: 'Clip fragment', minSec: 3, maxSec: 30, defaultSec: 12 }),
    framing: z
      .object({
        zoom: slider('Zoom', 1, 3, 1, 0.05, '×'),
        x: slider('Move left / right', -1, 1, 0, 0.05),
        y: slider('Move up / down', -1, 1, 0, 0.05),
      })
      .prefault({})
      .meta({ title: 'Framing', scope: 'content' }),
    punchIn: z
      .object({
        enabled: z.boolean().default(true).meta({ title: 'Punch-in on the camera', widget: 'switch' }),
        atSec: slider('Punch-in at (into the fragment)', 0, 30, 8, 0.1, 's'),
        scale: slider('Punch-in zoom', 1.2, 3, 2, 0.05, '×'),
        x: slider('Punch-in point: left / right', -1, 1, 0, 0.05),
        y: slider('Punch-in point: up / down', -1, 1, -0.1, 0.05),
      })
      .prefault({})
      .meta({ title: 'Punch-in', scope: 'content' }),
    clipAudio: z
      .object({
        enabled: z.boolean().default(false).meta({ title: 'Sound of the clip', widget: 'switch' }),
        volume: slider('Clip volume', 0, 1, 0.6, 0.05),
      })
      .prefault({}),
    titleSize: z
      .enum(TITLE_SIZES)
      .default('m')
      .meta({
        title: 'Title size',
        widget: 'segmented',
        optionLabels: { s: 'Small', m: 'Medium', l: 'Large' },
      }),
    titleAccentFont: FontIdSchema.default('jetbrains-mono').meta({ title: 'Accent font', widget: 'font' }),
    titleAnimation: z
      .enum(TITLE_ANIMATIONS)
      .default('rise')
      .meta({ title: 'Title entrance', widget: 'segmented', optionLabels: { rise: 'Rise', none: 'None' } }),
    background: backgroundField({ title: 'Settings background', default: 'light-streaks' }),
    screenSec: slider('Time per screenshot', 0.3, 3, 0.8, 0.05, 's'),
    screenBorder: z
      .object({
        width: slider('Border width', 0, 32, 16, 1, 'px'),
        color: ColorSchema.default('#a3a8a3').meta({ title: 'Border color' }),
        radius: slider('Corner radius', 0, 40, 3, 1, 'px'),
      })
      .prefault({}),
    panelFloat: z.boolean().default(true).meta({ title: 'Screenshots float gently', widget: 'switch' }),
    revealEffect: revealEffectField({ title: 'Before / after transition', default: 'line-wipe' }),
    beforeHoldSec: slider('Before shows for', 0.4, 3, 0.8, 0.1, 's'),
    afterHoldSec: slider('After shows for', 0.5, 5, 1.5, 0.1, 's'),
    backdropDim: slider('Card background dim', 0, 0.9, 0.55, 0.05),
    toSettings: seamTransitionField({
      title: 'Clip → settings',
      allowed: SEAM_OPTIONS,
      default: 'punch-zoom',
    }),
    toCard: seamTransitionField({ title: 'Settings → card', allowed: SEAM_OPTIONS, default: 'punch-zoom' }),
    shutterSound: soundEffectField({ label: 'Shutter sound before the settings' }),
    shutterBeforeSec: slider('Shutter before the zoom', 0.2, 1.5, 0.6, 0.05, 's'),
    // Centered on the wipe whatever its length (short built-in or a long library swoosh).
    swooshSound: soundEffectField({ label: 'Swoosh on the before / after', volume: 0.6 }),
  },
  defaults: {
    style: {
      colors: { background: '#0a0605', text: '#ffffff', accent: '#e4f028' },
      fonts: { heading: 'montserrat', body: 'inter' },
      radius: 8,
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
        fields: ['params.clip', 'params.framing', 'params.punchIn', 'params.clipAudio'],
      },
      {
        id: 'title',
        label: 'Title',
        fields: [
          'texts.titleLead',
          'texts.titleHero',
          'texts.titleTail',
          'params.titleSize',
          'params.titleAccentFont',
          'params.titleAnimation',
        ],
      },
      {
        id: 'settings',
        label: 'Settings screenshots',
        fields: [
          'texts.settingsTitle',
          'params.background',
          'params.screenSec',
          'params.screenBorder',
          'params.panelFloat',
        ],
      },
      {
        id: 'card',
        label: 'Before / after card',
        fields: [
          'texts.cardTitle',
          'texts.cardLens',
          'texts.cardExposure',
          'texts.cardFooter',
          'params.revealEffect',
          'params.beforeHoldSec',
          'params.afterHoldSec',
          'params.backdropDim',
        ],
      },
      {
        id: 'seams',
        label: 'Transitions & sounds',
        fields: [
          'params.toSettings',
          'params.toCard',
          'params.shutterSound',
          'params.shutterBeforeSec',
          'params.swooshSound',
        ],
      },
    ],
    slotActions: [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }],
  },
  resolveMetadata: (props) => ({
    ...FORMATS[props.format],
    fps: props.fps,
    durationInFrames: timelineOf(props).totalFrames,
  }),
  // The card with the after photo, just after the wipe.
  posterFrame: (props) => {
    const timeline = timelineOf(props);
    return Math.min(timeline.totalFrames - 1, timeline.reveal.from + timeline.reveal.duration + 2);
  },
  checkMedia: checkBeforeAfterMedia,
  prepareAssets: alignBeforeAfter,
  soundTracks: (props) =>
    soundEffectTracks({ shutter: props.params.shutterSound, swoosh: props.params.swooshSound }),
});

export type PresetReelProps = z.output<typeof presetReelTemplate.schema>;

/** What the timeline depends on (structural, so the manifest can use it before its own type exists). */
interface TimelineProps {
  readonly fps: number;
  readonly media: Readonly<Record<string, unknown>>;
  readonly params: {
    readonly clip: VideoRange;
    readonly screenSec: number;
    readonly beforeHoldSec: number;
    readonly afterHoldSec: number;
    readonly revealEffect: RevealEffectId;
    readonly punchIn: { readonly enabled: boolean; readonly atSec: number };
    readonly shutterBeforeSec: number;
  };
}

/** The timeline of given props (screens = uploaded screenshots; at least one is shown). */
export function timelineOf(props: TimelineProps): ReelTimeline {
  const { params } = props;
  const screens = props.media['settings'];
  return reelTimeline({
    fps: props.fps,
    clipSec: videoRangeSec(params.clip),
    screens: Array.isArray(screens) ? screens.length : 0,
    screenSec: params.screenSec,
    beforeHoldSec: params.beforeHoldSec,
    revealSec: REVEAL_EFFECTS.get(params.revealEffect).durationSec,
    afterHoldSec: params.afterHoldSec,
    punchInAtSec: params.punchIn.enabled ? params.punchIn.atSec : null,
    shutterBeforeSec: params.shutterBeforeSec,
  });
}
