<script setup lang="ts">
import { FilterX, FolderKanban } from '@lucide/vue';
import type { ProjectDayDto, ProjectDto } from '@vgen/shared';
import { computed } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import DayGroupHeader from '@/components/common/DayGroupHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Button } from '@/components/ui/button';
import { dayKey, dayLabel } from '@/lib/days';
import type { CheckState } from '@/lib/render-files';
import { createProjectColumns } from './project-columns';

const props = defineProps<{
  rows: ProjectDto[];
  loading: boolean;
  busy: boolean;
  templateNames: ReadonlyMap<string, string>;
  presetNames: ReadonlyMap<string, string>;
  /** Changes the empty state: "nothing matches" instead of "nothing yet". */
  filtered: boolean;
  timeZone: string;
  /** Day counts over every page, by day key. */
  days: ReadonlyMap<string, ProjectDayDto>;
  isSelected: (id: string) => boolean;
  pageState: CheckState;
  dayState: (key: string) => CheckState;
  /** A day is being selected (loads from the server). */
  selecting: boolean;
}>();

const emit = defineEmits<{
  render: [project: ProjectDto];
  duplicate: [project: ProjectDto];
  remove: [project: ProjectDto];
  toggle: [project: ProjectDto];
  togglePage: [];
  toggleDay: [key: string];
  resetFilters: [];
  create: [];
}>();

const keyOf = (project: ProjectDto): string => dayKey(project.createdAt, props.timeZone);
const todayKey = computed(() => dayKey(new Date(), props.timeZone));

const summaryOf = (key: string): string | null => {
  const counts = props.days.get(key);
  if (!counts) return null;
  const parts = [`${String(counts.total)} ${counts.total === 1 ? 'project' : 'projects'}`];
  parts.push(counts.notRendered > 0 ? `${String(counts.notRendered)} not rendered` : 'all rendered');
  return parts.join(' · ');
};

const columns = computed(() =>
  createProjectColumns({
    templateName: (id) => props.templateNames.get(id) ?? id,
    presetName: (id) => (id ? (props.presetNames.get(id) ?? null) : null),
    timeZone: props.timeZone,
    busy: () => props.busy,
    isSelected: (id) => props.isSelected(id),
    onToggle: (project) => {
      emit('toggle', project);
    },
    pageState: () => props.pageState,
    onTogglePage: () => {
      emit('togglePage');
    },
    onRender: (project) => {
      emit('render', project);
    },
    onDuplicate: (project) => {
      emit('duplicate', project);
    },
    onRemove: (project) => {
      emit('remove', project);
    },
  }),
);
</script>

<template>
  <DataTable
    :columns="columns"
    :data="rows"
    :loading="loading"
    :get-row-id="(project) => project.id"
    :group-key="keyOf"
  >
    <template #group="{ value }">
      <DayGroupHeader
        :label="dayLabel(value, todayKey)"
        :summary="summaryOf(value)"
        :state="dayState(value)"
        :disabled="selecting || !days.get(value)"
        @toggle="emit('toggleDay', value)"
      />
    </template>
    <template #empty>
      <EmptyState
        v-if="filtered"
        :icon="FilterX"
        title="No projects match these filters"
        description="Try another template, or show rendered and not rendered ones."
      >
        <template #actions>
          <Button variant="outline" size="sm" @click="emit('resetFilters')">Reset filters</Button>
        </template>
      </EmptyState>
      <EmptyState
        v-else
        :icon="FolderKanban"
        title="No projects yet"
        description="A project is a video prepared to be reviewed, adjusted and rendered later."
      >
        <template #actions>
          <Button size="sm" @click="emit('create')">New project</Button>
        </template>
      </EmptyState>
    </template>
  </DataTable>
</template>
