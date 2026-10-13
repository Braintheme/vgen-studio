import { rename, rm } from 'node:fs/promises';
import { mp4BoxOrder, probeMedia } from './probe.js';
import { run } from './process.js';

/** The delivery format every engine's output must have (see the brief, "Export"). */
export interface DeliveryReport {
  readonly videoCodec: string | null;
  readonly pixelFormat: string | null;
  readonly audioCodec: string | null;
  readonly audioSampleRate: number | null;
  readonly faststart: boolean;
  readonly durationSec: number | null;
  readonly width: number | null;
  readonly height: number | null;
}

export const inspectDelivery = async (filePath: string): Promise<DeliveryReport> => {
  const probe = await probeMedia(filePath);
  const video = probe.streams.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
  return {
    videoCodec: video?.codec_name ?? null,
    pixelFormat: video?.pix_fmt ?? null,
    audioCodec: audio?.codec_name ?? null,
    audioSampleRate: audio?.sample_rate ?? null,
    faststart: (await mp4BoxOrder(filePath)) === 'faststart',
    durationSec: probe.format.duration ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
  };
};

export const meetsDeliverySpec = (report: DeliveryReport): boolean =>
  report.videoCodec === 'h264' &&
  report.pixelFormat === 'yuv420p' &&
  report.audioCodec === 'aac' &&
  report.audioSampleRate === 48000 &&
  report.faststart;

export interface DeliveryFixResult {
  readonly report: DeliveryReport;
  /** What had to be done: nothing, a lossless remux, or a re-encode of some streams. */
  readonly action: 'none' | 'remux' | 'audio' | 'transcode';
}

/**
 * Engine-agnostic post-processing: makes any rendered file match the delivery spec
 * (H.264 yuv420p, AAC 48 kHz, faststart), doing the cheapest operation that works.
 */
export const ensureDeliverySpec = async (
  filePath: string,
  options: { readonly audioBitrate: string; readonly crf: number; readonly signal?: AbortSignal },
): Promise<DeliveryFixResult> => {
  const report = await inspectDelivery(filePath);
  if (meetsDeliverySpec(report)) {
    return { report, action: 'none' };
  }

  const videoOk = report.videoCodec === 'h264' && report.pixelFormat === 'yuv420p';
  const audioOk = report.audioCodec === 'aac' && report.audioSampleRate === 48000;
  const temp = `${filePath}.delivery.mp4`;
  const args = ['-v', 'error', '-y', '-i', filePath];
  if (!report.audioCodec) {
    // Some players/editors mishandle video without audio: add a silent track.
    args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest');
  }
  args.push('-map', '0:v:0', '-map', report.audioCodec ? '0:a:0' : '1:a:0');
  args.push(
    ...(videoOk ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(options.crf)]),
  );
  args.push(...(audioOk ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', options.audioBitrate, '-ar', '48000']));
  args.push('-movflags', '+faststart', temp);

  try {
    await run('ffmpeg', args, options.signal ? { signal: options.signal } : {});
    await rename(temp, filePath);
  } finally {
    await rm(temp, { force: true });
  }
  return {
    report: await inspectDelivery(filePath),
    action: !videoOk ? 'transcode' : !audioOk ? 'audio' : 'remux',
  };
};

/** Extracts one frame as a JPEG (used for render thumbnails). */
export const extractFrame = async (videoPath: string, timeSec: number, output: string): Promise<void> => {
  await run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-ss',
    timeSec.toFixed(3),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    output,
  ]);
};
