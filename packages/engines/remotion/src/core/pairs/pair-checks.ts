// Shared by before/after templates (moved from templates/before-after; behaviour unchanged).
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
