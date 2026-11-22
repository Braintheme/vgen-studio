<script setup lang="ts">
import { ListChecks, Plus } from '@lucide/vue';
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import LiveIndicator from '@/components/common/LiveIndicator.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { Button } from '@/components/ui/button';
import DuplicateProjectDialog from '@/features/projects/components/DuplicateProjectDialog.vue';
import NewProjectDialog from '@/features/projects/components/NewProjectDialog.vue';
import ProjectSelectionBar from '@/features/projects/components/ProjectSelectionBar.vue';
import ProjectsFilters from '@/features/projects/components/ProjectsFilters.vue';
import ProjectsTable from '@/features/projects/components/ProjectsTable.vue';
import { useDuplicateProject } from '@/features/projects/composables/useDuplicateProject';
import { useNewProject } from '@/features/projects/composables/useNewProject';
import { useProjectActions } from '@/features/projects/composables/useProjectActions';
import { useProjectSelection } from '@/features/projects/composables/useProjectSelection';
import { useProjectsTable } from '@/features/projects/composables/useProjectsTable';

const {
  rows,
  total,
  page,
  pageSize,
  pageSizeOptions,
  filters,
  hasFilters,
  filterOptions,
  templateNames,
  presetNames,
  isLoading,
  isRefreshing,
  error,
  liveConnected,
  retry,
  resetFilters,
  scope,
  timeZone,
  days,
} = useProjectsTable();
const selection = useProjectSelection({ rows, scope, timeZone, days });
const actions = useProjectActions(selection);
const newProject = useNewProject();
const duplication = useDuplicateProject();
const { sourceName: duplicateSource, suggestedName: duplicateName, busy: duplicating } = duplication;
const { count, notRendered, loading: selecting } = selection;
const { busy } = actions;
const { open: newProjectOpen, groups: newProjectGroups, creating } = newProject;
</script>

<template>
  <PageHeader title="Projects" description="Videos prepared to be reviewed, adjusted and rendered later.">
    <template #actions>
      <Button
        v-if="notRendered > 0"
        variant="outline"
        size="sm"
        :disabled="selecting"
        @click="selection.selectNotRendered"
      >
        <ListChecks /> Select not rendered ({{ notRendered }})
      </Button>
      <Button size="sm" @click="newProjectOpen = true"><Plus /> New project</Button>
      <LiveIndicator :connected="liveConnected" />
    </template>
  </PageHeader>

  <ProjectsFilters v-model="filters" :options="filterOptions" />

  <ErrorState
    v-if="error"
    title="Could not load projects"
    :message="error.message"
    :retrying="isRefreshing"
    @retry="retry"
  />

  <ProjectsTable
    :rows="rows"
    :loading="isLoading"
    :busy="busy"
    :template-names="templateNames"
    :preset-names="presetNames"
    :filtered="hasFilters"
    :time-zone="timeZone"
    :days="days"
    :is-selected="selection.isSelected"
    :page-state="selection.pageState.value"
    :day-state="selection.dayState"
    :selecting="selecting"
    @render="actions.renderOne"
    @duplicate="duplication.start"
    @remove="actions.removeOne"
    @toggle="selection.toggle"
    @toggle-page="selection.togglePage"
    @toggle-day="selection.toggleDay"
    @reset-filters="resetFilters"
    @create="newProjectOpen = true"
  />

  <!-- Kept while there is more than the smallest page, so a bigger page size can be undone. -->
  <DataTablePagination
    v-if="total > (pageSizeOptions[0] ?? pageSize)"
    v-model:page="page"
    v-model:page-size="pageSize"
    :page-size-options="pageSizeOptions"
    :total="total"
  />

  <ProjectSelectionBar
    v-if="count > 0"
    :count="count"
    :busy="busy"
    @render="actions.renderSelected"
    @remove="actions.removeSelected"
    @clear="selection.clear"
  />

  <DuplicateProjectDialog
    :source-name="duplicateSource"
    :suggested-name="duplicateName"
    :busy="duplicating"
    @duplicate="duplication.confirm"
    @cancel="duplication.cancel"
  />

  <NewProjectDialog
    v-model:open="newProjectOpen"
    :groups="newProjectGroups"
    :creating="creating"
    @create="newProject.create"
  />
</template>
