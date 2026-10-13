<script setup lang="ts">
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/lib/ui-types';

defineProps<{
  label: string;
  items: readonly NavItem[];
}>();
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ label }}</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in items" :key="item.to">
        <RouterLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <SidebarMenuButton as-child :is-active="isActive" :tooltip="item.title">
            <a :href="href" @click="navigate">
              <component :is="item.icon" />
              <span>{{ item.title }}</span>
            </a>
          </SidebarMenuButton>
        </RouterLink>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
