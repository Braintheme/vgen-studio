import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureDeliverySpec, inspectDelivery } from './delivery.js';
import { normalizedSize, normalizePhoto } from './images.js';
import { mp4BoxOrder, probeImage } from './probe.js';

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('normalizedSize', () => {
  const frame = { width: 1080, height: 1920 };

  it('covers the frame with camera headroom', () => {
    // 4000x6000 portrait: cover scale is 1920/6000=0.32, times 1.25 -> 1600x2400.
    expect(normalizedSize({ width: 4000, height: 6000 }, { frame })).toEqual({ width: 1600, height: 2400 });
    // Landscape into a vertical frame is cropped heavily, so it needs more pixels.
    expect(normalizedSize({ width: 6000, height: 4000 }, { frame })).toEqual({ width: 3600, height: 2400 });
  });

  it('never upscales and respects the cap', () => {
    expect(normalizedSize({ width: 800, height: 1200 }, { frame })).toEqual({ width: 800, height: 1200 });
    expect(normalizedSize({ width: 20000, height: 4000 }, { frame, maxSide: 4096 })).toEqual({
      width: 4096,
      height: 819,
    });
  });
});

describe('photo normalization', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'vgen-media-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('applies EXIF orientation and resizes', async () => {
    const source = path.join(dir, 'rotated.jpg');
    // Stored 3000x2000 but tagged "rotate 90": displayed as 2000x3000 portrait.
    await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#336699' } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(source);
    expect(await probeImage(source)).toMatchObject({ width: 2000, height: 3000 });

    const result = await normalizePhoto(source, path.join(dir, 'out.jpg'), {
      frame: { width: 1080, height: 1920 },
      sharpen: 'low',
    });
    expect(result).toMatchObject({ width: 1600, height: 2400, mime: 'image/jpeg' });
    const meta = await sharp(result.path).metadata();
    expect(meta.orientation ?? 1).toBe(1);
  });
});

describe.skipIf(!hasFfmpeg)('delivery post-processing', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'vgen-delivery-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('adds a silent AAC track and moves moov to the front', async () => {
    const file = path.join(dir, 'raw.mp4');
    // H.264 yuv420p video without audio, moov at the end (no faststart).
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=320x240:rate=30:duration=1',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      file,
    ]);
    expect(await mp4BoxOrder(file)).toBe('moov-at-end');

    const result = await ensureDeliverySpec(file, { audioBitrate: '128k', crf: 18 });
    expect(result.action).toBe('audio');
    expect(await inspectDelivery(file)).toMatchObject({
      videoCodec: 'h264',
      pixelFormat: 'yuv420p',
      audioCodec: 'aac',
      audioSampleRate: 48000,
      faststart: true,
    });
    expect((await ensureDeliverySpec(file, { audioBitrate: '128k', crf: 18 })).action).toBe('none');
  });
});

describe.skipIf(!hasFfmpeg)('waveform peaks', () => {
  it('reduces audio to normalized peaks with silence and a loud part', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'vgen-peaks-'));
    const file = path.join(dir, 'tone.wav');
    // 1 s silence followed by 1 s of a loud sine.
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=44100:cl=mono',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-filter_complex',
      '[0]atrim=0:1[a];[a][1]concat=n=2:v=0:a=1',
      file,
    ]);
    const { computePeaks } = await import('./peaks.js');
    const result = await computePeaks(file, 100);
    expect(result.durationSec).toBeCloseTo(2, 1);
    expect(result.peaks).toHaveLength(100);
    expect(Math.max(...result.peaks.slice(0, 45))).toBeLessThan(0.01);
    expect(Math.min(...result.peaks.slice(55))).toBeGreaterThan(0.05);
    await rm(dir, { recursive: true, force: true });
  });
});
