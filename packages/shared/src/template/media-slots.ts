import { z } from 'zod';
import { AssetIdSchema } from '../ids.js';

export const MEDIA_KINDS = ['image', 'audio', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Media kinds a template slot can accept (audio goes through `music`). */
export type SlotMediaKind = Exclude<MediaKind, 'audio'>;

/** A media input declared by a template (e.g. `before`, `after`, `slides`). */
export interface MediaSlot<K extends string = string> {
  readonly key: K;
  readonly kind: SlotMediaKind;
  readonly label: string;
  readonly description?: string;
  readonly required: boolean;
  /** Present for list slots (e.g. a slideshow); the value is then an array of asset ids. */
  readonly multiple?: { readonly min: number; readonly max: number };
}

type SingleRequired = z.ZodType<string, string>;
type SingleOptional = z.ZodType<string | null, string | null | undefined>;
type MultipleRequired = z.ZodType<string[], string[]>;
type MultipleOptional = z.ZodType<string[], string[] | undefined>;

export type SlotValueSchema<S extends MediaSlot> = S extends { readonly multiple: object }
  ? S extends { readonly required: true }
    ? MultipleRequired
    : MultipleOptional
  : S extends { readonly required: true }
    ? SingleRequired
    : SingleOptional;

export type MediaShape<Slots extends readonly MediaSlot[]> = {
  [S in Slots[number] as S['key']]: SlotValueSchema<S>;
};

const slotValueSchema = (slot: MediaSlot): z.ZodType => {
  if (slot.multiple) {
    const { min, max } = slot.multiple;
    const list = z.array(AssetIdSchema).max(max);
    return slot.required
      ? list.min(min)
      : list
          // An optional list may be empty, but once used it must reach the minimum.
          .refine((items) => items.length === 0 || items.length >= min, `Add at least ${min} items`)
          .default([]);
  }
  return slot.required ? AssetIdSchema : AssetIdSchema.nullable().default(null);
};

export const mediaSchemaFromSlots = <const Slots extends readonly MediaSlot[]>(slots: Slots) => {
  const shape: Record<string, z.ZodType> = {};
  for (const slot of slots) {
    shape[slot.key] = slotValueSchema(slot);
  }
  // The runtime shape is built from the same slots the mapped type describes.
  return z.object(shape as MediaShape<Slots>).meta({ scope: 'content' });
};

export const imageSlot = <const K extends string, const R extends boolean>(
  key: K,
  options: { label: string; required: R; description?: string },
): MediaSlot<K> & { readonly kind: 'image'; readonly required: R } => ({ key, kind: 'image', ...options });

/** Metadata of an uploaded asset, as seen by template media checks. */
export interface MediaInfo {
  readonly assetId: string;
  readonly kind: MediaKind;
  readonly mime: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationSec: number | null;
}

export type MediaInfoMap = Readonly<Record<string, MediaInfo | readonly MediaInfo[] | null>>;

export interface MediaWarning {
  readonly code: string;
  readonly message: string;
  readonly severity: 'info' | 'warning';
  readonly slots?: readonly string[];
}
