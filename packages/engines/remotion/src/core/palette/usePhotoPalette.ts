import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { extractPalette, FALLBACK_PALETTE, type PhotoPalette } from './extract.js';

/** Long side of the canvas copy that is analysed (plenty for a palette, fast to cluster). */
const SAMPLE_SIZE = 160;

const cache = new Map<string, PhotoPalette>();

const readPalette = (src: string): Promise<PhotoPalette> =>
  new Promise((resolve) => {
    const image = new Image();
    // Render assets come from a loopback server with CORS; the preview's from the same origin.
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const scale = SAMPLE_SIZE / Math.max(image.naturalWidth, image.naturalHeight, 1);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(FALLBACK_PALETTE);
          return;
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'medium';
        context.drawImage(image, 0, 0, width, height);
        resolve(extractPalette(context.getImageData(0, 0, width, height).data));
      } catch {
        // A tainted canvas (no CORS) or a broken image: keep the template working.
        resolve(FALLBACK_PALETTE);
      }
    };
    image.onerror = () => {
      resolve(FALLBACK_PALETTE);
    };
    image.src = src;
  });

/**
 * Colour palette of a photo, computed in the composition itself so the browser preview and
 * the render agree. Rendering waits for it (`delayRender`); unreadable photos fall back to a
 * neutral dark palette instead of failing the render.
 */
export const usePhotoPalette = (src: string): PhotoPalette => {
  const [palette, setPalette] = useState<PhotoPalette>(() => cache.get(src) ?? FALLBACK_PALETTE);
  useEffect(() => {
    const cached = cache.get(src);
    if (cached) {
      setPalette(cached);
      return undefined;
    }
    let active = true;
    const handle = delayRender(`Reading the palette of ${src.slice(0, 80)}`);
    void readPalette(src).then((result) => {
      cache.set(src, result);
      if (active) setPalette(result);
      continueRender(handle);
    });
    return () => {
      active = false;
    };
  }, [src]);
  return palette;
};
