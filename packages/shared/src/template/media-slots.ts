import { z } from 'zod';
import { AssetIdSchema } from '../ids.js';
import { valueAtPath } from '../util.js';
import type { UiVisibleWhen } from './ui-hints.js';

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
  /**
   * For an optional slot that a setting turns on and off: the slot must be filled while the field
   * holds one of the values. Otherwise it is off: it may stay empty and the template ignores it.
   */
  readonly requiredWhen?: UiVisibleWhen;
  /** Present for list slots (e.g. a slideshow); the value is then an array of asset ids. */
  readonly multiple?: { readonly min: number; readonly max: number };
  /**
   * List slots read in groups (e.g. before/after pairs: `{ size: 2, labels: ['Before', 'After'] }`):
   * the list must hold whole groups. The admin labels the items and sorts each upload by name.
   */
  readonly group?: MediaSlotGroup;
  /**
   * Video slots: the props path of the `videoRangeField` that picks the used fragment
   * (e.g. `params.clip`). The worker cuts that fragment; the admin edits it next to the video.
   */
  readonly range?: string;
}

export interface MediaSlotGroup {
  readonly size: number;
  /** One label per position in a group. */
  readonly labels: readonly string[];
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
    const group = slot.group;
    const list = group
      ? z
          .array(AssetIdSchema)
          .max(max)
          .refine(
            (items) => items.length % group.size === 0,
            `Add whole groups of ${String(group.size)} (${group.labels.join(', ')})`,
          )
      : z.array(AssetIdSchema).max(max);
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

/** A slot with `requiredWhen` whose setting is currently off (`values`: props or settings). */
export const isSlotOff = (slot: MediaSlot, values: unknown): boolean => {
  const when = slot.requiredWhen;
  if (!when) return false;
  const value = valueAtPath(values, when.field);
  return !when.equals.some((expected) => expected === value);
};

/** Whether a slot must be filled for these values (`values`: props or settings). */
export const isSlotRequired = (slot: MediaSlot, values: unknown): boolean =>
  slot.required || (slot.requiredWhen !== undefined && !isSlotOff(slot, values));

/** Slots with `requiredWhen` that must be filled for these props but are empty. */
export const missingConditionalSlots = (slots: readonly MediaSlot[], props: unknown): MediaSlot[] =>
  slots.filter((slot) => {
    if (!slot.requiredWhen || !isSlotRequired(slot, props)) return false;
    const value = valueAtPath(props, `media.${slot.key}`);
    return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
  });

export const imageSlot = <const K extends string, const R extends boolean>(
  key: K,
  options: { label: string; required: R; description?: string },
): MediaSlot<K> & { readonly kind: 'image'; readonly required: R } => ({ key, kind: 'image', ...options });

export const videoSlot = <const K extends string, const R extends boolean>(
  key: K,
  options: { label: string; required: R; description?: string; range: string },
): MediaSlot<K> & { readonly kind: 'video'; readonly required: R } => ({ key, kind: 'video', ...options });

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
