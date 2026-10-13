import type { EngineRenderInput } from '@vgen/shared';
import { testCardTemplate } from '../templates/test-card/manifest.js';

const even = (value: number): number => Math.max(2, Math.round(value / 2) * 2);

/** `#rrggbb` -> ffmpeg color syntax. */
const ffmpegColor = (hex: string): string => `0x${hex.replace('#', '')}`;

const photoSrc = (input: EngineRenderInput): string => {
  const photo = input.assets.media['photo'];
  if (!photo || Array.isArray(photo) || !('src' in photo)) {
    throw new Error('test-card: the photo slot is empty');
  }
  return photo.src;
};

/**
 * ffmpeg arguments for the test card: color background + fading photo (+ music with
 * fades), encoded to the delivery spec. `stillAtSec` renders one JPEG frame instead.
 */
export const testCardArgs = (
  input: EngineRenderInput,
  outputPath: string,
  stillAtSec: number | null = null,
): string[] => {
  const props = testCardTemplate.schema.parse(input.props);
  const { width, height, fps, durationInFrames } = input.metadata;
  const duration = durationInFrames / fps;
  const { photoScale, fadeSec } = props.params;
  const fadeOutStart = Math.max(0, duration - fadeSec);
  const box = `${String(even(width * photoScale))}:${String(even(height * photoScale))}`;
  const music = stillAtSec === null ? input.assets.music : null;

  const video = [
    `[1:v]scale=${box}:force_original_aspect_ratio=decrease,format=rgba`,
    fadeSec > 0
      ? `,fade=t=in:st=0:d=${String(fadeSec)}:alpha=1,fade=t=out:st=${String(fadeOutStart)}:d=${String(fadeSec)}:alpha=1`
      : '',
    '[photo];[0:v][photo]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]',
  ].join('');

  const args = [
    '-y',
    '-hide_banner',
    '-nostats',
    '-f',
    'lavfi',
    '-i',
    `color=c=${ffmpegColor(props.style.colors.background)}:s=${String(width)}x${String(height)}:r=${String(fps)}:d=${String(duration)}`,
    '-loop',
    '1',
    '-framerate',
    String(fps),
    '-t',
    String(duration),
    '-i',
    photoSrc(input),
  ];
  if (music) {
    args.push('-ss', String(props.music.startSec), '-stream_loop', '-1', '-i', music.src);
  }

  if (stillAtSec !== null) {
    return [
      ...args,
      '-filter_complex',
      video,
      '-map',
      '[v]',
      '-ss',
      String(stillAtSec),
      '-frames:v',
      '1',
      '-q:v',
      '3',
      outputPath,
    ];
  }

  const { encoding } = input;
  args.push('-filter_complex', video, '-map', '[v]');
  if (music) {
    const { volume, fadeInSec, fadeOutSec } = props.music;
    const fadeOut = Math.max(0, duration - fadeOutSec);
    args.push(
      '-map',
      '2:a',
      '-af',
      `volume=${String(volume)},afade=t=in:st=0:d=${String(fadeInSec)},afade=t=out:st=${String(fadeOut)}:d=${String(fadeOutSec)}`,
      '-c:a',
      'aac',
      '-b:a',
      encoding.audioBitrate,
      '-ar',
      String(encoding.audioSampleRate),
    );
  }
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    encoding.x264Preset,
    '-crf',
    String(encoding.crf),
    ...(encoding.maxBitrate && encoding.bufferSize
      ? ['-maxrate', encoding.maxBitrate, '-bufsize', encoding.bufferSize]
      : []),
    '-pix_fmt',
    'yuv420p',
    '-t',
    String(duration),
    '-movflags',
    '+faststart',
    '-progress',
    'pipe:1',
    outputPath,
  );
  return args;
};
