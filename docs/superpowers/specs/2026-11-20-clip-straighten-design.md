# Clip straighten (fine rotation) — design

## Intent

The owner films clips with a slightly tilted horizon and wants to level them in the clip framing
of `preset-reel` and `preset-flip`: a slider centred on 0 (right: clockwise, left: counter-
clockwise). "Zoom" is renamed "Scale".

## Approaches

1. **Auto-fill, like Lightroom's straighten** (picked by the owner): the clip grows just enough to
   hide the corners the tilt uncovers; Scale multiplies on top (1× = just filled); the pan cannot
   pull a corner into view.
2. Manual: the tilt only rotates, the owner covers the corners with Scale. Rejected by the owner.

## Design

- `params.framing.tilt` (`core/video-framing/framing.ts`): −45..45°, step 0.1, default 0, between
  the quarter turns and Scale; the field key `zoom` stays (stored values), its title becomes
  "Scale". Content scope like the rest of the framing.
- Geometry (`framingOffset`, pure): cover-fitted on-screen size `w × h` (after the quarter turn),
  frame `W × H`, `c = |cos θ|`, `s = |sin θ|`. Fill factor
  `fill = max((W·c + H·s) / w, (W·s + H·c) / h, 1)`; total scale `S = fill · zoom`. The pan works in
  the clip's (tilted) axes: the frame centre may move by `x · (w·S − (W·c + H·s)) / 2` and
  `y · (h·S − (W·s + H·c)) / 2` there; the screen offset is that vector rotated by θ, negated.
  At θ = 0 the formulas are the old ones.
- `VideoPlane`: tilt 0 keeps the old transform string (pixel-identical); otherwise
  `translate(x, y) rotate(θ) scale(S)`.
- Versions: preset-reel 1.13.0, preset-flip 1.8.0.

## Checks

Unit tests: the frame's corners stay inside the clip for tilts and pans at the limits; a slightly
smaller scale would show a corner; tilt 0 equals the old results. Baseline pixel compare of both
templates (default and zoomed / panned / quarter-turned framing). A demo render with a tilt.
