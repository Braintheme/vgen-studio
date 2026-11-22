import type { RenderJobDto } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { checkState, isSavable, renderFile, totalBytes } from './render-files';

const render = (overrides: Partial<RenderJobDto>): RenderJobDto =>
  ({
    id: '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
    status: 'done',
    outputName: 'reel.mp4',
    output: null,
    stills: null,
    ...overrides,
  }) as RenderJobDto;

const video = render({
  output: { assetId: 'a', url: '/f', downloadUrl: '/f?download=1', size: 1000, durationSec: 13 },
});
const slides = render({
  outputName: 'carousel.zip',
  stills: {
    archiveUrl: '/api/v1/renders/x/archive',
    slides: [
      {
        assetId: 'b',
        url: '/b',
        downloadUrl: '/b?download=1',
        name: '1.jpg',
        size: 200,
        width: 1,
        height: 1,
      },
      {
        assetId: 'c',
        url: '/c',
        downloadUrl: '/c?download=1',
        name: '2.jpg',
        size: 300,
        width: 1,
        height: 1,
      },
    ],
  },
});

describe('renderFile', () => {
  it('saves a video as its file and an image render as its ZIP', () => {
    expect(renderFile(video)).toEqual({ url: '/f?download=1', name: 'reel.mp4', bytes: 1000 });
    expect(renderFile(slides)).toEqual({
      url: '/api/v1/renders/x/archive',
      name: 'carousel.zip',
      bytes: 500,
    });
  });

  it('has nothing to save for renders that are not done or lost their files', () => {
    expect(isSavable({ ...video, status: 'failed' })).toBe(false);
    expect(isSavable({ ...video, status: 'rendering' })).toBe(false);
    expect(isSavable(render({}))).toBe(false);
  });

  it('sums the sizes of savable renders', () => {
    expect(totalBytes([video, slides, render({})])).toBe(1500);
  });
});

describe('checkState', () => {
  it('is checked for all, mixed for some, empty for none', () => {
    expect(checkState(3, 3)).toBe(true);
    expect(checkState(1, 3)).toBe('indeterminate');
    expect(checkState(0, 3)).toBe(false);
    expect(checkState(0, 0)).toBe(false);
  });
});
