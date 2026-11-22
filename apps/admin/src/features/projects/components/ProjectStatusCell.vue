<script setup lang="ts">
import { CircleCheck, CircleX, LoaderCircle, PencilLine } from '@lucide/vue';
import type { ProjectStatusView } from '@/lib/project-status';

/** "Not rendered" / "Rendering 40%" / "Rendered 14:05" / "Render failed", plus "Edited since render". */
defineProps<{ status: ProjectStatusView }>();
</script>

<template>
  <div class="flex flex-col items-start gap-1 text-sm">
    <span
      class="inline-flex items-center gap-1.5"
      :class="{
        'text-muted-foreground': status.tone === 'idle',
        'text-emerald-600 dark:text-emerald-500': status.tone === 'done',
        'text-destructive': status.tone === 'failed',
      }"
    >
      <LoaderCircle v-if="status.tone === 'active'" class="size-3.5 animate-spin" />
      <CircleCheck v-else-if="status.tone === 'done'" class="size-3.5" />
      <CircleX v-else-if="status.tone === 'failed'" class="size-3.5" />
      {{ status.label }}
    </span>
    <span
      v-if="status.editedSinceRender"
      class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
    >
      <PencilLine class="size-3" /> Edited since render
    </span>
  </div>
</template>
