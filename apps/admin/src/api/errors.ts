import { ApiErrorSchema, type ApiErrorCode, type ApiErrorDetail } from '@vgen/shared';
import { isAxiosError, isCancel } from 'axios';

/** Client-side failures that never reached our error envelope. */
export type ClientErrorCode = 'NETWORK' | 'CANCELLED' | 'UNKNOWN';

/** The single error type every API call rejects with. */
export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError';

  constructor(
    readonly code: ApiErrorCode | ClientErrorCode,
    message: string,
    readonly status: number | null = null,
    readonly details: readonly ApiErrorDetail[] = [],
  ) {
    super(message);
  }

  get isCancelled(): boolean {
    return this.code === 'CANCELLED';
  }
}

/** Normalizes anything thrown by axios into an ApiRequestError. */
export const toApiRequestError = (error: unknown): ApiRequestError => {
  if (error instanceof ApiRequestError) return error;
  if (isCancel(error)) return new ApiRequestError('CANCELLED', 'Request cancelled');
  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiRequestError('NETWORK', 'Cannot reach the server. Check that the API is running.');
    }
    const envelope = ApiErrorSchema.safeParse(error.response.data);
    if (envelope.success) {
      const { code, message, details } = envelope.data.error;
      return new ApiRequestError(code, message, error.response.status, details ?? []);
    }
    return new ApiRequestError(
      'UNKNOWN',
      `Unexpected response (${error.response.status})`,
      error.response.status,
    );
  }
  return new ApiRequestError('UNKNOWN', error instanceof Error ? error.message : 'Unknown error');
};
