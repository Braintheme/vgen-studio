/** Dot-separated path into template props, e.g. `texts.title` or `params.revealEffect`. */
export type PropPath = string;

/** Shows a group only while another field holds one of the given values. */
export interface UiVisibleWhen {
  readonly field: PropPath;
  readonly equals: readonly (string | number | boolean)[];
}

/**
 * Several fields of a group as one compact row that opens them in a popover. For flat fields whose
 * stored values must stay where they are; new settings can use an object with `widget: 'popover'`.
 */
export interface UiFieldPopover {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly PropPath[];
}

export interface UiFieldGroup {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly PropPath[];
  /** Compact rows, shown after `fields`. */
  readonly popovers?: readonly UiFieldPopover[];
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
