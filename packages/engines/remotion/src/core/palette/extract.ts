// Pure, deterministic colour palette of a photo (no React / DOM). The main colours come from
// k-means in CIE Lab (median cut seeds), picked to be both large and distinct; the accent is
// searched separately by hue among the colourful pixels, so a small vivid subject (a green
// jacket in a grey street) wins over large dull areas. The composition feeds it the pixels
// of a small canvas copy of the photo (see usePhotoPalette).
import { hexToRgb, labChroma, labToRgb, rgbToHex, rgbToLab, type Rgb } from '../color.js';

export interface PaletteSwatch {
  readonly hex: string;
  /** Share of the photo's pixels, 0..1. */
  readonly weight: number;
  /** CIE L*, 0..100. */
  readonly lightness: number;
  readonly chroma: number;
}

export interface PhotoPalette {
  /** All clustered colours by weight, heaviest first. */
  readonly swatches: readonly PaletteSwatch[];
  /**
   * Main colours: the largest one, then large *and* different ones (three), plus a tint the
   * clusters missed when the photo has one.
   */
  readonly main: readonly PaletteSwatch[];
  /** The colour the eye goes to: the strongest vivid hue the main colours do not cover. */
  readonly accent: PaletteSwatch;
}

export interface ExtractOptions {
  /** Clusters before merging near duplicates. */
  readonly clusters?: number;
  readonly iterations?: number;
}

/** Swatches closer than this (Lab distance) are one colour. */
const MERGE_DISTANCE = 5;
/** An accent must be at least this colourful... */
export const ACCENT_MIN_CHROMA = 15;
/** ...and, as a fallback cluster, cover at least this share of the photo. */
const ACCENT_MIN_WEIGHT = 0.01;
/** How many main colours the pie shows. */
const MAIN_COLORS = 3;
/** A small vivid cluster is accent material, never a main colour. */
const ACCENT_LIKE = { chroma: 15, maxWeight: 0.15 } as const;
/** Accent search: pixels at least this colourful, grouped by hue. */
const VIVID_CHROMA = 12;
const HUE_BINS = 24;
/** A vivid hue counts from this share of the pixels (a small subject is enough). */
const ACCENT_MIN_SHARE = 0.0008;
/** Hues this close (degrees) to a colourful main colour are already in the palette. */
const MAIN_HUE_GUARD = 20;
/** Main colours this colourful claim their hue (duller ones are "neutral"). */
const MAIN_HUE_CHROMA = 6;
/** The accent is shown a little richer than its pixels, and never too dark or too light to read. */
const ACCENT_VIBRANCE = 1.35;
const ACCENT_LIGHTNESS = [35, 72] as const;
/** Main colours are shown a little richer too (same lightness): the pie reads as colour. */
const MAIN_VIBRANCE = 1.25;
/** Tint search: a quieter hue that still covers a visible area... */
const TINT_CHROMA = 8;
const TINT_MIN_SHARE = 0.015;
/** ...and differs enough from every main colour to deserve a wedge. */
const TINT_MIN_DISTANCE = 12;

interface Box {
  readonly pixels: Rgb[];
}

const channelRange = (pixels: readonly Rgb[], channel: 0 | 1 | 2): number => {
  let min = 255;
  let max = 0;
  for (const pixel of pixels) {
    min = Math.min(min, pixel[channel]);
    max = Math.max(max, pixel[channel]);
  }
  return max - min;
};

/** Classic median cut: split the box with the widest (count-weighted) range at its median. */
const medianCut = (pixels: Rgb[], count: number): Rgb[][] => {
  const boxes: Box[] = [{ pixels }];
  while (boxes.length < count) {
    let pick = -1;
    let pickScore = 0;
    let pickChannel: 0 | 1 | 2 = 0;
    boxes.forEach((box, index) => {
      if (box.pixels.length < 2) return;
      for (const channel of [0, 1, 2] as const) {
        const score = channelRange(box.pixels, channel) * Math.sqrt(box.pixels.length);
        if (score > pickScore) {
          pickScore = score;
          pick = index;
          pickChannel = channel;
        }
      }
    });
    const box = boxes[pick];
    if (!box || pickScore === 0) break;
    // Ties broken by the other channels: the sort (and so the split) is fully deterministic.
    const sorted = [...box.pixels].sort(
      (a, b) => a[pickChannel] - b[pickChannel] || a[0] - b[0] || a[1] - b[1] || a[2] - b[2],
    );
    const middle = Math.floor(sorted.length / 2);
    boxes.splice(pick, 1, { pixels: sorted.slice(0, middle) }, { pixels: sorted.slice(middle) });
  }
  return boxes.map((box) => box.pixels);
};

