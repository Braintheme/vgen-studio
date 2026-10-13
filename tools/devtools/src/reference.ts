// Breaks a reference video down for template work (see .claude/commands/template-from-reference.md):
// metadata, every frame, contact sheets, detected cuts with frame strips, per-frame activity,
// music onsets/beats and a timeline image. Output: references/<slug>/.
// Usage: make reference file=references/<file>.mp4
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { probeMedia, run } from '@vgen/media';
import { motionCurve, motionEvents } from './lib/motion.js';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    /** Scene-change score that counts as a cut (0..1). */
    'cut-threshold': { type: 'string', default: '0.3' },
  },
});

const ROOT = path.resolve(process.env['INIT_CWD'] ?? process.cwd());
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const THUMB_WIDTH = 240;
const SHEET_COLUMNS = 8;
const SHEET_ROWS = 4;
/** Frames shown before/after a cut in its strip. */
const CUT_CONTEXT = 3;
/** Onset peaks closer than this (seconds) are merged. */
const MIN_ONSET_GAP_SEC = 0.15;

if (!values.file) {
  console.error('usage: make reference file=references/<file>.mp4');
  process.exit(1);
}
const input = path.resolve(ROOT, values.file);
const referencesDir = path.join(ROOT, 'references');
// A video already inside references/<dir>/ keeps that folder; otherwise the slug is its name.
const parent = path.dirname(input);
const outDir =
  path.dirname(parent) === referencesDir ? parent : path.join(referencesDir, path.parse(input).name);

const ffmpeg = (args: readonly string[]) => run('ffmpeg', ['-v', 'error', '-y', ...args]);
const pad = (value: number, width = 4): string => String(value).padStart(width, '0');

const probe = await probeMedia(input);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
if (!video?.width || !video.height) throw new Error(`${input}: no video stream`);
const [num = 30, den = 1] = (video.r_frame_rate ?? '30/1').split('/').map(Number);
const fps = num / den;
const duration = probe.format.duration ?? 0;
const timecode = (frame: number): string => `${(frame / fps).toFixed(2)}s`;

await rm(path.join(outDir, 'frames'), { recursive: true, force: true });
for (const dir of ['frames', 'sheets', 'cuts']) await mkdir(path.join(outDir, dir), { recursive: true });

// 1. Every frame (full size, numbered from 0) and a labelled thumbnail of each.
console.log(`frames @ ${String(fps)} fps...`);
await ffmpeg(['-i', input, '-start_number', '0', '-q:v', '2', path.join(outDir, 'frames', 'f%04d.jpg')]);
// Decoded frames, not duration x fps: containers often pad the duration.
const frameCount = (await readdir(path.join(outDir, 'frames'))).length;
// Source frame number from the timestamp: after `select`, frame_num counts selected frames only.
const label = `drawtext=fontfile=${FONT}:text='f%{eif\\:t*${String(fps)}+0.01\\:d}  %{pts\\:hms}':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6`;

// 2. Contact sheets: every frame (detail) and every 6th frame (overview).
const sheet = async (step: number, name: string): Promise<void> => {
  const perSheet = SHEET_COLUMNS * SHEET_ROWS;
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `select='not(mod(n\\,${String(step)}))',scale=${String(THUMB_WIDTH)}:-2,${label},tile=${String(SHEET_COLUMNS)}x${String(SHEET_ROWS)}:padding=4:color=white`,
    '-fps_mode',
    'vfr',
    '-start_number',
    '1',
    path.join(outDir, 'sheets', `${name}-%02d.jpg`),
  ]);
  console.log(`sheets/${name}-*.jpg (every ${String(step)} frame(s), ${String(perSheet)} per sheet)`);
};
await sheet(6, 'overview');
await sheet(1, 'all-frames');

// 3. Per-frame scene-change score (activity curve) and cuts.
const scoresFile = path.join(outDir, 'scene-scores.txt');
await ffmpeg([
  '-i',
  input,
  '-vf',
  `select='gte(scene,0)',metadata=print:file=${scoresFile}`,
  '-f',
  'null',
  '-',
]);
const scores: number[] = [];
for (const line of (await readFile(scoresFile, 'utf8')).split('\n')) {
  const match = /lavfi\.scene_score=([\d.]+)/.exec(line);
  if (match?.[1]) scores.push(Number(match[1]));
}
await rm(scoresFile);
const motion = await motionCurve(input);

const threshold = Number(values['cut-threshold']);
const cuts = scores
  .map((score, frame) => ({ frame, score }))
  .filter(({ score, frame }) => score >= threshold && frame > 0)
  .map(({ frame, score }) => ({
    frame,
    time: Number((frame / fps).toFixed(3)),
    score: Number(score.toFixed(3)),
  }));

for (const [index, cut] of cuts.entries()) {
  const from = Math.max(0, cut.frame - CUT_CONTEXT);
  const to = Math.min(frameCount - 1, cut.frame + CUT_CONTEXT);
  await ffmpeg([
    '-i',
    input,
    '-vf',
    `select='between(n\\,${String(from)}\\,${String(to)})',scale=${String(THUMB_WIDTH)}:-2,${label},tile=${String(to - from + 1)}x1:padding=4:color=white`,
    '-fps_mode',
    'vfr',
    '-frames:v',
    '1',
    path.join(outDir, 'cuts', `cut-${pad(index + 1, 2)}-f${pad(cut.frame)}.jpg`),
  ]);
}

