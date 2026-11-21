# Instagram-style title — design

## Intent

The owner wants the clip title of `preset-reel` and `preset-flip` to look like text typed in
Instagram Stories: any text, own line breaks, no `*accent*` colouring, with a text colour, an
optional fill behind the lines (Instagram's "A" button: one rounded shape hugging the lines), an
optional outline around the letters and the existing shadow. The text and its settings are reused
across videos, so presets keep them.

Non-goals: several independent captions with their own timing (a later step, could reuse this);
Instagram's own fonts (only installed fonts, close matches).
Anti-goals: any pixel change for the existing title styles and for renders that do not pick the
new style.

## Approaches

1. **A new title style with its own multi-line text** (picked). `Instagram` joins the shared title
   styles; while it is selected the form shows one textarea instead of the three lines.
2. The Instagram look over the existing three lines: no new text field, but at most three lines, no
   free line breaks, confusing line labels. Rejected: not what the owner described.
3. Separate text overlays: most flexible, several times the work. Deferred.

## Design

**Where.** `core/styled-title/`, so both templates get it. `instagram` is added to `TITLE_STYLES`
(defaults stay `reel` / `classic`, so nothing changes until it is picked). `StyledTitle` hands the
`instagram` style to a new `InstagramTitle` component; the anchor (top / centre / bottom + offset),
entrance and exit math is shared (extracted as pure helpers, proven pixel-identical).

**Fields** (all `style` scope, so presets carry them):

- `texts.titleText`: `textField({ multiline: true, maxLength: 160, scope: 'style' })`; empty lines
  are kept as gaps.
- `params.igTitle` (one object, prefault `{}`): `font` (installed fonts, default `inter`),
  `weight` (300–900, default 700), `align` (left / center / right, default center), `lineHeight`,
  `textColor`, `fill` (`off` / `solid` / `see-through`) + `fillColor`, `outline` (on/off, colour,
  width). Defaults: Instagram's highlighted look (white fill, black text, no outline).
- Reused: title size (`titleSize`/`titleScale` in preset-reel, `titleSize` in preset-flip),
  position, vertical offset, shadow, entrance (`titleAnimation` / `titleEntrance`).

**Rendering.**

- Lines are measured with `@remotion/layout-utils` `measureText` once fonts are in (`useFonts`).
- The fill is one SVG path per run of non-empty lines: stacked line rectangles merged into one
  outline, convex and concave corners rounded (radius limited by half the width step and half the
  line height), as Instagram draws it. A pure `plateOutline()` builds the path (unit-tested).
- The outline is a stroked copy of the text behind the plain text (outside stroke, no glyph
  thinning), width in design px.
- The block enters as one piece (rise / pop), so the merged fill never tears; it exits with the
  template's existing exit. Motion through transforms only (`placeAt`), no layout animation.

**Admin.** No form changes: the current `title` group gets `visibleWhen` the non-Instagram styles;
a new `title-instagram` group (label "Title": the textarea + the style select, popovers "Font",
"Colours & fill", "Layout") is shown while `instagram` is picked. The two groups never show at once.

**Versions.** `preset-reel` 1.12.0, `preset-flip` 1.7.0.

**Checks.** Baseline stills of both templates before touching core, pixel compare after
(`YMAX=0`); unit tests for `plateOutline` and for presets keeping the new fields; `make lint`,
`make test`, `make check-jitter`, `make admin-check`; a demo render of the new style.

## Builder's calls

Exact default sizes, paddings, corner radius and see-through opacity (tuned by eye to Instagram's
look); default text of `titleText` per template.
