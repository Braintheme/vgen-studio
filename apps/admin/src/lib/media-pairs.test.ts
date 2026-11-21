import type { UiSlotAction } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { nextPageParam, uniqueById } from './media-library';
import { orderByName, pairOf } from './media-pairs';

const SWAP: UiSlotAction[] = [{ type: 'swap', slots: ['before', 'after'], label: 'Swap before / after' }];

describe('pairOf', () => {
  it('finds the pair from either of its slots', () => {
    expect(pairOf(SWAP, 'before')).toEqual(['before', 'after']);
    expect(pairOf(SWAP, 'after')).toEqual(['before', 'after']);
  });

  it('is null for other slots and templates without a swap', () => {
    expect(pairOf(SWAP, 'clip')).toBeNull();
    expect(pairOf(undefined, 'before')).toBeNull();
  });
});

describe('orderByName', () => {
  it('puts the original before its edited export, whatever the input order', () => {
    const names = ['IMG_1234-2.jpg', 'IMG_1234.jpg'];
    expect(orderByName(names, (name) => name)).toEqual(['IMG_1234.jpg', 'IMG_1234-2.jpg']);
    expect(orderByName([...names].reverse(), (name) => name)).toEqual(['IMG_1234.jpg', 'IMG_1234-2.jpg']);
  });
});

describe('orderByName: marked names', () => {
  it('puts an "Original" before an "Edited" one, though "Edited" sorts first', () => {
    expect(orderByName(['IMG_5471_Edited.jpg', 'IMG_5471_Original.jpg'], (name) => name)).toEqual([
      'IMG_5471_Original.jpg',
      'IMG_5471_Edited.jpg',
    ]);
  });

  it('reads raw / before / after and "unedited" as the original', () => {
    expect(orderByName(['shot-after.jpg', 'shot-before.jpg'], (name) => name)).toEqual([
      'shot-before.jpg',
      'shot-after.jpg',
    ]);
    expect(orderByName(['a_edit.jpg', 'a_RAW.jpg'], (name) => name)).toEqual(['a_RAW.jpg', 'a_edit.jpg']);
    expect(orderByName(['b_edited.jpg', 'b_unedited.jpg'], (name) => name)).toEqual([
      'b_unedited.jpg',
      'b_edited.jpg',
    ]);
  });
});

describe('nextPageParam', () => {
  it('asks for the next page while files remain', () => {
    expect(nextPageParam({ page: 1, pageSize: 24, total: 30 })).toBe(2);
    expect(nextPageParam({ page: 2, pageSize: 24, total: 30 })).toBeUndefined();
    expect(nextPageParam({ page: 1, pageSize: 24, total: 24 })).toBeUndefined();
  });
});

describe('uniqueById', () => {
  it('keeps the first of repeated items (pages shifted by a new upload)', () => {
    expect(
      uniqueById([
        { id: 'a', n: 1 },
        { id: 'b', n: 2 },
        { id: 'a', n: 3 },
      ]),
    ).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
    ]);
  });
});
