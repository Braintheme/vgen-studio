/** Thrown when a job was cancelled; never retried. */
export class JobCancelledError extends Error {
  override readonly name = 'JobCancelledError';
  constructor(jobId: string) {
    super(`Render ${jobId} was cancelled`);
  }
}

/** A failure that retrying cannot fix (bad props, missing media, unknown template). */
export class PermanentJobError extends Error {
  override readonly name = 'PermanentJobError';
}

/** Short, human-readable error text stored on the job (full details go to logs). */
export const describeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split('\n').find((line) => line.trim().length > 0) ?? 'Unknown error';
  return firstLine.length > 500 ? `${firstLine.slice(0, 497)}...` : firstLine;
};
