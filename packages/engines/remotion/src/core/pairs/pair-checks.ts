// Shared by before/after templates (moved from templates/before-after; behaviour unchanged)
// and by templates showing one shot in several edits (`checkPhotoSetMedia`).
import type { MediaInfo, MediaInfoMap, MediaWarning } from '@vgen/shared';

/** Relative aspect-ratio difference treated as "same proportions". */
const ASPECT_TOLERANCE = 0.01;
/** Short side below this is likely to look soft in a 1080p video. */
const MIN_SHORT_SIDE = 1080;

const single = (value: MediaInfoMap[string] | undefined): MediaInfo | null =>
  value && !Array.isArray(value) ? (value as MediaInfo) : null;

const ratioLabel = (info: MediaInfo): string => {
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  return `${width}×${height}`;
};

export const checkBeforeAfterMedia = (media: MediaInfoMap): MediaWarning[] => {
  const warnings: MediaWarning[] = [];
  const before = single(media['before']);
  const after = single(media['after']);

  for (const [slot, info] of [
    ['before', before],
    ['after', after],
  ] as const) {
    if (info?.width && info.height && Math.min(info.width, info.height) < MIN_SHORT_SIDE) {
      warnings.push({
        code: 'LOW_RESOLUTION',
        severity: 'warning',
        slots: [slot],
        message: `The ${slot} photo is ${ratioLabel(info)}; at least ${MIN_SHORT_SIDE}px on the short side is recommended.`,
      });
    }
  }

  if (before?.width && before.height && after?.width && after.height) {
    const beforeRatio = before.width / before.height;
    const afterRatio = after.width / after.height;
    if (Math.abs(beforeRatio - afterRatio) / beforeRatio > ASPECT_TOLERANCE) {
      warnings.push({
        code: 'ASPECT_MISMATCH',
        severity: 'warning',
        slots: ['before', 'after'],
        message: `Before (${ratioLabel(before)}) and after (${ratioLabel(after)}) have different proportions. The after photo will be cropped to match; check that the framing still lines up.`,
      });
    } else if (before.width !== after.width || before.height !== after.height) {
      warnings.push({
        code: 'SIZE_MISMATCH',
        severity: 'info',
        slots: ['after'],
        message: 'The after photo will be resized to match the before photo.',
      });
    }
  }

  return warnings;
};

/**
 * One shot in several edits: a before photo (`anchorKey`) and a list of afters (`listKey`)
 * that should share its proportions (they are cropped to match, see `alignSetTo`).
 */
export const checkPhotoSetMedia =
  (anchorKey: string, listKey: string) =>
  (media: MediaInfoMap): MediaWarning[] => {
    const warnings: MediaWarning[] = [];
    const anchor = single(media[anchorKey]);
    const value = media[listKey];
    const items: readonly MediaInfo[] = Array.isArray(value) ? (value as readonly MediaInfo[]) : [];

    const low = [anchor, ...items].filter(
      (info): info is MediaInfo =>
        info !== null && !!info.width && !!info.height && Math.min(info.width, info.height) < MIN_SHORT_SIDE,
    );
    if (low.length > 0) {
      warnings.push({
        code: 'LOW_RESOLUTION',
        severity: 'warning',
        slots: [...new Set(low.map((info) => (info === anchor ? anchorKey : listKey)))],
        message: `${low.map(ratioLabel).join(', ')}: at least ${MIN_SHORT_SIDE}px on the short side is recommended.`,
      });
    }

    if (anchor?.width && anchor.height) {
      const ratio = anchor.width / anchor.height;
      const mismatched = items.filter(
        (info) =>
          info.width && info.height && Math.abs(info.width / info.height - ratio) / ratio > ASPECT_TOLERANCE,
      );
      if (mismatched.length > 0) {
        warnings.push({
          code: 'ASPECT_MISMATCH',
          severity: 'warning',
          slots: [anchorKey, listKey],
          message: `${mismatched.length} of the ${listKey} photos have other proportions than the ${anchorKey} photo (${ratioLabel(anchor)}). They will be cropped to match; check that the framing still lines up.`,
        });
      }
    }
    return warnings;
  };
