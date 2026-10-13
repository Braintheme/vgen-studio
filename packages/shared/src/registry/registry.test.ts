import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RegistryError, TemplateDefinitionError } from '../errors.js';
import { defineTemplate } from '../template/definition.js';
import { imageSlot } from '../template/media-slots.js';
import { fixtureEngine, fixtureTemplate } from '../testing/fixtures.js';
import { buildRegistries } from './catalog-registries.js';
import { Registry } from './registry.js';
import { assertValidTemplate } from './validate-template.js';

const minimalTemplate = (
  overrides: { id?: string; engine?: string; defaults?: Record<string, unknown> } = {},
) =>
  defineTemplate({
    id: overrides.id ?? 'minimal',
    engine: overrides.engine ?? 'fixture',
    version: '1.0.0',
    name: 'Minimal',
    description: '',
    mediaSlots: [imageSlot('photo', { label: 'Photo', required: true })],
    duration: { default: 6, min: 3, max: 10 },
    texts: {},
    params: { level: z.number().min(0).max(1).default(0.5) },
    defaults: overrides.defaults ?? {},
    posterFrame: () => 0,
  });

describe('Registry', () => {
  it('registers, finds and lists in insertion order', () => {
    const registry = new Registry<{ id: string; n: number }>('Thing');
    registry.register({ id: 'a', n: 1 }).register({ id: 'b', n: 2 });
    expect(registry.get('b').n).toBe(2);
    expect(registry.find('zzz')).toBeUndefined();
    expect(registry.list().map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('rejects duplicates and unknown ids with coded errors', () => {
    const registry = new Registry<{ id: string }>('Thing').register({ id: 'a' });
    expect(() => registry.register({ id: 'a' })).toThrow(expect.objectContaining({ code: 'DUPLICATE_ID' }));
    expect(() => registry.get('nope')).toThrow(RegistryError);
  });
});

describe('buildRegistries', () => {
  it('collects templates of all engines', () => {
    const other = fixtureEngine({ id: 'other', templates: [minimalTemplate({ engine: 'other' })] });
    const { engines, templates } = buildRegistries([fixtureEngine(), other]);
    expect(engines.list().map((engine) => engine.id)).toEqual(['fixture', 'other']);
    expect(templates.get('fixture-card').engine).toBe('fixture');
    expect(templates.listByEngine('other').map((template) => template.id)).toEqual(['minimal']);
  });

  it('requires globally unique template ids', () => {
    const other = fixtureEngine({
      id: 'other',
      templates: [minimalTemplate({ id: 'fixture-card', engine: 'other' })],
    });
    expect(() => buildRegistries([fixtureEngine(), other])).toThrow(/already registered/);
  });

  it('rejects duplicate engines', () => {
    expect(() => buildRegistries([fixtureEngine(), fixtureEngine({ templates: [] })])).toThrow(RegistryError);
  });
});

describe('assertValidTemplate', () => {
  it('accepts the fixture template', () => {
    expect(() => {
      assertValidTemplate(fixtureTemplate, fixtureEngine());
    }).not.toThrow();
  });

  it('reports every problem at once', () => {
    const broken = {
      ...minimalTemplate({ id: 'Bad_Id', defaults: { params: { level: 5 } } }),
      formats: ['9:16', '1:1'] as const,
    };
    const engine = fixtureEngine({
      id: 'another',
      capabilities: { ...fixtureEngine().capabilities, formats: ['9:16'] },
    });
    try {
      assertValidTemplate(broken, engine);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TemplateDefinitionError);
      const problems = (error as TemplateDefinitionError).problems.join('\n');
      expect(problems).toMatch(/kebab-case/);
      expect(problems).toMatch(/defaults do not match/);
      expect(problems).toMatch(/provided by "another"/);
      expect(problems).toMatch(/not supported by engine "another": 1:1/);
    }
  });

  it('validates slot keys and slot actions', () => {
    const template = {
      ...minimalTemplate(),
      ui: { slotActions: [{ type: 'swap', slots: ['photo', 'missing'], label: 'Swap' }] as const },
    };
    expect(() => {
      assertValidTemplate(template);
    }).toThrow(/unknown slot "missing"/);
  });
});