// 4. Music: onset strength per video frame, peaks and a tempo estimate.
let onsets: { frame: number; time: number; strength: number }[] = [];
let bpm: number | null = null;
if (audio) {
  const pcmFile = path.join(outDir, 'audio.pcm');
  const sampleRate = 22050;
  await ffmpeg(['-i', input, '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 's16le', pcmFile]);
  const pcm = await readFile(pcmFile);
  await rm(pcmFile);
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  // Energy in hops of 1/4 video frame, then a half-wave rectified log-energy flux.
  const hop = Math.round(sampleRate / fps / 4);
  const energy: number[] = [];
  for (let start = 0; start + hop <= samples.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + hop; i += 1) sum += (samples[i] ?? 0) ** 2;
    energy.push(Math.log1p(sum / hop));
  }
  const flux = energy.map((value, i) => Math.max(0, value - (energy[i - 1] ?? value)));
  const mean = flux.reduce((a, b) => a + b, 0) / Math.max(1, flux.length);
  const sd = Math.sqrt(flux.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, flux.length));
  const minGap = Math.round((MIN_ONSET_GAP_SEC * sampleRate) / hop);
  const peaks: number[] = [];
  flux.forEach((value, i) => {
    const isPeak = value > mean + 1.5 * sd && value >= (flux[i - 1] ?? 0) && value >= (flux[i + 1] ?? 0);
    if (!isPeak) return;
    const last = peaks.at(-1);
    if (last !== undefined && i - last < minGap) {
      if (value > (flux[last] ?? 0)) peaks[peaks.length - 1] = i;
    } else peaks.push(i);
  });
  const hopSec = hop / sampleRate;
  const maxFlux = Math.max(...peaks.map((i) => flux[i] ?? 0), 1e-9);
  onsets = peaks.map((i) => ({
    frame: Math.round(i * hopSec * fps),
    time: Number((i * hopSec).toFixed(3)),
    strength: Number(((flux[i] ?? 0) / maxFlux).toFixed(2)),
  }));
  // Tempo: autocorrelation of the flux between 60 and 180 BPM.
  let best = 0;
  for (let bpmCandidate = 60; bpmCandidate <= 180; bpmCandidate += 0.5) {
    const lag = Math.round(60 / bpmCandidate / hopSec);
    let corr = 0;
    for (let i = lag; i < flux.length; i += 1) corr += (flux[i] ?? 0) * (flux[i - lag] ?? 0);
    if (corr > best) {
      best = corr;
      bpm = bpmCandidate;
    }
  }
}

// 5. Timeline: waveform with cuts (red) and onsets (cyan, height = strength).
const timelineWidth = 1600;
const x = (time: number): number => Math.round((time / duration) * timelineWidth);
const marks = [
  ...cuts.map((cut) => `drawbox=x=${String(x(cut.time))}:y=0:w=3:h=300:color=red@0.9:t=fill`),
  ...onsets.map(
    (onset) =>
      `drawbox=x=${String(x(onset.time))}:y=${String(Math.round(300 - 120 * onset.strength))}:w=2:h=${String(Math.round(120 * onset.strength))}:color=cyan@0.9:t=fill`,
  ),
  ...Array.from(
    { length: Math.floor(duration) + 1 },
    (_, s) =>
      `drawtext=fontfile=${FONT}:text='${String(s)}s':x=${String(x(s) + 3)}:y=4:fontsize=16:fontcolor=white`,
  ),
];
if (audio) {
  await ffmpeg([
    '-i',
    input,
    '-filter_complex',
    `[0:a]showwavespic=s=${String(timelineWidth)}x300:colors=gray,format=rgba[w];color=c=#202020:s=${String(timelineWidth)}x300[bg];[bg][w]overlay,${marks.join(',')}`,
    '-frames:v',
    '1',
    path.join(outDir, 'timeline.png'),
  ]);
}

const meta = {
  source: path.relative(ROOT, input),
  width: video.width,
  height: video.height,
  aspect: `${String(video.width)}:${String(video.height)}`,
  fps,
  durationSec: duration,
  frames: frameCount,
  videoCodec: video.codec_name ?? null,
  audio: audio ? { codec: audio.codec_name ?? null, sampleRate: audio.sample_rate ?? null } : null,
  cutThreshold: threshold,
  cuts: cuts.map((cut) => ({ ...cut, timecode: timecode(cut.frame) })),
  tempoBpm: bpm,
  onsets,
  /** Mean absolute luma change from the previous frame (0..255): the motion curve. */
  motion,
  /** Moves and hard cuts found in the motion curve (what make reference-compare matches). */
  motionEvents: motionEvents(motion),
  /** Scene-change score per frame (0..1); cuts are spikes above `cutThreshold`. */
  sceneScore: scores.map((score) => Number(score.toFixed(3))),
};
await writeFile(path.join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

const sheets = (await readdir(path.join(outDir, 'sheets'))).length;
console.log(`\n${path.relative(ROOT, outDir)}/`);
console.log(
  `  ${String(video.width)}x${String(video.height)} @ ${String(fps)} fps, ${duration.toFixed(2)} s, ${String(frameCount)} frames`,
);
console.log(`  frames/        every frame (f0000.jpg = frame 0)`);
console.log(`  sheets/        ${String(sheets)} contact sheets`);
console.log(
  `  cuts/          ${String(cuts.length)} cut strips (±${String(CUT_CONTEXT)} frames): ${cuts.map((cut) => `f${String(cut.frame)}`).join(', ') || 'none'}`,
);
console.log(`  timeline.png   waveform, cuts (red), onsets (cyan)`);
console.log(
  `  meta.json      metadata, cuts, ~${String(bpm ?? '-')} BPM, ${String(onsets.length)} onsets, per-frame motion`,
);
