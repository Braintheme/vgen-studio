import { spawn } from 'node:child_process';
import { ProcessError } from './process.js';

/** Peaks for waveform drawing: enough detail for ~1000 px, tiny to transfer. */
export const DEFAULT_PEAK_COUNT = 1000;
const SAMPLE_RATE = 8000;
const INT16_MAX = 32768;

export interface WaveformPeaks {
  /** Normalized 0..1 maximum amplitude per bucket. */
  readonly peaks: readonly number[];
  readonly durationSec: number;
}

const decodeMonoPcm = (file: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-f',
      's16le',
      '-acodec',
      'pcm_s16le',
      'pipe:1',
    ];
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new ProcessError('ffmpeg', code, stderr));
    });
  });

/** Downsamples an audio file into normalized peak values (for wavesurfer and similar). */
export const computePeaks = async (file: string, count = DEFAULT_PEAK_COUNT): Promise<WaveformPeaks> => {
  const pcm = await decodeMonoPcm(file);
  const samples = Math.floor(pcm.length / 2);
  const bucket = Math.max(1, Math.floor(samples / count));
  const peaks: number[] = [];
  for (let start = 0; start < samples && peaks.length < count; start += bucket) {
    let max = 0;
    const end = Math.min(samples, start + bucket);
    for (let index = start; index < end; index += 1) {
      max = Math.max(max, Math.abs(pcm.readInt16LE(index * 2)));
    }
    peaks.push(Math.round((max / INT16_MAX) * 1000) / 1000);
  }
  return { peaks, durationSec: samples / SAMPLE_RATE };
};
