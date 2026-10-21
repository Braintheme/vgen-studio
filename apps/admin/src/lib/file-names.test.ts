import { describe, expect, it } from 'vitest';
import { compareFileNames, fileStem } from './file-names';

const sorted = (names: readonly string[]): string[] => [...names].sort(compareFileNames);

describe('compareFileNames', () => {
  it('puts an original right before its edited copies', () => {
    expect(sorted(['IMG_2700-2.jpg', 'IMG_2703.jpg', 'IMG_2700.jpg', 'IMG_2703-2.jpg'])).toEqual([
      'IMG_2700.jpg',
      'IMG_2700-2.jpg',
      'IMG_2703.jpg',
      'IMG_2703-2.jpg',
    ]);
  });

  it('compares numbers by value and ignores case and extensions', () => {
    expect(sorted(['photo10.JPG', 'Photo9.png', 'photo9-edit.webp'])).toEqual([
      'Photo9.png',
      'photo9-edit.webp',
      'photo10.JPG',
    ]);
  });

  it('keeps before/after suffixes in alphabetical order', () => {
    expect(sorted(['x_before.jpg', 'x_after.jpg'])).toEqual(['x_after.jpg', 'x_before.jpg']);
    expect(fileStem('a.b.jpg')).toBe('a.b');
  });
});
