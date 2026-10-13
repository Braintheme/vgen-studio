// Renders demo videos (or stills) of the before/after template from the fixture pair.
// Usage: pnpm --filter @vgen/engine-remotion demo [--template=before-after] [--effects=a,b] [--formats=9:16,16:9]
//        [--frames=60,150 | --frames=40-80] [--png] [--range=40-120] [--crf=0]
//        [--duration=13] [--out=dir] [--set=params.finale=rereveal]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import sharp from 'sharp';
import { FORMAT_IDS, FormatSchema, parseTemplateProps } from '@vgen/shared';
import { REVEAL_EFFECTS } from '../src/core/reveals/registry.js';
import { webpackOverride } from '../src/remotion/webpack-override.js';
import { ensureRemotionBrowser } from '../src/server/browser.js';
import { serveDirectory } from './lib/static-server.js';
import { remotionEngineManifest } from '../src/manifest/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(here, '../../../../fixtures');
const studioDir = path.join(fixturesDir, '.studio');

const { values } = parseArgs({
  options: {
    template: { type: 'string', default: 'before-after' },
    /** Folder with before.jpg / after.jpg to use instead of the fixtures. */
    photos: { type: 'string' },
    /** Reveal effects to render (templates with a `revealEffect` param); default: all allowed. */
    effects: { type: 'string' },
    formats: { type: 'string', default: '9:16' },
    frames: { type: 'string' },
    /** Seconds; the template's default when omitted. */
    duration: { type: 'string' },
    out: { type: 'string', default: path.join(fixturesDir, 'renders') },
    set: { type: 'string', multiple: true, default: [] },
    concurrency: { type: 'string' },
    /** Lossless PNG stills instead of JPEG (pixel-level comparisons). */
    png: { type: 'boolean', default: false },
    /** Render only this frame range of the video, e.g. `40-120`. */
    range: { type: 'string' },
    crf: { type: 'string', default: '18' },
  },
});

/** `40-44` -> [40, 41, 42, 43, 44]; `60,150` -> [60, 150]. */
const parseFrames = (spec: string): number[] =>
  spec.split(',').flatMap((part) => {
    const [from, to] = part.split('-').map(Number);
    if (from === undefined || Number.isNaN(from)) return [];
    if (to === undefined) return [from];
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  });

const template = remotionEngineManifest.templates.find((candidate) => candidate.id === values.template);
if (!template) {
  throw new Error(
    `Unknown template "${values.template}" (${remotionEngineManifest.templates.map((t) => t.id).join(', ')})`,
  );
}
const media = {
  before: '00000000-0000-4000-8000-00000000b4f0',
  after: '00000000-0000-4000-8000-0000000a47e2',
};
/** Effects this template accepts (null: it has no reveal effect choice). */
const effects: (string | null)[] = (values.effects?.split(',') ?? REVEAL_EFFECTS.ids).filter(
  (effect) => parseTemplateProps(template, { media, params: { revealEffect: effect } }).success,
);
if (effects.length === 0 || parseTemplateProps(template, { media, params: { revealEffect: '?' } }).success) {
  effects.splice(0, effects.length, null);
}
const formats = (values.formats === 'all' ? FORMAT_IDS.join(',') : values.formats)
  .split(',')
  .map((format) => FormatSchema.parse(format));
const frames = values.frames ? parseFrames(values.frames) : undefined;
const range = values.range?.split('-').map(Number) as [number, number] | undefined;

/** `--set=params.finale=rereveal` style overrides for quick experiments. */
const overrides = values.set.reduce<Record<string, unknown>>((acc, entry) => {
  const [key = '', raw = ''] = entry.split('=');
  const value: unknown =
    raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(Number(raw)) ? raw : Number(raw);
  const pathParts = key.split('.');
  let cursor = acc;
  pathParts.slice(0, -1).forEach((part) => {
    cursor[part] ??= {};
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[pathParts[pathParts.length - 1] ?? key] = value;
  return acc;
}, {});

// --photos=<dir> with before.jpg/after.jpg (e.g. stills of a reference video); else the fixtures.
const photosDir = values.photos ? path.resolve(values.photos) : studioDir;
const sizeOf = async (file: string): Promise<{ width: number; height: number }> => {
  const { width, height } = await sharp(path.join(photosDir, file)).metadata();
  return { width, height };
};
const fixtureInfo = { before: await sizeOf('before.jpg'), after: await sizeOf('after.jpg') };

await mkdir(values.out, { recursive: true });
const server = await serveDirectory(photosDir);
const base = server.baseUrl;

const browserExecutable = await ensureRemotionBrowser();
const t0 = performance.now();
const serveUrl = await bundle({
  entryPoint: path.resolve(here, '../src/remotion/index.ts'),
  webpackOverride,
});
console.log(`bundled in ${Math.round(performance.now() - t0)} ms`);

for (const format of formats) {
  for (const effect of effects) {
    const parsed = parseTemplateProps(template, {
      ...overrides,
      media,
      format,
      ...(values.duration ? { durationSec: Number(values.duration) } : {}),
      params: { ...(overrides['params'] as object | undefined), ...(effect ? { revealEffect: effect } : {}) },
    });
    if (!parsed.success) {
      throw parsed.error;
    }
    const inputProps = {
      props: parsed.data,
      assets: {
        media: {
          before: { kind: 'image', src: `${base}/before.jpg`, ...fixtureInfo.before },
          after: { kind: 'image', src: `${base}/after.jpg`, ...fixtureInfo.after },
        },
        music: null,
      },
    };
    const composition = await selectComposition({
      serveUrl,
      id: template.id,
      inputProps,
      browserExecutable,
    });
    const name = `${effect ?? template.id}_${format.replace(':', 'x')}`;
    const started = performance.now();
    if (frames) {
      for (const frame of frames) {
        await renderStill({
          serveUrl,
          composition,
          inputProps,
          frame,
          ...(values.png
            ? { imageFormat: 'png' as const }
            : { imageFormat: 'jpeg' as const, jpegQuality: 85 }),
          browserExecutable,
          output: path.join(
            values.out,
            `${name}_f${String(frame).padStart(4, '0')}.${values.png ? 'png' : 'jpg'}`,
          ),
        });
      }
      console.log(`${name}: ${frames.length} stills in ${Math.round(performance.now() - started)} ms`);
    } else {
      await renderMedia({
        serveUrl,
        composition,
        inputProps,
        codec: 'h264',
        pixelFormat: 'yuv420p',
        crf: Number(values.crf),
        ...(range ? { frameRange: range } : {}),
        browserExecutable,
        outputLocation: path.join(values.out, `${name}.mp4`),
        ...(values.concurrency ? { concurrency: Number(values.concurrency) } : {}),
      });
      const seconds = (performance.now() - started) / 1000;
      console.log(`${name}: ${composition.durationInFrames} frames in ${seconds.toFixed(1)} s`);
    }
  }
}

server.close();
