# vgen — template-based video generator

Local service that renders short social videos (Reels, TikTok, Shorts, feed) from motion templates.
Pick a template, drop in photos and texts, choose a format, a style preset and a music fragment,
press Generate, get an MP4 (H.264 / yuv420p / AAC 48 kHz / faststart).

- **Admin** (Vue 3 + shadcn-vue): template gallery, a "create video" screen generated from the
  template's schema with a live preview, renders with real-time progress, music library with
  waveforms, style presets.
- **API** (NestJS): engines, templates, media, music, presets, renders (+ Server-Sent Events),
  preview frames. OpenAPI at `/api/docs`.
- **Render workers**: one BullMQ worker and Docker image per render engine. The first engine is
  [Remotion](https://www.remotion.dev); a `fake` engine (plain ffmpeg, hidden by default:
  `make fake-on` / `make fake-off`) proves that engines plug in
  without core changes.

## Quick start

Requirements: Docker (Docker Desktop or OrbStack) with at least 8 GB of memory, GNU Make.
Node and pnpm on the host are optional (dependencies are installed inside a container).

```bash
make up      # first run: creates .env, installs dependencies, migrates, starts everything
make seed    # default style preset per template + music from ./seed (see seed/README.md)
make help    # all commands
```

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Admin    | http://localhost:5173                 |
| API      | http://localhost:3800/api/v1          |
| Swagger  | http://localhost:3800/api/docs        |
| Studio   | http://localhost:3801 (`make studio`) |
| Postgres | 127.0.0.1:5433                        |

Host ports are configurable in `.env` (`*_HOST_PORT`). No login: the API has an auth stub that
treats every request as the system user (see [docs/architecture.md](docs/architecture.md)).

Until a track is added (Music screen, or `./seed` + `make seed`) videos render with a silent
audio track and the admin shows a warning.

## Commands

| Command                                                                                     | What it does                                                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `make up` / `make down` / `make restart [s=api]`                                            | start (background) / stop / restart services                                                   |
| `make build` / `make rebuild`                                                               | build dev images / rebuild without cache and start                                             |
| `make logs [s=api]` / `make ps` / `make shell s=api`                                        | logs, status, shell in a container                                                             |
| `make clear`                                                                                | delete containers, volumes (database, media) and build outputs (asks first)                    |
| `make migrate` / `make migration-generate name=AddFoo` / `make migration-revert`            | database migrations                                                                            |
| `make seed`                                                                                 | default presets + music from `./seed` (idempotent)                                             |
| `make check`                                                                                | **all checks** (lint, test, check-jitter, test-e2e); required before/after dependency upgrades |
| `make test` / `make test-e2e`                                                               | unit tests / end-to-end smoke on the running stack                                             |
| `make check-jitter`                                                                         | render check: slowly moving overlays must not judder (after Remotion/Chromium upgrades)        |
| `make lint` / `make format`                                                                 | catalog check, ESLint, Prettier, type checks / auto-fix                                        |
| `make studio` / `make fixtures` / `make demo`                                               | template development (below)                                                                   |
| `make fake-on` / `make fake-off`                                                            | show / hide the fake dev-stub engine (hidden by default)                                       |
| `make render args="..."`                                                                    | render through the real queue and worker, without the API                                      |
| `make prod-build` / `make prod-up` / `make prod-seed` / `make prod-logs` / `make prod-down` | production images (below)                                                                      |

## Architecture in two paragraphs

The core — API, `worker-core`, admin — only knows two contracts from `packages/shared`:
`TemplateDefinition` (a zod props schema = shared base schema + template fields, media slots,
formats, poster frame, optional media checks, asset-preparation hook and UI hints) and
`RenderEngine` (manifest + `render` / `renderStill`). `packages/catalog` is the only place that
lists installed engines; the API and the admin import their isomorphic manifests, each worker
imports its own engine's server adapter. Forms, validation, presets (fields are tagged
`content` or `style`) and the API's JSON Schema are all derived from the template's zod schema.
Lint rules keep the core free of Remotion, React and template-specific code.

