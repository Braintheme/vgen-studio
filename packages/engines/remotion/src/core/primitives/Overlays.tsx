import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { seeded } from '../random.js';

/** Radial darkening towards the edges; `strength` 0..1. */
export const Vignette: React.FC<{ readonly strength: number }> = ({ strength }) =>
  strength <= 0 ? null : (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${(0.9 * strength).toFixed(3)}) 100%)`,
      }}
    />
  );

// Static fractal-noise tile; rasterized once by the browser, then only moved around.
const NOISE_TILE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}`;

/** Film grain that changes every frame deterministically; `strength` 0..1. */
export const Grain: React.FC<{ readonly strength: number; readonly seed: number }> = ({ strength, seed }) => {
  const frame = useCurrentFrame();
  if (strength <= 0) {
    return null;
  }
  const x = Math.floor(seeded(seed, `grain-x-${frame}`) * 256);
  const y = Math.floor(seeded(seed, `grain-y-${frame}`) * 256);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        backgroundImage: `url("${NOISE_TILE}")`,
        backgroundSize: '256px 256px',
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: 'overlay',
        opacity: Math.min(1, strength * 1.4),
      }}
    />
  );
};
