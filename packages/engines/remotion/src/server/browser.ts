import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureBrowser } from '@remotion/renderer';

/** The engine package root: nearest package.json above this module (src/ or dist/ layout). */
const findPackageRoot = (): string => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('@vgen/engine-remotion: package root not found');
    dir = parent;
  }
  return dir;
};

/**
 * Downloads Chrome Headless Shell once and returns its executable.
 *
 * Remotion caches the browser in `node_modules/.remotion` of the package that contains
 * the CURRENT working directory, so a worker app, the demo script and Studio would each
 * download their own copy (~220 MB). The download is pinned to this engine package
 * instead, and callers pass the returned path to every render call. `cwd` is switched
 * only for the duration of the check, before any render starts.
 */
export const ensureRemotionBrowser = async (): Promise<string> => {
  const previous = process.cwd();
  process.chdir(findPackageRoot());
  try {
    const status = await ensureBrowser();
    if (status.type === 'local-puppeteer-browser' || status.type === 'user-defined-path') return status.path;
    throw new Error(`Chrome Headless Shell is not available (${status.type})`);
  } finally {
    process.chdir(previous);
  }
};
