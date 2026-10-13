// Prepares the before/after photo pair for Remotion Studio and demo renders.
// Uses user photos from <repo>/fixtures when present, otherwise synthesizes a pair.
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.resolve(here, '../../../../fixtures');
const GENERATED_DIR = path.join(FIXTURES_DIR, 'generated');
const STUDIO_DIR = path.join(FIXTURES_DIR, '.studio');
const MAX_SIDE = 2400;

const findUserPhoto = async (name: string): Promise<string | null> => {
  const files = await readdir(FIXTURES_DIR);
  const match = files.find((file) => new RegExp(`^${name}\\.(jpe?g|png|webp)$`, 'i').test(file));
  return match ? path.join(FIXTURES_DIR, match) : null;
};

/** Deterministic pseudo-random generator (mulberry32). */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ridge = (width: number, base: number, amplitude: number, seed: number, steps = 24): string => {
  const random = rng(seed);
  const points: string[] = [`0,${base}`];
  for (let index = 1; index <= steps; index += 1) {
    const x = (width / steps) * index;
    const wave = 0.5 + 0.5 * Math.sin((index / steps) * Math.PI * 3 + seed);
    const y = base - amplitude * (0.45 + 0.55 * random()) * (0.35 + 0.65 * wave);
    points.push(`${x.toFixed(0)},${y.toFixed(0)}`);
  }
  return points.join(' ');
};

/** A golden-hour mountain lake, portrait 2:3. */
const landscapeSvg = (width: number, height: number): string => {
  const horizon = height * 0.58;
  const trees = Array.from({ length: 34 }, (_, index) => {
    const random = rng(100 + index);
    const x = (index / 34) * width + random() * 40;
    const h = 160 + random() * 260;
    const w = h * 0.32;
    const y = horizon + 30 + random() * 40;
    return `<polygon points="${x},${y - h} ${x - w / 2},${y} ${x + w / 2},${y}" fill="#0f2418"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d3b6e"/><stop offset="0.45" stop-color="#e9826b"/>
      <stop offset="0.75" stop-color="#ffc77a"/><stop offset="1" stop-color="#ffe0a3"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.62" cy="0.47" r="0.35">
      <stop offset="0" stop-color="#fff6d8"/><stop offset="0.08" stop-color="#ffe7a6"/>
      <stop offset="0.3" stop-color="#ffb46b" stop-opacity="0.55"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d6aa6"/><stop offset="1" stop-color="#c9889a"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f4b7a"/><stop offset="1" stop-color="#6b5a7d"/></linearGradient>
    <linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2b3f"/><stop offset="1" stop-color="#263a3a"/></linearGradient>
    <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3a77a"/><stop offset="0.35" stop-color="#8a6f9a"/><stop offset="1" stop-color="#16263d"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>
  <rect width="100%" height="100%" fill="url(#sun)"/>
  <polygon points="${ridge(width, horizon - 40, 520, 1)} ${width},${horizon} 0,${horizon}" fill="url(#far)" opacity="0.9"/>
  <polygon points="${ridge(width, horizon + 10, 380, 2)} ${width},${horizon + 40} 0,${horizon + 40}" fill="url(#mid)"/>
  <polygon points="${ridge(width, horizon + 60, 240, 3, 40)} ${width},${horizon + 80} 0,${horizon + 80}" fill="url(#near)"/>
  ${trees}
  <rect y="${horizon + 70}" width="100%" height="${height - horizon}" fill="url(#lake)"/>
  <ellipse cx="${width * 0.62}" cy="${horizon + 260}" rx="${width * 0.05}" ry="${height * 0.12}" fill="#ffe9b0" opacity="0.55" filter="url(#soft)"/>
  ${Array.from({ length: 60 }, (_, index) => {
    const random = rng(500 + index);
    const y = horizon + 90 + random() * (height - horizon - 120);
    const x = random() * width;
    return `<rect x="${x}" y="${y}" width="${80 + random() * 260}" height="3" fill="#ffffff" opacity="${0.05 + random() * 0.12}"/>`;
  }).join('')}
</svg>`;
};

const generatePair = async (): Promise<{ before: string; after: string }> => {
  await mkdir(GENERATED_DIR, { recursive: true });
  const width = 2400;
  const height = 3600;
  const base = sharp(Buffer.from(landscapeSvg(width, height)));
  const noise = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 14 },
    },
  })
    .png()
    .toBuffer();
  const after = path.join(GENERATED_DIR, 'after.jpg');
  const before = path.join(GENERATED_DIR, 'before.jpg');
  const graded = await base
    .composite([{ input: noise, blend: 'soft-light' }])
    .modulate({ saturation: 1.12 })
    .jpeg({ quality: 92 })
    .toBuffer();
  await sharp(graded).toFile(after);
  // "Before": flat, low-contrast, slightly underexposed and cool, like an unedited RAW export.
  await sharp(graded)
    .modulate({ saturation: 0.62, brightness: 0.94 })
    .linear(0.78, 26)
    .recomb([
      [0.96, 0.02, 0.02],
      [0.02, 0.97, 0.03],
      [0.03, 0.04, 1.02],
    ])
    .jpeg({ quality: 92 })
    .toFile(before);
  return { before, after };
};

const normalize = async (input: string, output: string) => {
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(output);
  return { width: info.width, height: info.height };
};

const userBefore = await findUserPhoto('before');
const userAfter = await findUserPhoto('after');
const source =
  userBefore && userAfter
    ? { before: userBefore, after: userAfter, origin: 'user' }
    : { ...(await generatePair()), origin: 'generated' };

await mkdir(STUDIO_DIR, { recursive: true });
const before = await normalize(source.before, path.join(STUDIO_DIR, 'before.jpg'));
const after = await normalize(source.after, path.join(STUDIO_DIR, 'after.jpg'));
await writeFile(
  path.join(STUDIO_DIR, 'fixtures.json'),
  `${JSON.stringify({ origin: source.origin, before, after }, null, 2)}\n`,
);
console.log(
  `fixtures (${source.origin}): before ${before.width}x${before.height}, after ${after.width}x${after.height}`,
);
