import { inject, provide, reactive, readonly, type DeepReadonly, type InjectionKey } from 'vue';

export interface PromptOptions {
  readonly title: string;
  readonly description?: string;
  readonly label: string;
  readonly initialValue?: string;
  readonly confirmLabel?: string;
  readonly maxLength?: number;
}

interface PromptState {
  open: boolean;
  options: PromptOptions | null;
}

interface PromptController {
  readonly state: DeepReadonly<PromptState>;
  readonly ask: (options: PromptOptions) => Promise<string | null>;
  readonly settle: (value: string | null) => void;
}

const PROMPT_KEY: InjectionKey<PromptController> = Symbol('prompt');

/** Installs the text-prompt service (call once, in the app root). Mirrors useConfirm. */
export const providePrompt = (): PromptController => {
  const state = reactive<PromptState>({ open: false, options: null });
  let resolver: ((value: string | null) => void) | null = null;

  const controller: PromptController = {
    state: readonly(state),
    ask: (options) => {
      resolver?.(null);
      state.options = options;
      state.open = true;
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
    settle: (value) => {
      state.open = false;
      resolver?.(value);
      resolver = null;
    },
  };
  provide(PROMPT_KEY, controller);
  return controller;
};

const injectController = (): PromptController => {
  const controller = inject(PROMPT_KEY);
  if (!controller) throw new Error('usePrompt() needs providePrompt() in an ancestor (the app root)');
  return controller;
};

/** `await prompt({ title, label })` resolves to the trimmed text, or null when cancelled. */
export const usePrompt = (): ((options: PromptOptions) => Promise<string | null>) => injectController().ask;

export const usePromptHost = (): Pick<PromptController, 'state' | 'settle'> => {
  const { state, settle } = injectController();
  return { state, settle };
};
