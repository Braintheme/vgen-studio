<script setup lang="ts">
// Application shell (container): wires app-level state into layout components.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ThemeToggle from '@/components/layout/ThemeToggle.vue';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useTheme } from '@/composables/useTheme';
import { APP_TITLE, NAV_ITEMS } from './routes';

const route = useRoute();
const { mode } = useTheme();
const title = computed(() => route.meta.title ?? APP_TITLE);
</script>

<template>
  <SidebarProvider>
    <AppSidebar :items="NAV_ITEMS" />
    <SidebarInset>
      <AppHeader :title="title">
        <template #actions>
          <ThemeToggle v-model="mode" />
        </template>
      </AppHeader>
      <main class="flex flex-1 flex-col gap-6 p-6">
        <!-- Keyed by path: screens built for one entity (e.g. a template) start fresh per entity. -->
        <RouterView v-slot="{ Component, route: current }">
          <component :is="Component" :key="current.path" />
        </RouterView>
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
