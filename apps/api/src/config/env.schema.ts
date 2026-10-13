import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  DB_MIGRATE_ON_START: z.stringbool().default(true),
  DB_LOGGING: z.stringbool().default(false),
  MEDIA_ROOT: z.string().min(1).default('/data/media'),
  /** Max size of one uploaded file. */
  MAX_UPLOAD_MB: z.coerce.number().positive().default(80),
  /** Render attempts per job (1 = no retry). */
  RENDER_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(2),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),
  /** Comma-separated origins allowed to call the API from browsers; empty = same-origin only. */
  CORS_ORIGINS: z.string().default(''),
  /** Comma-separated installed engines to hide (e.g. `fake` in production). */
  DISABLED_ENGINES: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
});

export type Env = z.infer<typeof EnvSchema>;