const mean = (items: readonly Rgb[]): Rgb => {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const item of items) {
    r += item[0];
    g += item[1];
    b += item[2];
  }
  const n = Math.max(1, items.length);
  return [r / n, g / n, b / n];
};

const distance = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const hueOf = (lab: Rgb): number => ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;
const hueGap = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/** Palette of RGBA pixels (as from `getImageData`); fully transparent pixels are skipped. */
export const extractPalette = (rgba: ArrayLike<number>, options: ExtractOptions = {}): PhotoPalette => {
  const clusters = options.clusters ?? 8;
  const iterations = options.iterations ?? 8;
  const pixels: Rgb[] = [];
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    if ((rgba[index + 3] ?? 0) < 8) continue;
    pixels.push([rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0]);
  }
  if (pixels.length === 0) {
    return FALLBACK_PALETTE;
  }

  // k-means in Lab (perceptual distances), seeded by the median-cut boxes.
  const labs = pixels.map(rgbToLab);
  const labOf = new Map<Rgb, Rgb>(pixels.map((pixel, index) => [pixel, labs[index] ?? [0, 0, 0]]));
  let centers = medianCut(pixels, clusters).map((box) =>
    mean(box.map((pixel) => labOf.get(pixel) ?? [0, 0, 0])),
  );
  let members: number[][] = [];
  for (let round = 0; round < iterations; round += 1) {
    members = centers.map(() => []);
    labs.forEach((lab, index) => {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((center, centerIndex) => {
        const d = distance(lab, center);
        if (d < bestDistance) {
          bestDistance = d;
          best = centerIndex;
        }
      });
      members[best]?.push(index);
    });
    centers = centers.map((center, centerIndex) => {
      const own = members[centerIndex] ?? [];
      return own.length > 0 ? mean(own.map((index) => labs[index] ?? center)) : center;
    });
  }

  // Swatches in RGB (the mean pixel of each cluster), near duplicates merged.
  const meanOf = (own: readonly number[]): Rgb => mean(own.map((index) => pixels[index] ?? [0, 0, 0]));
  let swatches = members
    .filter((own) => own.length > 0)
    .map((own) => ({ rgb: meanOf(own), own }))
    .sort((a, b) => b.own.length - a.own.length);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < swatches.length; i += 1) {
      for (let j = i + 1; j < swatches.length; j += 1) {
        const a = swatches[i];
        const b = swatches[j];
        if (a && b && distance(rgbToLab(a.rgb), rgbToLab(b.rgb)) < MERGE_DISTANCE) {
          const own = [...a.own, ...b.own];
          swatches = [...swatches.slice(0, i), { rgb: meanOf(own), own }, ...swatches.slice(i + 1)].filter(
            (_, index) => index !== j,
          );
          merged = true;
          break outer;
        }
      }
    }
  }
  const toSwatch = (rgb: Rgb, count: number): PaletteSwatch => {
    const hex = rgbToHex(rgb);
    const lab = rgbToLab(hexToRgb(hex));
    return { hex, weight: count / pixels.length, lightness: lab[0], chroma: labChroma(lab) };
  };
  swatches.sort((a, b) => b.own.length - a.own.length);
  const result = swatches.map((swatch) => toSwatch(swatch.rgb, swatch.own.length));

  // Main colours: the largest, then each next one by "large x unlike the ones picked".
  const labHex = (hex: string): Rgb => rgbToLab(hexToRgb(hex));
  const main: PaletteSwatch[] = result.slice(0, 1);
  while (main.length < Math.min(MAIN_COLORS, result.length)) {
    let best: PaletteSwatch | undefined;
    let bestScore = -1;
    for (const swatch of result) {
      if (main.includes(swatch)) continue;
      if (swatch.chroma >= ACCENT_LIKE.chroma && swatch.weight < ACCENT_LIKE.maxWeight) continue;
      const unlike = Math.min(...main.map((picked) => distance(labHex(swatch.hex), labHex(picked.hex))));
      const score = swatch.weight * unlike;
      if (score > bestScore) {
        bestScore = score;
        best = swatch;
      }
    }
    if (!best) break;
    main.push(best);
  }

  const hueOfHex = (hex: string): number => hueOf(labHex(hex));
  const mainHues = main
    .filter((swatch) => swatch.chroma >= MAIN_HUE_CHROMA)
    .map((swatch) => hueOfHex(swatch.hex));
  const found =
    strongestHue(pixels, labs, {
      minChroma: VIVID_CHROMA,
      minShare: ACCENT_MIN_SHARE,
      claimedHues: mainHues,
      vivid: true,
    }) ?? fallbackAccent(result, main);
  const accent = found.chroma >= ACCENT_MIN_CHROMA ? vivify(found, ACCENT_VIBRANCE, ACCENT_LIGHTNESS) : found;

  // A tint the main colours miss (a dark blue sea next to brown sand): a sizeable, moderately
  // colourful hue that is neither the accent's nor a main colour's becomes one more colour.
  const tint = strongestHue(pixels, labs, {
    minChroma: TINT_CHROMA,
    minShare: TINT_MIN_SHARE,
    claimedHues: [...mainHues, hueOfHex(accent.hex)],
    vivid: false,
  });
  const distinct = (swatch: PaletteSwatch): boolean =>
    main.every((picked) => distance(labHex(swatch.hex), labHex(picked.hex)) >= TINT_MIN_DISTANCE);
  const shown = (tint && distinct(tint) ? [...main, tint] : main).map((swatch) =>
    vivify(swatch, MAIN_VIBRANCE, [0, 100]),
  );
  return { swatches: result, main: shown, accent };
};

