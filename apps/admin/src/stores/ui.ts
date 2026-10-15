import { useColorMode, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const THEME_MODES = ['light', 'dark', 'auto'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

const THEME_STORAGE_KEY = 'vgen-theme';
const COLLAPSED_SECTIONS_STORAGE_KEY = 'vgen-collapsed-sections';

/**
 * Local UI state (never server data). The theme is persisted and applied as a `dark` class;
 * collapsed form sections are persisted per scope (e.g. one template's settings form).
 */
export const useUiStore = defineStore('ui', () => {
  const themeMode = useColorMode({ storageKey: THEME_STORAGE_KEY, emitAuto: true });

  const setThemeMode = (mode: ThemeMode): void => {
    themeMode.value = mode;
  };

  const collapsedSections = useLocalStorage<Record<string, readonly string[]>>(
    COLLAPSED_SECTIONS_STORAGE_KEY,
    {},
  );

  const collapsedSectionsOf = (scope: string): readonly string[] => collapsedSections.value[scope] ?? [];

  const setCollapsedSections = (scope: string, ids: readonly string[]): void => {
    collapsedSections.value = { ...collapsedSections.value, [scope]: [...ids] };
  };

  return { themeMode, setThemeMode, collapsedSections, collapsedSectionsOf, setCollapsedSections };
});
