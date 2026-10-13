import type { FieldKind, FieldSpec } from '@/lib/schema-form';

/** The field spec of one kind (props of a field component). */
export type FieldOf<K extends FieldKind> = Extract<FieldSpec, { kind: K }>;

/** Fields the schema form renders with its own widgets. */
export type GenericFieldSpec = Exclude<FieldSpec, { kind: 'custom' }>;

export type CustomFieldSpec = FieldOf<'custom'>;

/** Slot name a screen fills to render a custom widget, e.g. `widget:music-track`. */
export type WidgetSlotName = `widget:${string}`;

export const widgetSlotName = (widget: string): WidgetSlotName => `widget:${widget}`;
