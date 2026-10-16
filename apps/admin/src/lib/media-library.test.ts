import type { MediaLibraryItemDto } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { summarizeSelection, toMediaTiles } from './media-library';

const item = (id: string, overrides: Partial<MediaLibraryItemDto> = {}): MediaLibraryItemDto => ({
  id,
  kind: 'image',
  role: 'upload',
  originalName: `${id}.jpg`,
  mime: 'image/jpeg',
  size: 1024,
  width: 10,
  height: 10,
  durationSec: null,
  createdAt: '2026-10-10T10:00:00.000Z',
  url: `/api/v1/media/${id}/file`,
  previewUrl: null,
  peaksUrl: null,
  video: null,
  renderCount: 0,
  ...overrides,
});

describe('media library helpers', () => {
  it('maps items to tiles with their draft usage and selection', () => {
    const tiles = toMediaTiles(
      [item('a'), item('b', { kind: 'video', durationSec: 65 })],
      new Map([['a', ['Preset Flip']]]),
      new Set(['b']),
      new Date('2026-10-12T10:00:00.000Z'),
    );
    expect(tiles[0]).toMatchObject({
      id: 'a',
      draftTemplates: ['Preset Flip'],
      selected: false,
      durationLabel: null,
    });
    expect(tiles[1]).toMatchObject({
      id: 'b',
      draftTemplates: [],
      selected: true,
      durationLabel: '1:05 min',
    });
  });

  it('sums the selection and counts what still uses it', () => {
    const summary = summarizeSelection(
      [item('a', { size: 100, renderCount: 2 }), item('b', { size: 50 }), item('c', { size: 5 })],
      new Map([['c', ['Preset Reel']]]),
    );
    expect(summary).toEqual({ count: 3, bytes: 155, inRenders: 1, inDrafts: 1 });
  });
});
