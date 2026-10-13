import type { StylePresetDto } from '@vgen/shared';

/** Presets of one template, as shown on the presets screen. */
export interface PresetGroup {
  readonly templateId: string;
  readonly templateName: string;
  /** Current template version (presets saved with another one are flagged). */
  readonly templateVersion: string | null;
  readonly presets: readonly StylePresetDto[];
  /** Presets whose music track was deleted (they play the library default instead). */
  readonly trackMissingIds: ReadonlySet<string>;
}
