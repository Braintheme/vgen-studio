# Seed data

`make seed` (idempotent):

- adds every audio file in this folder (`.mp3`, `.wav`, `.m4a`, `.aac`) to the music library,
  titled by file name. The first track of an empty library becomes the default track;
- adds a template's own track from `templates/<templateId>/` (the first audio file there) to the
  library as well;
- creates a "Default" style preset for every template that has no presets yet; a template with
  its own track gets that track in the preset (it can be replaced by any other track).

Put only music you have the rights to use. Tracks under `templates/` that come from reference
videos are for local use only and are git-ignored.
