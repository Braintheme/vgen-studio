# Before/after pair in one go + "From library" like a media library — design

## Intent

The owner fills Before and After one file at a time and pages through the library picker. They
want to pick both photos of a pair in one go (upload or library) and fix the order with the
existing swap, and a picker like WordPress' media library: "Load more" instead of pages, several
files selectable, Cancel / Add always visible.

Non-goals: the Media page (keeps its table and pages), list slots' behaviour, the API.

## Approaches

1. **Pair = the slots of a template's `swap` slot action** (picked). `before-after`,
   `before-after-card`, `palette-grade`, `preset-reel` already declare
   `slotActions: [{ type: 'swap', slots: ['before', 'after'] }]`; no template changes.
2. A new `pair` hint on media slots: explicit, but touches every template and the shared schema for
   no gain today. Rejected.

## Design

- **Pair placement** (`lib/media-pairs.ts`, pure): `pairOf(slotActions, slotKey)` → the two slot
  keys of the swap action holding `slotKey`, or null. `orderByName(items, nameOf)` sorts with
  `compareFileNames` (`IMG_1234` before `IMG_1234-2`): first → the action's first slot (Before),
  second → the second (After).
- **Upload**: a paired single slot's dropzone takes several files. One file → that slot as today.
  Two or more → the first two by name go to Before and After (one upload request, progress on
  both slots), extra files are dropped with a notice. Swap fixes a wrong guess.
- **Library**: a paired slot's picker allows two; confirming two places them by name like an
  upload; one replaces the slot's file as today. Other slots keep their room.
- **Picker dialog**: an infinite query (`useMediaLibraryInfiniteQuery`, pages of 24, key under
  `media.library`, so uploads/deletes refresh it). Tiles of all loaded pages (deduplicated), a
  "Load more" button with "N of M" under the grid, selection kept across pages. The dialog is a
  column: header, scrolling grid, a footer with Cancel / Add N that never scrolls away.

## Checks

Unit tests for `pairOf`, `orderByName`, `nextPageParam`; `make lint`, `make test`, `make
admin-check` (picker opened), screenshot of the dialog.
