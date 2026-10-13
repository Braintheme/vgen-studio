<script setup lang="ts">
// Based on the shadcn-vue `sidebar-07` block (collapsible to icons).
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import type { NavItem } from '@/lib/ui-types';
import AppBrand from './AppBrand.vue';
import AppSidebarNav from './AppSidebarNav.vue';

defineProps<{
  items: readonly NavItem[];
}>();
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <AppBrand name="vgen" tagline="Video templates" />
    </SidebarHeader>
    <SidebarContent>
      <AppSidebarNav label="Studio" :items="items" />
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
