import { QueryClient } from '@tanstack/vue-query';
import { ApiRequestError } from '@/api/errors';

const MAX_RETRIES = 2;
const DEFAULT_STALE_TIME_MS = 10_000;

/** Client errors (4xx) will not succeed on retry; network and 5xx errors might. */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiRequestError && error.status !== null && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: DEFAULT_STALE_TIME_MS, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
