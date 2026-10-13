import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ValidationFailedError, issueToDetail } from './errors.js';

/** Global validation of `@Body/@Query/@Param({ schema })` with our error envelope. */
export const createValidationPipe = (): StandardSchemaValidationPipe =>
  new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new ValidationFailedError(
        'Request validation failed',
        issues.map((issue) => issueToDetail(issue)),
      ),
  });
