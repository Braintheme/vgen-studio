import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RENDER_EVENTS_CHANNEL, RenderEventSchema, type RenderEvent } from '@vgen/shared';
import { Redis } from 'ioredis';
import { filter, Subject, takeUntil, type Observable } from 'rxjs';
import { TypedConfigService } from '../config/typed-config.service.js';

/**
 * One Redis subscription per API instance, fanned out to all SSE clients. Events come
 * from workers and from any API instance, so this works with horizontal scaling.
 */
@Injectable()
export class RenderEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RenderEventsService.name);
  private readonly events = new Subject<RenderEvent>();
  private readonly shutdown = new Subject<void>();
  private subscriber: Redis | null = null;

  constructor(private readonly config: TypedConfigService) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis(this.config.get('REDIS_URL'));
    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const parsed = RenderEventSchema.safeParse(JSON.parse(raw));
        if (parsed.success) this.events.next(parsed.data);
      } catch {
        this.logger.warn('ignoring malformed render event');
      }
    });
    await this.subscriber.subscribe(RENDER_EVENTS_CHANNEL);
  }

  stream(jobId?: string): Observable<RenderEvent> {
    return jobId ? this.events.pipe(filter((event) => event.jobId === jobId)) : this.events.asObservable();
  }

  /**
   * Ends `source` when the application shuts down. SSE responses (with their endless
   * heartbeat) would otherwise keep the HTTP server, and so the process, from closing.
   */
  untilShutdown<T>(source: Observable<T>): Observable<T> {
    return source.pipe(takeUntil(this.shutdown));
  }

  onModuleDestroy(): void {
    this.shutdown.next();
    this.shutdown.complete();
    this.events.complete();
    this.subscriber?.disconnect();
  }
}
