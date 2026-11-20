import { pickByScope } from '@vgen/shared';
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
