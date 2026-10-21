import { useEffect, useState } from 'react';
import { continueRender, delayRender, useVideoConfig } from 'remotion';
import { applyAdjustments } from './process.js';
import { effectiveAdjustments, isNeutral, type Adjustments, type PhotoAdjustments } from './schema.js';

/** Processing size relative to the frame's long side. */
const PROCESS_SCALE = 1.5;
/** Processed photos kept around (preview sliders produce many); older blob URLs are freed. */
const CACHE_SIZE = 12;
const cache = new Map<string, Promise<string>>();

const remember = (key: string, value: Promise<string>): Promise<string> => {
  cache.set(key, value);
  while (cache.size > CACHE_SIZE) {
    const [oldest] = cache.keys();
    if (oldest === undefined) break;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    void evicted?.then((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }
  return value;
};

const process = (src: string, adjustments: Adjustments, maxSide: number): Promise<string> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight, 1));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(src);
          return;
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height);
        applyAdjustments(pixels.data, width, height, adjustments);
        context.putImageData(pixels, 0, 0);
        canvas.toBlob(
          (blob) => {
            resolve(blob ? URL.createObjectURL(blob) : src);
          },
          'image/jpeg',
          0.95,
        );
      } catch {
        // Unreadable (tainted) canvas: show the photo as it is rather than fail the render.
        resolve(src);
      }
    };
    image.onerror = () => {
      resolve(src);
    };
    image.src = src;
  });

/**
 * A photo with before/after adjustments applied, processed in the composition itself so the
 * browser preview and the render agree. Neutral adjustments return `src` untouched (no
 * processing at all). Rendering waits for the result (`delayRender`).
 * Photos are processed at up to 1.5x the frame's long side (room for camera pushes), or at
 * most `options.maxSide` pixels (`Infinity`: the photo's own size, e.g. photos prepared at the
 * exact size they are drawn at).
 */
export const useAdjustedPhoto = (
  src: string,
  value: PhotoAdjustments,
  options: { readonly maxSide?: number } = {},
): string => {
  const { width, height } = useVideoConfig();
  const maxSide = options.maxSide ?? Math.round(PROCESS_SCALE * Math.max(width, height));
  const adjustments = effectiveAdjustments(value);
  const neutral = isNeutral(adjustments);
  const key = neutral ? '' : `${src}|${maxSide}|${JSON.stringify(adjustments)}`;
  const [result, setResult] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (neutral) return undefined;
    let active = true;
    const handle = delayRender(`Adjusting photo ${src.slice(0, 60)}`);
    void (cache.get(key) ?? remember(key, process(src, adjustments, maxSide))).then((url) => {
      if (active) setResult({ key, url });
      continueRender(handle);
    });
    return () => {
      active = false;
    };
    // `adjustments` is fully described by `key`.
  }, [key, neutral, src, maxSide]);

  if (neutral) return src;
  // While a new version is processed (preview), keep showing the last one.
  return result?.url ?? src;
};
