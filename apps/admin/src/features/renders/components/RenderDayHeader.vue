<script setup lang="ts">
import type { RenderDayDto } from '@vgen/shared';
import { computed } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';
import type { DayLabel } from '@/lib/days';
import type { CheckState } from '@/lib/render-files';

/** The header row of one calendar day: its name, counts over all pages and a "select the day" box. */
const props = defineProps<{
  label: DayLabel;
  /** Counts over every page; null while they load. */
  counts: RenderDayDto | null;
  state: CheckState;
  busy: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const summary = computed(() => {
  const counts = props.counts;
  if (!counts) return null;
  const parts = [`${String(counts.total)} ${counts.total === 1 ? 'render' : 'renders'}`];
  if (counts.notDownloaded > 0) parts.push(`${String(counts.notDownloaded)} not downloaded`);
  else if (counts.ready > 0) parts.push('all downloaded');
  return parts.join(' · ');
});
</script>

<template>
  <div class="flex items-center gap-3">
    <Checkbox
      :model-value="state"
      :disabled="busy || !counts || counts.ready === 0"
      :aria-label="`Select ${label.relative ?? label.date}`"
      @update:model-value="emit('toggle')"
    />
    <span class="text-sm font-semibold">
      <template v-if="label.relative">{{ label.relative }} · </template>{{ label.date }}
    </span>
    <span v-if="summary" class="text-xs text-muted-foreground">{{ summary }}</span>
  </div>
</template>
