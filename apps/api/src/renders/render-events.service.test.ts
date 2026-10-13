import { interval } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { TypedConfigService } from '../config/typed-config.service.js';
import { RenderEventsService } from './render-events.service.js';

describe('RenderEventsService', () => {
  it('completes open streams (SSE with heartbeats) on shutdown, so the server can close', () => {
    const service = new RenderEventsService({} as TypedConfigService);
    let completed = false;
    const subscription = service.untilShutdown(interval(1000)).subscribe({
      complete: () => {
        completed = true;
      },
    });
    service.onModuleDestroy();
    expect(completed).toBe(true);
    expect(subscription.closed).toBe(true);
  });
});
