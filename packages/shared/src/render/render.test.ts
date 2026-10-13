import { describe, expect, it } from 'vitest';
import { RenderEventSchema } from './events.js';
import { buildOutputFileName } from './output-name.js';
import { renderQueueName } from './queue.js';
import { isFinalRenderStatus } from './status.js';

describe('render helpers', () => {
  it('builds social-friendly output names', () => {
    const date = new Date('2026-10-12T22:15:00Z');
    expect(
      buildOutputFileName({ templateId: 'before-after', presetName: 'Moody Film #2', format: '9:16', date }),
    ).toBe('before-after_moody-film-2_9x16_2026-10-12.mp4');
    expect(buildOutputFileName({ templateId: 'before-after', presetName: null, format: '4:5', date })).toBe(
      'before-after_custom_4x5_2026-10-12.mp4',
    );
    expect(buildOutputFileName({ templateId: 'x', presetName: '***', format: '1:1', date })).toBe(
      'x_custom_1x1_2026-10-12.mp4',
    );
  });

  it('names queues per engine without colons', () => {
    expect(renderQueueName('remotion')).toBe('render-remotion');
  });

  it('validates render events', () => {
    const event = {
      type: 'progress',
      jobId: '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1',
      progress: 42,
      at: new Date().toISOString(),
    };
    expect(RenderEventSchema.parse(event)).toEqual(event);
    expect(RenderEventSchema.safeParse({ ...event, progress: 101 }).success).toBe(false);
  });

  it('knows final statuses', () => {
    expect(isFinalRenderStatus('done')).toBe(true);
    expect(isFinalRenderStatus('rendering')).toBe(false);
  });
});
