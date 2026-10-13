import { HttpException, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { RegistryError } from '@vgen/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { ConflictError, ValidationFailedError } from './errors.js';

const run = (exception: unknown, headersSent = false) => {
  const json = vi.fn();
  const response = { headersSent, status: vi.fn((_code: number) => ({ json })), end: vi.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  return {
    status: response.status.mock.calls[0]?.[0],
    body: json.mock.calls[0]?.[0] as unknown,
    response,
  };
};

describe('ApiExceptionFilter', () => {
  it('maps domain errors with details', () => {
    expect(run(new ValidationFailedError('bad', [{ path: 'props.fps', message: 'nope' }]))).toMatchObject({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'bad',
          details: [{ path: 'props.fps', message: 'nope' }],
        },
      },
    });
    expect(run(new ConflictError('already done'))).toMatchObject({
      status: 409,
      body: { error: { code: 'CONFLICT' } },
    });
  });

  it('maps Nest HTTP exceptions, registry misses and multer limits', () => {
    expect(run(new NotFoundException('Cannot GET /x'))).toMatchObject({
      status: 404,
      body: { error: { code: 'NOT_FOUND' } },
    });
    expect(run(new RegistryError('NOT_FOUND', 'Template "x" is not registered'))).toMatchObject({
      status: 404,
    });
    const multer = Object.assign(new Error('File too large'), {
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE',
    });
    expect(run(multer)).toMatchObject({ status: 413, body: { error: { code: 'PAYLOAD_TOO_LARGE' } } });
    expect(run(new HttpException('teapot', 418))).toMatchObject({
      status: 418,
      body: { error: { code: 'VALIDATION_FAILED' } },
    });
  });

  it('hides internals of unexpected errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('db password is hunter2'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('does not touch the status of responses that are already streaming', () => {
    const { status, response } = run(new Error('stream broke'), true);
    expect(status).toBeUndefined();
    expect(response.end).toHaveBeenCalled();
  });
});
