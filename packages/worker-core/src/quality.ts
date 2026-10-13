import type { EncodingSettings, QualityPreset } from '@vgen/shared';

/**
 * Delivery encoding per quality preset.
 *
 * social: platforms re-encode uploads to roughly 3-8 Mbit/s. A clean, high-bitrate
 *   source (CRF 18, x264 slow) survives that best; the 20 Mbit/s cap keeps a 13 s
 *   1080p clip around 20-30 MB even for busy, grainy footage.
 * high: archival/master quality (CRF 14, slower, no cap).
 */
export const QUALITY_PRESETS: Record<QualityPreset, EncodingSettings> = {
  social: {
    crf: 18,
    x264Preset: 'slow',
    maxBitrate: '20M',
    bufferSize: '40M',
    audioBitrate: '256k',
    audioSampleRate: 48000,
  },
  high: {
    crf: 14,
    x264Preset: 'slower',
    maxBitrate: null,
    bufferSize: null,
    audioBitrate: '320k',
    audioSampleRate: 48000,
  },
};

export const encodingFor = (preset: string): EncodingSettings =>
  preset in QUALITY_PRESETS ? QUALITY_PRESETS[preset as QualityPreset] : QUALITY_PRESETS.social;
