# Projects — design

## Intent

Today a video exists only as the browser draft of its template (one per template, overwritten by
the next video) and, once rendered, as a frozen render. Nothing can be prepared, kept, reviewed
and rendered later. The owner wants to hand the assembly of a batch of videos to Claude (match
photos to clip fragments by capture time, pick the moments, fill the titles from a table of
looks) and then review each video in the usual editor, fix what is off, and send the good ones
to the render queue in one go, the way a Final Cut **project** is edited and then shared.

This spec covers **projects** only. Claude's assembly (capture-time matching, picking moments,
the titles table) is the next spec and builds on the projects API.

## Goals

- A **Projects** tab: one project = one future video (template, settings, media, quality, scale,
  the preset it started from).
- Create a project from a template or from a style preset.
- Open a project in the **same editor** as today (preview, every setting, media slots); every
  change is saved to the project on its own, no "Save" button.
- Render a project from its editor; render many from the projects table.
- The projects table: day groups, selection per row / page / day, bulk Render and Delete;
  per project: name, template, created, render status.
- An API that lets a script (Claude) create projects with their settings and media.

## Non-goals

- A timeline or free editing beyond what templates offer.
- Versions / history of a project; sharing; several users.
- Changing the Templates → editor flow, its browser draft, the Presets tab or the Renders tab
  (except the link from a render back to its project, see below).

## Anti-goals

- The quick flow (Templates → editor → Render) gets slower, changes behaviour or loses its draft.
- Media used by a project disappears through "Clean up unused" or a delete on the Media page.
- A project silently renders something other than what its editor shows.

## Approaches

1. **Projects on the server, the editor gets a second "draft source" (picked).** The editor
   already reads and writes one interface (`ComposeDraftState`: settings, media, quality, scale,
   presetId). Today it is backed by the browser store; a project backs the same interface with
   the API (debounced saves). Every composable below it (form, media slots, preview, presets,
   video ranges) stays as it is.
2. A separate project editor: duplicates the compose screen; every editor improvement would
   have to be made twice. Rejected.
3. Projects in the browser (like drafts): Claude, running in a container or a terminal, could not
   create them, and they would be lost with the browser's storage. Rejected.

## Design

### Data

New table `project`:

| column                            | notes                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id` uuid                         |                                                                                                |
| `name` varchar(256)               | editable; default below                                                                        |
| `template_id`, `template_version` | the version the settings were last saved with (like drafts)                                    |
| `settings` jsonb                  | raw form values, exactly what the browser draft holds today                                    |
| `media` jsonb                     | slot key → asset id(s) or null (`DraftMedia`)                                                  |
| `quality`, `scale`                | as on a render                                                                                 |
| `preset_id` uuid null             | the preset it started from (names the output file, "Update preset"); SET NULL on preset delete |
| `created_at`, `updated_at`        | `updated_at` moves on every content save                                                       |

`render_job.project_id` (uuid null, SET NULL when the project is deleted): renders made from a
project. Deleting a project keeps its renders.

### API (`/projects`)

- `GET /projects` — page + filters (template; render state), newest first; each item carries its
  thumbnail and its **last render** (id, status, progress, created, finished).
- `GET /projects/days?tz=` and `GET /projects/selectable?tz=&day=` — day counts and "select the
  day" across pages, like the renders endpoints.
- `POST /projects` — `{ templateId | presetId, name?, settings?, media?, quality?, scale? }`. From a
  preset: the template defaults with the preset's style applied (the same merge as "apply preset"
  in the editor). From a template: its defaults (and the template's default preset, if any, as
  the editor does for a fresh draft). Given `settings` / `media` (Claude) go on top.
- `GET /projects/:id`, `PATCH /projects/:id` (`name`, `settings`, `media`, `quality`, `scale`,
  `presetId`), `DELETE /projects/:id`, `POST /projects/delete { ids }`.
- `POST /projects/render { ids }` — for each project builds the render request exactly as the
  editor does (`props = { ...settings, media }`, its quality, scale, presetId, plus `projectId`)
  and queues it through the existing render service. Returns per project: the render, or why it
  could not start (invalid settings, missing media). One bad project does not stop the others.
- Media: a project's media count as **used** — "Clean up unused" skips them, the Media page shows
  "used by project …", and deleting such a file asks first (like a file in a render).

Settings are stored raw and validated when a render starts (the server already validates render
props). Opening a project in the editor sanitizes it against the current template (the same
`sanitizeTemplateSettings` / `sanitizeMediaRefs` the browser draft uses) and saves the result.

### Admin

- **Sidebar:** "Projects" between "Templates" and "Renders".
- **Projects page:** a table like Renders — thumbnail (first photo, else the clip's poster), name,
  template (+ preset name), status, created time; rows grouped by day with the day's counts;
  checkboxes per row / page / day; a sticky bar "N selected · Render · Delete · Clear".
  "New project" opens a dialog: a template or a preset (presets grouped under their template),
  an optional name; then the project opens.
- **Status** (from the last render): `Not rendered`; `Queued` / `Rendering 40%`; `Rendered 14:05`
  (link to the render); `Failed` (the error); plus an `Edited since render` note when
  `updated_at` is later than the last render's start. Rendering again makes a new render.
- **Project editor** (`/projects/:id`): the compose screen with the project as its draft source.
  Header: "← Projects", the editable project name, a "Saved" / "Saving…" note. The Render button
  queues a render linked to the project and **stays** on the page (status in the header), so the
  owner can go on to the next project. Everything else (form, media, preview, presets, ranges,
  music) is unchanged.
- **Quick flow untouched.** Templates → editor keeps its browser draft and goes to Renders after
  Render. A "Save as project" button there was considered; the owner said no for now.

### Default project name

From a preset: `<preset name>`; from a template: `<template name>`; Claude passes its own (e.g.
the title text). Duplicates are allowed (the table shows template and time).

## Constraints

- Admin layers and rules (`docs/frontend.md`, `apps/admin/eslint.layers.js`); thin views.
- `make lint`, `make test` pass; `make admin-check` after admin changes (the compose screen must
  work in both modes).
- English code, comments and UI copy; pnpm only; run in Docker via `make`.
- No change to renders of existing templates (no engine code is touched).

## Left to the builder

- The debounce of project saves (the draft uses `DRAFT_SAVE_DEBOUNCE_MS`), and flushing a
  pending save when leaving the page.
- How the editor picks its draft source (route name / a prop on the view).
- Page size options and filters of the projects table (reuse the Renders pieces: `DataTable`
  groups, `Checkbox`, selection bar pattern, `lib/days.ts`).
- Whether "Delete" in the bar deletes at once with a confirm listing the count (it should
  confirm).

## Checks

API tests (create from template / from preset, patch, render many with one invalid project,
media of a project counted as used), admin unit tests for pure parts, `make admin-check` on
`/projects`, `/projects/:id` and the unchanged `/compose/:templateId`, and one manual pass: create
from a preset, change a title, render from the editor, render two more from the table, check
Renders.
