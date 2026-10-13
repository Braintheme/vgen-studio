import { describe, expect, it } from 'vitest';
import { distributeFrames } from './distribute.js';

const sum = (segments: { durationInFrames: number }[]) =>
  segments.reduce((total, s) => total + s.durationInFrames, 0);

describe('distributeFrames', () => {
  it('splits proportionally and keeps the exact total', () => {
    const segments = distributeFrames(
      [
        { id: 'a', weight: 1 },
        { id: 'b', weight: 2 },
        { id: 'c', weight: 1 },
      ],
      390,
    );
    expect(sum(segments)).toBe(390);
    expect(segments.map((s) => s.durationInFrames)).toEqual([98, 195, 97]);
    expect(segments.map((s) => s.from)).toEqual([0, 98, 293]);
  });

  it('honors minimums and redistributes the rest', () => {
    const segments = distributeFrames(
      [
        { id: 'intro', weight: 1, minFrames: 45 },
        { id: 'main', weight: 10 },
        { id: 'outro', weight: 1, minFrames: 60 },
      ],
      240,
    );
    expect(segments[0]?.durationInFrames).toBe(45);
    expect(segments[2]?.durationInFrames).toBe(60);
    expect(segments[1]?.durationInFrames).toBe(135);
    expect(sum(segments)).toBe(240);
  });

  it('scales with the total for every reasonable duration', () => {
    for (let total = 120; total <= 1800; total += 7) {
      const segments = distributeFrames(
        [
          { id: 'a', weight: 1.5, minFrames: 36 },
          { id: 'b', weight: 3 },
          { id: 'c', weight: 2 },
          { id: 'd', weight: 2.5, minFrames: 45 },
        ],
        total,
      );
      expect(sum(segments)).toBe(total);
      expect(segments[0]?.durationInFrames).toBeGreaterThanOrEqual(36);
      expect(segments[3]?.durationInFrames).toBeGreaterThanOrEqual(45);
    }
  });

  it('rejects impossible input', () => {
    expect(() => distributeFrames([{ id: 'a', weight: 1, minFrames: 100 }], 50)).toThrow(RangeError);
    expect(() => distributeFrames([{ id: 'a', weight: 0 }], 50)).toThrow(RangeError);
    expect(() => distributeFrames([{ id: 'a', weight: 1 }], 0)).toThrow(RangeError);
    expect(distributeFrames([], 10)).toEqual([]);
  });
});
