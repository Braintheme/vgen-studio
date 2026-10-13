import { Ban, CircleCheck, CircleX, Clock, LoaderCircle } from '@lucide/vue';
import type { RenderStatus } from '@vgen/shared';

export const RENDERS_PAGE_SIZE = 20;

/** Poll interval used only while the live event stream is down. */
export const RENDERS_POLL_INTERVAL_MS = 4000;

/** Renders that a worker may still pick up or is working on. */
export const ACTIVE_RENDER_STATUSES: ReadonlySet<RenderStatus> = new Set(['queued', 'rendering']);

type BadgeTone = 'default' | 'secondary' | 'destructive' | 'outline';

export interface RenderStatusMeta {
  readonly label: string;
  readonly tone: BadgeTone;
  readonly icon: object;
  /** Animate the icon (work in progress). */
  readonly spinning?: boolean;
}

export const RENDER_STATUS_META: Record<RenderStatus, RenderStatusMeta> = {
  queued: { label: 'Queued', tone: 'outline', icon: Clock },
  rendering: { label: 'Rendering', tone: 'secondary', icon: LoaderCircle, spinning: true },
  done: { label: 'Done', tone: 'default', icon: CircleCheck },
  failed: { label: 'Failed', tone: 'destructive', icon: CircleX },
  cancelled: { label: 'Cancelled', tone: 'outline', icon: Ban },
};

/** URL query parameters of the renders screen (filters survive reloads and can be shared). */
export const RENDERS_QUERY_PARAMS = {
  status: 'status',
  template: 'template',
  engine: 'engine',
  page: 'page',
} as const;
