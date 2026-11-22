<script setup lang="ts">
import { FolderKanban } from '@lucide/vue';

/** A project's first photo (or its clip's poster), small, left-aligned like the renders table. */
defineProps<{
  url: string | null;
  alt: string;
}>();
</script>

<template>
  <div class="flex h-14 w-14 items-center justify-start">
    <img
      v-if="url"
      :src="url"
      :alt="alt"
      loading="lazy"
      class="max-h-14 max-w-14 rounded-sm border object-cover"
    />
    <div v-else class="flex size-10 items-center justify-center rounded-sm border bg-muted">
      <FolderKanban class="size-4 text-muted-foreground" />
    </div>
  </div>
</template>
