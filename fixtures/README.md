# Fixtures

Photos used by Remotion Studio and demo renders.

- Put your own pair here as `before.<jpg|jpeg|png|webp>` and `after.<jpg|jpeg|png|webp>`
  (same framing). They take priority over generated ones.
- Without them, `make fixtures` generates a synthetic landscape pair into `generated/`.
- `make fixtures` normalizes the pair into `.studio/` (EXIF-rotated, sRGB, max 2400 px),
  which is Studio's public dir.