`POST /renders` validates props, stores a snapshot and enqueues a job on `render-<engine>`. The
engine's worker downloads the originals, normalizes photos (EXIF, sRGB, size, sharpen), runs the
template hook, serves the files to the renderer on a loopback HTTP server, renders, brings the
output to the delivery spec with ffmpeg, extracts the poster frame and stores everything.
Progress and status go through Redis pub/sub to the API, which streams them to the admin over SSE.
More: [docs/architecture.md](docs/architecture.md).

Guides: [adding a template](docs/adding-a-template.md) · [adding an engine](docs/adding-an-engine.md) ·
[admin conventions](docs/frontend.md).

## Template development

```bash
make fixtures                       # prepare the before/after photo pair in fixtures/.studio
make studio                         # Remotion Studio with live reload: http://localhost:3801
make demo                           # render all reveal effects (9:16) into fixtures/renders
make demo args="--formats=9:16,16:9 --effects=blinds"
make demo args="--frames=60,200"    # quick stills instead of full videos
make demo args="--set=params.finale=rereveal --set=style.grain=0.2"
make demo args="--frames=40-80 --png"          # lossless stills of a frame range
make demo args="--range=45-130 --crf=1"        # near-lossless video of a frame range
make check-jitter                   # fails if moving overlays snap to the pixel grid in renders
make reference file=references/<file>.mp4   # break down a reference video (frames, sheets, cuts, beats)
make reference-compare file=references/<slug>/<video>.mp4 render=<render>.mp4   # side by side + timing
make demo args="--template=before-after-card --photos=references/<slug>/compare-photos"
```

New templates can start from a reference video: `make reference` writes frames, contact sheets,
cuts, a motion curve, music onsets and a timeline to `references/<slug>/` (git- and
docker-ignored: third-party footage is for analysis only). The Claude Code command
`/template-from-reference <video> [notes]` (`.claude/commands/`) walks through breakdown,
contract, implementation and a side-by-side comparison.

The dev `worker-remotion` rebuilds its Remotion bundle when composition sources (the engine
package or `@vgen/shared`) change: debounced, only while it is not rendering (a running render
keeps its bundle; jobs that arrive during a rebuild wait for it). A failed build keeps the
previous bundle and logs the error. Production images use the bundle prebuilt at image build.

Drop your own photos into `fixtures/` as `before.<jpg|png|webp>` and `after.<jpg|png|webp>`;
otherwise `make fixtures` synthesizes a landscape pair.

## API

REST under `/api/v1`, OpenAPI at `/api/docs` (JSON: `/api/docs-json`). Every error has the shape
`{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [{ "path": "props.fps", "message": "..." }] } }`.

| Endpoint                                                                                    | Purpose                                                                                  |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /engines`, `GET /templates[?engine=]`, `GET /templates/:id`                            | catalog; template detail includes the props JSON Schema, defaults, UI hints              |
| `POST /media` (multipart `files`), `DELETE /media/:id`                                      | upload photos (JPEG/PNG/WebP) and audio (MP3/WAV/M4A/AAC); type is detected from content |
| `GET /media/:id`, `GET /media/:id/file[?variant=preview\|peaks&download=1]`                 | metadata / file with HTTP Range (preview image, waveform peaks)                          |
| `GET/POST /music`, `PATCH/DELETE /music/:id`, `POST /music/:id/default`                     | music library (a track = an uploaded audio file)                                         |
| `GET/POST /presets[?templateId=]`, `PATCH/DELETE /presets/:id`, `POST /presets/:id/default` | style presets (style-scoped props only)                                                  |
| `POST /renders` `{ templateId, props, quality?, presetId? }`                                | validate, store a props snapshot, enqueue; returns media/music warnings                  |
| `GET /renders[?status=&templateId=&engine=&page=&pageSize=]`, `GET /renders/:id`            | jobs with output/thumbnail links                                                         |
| `POST /renders/:id/cancel`, `POST /renders/:id/duplicate`, `DELETE /renders/:id`            | cancel / re-render with the same props / delete (409 while active)                       |
| `GET /renders/:id/events`, `GET /renders/events`                                            | Server-Sent Events: status + progress (snapshot first for a single render)               |
| `POST /previews` `{ templateId, props, frame? }`, `GET /previews/:key`                      | a still frame rendered by the engine's worker (engines without a browser player)         |

```bash
curl -F files=@fixtures/before.jpg -F files=@fixtures/after.jpg localhost:3800/api/v1/media
curl -H 'content-type: application/json' localhost:3800/api/v1/renders \
  -d '{"templateId":"before-after","props":{"media":{"before":"<id>","after":"<id>"}}}'
