import { z } from 'zod';

/**
 * Fonts every engine must ship locally (no network at render time).
 * When adding fonts prefer families with Cyrillic coverage.
 */
export const FONTS = [
  { id: 'inter', family: 'Inter', category: 'sans', cyrillic: true },
  { id: 'manrope', family: 'Manrope', category: 'sans', cyrillic: true },
  { id: 'montserrat', family: 'Montserrat', category: 'sans', cyrillic: true },
  { id: 'playfair-display', family: 'Playfair Display', category: 'serif', cyrillic: true },
  { id: 'unbounded', family: 'Unbounded', category: 'display', cyrillic: true },
  { id: 'oswald', family: 'Oswald', category: 'condensed', cyrillic: true },
  { id: 'bebas-neue', family: 'Bebas Neue', category: 'display', cyrillic: false },
  { id: 'courgette', family: 'Courgette', category: 'script', cyrillic: false },
  { id: 'anton', family: 'Anton', category: 'condensed', cyrillic: false },
  { id: 'league-gothic', family: 'League Gothic', category: 'condensed', cyrillic: false },
  { id: 'jetbrains-mono', family: 'JetBrains Mono', category: 'mono', cyrillic: true },
] as const;

export type FontDefinition = (typeof FONTS)[number];
export type FontId = FontDefinition['id'];

export const FONT_IDS = FONTS.map((font) => font.id) as [FontId, ...FontId[]];
export const FontIdSchema = z.enum(FONT_IDS);
