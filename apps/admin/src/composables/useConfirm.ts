import { inject, provide, reactive, readonly, type DeepReadonly, type InjectionKey } from 'vue';
import type { ConfirmTone } from '@/lib/ui-types';

export interface ConfirmOptions {
  readonly title: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly tone?: ConfirmTone;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
}

interface ConfirmController {
  readonly state: DeepReadonly<ConfirmState>;
  readonly ask: (options: ConfirmOptions) => Promise<boolean>;
  readonly settle: (confirmed: boolean) => void;
}

const CONFIRM_KEY: InjectionKey<ConfirmController> = Symbol('confirm');

/**
 * Installs the confirmation service for the app (call once, in the app root) and
 * returns the controller the dialog host renders from.
 */
export const provideConfirm = (): ConfirmController => {
  const state = reactive<ConfirmState>({ open: false, options: null });
  let resolver: ((confirmed: boolean) => void) | null = null;

  const settle = (confirmed: boolean): void => {
    state.open = false;
    resolver?.(confirmed);
    resolver = null;
  };

  const controller: ConfirmController = {
    state: readonly(state),
    ask: (options) => {
      // A new question dismisses a pending one.
      resolver?.(false);
      state.options = options;
      state.open = true;
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
    settle,
  };
  provide(CONFIRM_KEY, controller);
  return controller;
};

const injectController = (): ConfirmController => {
  const controller = inject(CONFIRM_KEY);
  if (!controller) {
    throw new Error('useConfirm() needs provideConfirm() in an ancestor (the app root)');
  }
  return controller;
};

/** `await confirm({ title })` resolves to true when the user confirms. */
export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => injectController().ask;

/** For the single dialog host component. */
export const useConfirmHost = (): Pick<ConfirmController, 'state' | 'settle'> => {
  const { state, settle } = injectController();
  return { state, settle };
};
