// Compile-time contract tests, checked by `pnpm typecheck` (tsc), not executed.
// Every `@ts-expect-error` below MUST produce a type error, otherwise tsc fails.
import { z } from 'zod';
import type { EngineManifest } from '../engine/engine.js';
import { textField, type BaseProps } from '../schema/base.js';
import { defineTemplate, type TemplateDefinition } from './definition.js';
import { imageSlot } from './media-slots.js';

const base = {
  id: 'type-test',
  engine: 'fixture',
  version: '1.0.0',
  name: 'Type test',
  description: '',
  mediaSlots: [imageSlot('photo', { label: 'Photo', required: true })],
  duration: { default: 6, min: 3, max: 10 },
  params: { level: z.number().default(1) },
  posterFrame: () => 0,
} as const;

// A valid template compiles and is usable wherever a generic template is expected.
const valid = defineTemplate({ ...base, texts: { title: textField({ label: 'Title', default: 'Hi' }) } });
export const asGeneric: TemplateDefinition = valid;
export const parsedProps: BaseProps = valid.schema.parse({});

// Props are precisely typed for template code.
defineTemplate({
  ...base,
  texts: { title: textField({ label: 'Title', default: 'Hi' }) },
  posterFrame: (p) => {
    const title: string = p.texts.title.value;
    const level: number = p.params.level;
    const photo: string = p.media.photo;
    // @ts-expect-error unknown slot
    const missing: unknown = p.media.missing;
    return title.length + level + photo.length + (missing ? 1 : 0);
  },
});

defineTemplate({
  ...base,
  // @ts-expect-error texts must be text fields (textField()), not arbitrary schemas
  texts: { title: z.number() },
});

defineTemplate({
  ...base,
  // @ts-expect-error text field output must be { enabled, value }
  texts: { title: z.object({ value: z.string() }) },
});

defineTemplate({
  ...base,
  texts: {},
  // @ts-expect-error defaults must match the schema
  defaults: { durationSec: 'long' },
});

defineTemplate({
  ...base,
  texts: {},
  // @ts-expect-error unknown enum value in defaults
  defaults: { format: '3:2' },
});

// @ts-expect-error a template requires posterFrame
defineTemplate({ ...base, posterFrame: undefined, texts: {} });

// Engine manifests only accept templates honoring the contract.
export const manifest: EngineManifest = {
  id: 'fixture',
  name: 'Fixture',
  version: '0',
  capabilities: {
    formats: ['9:16'],
    fps: [30],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 1,
    browserPreview: false,
  },
  templates: [valid],
};
