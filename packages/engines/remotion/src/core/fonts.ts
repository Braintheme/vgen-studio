import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import type { FontId } from '@vgen/shared';
import antonLatin from '@fontsource/anton/files/anton-latin-400-normal.woff2';
import antonLatinExt from '@fontsource/anton/files/anton-latin-ext-400-normal.woff2';
import bebasLatin from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2';
import bebasLatinExt from '@fontsource/bebas-neue/files/bebas-neue-latin-ext-400-normal.woff2';
import courgetteLatin from '@fontsource/courgette/files/courgette-latin-400-normal.woff2';
import courgetteLatinExt from '@fontsource/courgette/files/courgette-latin-ext-400-normal.woff2';
import interLatinItalic from '@fontsource-variable/inter/files/inter-latin-wght-italic.woff2';
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
import interLatinExtItalic from '@fontsource-variable/inter/files/inter-latin-ext-wght-italic.woff2';
import interLatinExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2';
import jetbrainsLatinItalic from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2';
import jetbrainsLatin from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
import jetbrainsLatinExtItalic from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-italic.woff2';
import jetbrainsLatinExt from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2';
// Variable width (wdth 75-100): narrow it with `font-variation-settings: 'wdth' <n>`.
import leagueGothicLatin from '@fontsource-variable/league-gothic/files/league-gothic-latin-wdth-normal.woff2';
import leagueGothicLatinExt from '@fontsource-variable/league-gothic/files/league-gothic-latin-ext-wdth-normal.woff2';
import manropeLatin from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2';
import manropeLatinExt from '@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2';
import montserratLatinItalic from '@fontsource-variable/montserrat/files/montserrat-latin-wght-italic.woff2';
import montserratLatin from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2';
import montserratLatinExtItalic from '@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-italic.woff2';
import montserratLatinExt from '@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-normal.woff2';
import oswaldLatin from '@fontsource-variable/oswald/files/oswald-latin-wght-normal.woff2';
import oswaldLatinExt from '@fontsource-variable/oswald/files/oswald-latin-ext-wght-normal.woff2';
import playfairLatin from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2';
import playfairLatinExt from '@fontsource-variable/playfair-display/files/playfair-display-latin-ext-wght-normal.woff2';
import unboundedLatin from '@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2';
import unboundedLatinExt from '@fontsource-variable/unbounded/files/unbounded-latin-ext-wght-normal.woff2';

// Unicode ranges as published by Fontsource for its latin / latin-ext subsets.
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

interface FontFile {
  readonly url: string;
  readonly unicodeRange: string;
  /** Real italic face; without one, `font-style: italic` is synthesized by the browser. */
  readonly style?: 'italic';
}

interface FontSource {
  /** Internal family name; prefixed so system fonts can never shadow it. */
  readonly family: string;
  readonly weight: string;
  readonly fallback: string;
  readonly files: readonly FontFile[];
}

const variable = (
  family: string,
  latin: string,
  latinExt: string,
  fallback = 'sans-serif',
  italic?: { readonly latin: string; readonly latinExt: string },
): FontSource => ({
  family,
  weight: '100 900',
  fallback,
  files: [
    { url: latin, unicodeRange: LATIN },
    { url: latinExt, unicodeRange: LATIN_EXT },
    ...(italic
      ? [
          { url: italic.latin, unicodeRange: LATIN, style: 'italic' as const },
          { url: italic.latinExt, unicodeRange: LATIN_EXT, style: 'italic' as const },
        ]
      : []),
  ],
});

/** A font with one regular face (latin + latin-ext). */
const single = (family: string, latin: string, latinExt: string, fallback = 'sans-serif'): FontSource => ({
  family,
  weight: '400',
  fallback,
  files: [
    { url: latin, unicodeRange: LATIN },
    { url: latinExt, unicodeRange: LATIN_EXT },
  ],
});

