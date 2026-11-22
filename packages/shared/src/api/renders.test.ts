import { describe, expect, it } from 'vitest';
import { RenderDaysQuerySchema, RenderListQuerySchema, RenderReadyQuerySchema } from './renders.js';

describe('render scope queries', () => {
  it('keeps the old list query and adds the downloaded filter', () => {
    expect(RenderListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(RenderListQuerySchema.parse({ downloaded: 'no' }).downloaded).toBe('no');
    expect(RenderListQuerySchema.safeParse({ downloaded: 'maybe' }).success).toBe(false);
  });

  it('takes IANA time zones only', () => {
    expect(RenderDaysQuerySchema.parse({ tz: 'Europe/Kyiv' }).tz).toBe('Europe/Kyiv');
    expect(RenderDaysQuerySchema.safeParse({ tz: 'Mars/Olympus' }).success).toBe(false);
    expect(RenderDaysQuerySchema.safeParse({ tz: "UTC'; drop table" }).success).toBe(false);
  });

  it('takes a calendar day as YYYY-MM-DD', () => {
    expect(RenderReadyQuerySchema.parse({ tz: 'UTC', day: '2026-11-22' }).day).toBe('2026-11-22');
    expect(RenderReadyQuerySchema.safeParse({ tz: 'UTC', day: '22.11.2026' }).success).toBe(false);
  });
});
