import { toast } from 'vue-sonner';
import { ApiRequestError } from '@/queries/errors';

export interface NoticeOptions {
  readonly id?: string;
}

export interface Notify {
  readonly success: (message: string, description?: string) => void;
  /** Low-key notice for things the app fixed on its own; the same `id` updates one toast. */
  readonly info: (message: string, description?: string, options?: NoticeOptions) => void;
  readonly warning: (message: string, description?: string) => void;
  /** Shows a failed action; the server's message goes into the description. */
  readonly error: (title: string, error: unknown) => void;
}

const describe = (error: unknown): string | undefined => {
  if (error instanceof ApiRequestError) {
    const details = error.details.map((detail) => detail.message).join('; ');
    return details ? `${error.message}: ${details}` : error.message;
  }
  return error instanceof Error ? error.message : undefined;
};

/** Consistent toasts across features. */
export const useNotify = (): Notify => ({
  success: (message, description) => {
    toast.success(message, { description });
  },
  info: (message, description, options) => {
    toast.info(message, { description, id: options?.id });
  },
  warning: (message, description) => {
    toast.warning(message, { description });
  },
  error: (title, error) => {
    toast.error(title, { description: describe(error) });
  },
});
