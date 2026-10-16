/** Dot-separated path into template props, e.g. `texts.title` or `params.revealEffect`. */
export type PropPath = string;

/** Shows a group only while another field holds one of the given values. */
export interface UiVisibleWhen {
  readonly field: PropPath;
  readonly equals: readonly (string | number | boolean)[];
}

export interface UiFieldGroup {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly PropPath[];
  readonly collapsed?: boolean;
  /** Hidden (its fields have no effect) unless the condition holds, e.g. another finale. */
  readonly visibleWhen?: UiVisibleWhen;
}

export type UiSlotAction = {
  readonly type: 'swap';
  readonly slots: readonly [string, string];
  readonly label: string;
};

/** Optional presentation hints for the admin form; never required for rendering. */
export interface UiHints {
  readonly groups?: readonly UiFieldGroup[];
  readonly slotActions?: readonly UiSlotAction[];
  readonly hiddenFields?: readonly PropPath[];
}
