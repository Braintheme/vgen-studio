// UI types shared by components and composables (lowest layer, no Vue imports).
export type ConfirmTone = 'default' | 'destructive';

export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/** A sidebar navigation entry. `icon` is a Vue component (e.g. a lucide icon). */
export interface NavItem {
  readonly title: string;
  readonly to: string;
  readonly icon: object;
}

/** A tint on a colour wheel (Final Cut-like): hue around it, amount from the centre out. */
export interface WheelValue {
  /** Degrees, 0 = red at the top, clockwise. */
  readonly hue: number;
  /** 0..100. */
  readonly amount: number;
}

/** One uploaded file in the media library (page grid or a slot's picker). */
export interface MediaTileView {
  readonly id: string;
  readonly kind: 'image' | 'video' | 'audio';
  readonly name: string;
  readonly previewUrl: string | null;
  readonly sizeLabel: string;
  readonly dateLabel: string;
  /** Videos only. */
  readonly durationLabel: string | null;
  /** Renders whose settings use the file (their videos stay; re-rendering needs the file). */
  readonly renderCount: number;
  /** Templates whose current draft holds the file. */
  readonly draftTemplates: readonly string[];
  readonly selected: boolean;
}