curl -N localhost:3800/api/v1/renders/<renderId>/events
```

## Tests

**`make check` runs everything** — lint (catalog check, ESLint, Prettier, type checks), unit
tests, `check-jitter` and the end-to-end smoke (it starts the stack if needed and waits until it is
healthy) — and stops at the first failure. It is **required before and after upgrading any
dependency** (see [Version pinning](#version-pinning-read-before-upgrading-dependencies)).

- `make test` — unit tests (Vitest): props schemas and sanitizing, timelines, registries, catalog
  isomorphism, queue consumer decisions, services of the API, schema-driven form builder, ffmpeg
  arguments of the fake engine, and a type test that a template breaking the contract does not compile.
- `make test-e2e` — on the running stack: generates a photo pair, uploads it, renders
  before/after with defaults and checks the MP4 with ffprobe (h264, yuv420p, 1080×1920, 13 s,
  AAC 48 kHz, faststart); with the fake engine enabled (`make fake-on`), also its template and a
  preview frame.
  Everything it creates is deleted. Against another stack: `E2E_API_URL=http://host:port`.
- `make check-jitter` — renders the slow drift of an overlay label as lossless stills and fails
  when its motion snaps to the pixel grid (limits and calibration in
  `packages/engines/remotion/src/testing/motion-metrics.ts`).

## Rendering without the UI

```bash
make render args="--media=before:fixtures/before.jpg --media=after:fixtures/after.jpg"
make render args="--media=before:fixtures/before.jpg --media=after:fixtures/after.jpg --quality=high \
  --music=fixtures/generated/test-track.mp3 --props='{\"format\":\"16:9\",\"music\":{\"startSec\":5}}'"
make render args="... --cancel-after=4"   # exercise cancellation
```

Output lands in the `media` volume under `renders/<jobId>/`. Quality presets (`social`, `high`)
live in `packages/worker-core/src/quality.ts`.

## Production images

`docker/prod.Dockerfile` builds every workspace package with `tsc`, bundles the Remotion
compositions once, and `pnpm deploy`s self-contained apps:

| Image                       | Contents                                                                    |
| --------------------------- | --------------------------------------------------------------------------- |
| `vgen/api:prod`             | compiled API, production dependencies, ffmpeg                               |
| `vgen/worker-remotion:prod` | compiled worker, prebuilt Remotion bundle, Chrome Headless Shell (baked in) |
| `vgen/admin:prod`           | static admin on nginx, which also proxies `/api` (SSE unbuffered)           |

```bash
make prod-build && make prod-up    # http://localhost:8080 (PROD_HOST_PORT), separate volumes
make prod-seed
```

The prod stack hides the `fake` engine (`DISABLED_ENGINES=fake`), logs JSON and runs as the
unprivileged `node` user. Deployment itself (registry, secrets, TLS) is out of scope.

Chrome Headless Shell is downloaded once, into the Remotion engine package: Remotion caches it
next to the nearest `package.json` of the working directory, so the engine pins that location
(`ensureRemotionBrowser`) for the worker, the demo script and Studio alike.

