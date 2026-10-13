// Remotion render worker: builds its engine adapter; all worker logic lives in @vgen/worker-core.
import { createRemotionEngine } from '@vgen/engine-remotion/server';
import { createLogger, loadWorkerConfig, runWorker } from '@vgen/worker-core';

const concurrency = process.env['REMOTION_CONCURRENCY'];
const log = createLogger({ service: 'worker-remotion', component: 'remotion' }, loadWorkerConfig().LOG_LEVEL);

await runWorker({
  engine: createRemotionEngine({
    concurrency: concurrency ? Number(concurrency) : null,
    bundleDir: process.env['REMOTION_BUNDLE_DIR'] ?? null,
    // Development: rebuild the bundle when compositions change (docker-compose.yml sets it).
    watchSources: process.env['REMOTION_WATCH_SOURCES'] === 'true',
    log,
  }),
});
