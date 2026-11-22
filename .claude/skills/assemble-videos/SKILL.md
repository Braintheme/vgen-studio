---
name: assemble-videos
description: Assemble videos (vgen projects) from a shoot folder of clips and before/after photos — match each picked clip to its photo pair by capture time, choose the fragment, level the horizon, fill the title from the looks table, create projects for the owner to review and render. Use when the owner asks to edit / assemble / "смонтируй" videos from a folder, or runs /assemble-videos <folder> [notes].
argument-hint: <folder> [notes: preset, how many, which clips, which look]
---

# Assemble videos from a shoot folder

Input: a folder (and notes). Output: **projects** in vgen (one per video), not renders. The owner
opens them in Projects, adjusts what is off and renders them himself. Reply in Russian.

Before starting: the stack runs (`make ps`; API on `http://localhost:3800/api/v1`, admin on
`http://localhost:5173`). The API is described in `docs/architecture.md` → "API for scripts
(Claude)". Helpers live in `.claude/skills/assemble-videos/scripts/` (python3 + ffmpeg/ffprobe on
the host; the folder is usually on an external disk Docker cannot see). Keep sheets and other
scratch files in the session's scratchpad, never in the shoot folder.

## The shoot folder

Typical layout (folder `56`): `56 - Videos/` and `56 - Images/` (photos may sit in subfolders).

- **Clips**: Blackmagic Camera on a Samsung phone, `A001_MMDDHHMM_Cnnn.mp4`, vertical (coded
  4000x2252 + rotation). Start time: `com.blackmagic-design.camera.dateRecorded`.
- **Marks** on clip names: any symbols before the camera's name (`$$`, `&&`, …) = the owner picked
  the clip and it has a photo pair → assemble those (the symbol itself means nothing: `&&` was a
  typo for `$$`). No mark = not picked.
- **Photos**: Canon EOS 90D, `IMG_n_Original.jpg` = Before, `IMG_n_Edited.jpg` = After.
- **Looks table**: `NN_Look_Titles.xlsx`, columns `Photo | Preview | Look 1..5`.

## Steps

1. **Scan**: `python3 -I scripts/scan.py <folder> --json <scratch>/scan.json`. It lists marked
   clips, photo pairs, the looks table, and estimates the camera clock offset (the Canon ran
   ~21–22 s behind the phone in folder 56; `photo time + offset = phone time`), then shows which
   photo falls into each clip and when.
   Read its flags:
   - `ALSO IN <clip>`: one photo matched to two clips — keep it where the frames show its scene.
   - `[other device …]` (iPhone `.MOV`, Pixel `PXL_…`): no Blackmagic start time; Android often
     stores the **end** of the recording. Confirm on frames before using the match.
   - `no photo (nearest: IMG_n @ 38s, 4s outside)`: a photo a few seconds **after** the clip's
     end usually means the recording stopped right before the shutter — use it, fragment to the
     clip's end (confirm the scene on the last frames). Far misses (> ~8 s): leave the clip and
     mention it.
   **Skip what is already made**: the projects are the record (never write into the shoot folder).
   `GET /projects` (all pages) and, for each, the original names of its `clip` and `before` media
   (`GET /media/:id`): a clip + photo pair that already has a project is not assembled again. The
   same clip with **another** photo is a new video and may be made. "Переделай" / "again" for a
   pair overrides. Say in the report what was skipped as already made.
2. **Confirm the match and find the shot** for each clip you assemble:
   - `scripts/sheet.py <clip> <out> --fps 1` for the whole clip: the hook, where the camera
     screen is, and that the screen shows the photo's subject (compare with a Before/After strip).
   - `scripts/sheet.py <clip> <out> --from <t-2> --to <t+2> --fps 5 --crop <screen x,y,w,h>`
     around the expected time: **the shot** is where the AF point turns into a **blue square**
     (focus confirmed) and the **remaining-shots counter drops** (e.g. 284 → 283). Bursts drop it
     several times: take the drop closest to the expected time. `--crop` takes **fractions** of
     the frame (e.g. `0.28,0.4,0.42,0.39`), while `tilt.py --box` takes full-size pixels
     (2252x4000). Focus can confirm earlier without a shot (folder 57, C206: blue at 7.2 s, the
     shot at 10.1 s): trust the counter.
   - Measure the true offset on the first clip, then rerun the scan with `--offset <s>`.
3. **Fragment** (`params.clip`):
   - **Always start at 0**: every clip opens with the hook — the flip screen opening, the camera
     turning on. Cutting it is a last resort (only for real junk at the start).
   - **End at the shot** (+0.2 s) when it is within ~15 s.
   - **A later shot**: end earlier on a good moment (subject on screen, composing; ideally a
     focus confirmation) at ~8–12 s. A slightly "wrong" end beats losing the hook; the owner cut
     a clip whose shot was at 27.8 s to 0–8 s.
   - The template's limits: 3–30 s.
   - **Several photos in one clip** (e.g. a 69 s clip with three shots): **every photo pair gets
     its own video** — the owner uses different moments of one clip; none may be left without a
     video. The **earliest** photo keeps the hook: 0 → its shot (the rules above). Each **later**
     photo: the fragment ends at its own shot and starts ~10 s earlier, never before the previous
     shot + 0.5 s (no hook there — the template takes one range; the camera screen shows that
     photo's scene, which is what counts: the sound is muted, the shutter moment is not seen).
     "Один ролик на клип" / "one video per clip" → only the earliest photo.
4. **Horizon** (`params.framing.tilt`): find the screen image's box on a full frame (bright picture
   inside the dark bezel), then `scripts/tilt.py <clip> --box x0,y0,x1,y1 --times <a,b>` (add
   `--strips <out>` to compare angles by eye). `+` = leaning clockwise ("down to the right");
   Straighten = minus the value the edges agree on, rounded to 0.1. Under ~0.3° leave 0. The
   bezel line is skewed by perspective: trust the image's edges.