## Monorepo layout

```
apps/api               NestJS REST API, queue producer, media serving, previews
apps/admin             Vue 3 + shadcn-vue admin
apps/worker-<engine>   thin per-engine render worker (remotion, fake)
packages/shared        engine-agnostic contracts, base props schema, registries, DTO schemas
packages/db            TypeORM entities + migrations (shared by api and workers)
packages/storage       StorageService port + local implementation (S3 later)
packages/media         sharp / ffprobe / ffmpeg helpers (photos, delivery checks, waveform peaks)
packages/worker-core   engine-agnostic render pipeline: queue consumer, assets, post-processing
packages/catalog       the only place that lists the installed render engines
packages/engines/*     render engine adapters with their templates (remotion, fake)
tools/devtools         dev-only CLI (render without the API, e2e smoke)
docker/                dev and production Dockerfiles, nginx config
```

Workspace packages are consumed from their TypeScript sources in development through the
`@vgen/source` export condition (Node via `@swc-node/register`, Vite, Remotion's webpack, the IDE).
Production builds compile them with `tsc`.

## Package manager

pnpm only (`packageManager` is pinned; other package managers are refused by a `preinstall`
check). Use `pnpm`, `pnpm exec` and `pnpm dlx`.

## Version pinning (read before upgrading dependencies)

> **Required for every dependency upgrade:** run `make check` on the current versions first (so
> you know the baseline is green), upgrade, then run `make check` again. Do not merge an upgrade
> with a failing check.

All versions live in the `catalog:` section of `pnpm-workspace.yaml`, and every package uses
`"catalog:"` (or `workspace:*`). Two guards keep it that way, so tools that edit `package.json`
(e.g. the shadcn-vue CLI) cannot silently pin other versions:

- `.npmrc` sets `catalog-mode=strict`: `pnpm add <pkg>@<version>` fails when it differs from the catalog;
- `make lint` runs `scripts/check-catalog.mjs`: non-catalog specifiers, and more than one resolved
  version of zod / remotion / `@remotion/*` / react in `pnpm-lock.yaml`, fail the build. It also
  fails if pnpm rewrote `pnpm-workspace.yaml` and dropped the Remotion/zod note.

- **Remotion and zod must be upgraded together.** Every `remotion` / `@remotion/*` package must
  share one exact version, and each Remotion release requires one **exact** zod version
  (Remotion 4.0.535 → zod 4.5.4). Remotion Studio warns about any mismatch, and schema-driven
  features can break. After bumping Remotion, check the required zod version with
  `pnpm --filter @vgen/engine-remotion exec remotion versions` and update `zod` in the same change.
  Then run `make check`: besides everything else it includes `check-jitter`, because smooth
  overlay motion in renders relies on Chromium details (`core/placement.ts`).
- **TypeScript stays on 6.x** for now: `typescript-eslint` and `@nestjs/swagger` do not support
  TypeScript 7 yet.
- **Validation uses Nest 12 native Standard Schema support** (`@Body({ schema })` +
  `StandardSchemaValidationPipe`), so `nestjs-zod` is not used.
- **vee-validate 4.15 (stable) does not support Standard Schema** — only its own `TypedSchema`
  (Standard Schema arrives in v5, still in beta). The admin uses a small zod-4 → `TypedSchema`
  adapter; drop it once vee-validate 5 is stable.

## Remotion license

Remotion is not MIT-licensed. Its [license](https://www.remotion.dev/docs/license) (checked
October 2026, Remotion 4.x) allows free use for **individuals**, **for-profit organizations with
up to 3 employees**, non-profits, and evaluation before commercial use. Free-license users may
create videos commercially and modify Remotion, but may not sell or sublicense their derivative of
Remotion's code. Larger companies need a paid Company License. This project is a personal,
single-person project, so the free license applies. Remotion has announced license changes for
v5.0: re-check the terms before upgrading to it or before others use this service in a company.