interface HueSearch {
  /** Pixels below this chroma are ignored. */
  readonly minChroma: number;
  /** A hue counts from this share of the pixels. */
  readonly minShare: number;
  /** Hues already in the palette (degrees). */
  readonly claimedHues: readonly number[];
  /** Weigh pixels by squared chroma (vivid wins) instead of chroma (area wins). */
  readonly vivid: boolean;
}

/**
 * The strongest hue among colourful pixels that the palette does not show yet; its colour is
 * the chroma-weighted mean of those pixels. Null when there is none.
 */
const strongestHue = (
  pixels: readonly Rgb[],
  labs: readonly Rgb[],
  search: HueSearch,
): PaletteSwatch | null => {
  const binOf = (hue: number): number => Math.floor(hue / (360 / HUE_BINS)) % HUE_BINS;
  const weigh = (chroma: number): number => (search.vivid ? chroma * chroma : chroma);
  const strength = new Array<number>(HUE_BINS).fill(0);
  const count = new Array<number>(HUE_BINS).fill(0);
  labs.forEach((lab) => {
    const chroma = labChroma(lab);
    if (chroma < search.minChroma) return;
    const bin = binOf(hueOf(lab));
    strength[bin] = (strength[bin] ?? 0) + weigh(chroma);
    count[bin] = (count[bin] ?? 0) + 1;
  });
  // Hues already in the palette are out, and so are their pixels (no leaking back in
  // through a neighbouring bin).
  const claimed = Array.from({ length: HUE_BINS }, (_, bin) =>
    search.claimedHues.some((hue) => hueGap(hue, (bin + 0.5) * (360 / HUE_BINS)) < MAIN_HUE_GUARD),
  );
  const open = (bin: number): boolean => !claimed[(bin + HUE_BINS) % HUE_BINS];
  const window = (bin: number, values: readonly number[]): number =>
    [-1, 0, 1].reduce((sum, step) => {
      const at = (bin + step + HUE_BINS) % HUE_BINS;
      return open(at) ? sum + (values[at] ?? 0) : sum;
    }, 0);
  let pick = -1;
  let pickStrength = 0;
  for (let bin = 0; bin < HUE_BINS; bin += 1) {
    if (!open(bin)) continue;
    if (window(bin, count) < search.minShare * pixels.length) continue;
    const value = window(bin, strength);
    if (value > pickStrength) {
      pickStrength = value;
      pick = bin;
    }
  }
  if (pick < 0) {
    return null;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  let members = 0;
  labs.forEach((lab, index) => {
    const chroma = labChroma(lab);
    const bin = binOf(hueOf(lab));
    const near = open(bin) && Math.min(Math.abs(bin - pick), HUE_BINS - Math.abs(bin - pick)) <= 1;
    const pixel = pixels[index];
    if (chroma < search.minChroma || !near || !pixel) return;
    const weight = weigh(chroma);
    r += pixel[0] * weight;
    g += pixel[1] * weight;
    b += pixel[2] * weight;
    total += weight;
    members += 1;
  });
  const hex = rgbToHex([r / total, g / total, b / total]);
  const lab = rgbToLab(hexToRgb(hex));
  return { hex, weight: members / pixels.length, lightness: lab[0], chroma: labChroma(lab) };
};

/** A richer version of a colour (same hue), its lightness kept within `range`. */
const vivify = (swatch: PaletteSwatch, vibrance: number, range: readonly [number, number]): PaletteSwatch => {
  const [l, a, b] = rgbToLab(hexToRgb(swatch.hex));
  const lightness = Math.min(range[1], Math.max(range[0], l));
  const hex = rgbToHex(labToRgb([lightness, a * vibrance, b * vibrance]));
  const lab = rgbToLab(hexToRgb(hex));
  return { ...swatch, hex, lightness: lab[0], chroma: labChroma(lab) };
};

/** No vivid hue left: the most colourful sizeable cluster outside the main colours. */
const fallbackAccent = (
  swatches: readonly PaletteSwatch[],
  main: readonly PaletteSwatch[],
): PaletteSwatch => {
  const score = (swatch: PaletteSwatch): number => swatch.chroma * Math.sqrt(swatch.weight);
  const candidates = swatches.filter(
    (swatch) => swatch.weight >= ACCENT_MIN_WEIGHT && !main.includes(swatch),
  );
  return (
    [...candidates].sort((a, b) => score(b) - score(a))[0] ??
    [...main].sort((a, b) => b.chroma - a.chroma)[0] ??
    FALLBACK_SWATCH
  );
};

const FALLBACK_SWATCH: PaletteSwatch = { hex: '#11161a', weight: 1, lightness: 7, chroma: 3 };

/** Used until (or if) the photo cannot be read: the reference's moody palette. */
export const FALLBACK_PALETTE: PhotoPalette = (() => {
  const swatch = (hex: string, weight: number): PaletteSwatch => {
    const lab = rgbToLab(hexToRgb(hex));
    return { hex, weight, lightness: lab[0], chroma: labChroma(lab) };
  };
  const main = [swatch('#11161a', 0.45), swatch('#535257', 0.25), swatch('#1c2628', 0.15)];
  const accent = swatch('#4c1e11', 0.15);
  return { swatches: [...main, accent], main, accent };
})();

export interface Wedge {
  readonly color: string;
  readonly accent: boolean;
}

/**
 * The palette as pie wedges, clockwise from 12 o'clock: the main colours dark to light
 * (wedges by weight), then the accent (as in the reference: 3 + 1 + 2 dark/grey + 2 red).
 */
export const paletteWedges = (palette: PhotoPalette, count = 8, accentWedges = 2): Wedge[] => {
  const hasAccent = palette.accent.chroma >= ACCENT_MIN_CHROMA;
  const base = palette.main.filter((swatch) => !hasAccent || swatch.hex !== palette.accent.hex);
  const baseWedges = hasAccent ? count - accentWedges : count;
  const totalWeight = base.reduce((sum, swatch) => sum + swatch.weight, 0) || 1;
  // Proportional (largest remainder), at least one wedge per colour.
  const shares = base.map((swatch) => (baseWedges * swatch.weight) / totalWeight);
  const counts = shares.map((share) => Math.max(1, Math.floor(share)));
  const byRemainder = shares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  let left = baseWedges - counts.reduce((sum, value) => sum + value, 0);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    counts[index] = (counts[index] ?? 0) + 1;
    left -= 1;
  }
  // The minimum of one may overshoot: take back from the largest colours.
  while (left < 0) {
    const largest = counts.indexOf(Math.max(...counts));
    counts[largest] = (counts[largest] ?? 1) - 1;
    left += 1;
  }
  const ordered = base
    .map((swatch, index) => ({ swatch, wedges: counts[index] ?? 0 }))
    .sort((a, b) => a.swatch.lightness - b.swatch.lightness);
  return [
    ...ordered.flatMap(({ swatch, wedges }) =>
      Array.from({ length: wedges }, (): Wedge => ({ color: swatch.hex, accent: false })),
    ),
    ...(hasAccent
      ? Array.from({ length: accentWedges }, (): Wedge => ({ color: palette.accent.hex, accent: true }))
      : []),
  ];
};

/** Darkest main colour (the collapsed dot). */
export const darkestColor = (palette: PhotoPalette): string =>
  [...palette.swatches].sort((a, b) => a.lightness - b.lightness)[0]?.hex ?? FALLBACK_SWATCH.hex;
