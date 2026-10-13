<script setup lang="ts">
import { computed } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';
import { Button } from '@/components/ui/button';
import {
  EMPTY_RENDER_FILTERS,
  hasActiveFilters,
  type RenderFilterOptions,
  type RenderFilters,
} from '@/features/renders/types';

defineProps<{
  options: RenderFilterOptions;
}>();

const filters = defineModel<RenderFilters>({ required: true });

/** Two-way binding for one filter field. */
const field = <K extends keyof RenderFilters>(key: K) =>
  computed<RenderFilters[K]>({
    get: () => filters.value[key],
    set: (value) => {
      filters.value = { ...filters.value, [key]: value };
    },
  });

const status = field('status');
const templateId = field('templateId');
const engine = field('engine');

const hasFilters = computed(() => hasActiveFilters(filters.value));

const reset = (): void => {
  filters.value = EMPTY_RENDER_FILTERS;
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <FilterSelect v-model="status" label="Status" all-label="All statuses" :options="options.statuses" />
    <FilterSelect
      v-model="templateId"
      label="Template"
      all-label="All templates"
      :options="options.templates"
    />
    <FilterSelect v-model="engine" label="Engine" all-label="All engines" :options="options.engines" />
    <Button v-if="hasFilters" variant="ghost" size="sm" @click="reset">Reset</Button>
  </div>
</template>
