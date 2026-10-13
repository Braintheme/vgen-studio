// Render regression check: overlays that drift slowly must move smoothly in RENDERS (not
// only in the browser preview). Renders the before/after label's slow drift as lossless
// stills and fails when its motion is snapped to the pixel grid. Guards core/placement.ts
// (transform-only placement + the sub-pixel text rotation) against Remotion/Chromium changes.
// Usage: make check-jitter   (pnpm --filter @vgen/engine-remotion check-jitter [--keep])
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { parseTemplateProps } from '@vgen/shared';
import sharp, { type Region } from 'sharp';
import { computeLayout } from '../src/core/layout.js';
import { webpackOverride } from '../src/remotion/webpack-override.js';
import { ensureRemotionBrowser } from '../src/server/browser.js';
import { beforeAfterTemplate } from '../src/templates/before-after/manifest.js';
import { computeBeforeAfterTimeline } from '../src/templates/before-after/timeline.js';
import {
  measureMotion,
  MOTION_LIMITS,
  motionFailures,
  type MotionSample,
} from '../src/testing/motion-metrics.js';
import { serveDirectory } from './lib/static-server.js';

const { values } = parseArgs({ options: { keep: { type: 'boolean', default: false } } });
const here = path.dirname(fileURLToPath(import.meta.url));

/** Luminance above which a pixel belongs to the label's dot or text (glass stays darker). */
const BRIGHT = 110;
const PHOTO = { width: 1600, height: 2000 };

/** Deterministic textured photo (mid-dark gradient + noise) so the check needs no fixtures. */
const writePhoto = async (file: string, tint: readonly [number, number, number]): Promise<void> => {
  const pixels = Buffer.alloc(PHOTO.width * PHOTO.height * 3);
  let seed = 7;
  for (let y = 0; y < PHOTO.height; y += 1) {
    for (let x = 0; x < PHOTO.width; x += 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const noise = (seed / 2147483648 - 0.5) * 24;
      const base = 55 + (70 * (x + y)) / (PHOTO.width + PHOTO.height);
      const i = (y * PHOTO.width + x) * 3;
      for (let c = 0; c < 3; c += 1)
        pixels[i + c] = Math.max(0, Math.min(255, base * (tint[c] ?? 1) + noise));
    }
  }
  await sharp(pixels, { raw: { ...PHOTO, channels: 3 } })
    .jpeg({ quality: 90 })
    .toFile(file);
};

/** Centroids of the label's dot (first bright column run) and text (the rest) in a still. */
const sampleLabel = async (file: string, frame: number, region: Region): Promise<MotionSample> => {
  const { data, info } = await sharp(file)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const columns = Array.from({ length: info.width }, () => 0);
  const weights: number[] = [];
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 3;
      const l = 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
      const w = Math.max(0, l - BRIGHT);
      weights.push(w);
      columns[x] = (columns[x] ?? 0) + w;
    }
  }
  const dotStart = columns.findIndex((w) => w > 0);
  const dotEnd = dotStart < 0 ? -1 : columns.findIndex((w, x) => x > dotStart && w === 0);
  if (dotStart < 0 || dotEnd < 0) throw new Error(`frame ${String(frame)}: label not found`);
  const centroid = (from: number, to: number): number => {
    let sum = 0;
    let weighted = 0;
    weights.forEach((w, i) => {
      const x = i % info.width;
      if (x >= from && x < to) {
        sum += w;
        weighted += w * x;
      }
    });
    if (sum === 0) throw new Error(`frame ${String(frame)}: label text not found`);
    return region.left + weighted / sum;
  };
  return { frame, box: centroid(dotStart, dotEnd), text: centroid(dotEnd, info.width) };
};

const workDir = await mkdtemp(path.join(tmpdir(), 'vgen-jitter-'));
const server = await serveDirectory(workDir);
try {
  await writePhoto(path.join(workDir, 'before.jpg'), [0.85, 0.9, 1.05]);
  await writePhoto(path.join(workDir, 'after.jpg'), [1.1, 0.95, 0.8]);
  const parsed = parseTemplateProps(beforeAfterTemplate, {
    media: { before: '00000000-0000-4000-8000-00000000b4f0', after: '00000000-0000-4000-8000-0000000a47e2' },
  });
  if (!parsed.success) throw parsed.error;
  const props = parsed.data;
  const metadata = beforeAfterTemplate.resolveMetadata(props);
  const image = (name: string) => ({ kind: 'image' as const, src: `${server.baseUrl}/${name}`, ...PHOTO });
  const inputProps = {
    props,
    assets: { media: { before: image('before.jpg'), after: image('after.jpg') }, music: null },
  };

  // The BEFORE label's steady drift: it enters over body frames 6-24 and leaves at
  // reveal - 4 (see Showcase.tsx); a margin keeps enter/exit easing out of the window.
  const timeline = computeBeforeAfterTimeline({ durationSec: props.durationSec, fps: props.fps });
  const offset = timeline.segments.before.from;
  const frames = Array.from({ length: timeline.body.reveal.from - 8 - 30 + 1 }, (_, i) => offset + 30 + i);

  const layout = computeLayout(metadata.width, metadata.height);
  const { unit, safe } = layout;
  const region = {
    left: Math.max(0, Math.round(safe.left - 40 * unit)),
    top: Math.round(safe.top + 14 * unit),
    width: Math.round(520 * unit),
    height: Math.round(100 * unit),
  };

  const browserExecutable = await ensureRemotionBrowser();
  const serveUrl = await bundle({
    entryPoint: path.resolve(here, '../src/remotion/index.ts'),
    webpackOverride,
  });
  const composition = await selectComposition({
    serveUrl,
    id: beforeAfterTemplate.id,
    inputProps,
    browserExecutable,
  });
  const framesDir = path.join(workDir, 'frames');
  await mkdir(framesDir);

  const samples: MotionSample[] = [];
  for (const frame of frames) {
    const output = path.join(framesDir, `f${String(frame).padStart(4, '0')}.png`);
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      frame,
      imageFormat: 'png',
      output,
      browserExecutable,
    });
    samples.push(await sampleLabel(output, frame, region));
  }

  const report = measureMotion(samples);
  const failures = motionFailures(report);
  console.log(
    `label drift, frames ${String(frames[0])}-${String(frames.at(-1))} (${String(frames.length)} lossless stills):`,
  );
  for (const key of Object.keys(MOTION_LIMITS) as (keyof typeof MOTION_LIMITS)[]) {
    const ok = report[key] <= MOTION_LIMITS[key];
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${key.padEnd(16)} ${report[key].toFixed(3)} px (limit ${MOTION_LIMITS[key].toFixed(2)})`,
    );
  }
  if (values.keep) console.log(`frames kept in ${framesDir}`);
  if (failures.length > 0) {
    console.error(
      'Moving overlays are snapped to the pixel grid in renders (judder). Check core/placement.ts:\n' +
        'transform-only placement and SUBPIXEL_TEXT_TRANSFORM may no longer work with this Remotion/Chromium.',
    );
    process.exitCode = 1;
  }
} finally {
  server.close();
  if (!values.keep) await rm(workDir, { recursive: true, force: true });
}
