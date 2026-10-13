import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  RENDER_CANCEL_CHANNEL,
  RENDER_EVENTS_CHANNEL,
  RENDER_JOB_NAMES,
  RENDER_JOB_PRIORITY,
  renderQueueName,
  type PreviewJobPayload,
  type RenderEvent,
} from '@vgen/shared';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { TypedConfigService } from '../config/typed-config.service.js';
import { REDIS } from '../redis/redis.module.js';

/** No worker finished a request/response job in time. */
export class PreviewTimeoutError extends Error {
  constructor() {
    super('preview timed out');
  }
}

/**
 * Producer side of the render queues (one queue per engine) plus the Redis signals
 * the API sends to workers and other API instances.
 */
@Injectable()
export class RenderQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RenderQueueService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly events = new Map<string, QueueEvents>();

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: TypedConfigService,
  ) {}

  private queue(engineId: string): Queue {
    let queue = this.queues.get(engineId);
    if (!queue) {
      queue = new Queue(renderQueueName(engineId), { connection: this.redis });
      this.queues.set(engineId, queue);
    }
    return queue;
  }

  /** Completion events of a queue (own blocking connection), for request/response jobs. */
  private async queueEvents(engineId: string): Promise<QueueEvents> {
    let events = this.events.get(engineId);
    if (!events) {
      events = new QueueEvents(renderQueueName(engineId), { connection: this.redis.duplicate() });
      this.events.set(engineId, events);
    }
    await events.waitUntilReady();
    return events;
  }

  async enqueue(engineId: string, renderJobId: string): Promise<void> {
    await this.queue(engineId).add(
      RENDER_JOB_NAMES.render,
      { renderJobId },
      {
        // Queue job id = render job id: lets cancels and workers address the same job.
        jobId: renderJobId,
        priority: RENDER_JOB_PRIORITY.render,
        attempts: this.config.get('RENDER_ATTEMPTS'),
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    );
  }

  /**
   * Asks the engine's worker for one preview frame and waits for it. Identical requests
   * share a job (`id`). Rejects with `PreviewTimeoutError` when no worker finished it in time.
   */
  async renderPreview(
    engineId: string,
    id: string,
    payload: PreviewJobPayload,
    timeoutMs: number,
  ): Promise<void> {
    const events = await this.queueEvents(engineId);
    const job = await this.queue(engineId).add(RENDER_JOB_NAMES.preview, payload, {
      jobId: `preview-${id}`,
      priority: RENDER_JOB_PRIORITY.preview,
      attempts: 1,
      // Kept briefly so a concurrent identical request can still read the outcome.
      removeOnComplete: { age: 60 },
      removeOnFail: { age: 60 },
    });
    try {
      await job.waitUntilFinished(events, timeoutMs);
    } catch (error) {
      if (error instanceof Error && /timed out/i.test(error.message)) {
        await job.remove().catch(() => undefined);
        throw new PreviewTimeoutError();
      }
      throw error;
    }
  }

  /** Removes a job that has not started yet. False if it is already active (or gone). */
  async removeWaiting(engineId: string, renderJobId: string): Promise<boolean> {
    try {
      return (await this.queue(engineId).remove(renderJobId)) === 1;
    } catch (error) {
      this.logger.debug(`could not remove ${renderJobId}: ${String(error)}`);
      return false;
    }
  }

  async requestCancel(renderJobId: string): Promise<void> {
    await this.redis.publish(RENDER_CANCEL_CHANNEL, JSON.stringify({ jobId: renderJobId }));
  }

  async publishEvent(event: RenderEvent): Promise<void> {
    await this.redis.publish(RENDER_EVENTS_CHANNEL, JSON.stringify(event));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.events.values()].map((events) => events.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
