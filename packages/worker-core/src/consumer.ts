import {
  PreviewJobPayloadSchema,
  RENDER_CANCEL_CHANNEL,
  RENDER_JOB_NAMES,
  RenderCancelMessageSchema,
  RenderJobPayloadSchema,
  renderQueueName,
} from '@vgen/shared';
import { UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { describeError, JobCancelledError, PermanentJobError } from './errors.js';
import type { Logger } from './logger.js';
import type { RenderJobStore } from './ports.js';
import type { RenderPipeline } from './pipeline.js';

export type FailureOutcome = 'cancelled' | 'failed' | 'retry';

/** What to do with a failed attempt: never retry cancels or permanent errors. */
export const classifyFailure = (
  error: unknown,
  aborted: boolean,
  isFinalAttempt: boolean,
): FailureOutcome => {
  if (error instanceof JobCancelledError || aborted) return 'cancelled';
  if (error instanceof PermanentJobError || isFinalAttempt) return 'failed';
  return 'retry';
};

export interface ConsumerOptions {
  readonly engineId: string;
  readonly pipeline: RenderPipeline;
  readonly jobs: RenderJobStore;
  readonly connection: Redis;
  readonly subscriber: Redis;
  readonly concurrency: number;
  readonly logger: Logger;
}

/**
 * BullMQ consumer of `render-<engine>`. Decides between retry and failure, maps
 * cancel requests (Redis pub/sub) to BullMQ's per-job AbortSignal, and never lets a
 * failed render take the process down.
 */
export const createRenderConsumer = (options: ConsumerOptions): Worker => {
  const { pipeline, jobs, logger } = options;

  const worker = new Worker(
    renderQueueName(options.engineId),
    async (job, _token, signal) => {
      const abort = signal ?? new AbortController().signal;
      if (job.name === RENDER_JOB_NAMES.preview) {
        // Previews are not tracked in the database: a failure goes back to the waiting API call.
        try {
          await pipeline.preview(PreviewJobPayloadSchema.parse(job.data), abort);
        } catch (error) {
          logger.warn('preview failed', { error });
          throw new UnrecoverableError(describeError(error));
        }
        return;
      }
      const { renderJobId } = RenderJobPayloadSchema.parse(job.data);
      const attempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;
      try {
        await pipeline.run(renderJobId, abort);
      } catch (error) {
        const outcome = classifyFailure(error, abort.aborted, isFinalAttempt);
        if (outcome === 'cancelled') {
          logger.info('render cancelled', { jobId: renderJobId });
          throw new UnrecoverableError('cancelled');
        }
        const message = describeError(error);
        logger.error('render failed', { jobId: renderJobId, attempt: job.attemptsMade + 1, attempts, error });
        if (outcome === 'failed') {
          if (await jobs.markFailed(renderJobId, message)) {
            await pipeline.publishStatus(renderJobId, 'failed', 0, message);
          }
          throw new UnrecoverableError(message);
        }
        if (await jobs.markRetrying(renderJobId, message)) {
          await pipeline.publishStatus(renderJobId, 'queued', 0, message);
        }
        throw error;
      }
    },
    {
      connection: options.connection,
      concurrency: options.concurrency,
      autorun: false,
      // Renders are long; the lock is renewed automatically while the job runs.
      lockDuration: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on('error', (error) => {
    logger.error('queue worker error', { error });
  });

  void options.subscriber.subscribe(RENDER_CANCEL_CHANNEL);
  options.subscriber.on('message', (channel, raw) => {
    if (channel !== RENDER_CANCEL_CHANNEL) return;
    try {
      const { jobId } = RenderCancelMessageSchema.parse(JSON.parse(raw));
      // BullMQ job ids equal render job ids; only the worker running it reacts.
      if (worker.cancelJob(jobId, 'cancelled by user')) {
        logger.info('cancel requested for active render', { jobId });
      }
    } catch (error) {
      logger.warn('ignoring malformed cancel message', { error });
    }
  });

  return worker;
};
