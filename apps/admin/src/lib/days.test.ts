import { describe, expect, it } from 'vitest';
import { dayKey, dayLabel } from './days';

describe('dayKey', () => {
  it('buckets an instant by the calendar day of the time zone', () => {
    // 23:30 UTC on the 21st is already the 22nd in Kyiv (UTC+2).
    expect(dayKey('2026-11-21T23:30:00Z', 'Europe/Kyiv')).toBe('2026-11-22');
    expect(dayKey('2026-11-21T23:30:00Z', 'UTC')).toBe('2026-11-21');
  });
});

describe('dayLabel', () => {
  it('names today and yesterday, and dates older days', () => {
    expect(dayLabel('2026-11-22', '2026-11-22')).toEqual({ relative: 'Today', date: 'Sun, 22 Nov' });
    expect(dayLabel('2026-11-21', '2026-11-22')).toEqual({ relative: 'Yesterday', date: 'Sat, 21 Nov' });
    expect(dayLabel('2026-11-18', '2026-11-22')).toEqual({ relative: null, date: 'Wed, 18 Nov' });
  });

  it('crosses month and year boundaries, adding the year for past years', () => {
    expect(dayLabel('2025-12-31', '2026-01-01')).toEqual({ relative: 'Yesterday', date: 'Wed, 31 Dec 2025' });
  });
});
