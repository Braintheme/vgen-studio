// Pure rules of a video fragment selection (no Vue): limits, rounding, which handle moved.

export interface VideoRangeValue {
  readonly startSec: number;
  readonly endSec: number;
}

export interface VideoRangeLimits {
  /** Length of the whole video. */
  readonly durationSec: number;
  /** Shortest and longest allowed fragment. */
  readonly minSec: number;
  readonly maxSec: number;
}

/** Fragment times are stored with 0.1 s precision. */
const round = (seconds: number): number => Math.round(seconds * 10) / 10;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Brings a fragment within the video and the length limits. When only one handle moved
 * (compared with `previous`), that handle wins and the other one follows; otherwise the
 * start is kept. A video shorter than `minSec` is used whole.
 */
export const clampVideoRange = (
  next: VideoRangeValue,
  limits: VideoRangeLimits,
  previous?: VideoRangeValue,
): VideoRangeValue => {
  const duration = round(Math.max(0, limits.durationSec));
  const minSec = Math.min(limits.minSec, duration);
  const maxSec = Math.min(limits.maxSec, duration);
  const endMoved =
    previous !== undefined && previous.startSec === next.startSec && previous.endSec !== next.endSec;
  if (endMoved) {
    const endSec = clamp(round(next.endSec), minSec, duration);
    const startSec = clamp(round(next.startSec), Math.max(0, endSec - maxSec), endSec - minSec);
    return { startSec: round(startSec), endSec };
  }
  const startSec = clamp(round(next.startSec), 0, duration - minSec);
  const endSec = clamp(round(next.endSec), startSec + minSec, Math.min(duration, startSec + maxSec));
  return { startSec: round(startSec), endSec: round(endSec) };
};

/** The fragment a freshly chosen video starts with: from 0, the preferred length if it fits. */
export const initialVideoRange = (limits: VideoRangeLimits, preferredSec: number): VideoRangeValue =>
  clampVideoRange({ startSec: 0, endSec: preferredSec }, limits);

export const isSameRange = (a: VideoRangeValue, b: VideoRangeValue): boolean =>
  a.startSec === b.startSec && a.endSec === b.endSec;
