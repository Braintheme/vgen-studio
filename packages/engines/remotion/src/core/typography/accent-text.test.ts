import { describe, expect, it } from 'vitest';
import { parseAccentText } from './accent-text.js';

describe('parseAccentText', () => {
  it('splits plain and accented runs', () => {
    expect(parseAccentText('Look in *Lightroom*')).toEqual([
      { text: 'Look in ', accent: false },
      { text: 'Lightroom', accent: true },
    ]);
    expect(parseAccentText('*A* and *B*!')).toEqual([
      { text: 'A', accent: true },
      { text: ' and ', accent: false },
      { text: 'B', accent: true },
      { text: '!', accent: false },
    ]);
  });

  it('keeps text without accents and unmatched stars', () => {
    expect(parseAccentText('Plain')).toEqual([{ text: 'Plain', accent: false }]);
    expect(parseAccentText('5 * 3')).toEqual([{ text: '5 * 3', accent: false }]);
  });
});
