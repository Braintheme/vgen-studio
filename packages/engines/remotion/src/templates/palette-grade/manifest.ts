import { defineTemplate, imageSlot, textField } from '@vgen/shared';
import type { z } from 'zod';
import { paletteGradeFields, paletteGradeGroups } from '../../core/palette-grade/fields.js';
import { gradeTimeline } from '../../core/palette-grade/timeline.js';
import { photoAdjustmentsField } from '../../core/photo-adjust/schema.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';

export { COLOR_RETURNS, LABEL_POSITIONS, PARTICLE_TRAILS } from '../../core/palette-grade/fields.js';

/**
 * A colour-grading "process" in one shot (reference: references/3): a pie of the after
 * photo's palette builds over the original, the photo turns black and white, the pie
 * collapses into a dot that bursts into colour particles, the image darkens into the grade's
 * tones and the colour comes back while BEFORE turns into AFTER.
 */
export const paletteGradeTemplate = defineTemplate({
  id: 'palette-grade',
  engine: 'remotion',
  version: '1.4.0',
  name: 'Before / After — Palette Grade',
  // Gallery card (admin static file; regenerate from fixture renders when the look changes).
  thumbnailUrl: '/template-previews/palette-grade.jpg',
  description:
    'The edit’s colour palette appears as a pie, collapses into a dot and bursts into the photo as the grade comes in.',
  mediaSlots: [
    imageSlot('before', { label: 'Before', required: true, description: 'Original photo' }),
    imageSlot('after', {
      label: 'After',
      required: true,
      description: 'Edited photo, same framing; its colours make the palette',
    }),
  ],
  duration: { default: 7, min: 6, max: 12 },
  texts: {
    beforeLabel: textField({ label: 'Before label', default: 'BEFORE', maxLength: 16, scope: 'style' }),
    afterLabel: textField({ label: 'After label', default: 'AFTER', maxLength: 16, scope: 'style' }),
  },
  params: {
    // Shared by every before/after template (two columns in the admin).
    adjust: photoAdjustmentsField(),
    // The process's options (shared with other templates' palette finales).
    ...paletteGradeFields(),
  },
  defaults: {
    style: {
      colors: { text: '#ffffff' },
      fonts: { heading: 'unbounded', body: 'unbounded' },
      vignette: 0,
      grain: 0,
    },
    // The template's own track starts on a hit: no fade-in.
    music: { fadeInSec: 0, fadeOutSec: 0.4 },
  },
  ui: {
    groups: [
      ...paletteGradeGroups('params.', ['texts.beforeLabel', 'texts.afterLabel']),
      { id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] },
    ],
    slotActions: [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }],
  },
  // The graded photo with AFTER in place.
  posterFrame: (props) => {
    const t = gradeTimeline({
      durationSec: props.durationSec,
      fps: props.fps,
      introHoldSec: props.params.introHoldSec,
      speed: props.params.processSpeed,
    });
    return Math.min(t.totalFrames - 1, t.end + Math.round(0.3 * props.fps));
  },
  checkMedia: checkBeforeAfterMedia,
  prepareAssets: alignBeforeAfter,
});

export type PaletteGradeProps = z.output<typeof paletteGradeTemplate.schema>;
