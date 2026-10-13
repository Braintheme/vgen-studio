// Server-side Remotion adapter of the RenderEngine contract. Only workers import this.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import {
  makeCancelSignal,
  renderMedia,
  renderStill,
  selectComposition,
  type CancelSignal,
} from '@remotion/renderer';
import type { EngineRenderInput, RenderEngine } from '@vgen/shared';
import { remotionEngineManifest } from '../manifest/index.js';
import { webpackOverride } from '../remotion/webpack-override.js';
import { ensureRemotionBrowser } from './browser.js';
import { createBundleManager, type EngineLog } from './bundle-manager.js';

export interface RemotionEngineOptions {
  /** Chromium tabs rendering frames in parallel; `null` lets Remotion decide (half the cores). */
  readonly concurrency: number | null;
  /** Prebuilt bundle (production images); bundled from sources at startup otherwise. */
  readonly bundleDir: string | null;
  /** Development: rebuild the bundle when composition sources change (never mid-render). */
  readonly watchSources?: boolean;
  readonly log?: EngineLog;
}

/** Sources that end up in the bundle: this engine and the shared contracts it imports. */
const sourceDirs = (): string[] => [
  fileURLToPath(new URL('..', import.meta.url)),
  path.dirname(fileURLToPath(import.meta.resolve('@vgen/shared'))),
];

const ENTRY_POINT = fileURLToPath(new URL('../remotion/index.ts', import.meta.url));

const linkSignal = (signal: AbortSignal): CancelSignal => {
  const { cancelSignal, cancel } = makeCancelSignal();
  if (signal.aborted) {
    cancel();
  } else {
    signal.addEventListener(
      'abort',
      () => {
        cancel();
      },
      { once: true },
    );
  }
  return cancelSignal;
};

const inputPropsOf = (input: EngineRenderInput) => ({ props: input.props, assets: input.assets });

export const createRemotionEngine = (options: RemotionEngineOptions): RenderEngine => {
  let browserExecutable: string | null = null;
  const prebuilt =
    options.bundleDir && existsSync(path.join(options.bundleDir, 'index.html')) ? options.bundleDir : null;
  const bundles = createBundleManager({
    build: () =>
      prebuilt ? Promise.resolve(prebuilt) : bundle({ entryPoint: ENTRY_POINT, webpackOverride }),
    watchDirs: !prebuilt && options.watchSources ? sourceDirs() : [],
    ...(options.log ? { log: options.log } : {}),
  });

  return {
    ...remotionEngineManifest,

    async init() {
      browserExecutable = await ensureRemotionBrowser();
      await bundles.start();
      options.log?.info('Remotion ready', {
        browser: browserExecutable,
        bundle: prebuilt ?? 'built from sources',
      });
    },

    render: (input, { outputPath, onProgress, signal }) =>
      bundles.use(async (url) => {
        const inputProps = inputPropsOf(input);
        const composition = await selectComposition({
          serveUrl: url,
          id: input.template.id,
          inputProps,
          browserExecutable,
        });
        const { encoding } = input;
        await renderMedia({
          serveUrl: url,
          composition,
          inputProps,
          outputLocation: outputPath,
          codec: 'h264',
          pixelFormat: 'yuv420p',
          crf: encoding.crf,
          x264Preset: encoding.x264Preset,
          encodingMaxRate: encoding.maxBitrate,
          encodingBufferSize: encoding.bufferSize,
          audioCodec: 'aac',
          audioBitrate: encoding.audioBitrate,
          sampleRate: encoding.audioSampleRate,
          // Silent AAC track when there is no music: uniform output for every platform/editor.
          enforceAudioTrack: true,
          concurrency: options.concurrency,
          browserExecutable,
          cancelSignal: linkSignal(signal),
          onProgress: ({ progress }) => {
            onProgress(progress);
          },
        });
      }),

    renderStill: (input, { outputPath, frame, signal }) =>
      bundles.use(async (url) => {
        const inputProps = inputPropsOf(input);
        const composition = await selectComposition({
          serveUrl: url,
          id: input.template.id,
          inputProps,
          browserExecutable,
        });
        await renderStill({
          serveUrl: url,
          composition,
          inputProps,
          frame,
          output: outputPath,
          imageFormat: 'jpeg',
          jpegQuality: 90,
          browserExecutable,
          cancelSignal: linkSignal(signal),
        });
      }),

    dispose() {
      bundles.stop();
      return Promise.resolve();
    },
  };
};

export { ensureRemotionBrowser } from './browser.js';
