<script setup lang="ts">
import { Pause, Play } from '@lucide/vue';
import { useMutationObserver } from '@vueuse/core';
import { onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createWaveformRegion,
  type WaveformRegionController,
  type WaveformSource,
} from '@/lib/waveform-region';

/** A track waveform with a draggable fixed-length fragment and a "play fragment" button. */
const props = defineProps<{
  source: WaveformSource;
  lengthSec: number;
  disabled?: boolean;
}>();

const startSec = defineModel<number>({ required: true });

const container = useTemplateRef<HTMLDivElement>('container');
const controller = shallowRef<WaveformRegionController | null>(null);
const ready = ref(false);
const playing = ref(false);

const state = () => ({ startSec: startSec.value, lengthSec: props.lengthSec, disabled: props.disabled });

const destroy = (): void => {
  controller.value?.destroy();
  controller.value = null;
  ready.value = false;
  playing.value = false;
};

watch(
  () => [container.value, props.source.url, props.source.peaks] as const,
  ([element]) => {
    destroy();
    if (!element) return;
    controller.value = createWaveformRegion(element, props.source, state(), {
      onReady: () => {
        ready.value = true;
      },
      onPlayingChange: (value) => {
        playing.value = value;
      },
      onMove: (start) => {
        startSec.value = start;
      },
    });
  },
  { flush: 'post' },
);

watch(state, (next) => controller.value?.update(next));

// Canvas colors come from CSS variables: re-read them when the theme class flips.
useMutationObserver(
  document.documentElement,
  () => {
    controller.value?.refreshColors();
  },
  { attributes: true, attributeFilter: ['class'] },
);

onBeforeUnmount(destroy);
</script>

<template>
  <div class="flex items-center gap-2">
    <Button
      variant="outline"
      size="icon"
      class="size-8 shrink-0 rounded-full"
      :disabled="!ready"
      :aria-label="playing ? 'Stop the fragment' : 'Play the fragment'"
      @click="controller?.togglePlay()"
    >
      <Pause v-if="playing" />
      <Play v-else />
    </Button>
    <div class="relative min-w-0 flex-1" :class="{ 'opacity-50': disabled }">
      <div ref="container" />
      <Skeleton v-if="!ready" class="absolute inset-0" />
    </div>
  </div>
</template>
