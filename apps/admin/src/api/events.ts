import { RenderEventSchema, type RenderEvent } from '@vgen/shared';
import { API_BASE_URL } from './config';

export interface RenderEventHandlers {
  readonly onEvent: (event: RenderEvent) => void;
  /** Connection (re)established. */
  readonly onOpen?: () => void;
  /** Connection lost; the browser keeps retrying on its own. */
  readonly onError?: () => void;
}

export interface RenderEventStream {
  close(): void;
}

/**
 * Server-Sent Events with render status/progress. Without `renderId` it streams all
 * renders; with it, a status snapshot first and then that render's updates.
 */
export const openRenderEventStream = (
  handlers: RenderEventHandlers,
  renderId?: string,
): RenderEventStream => {
  const url = renderId ? `${API_BASE_URL}/renders/${renderId}/events` : `${API_BASE_URL}/renders/events`;
  const source = new EventSource(url);
  source.onopen = () => {
    handlers.onOpen?.();
  };
  source.onerror = () => {
    handlers.onError?.();
  };
  source.onmessage = (message: MessageEvent<string>) => {
    try {
      const parsed = RenderEventSchema.safeParse(JSON.parse(message.data));
      if (parsed.success) handlers.onEvent(parsed.data);
    } catch {
      // Malformed frames are ignored; the next status event resynchronizes the view.
    }
  };
  return {
    close: () => {
      source.close();
    },
  };
};
