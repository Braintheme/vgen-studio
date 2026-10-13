import 'reflect-metadata';
import { mkdir } from 'node:fs/promises';
import { createDataSourceOptions } from '@vgen/db';
import type { RenderEngine } from '@vgen/shared';
import { LocalStorageService } from '@vgen/storage';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AssetServer } from './assets/asset-server.js';
import { loadWorkerConfig } from './config.js';
import { createRenderConsumer } from './consumer.js';
import { startHealthServer } from './health.js';
import { RedisRenderEventPublisher } from './infra/redis-events.js';
import {
  TypeOrmMediaAssetStore,
  TypeOrmMusicLibrary,
  TypeOrmRenderJobStore,
} from './infra/typeorm-stores.js';
import { createLogger } from './logger.js';
import { RenderPipeline } from './pipeline.js';

export interface RunWorkerOptions {
  readonly engine: RenderEngine;
}

/** Grace period for an in-flight render on shutdown before it is abandoned (it will be retried). */
const SHUTDOWN_GRACE_MS = 25_000;

/**
 * Composition root of a render worker. An engine-specific worker app only builds its
 * engine adapter and calls this; everything else is shared.
 */
export const runWorker = async ({ engine }: RunWorkerOptions): Promise<void> => {
  const config = loadWorkerConfig();
  const logger = createLogger({ service: `worker-${engine.id}`, engine: engine.id }, config.LOG_LEVEL);

  const dataSource = new DataSource(createDataSourceOptions({ url: config.DATABASE_URL }));
  await dataSource.initialize();
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const subscriber = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

  await mkdir(config.WORKER_TMP_DIR, { recursive: true });
  const assetServer = new AssetServer(config.WORKER_TMP_DIR);
  await assetServer.start();

  logger.info('initializing engine', { version: engine.version });
  const initStartedAt = Date.now();
  await engine.init();
  logger.info('engine ready', { ms: Date.now() - initStartedAt });

  const jobs = new TypeOrmRenderJobStore(dataSource);
  const pipeline = new RenderPipeline({
    engine,
    jobs,
    media: new TypeOrmMediaAssetStore(dataSource),
    music: new TypeOrmMusicLibrary(dataSource),
    storage: new LocalStorageService(config.MEDIA_ROOT),
    publisher: new RedisRenderEventPublisher(connection),
    assetServer,
    workRoot: config.WORKER_TMP_DIR,
    progressThrottleMs: config.PROGRESS_THROTTLE_MS,
    logger,
  });
  const consumer = createRenderConsumer({
    engineId: engine.id,
    pipeline,
    jobs,
    connection,
    subscriber,
    concurrency: config.WORKER_CONCURRENCY,
    logger,
  });

  const health = startHealthServer(
    config.WORKER_HEALTH_PORT,
    { engine: engine.id, version: engine.version },
    {
      db: async () => (await dataSource.query('SELECT 1'), true),
      redis: async () => (await connection.ping(), true),
      queue: () => Promise.resolve(consumer.isRunning()),
    },
  );

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    logger.info('shutting down', { signal });
    health.close();
    await Promise.race([consumer.close(), new Promise((resolve) => setTimeout(resolve, SHUTDOWN_GRACE_MS))]);
    await engine.dispose().catch(() => undefined);
    await assetServer.stop();
    subscriber.disconnect();
    connection.disconnect();
    await dataSource.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', { error: reason });
  });

  logger.info('worker started', { queue: `render-${engine.id}`, concurrency: config.WORKER_CONCURRENCY });
  await consumer.run();
};
