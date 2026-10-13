import { RENDER_EVENTS_CHANNEL, type RenderEvent } from '@vgen/shared';
import type { Redis } from 'ioredis';
import type { RenderEventPublisher } from '../ports.js';

export class RedisRenderEventPublisher implements RenderEventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(event: RenderEvent): Promise<void> {
    await this.redis.publish(RENDER_EVENTS_CHANNEL, JSON.stringify(event));
  }
}
