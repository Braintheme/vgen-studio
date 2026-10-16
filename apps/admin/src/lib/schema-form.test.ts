import { defineTemplate, imageSlot, soundEffectField, textField, videoRangeField } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildFormSections, childPaths, visibleSections, type FieldSpec } from './schema-form';

const template = defineTemplate({
  id: 'form-test',
  engine: 'fixture',
  version: '1.0.0',
  name: 'Form test',
  description: '',
  mediaSlots: [imageSlot('photo', { label: 'Photo', required: true })],
  duration: { default: 10, min: 5, max: 20 },
  texts: {
    title: textField({ label: 'Title', default: 'Hi', maxLength: 40 }),
    note: textField({ label: 'Note', default: '', multiline: true }),
  },
  params: {
    effect: z
      .enum(['a', 'b', 'c', 'd'])
      .default('a')
      .meta({ title: 'Effect', optionLabels: { a: 'Alpha' } }),
    mode: z.enum(['x', 'y']).default('x'),
    strength: z.number().min(0).max(2).default(1).meta({ step: 0.1 }),
    count: z.number().int().min(1).default(3),
    clip: videoRangeField({ label: 'Clip', minSec: 3, maxSec: 30, defaultSec: 10 }),
    shutter: soundEffectField({ label: 'Shutter' }),
  },
  posterFrame: () => 0,
});

const schema = z.toJSONSchema(template.settingsSchema, { io: 'input' }) as Record<string, unknown>;
const field = (fields: readonly FieldSpec[], path: string): FieldSpec | undefined =>
  fields.find((f) => f.path === path);

describe('buildFormSections', () => {
  const [base, params, texts, style, music] = buildFormSections(
    schema,
    [
      { id: 'base', title: 'Base', paths: ['format', 'durationSec', 'fps'] },
      { id: 'params', title: 'Params', paths: ['params'] },
      { id: 'texts', title: 'Texts', paths: childPaths(schema, 'texts') },
      { id: 'style', title: 'Style', paths: ['style'] },
      { id: 'music', title: 'Music', paths: ['music'] },
      { id: 'empty', title: 'Nothing', paths: ['missing.path'] },
    ],
    ['seed'],
  );

  it('maps base fields to widgets from metadata', () => {
    expect(field(base?.fields ?? [], 'format')).toMatchObject({ kind: 'select', label: 'Format' });
    expect(field(base?.fields ?? [], 'durationSec')).toMatchObject({
      kind: 'slider',
      min: 5,
      max: 20,
      step: 0.5,
      unit: 's',
      defaultValue: 10,
    });
    expect(field(base?.fields ?? [], 'fps')).toMatchObject({
      kind: 'segmented',
      options: [
        { value: 30, label: '30 fps' },
        { value: 60, label: '60 fps' },
      ],
    });
  });

  it('infers widgets when no metadata is given', () => {
    const fields = params?.fields ?? [];
    expect(field(fields, 'params.effect')).toMatchObject({
      kind: 'select',
      options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'b' }, {}, {}],
    });
    expect(field(fields, 'params.mode')).toMatchObject({ kind: 'segmented', label: 'Mode' });
    expect(field(fields, 'params.strength')).toMatchObject({ kind: 'slider', step: 0.1, defaultValue: 1 });
    expect(field(fields, 'params.count')).toMatchObject({ kind: 'number', min: 1, max: null });
  });

  it('renders template texts as toggleable text fields', () => {
    expect(texts?.fields).toEqual([
      { kind: 'text', path: 'texts.title', label: 'Title', multiline: false, maxLength: 40 },
      { kind: 'text', path: 'texts.note', label: 'Note', multiline: true, maxLength: 120 },
    ]);
  });

  it('expands nested objects (style) and labels fonts with family names', () => {
    expect(field(style?.fields ?? [], 'style.fonts.heading')).toMatchObject({ kind: 'font' });
    const heading = field(style?.fields ?? [], 'style.fonts.heading');
    expect(
      heading && 'options' in heading
        ? heading.options.find((o) => o.value === 'playfair-display')?.label
        : null,
    ).toBe('Playfair Display');
    expect(field(style?.fields ?? [], 'style.colors.accent')).toMatchObject({
      kind: 'color',
      label: 'Accent',
    });
  });

  it('describes unknown widgets as custom fields and drops empty sections', () => {
    expect(music?.fields.map((f) => [f.path, f.kind])).toEqual([
      ['music.enabled', 'switch'],
      ['music.trackId', 'custom'],
      ['music.startSec', 'custom'],
      ['music.volume', 'slider'],
      ['music.fadeInSec', 'slider'],
      ['music.fadeOutSec', 'slider'],
    ]);
    expect(field(music?.fields ?? [], 'music.startSec')).toMatchObject({
      kind: 'custom',
      widget: 'music-region',
      label: 'Fragment start',
    });
    expect(buildFormSections(schema, [{ id: 'x', title: 'X', paths: ['seed'] }], ['seed'])).toEqual([]);
  });

  it('keeps objects with a custom widget as one field, with their limits', () => {
    expect(field(params?.fields ?? [], 'params.clip')).toEqual({
      kind: 'custom',
      path: 'params.clip',
      label: 'Clip',
      widget: 'video-range',
      limits: { min: 3, max: 30 },
      defaults: { startSec: 0, endSec: 10 },
    });
    expect(field(params?.fields ?? [], 'params.shutter')).toMatchObject({
      kind: 'custom',
      widget: 'sound-effect',
      limits: null,
      defaults: { enabled: true, trackId: null, volume: 0.8 },
    });
    expect(params?.fields.some((f) => f.path.startsWith('params.clip.'))).toBe(false);
  });
});

