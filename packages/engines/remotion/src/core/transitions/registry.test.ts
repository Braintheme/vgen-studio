import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { computeLayout } from '../layout.js';
import { SEAM_TRANSITIONS, seamTransitionField } from './registry.js';
import type { TransitionDirection, TransitionFrame } from './types.js';

const layout = computeLayout(1080, 1920);
const frame = (id: (typeof SEAM_TRANSITIONS.ids)[number], progress: number, direction: TransitionDirection) =>
  SEAM_TRANSITIONS.get(id).frame({ progress, direction, layout }) as TransitionFrame;

const opacity = (value: TransitionFrame): number => Number(value.style?.['opacity'] ?? 1);

describe('seam transition registry', () => {
  it('has unique ids, including a hard cut', () => {
    expect(new Set(SEAM_TRANSITIONS.ids).size).toBe(SEAM_TRANSITIONS.items.length);
    expect(SEAM_TRANSITIONS.ids).toContain('none');
  });

  it.each(SEAM_TRANSITIONS.ids)('%s ends fully on the entering scene', (id) => {
    const end = frame(id, 1, 'entering');
    expect(opacity(end)).toBe(1);
    const transform = end.style?.['transform'];
    if (typeof transform === 'string') {
      expect(transform).toMatch(/translateY\(0(\.0+)?%\)|scale\(1(\.0+)?\)/);
    }
    expect(opacity(frame(id, 0, 'exiting'))).toBe(1);
  });

  it('a hard cut switches in the middle of the seam', () => {
    expect(opacity(frame('none', 0.49, 'entering'))).toBe(0);
    expect(opacity(frame('none', 0.5, 'entering'))).toBe(1);
  });

  it('soft focus never scales', () => {
    for (let step = 0; step <= 10; step += 1) {
      for (const direction of ['entering', 'exiting'] as const) {
        expect(frame('soft-focus', step / 10, direction).style?.['transform']).toBeUndefined();
      }
    }
  });
});

describe('seamTransitionField', () => {
  it('lists only the transitions a template allows, with registry labels', () => {
    const field = seamTransitionField({ title: 'Seam', allowed: ['fade', 'none'], default: 'fade' });
    const json = z.toJSONSchema(field) as unknown as { enum: string[]; optionLabels: Record<string, string> };
    expect(json.enum).toEqual(['fade', 'none']);
    expect(json.optionLabels).toEqual({ fade: 'Crossfade', none: 'Hard cut' });
  });
});
