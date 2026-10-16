import { describe, expect, it } from 'vitest';
import { gradeFilter, TABLE_STEPS, wheelTint } from './filter.js';
import { videoGradeField, type VideoGrade } from './schema.js';

const grade = (overrides: Record<string, unknown> = {}): VideoGrade => videoGradeField().parse(overrides);
const mid = TABLE_STEPS / 2;

describe('clip grade filter', () => {
  it('is absent for a neutral grade (ungraded clips render as before)', () => {
    expect(gradeFilter(grade())).toBeNull();
    expect(gradeFilter(grade({ wheels: { shadows: { hue: 200, amount: 0 } } }))).toBeNull();
  });

  it('brightens with exposure and keeps the tables monotonic', () => {
    const filter = gradeFilter(grade({ exposure: 50, contrast: 30 }));
    expect(filter).not.toBeNull();
    for (const table of filter?.tables ?? []) {
      expect(table).toHaveLength(TABLE_STEPS + 1);
      expect(table[mid]).toBeGreaterThan(0.5);
      table.slice(1).forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(table[index] ?? 0);
      });
    }
  });

  it('warms with temperature: more red than blue', () => {
    const [red, , blue] = gradeFilter(grade({ temperature: 60 }))?.tables ?? [[], [], []];
    expect(red[mid] ?? 0).toBeGreaterThan(blue[mid] ?? 1);
  });

  it('tints a zone towards the wheel hue without changing its overall brightness', () => {
    const tint = wheelTint({ hue: 210, amount: 100 });
    expect(tint[0] + tint[1] + tint[2]).toBeCloseTo(0);
    expect(tint[2]).toBeGreaterThan(tint[0]);
    const [red, , blue] = gradeFilter(grade({ wheels: { shadows: { hue: 210, amount: 80 } } }))?.tables ?? [
      [],
      [],
      [],
    ];
    // Shadows go blue, the white point barely moves.
    expect(blue[4] ?? 0).toBeGreaterThan(red[4] ?? 0);
    expect(Math.abs((blue[TABLE_STEPS] ?? 0) - (red[TABLE_STEPS] ?? 0))).toBeLessThan(0.01);
  });

  it('turns saturation into a colour matrix that keeps greys grey', () => {
    const matrix = gradeFilter(grade({ saturation: -100 }))?.matrix ?? [];
    // Fully desaturated: every row is the luminance weights.
    expect(matrix.slice(0, 3)).toEqual(matrix.slice(5, 8));
    expect((matrix[0] ?? 0) + (matrix[1] ?? 0) + (matrix[2] ?? 0)).toBeCloseTo(1);
  });
});
