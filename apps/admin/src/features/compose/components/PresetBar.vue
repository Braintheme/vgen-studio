<script setup lang="ts">
import { Save, SwatchBook } from '@lucide/vue';
import type { StylePresetDto } from '@vgen/shared';
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NO_PRESET_VALUE } from '@/features/compose/constants';

const props = defineProps<{
  presets: readonly StylePresetDto[];
  selectedId: string | null;
  modified: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  select: [id: string | null];
  save: [];
  update: [];
}>();

const selectedName = computed(
  () => props.presets.find((preset) => preset.id === props.selectedId)?.name ?? 'No preset',
);

const onSelect = (value: unknown): void => {
  emit('select', typeof value === 'string' && value !== NO_PRESET_VALUE ? value : null);
};
</script>

<template>
  <Card class="py-3">
    <CardContent class="flex flex-wrap items-center gap-2 px-4">
      <SwatchBook class="size-4 text-muted-foreground" />
      <Select :model-value="selectedId ?? NO_PRESET_VALUE" @update:model-value="onSelect">
        <SelectTrigger class="min-w-48 flex-1 sm:flex-none" aria-label="Style preset">
          <SelectValue>{{ selectedName }}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="NO_PRESET_VALUE">No preset</SelectItem>
          <SelectItem v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}{{ preset.isDefault ? ' · default' : '' }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Badge v-if="selectedId && modified" variant="outline">Modified</Badge>
      <div class="ml-auto flex gap-2">
        <Button
          v-if="selectedId && modified"
          variant="outline"
          size="sm"
          :disabled="busy"
          @click="emit('update')"
        >
          Update preset
        </Button>
        <Button variant="outline" size="sm" :disabled="busy" @click="emit('save')"
          ><Save /> Save as preset</Button
        >
      </div>
    </CardContent>
  </Card>
</template>
