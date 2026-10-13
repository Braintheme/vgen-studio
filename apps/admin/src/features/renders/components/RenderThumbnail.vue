<script setup lang="ts">
import { Film } from '@lucide/vue';
import { FORMATS, type Format } from '@vgen/shared';
import { computed } from 'vue';

const props = defineProps<{
  url: string | null;
  format: Format;
  alt: string;
}>();

const aspectRatio = computed(() => `${FORMATS[props.format].width} / ${FORMATS[props.format].height}`);
</script>

<template>
  <div class="flex h-14 w-14 items-center justify-center">
    <img
      v-if="url"
      :src="url"
      :alt="alt"
      loading="lazy"
      class="max-h-14 max-w-14 rounded-sm border object-cover"
      :style="{ aspectRatio }"
    />
    <div
      v-else
      class="flex max-h-14 max-w-14 items-center justify-center rounded-sm border bg-muted"
      :style="{ aspectRatio, height: '3.5rem' }"
    >
      <Film class="size-4 text-muted-foreground" />
    </div>
  </div>
</template>
