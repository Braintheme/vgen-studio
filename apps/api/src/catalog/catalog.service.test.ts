import { describe, expect, it } from 'vitest';
import { createTestCatalog } from '../testing/catalog.js';

describe('CatalogService', () => {
  it('lists every installed engine unless it is disabled (e.g. the fake stub in production)', () => {
    expect(
      createTestCatalog()
        .listEngines()
        .map((engine) => engine.id),
    ).toEqual(['remotion', 'fake']);

    const production = createTestCatalog(['fake']);
    expect(production.listEngines().map((engine) => engine.id)).toEqual(['remotion']);
    const templates = production.listTemplates().map((template) => template.id);
    expect(templates).toContain('before-after');
    expect(templates).not.toContain('test-card');
    expect(() => production.getTemplate('test-card')).toThrow(/not found/);
  });
});
