# Pair upload + library picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fill Before and After with one upload / library pick; a picker with "Load more" and a
footer that stays visible.

**Architecture:** pure helpers in `apps/admin/src/lib`, an infinite query in `queries/media.ts`,
logic in `useMediaSlots` / `useMediaPicker`, presentation in `MediaSlotCard` /
`MediaPickerDialog`.

**Tech Stack:** Vue 3, @tanstack/vue-query (`useInfiniteQuery`), shadcn-vue Dialog, vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-pair-upload-and-library-picker-design.md`

## Global Constraints

- Admin layers (`docs/frontend.md`): lib → queries → composables → components → views; components
  stay presentational; English UI copy; no git.
- `make lint`, `make test`, `make admin-check` pass.

## Review Focus

- Two files dropped on After (not Before): still Before = first by name.
- More than two files on a paired slot: first two by name, a notice.
- One file on a paired slot: only that slot changes.
- New upload while the picker is open: no duplicate tiles after "Load more".
- Picker opened from a list slot: room and selection order unchanged.

---

### Task 1: Pure helpers

**Files:** Create `apps/admin/src/lib/media-pairs.ts` + test; modify `lib/media-library.ts` + test.

- `pairOf(actions: readonly UiSlotAction[] | undefined, slotKey: string): readonly [string, string] | null`
- `orderByName<T>(items: readonly T[], nameOf: (item: T) => string): T[]`
- `nextPageParam(page: { page: number; pageSize: number; total: number }): number | undefined`
- `uniqueById<T extends { id: string }>(items: readonly T[]): T[]`
- [ ] Tests: `pairOf` finds both slots from either key, null for an unknown key / no actions;
      `orderByName` puts `IMG_1234.jpg` before `IMG_1234-2.jpg` whatever the input order;
      `nextPageParam` → 2 for `{1, 24, 30}`, undefined for `{2, 24, 30}`; `uniqueById` keeps the first.

### Task 2: Pair upload and pick

**Files:** `features/compose/types.ts` (`MediaSlotView.paired: boolean`, `MediaPickerSlot.paired`),
`useMediaSlots.ts` (`upload`, `pick`), `MediaSlotCard.vue` (dropzone `multiple` when paired, hint).

- `upload(slotKey, files)`: paired + ≥2 files → `orderByName(files, f => f.name).slice(0, 2)`,
  one request, results assigned by uploaded order to `pair[0]`, `pair[1]`; notice when files > 2.
- `pick(slotKey, ids)`: paired + 2 ids → ids (already in name order) to `pair[0]`, `pair[1]`.

### Task 3: Picker with "Load more"

**Files:** `queries/keys.ts` (`media.libraryInfinite`), `queries/media.ts`
(`useMediaLibraryInfiniteQuery(query, enabled)`), `useMediaPicker.ts` (room 2 for paired slots,
name order on confirm, `loadMore`, `hasMore`, `loadingMore`, `loaded`), `MediaPickerDialog.vue`
(column layout, sticky footer, Load more), `ComposeView.vue` wiring.

### Task 4: Verify

- [ ] `make lint`, `make test`, `make admin-check`; admin-check with an eval opening the picker
      and a screenshot.
