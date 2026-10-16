<script setup lang="ts">
import type { MediaLibraryQuery } from '@vgen/shared';
import { Sparkles } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { KIND_OPTIONS, SORT_OPTIONS } from '@/features/media/constants';
import type { LibraryKindFilter } from '@/features/media/types';

defineProps<{
  totalLabel: string;
}>();

const emit = defineEmits<{
  cleanup: [];
}>();
const kind = defineModel<LibraryKindFilter>('kind', { required: true });
const sort = defineModel<MediaLibraryQuery['sort']>('sort', { required: true });

const isKind = (value: unknown): value is LibraryKindFilter =>
  KIND_OPTIONS.some((option) => option.value === value);
const isSort = (value: unknown): value is MediaLibraryQuery['sort'] =>
  SORT_OPTIONS.some((option) => option.value === value);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- A filter always has a value: ignore "deselect" clicks (empty value). -->
    <ToggleGroup
      type="single"
      variant="outline"
      :model-value="kind"
      @update:model-value="(raw) => isKind(raw) && (kind = raw)"
    >
      <ToggleGroupItem v-for="option in KIND_OPTIONS" :key="option.value" :value="option.value">
        {{ option.label }}
      </ToggleGroupItem>
    </ToggleGroup>
    <Select :model-value="sort" @update:model-value="(raw) => isSort(raw) && (sort = raw)">
      <SelectTrigger class="w-40" aria-label="Sort">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <span class="text-sm text-muted-foreground tabular-nums">{{ totalLabel }}</span>
    <Button variant="outline" class="ml-auto" @click="emit('cleanup')"> <Sparkles /> Clean up unused </Button>
  </div>
</template>
