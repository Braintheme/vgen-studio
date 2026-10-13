<script setup lang="ts">
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import LiveIndicator from '@/components/common/LiveIndicator.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import RenderErrorDialog from '@/features/renders/components/RenderErrorDialog.vue';
import RendersFilters from '@/features/renders/components/RendersFilters.vue';
import RendersTable from '@/features/renders/components/RendersTable.vue';
import { useRenderActions } from '@/features/renders/composables/useRenderActions';
import { useRendersTable } from '@/features/renders/composables/useRendersTable';

const {
  rows,
  total,
  page,
  pageSize,
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
} = useRendersTable();
const { cancel, remove, duplicate, showError, errorRender, busyIds } = useRenderActions();
</script>

<template>
  <PageHeader title="Renders" description="Every generated video, with live progress.">
    <template #actions>
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
    @cancel="cancel"
    @remove="remove"
    @duplicate="duplicate"
    @show-error="showError"
    @reset-filters="resetFilters"
  />

  <DataTablePagination v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :total="total" />

  <RenderErrorDialog v-model:render="errorRender" />
</template>
