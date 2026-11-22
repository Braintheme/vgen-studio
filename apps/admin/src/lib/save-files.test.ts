import { describe, expect, it } from 'vitest';
import { uniqueFileName } from './save-files';

describe('uniqueFileName', () => {
  it('keeps a free name', () => {
    expect(uniqueFileName('reel.mp4', new Set(['other.mp4']))).toBe('reel.mp4');
  });

  it('numbers a taken name before the extension, ignoring case', () => {
    expect(uniqueFileName('Reel.mp4', new Set(['reel.mp4']))).toBe('Reel (2).mp4');
    expect(uniqueFileName('reel.mp4', new Set(['reel.mp4', 'reel (2).mp4']))).toBe('reel (3).mp4');
  });

  it('numbers names without an extension at the end', () => {
    expect(uniqueFileName('notes', new Set(['notes']))).toBe('notes (2)');
  });
});
