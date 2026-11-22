import type { ProjectLastRender } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { projectStatus } from './project-status';

const NOW = new Date('2026-11-22T15:00:00Z');
const render = (overrides: Partial<ProjectLastRender>): ProjectLastRender => ({
  id: '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
  status: 'done',
  progress: 100,
  error: null,
  createdAt: '2026-11-22T12:00:00Z',
  finishedAt: '2026-11-22T12:01:00Z',
  ...overrides,
});
const status = (lastRender: ProjectLastRender | null, updatedAt = '2026-11-22T11:00:00Z') =>
  projectStatus({ lastRender, updatedAt }, 'UTC', NOW);

describe('projectStatus', () => {
  it('is "Not rendered" without a render', () => {
    expect(status(null)).toEqual({
      tone: 'idle',
      label: 'Not rendered',
      editedSinceRender: false,
      renderId: null,
    });
  });

  it('follows the last render', () => {
    expect(status(render({ status: 'queued', progress: 0 })).label).toBe('Queued');
    expect(status(render({ status: 'rendering', progress: 40 }))).toMatchObject({
      tone: 'active',
      label: 'Rendering 40%',
    });
    expect(status(render({ status: 'failed' }))).toMatchObject({ tone: 'failed', label: 'Render failed' });
  });

  it('says when it was rendered: the time today, the day before', () => {
    expect(status(render({})).label).toMatch(/^Rendered \d{2}:\d{2}/);
    expect(status(render({ finishedAt: '2026-11-20T12:01:00Z' })).label).toBe('Rendered Fri, 20 Nov');
  });

  it('notes content edited after the render started', () => {
    expect(status(render({})).editedSinceRender).toBe(false);
    expect(status(render({}), '2026-11-22T12:30:00Z').editedSinceRender).toBe(true);
  });
});
