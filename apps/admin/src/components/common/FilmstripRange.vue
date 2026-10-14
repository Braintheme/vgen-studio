<script setup lang="ts">
import type { FilmstripDto } from '@vgen/shared';
import { computed } from 'vue';
import { Slider } from '@/components/ui/slider';

/** A two-handle range over a strip of video frames; the area outside the range is dimmed. */
const props = defineProps<{
  filmstrip: FilmstripDto | null;
  durationSec: number;
  /** Current playback position, seconds (a thin marker), or null. */
  playheadSec: number | null;
  disabled?: boolean;
}>();

const range = defineModel<[number, number]>({ required: true });

const percent = (seconds: number): string =>
  `${((100 * seconds) / Math.max(0.001, props.durationSec)).toFixed(3)}%`;

const strip = computed(() =>
  props.filmstrip ? { backgroundImage: `url("${props.filmstrip.url}")`, backgroundSize: '100% 100%' } : {},
);
</script>

<template>
  <div class="relative h-14 overflow-hidden rounded-md bg-muted" :style="strip">
    <div class="absolute inset-y-0 left-0 bg-background/70" :style="{ width: percent(range[0]) }" />
    <div class="absolute inset-y-0 right-0 bg-background/70" :style="{ left: percent(range[1]) }" />
    <div
      class="pointer-events-none absolute inset-y-0 border-y-2 border-primary"
      :style="{ left: percent(range[0]), width: `calc(${percent(range[1])} - ${percent(range[0])})` }"
    />
    <div
      v-if="playheadSec !== null"
      class="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
      :style="{ left: percent(playheadSec) }"
    />
    <Slider
      class="absolute inset-0 h-full [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:h-14 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:rounded-sm [&_[data-slot=slider-track]]:bg-transparent"
      :model-value="range"
      :min="0"
      :max="durationSec"
      :step="0.1"
      :disabled="disabled"
      @update:model-value="(next) => next && next.length === 2 && (range = [next[0] ?? 0, next[1] ?? 0])"
    />
  </div>
</template>
