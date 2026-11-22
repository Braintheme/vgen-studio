<script setup lang="ts">
import DataTablePagination from '@/components/common/DataTablePagination.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import MediaLibraryGrid from '@/components/common/MediaLibraryGrid.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { formatBytes } from '@/lib/format';
import MediaCleanupDialog from '@/features/media/components/MediaCleanupDialog.vue';
import MediaGroupHeader from '@/features/media/components/MediaGroupHeader.vue';
import MediaGroupsGrid from '@/features/media/components/MediaGroupsGrid.vue';
import MediaLibraryToolbar from '@/features/media/components/MediaLibraryToolbar.vue';
import MediaSelectionBar from '@/features/media/components/MediaSelectionBar.vue';
import MediaUploadButton from '@/features/media/components/MediaUploadButton.vue';
import { useMediaCleanup } from '@/features/media/composables/useMediaCleanup';
import { useMediaGroups } from '@/features/media/composables/useMediaGroups';
import { useMediaLibrary } from '@/features/media/composables/useMediaLibrary';
import { useMediaUpload } from '@/features/media/composables/useMediaUpload';

const library = useMediaLibrary();
const {
  kind,
  groupId,
  showsGroupCards,
  sort,
  page,
  pageSize,
  tiles,
  total,
  totalLabel,
  isLoading,
  error,
  retry,
  selection,
} = library;
const cleanup = useMediaCleanup(library);
const { cleanupOpen, cleanupDays, cleanupPreview, cleanupBusy, deleting } = cleanup;
const groups = useMediaGroups(library);
const {
  groups: groupList,
  active: activeGroup,
  busy: groupBusy,
  loading: groupsLoading,
  countLabel: groupsLabel,
} = groups;
const uploader = useMediaUpload(library);
const { progress: uploadProgress } = uploader;
</script>

<template>
  <PageHeader
    title="Media"
    description="Every uploaded photo and video. Group files (e.g. a preset's settings screenshots) to add them to a project in one go."
  >
    <template #actions>
      <MediaUploadButton :progress="uploadProgress" @files="uploader.upload" />
    </template>
  </PageHeader>

  <MediaLibraryToolbar
    v-model:kind="kind"
    v-model:sort="sort"
    :total-label="showsGroupCards ? groupsLabel : totalLabel"
    @cleanup="cleanup.openCleanup"
  />

  <MediaGroupHeader
    v-if="activeGroup"
    :group="activeGroup"
    @back="groupId = null"
    @rename="groups.rename"
    @remove="groups.remove"
  />

  <ErrorState
    v-if="error"
    title="Could not load the media library"
    :message="error.message"
    :retrying="false"
    @retry="retry"
  />

  <MediaGroupsGrid
    v-if="showsGroupCards"
    :groups="groupList"
    :loading="groupsLoading"
    @open="(group) => (groupId = group.id)"
    @rename="groups.rename"
    @remove="groups.remove"
  />

  <MediaLibraryGrid
    v-else
    :tiles="tiles"
    :loading="isLoading"
    empty-title="No uploads"
    empty-description="Photos and videos you upload here or in a template show up here."
    @toggle="library.toggle"
  />

  <DataTablePagination
    v-if="!showsGroupCards && total > pageSize"
    v-model:page="page"
    :page-size="pageSize"
    :total="total"
  />

  <MediaSelectionBar
    v-if="selection.count > 0"
    :count="selection.count"
    :size-label="formatBytes(selection.bytes)"
    :deleting="deleting"
    :groups="groupList"
    :active-group="activeGroup"
    :group-busy="groupBusy"
    @remove="cleanup.deleteSelected"
    @select-page="library.selectPage"
    @clear="library.clearSelection"
    @create-group="groups.createFromSelection"
    @add-to-group="groups.addSelectionTo"
    @remove-from-group="groups.removeSelectionFromActive"
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
