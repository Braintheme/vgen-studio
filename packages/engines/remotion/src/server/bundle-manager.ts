import { rm } from 'node:fs/promises';
import { watchTree } from './watch-tree.js';

/** Structural subset of the worker logger (engines do not depend on worker-core). */
export interface EngineLog {
  info(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export interface BundleManagerOptions {
  /** Builds a bundle and returns its directory (Remotion's serve URL). */
  readonly build: () => Promise<string>;
  /** Directories whose changes trigger a rebuild (development only). */
  readonly watchDirs?: readonly string[];
  readonly debounceMs?: number;
  readonly log?: EngineLog;
}

export interface BundleManager {
  readonly start: () => Promise<void>;
  /**
   * Runs `task` with the current bundle. While a rebuild is in progress new tasks wait for
   * it; a rebuild never starts while tasks run (a render is never interrupted).
   */
  readonly use: <T>(task: (serveUrl: string) => Promise<T>) => Promise<T>;
  /** Marks sources as changed: a debounced rebuild follows once the worker is idle. */
  readonly invalidate: () => void;
  readonly stop: () => void;
}

const DEFAULT_DEBOUNCE_MS = 800;
/** Source files that end up in the bundle. */
const BUNDLED_FILE = /\.(tsx?|css|woff2?|wav)$/;

/**
 * Owns the Remotion bundle of a worker. With `watchDirs` (development) it rebuilds after
 * source changes: debounced, only while idle, swapping bundles atomically; a failed build
 * keeps the previous bundle.
 */
export const createBundleManager = (options: BundleManagerOptions): BundleManager => {
  let serveUrl: string | null = null;
  let rebuilding: Promise<void> | null = null;
  let active = 0;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watcher: { readonly close: () => void } | null = null;

  const rebuild = (): void => {
    if (rebuilding || active > 0 || !dirty) return;
    dirty = false;
    const startedAt = performance.now();
    options.log?.info('sources changed, rebuilding the Remotion bundle');
    rebuilding = options
      .build()
      .then(async (next) => {
        const previous = serveUrl;
        serveUrl = next;
        options.log?.info('Remotion bundle rebuilt', { ms: Math.round(performance.now() - startedAt) });
        // Nothing can use the old bundle any more: tasks wait for this rebuild.
        if (previous && previous !== next) await rm(previous, { recursive: true, force: true });
      })
      .catch((error: unknown) => {
        options.log?.error('Remotion bundle rebuild failed; keeping the previous bundle', { error });
      })
      .finally(() => {
        rebuilding = null;
        // Changes that arrived during the build.
        rebuild();
      });
  };

  const invalidate = (): void => {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(rebuild, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  };

  return {
    start: async () => {
      serveUrl = await options.build();
      const dirs = options.watchDirs ?? [];
      if (dirs.length > 0) {
        watcher = await watchTree(dirs, (file) => {
          if (BUNDLED_FILE.test(file) && !file.includes('.test.')) invalidate();
        });
        options.log?.info('watching sources for bundle rebuilds', { dirs });
      }
    },
    use: async (task) => {
      while (rebuilding) await rebuilding;
      const url = serveUrl;
      if (!url) throw new Error('Remotion engine is not initialized');
      active += 1;
      try {
        return await task(url);
      } finally {
        active -= 1;
        // A change seen during the render is built once the worker is idle.
        if (active === 0) rebuild();
      }
    },
    invalidate,
    stop: () => {
      clearTimeout(timer);
      watcher?.close();
    },
  };
};
