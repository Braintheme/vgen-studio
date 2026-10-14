# Admin frontend conventions

Vue 3 + TypeScript + shadcn-vue. Readability beats cleverness. The **renders** feature
(`src/features/renders`) is the reference implementation: copy its shape for new features.

## Layers

Each layer does one thing and may only use the layers before it. ESLint enforces this
(`apps/admin/eslint.layers.js`); the error message names the rule you broke.

```
lib  →  api / engines  →  queries  →  stores  →  composables  →  components  →  views
```

| Layer       | Folder                                                    | Does                                                                                                                       | Must not                                                                  |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| lib         | `src/lib`                                                 | framework-free helpers (`format.ts`) and UI types (`ui-types.ts`)                                                          | import Vue or any app layer                                               |
| api         | `src/api`                                                 | HTTP only: the one axios client (`http.ts`), one file per resource, SSE (`events.ts`)                                      | know about Vue, state or UI                                               |
| engines     | `src/engines`                                             | the only gateway to `@vgen/catalog`: template definitions (zod schemas, defaults, metadata) and lazy engine player loaders | import Vue or app layers                                                  |
| queries     | `src/queries`                                             | Vue Query: cache keys (`keys.ts`), queries, mutations, live cache sync                                                     | call axios directly, hold local state                                     |
| stores      | `src/stores`                                              | Pinia, **local** UI state only (theme, later the video draft)                                                              | import `api/` or `queries/`; hold server data (that is Vue Query's cache) |
| composables | `src/composables`, `features/*/composables`               | logic: combine queries + stores, prepare data for the UI, user actions                                                     | import `api/` or components                                               |
| components  | `src/components/{common,layout}`, `features/*/components` | presentation: props in, emits / `defineModel` out                                                                          | import api, queries, stores, composables, router                          |
| views       | `features/*/views`                                        | page = composables + components wired together                                                                             | contain logic, call api/queries/stores                                    |

Also enforced: features never import each other (shared code goes to `components/common`,
`composables/` or `lib/`), and cross-folder imports use the `@/` alias (no `../`).

`src/app` is the application shell (router, layout, the confirm-dialog host). It wires
composables into layout components, like a view does.

`src/components/ui` is shadcn-vue's generated code: add components with the CLI
(`pnpm dlx shadcn-vue@2.8.2 add <name>` in `apps/admin`), change them only deliberately,
build app components on top of them elsewhere.

## Folder structure

```
src/
  main.ts, App.vue
  app/            router.ts, routes.ts (route names/paths/nav), AppLayout.vue, ConfirmDialogHost.vue, PromptDialogHost.vue
  api/            http.ts, errors.ts, events.ts, config.ts, <resource>.ts
  queries/        client.ts, keys.ts, errors.ts, <resource>.ts
  stores/         ui.ts
  composables/    shared: useConfirm, usePrompt, useNotify, usePendingIds, useSchemaForm, useTheme
  components/
    ui/           shadcn-vue (generated)
    common/       DataTable, DataTablePagination, ConfirmDialog, PromptDialog, EmptyState, ErrorState, FilterSelect,
                  FileDropzone, PageHeader, LiveIndicator, PlayerHost, WaveformRegion, FilmstripRange
    layout/       AppSidebar, AppSidebarNav, AppBrand, AppHeader, ThemeToggle
  features/<feature>/
    constants.ts  types.ts
    composables/  use<Something>.ts
    components/   <Feature><Part>.vue, small cell components, column definitions
    views/        <Feature>View.vue
  lib/            format.ts, routes.ts, schema-form.ts, waveform-region.ts, ui-types.ts, utils.ts
```

## Rules of thumb

**Views are thin.** A view calls one or two composables and lays out components. No data
transformation, no API/store access, no business logic. See `RendersView.vue`.

**Logic lives in composables.** Name them `use<What>` and give them an explicit return type
(an interface next to the function). Return function-typed properties
(`readonly retry: () => void`), not methods: they are destructured in views. A composable
that needs more than one responsibility is two composables (`useRendersTable` +
`useRenderActions`).

**Components are small and presentational.** Typed `defineProps<{...}>()`,
`defineEmits<{ name: [payload] }>()`, `defineModel` for two-way state, `defineSlots` for
slots. No stores, no queries, no router. Over 200 lines (lint limit) — split it.

**Server state = Vue Query, local state = Pinia.** Never copy server data into a store.
Mutations update or invalidate the cache; server-sent events patch it
(`useRenderLiveSync`), and lists fall back to polling while the stream is down.

**Errors.** Every API call rejects with `ApiRequestError` (`code`, `status`, `message`,
`details`). Show query errors with `ErrorState`, action errors with `useNotify().error()`.

**Events travel at most two levels.** A child emits to its parent, the parent may re-emit
once. When an action has to bubble up through **3 or more** component levels, do not chain
emits: expose it from a typed provide/inject composable instead (`provideX()` in the
screen's view/composable, `useX()` in the deep component), exactly like `useConfirm`.
The injection key is a typed `InjectionKey`, `useX()` throws a clear error when the
provider is missing, and the injected object has function-typed properties only.

**Confirmations and simple input.** `const confirm = useConfirm(); if (await confirm({...})) ...`
and `const name = await usePrompt()({ title, label, initialValue })` (resolves `null` on
cancel) — one dialog host each for the whole app (typed provide/inject). Use the same
provide/inject pattern for deep trees (the video editor) instead of prop drilling.

**Row actions.** Action composables report rows with a mutation in flight through
`usePendingIds(mutationA, mutationB, ...)` (variables are an id or `{ id, ... }`); tables
disable those rows' actions.

**Third-party DOM widgets.** Imperative libraries (wavesurfer.js, an engine's player) are
wrapped in a framework-free controller in `lib/` (`createWaveformRegion`) or an adapter
contract (`PlayerAdapter`), and a small `components/common` host drives it from props
(`WaveformRegion.vue`, `PlayerHost.vue`). Components never import composables.

**No magic strings.** Route names/paths/query params (`lib/routes.ts`), query keys (`queries/keys.ts`),
URL query params and status metadata (`features/*/constants.ts`) are constants; status
values and DTOs come from `@vgen/shared` — never redeclare API types in the admin.

**Style.** Always `<script setup lang="ts">`, no `any`, PascalCase components in templates,
camelCase event names. UI copy is English.

## Schema-driven forms

Template settings forms are generated, not hand-written:

1. `lib/schema-form.ts` turns the template's JSON Schema (with `title`, `widget`,
   `optionLabels`, `unit`, `step` metadata) into typed section/field specs.
2. `components/schema-form/SchemaForm.vue` renders them; `SchemaField.vue` picks a field
   component by `kind` (the widget registry).
3. Values live in a vee-validate form created by `useSchemaForm` (zod adapter); fields bind
   by dot path through shadcn-vue's `FormField`.

Adding a generic widget: give the schema field `.meta({ widget: '...' })`, map it to a new
`kind` in `schema-form.ts`, add a `fields/<Kind>Field.vue` and register it in `SchemaField.vue`.

**Custom widgets** (data the generic form cannot know, e.g. `music-track` needs the music
library): any widget id that is not generic becomes a `{ kind: 'custom', widget }` field and
`SchemaForm` renders the slot `widget:<id>` with `{ field }`. The screen fills it (see
`features/compose/components/ComposeSettingsForm.vue`) and writes values through
`useSchemaForm().setFieldValue(path, value)`; a custom field without a slot is not shown.
Engine/template widgets use ids `custom:<name>`. An object field with such a widget stays one
field (its `limits` meta, if any, comes along): the compose screen fills `video-range` (a video
trimmer bound to the slot whose `range` points at the field) and `sound-effect` (built-in sound or
a library track, with volume). `replaceValues(values)` swaps all values at
once (applying a style preset).

## Engine previews

The admin never imports an engine's UI code directly. `engines/players.ts` lazy-loads the
engine's `PlayerAdapter` (from `@vgen/catalog/players`); `components/common/PlayerHost.vue`
mounts it into a div. For Remotion that is a React island with `@remotion/player`; the admin
type-checks only the adapter contract (`@vgen/engine-remotion/player` publishes a `.d.ts`
facade), so no React/TSX ever enters `vue-tsc`. Engines without a player get a poster frame
rendered by their worker instead (`usePosterPreview` → `POST /previews`, debounced and cached by
the server per content hash).

## Adding a feature

1. `api/<resource>.ts` — endpoint functions, types from `@vgen/shared`, responses parsed with the shared schemas.
2. `queries/keys.ts` + `queries/<resource>.ts` — queries and mutations (cache updates live here).
3. `features/<name>/composables` — what the screen needs, typed return.
4. `features/<name>/components` — presentational pieces; reuse `components/common` first.
5. `features/<name>/views/<Name>View.vue` — wire it up; add the route in `app/routes.ts` + `app/router.ts`.
