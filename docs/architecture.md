# Architecture

## Components

```
            ┌──────────── admin (Vue) ─────────────┐
            │ schema-driven forms, engine players,  │
            │ Vue Query + SSE                       │
            └──────────────┬───────────────────────┘
                           │ REST /api/v1, SSE
┌──────────────────────────▼──────────────────────────┐
│ api (NestJS)   catalog · media · music · presets ·   │──── Postgres (TypeORM)
│                renders · previews · auth stub        │──── media volume (StorageService)
└───────┬───────────────────────────────▲─────────────┘
        │ BullMQ: render-<engine>        │ Redis pub/sub: progress, status, cancel
┌───────▼───────────────────────────────┴─────────────┐
│ worker-<engine> = worker-core + the engine adapter   │──── Postgres, media volume
└──────────────────────────────────────────────────────┘
```

| Package                | Role                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`      | contracts (`TemplateDefinition`, `RenderEngine`, `PlayerAdapter`), base props schema, registries, DTO and event schemas, props scope/sanitize helpers |
| `packages/catalog`     | composition root of engines: the only list of installed engine manifests and player loaders                                                           |
| `packages/engines/*`   | one package per engine: `./manifest` (isomorphic), `./server` (worker), optional `./player` (browser)                                                 |
| `packages/worker-core` | engine-agnostic worker: queue consumer, render pipeline, asset preparation, delivery post-processing, progress, cancel, previews                      |
| `packages/db`          | entities and migrations shared by the API and workers                                                                                                 |
| `packages/storage`     | `StorageService` port (+ local implementation) and storage key layout                                                                                 |
| `packages/media`       | sharp / ffprobe / ffmpeg helpers                                                                                                                      |

Boundaries are enforced by ESLint (`eslint.config.js`, `apps/admin/eslint.layers.js`): the core
cannot import `remotion`, `react` or engine packages except through the catalog; manifests cannot
import renderer code (the catalog test bundles it for the browser to prove it).

## Templates and props

A template is declared with `defineTemplate()` (see [adding-a-template.md](adding-a-template.md)).
Its props schema is the **base schema** (format, duration, fps, seed, media, texts, style, music,
image processing) extended with the template's text fields and `params`. One zod schema drives:

- validation in the API (`POST /renders`) and in the worker (stored snapshot);
- the JSON Schema served by `GET /templates/:id` and the admin's generated form
  (field metadata via `.meta({ title, widget, optionLabels, unit, step, scope })`);
- presets: every field is `scope: 'content'` (media, per-video texts) or `'style'` (default).
  A preset stores the style part; applying it = template defaults ← preset style ← current content;
- draft and preset sanitizing: stored values that no longer fit the current schema fall back to
  defaults (`sanitizeTemplateSettings`).

Renders keep a full props snapshot plus the template version, so a duplicate re-renders the same
video (the admin warns when the template version changed since).

## Render flow

1. `POST /renders` → props validated, media checked (existence, kind; template `checkMedia`
   warnings), music checked (`NO_MUSIC` warning), `RenderJob` row created, BullMQ job
   `render` with the same id added to `render-<engine>`.
2. The engine's worker (`worker-core` pipeline):
   - marks the job `rendering` (conditional update — cancels and retries cannot race);
   - downloads originals from storage into a temp dir, normalizes photos (EXIF orientation,
     sRGB, size relative to the output frame, sharpen) and runs the template's `prepareAssets`;
   - serves the files on a loopback HTTP server (Chromium blocks `file://`);
   - calls `engine.render()` with resolved assets (`{ src, width, height }`) and encoding settings;
   - `ensureDeliverySpec`: ffprobe; remux for faststart or re-encode only when needed; a silent
     AAC track when there is no music;
   - extracts the poster frame (`template.posterFrame`), stores output + thumbnail as media
     assets, marks the job `done`.
3. Progress is throttled (500 ms) into the DB and Redis pub/sub; each API instance relays events
   to SSE clients (`/renders/events`, `/renders/:id/events`). The admin falls back to polling
   while the stream is down.
4. Cancel: a queued job is removed from BullMQ; a running one gets a Redis message → the worker
   aborts the BullMQ job's `AbortSignal` → the engine stops. Failures never crash a worker:
   permanent errors fail at once, transient ones retry (`RENDER_ATTEMPTS`).

## Previews

The admin previews through the engine's **player adapter** when it has one (Remotion: a React
island with `@remotion/player`, lazily loaded; the same composition code as the render, fed with
the ~1600 px preview copies of the photos). Engines without a browser player
(`capabilities.browserPreview: false`) get **poster frames**: `POST /previews` validates props,
hashes everything that affects the frame and either returns the cached JPEG or enqueues a
high-priority `preview` job on the engine's queue and waits for it (60 s timeout → 503
`WORKER_UNAVAILABLE`). The worker reuses the same asset preparation and calls `engine.renderStill`.

## Remotion engine internals

Templates are compositions of shared, data-driven blocks in `packages/engines/remotion/src/core`:
registries of reveal effects and seam transitions (a template picks allowed ids and a default;
each reveal declares its natural `durationSec` and `revealedAt`), primitives (`PhotoPlane` with a
virtual camera, `PhotoCard`, `VideoPlane`, `ScreenshotPanel`, `InstantCard`, `PaletteWheel`,
`ParticleBurst`, `Ripple`, labels, overlays), a photo `palette/` (read in the composition, so the preview and
the render agree),
animated backgrounds (`backgrounds/` registry), typography, sound cues, before/after `pairs/`
helpers, `SeamedSection` (sections whose seams are centered on their boundaries, so cut-style
transitions lose no content) and a `SceneRenderer` that turns effect descriptions (plain data)
into DOM. Everything that moves is
placed with transforms only (`placement.ts`): headless Chrome snaps layout positions and glyphs to
whole pixels, and `make check-jitter` fails when that comes back.

In development the Remotion worker rebuilds its bundle when composition sources change
(debounced; never during a render). Production images ship a bundle prebuilt at image build and a
baked-in Chrome Headless Shell.

## Video media

Uploads with a real video stream (MP4/MOV, any codec ffmpeg reads) become `video` assets. The
original is stored as is; at upload the API also writes a poster (the `preview` variant, so
media cards work unchanged), a light H.264 **proxy** (short side ≤ 720 px, dense keyframes) for
the browser and a **filmstrip** (one row of evenly spaced frames) for trimming
(`MediaAssetDto.video`). Videos are short (tens of seconds), so this runs inside the upload
request (`MAX_UPLOAD_MB`, default 1 GB).

A video slot points at a `videoRangeField` of the template (`videoSlot(..., { range })`): the
worker cuts exactly that fragment from the original (frame-accurate, the output fps, sized to
cover the frame twice over, H.264 + AAC) and hands the engine a `ResolvedVideo` with
`startSec: 0`. The admin preview plays the proxy instead, starting at the range start. Templates
place videos with `VideoPlane` (zoom/pan framing, punch-ins by transforms).

Templates may derive their length from content (`resolveMetadata`, e.g. clip + screenshots +
card) and hide `durationSec`; the admin then sizes the music fragment by the derived length.

## Media library

The admin's **Media** page lists uploaded photos and videos (`GET /media`: type filter, sort,
pages, total size; each item with how many renders use it, found in the renders' props
snapshots). Files can be deleted in bulk (`POST /media/bulk-delete`) or with "unused older than
N days" (`POST /media/cleanup`, counted first with `dryRun`). Drafts live in the browser, so the
admin sends the files its drafts hold as `keepIds`: they are never cleaned up. Deleting a file a
render uses keeps that render's video; only re-rendering it fails. Media slots can also pick
already uploaded files ("From library") instead of uploading them again. No automatic cleanup.

## Sound cues

`soundEffectField()` is a cue (`{ enabled, trackId, volume }`): `trackId: null` plays the engine's
built-in sound (synthesized, license-free: `pnpm --filter @vgen/devtools sfx`), otherwise a track
from the music library. A template lists the chosen tracks with `soundTracks(props)`; the worker
and the admin preview resolve them into `ResolvedAssets.sounds`.

## Music

Uploaded audio gets waveform peaks (ffmpeg, stored next to the file) so the admin draws the
waveform without decoding the file. `music.trackId = null` means "the library default track";
a deleted track is a 400 for new renders, and drafts/presets that reference it fall back to the
default with a notice. The fragment starts at `music.startSec`; tracks shorter than the video loop.

## Development tooling

- `make fake-on` / `make fake-off`: the fake stub engine (`worker-fake` + `test-card`) is hidden by
  default (`DISABLED_ENGINES=fake`); e2e covers it only when enabled.
- Reference videos (`references/<n>/`, git- and docker-ignored): `make reference` (frames, contact
  sheets, cuts, motion curve, onsets) and `make reference-compare` (side by side + timing) back the
  `/template-from-reference` Claude Code command.
- `make check` runs lint, unit tests, `check-jitter` and the e2e smoke; it is required before and
  after dependency upgrades.

## Configuration and operations

- Env is validated with zod at startup (`apps/api/src/config/env.schema.ts`,
  `packages/worker-core/src/config.ts`); `.env.example` documents every variable.
- Health checks: API `GET /api/v1/health` (DB, Redis), workers `GET :3100/health` (DB, Redis,
  queue). Logs go to stdout (JSON in production).
- 8 GB of Docker memory is enough with `WORKER_CONCURRENCY=1`, `REMOTION_CONCURRENCY<=4`,
  `shm_size: 2gb`.

## Ready for later (not implemented)

- **Users and permissions**: every request runs in a request context (`nestjs-cls`) with the
  current user from a global `AuthGuard`, which currently returns the system user. Real
  authentication replaces the guard; entities can gain `ownerId` / `workspaceId` by migration.
- **Scaling**: the API is stateless (events go through Redis); workers scale by replicas and
  independently per engine.
- **Storage**: everything goes through `StorageService` + storage keys; an S3/MinIO
  implementation replaces `LocalStorageService`.
