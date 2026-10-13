<script setup lang="ts">
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

defineProps<{
  title: string;
}>();

defineSlots<{
  /** Right-aligned header controls (theme toggle...). */
  actions?: () => unknown;
}>();
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
  >
    <SidebarTrigger class="-ml-1" />
    <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
    <span class="text-sm font-medium">{{ title }}</span>
    <div class="ml-auto flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
