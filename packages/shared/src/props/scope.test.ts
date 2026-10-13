import { describe, expect, it } from 'vitest';
import { ASSET_A, fixtureTemplate } from '../testing/fixtures.js';
import { parseTemplateProps } from '../template/definition.js';
import { applyPreset, extractContentProps, extractPresetProps } from './scope.js';

const fullProps = () => {
  const result = parseTemplateProps(fixtureTemplate, {
    media: { cover: ASSET_A },
    format: '1:1',
    texts: { headline: { value: 'Summer drop' }, badge: { value: 'HOT' } },
    params: { effect: 'fade', speed: 1.5 },
    music: { startSec: 12 },
  });
  if (!result.success) throw result.error;
  return result.data;
};

describe('content / style scopes', () => {
  it('preset props keep style and drop content', () => {
    const preset = extractPresetProps(fixtureTemplate, fullProps());
    expect(preset).not.toHaveProperty('media');
    expect(preset['texts']).toEqual({ badge: { enabled: true, value: 'HOT' } });
    expect(preset['params']).toEqual({ effect: 'fade', speed: 1.5 });
    expect(preset['format']).toBe('1:1');
    expect(preset['music']).toMatchObject({ startSec: 12 });
  });

  it('content props are media and content texts only', () => {
    expect(extractContentProps(fixtureTemplate, fullProps())).toEqual({
      media: { cover: ASSET_A, logo: null, gallery: [] },
      texts: { headline: { enabled: true, value: 'Summer drop' } },
    });
  });

  it('applies a preset on top of defaults while keeping current content', () => {
    const preset = extractPresetProps(fixtureTemplate, fullProps());
    const current = {
      media: { cover: ASSET_A },
      texts: { headline: { value: 'New video' }, badge: { value: 'OLD' } },
    };
    const applied = applyPreset(fixtureTemplate, preset, current);
    const parsed = parseTemplateProps(fixtureTemplate, applied);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.texts.headline.value).toBe('New video'); // content kept
    expect(parsed.data?.texts.badge.value).toBe('HOT'); // style from preset
    expect(parsed.data?.format).toBe('1:1');
    expect(parsed.data?.durationSec).toBe(12); // default
  });

  it('ignores content smuggled into a stored preset', () => {
    const applied = applyPreset(
      fixtureTemplate,
      { media: { cover: 'x' }, texts: { headline: { value: 'leak' } } },
      {},
    );
    expect(applied['media']).toBeUndefined();
    expect((applied['texts'] as { headline: { value: string } }).headline.value).toBe('Hello');
  });
});
