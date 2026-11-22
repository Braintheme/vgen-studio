import { describe, expect, it } from 'vitest';
import {
  copyName,
  CreateProjectRequestSchema,
  ProjectIdsRequestSchema,
  ProjectListQuerySchema,
  UpdateProjectRequestSchema,
} from './projects.js';
import { CreateRenderRequestSchema } from './renders.js';

const ID = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f';

describe('CreateProjectRequestSchema', () => {
  it('needs a template or a preset', () => {
    expect(CreateProjectRequestSchema.safeParse({}).success).toBe(false);
    expect(CreateProjectRequestSchema.parse({ templateId: 'preset-reel' })).toMatchObject({
      templateId: 'preset-reel',
      quality: 'social',
      scale: 1,
    });
    expect(CreateProjectRequestSchema.parse({ presetId: ID }).presetId).toBe(ID);
  });

  it('takes media as single ids, lists or empty slots', () => {
    const media = { before: ID, screens: [ID, ID], clip: null };
    expect(CreateProjectRequestSchema.parse({ templateId: 'x', media }).media).toEqual(media);
    expect(CreateProjectRequestSchema.safeParse({ templateId: 'x', media: { before: 'nope' } }).success).toBe(
      false,
    );
  });
});

describe('UpdateProjectRequestSchema', () => {
  it('rejects an empty update and blank names', () => {
    expect(UpdateProjectRequestSchema.safeParse({}).success).toBe(false);
    expect(UpdateProjectRequestSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(UpdateProjectRequestSchema.parse({ name: ' Tatras ' }).name).toBe('Tatras');
  });
});

describe('project queries', () => {
  it('keeps the page defaults and the rendered filter', () => {
    expect(ProjectListQuerySchema.parse({ rendered: 'no' })).toEqual({
      page: 1,
      pageSize: 20,
      rendered: 'no',
    });
  });

  it('limits bulk requests', () => {
    expect(ProjectIdsRequestSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(ProjectIdsRequestSchema.safeParse({ ids: Array.from({ length: 501 }, () => ID) }).success).toBe(
      false,
    );
  });
});

describe('CreateRenderRequestSchema', () => {
  it('defaults to no project', () => {
    expect(CreateRenderRequestSchema.parse({ templateId: 'x', props: {} }).projectId).toBeNull();
  });
});

describe('copyName', () => {
  it('marks a copy and keeps the name within the limit', () => {
    expect(copyName('Golden Lake')).toBe('Golden Lake (copy)');
    expect(copyName('x'.repeat(256))).toHaveLength(256);
  });
});
