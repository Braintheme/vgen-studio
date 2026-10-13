# Adding a template

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
});

export type SlideshowProps = z.output<typeof slideshowTemplate.schema>;
```

Rules that keep everything else automatic:

- Field metadata drives the admin form: `title`, `widget` (`select`, `segmented`, `slider`,
  `switch`, `color`, `font`, `text`, `textarea`, or a custom id), `optionLabels`, `unit`, `step`.
- `scope: 'content'` marks per-video data (it is never saved in presets). Everything else is style.
- Effects and transitions come from the engine registries (`revealEffectField`,
  `seamTransitionField`): their options are generated, not hardcoded.
- Manifests are isomorphic: no React, `remotion`, `sharp` or `node:*` imports (lint-enforced).
- Deterministic: no `Math.random` / `Date.now` (lint-enforced); use the seeded random of the engine.

## 2. The composition (`templates/<id>/Slideshow.tsx`)

A React component receiving `{ props, assets }` (validated props + resolved media URLs). Build it
from `core/` (`PhotoCard` for a full-bleed ↔ 3D card move, `TypeOn` for typewriter text, `pairs/`
for before/after photo alignment and checks, `placement.ts` for anything that moves): scenes (`SceneRenderer`), primitives (`PhotoPlane`, `BlurredBackdrop`, `Label`),
reveals and transitions, `MusicLayer`, typography, `useLayout()` for the four formats and safe
zones, `useFonts()`. Use relative geometry and `cover` framing, so the preview (smaller photos)
matches the render.

Anything that moves across frames moves by **transforms only**: place it with `placeAt(x, y)`
from `core/placement.ts` and never animate `left` / `top` / `width` / `letter-spacing`. The
headless renderer snaps layout positions and glyphs to whole pixels, so layout-driven slow
motion judders in the MP4 even though the browser preview looks smooth.

## 3. Register it

- `packages/engines/remotion/src/manifest/index.ts`: add the template to `templates`.
- `packages/engines/remotion/src/templates/index.ts`: add `entry(slideshowTemplate, Slideshow)`
  to `REMOTION_TEMPLATES` (Studio, bundle and the browser player use this list).

That's it: the API lists it, the admin shows it in the gallery and builds its screen, the worker
renders it. Check with `make studio`, `make demo` (adapt the script for a new template) and a
render from the admin.

## 4. From a reference video

`/template-from-reference <video> [notes]` (Claude Code command) and the tools behind it:
`make reference` (frames, contact sheets, cuts, motion curve, music onsets), `make demo
args="--template=<id> --photos=<dir>"` (render with the reference's own stills) and `make
reference-compare` (side-by-side video, sheets on the same timecodes, move/cut timing within ±2
frames). Easing can be fitted to the reference's motion curve instead of guessed.

## 5. Tests

Put pure logic (timelines, media checks) next to the template with `*.test.ts`; the catalog test
already checks that every template resolves its defaults and that manifests stay isomorphic.
