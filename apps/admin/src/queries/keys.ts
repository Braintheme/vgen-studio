import type {
  CreatePreviewRequest,
  MediaLibraryQuery,
  ProjectDaysQuery,
  ProjectListQuery,
  ProjectSelectableQuery,
  RenderDaysQuery,
  RenderListQuery,
  RenderReadyQuery,
} from '@vgen/shared';

/** A library listing without its page (the infinite list asks for pages itself). */
export type MediaLibraryInfiniteQuery = Omit<MediaLibraryQuery, 'page'>;

/** Query key factory: the only place cache keys are spelled out. */
export const queryKeys = {
  renders: {
    all: ['renders'] as const,
    lists: () => [...queryKeys.renders.all, 'list'] as const,
    list: (query: RenderListQuery) => [...queryKeys.renders.lists(), query] as const,
    detail: (id: string) => [...queryKeys.renders.all, 'detail', id] as const,
    /** Day counts; kept apart from `lists()`, whose entries are pages. */
    dayCounts: () => [...queryKeys.renders.all, 'days'] as const,
    days: (query: RenderDaysQuery) => [...queryKeys.renders.dayCounts(), query] as const,
    ready: (query: RenderReadyQuery) => [...queryKeys.renders.all, 'ready', query] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (query: ProjectListQuery) => [...queryKeys.projects.lists(), query] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    neighbors: (id: string) => [...queryKeys.projects.all, 'neighbors', id] as const,
    dayCounts: () => [...queryKeys.projects.all, 'days'] as const,
    days: (query: ProjectDaysQuery) => [...queryKeys.projects.dayCounts(), query] as const,
    selectable: (query: ProjectSelectableQuery) => [...queryKeys.projects.all, 'selectable', query] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: (engine?: string) => [...queryKeys.templates.all, 'list', engine ?? 'all'] as const,
    detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
  },
  engines: {
    all: ['engines'] as const,
  },
  media: {
    all: ['media'] as const,
    detail: (id: string) => [...queryKeys.media.all, 'detail', id] as const,
    libraryAll: ['media', 'library'] as const,
    library: (query: MediaLibraryQuery) => [...queryKeys.media.libraryAll, query] as const,
    /** Pages loaded one after another (the picker's "Load more"); under `libraryAll`. */
    libraryInfinite: (query: MediaLibraryInfiniteQuery) =>
      [...queryKeys.media.libraryAll, 'infinite', query] as const,
    peaks: (peaksUrl: string) => [...queryKeys.media.all, 'peaks', peaksUrl] as const,
    groups: ['media', 'groups'] as const,
  },
  music: {
    all: ['music'] as const,
  },
  previews: {
    all: ['previews'] as const,
    frame: (request: CreatePreviewRequest) => [...queryKeys.previews.all, request] as const,
  },
  presets: {
    all: ['presets'] as const,
    list: (templateId?: string) => [...queryKeys.presets.all, 'list', templateId ?? 'all'] as const,
  },
};
