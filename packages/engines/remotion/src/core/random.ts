// Pure, seeded pseudo-randomness (no Math.random): identical output for identical input.

const hash = (input: string): number => {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

/** Deterministic pseudo-random number in [0, 1) for a seed + key pair (mulberry32). */
export const seeded = (seed: number, key: string): number => {
  let state = (hash(`${seed}:${key}`) + 0x6d2b79f5) | 0;
  state = Math.imul(state ^ (state >>> 15), 1 | state);
  state = (state + Math.imul(state ^ (state >>> 7), 61 | state)) ^ state;
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
};

/** Deterministic value in [min, max). */
export const seededRange = (seed: number, key: string, min: number, max: number): number =>
  min + seeded(seed, key) * (max - min);
