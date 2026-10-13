import type { RenderEventPublisher, RenderJobStore } from './ports.js';

/**
 * Throttles progress writes (DB + pub/sub). Values are integers 0..100 and never go
 * backwards; writes are serialized so they cannot arrive out of order.
 */
export class ProgressReporter {
  private written = -1;
  private latest = 0;
  private lastWriteAt = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly jobId: string,
    private readonly store: RenderJobStore,
    private readonly publisher: RenderEventPublisher,
    private readonly throttleMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  report(percent: number): void {
    const value = Math.max(0, Math.min(100, Math.floor(percent)));
    if (value <= this.latest && this.written >= 0) {
      return;
    }
    this.latest = Math.max(this.latest, value);
    if (this.now() - this.lastWriteAt >= this.throttleMs) {
      this.write();
    }
  }

  /** Writes the latest value if it has not been written yet; resolves when all writes are done. */
  async flush(): Promise<void> {
    if (this.latest > this.written) {
      this.write();
    }
    await this.chain;
  }

  private write(): void {
    const value = this.latest;
    this.written = value;
    this.lastWriteAt = this.now();
    this.chain = this.chain
      .then(async () => {
        await this.store.updateProgress(this.jobId, value);
        await this.publisher.publish({
          type: 'progress',
          jobId: this.jobId,
          progress: value,
          at: new Date().toISOString(),
        });
      })
      // Progress is best-effort; a failed write must never fail the render.
      .catch(() => undefined);
  }
}
