import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RegistryError, type ApiError, type ApiErrorCode, type ApiErrorDetail } from '@vgen/shared';
import type { Response } from 'express';
import { AppError } from './errors.js';

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  416: 'RANGE_NOT_SATISFIABLE',
  422: 'VALIDATION_FAILED',
};

/** Multer (used by @nestjs/platform-express) errors, recognized without importing multer. */
const isMulterError = (value: unknown): value is Error & { code: string } =>
  value instanceof Error &&
  value.name === 'MulterError' &&
  typeof (value as { code?: unknown }).code === 'string';

interface Mapped {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[] | undefined;
}

/** Every error leaves the API in the same envelope: `{ error: { code, message, details? } }`. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.map(exception);
    if (mapped.status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    if (response.headersSent) {
      // Streaming responses (files, SSE) cannot change status any more.
      response.end();
      return;
    }
    const body: ApiError = {
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details && mapped.details.length > 0 ? { details: [...mapped.details] } : {}),
      },
    };
    response.status(mapped.status).json(body);
  }

  private map(exception: unknown): Mapped {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (isMulterError(exception)) {
      const tooLarge = exception.code === 'LIMIT_FILE_SIZE' || exception.code === 'LIMIT_FILE_COUNT';
      return {
        status: tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST,
        code: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_FAILED',
        message: exception.message,
      };
    }
    if (exception instanceof RegistryError && exception.code === 'NOT_FOUND') {
      return { status: 404, code: 'NOT_FOUND', message: exception.message };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const raw = typeof response === 'object' ? (response as { message?: unknown }).message : response;
      const messages = Array.isArray(raw)
        ? raw.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        : [typeof raw === 'string' ? raw : exception.message];
      return {
        status,
        code: CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL' : 'VALIDATION_FAILED'),
        message: messages[0] ?? exception.message,
        details: messages.length > 1 ? messages.map((message) => ({ path: '', message })) : undefined,
      };
    }
    return { status: 500, code: 'INTERNAL', message: 'Internal server error' };
  }
}
