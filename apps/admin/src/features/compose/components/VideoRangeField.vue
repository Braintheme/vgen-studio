<script setup lang="ts">
import { Pause, Play } from '@lucide/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import FilmstripRange from '@/components/common/FilmstripRange.vue';
import type { CustomFieldSpec } from '@/components/schema-form/types';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatTimecode } from '@/lib/format';
import { clampVideoRange, type VideoRangeValue } from '@/lib/video-range';
import type { VideoRangeSource } from '@/features/compose/types';

/** Picks the used fragment of a long video: a scrubbable preview, a filmstrip range, set-here buttons. */
const props = defineProps<{
  field: CustomFieldSpec;
  source: VideoRangeSource | null;
}>();

const video = useTemplateRef<HTMLVideoElement>('video');
const currentSec = ref(0);
const playing = ref(false);
const limits = computed(() => ({
  durationSec: props.source?.durationSec ?? 0,
  minSec: props.field.limits?.min ?? 0,
  maxSec: props.field.limits?.max ?? Infinity,
}));

const asRange = (value: unknown): VideoRangeValue => {
  const range = (value ?? {}) as Partial<VideoRangeValue>;
  return { startSec: range.startSec ?? 0, endSec: range.endSec ?? 0 };
};

const seek = (seconds: number): void => {
  if (video.value) video.value.currentTime = seconds;
  currentSec.value = seconds;
};

/** Applies a change; shows the frame under the handle that moved. */
const update = (value: unknown, next: VideoRangeValue, handleChange: (value: unknown) => void): void => {
  const previous = asRange(value);
  const clamped = clampVideoRange(next, limits.value, previous);
  handleChange(clamped);
  video.value?.pause();
  seek(clamped.startSec !== previous.startSec ? clamped.startSec : clamped.endSec);
};

const toggle = (value: unknown): void => {
  const element = video.value;
  if (!element) return;
  if (!element.paused) {
    element.pause();
    return;
  }
  const range = asRange(value);
  if (element.currentTime < range.startSec || element.currentTime >= range.endSec - 0.05)
    seek(range.startSec);
  void element.play();
};

/** Plays the fragment only: stops at its end. */
const onTime = (value: unknown): void => {
  const element = video.value;
  if (!element) return;
  currentSec.value = element.currentTime;
  if (!element.paused && element.currentTime >= asRange(value).endSec) {
    element.pause();
    seek(asRange(value).startSec);
  }
};

watch(
  () => props.source?.url,
  () => {
    currentSec.value = 0;
    playing.value = false;
  },
);
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="field.path">
    <FormItem>
      <div class="flex items-center justify-between gap-2">
        <FormLabel>{{ field.label }}</FormLabel>
        <span class="text-xs tabular-nums text-muted-foreground">
          {{ formatTimecode(asRange(value).startSec) }} – {{ formatTimecode(asRange(value).endSec) }} ·
          {{ (asRange(value).endSec - asRange(value).startSec).toFixed(1) }} s
        </span>
      </div>
      <p v-if="!source" class="text-xs text-muted-foreground">Upload the clip to choose its fragment.</p>
      <template v-else>
        <div class="relative overflow-hidden rounded-md bg-black">
          <video
            ref="video"
            :key="source.url"
            :src="source.url"
            :poster="source.posterUrl ?? undefined"
            class="mx-auto max-h-72 w-full object-contain"
            preload="auto"
            playsinline
            muted
            @timeupdate="onTime(value)"
            @play="playing = true"
            @pause="playing = false"
          />
          <Button
            variant="secondary"
            size="icon"
            class="absolute bottom-2 left-2 size-8"
            :aria-label="playing ? 'Pause' : 'Play the fragment'"
            @click="toggle(value)"
          >
            <Pause v-if="playing" /><Play v-else />
          </Button>
        </div>
        <FilmstripRange
          :model-value="[asRange(value).startSec, asRange(value).endSec]"
          :filmstrip="source.filmstrip"
          :duration-sec="source.durationSec"
          :playhead-sec="currentSec"
          @update:model-value="([startSec, endSec]) => update(value, { startSec, endSec }, handleChange)"
        />
        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="update(value, { ...asRange(value), startSec: currentSec }, handleChange)"
          >
            Start here
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="update(value, { ...asRange(value), endSec: currentSec }, handleChange)"
          >
            End here
          </Button>
          <span class="ml-auto self-center text-xs text-muted-foreground">
            {{ field.limits ? `${field.limits.min}–${field.limits.max} s` : '' }}
          </span>
        </div>
        <p v-if="source.durationSec < (field.limits?.min ?? 0)" class="text-xs text-destructive">
          The video is shorter than {{ field.limits?.min }} s.
        </p>
      </template>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
