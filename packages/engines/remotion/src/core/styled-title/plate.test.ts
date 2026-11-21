import { describe, expect, it } from 'vitest';
import { fitScale, plateCorners, plateRuns, roundedPath } from './plate.js';

describe('plateRuns', () => {
  it('splits the text into runs of non-blank lines', () => {
    expect(plateRuns(['a', '', ' ', 'b'])).toEqual([
      { start: 0, lines: ['a'] },
      { start: 3, lines: ['b'] },
    ]);
  });

  it('has no runs for blank text', () => {
    expect(plateRuns(['', '  '])).toEqual([]);
  });
});

describe('plateCorners', () => {
  it('is a rectangle for one row', () => {
    expect(plateCorners([{ left: 10, right: 90 }], 40, 4)).toEqual([
      { x: 10, y: 0 },
      { x: 90, y: 0 },
      { x: 90, y: 40 },
      { x: 10, y: 40 },
    ]);
  });

  it('steps out for a wider second row, clockwise', () => {
    expect(
      plateCorners(
        [
          { left: 20, right: 80 },
          { left: 0, right: 100 },
        ],
        40,
        4,
      ),
    ).toEqual([
      { x: 20, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
      { x: 0, y: 40 },
      { x: 20, y: 40 },
    ]);
  });

  it('merges edges closer than the snap into the wider one', () => {
    expect(
      plateCorners(
        [
          { left: 2, right: 99 },
          { left: 0, right: 100 },
        ],
        40,
        4,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ]);
  });
});

describe('roundedPath', () => {
  it('rounds every corner once and closes the shape', () => {
    const corners = plateCorners(
      [
        { left: 20, right: 80 },
        { left: 0, right: 100 },
      ],
      40,
      4,
    );
    const path = roundedPath(corners, 12);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(corners.length);
  });
});

describe('fitScale', () => {
  it('shrinks only what is wider than the room', () => {
    expect(fitScale(2000, 1000)).toBe(0.5);
    expect(fitScale(500, 1000)).toBe(1);
  });
});
