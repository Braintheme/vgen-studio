import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { computeLayout } from '../layout.js';
import type { SceneNode } from '../scene/spec.js';
import { REVEAL_EFFECTS, revealEffectField } from './registry.js';

const input = (progress: number, format: [number, number] = [1080, 1920]) => ({
  progress,
  layout: computeLayout(...format),
  accent: '#f5c518',
  beforeLabel: 'Before',
  afterLabel: 'After',
  seed: 7,
});

const photos = (nodes: readonly SceneNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind === 'photo') return [node.source];
    if (node.kind === 'fill' || node.kind === 'box') return photos(node.children ?? []);
    return [];
  });

describe('reveal effect registry', () => {
  it('has unique ids and labels', () => {
    expect(new Set(REVEAL_EFFECTS.ids).size).toBe(REVEAL_EFFECTS.items.length);
    for (const effect of REVEAL_EFFECTS.items) {
      expect(effect.label.length).toBeGreaterThan(0);
    }
  });

  it.each(REVEAL_EFFECTS.ids)('%s renders every phase, in every format, deterministically', (id) => {
    const effect = REVEAL_EFFECTS.get(id);
    for (const format of [
      [1080, 1920],
      [1920, 1080],
      [1080, 1080],
      [1080, 1350],
    ] as [number, number][]) {
      for (let step = 0; step <= 20; step += 1) {
        const nodes = effect.render(input(step / 20, format));
        expect(nodes.length).toBeGreaterThan(0);
        expect(effect.render(input(step / 20, format))).toEqual(nodes);
      }
    }
    expect(photos(effect.render(input(0)))).toContain('before');
    expect(photos(effect.render(input(1)))).toContain('after');
  });
});

describe('revealEffectField', () => {
  it('offers every registered effect by default', () => {
    const field = revealEffectField({ title: 'Effect', default: 'blinds' });
    const json = z.toJSONSchema(field) as unknown as {
      enum: string[];
      default: string;
      optionLabels: Record<string, string>;
    };
    expect(json.enum).toEqual([...REVEAL_EFFECTS.ids]);
    expect(json.default).toBe('blinds');
    expect(Object.keys(json.optionLabels)).toEqual([...REVEAL_EFFECTS.ids]);
  });

  it('can be restricted by a template and validates its default', () => {
    const field = revealEffectField({
      title: 'Effect',
      allowed: ['blinds', 'split-slider'],
      default: 'blinds',
    });
    expect(field.safeParse('diagonal-wipe').success).toBe(false);
    expect(() =>
      revealEffectField({ title: 'Effect', allowed: ['blinds'], default: 'split-slider' as 'blinds' }),
    ).toThrow(/not in the allowed list/);
  });
});
