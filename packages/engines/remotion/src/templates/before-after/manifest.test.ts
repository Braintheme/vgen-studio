import { parseTemplateProps, resolveTemplateDefaults, type PreparedImage } from '@vgen/shared';
import { VERSION } from 'remotion/version';
import { describe, expect, it, vi } from 'vitest';
import { REMOTION_ENGINE_VERSION, remotionEngineManifest } from '../../manifest/index.js';
import { beforeAfterTemplate } from './manifest.js';
import { checkBeforeAfterMedia } from '../../core/pairs/pair-checks.js';
import { alignBeforeAfter } from '../../core/pairs/align-pair.js';

const BEFORE = '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1';
const AFTER = '2f1e5a4b-3c6d-4e7f-8a9b-0c1d2e3f4a5b';

const imageInfo = (assetId: string, width: number, height: number) => ({
  assetId,
  kind: 'image' as const,
  mime: 'image/jpeg',
  width,
  height,
  durationSec: null,
});

describe('before-after manifest', () => {
  it('defaults to a 13 s vertical video with the diagonal wipe', () => {
    const defaults = resolveTemplateDefaults(beforeAfterTemplate);
    expect(defaults).toMatchObject({ format: '9:16', durationSec: 13, fps: 30 });
    const { adjust, ...params } = defaults.params;
    // Photo adjustments default to "as is" for both photos.
    expect(adjust.before).toMatchObject({ look: 'none', exposure: 0, temperature: 0 });
    expect(adjust.after).toMatchObject({ look: 'none', contrast: 0, tint: 0 });
    expect(params).toEqual({
      revealEffect: 'diagonal-wipe',
      finale: 'split',
      motion: 'balanced',
      introTransition: 'soft-focus',
      outroTransition: 'fade',
    });
    expect(defaults.style.fonts).toEqual({ heading: 'unbounded', body: 'inter' });
    expect(defaults.texts.beforeLabel.value).toBe('Before');
  });

  it('requires both photos', () => {
    expect(parseTemplateProps(beforeAfterTemplate, { media: { before: BEFORE } }).success).toBe(false);
    const ok = parseTemplateProps(beforeAfterTemplate, { media: { before: BEFORE, after: AFTER } });
    expect(ok.success).toBe(true);
    expect(ok.data && beforeAfterTemplate.resolveMetadata(ok.data)).toEqual({
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 390,
    });
  });

  it('keeps duration within the template limits', () => {
    const media = { before: BEFORE, after: AFTER };
    expect(parseTemplateProps(beforeAfterTemplate, { media, durationSec: 7 }).success).toBe(false);
    expect(parseTemplateProps(beforeAfterTemplate, { media, durationSec: 30 }).success).toBe(true);
  });

  it('pins the Remotion version it was built against', () => {
    expect(REMOTION_ENGINE_VERSION.endsWith(`+remotion.${VERSION}`)).toBe(true);
    expect(remotionEngineManifest.templates).toContain(beforeAfterTemplate);
  });
});

describe('before-after media checks', () => {
  it('is silent for matching high-res photos', () => {
    expect(
      checkBeforeAfterMedia({ before: imageInfo(BEFORE, 4000, 6000), after: imageInfo(AFTER, 4000, 6000) }),
    ).toEqual([]);
  });

  it('warns about different proportions', () => {
    const warnings = checkBeforeAfterMedia({
      before: imageInfo(BEFORE, 4000, 6000),
      after: imageInfo(AFTER, 3000, 4000),
    });
    expect(warnings.map((warning) => warning.code)).toEqual(['ASPECT_MISMATCH']);
  });

  it('notes size differences and low resolution', () => {
    const warnings = checkBeforeAfterMedia({
      before: imageInfo(BEFORE, 4000, 6000),
      after: imageInfo(AFTER, 800, 1200),
    });
    expect(warnings.map((warning) => warning.code).sort()).toEqual(['LOW_RESOLUTION', 'SIZE_MISMATCH']);
  });

  it('ignores incomplete input', () => {
    expect(checkBeforeAfterMedia({ before: imageInfo(BEFORE, 4000, 6000), after: null })).toEqual([]);
  });
});

describe('before-after asset alignment', () => {
  const image = (path: string, width: number, height: number): PreparedImage => ({
    path,
    width,
    height,
    mime: 'image/jpeg',
  });

  const context = (before: PreparedImage, after: PreparedImage) => {
    const resize = vi.fn((input: PreparedImage, size: { width: number; height: number }) =>
      Promise.resolve({ ...input, ...size, path: `${input.path}.aligned` }),
    );
    const warn = vi.fn();
    return {
      resize,
      warn,
      value: {
        props: {},
        frame: { width: 1080, height: 1920 },
        media: { before, after },
        images: { resize },
        warn,
      },
    };
  };

  it('leaves identical sizes untouched', async () => {
    const ctx = context(image('b.jpg', 1350, 2400), image('a.jpg', 1350, 2400));
    expect(await alignBeforeAfter(ctx.value)).toBe(ctx.value.media);
    expect(ctx.resize).not.toHaveBeenCalled();
  });

  it('resizes the after photo to the before photo size', async () => {
    const ctx = context(image('b.jpg', 1350, 2400), image('a.jpg', 2700, 4800));
    const result = await alignBeforeAfter(ctx.value);
    expect(ctx.resize).toHaveBeenCalledWith(
      ctx.value.media.after,
      { width: 1350, height: 2400 },
      { fit: 'cover' },
    );
    expect(result['after']).toMatchObject({ width: 1350, height: 2400, path: 'a.jpg.aligned' });
    expect(ctx.warn).not.toHaveBeenCalled();
  });

  it('warns when proportions differ', async () => {
    const ctx = context(image('b.jpg', 1350, 2400), image('a.jpg', 2000, 2000));
    await alignBeforeAfter(ctx.value);
    expect(ctx.warn).toHaveBeenCalledWith(expect.objectContaining({ code: 'ASPECT_MISMATCH' }));
  });
});
