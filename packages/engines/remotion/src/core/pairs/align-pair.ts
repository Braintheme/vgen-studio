// Shared by before/after templates (moved from templates/before-after; behaviour unchanged).
import type { PreparedImage, PreparedMedia, PrepareAssetsContext, PreparedMediaMap } from '@vgen/shared';

const single = (value: PreparedMedia | undefined): PreparedImage | null =>
  value && !Array.isArray(value) ? (value as PreparedImage) : null;

/**
 * Before and after must share the exact framing: the after photo is brought to
 * the before photo's pixel size (cover-cropped if proportions differ).
 */
export const alignBeforeAfter = async (context: PrepareAssetsContext<unknown>): Promise<PreparedMediaMap> => {
  const before = single(context.media['before']);
  const after = single(context.media['after']);
  if (!before || !after || (before.width === after.width && before.height === after.height)) {
    return context.media;
  }

  const beforeRatio = before.width / before.height;
  const afterRatio = after.width / after.height;
  if (Math.abs(beforeRatio - afterRatio) / beforeRatio > 0.01) {
    context.warn({
      code: 'ASPECT_MISMATCH',
      severity: 'warning',
      slots: ['before', 'after'],
      message: 'Before and after have different proportions; the after photo was cropped to match.',
    });
  }

  const aligned = await context.images.resize(
    after,
    { width: before.width, height: before.height },
    { fit: 'cover' },
  );
  return { ...context.media, after: aligned };
};
