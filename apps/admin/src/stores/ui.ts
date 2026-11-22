import { useColorMode, useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const THEME_MODES = ['light', 'dark', 'auto'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

const THEME_STORAGE_KEY = 'vgen-theme';
const COLLAPSED_SECTIONS_STORAGE_KEY = 'vgen-collapsed-sections';
const PAGE_SIZES_STORAGE_KEY = 'vgen-page-sizes';

/**
 * Local UI state (never server data). The theme is persisted and applied as a `dark` class;
 * collapsed form sections are persisted per scope (e.g. one template's settings form), and so
 * are the rows per page of a table (e.g. `renders`).
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

  const pageSizes = useLocalStorage<Record<string, number>>(PAGE_SIZES_STORAGE_KEY, {});

  /** The table's remembered rows per page, if it is one of `options`; else the first option. */
  const pageSizeOf = (scope: string, options: readonly number[]): number => {
    const stored = pageSizes.value[scope];
    return stored !== undefined && options.includes(stored) ? stored : (options[0] ?? 20);
  };

  const setPageSize = (scope: string, size: number): void => {
    pageSizes.value = { ...pageSizes.value, [scope]: size };
  };

  return {
    themeMode,
    setThemeMode,
    collapsedSections,
    collapsedSectionsOf,
    setCollapsedSections,
    pageSizeOf,
    setPageSize,
  };
});
