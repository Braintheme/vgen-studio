import type { RenderedFilter } from '@vgen/shared';
import type { SelectOption } from '@/lib/ui-types';

/** Filters of the projects table; `null` means "any". */
export interface ProjectFilters {
  readonly templateId: string | null;
  readonly rendered: RenderedFilter | null;
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = { templateId: null, rendered: null };

export const hasActiveProjectFilters = (filters: ProjectFilters): boolean =>
  Object.values(filters).some((value) => value !== null);

export interface ProjectFilterOptions {
  readonly templates: readonly SelectOption[];
  readonly rendered: readonly SelectOption<RenderedFilter>[];
}

/** One choice of the "New project" dialog: a template's defaults or one of its presets. */
export interface NewProjectChoice {
  /** `template:<id>` or `preset:<id>`. */
  readonly value: string;
  readonly label: string;
}

export interface NewProjectGroup {
  readonly templateName: string;
  readonly choices: readonly NewProjectChoice[];
}
