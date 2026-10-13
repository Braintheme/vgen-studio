import type { Format } from '@vgen/shared';

/** What a gallery card shows. */
export interface TemplateCardView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly engineName: string;
  readonly formats: readonly Format[];
  /** e.g. "2 photos". */
  readonly mediaSummary: string;
  readonly thumbnailUrl: string | null;
  /** Location of the "Create video" screen. */
  readonly to: { readonly name: string; readonly params: Readonly<Record<string, string>> };
}
