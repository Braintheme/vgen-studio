import { watch, type FSWatcher } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Watches every directory under `roots` (non-recursive watcher per directory). Unlike
 * `fs.watch(root, { recursive: true })` on Linux, this keeps reporting files that editors
 * or tools replace by rename (atomic saves, `sed -i`). New directories are picked up.
 */
export const watchTree = async (
  roots: readonly string[],
  onChange: (file: string) => void,
): Promise<{ readonly close: () => void }> => {
  const watchers = new Map<string, FSWatcher>();

  const scan = async (dir: string): Promise<void> => {
    if (!watchers.has(dir)) {
      const watcher = watch(dir, (event, file) => {
        if (!file) return;
        onChange(path.join(dir, file));
        // A rename may be a new directory.
        if (event === 'rename') void scan(dir).catch(() => undefined);
      });
      watcher.on('error', () => {
        watcher.close();
        watchers.delete(dir);
      });
      watchers.set(dir, watcher);
    }
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter(
          (entry) => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.'),
        )
        .map((entry) => scan(path.join(dir, entry.name))),
    );
  };

  await Promise.all(roots.map(scan));
  return {
    close: () => {
      for (const watcher of watchers.values()) watcher.close();
      watchers.clear();
    },
  };
};
