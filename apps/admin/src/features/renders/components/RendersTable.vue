<script setup lang="ts">
import { Film, FilterX } from '@lucide/vue';
import type { RenderDayDto, RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Button } from '@/components/ui/button';
import { dayKey, dayLabel } from '@/lib/days';
import type { CheckState } from '@/lib/render-files';
import RenderDayHeader from './RenderDayHeader.vue';
import { createRenderColumns } from './render-columns';

const props = defineProps<{
  rows: RenderJobDto[];
  loading: boolean;
  busyIds: ReadonlySet<string>;
  templateNames: ReadonlyMap<string, string>;
  /** Changes the empty state: "nothing matches" instead of "nothing yet". */
  filtered: boolean;
  /** Rows are grouped by calendar day of this time zone. */
  timeZone: string;
  /** Day counts over every page, by day key. */
  days: ReadonlyMap<string, RenderDayDto>;
  isSelected: (id: string) => boolean;
  pageState: CheckState;
  dayState: (key: string) => CheckState;
  /** A day is being selected (loads from the server). */
  selecting: boolean;
}>();

const emit = defineEmits<{
  cancel: [render: RenderJobDto];
  remove: [render: RenderJobDto];
  duplicate: [render: RenderJobDto];
  showError: [render: RenderJobDto];
  showSlides: [render: RenderJobDto];
  downloaded: [render: RenderJobDto];
  toggle: [render: RenderJobDto];
  togglePage: [];
  toggleDay: [key: string];
  resetFilters: [];
}>();

const keyOf = (render: RenderJobDto): string => dayKey(render.createdAt, props.timeZone);
const todayKey = computed(() => dayKey(new Date(), props.timeZone));

const columns = computed(() =>
  createRenderColumns({
    templateName: (id) => props.templateNames.get(id) ?? id,
    isBusy: (id) => props.busyIds.has(id),
    onCancel: (render) => {
      emit('cancel', render);
    },
    onRemove: (render) => {
      emit('remove', render);
    },
    onDuplicate: (render) => {
      emit('duplicate', render);
    },
    onShowError: (render) => {
      emit('showError', render);
    },
    onShowSlides: (render) => {
      emit('showSlides', render);
    },
    onDownloaded: (render) => {
      emit('downloaded', render);
    },
    isSelected: (id) => props.isSelected(id),
    onToggle: (render) => {
      emit('toggle', render);
    },
    pageState: () => props.pageState,
    onTogglePage: () => {
      emit('togglePage');
    },
  }),
);
</script>

<template>
  <DataTable
    :columns="columns"
    :data="rows"
    :loading="loading"
    :get-row-id="(render) => render.id"
    :group-key="keyOf"
  >
    <template #group="{ value }">
      <RenderDayHeader
        :label="dayLabel(value, todayKey)"
        :counts="days.get(value) ?? null"
        :state="dayState(value)"
        :busy="selecting"
        @toggle="emit('toggleDay', value)"
      />
    </template>
    <template #empty>
      <EmptyState
        v-if="filtered"
        :icon="FilterX"
        title="No renders match these filters"
        description="Try another status, template or engine."
      >
        <template #actions>
          <Button variant="outline" size="sm" @click="emit('resetFilters')">Reset filters</Button>
        </template>
      </EmptyState>
      <EmptyState
        v-else
        :icon="Film"
        title="No renders yet"
        description="Videos and slides you generate from templates will appear here."
      />
    </template>
  </DataTable>
</template>
