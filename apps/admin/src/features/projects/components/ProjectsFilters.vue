<script setup lang="ts">
import { computed } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';
import { Button } from '@/components/ui/button';
import {
  EMPTY_PROJECT_FILTERS,
  hasActiveProjectFilters,
  type ProjectFilterOptions,
  type ProjectFilters,
} from '@/features/projects/types';

defineProps<{
  options: ProjectFilterOptions;
}>();

const filters = defineModel<ProjectFilters>({ required: true });

const field = <K extends keyof ProjectFilters>(key: K) =>
  computed<ProjectFilters[K]>({
    get: () => filters.value[key],
    set: (value) => {
      filters.value = { ...filters.value, [key]: value };
    },
  });

const templateId = field('templateId');
const rendered = field('rendered');
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <FilterSelect
      v-model="templateId"
      label="Template"
      all-label="All templates"
      :options="options.templates"
    />
    <FilterSelect
      v-model="rendered"
      label="Rendered"
      all-label="Rendered or not"
      :options="options.rendered"
    />
    <Button
      v-if="hasActiveProjectFilters(filters)"
      variant="ghost"
      size="sm"
      @click="filters = EMPTY_PROJECT_FILTERS"
    >
      Reset
    </Button>
  </div>
</template>
