<script setup lang="ts">
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import MediaLibraryGrid from '@/components/common/MediaLibraryGrid.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { formatBytes } from '@/lib/format';
import MediaCleanupDialog from '@/features/media/components/MediaCleanupDialog.vue';
import MediaLibraryToolbar from '@/features/media/components/MediaLibraryToolbar.vue';
import MediaSelectionBar from '@/features/media/components/MediaSelectionBar.vue';
import { useMediaCleanup } from '@/features/media/composables/useMediaCleanup';
import { useMediaLibrary } from '@/features/media/composables/useMediaLibrary';

const library = useMediaLibrary();
const { kind, sort, page, pageSize, tiles, total, totalLabel, isLoading, error, retry, selection } = library;
const cleanup = useMediaCleanup(library);
const { cleanupOpen, cleanupDays, cleanupPreview, cleanupBusy, deleting } = cleanup;
</script>

<template>
  <PageHeader
    title="Media"
    description="Every uploaded photo and video. Delete what you no longer need; renders keep their videos."
  />

  <MediaLibraryToolbar
    v-model:kind="kind"
    v-model:sort="sort"
    :total-label="totalLabel"
    @cleanup="cleanup.openCleanup"
  />

  <ErrorState
    v-if="error"
    title="Could not load the media library"
    :message="error.message"
    :retrying="false"
    @retry="retry"
  />

  <MediaLibraryGrid
    :tiles="tiles"
    :loading="isLoading"
    empty-title="No uploads"
    empty-description="Photos and videos you upload in a template show up here."
    @toggle="library.toggle"
  />

  <DataTablePagination v-if="total > pageSize" v-model:page="page" :page-size="pageSize" :total="total" />

  <MediaSelectionBar
    v-if="selection.count > 0"
    :count="selection.count"
    :size-label="formatBytes(selection.bytes)"
    :deleting="deleting"
    @remove="cleanup.deleteSelected"
    @select-page="library.selectPage"
    @clear="library.clearSelection"
  />

  <MediaCleanupDialog
    v-model:open="cleanupOpen"
    v-model:days="cleanupDays"
    :preview="cleanupPreview"
    :busy="cleanupBusy"
    @check="cleanup.checkCleanup"
    @confirm="cleanup.runCleanup"
  />
</template>
