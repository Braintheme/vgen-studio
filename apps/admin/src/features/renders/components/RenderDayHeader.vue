<script setup lang="ts">
import type { RenderDayDto } from '@vgen/shared';
import { computed } from 'vue';
import DayGroupHeader from '@/components/common/DayGroupHeader.vue';
import type { DayLabel } from '@/lib/days';
import type { CheckState } from '@/lib/render-files';

/** A day of renders: its name, counts over all pages and a "select the day" box. */
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
  <DayGroupHeader
    :label="label"
    :summary="summary"
    :state="state"
    :disabled="busy || !counts || counts.ready === 0"
    @toggle="emit('toggle')"
  />
</template>
