import { parseTemplateProps, pickByScope } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { presetFlipTemplate } from './manifest.js';

describe('preset-flip title', () => {
  it('saves its text in presets, while the call to action stays per video', () => {
    const line = (value: string) => ({ enabled: true, value });
    const title = {
      titleKicker: line('POV:'),
      titleHero: line('They Ask'),
      titleTail: { enabled: false, value: 'For the *RAWs*' },
    };
    const cta = { ctaLead: line('COMMENT'), ctaWord: line('LOOK') };
    const texts = { ...title, ...cta };
    expect(pickByScope(presetFlipTemplate.settingsSchema, { texts }, 'style')).toEqual({ texts: title });
    expect(pickByScope(presetFlipTemplate.settingsSchema, { texts }, 'content')).toEqual({ texts: cta });
  });
});

describe('preset-flip instagram title', () => {
  const ASSET = '00000000-0000-4000-8000-000000000001';
  const media = { clip: ASSET, before: ASSET, presets: [ASSET] };
  const instagram = {
    texts: { titleText: { enabled: true, value: 'POV:\n\nthey ask' } },
    params: {
      titleStyle: 'instagram',
      titleIgFont: 'inter',
      titleIgWeight: 800,
      titleIgAlign: 'right',
      titleIgColor: '#111111',
      titleIgFill: { mode: 'off', color: '#ffffff' },
      titleIgOutline: { enabled: false, color: '#000000', width: 6 },
    },
  };

  it('is offered, while the default look stays classic', () => {
    expect(parseTemplateProps(presetFlipTemplate, { media }).data?.params.titleStyle).toBe('classic');
    const { data } = parseTemplateProps(presetFlipTemplate, { media, ...instagram });
    expect(data?.params).toMatchObject(instagram.params);
  });

  it('saves its text and look in presets', () => {
    expect(pickByScope(presetFlipTemplate.settingsSchema, instagram, 'style')).toEqual(instagram);
  });
});
