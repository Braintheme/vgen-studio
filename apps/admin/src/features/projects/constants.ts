import type { RenderedFilter } from '@vgen/shared';

/** Rows per page the owner can pick; the first is the default. */
export const PROJECTS_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/** Key of the remembered rows per page (`useUiStore().pageSizeOf`). */
export const PROJECTS_PAGE_SIZE_SCOPE = 'projects';

export const RENDERED_FILTER_LABELS: Record<RenderedFilter, string> = {
  yes: 'Rendered',
  no: 'Not rendered',
};

/** URL query parameters of the projects screen (filters survive reloads). */
export const PROJECTS_QUERY_PARAMS = {
  template: 'template',
  rendered: 'rendered',
  page: 'page',
} as const;
