// Asset hook and media checks of the carousel (isomorphic: pixel work goes through the toolkit).
import {
  FORMATS,
  type Format,
  type MediaInfo,
  type MediaInfoMap,
  type MediaWarning,
  type PreparedImage,
  type PreparedMediaMap,
  type PrepareAssetsContext,
  type SharpenLevel,
  type Size,
} from '@vgen/shared';
import { placePhoto, slideCells, type Anchor, type Framing, type SlideCells, type Split } from './layout.js';

/** The props the geometry depends on. */
export interface CarouselGeometryProps {
  readonly format: Format;
  readonly params: {
    readonly split: Split;
    readonly framing: Framing;
    readonly anchor: Anchor;
    readonly gap: number;
  };
}

/** Design sizes are for 1080 px on the short side. */
export const unitOf = (frame: Size): number => Math.min(frame.width, frame.height) / 1080;

/** The two halves of a slide in output (CSS) pixels: the same math in the composition and here. */
export const carouselCells = (frame: Size, gap: number, split: Split): SlideCells =>
  slideCells(frame, Math.round(gap * unitOf(frame)), split);

/** Relative difference of two aspect ratios. */
const aspectGap = (a: Size, b: Size): number => {
  const ratioA = a.width / a.height;
  const ratioB = b.width / b.height;
  return Math.abs(ratioA - ratioB) / ratioA;
};

/**
 * Brings every pair to the exact pixel size it is drawn at (times the output scale), so the
 * renderer draws photos 1:1 without resampling, and sharpens after that last resize. The after
 * photo takes the before photo's size: the two match pixel for pixel, whatever their sizes.
 */
export const prepareCarousel = async (
  context: PrepareAssetsContext<
    CarouselGeometryProps & { readonly imageProcessing: { readonly sharpen: SharpenLevel } }
  >,
): Promise<PreparedMediaMap> => {
  const photos = context.media['photos'];
  if (!Array.isArray(photos)) return context.media;
  const list = photos as readonly PreparedImage[];
  const { props } = context;
  const frame = FORMATS[props.format];
  const scale = context.frame.width / frame.width;
  // Both halves have the same size, so one target fits either position.
  const cell = carouselCells(frame, props.params.gap, props.params.split).first;
  const sharpen = props.imageProcessing.sharpen;

  const prepared: PreparedImage[] = [];
  for (let index = 0; index + 1 < list.length; index += 2) {
    const before = list[index] as PreparedImage;
    const after = list[index + 1] as PreparedImage;
    const rect = placePhoto(before, cell, props.params.framing, props.params.anchor);
    const target = { width: Math.round(rect.width * scale), height: Math.round(rect.height * scale) };
    if (aspectGap(before, after) > 0.01) {
      context.warn({
        code: 'ASPECT_MISMATCH',
        severity: 'warning',
        slots: ['photos'],
        message: `Slide ${String(index / 2 + 1)}: before and after have different proportions; the after photo was cropped to match.`,
      });
    }
    prepared.push(
      await context.images.resize(before, target, { fit: 'cover', sharpen }),
      await context.images.resize(after, target, { fit: 'cover', sharpen }),
    );
  }
  return { ...context.media, photos: prepared };
};

const slideList = (slides: readonly number[]): string =>
  `${slides.length === 1 ? 'Slide' : 'Slides'} ${slides.join(', ')}`;

/** Non-blocking checks: an unpaired photo, pairs that do not match, photos too small for 1080 px. */
export const checkCarouselMedia = (media: MediaInfoMap): readonly MediaWarning[] => {
  const value = media['photos'];
  const photos = Array.isArray(value) ? (value as readonly MediaInfo[]) : [];
  const warnings: MediaWarning[] = [];
  if (photos.length % 2 === 1) {
    warnings.push({
      code: 'UNPAIRED_PHOTO',
      severity: 'warning',
      slots: ['photos'],
      message: `Photo ${String(photos.length)} has no pair: add its after photo or remove it.`,
    });
  }
  const mismatched: number[] = [];
  const small: number[] = [];
  for (let index = 0; index + 1 < photos.length; index += 2) {
    const before = photos[index] as MediaInfo;
    const after = photos[index + 1] as MediaInfo;
    const slide = index / 2 + 1;
    if (!before.width || !before.height || !after.width || !after.height) continue;
    if (
      aspectGap(
        { width: before.width, height: before.height },
        { width: after.width, height: after.height },
      ) > 0.01
    ) {
      mismatched.push(slide);
    }
    if (Math.min(before.width, after.width) < 1080) small.push(slide);
  }
  if (mismatched.length > 0) {
    warnings.push({
      code: 'ASPECT_MISMATCH',
      severity: 'warning',
      slots: ['photos'],
      message: `${slideList(mismatched)}: before and after have different proportions (is the order right?); the after photo will be cropped to match.`,
    });
  }
  if (small.length > 0) {
    warnings.push({
      code: 'LOW_RESOLUTION',
      severity: 'info',
      slots: ['photos'],
      message: `${slideList(small)}: photos narrower than 1080 px will look soft.`,
    });
  }
  return warnings;
};
