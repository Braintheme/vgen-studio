<script setup lang="ts">
import { Spinner } from '@/components/ui/spinner';
import type { PosterPreviewView } from '@/features/compose/types';

/** Preview of engines without a browser player: a still frame rendered by the worker. */
defineProps<{
  poster: PosterPreviewView;
}>();
</script>

<template>
  <div class="grid gap-2">
    <div
      class="relative w-full overflow-hidden rounded-lg bg-muted"
      :style="{ aspectRatio: `${poster.width} / ${poster.height}` }"
    >
      <img
        v-if="poster.url"
        :src="poster.url"
        alt="Preview frame"
        class="size-full object-contain"
        :class="{ 'opacity-60': poster.loading }"
      />
      <div v-if="poster.loading" class="absolute inset-0 grid place-items-center">
        <Spinner class="size-6" />
      </div>
    </div>
    <p class="text-xs text-muted-foreground">
      {{
        poster.message ?? 'This engine has no live player: showing the poster frame rendered by its worker.'
      }}
    </p>
  </div>
</template>
