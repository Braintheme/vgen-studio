# vgen — notes for Claude

Local, single-user service that renders short social videos from motion templates (NestJS API,
BullMQ workers per render engine, Vue 3 + shadcn-vue admin, Remotion as the first engine).
Start with [README.md](README.md); details in [docs/](docs/).

## Working rules (agreed with the owner)

- **Language**: reply in Russian; code, comments, docs and UI copy in English.
- **Git**: do not run git commands (not even read-only) unless the owner explicitly asks for a
  git action in the current conversation. No git-dependent scripts or tooling.
- **pnpm only**: never npm/npx in docs, scripts, Makefile or Dockerfiles; use `pnpm`,
  `pnpm exec`, `pnpm dlx`. Versions come from the `catalog:` in `pnpm-workspace.yaml`
  (`catalog-mode=strict`). **Remotion and zod are upgraded together.**
- **Run things in Docker** through `make` (dependencies live in containers). Docker must stay
  workable with 8 GB of memory.
- **Plan first** for new work; stop and ask only on decisions that are missing from, or
  contradict, the agreed plan, and list such questions in the report.
- **Before and after any dependency upgrade: `make check`** (lint, unit tests, check-jitter,
  e2e). `make lint` and `make test` must pass for every change.
- **Templates from references**: every new reference video becomes a **new, separate template**
  (`/template-from-reference`). Existing templates are kept and improved, never cloned into
  variants. Shared building blocks go to `packages/engines/remotion/src/core`.
- **Do not change other templates' behaviour.** When core changes, prove old templates are
  untouched (see "Checking that a template did not change"). A new registry entry is opt-in for
  existing templates (pin their `allowed` lists).
- **Fonts**: only the installed ones (`packages/shared/src/fonts.ts`); a close match is fine.
- **Photos**: JPEG/PNG/WebP only (no HEIC). Content/style split: per-video texts and media are
  `content`; everything else (incl. before/after labels and music) is `style` and goes into presets.
- **Admin code**: strict layers, thin views, typed composables, presentational components;
  rules in [docs/frontend.md](docs/frontend.md) and `apps/admin/eslint.layers.js`.
- The owner uses the app locally for the long run; deployment is out of scope. Remotion's free
  license applies (personal project).

## Current state

