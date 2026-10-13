// Fake render worker (dev stub): builds its engine adapter; all worker logic lives in @vgen/worker-core.
import { createFakeEngine } from '@vgen/engine-fake/server';
import { runWorker } from '@vgen/worker-core';

await runWorker({ engine: createFakeEngine() });
