import type { Layout } from '../layout.js';
import type { Registrable } from '../registry.js';
import type { SceneStyle } from '../scene/spec.js';

export interface BackgroundInput {
  /** Seconds since the background appeared (time-based, so fps does not change the look). */
  readonly timeSec: number;
  readonly layout: Layout;
  readonly seed: number;
  /** Template colors: the base and the accent. */
  readonly base: string;
  readonly accent: string;
}

/**
 * An animated full-frame background: a pure function from time to layers (drawn in order,
 * each an absolutely filling element). Layers move by transforms only and use soft gradients
 * instead of `filter: blur` (cheap in the headless renderer).
 */
export interface BackgroundDefinition extends Registrable {
  layers(input: BackgroundInput): readonly SceneStyle[];
}

export const defineBackground = <const D extends BackgroundDefinition>(definition: D): D => definition;

/** `#rrggbb` + alpha -> `rgba()`. */
export const withAlpha = (hex: string, alpha: number): string => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${String((value >> 16) & 255)}, ${String((value >> 8) & 255)}, ${String(value & 255)}, ${alpha.toFixed(3)})`;
};

/** A soft band across a layer: transparent -> color -> transparent, with smooth shoulders. */
export const softBand = (color: string, alpha: number, angleDeg = 90): string =>
  `linear-gradient(${String(angleDeg)}deg, transparent 0%, ${withAlpha(color, alpha * 0.18)} 22%, ${withAlpha(color, alpha * 0.62)} 38%, ${withAlpha(color, alpha)} 50%, ${withAlpha(color, alpha * 0.62)} 62%, ${withAlpha(color, alpha * 0.18)} 78%, transparent 100%)`;

/** A soft round glow (radial gradient that fades to nothing). */
export const softGlow = (color: string, alpha: number): string =>
  `radial-gradient(closest-side, ${withAlpha(color, alpha)} 0%, ${withAlpha(color, alpha * 0.55)} 40%, ${withAlpha(color, alpha * 0.18)} 70%, transparent 100%)`;
