<script setup lang="ts">
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import { formatBytes, formatDuration } from '@/lib/format';

const props = defineProps<{
  render: RenderJobDto;
  templateName: string;
}>();

/** Videos show their quality preset, slides their size. */
const quality = computed(() =>
  props.render.outputName.endsWith('.zip') ? `${String(props.render.scale)}×` : props.render.quality,
);

const fileInfo = computed(() => {
  const { stills } = props.render;
  if (stills) {
    const size = stills.slides.reduce((sum, slide) => sum + slide.size, 0);
    return `${String(stills.slides.length)} slides · ${formatBytes(size)}`;
  }
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
      {{ templateName }} · {{ render.format }} · {{ quality }}
      <template v-if="fileInfo"> · {{ fileInfo }}</template>
    </p>
  </div>
</template>
