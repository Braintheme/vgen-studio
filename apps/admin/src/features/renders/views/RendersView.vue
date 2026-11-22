<script setup lang="ts">
import { ListChecks } from '@lucide/vue';
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import LiveIndicator from '@/components/common/LiveIndicator.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format';
import RenderErrorDialog from '@/features/renders/components/RenderErrorDialog.vue';
import RenderSelectionBar from '@/features/renders/components/RenderSelectionBar.vue';
import RenderSlidesDialog from '@/features/renders/components/RenderSlidesDialog.vue';
import RendersFilters from '@/features/renders/components/RendersFilters.vue';
import RendersTable from '@/features/renders/components/RendersTable.vue';
import { useRenderActions } from '@/features/renders/composables/useRenderActions';
import { useRenderSave } from '@/features/renders/composables/useRenderSave';
import { useRenderSelection } from '@/features/renders/composables/useRenderSelection';
import { useRendersTable } from '@/features/renders/composables/useRendersTable';

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
  isLoading,
  isRefreshing,
  error,
  liveConnected,
  retry,
  resetFilters,
  scope,
  timeZone,
  days,
} = useRendersTable();
const { cancel, remove, duplicate, showError, showSlides, errorRender, slidesRender, busyIds } =
  useRenderActions();
const selection = useRenderSelection({ rows, scope, timeZone, days });
const saving = useRenderSave(selection);
const { count, bytes, notDownloaded, loading: selecting } = selection;
const { progress } = saving;
</script>

<template>
  <PageHeader title="Renders" description="Every generated video and set of slides, with live progress.">
    <template #actions>
      <Button
        v-if="notDownloaded > 0"
        variant="outline"
        size="sm"
        :disabled="selecting"
        @click="selection.selectNotDownloaded"
      >
        <ListChecks /> Select not downloaded ({{ notDownloaded }})
      </Button>
      <LiveIndicator :connected="liveConnected" />
    </template>
  </PageHeader>

  <RendersFilters v-model="filters" :options="filterOptions" />

  <ErrorState
    v-if="error"
    title="Could not load renders"
    :message="error.message"
    :retrying="isRefreshing"
    @retry="retry"
  />

  <RendersTable
    :rows="rows"
    :loading="isLoading"
    :busy-ids="busyIds"
    :template-names="templateNames"
    :filtered="hasFilters"
    :time-zone="timeZone"
    :days="days"
    :is-selected="selection.isSelected"
    :page-state="selection.pageState.value"
    :day-state="selection.dayState"
    :selecting="selecting"
    @cancel="cancel"
    @remove="remove"
    @duplicate="duplicate"
    @show-error="showError"
    @show-slides="showSlides"
    @downloaded="saving.markDownloaded"
    @toggle="selection.toggle"
    @toggle-page="selection.togglePage"
    @toggle-day="selection.toggleDay"
    @reset-filters="resetFilters"
  />

  <!-- Kept while there is more than the smallest page, so a bigger page size can be undone. -->
  <DataTablePagination
    v-if="total > (pageSizeOptions[0] ?? pageSize)"
    v-model:page="page"
    v-model:page-size="pageSize"
    :page-size-options="pageSizeOptions"
    :total="total"
  />

  <RenderSelectionBar
    v-if="count > 0 || progress"
    :count="count"
    :size-label="formatBytes(bytes)"
    :to-folder="saving.toFolder"
    :progress="progress"
    @save="saving.saveSelected"
    @stop="saving.stop"
    @clear="selection.clear"
  />

  <RenderErrorDialog v-model:render="errorRender" />
  <RenderSlidesDialog v-model:render="slidesRender" />
</template>
