<script setup lang="ts">
import { Music } from '@lucide/vue';
import type { MusicTrackDto } from '@vgen/shared';
import { computed } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { createMusicColumns } from './music-columns';

const props = defineProps<{
  tracks: MusicTrackDto[];
  loading: boolean;
  playingId: string | null;
  busyIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  togglePlay: [track: MusicTrackDto];
  rename: [track: MusicTrackDto];
  makeDefault: [track: MusicTrackDto];
  remove: [track: MusicTrackDto];
}>();

const columns = computed(() =>
  createMusicColumns({
    isPlaying: (id) => props.playingId === id,
    isBusy: (id) => props.busyIds.has(id),
    onTogglePlay: (track) => {
      emit('togglePlay', track);
    },
    onRename: (track) => {
      emit('rename', track);
    },
    onMakeDefault: (track) => {
      emit('makeDefault', track);
    },
    onRemove: (track) => {
      emit('remove', track);
    },
  }),
);
</script>

<template>
  <DataTable :columns="columns" :data="tracks" :loading="loading" :get-row-id="(track) => track.id">
    <template #empty>
      <EmptyState
        :icon="Music"
        title="No music yet"
        description="Upload tracks to use them in your videos."
      />
    </template>
  </DataTable>
</template>
