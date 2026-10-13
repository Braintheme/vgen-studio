// Pure presentation formatters (no Vue): safe to use from any layer.

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')} min`;
};

/** Playback position: `1:05.3`. */
export const formatTimecode = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, '0')}`;
};

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (iso: string): string => dateTimeFormat.format(new Date(iso));

const RELATIVE_STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "2 minutes ago" style text for an ISO timestamp. */
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  let delta = (new Date(iso).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return relativeFormat.format(Math.round(delta), unit);
    delta /= size;
  }
  return relativeFormat.format(Math.round(delta), 'year');
};
