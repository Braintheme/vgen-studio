<script setup lang="ts">
import type { MusicTrackDto } from '@vgen/shared';
import { computed } from 'vue';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDuration } from '@/lib/format';
import { DEFAULT_TRACK_VALUE } from '@/features/compose/constants';

const props = defineProps<{
  label: string;
  tracks: readonly MusicTrackDto[];
  defaultTrack: MusicTrackDto | null;
  disabled: boolean;
}>();

/** `null` = the library default. */
const trackId = defineModel<string | null>({ required: true });

const defaultLabel = computed(() =>
  props.defaultTrack ? `Library default · ${props.defaultTrack.title}` : 'Library default (none yet)',
);

const selectedLabel = computed(
  () => props.tracks.find((track) => track.id === trackId.value)?.title ?? defaultLabel.value,
);

const onSelect = (value: unknown): void => {
  trackId.value = typeof value === 'string' && value !== DEFAULT_TRACK_VALUE ? value : null;
};
</script>

<template>
  <div class="grid gap-2">
    <Label>{{ label }}</Label>
    <Select :model-value="trackId ?? DEFAULT_TRACK_VALUE" :disabled="disabled" @update:model-value="onSelect">
      <SelectTrigger class="w-full" :aria-label="label">
        <SelectValue>{{ selectedLabel }}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="DEFAULT_TRACK_VALUE">{{ defaultLabel }}</SelectItem>
        <SelectItem v-for="track in tracks" :key="track.id" :value="track.id">
          {{ track.title }} · {{ formatDuration(track.durationSec) }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
