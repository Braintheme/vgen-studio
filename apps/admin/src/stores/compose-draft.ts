import { useStorage } from '@vueuse/core';
import {
  DEFAULT_QUALITY_PRESET,
  DEFAULT_STILL_SCALE,
  type QualityPreset,
  type StillScale,
} from '@vgen/shared';
import { defineStore } from 'pinia';

/** Slot key -> asset id(s); `null` = empty slot. */
export type DraftMedia = Readonly<Record<string, string | readonly string[] | null>>;

/** What the user is composing for one template (local state, persisted in the browser). */
export interface ComposeDraft {
  /** Template version the draft was last saved with. */
  readonly templateVersion: string;
  /** Raw form values (everything except media). */
  readonly settings: Readonly<Record<string, unknown>>;
  readonly media: DraftMedia;
  readonly quality: QualityPreset;
  /** Image templates: pixel density of the slides (missing in drafts saved before it existed). */
  readonly scale?: StillScale;
  /** Style preset the settings came from (for the output name and "Update preset"). */
  readonly presetId: string | null;
}

const DRAFTS_STORAGE_KEY = 'vgen-compose-drafts';

export const useComposeDraftStore = defineStore('compose-draft', () => {
  const drafts = useStorage<Record<string, ComposeDraft>>(DRAFTS_STORAGE_KEY, {});

  const draftOf = (templateId: string): ComposeDraft | null => drafts.value[templateId] ?? null;

  const update = (templateId: string, templateVersion: string, patch: Partial<ComposeDraft>): void => {
    const current: ComposeDraft = drafts.value[templateId] ?? {
      templateVersion,
      settings: {},
      media: {},
      quality: DEFAULT_QUALITY_PRESET,
      scale: DEFAULT_STILL_SCALE,
      presetId: null,
    };
    drafts.value = { ...drafts.value, [templateId]: { ...current, ...patch, templateVersion } };
  };

  const clear = (templateId: string): void => {
    const { [templateId]: _removed, ...rest } = drafts.value;
    drafts.value = rest;
  };

  /** Every template's draft (e.g. which uploads are still in use). */
  const all = (): Readonly<Record<string, ComposeDraft>> => drafts.value;

  return { draftOf, update, clear, all };
});
