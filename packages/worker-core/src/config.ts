import { z } from 'zod';

export const WorkerEnvSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  MEDIA_ROOT: z.string().min(1).default('/data/media'),
  WORKER_TMP_DIR: z.string().min(1).default('/tmp/vgen'),
  /** Jobs processed in parallel by one worker process (renders are CPU-bound). */
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(1),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3100),
  /** Throttle for progress writes to the DB and pub/sub. */
  PROGRESS_THROTTLE_MS: z.coerce.number().int().min(50).default(500),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type WorkerConfig = z.infer<typeof WorkerEnvSchema>;

export const loadWorkerConfig = (env: NodeJS.ProcessEnv = process.env): WorkerConfig => {
  const parsed = WorkerEnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid worker configuration: ${details}`);
  }
  return parsed.data;
};
