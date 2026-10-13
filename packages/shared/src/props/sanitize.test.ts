import { describe, expect, it } from 'vitest';
import { ASSET_A, ASSET_B, fixtureTemplate } from '../testing/fixtures.js';
import { sanitizeMediaRefs, sanitizeTemplateSettings } from './sanitize.js';

describe('sanitizeTemplateSettings', () => {
  it('keeps valid values and resets only invalid ones to template defaults', () => {
    const result = sanitizeTemplateSettings(fixtureTemplate, {
      format: '1:1',
      durationSec: 999,
      params: { effect: 'spin', speed: 1.5 },
      style: { colors: { accent: 'red', text: '#000000' } },
      texts: { headline: { value: 'Kept' } },
    });
    expect(result.value.format).toBe('1:1');
    expect(result.value.durationSec).toBe(12); // template default
    expect(result.value.params).toEqual({ effect: 'slide', speed: 1.5 });
    expect(result.value.style.colors).toMatchObject({ accent: '#ff0000', text: '#000000' });
    expect(result.value.texts.headline.value).toBe('Kept');
    expect([...result.resetPaths].sort()).toEqual(['durationSec', 'params.effect', 'style.colors.accent']);
  });

  it('survives garbage: wrong types, nested junk, media, non-objects', () => {
    expect(sanitizeTemplateSettings(fixtureTemplate, 'nonsense').resetPaths).toEqual(['(all)']);
    const result = sanitizeTemplateSettings(fixtureTemplate, {
      media: { cover: 'x' },
      style: 'flat',
      music: { volume: 'loud', fadeInSec: 2 },
      unknownField: true,
    });
    expect(result.value).not.toHaveProperty('media');
    expect(result.value).not.toHaveProperty('unknownField');
    expect(result.value.music).toMatchObject({ volume: 0.8, fadeInSec: 2 });
    expect(result.resetPaths).toContain('style');
  });

  it('reports nothing for a clean draft', () => {
    expect(sanitizeTemplateSettings(fixtureTemplate, {}).resetPaths).toEqual([]);
  });
});

describe('sanitizeMediaRefs', () => {
  it('keeps well-formed ids for existing slots only', () => {
    expect(
      sanitizeMediaRefs(fixtureTemplate, {
        cover: ASSET_A,
        logo: 'not-a-uuid',
        gallery: [ASSET_A, 42, ASSET_B],
        removedSlot: ASSET_B,
      }),
    ).toEqual({ cover: ASSET_A, logo: null, gallery: [ASSET_A, ASSET_B] });
    expect(sanitizeMediaRefs(fixtureTemplate, null)).toEqual({ cover: null, logo: null, gallery: [] });
  });
});
