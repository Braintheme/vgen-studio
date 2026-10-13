import type { RenderStatus } from '@vgen/shared';
import type { SelectOption } from '@/lib/ui-types';

/** Filters of the renders table; `null` means "any". */
export interface RenderFilters {
  readonly status: RenderStatus | null;
  readonly templateId: string | null;
  readonly engine: string | null;
}

export const EMPTY_RENDER_FILTERS: RenderFilters = { status: null, templateId: null, engine: null };

export const hasActiveFilters = (filters: RenderFilters): boolean =>
  Object.values(filters).some((value) => value !== null);

export interface RenderFilterOptions {
  readonly statuses: readonly SelectOption<RenderStatus>[];
  readonly templates: readonly SelectOption[];
  readonly engines: readonly SelectOption[];
}
