<script setup lang="ts">
import { Film, FilterX } from '@lucide/vue';
import type { RenderJobDto } from '@vgen/shared';
import { computed } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Button } from '@/components/ui/button';
import { createRenderColumns } from './render-columns';

const props = defineProps<{
  rows: RenderJobDto[];
  loading: boolean;
  busyIds: ReadonlySet<string>;
  templateNames: ReadonlyMap<string, string>;
  /** Changes the empty state: "nothing matches" instead of "nothing yet". */
  filtered: boolean;
}>();

const emit = defineEmits<{
  cancel: [render: RenderJobDto];
  remove: [render: RenderJobDto];
  duplicate: [render: RenderJobDto];
  showError: [render: RenderJobDto];
  resetFilters: [];
}>();

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
  }),
);
</script>

<template>
  <DataTable :columns="columns" :data="rows" :loading="loading" :get-row-id="(render) => render.id">
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
        description="Videos you generate from templates will appear here."
      />
    </template>
  </DataTable>
</template>
