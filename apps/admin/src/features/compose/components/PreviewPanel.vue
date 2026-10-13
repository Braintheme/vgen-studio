<script setup lang="ts">
import { Sparkles } from '@lucide/vue';
import type { PlayerAdapter, PlayerInput, QualityPreset } from '@vgen/shared';
import PlayerHost from '@/components/common/PlayerHost.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/format';
import { QUALITY_OPTIONS } from '@/features/compose/constants';
import type { OutputSummary, PosterPreviewView } from '@/features/compose/types';
import PosterFramePreview from './PosterFramePreview.vue';

defineProps<{
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

const toQuality = (raw: unknown): void => {
  const option = QUALITY_OPTIONS.find((candidate) => candidate.value === raw);
  if (option) quality.value = option.value;
};
</script>

<template>
  <Card class="gap-4 py-4">
    <CardContent class="grid gap-4 px-4">
      <PlayerHost v-if="adapter" :adapter="adapter" :input="input" />
      <PosterFramePreview v-else-if="playerUnavailable" :poster="poster" />
      <Skeleton v-else class="aspect-[9/16] w-full" />

      <dl class="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
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
        <Select :model-value="quality" @update:model-value="toQuality">
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
