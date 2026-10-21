<script setup lang="ts">
import { Download } from '@lucide/vue';
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/format';

/** The image render whose slides are shown; `null` closes the dialog. */
const render = defineModel<RenderJobDto | null>('render', { required: true });

const open = computed({
  get: () => render.value !== null,
  set: (value: boolean) => {
    if (!value) render.value = null;
  },
});

const totalSize = computed(() =>
  (render.value?.stills?.slides ?? []).reduce((sum, slide) => sum + slide.size, 0),
);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="render?.stills" class="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Slides</DialogTitle>
        <DialogDescription>
          {{ render.stills.slides.length }} images · {{ formatBytes(totalSize) }} · {{ render.outputName }}
        </DialogDescription>
      </DialogHeader>
      <div class="grid max-h-[65vh] grid-cols-2 gap-3 overflow-auto sm:grid-cols-4">
        <a
          v-for="(slide, index) in render.stills.slides"
          :key="slide.assetId"
          :href="slide.downloadUrl"
          :download="slide.name"
          class="group relative overflow-hidden rounded-md border bg-muted"
          :title="`Download ${slide.name}`"
        >
          <img :src="slide.url" :alt="slide.name" loading="lazy" class="w-full" />
          <span class="absolute top-1 left-1 rounded bg-background/80 px-1.5 text-xs tabular-nums">{{
            index + 1
          }}</span>
          <span
            class="absolute right-1 bottom-1 rounded bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Download class="size-3.5" />
          </span>
        </a>
      </div>
      <Button as-child class="justify-self-end">
        <a :href="render.stills.archiveUrl" :download="render.outputName"><Download /> Download all (ZIP)</a>
      </Button>
    </DialogContent>
  </Dialog>
</template>
