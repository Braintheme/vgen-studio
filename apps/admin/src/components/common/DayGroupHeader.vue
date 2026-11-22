<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox';
import type { DayLabel } from '@/lib/days';
import type { CheckState } from '@/lib/render-files';

/** The header row of one calendar day in a table: its name, a summary and a "select the day" box. */
defineProps<{
  label: DayLabel;
  /** "5 renders · 2 not downloaded"; null while the counts load. */
  summary: string | null;
  state: CheckState;
  disabled: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <div class="flex items-center gap-3">
    <Checkbox
      :model-value="state"
      :disabled="disabled"
      :aria-label="`Select ${label.relative ?? label.date}`"
      @update:model-value="emit('toggle')"
    />
    <span class="text-sm font-semibold">
      <template v-if="label.relative">{{ label.relative }} · </template>{{ label.date }}
    </span>
    <span v-if="summary" class="text-xs text-muted-foreground">{{ summary }}</span>
  </div>
</template>
