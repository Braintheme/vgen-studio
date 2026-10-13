import { JobCancelledError } from './errors.js';

export const throwIfCancelled = (signal: AbortSignal, jobId: string): void => {
  if (signal.aborted) {
    throw new JobCancelledError(jobId);
  }
};
