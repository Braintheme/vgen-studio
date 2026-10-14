import type { Size } from '@vgen/shared';
import { z } from 'zod';
import { run } from './process.js';

const ffmpeg = (args: readonly string[], signal?: AbortSignal) =>
  run('ffmpeg', ['-v', 'error', '-y', ...args], signal ? { signal } : {});

const VideoProbeSchema = z.object({
  format: z.object({ duration: z.coerce.number().optional(), format_name: z.string().optional() }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      codec_name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      avg_frame_rate: z.string().optional(),
      r_frame_rate: z.string().optional(),
      duration: z.coerce.number().optional(),
      disposition: z.object({ attached_pic: z.number().optional() }).optional(),
      tags: z.object({ rotate: z.coerce.number().optional() }).optional(),
      side_data_list: z.array(z.object({ rotation: z.coerce.number().optional() })).optional(),
    }),
  ),
});

export interface VideoInfo extends Size {
  /** Display size (rotation applied), see `Size`. */
  readonly durationSec: number;
  readonly fps: number;
  readonly codec: string;
  readonly hasAudio: boolean;
  /** ffprobe container name, e.g. `mov,mp4,m4a,3gp,3g2,mj2`. */
  readonly container: string;
}

const parseRate = (rate: string | undefined): number => {
  const [num = 0, den = 1] = (rate ?? '').split('/').map(Number);
  return den > 0 && Number.isFinite(num / den) ? num / den : 0;
};

/**
 * Video stream details via ffprobe, or null when the file has no real video stream
 * (cover art in an MP3/M4A is an "attached picture", not a video).
 */
export const probeVideo = async (filePath: string): Promise<VideoInfo | null> => {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  const probe = VideoProbeSchema.parse(JSON.parse(stdout));
  const video = probe.streams.find(
    (stream) => stream.codec_type === 'video' && stream.disposition?.attached_pic !== 1,
  );
  if (!video?.width || !video.height) return null;
  const rotation =
    video.side_data_list?.find((data) => data.rotation !== undefined)?.rotation ?? video.tags?.rotate ?? 0;
  const quarterTurn = Math.abs(Math.round(rotation / 90)) % 2 === 1;
  // Phones record variable frame rates: the average describes the footage best.
  const fps = parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 30;
  return {
    width: quarterTurn ? video.height : video.width,
    height: quarterTurn ? video.width : video.height,
    durationSec: probe.format.duration ?? video.duration ?? 0,
    fps: Math.round(fps * 1000) / 1000,
    codec: video.codec_name ?? 'unknown',
    hasAudio: probe.streams.some((stream) => stream.codec_type === 'audio'),
    container: probe.format.format_name ?? '',
  };
};

const even = (value: number): number => Math.max(2, Math.round(value / 2) * 2);

/** `size` scaled down (never up) so that its short side is at most `shortSide`. */
export const fitShortSide = (size: Size, shortSide: number): Size => {
  const scale = Math.min(1, shortSide / Math.min(size.width, size.height));
  return { width: even(size.width * scale), height: even(size.height * scale) };
};

/** Short side of browser proxies: sharp enough for the preview player, light to scrub. */
export const PROXY_SHORT_SIDE = 720;

/**
 * A light H.264 copy for the browser (any source codec, rotation applied): short side
 * <= 720 px, a keyframe every ~0.25 s for responsive scrubbing, AAC audio when present.
 */
export const makeVideoProxy = async (input: string, output: string, info: VideoInfo): Promise<Size> => {
  const size = fitShortSide(info, PROXY_SHORT_SIDE);
  const gop = String(Math.max(1, Math.round(Math.min(info.fps, 60) / 4)));
  await ffmpeg([
    '-i',
    input,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    `scale=${String(size.width)}:${String(size.height)}:flags=bicubic,format=yuv420p`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-g',
    gop,
    '-keyint_min',
    gop,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    output,
  ]);
  return size;
};

export interface Filmstrip {
  readonly frames: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Frame `i` shows the time `(i + 0.5) * intervalSec`. */
  readonly intervalSec: number;
}

const FILMSTRIP_HEIGHT = 96;
const FILMSTRIP_MIN_FRAMES = 8;
const FILMSTRIP_MAX_FRAMES = 40;

/** Evenly spaced frames in one JPEG row (one per second, 8–40 frames). */
export const makeFilmstrip = async (input: string, output: string, info: VideoInfo): Promise<Filmstrip> => {
  const frames = Math.min(FILMSTRIP_MAX_FRAMES, Math.max(FILMSTRIP_MIN_FRAMES, Math.ceil(info.durationSec)));
  const intervalSec = info.durationSec / frames;
  const frameHeight = FILMSTRIP_HEIGHT;
  const frameWidth = even((FILMSTRIP_HEIGHT * info.width) / info.height);
  await ffmpeg([
    '-i',
    input,
    '-vf',
    // Sample in the middle of each interval, then lay the frames out in one row. The last
    // frame is held a bit longer: otherwise `fps` emits the last sample only after `tile` has
    // already flushed at the end of the stream (a black last tile).
    `tpad=stop_mode=clone:stop_duration=${(intervalSec * 2).toFixed(3)},fps=1/${intervalSec.toFixed(6)}:start_time=${(intervalSec / 2).toFixed(6)},scale=${String(frameWidth)}:${String(frameHeight)},tile=${String(frames)}x1`,
    '-frames:v',
    '1',
    '-q:v',
    '4',
    output,
  ]);
  return { frames, frameWidth, frameHeight, intervalSec };
};

/** One frame as a JPEG (poster images). */
export const extractVideoPoster = async (input: string, output: string, info: VideoInfo): Promise<void> => {
  await ffmpeg([
    '-ss',
    Math.min(1, info.durationSec / 2).toFixed(3),
    '-i',
    input,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    output,
  ]);
};

export interface CutClipOptions {
  readonly startSec: number;
  readonly durationSec: number;
  readonly fps: number;
  /** Output pixel size (even numbers). */
  readonly size: Size;
  readonly keepAudio: boolean;
  readonly signal?: AbortSignal;
}

/**
 * Cuts a fragment for rendering: frame-accurate start, constant output fps, the given
 * size, H.264 with dense keyframes (cheap seeking for the renderer), AAC audio if kept.
 */
export const cutVideoClip = async (input: string, output: string, options: CutClipOptions): Promise<void> => {
  const fps = String(options.fps);
  await ffmpeg(
    [
      '-ss',
      options.startSec.toFixed(3),
      '-i',
      input,
      '-t',
      options.durationSec.toFixed(3),
      '-map',
      '0:v:0',
      ...(options.keepAudio ? ['-map', '0:a:0?'] : ['-an']),
      '-vf',
      `fps=${fps},scale=${String(options.size.width)}:${String(options.size.height)}:flags=lanczos,format=yuv420p`,
      '-fps_mode',
      'cfr',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '14',
      '-g',
      fps,
      ...(options.keepAudio ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'] : []),
      '-movflags',
      '+faststart',
      output,
    ],
    options.signal,
  );
};

/**
 * Pixel size of a cut fragment: covers `frame` times `oversample` (headroom for zooms and
 * punch-ins), never above the source, capped on the long side; even numbers.
 */
export const clipSize = (source: Size, frame: Size, oversample: number, maxSide = 3840): Size => {
  const cover = Math.max(frame.width / source.width, frame.height / source.height);
  let scale = Math.min(1, cover * oversample);
  scale = Math.min(scale, maxSide / Math.max(source.width, source.height));
  return { width: even(source.width * scale), height: even(source.height * scale) };
};
