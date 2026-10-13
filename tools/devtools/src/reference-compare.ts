// Compares our render with the reference video: side-by-side compare.mp4 (reference audio),
// contact sheets on the same timecodes, and the timing of moves/cuts (tolerance ±2 frames).
// Usage: make reference-compare file=references/<slug>/<video>.mp4 render=<our render>.mp4
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { probeMedia, run } from '@vgen/media';
import { motionCurve, motionEvents, type MotionEvent } from './lib/motion.js';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    render: { type: 'string' },
    /** Seconds between contact-sheet pairs. */
    step: { type: 'string', default: '0.5' },
  },
});
const ROOT = path.resolve(process.env['INIT_CWD'] ?? process.cwd());
if (!values.file || !values.render) {
  console.error('usage: make reference-compare file=references/<slug>/<video>.mp4 render=<render>.mp4');
  process.exit(1);
}
const reference = path.resolve(ROOT, values.file);
const ours = path.resolve(ROOT, values.render);
const outDir = path.dirname(reference);
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
/** Allowed timing difference of moves and cuts. */
const TOLERANCE_FRAMES = 2;
const SHEET_PER_ROW = 9;

const ffmpeg = (args: readonly string[]) => run('ffmpeg', ['-v', 'error', '-y', ...args]);

const probe = await probeMedia(reference);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
if (!video?.width || !video.height) throw new Error(`${reference}: no video stream`);
const size = { width: video.width, height: video.height };
const [num = 30, den = 1] = (video.r_frame_rate ?? '30/1').split('/').map(Number);
const fps = num / den;
const hasAudio = probe.streams.some((stream) => stream.codec_type === 'audio');
const fit = `scale=${String(size.width)}:${String(size.height)}:force_original_aspect_ratio=decrease,pad=${String(size.width)}:${String(size.height)}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${String(fps)}`;
const tag = (text: string, color: string) =>
  `drawtext=fontfile=${FONT}:text='${text}  f%{eif\\:t*${String(fps)}+0.01\\:d}  %{pts\\:hms}':x=10:y=10:fontsize=24:fontcolor=${color}:box=1:boxcolor=black@0.6`;

// 1. Side by side, in sync, with the reference's audio.
await ffmpeg([
  '-i',
  reference,
  '-i',
  ours,
  '-filter_complex',
  `[0:v]${fit},${tag('REFERENCE', 'yellow')}[a];[1:v]${fit},${tag('OURS', 'cyan')}[b];[a][b]hstack=2[v]`,
  '-map',
  '[v]',
  ...(hasAudio ? ['-map', '0:a', '-c:a', 'aac'] : []),
  '-c:v',
  'libx264',
  '-crf',
  '18',
  '-pix_fmt',
  'yuv420p',
  '-shortest',
  path.join(outDir, 'compare.mp4'),
]);

// 2. Contact sheets: reference row above our row, same timecodes.
const step = Number(values.step);
const duration = probe.format.duration ?? 0;
const times = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step);
const sheets: string[] = [];
for (let first = 0; first < times.length; first += SHEET_PER_ROW) {
  const chunk = times.slice(first, first + SHEET_PER_ROW);
  const select = `select='${chunk.map((time) => `eq(n\\,${String(Math.round(time * fps))})`).join('+')}'`;
  const row = (label: string, color: string) =>
    `${fit},${select},scale=200:-2,${tag(label, color).replace('fontsize=24', 'fontsize=13')},tile=${String(chunk.length)}x1:padding=4:color=white`;
  const name = `compare-sheet-${String(sheets.length + 1).padStart(2, '0')}.jpg`;
  await ffmpeg([
    '-i',
    reference,
    '-i',
    ours,
    '-filter_complex',
    `[0:v]${row('REF', 'yellow')}[a];[1:v]${row('OURS', 'cyan')}[b];[a][b]vstack`,
    '-frames:v',
    '1',
    path.join(outDir, name),
  ]);
  sheets.push(name);
}

// 3. Timing of moves and cuts, matched in order.
const refEvents = motionEvents(await motionCurve(reference));
const ourEvents = motionEvents(await motionCurve(ours));
const rows: string[] = [];
const report: {
  event: string;
  reference: MotionEvent | null;
  ours: MotionEvent | null;
  startDiff: number | null;
  endDiff: number | null;
  ok: boolean;
}[] = [];
const count = Math.max(refEvents.length, ourEvents.length);
for (let i = 0; i < count; i += 1) {
  const ref = refEvents[i] ?? null;
  const our = ourEvents[i] ?? null;
  const startDiff = ref && our ? our.start - ref.start : null;
  const endDiff = ref && our ? our.end - ref.end : null;
  const ok =
    ref !== null &&
    our !== null &&
    ref.kind === our.kind &&
    Math.abs(startDiff ?? 99) <= TOLERANCE_FRAMES &&
    Math.abs(endDiff ?? 99) <= TOLERANCE_FRAMES;
  const span = (event: MotionEvent | null) =>
    event ? `${event.kind} f${String(event.start)}–${String(event.end)}` : '—';
  rows.push(
    `| ${String(i + 1)} | ${span(ref)} | ${span(our)} | ${startDiff ?? '—'} | ${endDiff ?? '—'} | ${ok ? 'ok' : '**off**'} |`,
  );
  report.push({ event: String(i + 1), reference: ref, ours: our, startDiff, endDiff, ok });
}
const table = [
  `Timing of moves and cuts (tolerance ±${String(TOLERANCE_FRAMES)} frames at ${String(fps)} fps). Moves are runs of frames above the`,
  'still-frame noise of the motion curve; their ends are where the motion fades out, so long eased tails',
  'are more sensitive than starts.',
  '',
  '| # | Reference | Ours | Δ start | Δ end | |',
  '|---|---|---|---|---|---|',
  ...rows,
].join('\n');
await writeFile(path.join(outDir, 'compare-timing.md'), `${table}\n`);
await writeFile(
  path.join(outDir, 'compare.json'),
  `${JSON.stringify({ fps, tolerance: TOLERANCE_FRAMES, events: report }, null, 2)}\n`,
);
await mkdir(outDir, { recursive: true });

console.log(table);
console.log(`\n${path.relative(ROOT, outDir)}/compare.mp4, ${sheets.join(', ')}, compare-timing.md`);
