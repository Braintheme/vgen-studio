import { Clapperboard, Film, LayoutTemplate, Music, Palette } from '@lucide/vue';
import { ROUTE_PATHS } from '@/lib/routes';
import type { NavItem } from '@/lib/ui-types';

export const NAV_ITEMS: readonly NavItem[] = [
  { title: 'Templates', to: ROUTE_PATHS.templates, icon: LayoutTemplate },
  { title: 'Renders', to: ROUTE_PATHS.renders, icon: Film },
  { title: 'Music', to: ROUTE_PATHS.music, icon: Music },
  { title: 'Style presets', to: ROUTE_PATHS.presets, icon: Palette },
];

/** Shown in the header when a route defines no title. */
export const APP_TITLE = 'vgen';
export const APP_ICON = Clapperboard;
