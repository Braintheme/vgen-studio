<script setup lang="ts">
import WaveformRegion from '@/components/common/WaveformRegion.vue';
import { Label } from '@/components/ui/label';
import { formatTimecode } from '@/lib/format';
import type { WaveformSource } from '@/lib/waveform-region';

defineProps<{
  label: string;
  source: WaveformSource;
  lengthSec: number;
  disabled: boolean;
}>();

const startSec = defineModel<number>({ required: true });
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-center justify-between gap-2">
      <Label>{{ label }}</Label>
      <span class="text-xs tabular-nums text-muted-foreground">
        {{ formatTimecode(startSec) }} – {{ formatTimecode(startSec + lengthSec) }}
      </span>
    </div>
    <WaveformRegion v-model="startSec" :source="source" :length-sec="lengthSec" :disabled="disabled" />
    <p class="text-xs text-muted-foreground">
      Drag the highlighted fragment to choose which part of the track plays.
    </p>
  </div>
</template>
