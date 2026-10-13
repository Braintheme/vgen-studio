import { describe, expect, it, vi } from 'vitest';
import type { RenderJobStore } from './ports.js';
import { ProgressReporter } from './progress.js';

const JOB = '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1';

const setup = () => {
  let clock = 0;
  const updateProgress = vi.fn(() => Promise.resolve());
  const publish = vi.fn(() => Promise.resolve());
  const reporter = new ProgressReporter(
    JOB,
    { updateProgress } as unknown as RenderJobStore,
    { publish },
    500,
    () => clock,
  );
  return { reporter, updateProgress, publish, tick: (ms: number) => (clock += ms) };
};

describe('ProgressReporter', () => {
  it('throttles writes and always flushes the latest value', async () => {
    const { reporter, updateProgress, tick } = setup();
    tick(1000);
    reporter.report(1);
    for (let value = 2; value <= 40; value += 1) {
      tick(10);
      reporter.report(value);
    }
    await reporter.flush();
    expect(updateProgress.mock.calls.map((call) => (call as unknown[])[1])).toEqual([1, 40]);
  });

  it('never goes backwards and clamps to 0..100', async () => {
    const { reporter, updateProgress, tick } = setup();
    tick(1000);
    reporter.report(50);
    tick(1000);
    reporter.report(30);
    tick(1000);
    reporter.report(250);
    await reporter.flush();
    expect(updateProgress.mock.calls.map((call) => (call as unknown[])[1])).toEqual([50, 100]);
  });

  it('publishes progress events and survives store failures', async () => {
    const { reporter, updateProgress, publish, tick } = setup();
    updateProgress.mockImplementationOnce(() => Promise.reject(new Error('db down')));
    tick(1000);
    reporter.report(10);
    tick(1000);
    reporter.report(20);
    await expect(reporter.flush()).resolves.toBeUndefined();
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'progress', jobId: JOB, progress: 20 }),
    );
  });
});
