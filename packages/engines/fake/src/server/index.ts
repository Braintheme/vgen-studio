// Server-side adapter of the fake engine: renders with plain ffmpeg. Only workers import this.
import { spawn } from 'node:child_process';
import { ProcessError, run } from '@vgen/media';
import type { RenderEngine } from '@vgen/shared';
import { fakeEngineManifest } from '../manifest/index.js';
import { testCardArgs } from './ffmpeg-args.js';

/** Runs ffmpeg and turns its `-progress` output (`out_time_us=`) into 0..1 progress. */
const runWithProgress = (
  args: readonly string[],
  durationSec: number,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'], signal });
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      const match = /out_time_us=(\d+)/.exec(chunk.toString());
      if (match?.[1]) onProgress(Math.min(1, Number(match[1]) / 1e6 / durationSec));
    });
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new ProcessError('ffmpeg', code, stderr));
    });
  });

export const createFakeEngine = (): RenderEngine => ({
  ...fakeEngineManifest,

  init: () => Promise.resolve(),

  async render(input, { outputPath, onProgress, signal }) {
    const { durationInFrames, fps } = input.metadata;
    await runWithProgress(testCardArgs(input, outputPath), durationInFrames / fps, onProgress, signal);
  },

  async renderStill(input, { outputPath, frame, signal }) {
    await run('ffmpeg', testCardArgs(input, outputPath, frame / input.metadata.fps), { signal });
  },

  dispose: () => Promise.resolve(),
});
