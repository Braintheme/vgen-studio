import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatRelativeTime } from './format';

describe('format', () => {
  it('formats sizes and durations', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(9_880_755)).toBe('9.4 MB');
    expect(formatDuration(13.013)).toBe('13.0 s');
    expect(formatDuration(95)).toBe('1:35 min');
  });

  it('formats relative times', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    expect(formatRelativeTime('2026-10-13T11:59:30Z', now)).toMatch(/30 seconds ago/);
    expect(formatRelativeTime('2026-10-13T09:00:00Z', now)).toMatch(/3 hours ago/);
  });
});
