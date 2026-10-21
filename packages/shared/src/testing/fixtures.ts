// Test-only template fixtures (excluded from builds).
import { z } from 'zod';
import type { EngineManifest } from '../engine/engine.js';
import { FORMAT_IDS } from '../formats.js';
import { imageSlot, type MediaSlot } from '../template/media-slots.js';
import { defineTemplate } from '../template/definition.js';
import { textField } from '../schema/base.js';

const gallerySlot: MediaSlot<'gallery'> & { readonly multiple: { min: number; max: number } } = {
  key: 'gallery',
  kind: 'image',
  label: 'Gallery',
  required: false,
  multiple: { min: 1, max: 5 },
};

export const fixtureTemplate = defineTemplate({
  id: 'fixture-card',
  engine: 'fixture',
  version: '1.2.0',
  name: 'Fixture card',
  description: 'Test template',
  mediaSlots: [
    imageSlot('cover', { label: 'Cover', required: true }),
    imageSlot('logo', { label: 'Logo', required: false }),
    gallerySlot,
  ],
  duration: { default: 10, min: 5, max: 20 },
  texts: {
    headline: textField({ label: 'Headline', default: 'Hello' }),
    badge: textField({ label: 'Badge', default: 'NEW', scope: 'style' }),
  },
  params: {
    effect: z.enum(['fade', 'slide']).default('fade'),
    speed: z.number().min(0.5).max(2).default(1),
  },
  defaults: {
    durationSec: 12,
    style: { colors: { accent: '#ff0000' } },
    params: { effect: 'slide' },
  },
  ui: { slotActions: [{ type: 'swap', slots: ['cover', 'logo'], label: 'Swap' }] },
  posterFrame: (props) => props.fps,
});

export const fixtureEngine = (overrides: Partial<EngineManifest> = {}): EngineManifest => ({
  id: 'fixture',
  name: 'Fixture',
  version: '0.0.1',
  capabilities: {
    formats: FORMAT_IDS,
    fps: [30, 60],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 60,
    browserPreview: false,
    stills: false,
  },
  templates: [fixtureTemplate],
  ...overrides,
});

export const ASSET_A = '0b0d6c26-6d5a-4f43-9c8c-6a3f4cbbd8c1';
export const ASSET_B = '2f1e5a4b-3c6d-4e7f-8a9b-0c1d2e3f4a5b';
