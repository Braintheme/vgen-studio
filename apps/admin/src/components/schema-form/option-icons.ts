import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Columns2,
  Rows2,
} from '@lucide/vue';
import type { Component } from 'vue';

/** Generic option icon ids (field metadata `optionIcons`) -> icons of the admin's icon set. */
export const OPTION_ICONS: Readonly<Record<string, Component>> = {
  'layout-rows': Rows2,
  'layout-columns': Columns2,
  'align-top': AlignVerticalJustifyStart,
  'align-middle': AlignVerticalJustifyCenter,
  'align-bottom': AlignVerticalJustifyEnd,
};
