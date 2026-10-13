import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ASSET_A, ASSET_B, fixtureTemplate } from '../testing/fixtures.js';
import { parseTemplateProps, resolveTemplateDefaults } from './definition.js';

describe('defineTemplate', () => {
  it('resolves defaults: base defaults <- template overrides', () => {
    const defaults = resolveTemplateDefaults(fixtureTemplate);
    expect(defaults.format).toBe('9:16');
    expect(defaults.fps).toBe(30);
    expect(defaults.durationSec).toBe(12); // template override of the spec default (10)
    expect(defaults.style.colors.accent).toBe('#ff0000'); // template override
    expect(defaults.style.colors.text).toBe('#ffffff'); // base default kept
    expect(defaults.params).toEqual({ effect: 'slide', speed: 1 });
    expect(defaults.texts.headline).toEqual({ enabled: true, value: 'Hello' });
    expect(defaults.music).toMatchObject({ enabled: true, trackId: null, startSec: 0 });
    expect(defaults.imageProcessing.sharpen).toBe('low');
    expect(defaults).not.toHaveProperty('media');
  });

  it('fills missing props from template defaults when parsing', () => {
    const result = parseTemplateProps(fixtureTemplate, {
      media: { cover: ASSET_A },
      texts: { headline: { value: 'Hi' } },
    });
    expect(result.success).toBe(true);
    expect(result.data?.durationSec).toBe(12);
    expect(result.data?.texts.headline).toEqual({ enabled: true, value: 'Hi' });
    expect(result.data?.media).toEqual({ cover: ASSET_A, logo: null, gallery: [] });
  });

  it('builds media schema from slots', () => {
    const missingRequired = parseTemplateProps(fixtureTemplate, { media: {} });
    expect(missingRequired.success).toBe(false);
    expect(missingRequired.error?.issues.map((issue) => issue.path.join('.'))).toContain('media.cover');

    const gallery = parseTemplateProps(fixtureTemplate, {
      media: { cover: ASSET_A, gallery: [ASSET_A, ASSET_B] },
    });
    expect(gallery.data?.media.gallery).toEqual([ASSET_A, ASSET_B]);

    const badId = parseTemplateProps(fixtureTemplate, { media: { cover: 'not-a-uuid' } });
    expect(badId.success).toBe(false);
  });

  it('enforces duration bounds, enums and formats', () => {
    const base = { media: { cover: ASSET_A } };
    expect(parseTemplateProps(fixtureTemplate, { ...base, durationSec: 4 }).success).toBe(false);
    expect(parseTemplateProps(fixtureTemplate, { ...base, durationSec: 21 }).success).toBe(false);
    expect(parseTemplateProps(fixtureTemplate, { ...base, params: { effect: 'spin' } }).success).toBe(false);
    expect(parseTemplateProps(fixtureTemplate, { ...base, format: '3:2' }).success).toBe(false);
    expect(parseTemplateProps(fixtureTemplate, { ...base, fps: 24 }).success).toBe(false);
    expect(parseTemplateProps(fixtureTemplate, { ...base, format: '4:5', fps: 60 }).success).toBe(true);
  });

  it('computes output metadata from props', () => {
    const props = parseTemplateProps(fixtureTemplate, { media: { cover: ASSET_A }, format: '16:9', fps: 60 });
    expect(props.data && fixtureTemplate.resolveMetadata(props.data)).toEqual({
      width: 1920,
      height: 1080,
      fps: 60,
      durationInFrames: 720,
    });
  });

  it('exposes field metadata in JSON Schema for API clients', () => {
    const json = z.toJSONSchema(fixtureTemplate.schema, { io: 'input' }) as {
      properties: Record<
        string,
        { scope?: string; properties?: Record<string, { scope?: string; widget?: string }> }
      >;
    };
    expect(json.properties['media']?.scope).toBe('content');
    expect(json.properties['style']?.scope).toBe('style');
    expect(json.properties['texts']?.properties?.['badge']?.scope).toBe('style');
    expect(json.properties['texts']?.properties?.['headline']?.widget).toBe('text');
  });
});

describe('list media slots', () => {
  it('allows an empty optional list but enforces its minimum once used', () => {
    const tooMany = Array.from({ length: 6 }, () => ASSET_A);
    expect(parseTemplateProps(fixtureTemplate, { media: { cover: ASSET_A, gallery: [] } }).success).toBe(
      true,
    );
    expect(parseTemplateProps(fixtureTemplate, { media: { cover: ASSET_A, gallery: tooMany } }).success).toBe(
      false,
    );
  });
});
