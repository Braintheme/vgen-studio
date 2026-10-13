import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiRequestError, toApiRequestError } from './errors';

const responseError = (status: number, data: unknown): AxiosError =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('toApiRequestError', () => {
  it('unwraps the API error envelope with details', () => {
    const error = toApiRequestError(
      responseError(400, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Bad props',
          details: [{ path: 'props.fps', message: 'Invalid' }],
        },
      }),
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ code: 'VALIDATION_FAILED', status: 400, message: 'Bad props' });
    expect(error.details).toEqual([{ path: 'props.fps', message: 'Invalid' }]);
  });

  it('classifies network failures, cancellations and foreign responses', () => {
    expect(toApiRequestError(new AxiosError('Network Error', 'ERR_NETWORK')).code).toBe('NETWORK');
    expect(toApiRequestError(new CanceledError()).isCancelled).toBe(true);
    expect(toApiRequestError(responseError(502, '<html>Bad gateway</html>'))).toMatchObject({
      code: 'UNKNOWN',
      status: 502,
    });
  });
});
