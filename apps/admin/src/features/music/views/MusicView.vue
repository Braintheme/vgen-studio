<script setup lang="ts">
import ErrorState from '@/components/common/ErrorState.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import MusicTable from '@/features/music/components/MusicTable.vue';
import MusicUploadCard from '@/features/music/components/MusicUploadCard.vue';
import { useAudioPreview } from '@/features/music/composables/useAudioPreview';
import { useMusicActions } from '@/features/music/composables/useMusicActions';
import { useMusicLibrary } from '@/features/music/composables/useMusicLibrary';

const { tracks, isLoading, error, uploadProgress, upload, retry } = useMusicLibrary();
const { rename, makeDefault, remove, busyIds } = useMusicActions();
const { playingId, toggle } = useAudioPreview();
</script>

<template>
  <PageHeader
    title="Music"
    description="Tracks for your videos. The default track plays when a video has none selected."
  />
  <MusicUploadCard :progress="uploadProgress" @files="upload" />
  <ErrorState v-if="error" title="Could not load the music library" :message="error.message" @retry="retry" />
  <MusicTable
    :tracks="tracks"
    :loading="isLoading"
    :playing-id="playingId"
    :busy-ids="busyIds"
    @toggle-play="(track) => toggle(track.id, track.url)"
    @rename="rename"
    @make-default="makeDefault"
    @remove="remove"
  />
</template>
