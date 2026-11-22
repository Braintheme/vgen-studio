// Calendar days of the renders table (the browser's time zone). Pure; no Vue.

/** The browser's IANA time zone, e.g. `Europe/Kyiv`. */
export const localTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const keyFormats = new Map<string, Intl.DateTimeFormat>();

/** `YYYY-MM-DD` of an instant in a time zone (the same buckets as the API's day counts). */
export const dayKey = (iso: string | Date, timeZone: string): string => {
  let format = keyFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    keyFormats.set(timeZone, format);
  }
  return format.format(typeof iso === 'string' ? new Date(iso) : iso);
};

const parseKey = (key: string): Date => {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const shiftKey = (key: string, days: number): string => {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
  parts.find((item) => item.type === type)?.value ?? '';

const labelFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export interface DayLabel {
  /** "Today" / "Yesterday", or null for older days. */
  readonly relative: string | null;
  /** "Sat, 22 Nov" (with the year when it is not the current one). */
  readonly date: string;
}

/** How a day header reads, relative to today's key. */
export const dayLabel = (key: string, todayKey: string): DayLabel => {
  const parts = labelFormat.formatToParts(parseKey(key));
  const year = part(parts, 'year');
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  const date = `${part(parts, 'weekday')}, ${part(parts, 'day')} ${part(parts, 'month')}${sameYear ? '' : ` ${year}`}`;
  const relative = key === todayKey ? 'Today' : key === shiftKey(todayKey, -1) ? 'Yesterday' : null;
  return { relative, date };
};

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** "14:05" of an ISO timestamp (local time). */
export const formatTime = (iso: string): string => timeFormat.format(new Date(iso));