5. **Punch-in on the camera screen** (`params.punchIn`: zoom `scale`, default 2×, at `atSec` into
   the fragment, default 8): aim it at the camera's **screen** so the zoomed screen is centred, not
   cut at the bottom. On a frame just after the punch (`atSec + 0.5`) find the centre of the screen
   image as fractions of the frame (`cx`, `cy`, 0..1, top-left origin) and set
   `x = s/(s−1) · 2 · (cx − 0.5)`, `y = s/(s−1) · 2 · (cy − 0.5)` (`s` = scale; for 2×: `4·(c − 0.5)`),
   rounded to 0.05, within −1..1. Reference: folder 57 `C206` at 8.5 s — screen centre at
   `cy` 0.564 → `y` 0.25, the value the owner set by eye. The punch only happens if
   `atSec + 0.5 ≤ fragment length`: for a fragment shorter than 8.5 s set `atSec` to its end − 1.5.
6. **Title** (`preset-reel`, `reel` look): `How to get that` / `"<Look 1>"` / `Look in *Lightroom*`
   (`texts.titleLead / titleHero / titleTail`, `*word*` = accent). Look 1 unless the owner picks.
7. **Preset**: the owner's choice; default `Video with Settings  - Pallete` (palette finale) —
   look it up by name in `GET /presets?templateId=preset-reel`.
   **Settings screenshots** come from **media groups** (Media page → Groups) — always check
   `GET /media-groups` (name + files in order):
   - Groups whose name contains `settings` or `screenshots` (any case; also `настройки`,
     `скриншоты`) hold a Lightroom preset's settings screenshots.
   - Which group goes with which video: the one the owner names first; else a settings group
     whose name contains the video's look (e.g. `Midnight Jungle settings`) or photo stem
     (`IMG_5669`); if exactly one settings group exists, use it for every video. Anything else
     ambiguous: list the settings groups and ask once for all the videos.
   - Use it: its image ids, in the group's order, into `media.settings` (at most 25) and
     `params.showSettings: true`. No settings group for a video → `params.showSettings: false`.
   - **The owner decides per batch**: by default use settings screenshots whenever a group fits;
     "без настроек" / "without settings" (for some or all videos) → `params.showSettings: false`
     even if a group fits; "с настройками" with no group to use → ask which group.
8. **Music**: vary it — no two videos of a batch on the same song unless the library runs out.
   `python3 -I scripts/music.py` lists the songs (tracks ≥ 60 s; shorter ones are sound
   effects), how many projects already use each, and 1–3 good starts per song (where it lifts:
   a verse or chorus kicking in). Hand out the least used songs first, each with one of its
   starts: `settings.music = { "enabled": true, "trackId": "<id>", "startSec": <start> }` (the
   preset's own track is just one of the options). The owner naming a song or "same music for
   all" wins.
9. **Upload** what the projects need: `python3 -I scripts/upload.py <files…>` (skips files already
   in the library, prints `{path: id}`).
10. **Create the projects**: `POST /projects` with the preset, a name `<folder> · <photo> · <look>`,
   settings and media, e.g.

   ```json
   {
     "presetId": "<preset id>",
     "name": "56 · IMG_5919 · Golden Lake",
     "settings": {
       "texts": {
         "titleLead": { "value": "How to get that" },
         "titleHero": { "value": "\"Golden Lake\"" },
         "titleTail": { "value": "Look in *Lightroom*" }
       },
       "params": {
         "clip": { "startSec": 0, "endSec": 9.5 },
         "showSettings": false,
         "framing": { "rotate": 0, "tilt": -0.5, "zoom": 1, "x": 0, "y": 0 },
         "punchIn": { "enabled": true, "atSec": 8, "scale": 2, "x": 0, "y": 0.25 }
       },
       "music": { "enabled": true, "trackId": "<song id>", "startSec": 39.7 }
     },
     "media": { "clip": "<clip id>", "before": "<Original id>", "after": "<Edited id>" }
   }
   ```

   A 400 names the field that does not fit; fix it, do not drop it silently.
11. **Check**: `make admin-check args="--path=/projects/<id>"` for each project.
12. **Report** (in Russian): a table — project (link `http://localhost:5173/projects/<id>`), clip,
    fragment, shot moment and how it was found, title, Straighten, punch-in point, song + start,
    screenshots group — plus what was skipped and why
    (no photo, several photos, unknown mark) and any open question.

## Do not

- Render, delete media or projects, or commit: the owner does that.
- Change a project the owner may have open in the editor: its autosave overwrites the server
  copy (last write wins). Ask him to close or reload it first.
- Ask about what this skill already decides; ask only about real gaps (a clip whose photo cannot
  be confirmed on the frames, a missing looks table).

When the owner corrects something (a fragment, the title, the horizon), update these rules.
