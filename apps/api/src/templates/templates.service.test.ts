import { describe, expect, it } from 'vitest';
import { createTestCatalog } from '../testing/catalog.js';
import { NotFoundError } from '../common/errors.js';
import { TemplatesService } from './templates.service.js';

describe('TemplatesService', () => {
  const service = new TemplatesService(createTestCatalog());

  it('lists templates with slots, filtered by engine', () => {
    expect(service.list().map((template) => template.id)).toContain('before-after');
    expect(service.list('remotion')[0]?.mediaSlots.map((slot) => slot.key)).toEqual(['before', 'after']);
    expect(service.list('unknown-engine')).toEqual([]);
  });

  it('exposes the props JSON Schema with field metadata, defaults and UI hints', () => {
    const detail = service.get('before-after');
    const properties = detail.propsSchema['properties'] as Record<
      string,
      { properties?: Record<string, Record<string, unknown>> }
    >;
    const params = properties['params']?.properties ?? {};
    expect(params['outroTransition']?.['enum']).toEqual([
      'fade',
      'soft-focus',
      'light-pass',
      'slide-up',
      'none',
    ]);
    expect(params['revealEffect']?.['widget']).toBe('select');
    expect(detail.defaults).toMatchObject({ durationSec: 13, format: '9:16' });
    expect(detail.defaults).not.toHaveProperty('media');
    expect(detail.ui?.slotActions?.[0]).toMatchObject({ type: 'swap', slots: ['before', 'after'] });
  });

  it('404s unknown templates', () => {
    expect(() => service.get('nope')).toThrow(NotFoundError);
  });
});
