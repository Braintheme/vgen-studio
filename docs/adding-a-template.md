# Adding a template

A new look (for example, a new reference video) is a **new template**, not a variant of an
existing one: templates differ in structure and in how few settings they expose. What they share
lives in the engine's `core/` (effects, transitions, primitives), so a new template is mostly
composition.

A template belongs to one engine. Its engine-agnostic part (schema, media slots, metadata) is a
manifest the API and the admin read; the engine-specific part (for Remotion, React components)
stays inside the engine package. No core code changes and no new admin screens are needed.

## 1. The manifest (`packages/engines/remotion/src/templates/<id>/manifest.ts`)

```ts
import { defineTemplate, imageSlot, textField } from '@vgen/shared';
import { z } from 'zod';
import { revealEffectField } from '../../core/reveals/registry.js';

export const slideshowTemplate = defineTemplate({
  id: 'slideshow', // globally unique
  engine: 'remotion',
  version: '1.0.0', // bump on visible changes; renders store it, drafts/presets are re-validated
  name: 'Slideshow',
  description: 'A few photos with soft transitions.',
  mediaSlots: [
    imageSlot('cover', { label: 'Cover', required: true }),
    // A list slot: a plain MediaSlot with `multiple`.
    { key: 'photos', kind: 'image', label: 'Photos', required: true, multiple: { min: 2, max: 8 } },
  ],
  duration: { default: 10, min: 5, max: 30 },
  texts: {
    title: textField({ label: 'Title', default: 'Weekend', maxLength: 40 }), // content by default
    caption: textField({ label: 'Caption', default: '', enabled: false, scope: 'style' }),
  },
  params: {
    reveal: revealEffectField({ title: 'Transition', default: 'diagonal-wipe' }),
    pace: z.enum(['calm', 'fast']).default('calm').meta({ title: 'Pace', widget: 'segmented' }),
  },
  defaults: { style: { fonts: { heading: 'playfair-display', body: 'inter' } } },
  ui: { groups: [{ id: 'look', label: 'Look', fields: ['params.reveal', 'params.pace'] }] },
  posterFrame: (props) => Math.round(props.durationSec * props.fps * 0.6),
  // Optional:
  // formats: ['9:16', '1:1'],                 all four by default
  // checkMedia: (media) => [...warnings],     non-blocking warnings shown in the admin and API
  // prepareAssets: async (ctx) => {...},      pixel work on prepared photos (never reframing)
  // resolveMetadata: (props) => ({...}),      a length derived from content (hide `durationSec`)
  // soundTracks: (props) => ({...}),          library tracks chosen for sound cues
});

export type SlideshowProps = z.output<typeof slideshowTemplate.schema>;
```

Rules that keep everything else automatic:

- `ui.groups` may carry `visibleWhen: { field, equals }`: the group shows only while that field
  holds one of the values (e.g. the options of the chosen finale in `preset-reel`).
- Field metadata drives the admin form: `title`, `widget` (`select`, `segmented`, `slider`,
  `switch`, `color`, `font`, `text`, `textarea`, or a custom id), `optionLabels`, `unit`, `step`.
- `scope: 'content'` marks per-video data (it is never saved in presets). Everything else is style.
- Effects and transitions come from the engine registries (`revealEffectField`,
  `seamTransitionField`): their options are generated, not hardcoded. Without `allowed`, a
  template offers every registered entry, including ones added later; existing templates pin
  their list so a new effect never changes them. Each reveal effect declares `durationSec`
  (natural length) and `revealedAt` (progress from which "after" dominates) for templates that
  let the effect set the pace (see `before-after-card`).
- Video colour grading: `clipGrade: videoGradeField()` in `params`, a `{ id: 'clip-grade', label:
'Clip color grading', fields: ['params.clipGrade'] }` group and `grade={params.clipGrade}` on
  `VideoPlane`.
- Video: `videoSlot('clip', { label, required, range: 'params.clip' })` plus
  `clip: videoRangeField({ label, minSec, maxSec, defaultSec })` in `params`. The admin shows a
  trimmer next to the video; the worker cuts that fragment. Draw it with `VideoPlane`.
- List slots (`multiple: { min, max }`) get a sortable gallery in the admin; read them with
  `imageAssets(assets.media, key)`.
- Sounds: `soundEffectField({ label })` per cue and `soundTracks: (props) =>
soundEffectTracks({ cue: props.params.cue })`; play them with `SoundCue` (built-in sound when
  no track is chosen). See `templates/preset-reel`.
- `version`: bump it on visible changes (defaults, timing, options). Drafts and presets made with
  another version are re-validated and the owner gets a notice.
