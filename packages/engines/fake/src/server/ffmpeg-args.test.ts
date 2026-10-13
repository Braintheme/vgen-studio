import { parseTemplateProps, type EncodingSettings, type EngineRenderInput } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { testCardTemplate } from '../templates/test-card/manifest.js';
import { testCardArgs } from './ffmpeg-args.js';

const ENCODING: EncodingSettings = {
  crf: 18,
  x264Preset: 'slow',
  maxBitrate: '20M',
  bufferSize: '40M',
  audioBitrate: '256k',
  audioSampleRate: 48000,
};

const PHOTO = '00000000-0000-4000-8000-000000000001';

const inputFor = (
  overrides: Record<string, unknown>,
  music: EngineRenderInput['assets']['music'],
): EngineRenderInput => {
  const parsed = parseTemplateProps(testCardTemplate, { media: { photo: PHOTO }, ...overrides });
  if (!parsed.success) throw parsed.error;
  return {
    jobId: 'job',
    template: testCardTemplate,
    props: parsed.data,
    assets: {
      media: { photo: { kind: 'image', src: 'http://127.0.0.1:1/photo.jpg', width: 800, height: 600 } },
      music,
    },
    metadata: testCardTemplate.resolveMetadata(parsed.data),
    encoding: ENCODING,
  };
};

describe('test-card ffmpeg arguments', () => {
  it('renders the photo on the style background at the output size, with music fades', () => {
    const args = testCardArgs(
      inputFor(
        { format: '16:9', style: { colors: { background: '#112233' } } },
        { src: 'http://127.0.0.1:1/m.mp3', durationSec: 60 },
      ),
      '/tmp/out.mp4',
    ).join(' ');
    expect(args).toContain('color=c=0x112233:s=1920x1080:r=30:d=4');
    expect(args).toContain('-i http://127.0.0.1:1/photo.jpg');
    expect(args).toContain('-ss 0 -stream_loop -1 -i http://127.0.0.1:1/m.mp3');
    expect(args).toMatch(/afade=t=out:st=2\.5:d=1\.5/);
    expect(args).toContain('-pix_fmt yuv420p');
    expect(args).toContain('+faststart');
  });

  it('leaves audio to the delivery step when there is no track, and renders stills as one frame', () => {
    const silent = testCardArgs(inputFor({}, null), '/tmp/out.mp4');
    expect(silent).not.toContain('-c:a');
    const still = testCardArgs(
      inputFor({}, { src: 'http://127.0.0.1:1/m.mp3', durationSec: 60 }),
      '/tmp/f.jpg',
      2,
    );
    expect(still.join(' ')).toContain('-ss 2 -frames:v 1');
    expect(still.join(' ')).not.toContain('m.mp3');
  });
});
