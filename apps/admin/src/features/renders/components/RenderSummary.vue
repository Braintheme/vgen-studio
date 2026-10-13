<script setup lang="ts">
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import { formatBytes, formatDuration } from '@/lib/format';

const props = defineProps<{
  render: RenderJobDto;
  templateName: string;
}>();

const fileInfo = computed(() => {
  const output = props.render.output;
  if (!output) return null;
  return [output.durationSec === null ? null : formatDuration(output.durationSec), formatBytes(output.size)]
    .filter(Boolean)
    .join(' · ');
});
</script>

<template>
  <div class="min-w-0 space-y-0.5">
    <p class="truncate font-medium" :title="render.outputName">{{ render.outputName }}</p>
    <p class="truncate text-xs text-muted-foreground">
      {{ templateName }} · {{ render.format }} · {{ render.quality }}
      <template v-if="fileInfo"> · {{ fileInfo }}</template>
    </p>
  </div>
</template>
