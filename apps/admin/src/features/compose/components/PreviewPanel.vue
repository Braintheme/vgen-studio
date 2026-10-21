<script setup lang="ts">
import { Sparkles } from '@lucide/vue';
import type { PlayerAdapter, PlayerInput, QualityPreset, StillScale } from '@vgen/shared';
import { computed } from 'vue';
import PlayerHost from '@/components/common/PlayerHost.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/format';
import { QUALITY_OPTIONS, SCALE_OPTIONS } from '@/features/compose/constants';
import type { OutputSummary, PosterPreviewView } from '@/features/compose/types';
import PosterFramePreview from './PosterFramePreview.vue';

const props = defineProps<{
  adapter: PlayerAdapter<HTMLElement> | null;
  playerUnavailable: boolean;
  input: PlayerInput;
  /** Fallback preview when the engine has no browser player. */
  poster: PosterPreviewView;
  summary: OutputSummary;
  generating: boolean;
}>();

const emit = defineEmits<{
  generate: [];
}>();

const quality = defineModel<QualityPreset>('quality', { required: true });
const scale = defineModel<StillScale>('scale', { required: true });

const stills = computed(() => props.summary.output === 'stills');

const toQuality = (raw: unknown): void => {
  const option = QUALITY_OPTIONS.find((candidate) => candidate.value === raw);
  if (option) quality.value = option.value;
};

// Select values are strings; the scale is a number.
const toScale = (raw: unknown): void => {
  const option = SCALE_OPTIONS.find((candidate) => String(candidate.value) === raw);
  if (option) scale.value = option.value;
};
</script>

<template>
  <Card class="gap-4 py-4">
    <CardContent class="grid gap-4 px-4">
      <PlayerHost v-if="adapter" :adapter="adapter" :input="input" />
      <PosterFramePreview v-else-if="playerUnavailable" :poster="poster" />
      <Skeleton v-else class="aspect-[9/16] w-full" />

      <dl v-if="stills" class="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <div>
          <dt>Size</dt>
          <dd class="font-medium text-foreground">
            {{ summary.width * scale }}×{{ summary.height * scale }}
          </dd>
        </div>
        <div>
          <dt>Slides</dt>
          <dd class="font-medium text-foreground">{{ summary.slides }}</dd>
        </div>
        <div>
          <dt>Files</dt>
          <dd class="font-medium text-foreground">JPEG · ZIP</dd>
        </div>
      </dl>
      <dl v-else class="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <div>
          <dt>Size</dt>
          <dd class="font-medium text-foreground">{{ summary.width }}×{{ summary.height }}</dd>
        </div>
        <div>
          <dt>Frame rate</dt>
          <dd class="font-medium text-foreground">{{ summary.fps }} fps</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd class="font-medium text-foreground">{{ formatDuration(summary.durationSec) }}</dd>
        </div>
      </dl>

      <div class="flex gap-2">
        <Select v-if="stills" :model-value="String(scale)" @update:model-value="toScale">
          <SelectTrigger class="flex-1" aria-label="Slide size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in SCALE_OPTIONS" :key="option.value" :value="String(option.value)">{{
              option.label
            }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-else :model-value="quality" @update:model-value="toQuality">
          <SelectTrigger class="flex-1" aria-label="Quality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in QUALITY_OPTIONS" :key="option.value" :value="option.value">{{
              option.label
            }}</SelectItem>
          </SelectContent>
        </Select>
        <Button :disabled="generating" @click="emit('generate')">
          <Sparkles /> {{ generating ? 'Queuing…' : 'Generate' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
