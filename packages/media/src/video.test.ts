import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clipSize, cutVideoClip, fitShortSide, makeFilmstrip, makeVideoProxy, probeVideo } from './video.js';

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('video sizes', () => {
  it('fits the short side without upscaling', () => {
    expect(fitShortSide({ width: 3840, height: 2160 }, 720)).toEqual({ width: 1280, height: 720 });
    expect(fitShortSide({ width: 1080, height: 1920 }, 720)).toEqual({ width: 720, height: 1280 });
    expect(fitShortSide({ width: 640, height: 360 }, 720)).toEqual({ width: 640, height: 360 });
  });

  it('covers the frame with headroom, capped by the source', () => {
    const frame = { width: 1080, height: 1920 };
    expect(clipSize({ width: 2160, height: 3840 }, frame, 1.5)).toEqual({ width: 1620, height: 2880 });
    expect(clipSize({ width: 1080, height: 1920 }, frame, 2)).toEqual({ width: 1080, height: 1920 });
    // Landscape into a vertical frame needs the full height.
    expect(clipSize({ width: 3840, height: 2160 }, frame, 1)).toEqual({ width: 3414, height: 1920 });
  });
});

describe.skipIf(!hasFfmpeg)('video processing', () => {
  let dir: string;
  let source: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'vgen-video-'));
    source = path.join(dir, 'source.mp4');
    execFileSync('ffmpeg', [
      ...['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=25:duration=4'],
      ...['-f', 'lavfi', '-i', 'sine=frequency=440:duration=4'],
      ...['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source],
    ]);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('probes size, duration, fps and audio', async () => {
    const info = await probeVideo(source);
    expect(info).toMatchObject({ width: 640, height: 360, fps: 25, codec: 'h264', hasAudio: true });
    expect(info?.durationSec).toBeCloseTo(4, 1);
  });

  it('makes a proxy and a filmstrip', async () => {
    const info = await probeVideo(source);
    if (!info) throw new Error('no video');
    const proxy = path.join(dir, 'proxy.mp4');
    expect(await makeVideoProxy(source, proxy, info)).toEqual({ width: 640, height: 360 });
    expect(await probeVideo(proxy)).toMatchObject({ width: 640, height: 360, hasAudio: true });

    const strip = path.join(dir, 'strip.jpg');
    const layout = await makeFilmstrip(source, strip, info);
    expect(layout).toMatchObject({ frames: 8, frameWidth: 170, frameHeight: 96 });
    expect(await sharp(strip).metadata()).toMatchObject({ width: 8 * 170, height: 96 });
    // Every tile is filled, the last one too (testsrc2 is never black).
    const last = await sharp(strip)
      .extract({ left: 7 * 170, top: 0, width: 170, height: 96 })
      .stats();
    expect(last.channels[0]?.mean).toBeGreaterThan(10);
  });

  it('cuts a fragment at the output fps and size', async () => {
    const clip = path.join(dir, 'clip.mp4');
    await cutVideoClip(source, clip, {
      startSec: 1,
      durationSec: 2,
      fps: 30,
      size: { width: 320, height: 180 },
      keepAudio: false,
    });
    const info = await probeVideo(clip);
    expect(info).toMatchObject({ width: 320, height: 180, fps: 30, hasAudio: false });
    expect(info?.durationSec).toBeCloseTo(2, 1);
  });
});
