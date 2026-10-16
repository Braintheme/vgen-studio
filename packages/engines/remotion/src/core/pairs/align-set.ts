// Shared by templates that show one shot in several edits (a before photo + a list of afters).
import type { PreparedImage, PreparedMedia, PrepareAssetsContext, PreparedMediaMap } from '@vgen/shared';

const single = (value: PreparedMedia | undefined): PreparedImage | null =>
  value && !Array.isArray(value) ? (value as PreparedImage) : null;

const list = (value: PreparedMedia | undefined): readonly PreparedImage[] =>
  Array.isArray(value) ? (value as readonly PreparedImage[]) : [];

/** Relative aspect-ratio difference treated as "same proportions". */
const ASPECT_TOLERANCE = 0.01;

/**
 * Every photo of the `listKey` slot gets the exact framing of the `anchorKey` photo: brought
 * to its pixel size (cover-cropped if proportions differ), so dissolves between them line up.
 */
export const alignSetTo =
  (anchorKey: string, listKey: string) =>
  async (context: PrepareAssetsContext<unknown>): Promise<PreparedMediaMap> => {
    const anchor = single(context.media[anchorKey]);
    const items = list(context.media[listKey]);
    if (!anchor || items.every((item) => item.width === anchor.width && item.height === anchor.height)) {
      return context.media;
    }
    const ratio = anchor.width / anchor.height;
    if (items.some((item) => Math.abs(item.width / item.height - ratio) / ratio > ASPECT_TOLERANCE)) {
      context.warn({
        code: 'ASPECT_MISMATCH',
        severity: 'warning',
        slots: [anchorKey, listKey],
        message: `Some ${listKey} photos have other proportions than the ${anchorKey} photo; they were cropped to match.`,
      });
    }
    const aligned = await Promise.all(
      items.map(async (item) =>
        item.width === anchor.width && item.height === anchor.height
          ? item
          : context.images.resize(item, { width: anchor.width, height: anchor.height }, { fit: 'cover' }),
      ),
    );
    return { ...context.media, [listKey]: aligned };
  };
