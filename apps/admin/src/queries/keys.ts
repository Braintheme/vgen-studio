import type { CreatePreviewRequest, RenderListQuery } from '@vgen/shared';

/** Query key factory: the only place cache keys are spelled out. */
export const queryKeys = {
  renders: {
    all: ['renders'] as const,
    lists: () => [...queryKeys.renders.all, 'list'] as const,
    list: (query: RenderListQuery) => [...queryKeys.renders.lists(), query] as const,
    detail: (id: string) => [...queryKeys.renders.all, 'detail', id] as const,
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
    peaks: (peaksUrl: string) => [...queryKeys.media.all, 'peaks', peaksUrl] as const,
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
