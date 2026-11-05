import { parseTemplateProps, pickByScope } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { presetReelTemplate, timelineOf } from './manifest.js';

const ASSET = '00000000-0000-4000-8000-000000000001';
const media = { clip: ASSET, before: ASSET, after: ASSET };

const parse = (input: object) => parseTemplateProps(presetReelTemplate, input);

describe('preset-reel title', () => {
  it('keeps the original look, and the values older presets hold stay valid', () => {
    const { data } = parse({
      media: { ...media, settings: [ASSET] },
      params: { titleSize: 's', titleAnimation: 'none', titleAccentFont: 'courgette' },
    });
    expect(data?.params).toMatchObject({
      titleStyle: 'reel',
      titleSize: 's',
      titleScale: 1,
      titleAnimation: 'none',
      titleAccentFont: 'courgette',
      titleOwnColors: false,
    });
  });

  it('saves its settings in presets', () => {
    const settings = { params: { titleStyle: 'stack', titleOwnColors: true, titleOffsetY: 20 } };
    expect(pickByScope(presetReelTemplate.settingsSchema, settings, 'style')).toEqual(settings);
  });
});

describe('preset-reel settings screenshots', () => {
  it('are required while the section is on (the default)', () => {
    const result = parse({ media: { ...media, settings: [] } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['media', 'settings']);
    expect(parse({ media: { ...media, settings: [ASSET] } }).success).toBe(true);
  });

  it('may stay empty when the section is off', () => {
    const result = parse({ media, params: { showSettings: false } });
    expect(result.success).toBe(true);
    expect(result.data?.media.settings).toEqual([]);
  });

  it('are switched off by a style setting, so a preset keeps it', () => {
    const settings = { params: { showSettings: false } };
    expect(pickByScope(presetReelTemplate.settingsSchema, settings, 'style')).toEqual(settings);
  });

  it('do not add to the length when the section is off, even if uploaded', () => {
    const props = { media: { ...media, settings: [ASSET, ASSET, ASSET] } };
    const on = parse(props).data;
    const off = parse({ ...props, params: { showSettings: false } }).data;
    if (!on || !off) throw new Error('Props must be valid');
    const full = timelineOf(on);
    const short = timelineOf(off);
    expect(short.card.from).toBe(full.clip.to);
    expect(short.totalFrames).toBe(full.totalFrames - 3 * full.screenFrames);
  });
});