- Manifests are isomorphic: no React, `remotion`, `sharp` or `node:*` imports (lint-enforced).
- Deterministic: no `Math.random` / `Date.now` (lint-enforced); use the seeded random of the engine.

## 2. The composition (`templates/<id>/Slideshow.tsx`)

A React component receiving `{ props, assets }` (validated props + resolved media URLs), built
from `core/`:

- scenes and effects: `SceneRenderer`, the reveal and transition registries;
- primitives: `PhotoPlane` (with a camera for Ken Burns moves), `PhotoCard` (full bleed ↔ 3D
  card), `VideoPlane`, `ScreenshotPanel`, `InstantCard`, `BlurredBackdrop`, `Label`, `TagLabel`,
  `PaletteWheel`, `ParticleBurst` (+ seeded `particles/burst.ts`), `Ripple`, `Vignette` / `Grain`;
- `palette/`: `usePhotoPalette(src)` (a photo's colours, computed in the composition under
  `delayRender`; `paletteWedges`, `darkestColor`);
- the backgrounds registry (`BackgroundLayer`, `backgroundField`) and `SeamedSection` for
  sections joined by registered transitions;
- typography: `WordReveal`, `TypeOn` (typewriter), `AccentTitle` (lines with `*accents*`),
  `WordSwap` (one word turning into another: glitch, decode, flip board, typewriter, fade),
  `SlicedText` (a word over a copy of itself in another colour, cut on a slant by a mask);
- `pairs/` for before/after alignment (`prepareAssets`) and media checks; `alignSetTo(anchor,
list)` and `checkPhotoSetMedia(anchor, list)` for a before photo plus a list of edits (see
  `templates/preset-flip`);
- `photo-adjust/` for before/after templates: `adjust: photoAdjustmentsField()` in `params`, a
  `{ id: 'photos', label: 'Photo adjustments', fields: ['params.adjust'] }` group, and
  `useAdjustedPhoto(src, props.params.adjust.before)` / `.after` where the photos are read
  (`beforeAdjustmentsField()` when the "after" photos are finished edits);
- `MusicLayer`, `useLayout()` (the four formats and safe zones), `useFonts()`, `motion.ts`
  (easing, `cubicBezier`, keyframes);
- `placement.ts` for anything that moves.

Use relative geometry and `cover` framing, so the preview (smaller photos) matches the render.
Keep timing in a pure `timeline.ts` with tests (see `templates/before-after-card/timeline.ts`).

Anything that moves across frames moves by **transforms only**: place it with `placeAt(x, y)`
from `core/placement.ts` and never animate `left` / `top` / `width` / `letter-spacing`. The
headless renderer snaps layout positions and glyphs to whole pixels, so layout-driven slow
motion judders in the MP4 even though the browser preview looks smooth. Do not put
`will-change: transform` on layers whose scale changes (frozen raster scale; frames rendered in
different Chrome tabs then differ). `make check-jitter` guards the placement rule.

## 3. Register it

- `packages/engines/remotion/src/manifest/index.ts`: add the template to `templates`.
- `packages/engines/remotion/src/templates/index.ts`: add `entry(slideshowTemplate, Slideshow)`
  to `REMOTION_TEMPLATES` (Studio, bundle and the browser player use this list).

Gallery card: `thumbnailUrl: '/template-previews/<id>.jpg'` in the manifest, a 1280×720 JPEG in
`apps/admin/public/template-previews/` (three key frames of a fixture render, `make demo
--frames=a,b,c`, side by side as rounded phones over a blur of the middle one).

That's it: the API lists it, the admin shows it in the gallery and builds its screen, the worker
renders it (the dev worker rebuilds its bundle on save). Then:

- `make seed` creates the template's "Default" style preset;
- `make studio`, and `make demo args="--template=<id> [--effects=a,b] [--frames=0,100 --png]"`
  (stills or full videos with the fixture photos, or `--photos=/app/<dir>`; paths are absolute
  container paths);
- a render from the admin, and `make check`.

## 4. From a reference video

`/template-from-reference <video> [notes]` (Claude Code command) and the tools behind it:
`make reference` (frames, contact sheets, cuts, motion curve, music onsets), `make demo
args="--template=<id> --photos=<dir>"` (render with the reference's own stills) and `make
reference-compare` (side-by-side video, sheets on the same timecodes, move/cut timing within ±2
frames). Easing can be fitted to the reference's motion curve instead of guessed.

## 5. Tests

Put pure logic (timelines, media checks) next to the template with `*.test.ts`; the catalog test
already checks that every template resolves its defaults and that manifests stay isomorphic.