const FONT_SOURCES: Record<FontId, FontSource> = {
  inter: variable('vgen-inter', interLatin, interLatinExt, 'sans-serif', {
    latin: interLatinItalic,
    latinExt: interLatinExtItalic,
  }),
  manrope: variable('vgen-manrope', manropeLatin, manropeLatinExt),
  montserrat: variable('vgen-montserrat', montserratLatin, montserratLatinExt, 'sans-serif', {
    latin: montserratLatinItalic,
    latinExt: montserratLatinExtItalic,
  }),
  'playfair-display': variable('vgen-playfair-display', playfairLatin, playfairLatinExt, 'serif'),
  unbounded: variable('vgen-unbounded', unboundedLatin, unboundedLatinExt),
  oswald: variable('vgen-oswald', oswaldLatin, oswaldLatinExt),
  'bebas-neue': {
    family: 'vgen-bebas-neue',
    weight: '400',
    fallback: 'sans-serif',
    files: [
      { url: bebasLatin, unicodeRange: LATIN },
      { url: bebasLatinExt, unicodeRange: LATIN_EXT },
    ],
  },
  anton: single('vgen-anton', antonLatin, antonLatinExt),
  'league-gothic': single('vgen-league-gothic', leagueGothicLatin, leagueGothicLatinExt),
  courgette: {
    family: 'vgen-courgette',
    weight: '400',
    fallback: 'cursive',
    files: [
      { url: courgetteLatin, unicodeRange: LATIN },
      { url: courgetteLatinExt, unicodeRange: LATIN_EXT },
    ],
  },
  'jetbrains-mono': variable('vgen-jetbrains-mono', jetbrainsLatin, jetbrainsLatinExt, 'monospace', {
    latin: jetbrainsLatinItalic,
    latinExt: jetbrainsLatinExtItalic,
  }),
};

/** Average glyph advance in `em` for mixed-case Latin text; used to fit text to a width. */
const WIDTH_FACTORS: Record<FontId, number> = {
  inter: 0.6,
  manrope: 0.62,
  montserrat: 0.68,
  'playfair-display': 0.56,
  unbounded: 0.84,
  oswald: 0.47,
  'bebas-neue': 0.42,
  courgette: 0.52,
  anton: 0.5,
  'league-gothic': 0.36,
  'jetbrains-mono': 0.6,
};

/**
 * Largest font size (<= `max`) at which the longest word of `text` still fits
 * into `maxWidth`. Keeps long words from overflowing without measuring the DOM.
 */
export const fitFontSize = (
  text: string,
  font: FontId,
  maxWidth: number,
  max: number,
  min = max * 0.45,
): number => {
  const longest = text.split(/\s+/).reduce((length, word) => Math.max(length, word.length), 1);
  const fitted = maxWidth / (longest * WIDTH_FACTORS[font]);
  return Math.max(min, Math.min(max, fitted));
};

/** CSS `font-family` value for a font id. */
export const fontFamily = (id: FontId): string => {
  const source = FONT_SOURCES[id];
  return `'${source.family}', ${source.fallback}`;
};

const loading = new Map<FontId, Promise<void>>();

export const loadFont = (id: FontId): Promise<void> => {
  const existing = loading.get(id);
  if (existing) {
    return existing;
  }
  const source = FONT_SOURCES[id];
  const promise = Promise.all(
    source.files.map(async (file) => {
      const face = new FontFace(source.family, `url(${file.url}) format('woff2')`, {
        weight: source.weight,
        unicodeRange: file.unicodeRange,
        display: 'block',
        ...(file.style ? { style: file.style } : {}),
      });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  loading.set(id, promise);
  return promise;
};

/**
 * Blocks rendering until the given fonts are loaded. In the browser player, later
 * font changes load in the background without blocking. Returns whether these fonts are
 * loaded (e.g. before measuring text).
 */
export const useFonts = (ids: readonly FontId[]): boolean => {
  const key = [...new Set(ids)].sort().join(',');
  const [initial] = useState(() => ({ handle: delayRender(`Loading fonts: ${key}`), released: false }));
  // Which font set finished loading: a font switch in the player is "not loaded" until it is.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    const fonts = key.split(',') as FontId[];
    Promise.all(fonts.map(loadFont))
      .then(() => {
        setLoadedKey(key);
        if (!initial.released) {
          initial.released = true;
          continueRender(initial.handle);
        }
      })
      .catch((error: unknown) => {
        cancelRender(error);
      });
  }, [key, initial]);
  return loadedKey === key;
};
