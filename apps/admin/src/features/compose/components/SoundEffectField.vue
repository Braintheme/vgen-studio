<script setup lang="ts">
import type { MusicTrackDto } from '@vgen/shared';
import type { CustomFieldSpec } from '@/components/schema-form/types';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatDuration } from '@/lib/format';
import { BUILT_IN_SOUND_VALUE } from '@/features/compose/constants';

/** A sound cue: on/off, the built-in sound or a library track, and its volume. */
defineProps<{
  field: CustomFieldSpec;
  tracks: readonly MusicTrackDto[];
}>();

/** `null` = the built-in sound. */
const toTrackId = (raw: unknown): string | null =>
  typeof raw === 'string' && raw !== BUILT_IN_SOUND_VALUE ? raw : null;
const toSelectValue = (value: unknown): string => (typeof value === 'string' ? value : BUILT_IN_SOUND_VALUE);
</script>

<template>
  <div class="grid gap-2">
    <FormField v-slot="{ value, handleChange }" :name="`${field.path}.enabled`">
      <FormItem class="flex items-center justify-between gap-4">
        <FormLabel>{{ field.label }}</FormLabel>
        <FormControl>
          <Switch :model-value="value === true" @update:model-value="handleChange" />
        </FormControl>
      </FormItem>
    </FormField>
    <div class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3">
      <FormField v-slot="{ value, handleChange }" :name="`${field.path}.trackId`">
        <Select
          :model-value="toSelectValue(value)"
          @update:model-value="(raw) => handleChange(toTrackId(raw))"
        >
          <SelectTrigger class="w-full" :aria-label="`${field.label}: sound`">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="BUILT_IN_SOUND_VALUE">Built-in sound</SelectItem>
            <SelectItem v-for="track in tracks" :key="track.id" :value="track.id">
              {{ track.title }} · {{ formatDuration(track.durationSec) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField v-slot="{ value, handleChange }" :name="`${field.path}.volume`">
        <Slider
          :model-value="[typeof value === 'number' ? value : 0.8]"
          :min="0"
          :max="1"
          :step="0.05"
          :aria-label="`${field.label}: volume`"
          @update:model-value="(next) => next && handleChange(next[0])"
        />
      </FormField>
    </div>
  </div>
</template>
