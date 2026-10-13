import { describe, expect, it } from 'vitest';
import { classifyFailure } from './consumer.js';
import { describeError, JobCancelledError, PermanentJobError } from './errors.js';
import { encodingFor, QUALITY_PRESETS } from './quality.js';

describe('classifyFailure', () => {
  it('never retries cancellations', () => {
    expect(classifyFailure(new JobCancelledError('x'), false, false)).toBe('cancelled');
    expect(classifyFailure(new Error('chromium closed'), true, false)).toBe('cancelled');
  });

  it('fails permanent errors immediately and transient ones on the last attempt', () => {
    expect(classifyFailure(new PermanentJobError('missing media'), false, false)).toBe('failed');
    expect(classifyFailure(new Error('timeout'), false, false)).toBe('retry');
    expect(classifyFailure(new Error('timeout'), false, true)).toBe('failed');
  });
});

describe('describeError', () => {
  it('keeps the first meaningful line and bounds the length', () => {
    expect(describeError(new Error('\nffmpeg failed\nstack...'))).toBe('ffmpeg failed');
    expect(describeError('x'.repeat(600)).length).toBe(500);
  });
});

describe('quality presets', () => {
  it('social is capped, high is not; unknown presets fall back to social', () => {
    expect(QUALITY_PRESETS.social).toMatchObject({ crf: 18, maxBitrate: '20M', audioSampleRate: 48000 });
    expect(QUALITY_PRESETS.high.maxBitrate).toBeNull();
    expect(QUALITY_PRESETS.high.crf).toBeLessThan(QUALITY_PRESETS.social.crf);
    expect(encodingFor('nope')).toBe(QUALITY_PRESETS.social);
  });
});
