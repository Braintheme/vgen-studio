import type { ApiErrorCode, ApiErrorDetail } from '@vgen/shared';

/** Domain error with a stable code; the global filter turns it into the API error envelope. */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly details?: readonly ApiErrorDetail[],
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', 404, `${resource} "${id}" not found`);
  }
}

export class ValidationFailedError extends AppError {
  constructor(message: string, details?: readonly ApiErrorDetail[]) {
    super('VALIDATION_FAILED', 400, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: readonly ApiErrorDetail[]) {
    super('CONFLICT', 409, message, details);
  }
}

export class UnsupportedMediaError extends AppError {
  constructor(message: string) {
    super('UNSUPPORTED_MEDIA_TYPE', 415, message);
  }
}

export class RenderFailedError extends AppError {
  constructor(message: string) {
    super('RENDER_FAILED', 422, message);
  }
}

export class WorkerUnavailableError extends AppError {
  constructor(message: string) {
    super('WORKER_UNAVAILABLE', 503, message);
  }
}

/** Standard Schema / zod issue -> API error detail with a dot path. */
export const issueToDetail = (
  issue: {
    readonly message: string;
    readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
  },
  prefix?: string,
): ApiErrorDetail => {
  const segments = (issue.path ?? []).map((segment) =>
    String(typeof segment === 'object' ? segment.key : segment),
  );
  return { path: [prefix, ...segments].filter(Boolean).join('.'), message: issue.message };
};
