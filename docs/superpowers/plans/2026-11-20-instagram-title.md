# Instagram-style title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** an `instagram` title style for `preset-reel` and `preset-flip`: free multi-line text, text
colour, merged rounded fill behind the lines, outside outline, presets keep it all.

**Architecture:** pure geometry (`plate.ts`) → `InstagramTitle` component → `StyledTitle` hands the
`instagram` style to it; fields and the admin group come from `core/styled-title/instagram-fields.ts`
and are spread into both manifests. No admin code changes (conditional groups already exist).

**Tech Stack:** Remotion, React, zod 4, `@remotion/layout-utils` `measureText`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-instagram-title-design.md`

## Global Constraints

- No pixel change for existing styles / renders that do not pick `instagram` (`YMAX=0` vs
  baseline in `fixtures/renders/ig-base`).
- Motion through transforms only (`placeAt`), no `will-change` on scaling layers.
- Fonts: installed only (`FontIdSchema`). UI copy and code in English.
- No git commands; `make lint` and `make test` pass; `make check-jitter`, `make admin-check` run.
- New fields are `style` scope (presets keep them); texts via `textField(..., scope: 'style')`.

## Review Focus

- Long line wider than the frame: the block shrinks to fit the safe width (test in Task 1 via
  `fitScale`).
- Empty lines / trailing newline / only spaces: gaps split the fill, an all-empty text renders
  nothing (Task 1 `plateRuns`).
- Two lines of almost equal width: no tiny 1-px steps in the fill (Task 1 snap test).
- Switching the style in the admin swaps the groups without losing values (`make admin-check` +
  a click on the style select, Task 4).
- Fonts not loaded yet: no measuring before `useFonts` reports loaded (Task 2, guarded by flag).

---

### Task 1: Fill geometry (`plate.ts`)

**Files:** Create `packages/engines/remotion/src/core/styled-title/plate.ts`, test `plate.test.ts`.

**Interfaces — Produces:**

- `interface PlateRow { readonly left: number; readonly right: number }`
- `plateRuns(lines: readonly string[]): { start: number; lines: string[] }[]` — runs of non-blank
  lines (index of the first line in the run).
- `plateCorners(rows: readonly PlateRow[], rowHeight: number, snap: number): { x: number; y: number }[]`
  — clockwise vertices of the union of contiguous rows (row i spans y ∈ [i·h, (i+1)·h]); edges of
  neighbouring rows closer than `snap` take the wider value first.
- `roundedPath(points, radius): string` — SVG path, each corner rounded with a cubic (k = 0.5523),
  radius limited to half of each adjacent edge.
- `fitScale(widest: number, available: number): number` = `min(1, available / widest)`.

- [ ] Tests: one row → 4 corners `[(l,0),(r,0),(r,h),(l,h)]`; two rows, second wider → 8 corners
      in clockwise order; widths differing by less than `snap` → 4 corners; `roundedPath` starts with
      `M`, ends with `Z`, has one `C` per corner; `plateRuns(['a','',' ','b'])` → two runs (0, 3);
      `fitScale(2000, 1000) === 0.5`, `fitScale(500, 1000) === 1`.
- [ ] Run (fail) → implement → run (pass): `docker compose run --rm --no-deps api pnpm exec vitest run packages/engines/remotion/src/core/styled-title/plate.test.ts`.

### Task 2: `InstagramTitle` + `StyledTitle` hand-off

**Files:** Create `core/styled-title/InstagramTitle.tsx`; modify `StyledTitle.tsx`, `fields.ts`.

**Interfaces:**

- `fields.ts`: `TITLE_STYLES` gains `'instagram'` (label `'Instagram'`); `TITLE_FILLS = ['off','solid','see-through']`.
- `StyledTitle.tsx`: extract pure `titleAnchor(layout, position, offsetY, topAt)` and
  `entranceMotion(entrance, t, riseFade)` used by both components (refactor only).
  New optional prop `instagram?: InstagramTitleSetup`; when `style === 'instagram'` render
  `<InstagramTitle>` (returns null without `instagram`).
- `InstagramTitleSetup { text: string | null; font: FontId; weight: number; align: 'left'|'center'|'right';
color: string; fill: { mode: TitleFill; color: string }; outline: { enabled: boolean; color: string; width: number } }`.
- Design values (px at 1080, × `u`): font size 72, row height 1.3 em, side padding 0.32 em,
  corner radius 0.3 em, snap 0.35 em, see-through alpha 0.55; outline = stroked copy behind
  (`WebkitTextStroke` 2×width) ; shadow on the outline copy / text, or on the fill when the fill is on.
- Block enters as one piece (index 0 motion), exits like the other looks.

- [ ] Baseline stills exist (`fixtures/renders/ig-base`), then refactor `StyledTitle`, re-render
      (`ig-after`), compare: every file `YMAX=0`.
- [ ] Demo render with `--set=params.titleStyle=instagram` for both templates; inspect stills.

### Task 3: Fields, admin group, manifests

**Files:** Create `core/styled-title/instagram-fields.ts`; modify both `manifest.ts`, both
`ClipSection.tsx` / `PresetFlip.tsx`, both `manifest.test.ts`.

**Interfaces — Produces:**

- `instagramTitleText(defaultText: string)` → `textField({ label: 'Title text', multiline: true, maxLength: 160, default, scope: 'style' })`.
- `instagramTitleFields()` → flat params `titleIgFont` (default `inter`), `titleIgWeight` (300–900, 700),
  `titleIgAlign` (segmented, `center`), `titleIgColor` (`#111111`), `titleIgFill` (`{ mode: 'solid', color: '#ffffff' }`),
  `titleIgOutline` (`{ enabled: false, color: '#000000', width: 6 }`).
- `instagramTitleGroup({ textPath, sizeFields, entranceField, otherStyles })` →
  `{ title: UiFieldGroup (visibleWhen otherStyles), instagram: UiFieldGroup }` — the existing group
  gets `visibleWhen: { field: 'params.titleStyle', equals: otherStyles }`.
- Texts: `texts.titleText` — preset-reel `'How to get that\n"Aesthetic" look\nin Lightroom'`,
  preset-flip `'POV: they ask\nfor the RAWs'`. Versions: preset-reel `1.12.0`, preset-flip `1.7.0`.
- [ ] Tests: `titleStyle: 'instagram'` parses; defaults stay `reel` / `classic`; `pickByScope(..., 'style')`
      keeps `texts.titleText` and every `titleIg*`.

### Task 4: Verify and document

- [ ] `make lint`, `make test`, `make check-jitter`, `make admin-check`; in the browser pick
      Instagram and back: groups swap, values stay.
- [ ] CLAUDE.md (table rows, `styled-title/` line), `docs/` if a field rule changed.
