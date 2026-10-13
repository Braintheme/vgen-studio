import type { StylePresetEntity } from '@vgen/db';
import { describe, expect, it, vi } from 'vitest';
import { createTestCatalog } from '../testing/catalog.js';
import { NotFoundError, ValidationFailedError } from '../common/errors.js';
import type { PresetsRepository } from './presets.repository.js';
import { PresetsService } from './presets.service.js';

const setup = (hasDefault = false) => {
  const repository = {
    save: vi.fn((preset: Partial<StylePresetEntity>) =>
      Promise.resolve({
        id: 'p1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...preset,
      } as StylePresetEntity),
    ),
    hasDefault: vi.fn(() => Promise.resolve(hasDefault)),
    findById: vi.fn(),
  };
  return {
    repository,
    service: new PresetsService(repository as unknown as PresetsRepository, createTestCatalog()),
  };
};

describe('PresetsService', () => {
  it('stores only style fields and makes the first preset the default', async () => {
    const { service } = setup(false);
    const preset = await service.create({
      name: 'Moody',
      templateId: 'before-after',
      props: {
        media: { before: 'x' },
        format: '4:5',
        texts: { title: { enabled: true, value: 'Content!' }, beforeLabel: { enabled: true, value: 'RAW' } },
        params: { revealEffect: 'blinds' },
      },
    });
    expect(preset.isDefault).toBe(true);
    expect(preset.templateVersion).toBe('1.0.0');
    expect(preset.props).not.toHaveProperty('media');
    // A preset captures the complete look: every style field, content texts excluded.
    expect(preset.props['texts']).toEqual({
      beforeLabel: { enabled: true, value: 'RAW' },
      afterLabel: { enabled: true, value: 'After' },
    });
    expect(preset.props).toMatchObject({ format: '4:5', params: { revealEffect: 'blinds' } });
  });

  it('does not steal the default from an existing preset', async () => {
    const { service } = setup(true);
    expect((await service.create({ name: 'Second', templateId: 'before-after', props: {} })).isDefault).toBe(
      false,
    );
  });

  it('rejects style that is invalid for the current template', async () => {
    const { service } = setup();
    const invalid = service.create({
      name: 'Bad',
      templateId: 'before-after',
      props: { params: { revealEffect: 'spin' } },
    });
    await expect(invalid).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(invalid).rejects.toMatchObject({
      details: [expect.objectContaining({ path: 'props.params.revealEffect' })],
    });
  });

  it('404s unknown templates and presets', async () => {
    const { service, repository } = setup();
    await expect(service.create({ name: 'X', templateId: 'nope', props: {} })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    repository.findById.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'Y' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
