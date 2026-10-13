// Motion analysis of videos for reference work (make reference, make reference-compare).
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run } from '@vgen/media';

const ANALYSIS_SIZE = { width: 360, height: 640 };

/**
 * Mean absolute luma change from the previous frame (0..255), one value per frame (the
 * first is 0). Unlike a scene score it also shows smooth moves, so easing can be read
 * from it. Frames are decoded to grey at a fixed size (so videos of any size compare) and
 * differenced here: ffmpeg's tblend pairs frames unreliably on B-frame streams.
 */
export const motionCurve = async (
  file: string,
  size: { width: number; height: number } = ANALYSIS_SIZE,
): Promise<number[]> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'vgen-motion-'));
  const raw = path.join(dir, 'frames.gray');
  try {
    await run('ffmpeg', [
      '-v',
      'error',
      '-i',
      file,
      '-vf',
      `scale=${String(size.width)}:${String(size.height)}:flags=area,format=gray`,
      '-f',
      'rawvideo',
      raw,
    ]);
    const data = await readFile(raw);
    const frameBytes = size.width * size.height;
    const frames = Math.floor(data.length / frameBytes);
    const values = [0];
    for (let frame = 1; frame < frames; frame += 1) {
      let sum = 0;
      const a = (frame - 1) * frameBytes;
      const b = frame * frameBytes;
      for (let i = 0; i < frameBytes; i += 1) sum += Math.abs((data[b + i] ?? 0) - (data[a + i] ?? 0));
      values.push(Number((sum / frameBytes).toFixed(2)));
    }
    return values;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

export interface MotionEvent {
  readonly kind: 'move' | 'cut';
  readonly start: number;
  /** Last frame of the move (equals `start` for cuts). */
  readonly end: number;
  readonly peak: number;
}

/**
 * Moves (runs of frames clearly above the still-frame noise floor) and hard cuts
 * (isolated spikes) in a motion curve.
 */
export const motionEvents = (curve: readonly number[]): MotionEvent[] => {
  const sorted = [...curve].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.3)] ?? 0;
  const threshold = Math.max(1, noise * 3);
  const events: MotionEvent[] = [];
  let index = 1;
  while (index < curve.length) {
    const value = curve[index] ?? 0;
    const prev = curve[index - 1] ?? 0;
    const next = curve[index + 1] ?? 0;
    // A spike far above both neighbours: a cut.
    if (value > 4 && value > 3 * Math.max(prev, next, noise)) {
      events.push({ kind: 'cut', start: index, end: index, peak: value });
      index += 1;
      continue;
    }
    if (value > threshold) {
      const start = index;
      let peak = value;
      while (index < curve.length && (curve[index] ?? 0) > threshold) {
        peak = Math.max(peak, curve[index] ?? 0);
        index += 1;
      }
      // Ignore blips: a move lasts a few frames at least.
      if (index - start >= 3) events.push({ kind: 'move', start, end: index - 1, peak });
      continue;
    }
    index += 1;
  }
  return events;
};
