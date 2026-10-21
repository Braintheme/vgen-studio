import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { meanLuminance } from '../contrast.js';

/** Part of an image as fractions of its size (0..1). */
export interface ImageRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Long side of the sampled copy of the region (an average needs few pixels). */
const SAMPLE_SIZE = 48;

const cache = new Map<string, number>();

/** Rounded, so tiny layout changes reuse the measurement. */
const keyOf = (src: string, region: ImageRegion): string =>
  [region.x, region.y, region.width, region.height].map((value) => value.toFixed(3)).join(',') + src;

const clampRegion = (region: ImageRegion): ImageRegion => {
  const x = Math.min(0.99, Math.max(0, region.x));
  const y = Math.min(0.99, Math.max(0, region.y));
  return {
    x,
    y,
    width: Math.max(0.01, Math.min(1 - x, region.width - (x - region.x))),
    height: Math.max(0.01, Math.min(1 - y, region.height - (y - region.y))),
  };
};

const readLuminance = (src: string, region: ImageRegion): Promise<number> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const sx = region.x * image.naturalWidth;
        const sy = region.y * image.naturalHeight;
        const sw = Math.max(1, region.width * image.naturalWidth);
        const sh = Math.max(1, region.height * image.naturalHeight);
        const scale = SAMPLE_SIZE / Math.max(sw, sh);
        const width = Math.max(1, Math.round(sw * scale));
        const height = Math.max(1, Math.round(sh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(0);
          return;
        }
        context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
        resolve(meanLuminance(context.getImageData(0, 0, width, height).data));
      } catch {
        // A tainted canvas or a broken image: treat the area as dark (labels keep their colour).
        resolve(0);
      }
    };
    image.onerror = () => {
      resolve(0);
    };
    image.src = src;
  });

/**
 * Mean WCAG luminance (0..1) of a region of a photo, measured in the composition itself so the
 * preview and the render agree; rendering waits for it. `null` skips the measurement (returns 0).
 */
export const useRegionLuminance = (src: string, region: ImageRegion | null): number => {
  const key = region ? keyOf(src, clampRegion(region)) : null;
  const [luminance, setLuminance] = useState<number>(() => (key ? (cache.get(key) ?? 0) : 0));
  useEffect(() => {
    if (!key || !region) {
      setLuminance(0);
      return undefined;
    }
    const cached = cache.get(key);
    if (cached !== undefined) {
      setLuminance(cached);
      return undefined;
    }
    let active = true;
    const handle = delayRender(`Measuring label contrast on ${src.slice(0, 80)}`);
    void readLuminance(src, clampRegion(region)).then((result) => {
      cache.set(key, result);
      if (active) setLuminance(result);
      continueRender(handle);
    });
    return () => {
      active = false;
    };
    // `key` covers `src` and the (rounded) region.
  }, [key]);
  return luminance;
};
