import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
import { useUiStore, type ThemeMode } from '@/stores/ui';

export interface ThemeControls {
  readonly mode: Ref<ThemeMode>;
  readonly setMode: (mode: ThemeMode) => void;
}

export const useTheme = (): ThemeControls => {
  const store = useUiStore();
  const { themeMode } = storeToRefs(store);
  return { mode: themeMode, setMode: store.setThemeMode };
};
