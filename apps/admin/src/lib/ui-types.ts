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
