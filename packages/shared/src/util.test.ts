import { describe, expect, it } from 'vitest';
import { deepMerge, isDeepEqual } from './util.js';

describe('deepMerge', () => {
  it('merges nested objects without mutating inputs', () => {
    const base = { a: 1, nested: { x: 1, y: 2 }, list: [1, 2] };
    const override = { nested: { y: 3 }, list: [9], extra: true };
    const merged = deepMerge(base, override);
    expect(merged).toEqual({ a: 1, nested: { x: 1, y: 3 }, list: [9], extra: true });
    expect(base).toEqual({ a: 1, nested: { x: 1, y: 2 }, list: [1, 2] });
  });

  it('ignores undefined and lets null override', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: undefined, b: null })).toEqual({ a: 1, b: null });
  });
});

describe('isDeepEqual', () => {
  it('compares nested data regardless of key order', () => {
    expect(isDeepEqual({ a: 1, b: { c: [1, { d: 2 }] } }, { b: { c: [1, { d: 2 }] }, a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(isDeepEqual([1, 2], [2, 1])).toBe(false);
    expect(isDeepEqual({ a: null }, { a: 0 })).toBe(false);
  });
});
