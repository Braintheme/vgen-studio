import type { ImageToolkit, PreparedImage, ResizeOptions, SharpenLevel, Size } from '@vgen/shared';
import sharp, { type SharpenOptions } from 'sharp';

export type { SharpenLevel };

/** Unsharp-mask settings tuned for downscaled photos (applied AFTER resizing). */
const SHARPEN: Record<Exclude<SharpenLevel, 'off'>, SharpenOptions> = {
  low: { sigma: 0.5, m1: 0.5, m2: 1.2 },
  medium: { sigma: 0.75, m1: 0.8, m2: 2.2 },
};

export interface NormalizeOptions {
  /** Output frame the photo will fill (object-fit: cover). */
  readonly frame: Size;
  /** Headroom over the cover size for camera moves (Ken Burns, parallax). */
  readonly oversample?: number;
  /** Hard cap for the long side. */
  readonly maxSide?: number;
  readonly sharpen: SharpenLevel;
}

/** Target pixel size: cover-fit for `frame` times `oversample`, never upscaled, capped. */
export const normalizedSize = (source: Size, options: Omit<NormalizeOptions, 'sharpen'>): Size => {
  const cover = Math.max(options.frame.width / source.width, options.frame.height / source.height);
  let scale = Math.min(1, cover * (options.oversample ?? 1.25));
  const maxSide = options.maxSide ?? 4096;
  scale = Math.min(scale, maxSide / Math.max(source.width, source.height));
  return { width: Math.round(source.width * scale), height: Math.round(source.height * scale) };
};

/**
 * Normalizes a photo for rendering: applies EXIF orientation, converts to sRGB
 * (Lightroom exports are often Display P3 / Adobe RGB), resizes to what the frame
 * needs and optionally sharpens, then encodes a high-quality JPEG.
 */
export const normalizePhoto = async (
  input: string,
  output: string,
  options: NormalizeOptions,
): Promise<PreparedImage> => {
  const oriented = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  const size = normalizedSize({ width: oriented.info.width, height: oriented.info.height }, options);
  let pipeline = sharp(oriented.data)
    .resize(size.width, size.height, { kernel: 'lanczos3' })
    .toColorspace('srgb');
  if (options.sharpen !== 'off') {
    pipeline = pipeline.sharpen(SHARPEN[options.sharpen]);
  }
  const info = await pipeline
    .withIccProfile('srgb')
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(output);
  return { path: output, width: info.width, height: info.height, mime: 'image/jpeg' };
};

export interface DeliveryImage extends Size {
  readonly path: string;
  readonly size: number;
}

/**
 * Encodes a rendered image (lossless PNG from the renderer) once into the delivery JPEG for
 * social apps: sRGB with an embedded sRGB profile, no EXIF / XMP / GPS (sharp writes no
 * metadata unless asked), 4:4:4 chroma so thin text edges stay clean, mozjpeg.
 */
export const encodeDeliveryJpeg = async (
  input: string,
  output: string,
  options: { readonly quality: number },
): Promise<DeliveryImage> => {
  const info = await sharp(input)
    .toColorspace('srgb')
    .withIccProfile('srgb')
    .jpeg({ quality: options.quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(output);
  return { path: output, width: info.width, height: info.height, size: info.size };
};

/** A smaller JPEG copy (thumbnails): fits `maxSide`, never upscaled. */
export const shrinkJpeg = async (input: string, output: string, maxSide: number): Promise<DeliveryImage> => {
  const info = await sharp(input)
    .resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    .withIccProfile('srgb')
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(output);
  return { path: output, width: info.width, height: info.height, size: info.size };
};

/** ImageToolkit for template hooks, backed by sharp. Writes next to the input file. */
export const createSharpToolkit = (nameFor: (image: PreparedImage, size: Size) => string): ImageToolkit => ({
  async resize(image: PreparedImage, size: Size, options?: ResizeOptions): Promise<PreparedImage> {
    const output = nameFor(image, size);
    let pipeline = sharp(image.path).resize(size.width, size.height, {
      fit: options?.fit ?? 'cover',
      kernel: 'lanczos3',
    });
    const sharpen = options?.sharpen ?? 'off';
    if (sharpen !== 'off') {
      pipeline = pipeline.sharpen(SHARPEN[sharpen]);
    }
    const info = await pipeline
      .withIccProfile('srgb')
      .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(output);
    return { path: output, width: info.width, height: info.height, mime: 'image/jpeg' };
  },
});