describe('columns', () => {
  const side = (title: string) =>
    z
      .object({
        look: z.enum(['none', 'flat']).default('none').meta({ title: 'Look', widget: 'select' }),
        exposure: z.number().min(-100).max(100).default(0).meta({ title: 'Exposure', widget: 'slider' }),
      })
      .prefault({})
      .meta({ title });
  const columnsSchema = z.toJSONSchema(
    z.object({
      adjust: z
        .object({ before: side('Before'), after: side('After') })
        .prefault({})
        .meta({ title: 'Photo adjustments', widget: 'columns' }),
    }),
    { io: 'input' },
  ) as Record<string, unknown>;

  it('keeps an object with the columns widget as one field, its children as columns', () => {
    const [section] = buildFormSections(columnsSchema, [
      { id: 'photos', title: 'Photos', paths: ['adjust'] },
    ]);
    expect(section?.fields).toHaveLength(1);
    const columns = section?.fields[0];
    if (columns?.kind !== 'columns') throw new Error('expected a columns field');
    expect(columns.columns.map((column) => column.label)).toEqual(['Before', 'After']);
    expect(columns.columns[0]?.fields.map((f) => [f.path, f.kind])).toEqual([
      ['adjust.before.look', 'select'],
      ['adjust.before.exposure', 'slider'],
    ]);
    expect(columns.columns[1]?.fields.map((f) => f.path)).toEqual([
      'adjust.after.look',
      'adjust.after.exposure',
    ]);
  });
});

describe('visibleSections', () => {
  const sections = buildFormSections(schema, [
    { id: 'always', title: 'Always', paths: ['params.mode'] },
    {
      id: 'when-y',
      title: 'Y only',
      paths: ['params.strength'],
      visibleWhen: { field: 'params.mode', equals: ['y'] },
    },
  ]);

  it('shows a conditional group only while its field holds a listed value', () => {
    expect(visibleSections(sections, { params: { mode: 'x' } }).map((s) => s.id)).toEqual(['always']);
    expect(visibleSections(sections, { params: { mode: 'y' } }).map((s) => s.id)).toEqual([
      'always',
      'when-y',
    ]);
    expect(visibleSections(sections, {}).map((s) => s.id)).toEqual(['always']);
  });
});
