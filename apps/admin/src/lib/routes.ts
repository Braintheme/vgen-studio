// Route names and locations (plain data): used by the router and by composables that navigate.

export const ROUTE_NAMES = {
  templates: 'templates',
  compose: 'compose',
  renders: 'renders',
  music: 'music',
  presets: 'presets',
  media: 'media',
} as const;

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];

export const ROUTE_PATHS: Record<RouteName, string> = {
  templates: '/templates',
  compose: '/compose/:templateId',
  renders: '/renders',
  music: '/music',
  presets: '/presets',
  media: '/media',
};

/** Route parameter names. */
export const ROUTE_PARAMS = {
  templateId: 'templateId',
} as const;

/** Query parameter names. */
export const ROUTE_QUERY = {
  /** `/compose/:templateId?preset=<id>` opens the editor with a style preset applied. */
  preset: 'preset',
} as const;

/** Named locations, structurally compatible with vue-router's RouteLocationRaw. */
export const routeTo = {
  renders: () => ({ name: ROUTE_NAMES.renders }),
  compose: (templateId: string, presetId?: string) => ({
    name: ROUTE_NAMES.compose,
    params: { [ROUTE_PARAMS.templateId]: templateId },
    query: presetId ? { [ROUTE_QUERY.preset]: presetId } : {},
  }),
  music: () => ({ name: ROUTE_NAMES.music }),
};
