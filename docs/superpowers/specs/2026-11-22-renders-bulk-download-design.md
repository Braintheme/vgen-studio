# Renders: bulk download, "downloaded" mark, day groups — design

## Intent

The owner renders 20–50 videos in a session and downloads them one by one ("⋯ → Download"),
losing track of which ones are already saved. They want to pick many renders (a whole day, or
everything not yet saved) and save them in one go, see which renders were downloaded, and see
where one working day ends and the next begins in the table. A ZIP is not wanted.

Chrome on the owner's machine asks where to save every file, so a queue of plain downloads would
open one dialog per file.

## Approaches

1. **"Save to folder…" (picked).** The File System Access API (`showDirectoryPicker`): one folder
   dialog, then each file is fetched and streamed into that folder, with progress. Chrome on
   `localhost` (the owner's setup). Where the API is missing (Safari, LAN address), the same
   button falls back to plain downloads one after another.
2. Plain downloads in a queue only: one dialog per file with the owner's Chrome setting. Kept
   as the fallback.
3. One ZIP: the owner does not want it.

## Design

- **Downloaded mark**: `render_job.downloaded_at` (nullable, migration), `downloadedAt` in the DTO.
  `POST /renders/downloaded { ids }` sets it to now (admin calls it after a file is saved; the row
  menu's Download calls it too). Filter "Downloaded / Not downloaded" (`downloaded=yes|no`).
- **Day groups**: rows are grouped by local calendar day (browser time zone). A header row before
  each day: "Today · Sat, 22 Nov", "Yesterday · …", else the date, plus the day's counts across
  all pages (`GET /renders/days?tz=&filters` → date, total, ready, notDownloaded). The Created
  cell shows the time (`14:05`), full date in the tooltip.
- **Selection**: a checkbox per ready (done) render, a header checkbox for the page, a checkbox per
  day (checked / mixed / empty; selects the day's ready renders on every page via
  `GET /renders/ready?tz=&day=&filters`, at most 500). Kept across pages and filters.
- **Selection bar** (sticky, like the Media page): "N selected · size", Save to folder…,
  "Select not downloaded (N)" (all ready, not downloaded under the current filters), Clear. While
  saving: "Saving 7 / 50", Stop. Existing files are never overwritten (`name (2).mp4`). Saved
  renders leave the selection; failed ones stay, with a notice.
- Image renders are saved as their ZIP (one file per render), as the row menu does.

## Checks

Unit tests for the pure parts (unique names, day keys and labels, selection summary, scope where
clauses), service tests for the new endpoints; `make lint`, `make test`, `make admin-check` on
`/renders`; a real save run in headless Chrome is not possible (the folder picker needs a user),
so the fallback path and the mark are checked there.
