<script setup lang="ts">
import { routeTo } from '@/lib/routes';

/** A project's name (opens the editor) and what it is made of. */
defineProps<{
  id: string;
  name: string;
  templateName: string;
  presetName: string | null;
}>();
</script>

<template>
  <div class="min-w-0 space-y-0.5">
    <RouterLink :to="routeTo.project(id)" class="block truncate font-medium hover:underline" :title="name">
      {{ name }}
    </RouterLink>
    <p class="truncate text-xs text-muted-foreground">
      {{ templateName }}<template v-if="presetName"> · {{ presetName }}</template>
    </p>
  </div>
</template>
