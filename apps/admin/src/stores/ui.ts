import { useColorMode } from '@vueuse/core';
import { defineStore } from 'pinia';

export const THEME_MODES = ['light', 'dark', 'auto'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

const THEME_STORAGE_KEY = 'vgen-theme';

/** Local UI state (never server data). The theme is persisted and applied as a `dark` class. */
export const useUiStore = defineStore('ui', () => {
  const themeMode = useColorMode({ storageKey: THEME_STORAGE_KEY, emitAuto: true });

  const setThemeMode = (mode: ThemeMode): void => {
    themeMode.value = mode;
  };

  return { themeMode, setThemeMode };
});
