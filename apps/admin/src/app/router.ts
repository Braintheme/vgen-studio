import { createRouter, createWebHistory } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/lib/routes';
import AppLayout from './AppLayout.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      redirect: ROUTE_PATHS.templates,
      children: [
        {
          name: ROUTE_NAMES.templates,
          path: ROUTE_PATHS.templates,
          meta: { title: 'Templates' },
          component: () => import('@/features/templates/views/TemplatesView.vue'),
        },
        {
          name: ROUTE_NAMES.compose,
          path: ROUTE_PATHS.compose,
          meta: { title: 'Create video' },
          component: () => import('@/features/compose/views/ComposeView.vue'),
        },
        {
          name: ROUTE_NAMES.renders,
          path: ROUTE_PATHS.renders,
          meta: { title: 'Renders' },
          component: () => import('@/features/renders/views/RendersView.vue'),
        },
        {
          name: ROUTE_NAMES.music,
          path: ROUTE_PATHS.music,
          meta: { title: 'Music' },
          component: () => import('@/features/music/views/MusicView.vue'),
        },
        {
          name: ROUTE_NAMES.presets,
          path: ROUTE_PATHS.presets,
          meta: { title: 'Style presets' },
          component: () => import('@/features/presets/views/PresetsView.vue'),
        },
      ],
    },
  ],
});