| Template                   | Engine   | Notes                                                                                                                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before-after` v1.0.0      | remotion | 13 s cinematic reveal; reveal effects pinned to the original four                                                                                                     |
| `before-after-card` v1.1.0 | remotion | from `references/1`: full bleed → 3D card → reveal inside (any shared reveal, default split-slider) → full bleed → soft before/after flash; optional first-photo push |
| `test-card`                | fake     | dev stub proving engines plug in; hidden by default (`make fake-on` / `make fake-off`)                                                                                |

Shared Remotion building blocks (`packages/engines/remotion/src/core`):

- `reveals/` registry: `diagonal-wipe`, `circle-reveal`, `blinds`, `split-slider`, `slide-over`.
  Each effect declares `durationSec` (natural length) and `revealedAt` (when "after"
  dominates, used to sync labels);
- `transitions/` registry (seams between scenes);
- `primitives/`: `PhotoPlane` (+ camera), `PhotoCard` (full bleed ↔ 3D card), `Label`,
  `BlurredBackdrop`, overlays;
- `typography/`: `WordReveal`, `TypeOn`;
- `pairs/`: before/after alignment and media checks;
- `placement.ts`: `placeAt()` for anything that moves (see gotchas);
- `scene/` data-driven `SceneRenderer`, `layout.ts` (4 formats + safe zones), `motion.ts`
  (easing, `cubicBezier`, keyframes).

Deferred (agreed "later"): bulk delete, cleanup of orphan files and of the preview-frame cache
(`previews/`), gallery thumbnails for templates, music beat sync.
Open questions on `before-after-card`: end-flash softness, more card "float" in holds.

## Everyday commands

```bash
make up / make down / make logs s=api / make ps
make check                       # lint + unit tests + check-jitter + e2e (required for upgrades)
make lint / make test / make test-e2e / make check-jitter
make seed                        # default preset per template, music from ./seed
make studio                      # Remotion Studio :3801
make demo args="--template=before-after-card --effects=split-slider --frames=0,100 --png"
make reference file=references/<n>/<video>.mp4
make reference-compare file=references/<n>/<video>.mp4 render=<render>.mp4
make fake-on / make fake-off
```

Dev loop: API, admin and workers reload on save. The dev `worker-remotion` rebuilds the Remotion
bundle after composition changes (debounced, never mid-render), so a render right after a save
may wait a couple of seconds for the rebuild.

## New template from a reference video

Run `/template-from-reference references/<n>/<video>.mp4 <notes>`
([.claude/commands/template-from-reference.md](.claude/commands/template-from-reference.md)).
`references/1/` is a worked example: `breakdown.md`, `compare.mp4`, `compare-sheet-*.jpg`,
`compare-timing.md`. Useful techniques from it:

- read the shot list from `meta.json → motion` (mean luma change per frame; ~0.3–0.8 is still
  frame noise) together with the contact sheets;
- render with the reference's own stills: copy two frames to `references/<n>/compare-photos/`
  (`before.jpg`, `after.jpg`) and use
  `make demo args="--template=<id> --photos=/app/references/<n>/compare-photos --out=/app/references/<n>/render"`
  (`make demo` runs inside the engine package: pass absolute container paths, `/app/...`);
- fit easing to the reference instead of guessing: compare the speed profile of candidate
  `cubic-bezier` curves (scale change per frame) with the normalized motion curve over the move
  (a small ad-hoc script; `before-after-card` used `cubic-bezier(0.35, 0.1, 0, 1)` for the shrink);
- timing tolerance is ±2 frames on move starts; move _ends_ are noisy (long eased tails, drift).

## Checking that a template did not change

Before touching shared code, render baseline stills of the existing templates, then compare
pixel by pixel after the change (`YMAX=0` means identical):

```bash
make demo args="--effects=diagonal-wipe,split-slider --frames=30,100,160,250,320,370 --png --out=/app/fixtures/renders/ba-baseline"
# ... change ...
make demo args="... same ... --out=/app/fixtures/renders/ba-after"
docker compose exec -T worker-remotion sh -c 'cd /app/fixtures/renders && for f in $(ls ba-baseline); do ffmpeg -v error -i ba-baseline/$f -i ba-after/$f -filter_complex "blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=-" -f null - | grep -o "YMAX=[0-9]*"; done | sort | uniq -c'
```

Also compare a template's option lists via `GET /api/v1/templates/<id>` when registries change.

## Gotchas (learned the hard way)

- **Motion in renders**: never animate layout properties (`left`, `top`, `width`,
  `letter-spacing`) — headless Chrome snaps them and glyphs to whole pixels (judder that the
  preview hides). Use `placeAt()`; `make check-jitter` guards it.
- **No `will-change: transform` on layers that change scale** (it freezes the raster scale;
  frames rendered in different Chrome tabs then differ). `placeAt()` uses it for translations only.
- Remotion caches Chrome Headless Shell next to the nearest `package.json` of the cwd: always go
  through `ensureRemotionBrowser()` (one copy in the engine package).
- Measuring motion: use `tools/devtools/src/lib/motion.ts` (`motionCurve`); ffmpeg's `tblend`
  pairs frames unreliably on B-frame streams and reports phantom flicker.
- `pnpm add` rewrites `pnpm-workspace.yaml` and drops its comments (lint checks the zod note).
- The shadcn-vue CLI may try to change dependency versions; the strict catalog rejects it.
- In this shell (zsh) avoid `read a b < <(...)` and unquoted variables in `rm`; use small bash
  scripts in the scratchpad instead.
