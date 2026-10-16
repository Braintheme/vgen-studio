// Synthesizes the Remotion engine's built-in sound effects (our own, license-free sounds):
// a camera shutter, a swoosh and a tick. Deterministic: the same files on every run.
// Usage: pnpm --filter @vgen/devtools sfx [--out=packages/engines/remotion/src/core/audio/sfx]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { out: { type: 'string', default: 'packages/engines/remotion/src/core/audio/sfx' } },
});
const ROOT = path.resolve(process.env['INIT_CWD'] ?? process.cwd());
const SAMPLE_RATE = 48_000;

/** Seeded white noise in [-1, 1] (mulberry32). */
const noise = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
};

/** RBJ band-pass biquad whose centre frequency may change per sample. */
const bandPass = (q: number) => {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (input: number, frequency: number): number => {
    const w = (2 * Math.PI * frequency) / SAMPLE_RATE;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const output =
      (alpha / a0) * input - (alpha / a0) * x2 - ((-2 * Math.cos(w)) / a0) * y1 - ((1 - alpha) / a0) * y2;
    x2 = x1;
    x1 = input;
    y2 = y1;
    y1 = output;
    return output;
  };
};

const render = (seconds: number, sample: (t: number) => number): Float32Array => {
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let index = 0; index < out.length; index += 1) out[index] = sample(index / SAMPLE_RATE);
  return out;
};

/** Peak-normalizes to `peakDb` dBFS and adds 5 ms fades at both ends. */
const finish = (samples: Float32Array, peakDb = -3): Float32Array => {
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1;
  const gain = 10 ** (peakDb / 20) / peak;
  const fade = Math.round(0.005 * SAMPLE_RATE);
  return samples.map((value, index) => {
    const edge = Math.min(1, index / fade, (samples.length - 1 - index) / fade);
    return value * gain * edge;
  });
};

const wav = (samples: Float32Array): Buffer => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, index) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), index * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

/**
 * DSLR shutter: the mirror slap (a bright click with a short low thump), the curtain
 * ~70 ms later (thinner, higher), and a faint mechanical rattle in between.
 */
const shutter = (): Float32Array => {
  const random = noise(7);
  const clickA = bandPass(1.4);
  const clickB = bandPass(1.8);
  const rattle = bandPass(3);
  const second = 0.07;
  return finish(
    render(0.32, (t) => {
      const n = random();
      const a = clickA(n, 2800) * Math.exp(-t / 0.009) * 2.2;
      const thump = Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t / 0.022) * 0.55;
      const tb = t - second;
      const b = tb >= 0 ? clickB(n, 4600) * Math.exp(-tb / 0.006) * 1.6 : clickB(0, 4600);
      const thumpB = tb >= 0 ? Math.sin(2 * Math.PI * 190 * tb) * Math.exp(-tb / 0.015) * 0.3 : 0;
      const r = rattle(n, 1900) * Math.exp(-t / 0.05) * 0.25;
      return a + thump + b + thumpB + r;
    }),
    -2,
  );
};

/**
 * Swoosh: noise through a band-pass sweeping up and back down, with a quick swell and a
 * longer tail (an object passing the camera).
 */
const swoosh = (): Float32Array => {
  const random = noise(23);
  const filterA = bandPass(1.1);
  const filterB = bandPass(2.2);
  const length = 0.75;
  const peakAt = 0.32;
  return finish(
    render(length, (t) => {
      const u = t / length;
      const sweep = u < peakAt / length ? t / peakAt : 1 - (t - peakAt) / (length - peakAt);
      const frequency = 450 + 3200 * Math.sin((Math.PI / 2) * Math.max(0, Math.min(1, sweep)));
      const envelope =
        t < peakAt ? Math.sin((Math.PI / 2) * (t / peakAt)) ** 2 : Math.exp(-(t - peakAt) / 0.12);
      const n = random();
      return (filterA(n, frequency) * 0.8 + filterB(n, frequency * 1.6) * 0.4) * envelope;
    }),
    -4,
  );
};

/**
 * Tick: a short, soft wooden click (a bright transient over a quick low body), for rhythmic
 * changes such as the next preset coming in.
 */
const tick = (): Float32Array => {
  const random = noise(41);
  const click = bandPass(2.5);
  return finish(
    render(0.14, (t) => {
      const transient = click(random(), 3200) * Math.exp(-t / 0.004) * 1.4;
      const body = Math.sin(2 * Math.PI * 820 * t) * Math.exp(-t / 0.018) * 0.7;
      const low = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t / 0.03) * 0.35;
      return transient + body + low;
    }),
    -6,
  );
};

const outDir = path.resolve(ROOT, values.out);
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'shutter.wav'), wav(shutter()));
await writeFile(path.join(outDir, 'swoosh.wav'), wav(swoosh()));
await writeFile(path.join(outDir, 'tick.wav'), wav(tick()));
console.log(`sfx: shutter.wav, swoosh.wav, tick.wav -> ${path.relative(ROOT, outDir)}`);
