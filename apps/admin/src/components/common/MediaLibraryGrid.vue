<script setup lang="ts">
import { Images } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Skeleton } from '@/components/ui/skeleton';
import type { MediaTileView } from '@/lib/ui-types';
import MediaLibraryTile from './MediaLibraryTile.vue';

/** A grid of library files (the media page, a slot's picker). */
defineProps<{
  tiles: readonly MediaTileView[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription?: string;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();

const SKELETONS = 12;
</script>

<template>
  <div v-if="loading && tiles.length === 0" class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
    <Skeleton v-for="index in SKELETONS" :key="index" class="aspect-[3/4] rounded-lg" />
  </div>
  <EmptyState
    v-else-if="tiles.length === 0"
    :icon="Images"
    :title="emptyTitle"
    :description="emptyDescription"
  />
  <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
    <MediaLibraryTile v-for="tile in tiles" :key="tile.id" :tile="tile" @toggle="emit('toggle', $event)" />
  </div>
</template>
