# Renders bulk download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select many renders (per day, per page, all not downloaded) and save them into one folder; mark downloaded renders; group the table by day.

**Architecture:** A `downloaded_at` column and three small endpoints (`days`, `ready`, `downloaded`) on the renders API; in the admin a selection composable, a save composable (File System Access with a plain-download fallback), day header rows in `DataTable`, a selection bar.

**Tech Stack:** NestJS + TypeORM (Postgres), zod 4 in `@vgen/shared`, Vue 3 + Vue Query + reka-ui.

**Spec:** docs/superpowers/specs/2026-11-22-renders-bulk-download-design.md

## Global Constraints

- pnpm only; run through `make`; `make lint` and `make test` pass.
- Code, comments and UI copy in English.
- Admin layers: lib → api → queries → composables → components → views (`apps/admin/eslint.layers.js`).
- No git commits (owner: branch only).
- Existing behaviour without a selection stays the same (row menu, filters, paging).

## Review Focus

- A day split across pages: the day checkbox must select renders on other pages too.
- A file name already in the folder: never overwrite.
- Failed / cancelled / active renders are never selectable.
- Stop during a save: the current file is aborted, the rest stay selected.
- Time zone: the server's day buckets must match the browser's grouping.

---

### Task 1: Shared contract + DB

**Files:** `packages/shared/src/api/renders.ts`, `packages/db/src/entities/render-job.entity.ts`,
new migration `packages/db/src/migrations/1795000000000-AddRenderDownloadedAt.ts` (+ `index.ts`).

- `RenderScopeSchema` {status?, templateId?, engine?, downloaded?: 'yes'|'no'};
  `RenderListQuerySchema = PageQuerySchema.extend(scope)`.
- `TimeZoneSchema` (IANA name valid for `Intl.DateTimeFormat`), `DayKeySchema` (`YYYY-MM-DD`).
- `RenderDaysQuerySchema` = scope + tz; `RenderDayDtoSchema` {date, total, ready, notDownloaded}.
- `RenderReadyQuerySchema` = scope + tz + day?; response `RenderJobDto[]`, `READY_RENDERS_LIMIT = 500`.
- `MarkRendersDownloadedRequestSchema` {ids: uuid[] 1..500}.
- DTO `downloadedAt: iso | null`.

### Task 2: API

**Files:** `renders.repository.ts`, `renders.service.ts`, `renders.controller.ts`, `renders.mapper.ts`, `renders.service.test.ts`.

- Repository: `scopeWhere(qb, scope)`; `list` via the query builder; `days(query)` (raw grouped
  counts, `to_char(created_at AT TIME ZONE :tz, 'YYYY-MM-DD')`); `ready(query)` (status done,
  limit 500, newest first); `markDownloaded(ids)`.
- Service: `days`, `ready` (DTOs), `markDownloaded` (204).
- Controller routes declared before `:id`.
- Tests: service maps `ready` to DTOs, `markDownloaded` passes ids, mapper emits `downloadedAt`.

### Task 3: Admin pure helpers

**Files:** `apps/admin/src/lib/days.ts` (+ test), `apps/admin/src/lib/save-files.ts` (+ test for `uniqueFileName`).

- `dayKey(iso, timeZone)`, `dayLabel(key, todayKey)` ("Today · Sat, 22 Nov" / "Yesterday · …" / "Tue, 18 Nov" / with year when not the current one), `localTimeZone()`.
- `uniqueFileName(name, taken)`: `a.mp4` → `a (2).mp4` → `a (3).mp4`.
- `canPickFolder()`, `pickFolder()`, `folderNames(folder)`, `writeFile(folder, name, stream)`, `triggerDownload(url, name)`.

### Task 4: Admin data + composables

**Files:** `api/renders.ts`, `queries/keys.ts`, `queries/renders.ts`, `features/renders/composables/useRenderSelection.ts`, `useRenderSave.ts`, filters (`types.ts`, `constants.ts`, `useRendersFilters.ts`, `RendersFilters.vue`).

- API: `days`, `ready`, `markDownloaded`; `fetchFileStream(url, signal)`.
- Queries: `useRenderDaysQuery`, `useMarkDownloadedMutation`; days invalidated with lists.
- Selection: map id → render; `isSelectable`, `toggle`, `setPage`, `toggleDay`, `selectNotDownloaded`, `clear`, `summary` (count, bytes), `dayState(key)`.
- Save: `saveSelected()`, `stop()`, `progress` {done, total, current}.

### Task 5: Admin UI

**Files:** `components/ui/checkbox/*` (shadcn-vue checkbox on reka-ui), `components/common/DataTable.vue` (opt-in `groupKey` + `group` slot), renders columns / table / row actions / `RenderDayHeader.vue` / `RenderSelectionBar.vue` / `RenderDownloadedMark.vue`, `RendersView.vue`.

- Verify: `make lint`, `make test`, `make admin-check args="--path=/renders"`.
