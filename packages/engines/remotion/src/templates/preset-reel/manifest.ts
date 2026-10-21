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
import { paletteGradeFields, paletteGradeGroups } from '../../core/palette-grade/fields.js';
import {
  gradeTimeline,
  HOLD_SEC,
  PROCESS_SEC,
  type GradeTimeline,
} from '../../core/palette-grade/timeline.js';
import { photoAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { backgroundField } from '../../core/backgrounds/registry.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { REVEAL_EFFECTS, revealEffectField, type RevealEffectId } from '../../core/reveals/registry.js';
import { seamTransitionField } from '../../core/transitions/registry.js';
import { videoGradeField } from '../../core/video-grade/schema.js';
import { reelTimeline, type ReelTimeline } from './timeline.js';

export const TITLE_SIZES = ['s', 'm', 'l'] as const;
export const TITLE_ANIMATIONS = ['rise', 'none'] as const;
export const FINALES = ['card', 'palette'] as const;

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
  version: '1.7.0',
  name: 'Preset Reel',
  // Gallery card (admin static file; regenerate from fixture renders when the look changes).
  thumbnailUrl: '/template-previews/preset-reel.jpg',
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
      multiple: { min: 1, max: 25 },
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
    // Palette finale.
    beforeLabel: textField({ label: 'Before label', default: 'BEFORE', maxLength: 16, scope: 'style' }),
    afterLabel: textField({ label: 'After label', default: 'AFTER', maxLength: 16, scope: 'style' }),
  },
  params: {
    // Shared by every before/after template (two columns in the admin).
    adjust: photoAdjustmentsField(),
    clip: videoRangeField({ label: 'Clip fragment', minSec: 3, maxSec: 30, defaultSec: 12 }),
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
    // Pinned to the effects it shipped with: effects added to the registry later are opt-in.
    // The last scene: the instant card (the reference), or palette-grade's process full screen.
    finale: z
      .enum(FINALES)
      .default('card')
      .meta({
        title: 'Finale',
        widget: 'segmented',
        optionLabels: { card: 'Instant card', palette: 'Palette grade' },
      }),
    palette: z
      .object({
        ...paletteGradeFields(),
        afterHoldSec: slider('After photo holds', HOLD_SEC.minOutro, 6, 2.3, 0.1, 's'),
      })
      .prefault({}),
    revealEffect: revealEffectField({
      title: 'Before / after transition',
      allowed: ['diagonal-wipe', 'circle-reveal', 'blinds', 'split-slider', 'slide-over', 'line-wipe'],
      default: 'line-wipe',
    }),
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
    // Starts with the wipe inside the card, whatever its length (short built-in or a long track).
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
      { id: 'clip-grade', label: 'Clip color grading', fields: ['params.clipGrade'] },
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
      { id: 'finale', label: 'Finale', fields: ['params.finale'] },
      {
        id: 'card',
        label: 'Before / after card',
        visibleWhen: { field: 'params.finale', equals: ['card'] },
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
      ...paletteGradeGroups('params.palette.', ['texts.beforeLabel', 'texts.afterLabel'], 'palette-', [
        'params.palette.afterHoldSec',
      ]).map((group) => ({
        ...group,
        label: `Palette: ${group.label.toLowerCase()}`,
        visibleWhen: { field: 'params.finale', equals: ['palette'] },
      })),
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
      { id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] },
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
    const palette = paletteTimelineOf(props);
    return palette
      ? Math.min(timeline.totalFrames - 1, timeline.card.from + palette.end + Math.round(0.3 * props.fps))
      : Math.min(timeline.totalFrames - 1, timeline.reveal.from + timeline.reveal.duration + 2);
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
    readonly finale: (typeof FINALES)[number];
    readonly palette: {
      readonly introHoldSec: number;
      readonly processSpeed: number;
      readonly afterHoldSec: number;
    };
  };
}

/** The palette finale's own timeline (local frames), or null for the card. */
export function paletteTimelineOf(props: TimelineProps): GradeTimeline | null {
  const { params } = props;
  if (params.finale !== 'palette') return null;
  const { introHoldSec, processSpeed, afterHoldSec } = params.palette;
  return gradeTimeline({
    durationSec: introHoldSec + PROCESS_SEC.end / processSpeed + afterHoldSec,
    fps: props.fps,
    introHoldSec,
    speed: processSpeed,
  });
}

/** The timeline of given props (screens = uploaded screenshots; at least one is shown). */
export function timelineOf(props: TimelineProps): ReelTimeline {
  const palette = paletteTimelineOf(props);
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
    finaleSec: palette ? palette.totalFrames / props.fps : null,
  });
}
