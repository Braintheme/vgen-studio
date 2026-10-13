<script setup lang="ts">
import { Palette } from '@lucide/vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { Skeleton } from '@/components/ui/skeleton';
import PresetGroupCard from '@/features/presets/components/PresetGroupCard.vue';
import { usePresetActions } from '@/features/presets/composables/usePresetActions';
import { usePresetLibrary } from '@/features/presets/composables/usePresetLibrary';

const { groups, isLoading, error, retry } = usePresetLibrary();
const { open, rename, makeDefault, remove, busyIds } = usePresetActions();
</script>

<template>
  <PageHeader
    title="Style presets"
    description="Saved looks per template. The default preset is applied to every new video of its template."
  />
  <ErrorState v-if="error" title="Could not load presets" :message="error.message" @retry="retry" />
  <Skeleton v-else-if="isLoading" class="h-48 w-full" />
  <EmptyState
    v-else-if="groups.length === 0"
    :icon="Palette"
    title="No presets yet"
    description="Use “Save as preset” in the video editor to keep a look for later."
  />
  <PresetGroupCard
    v-for="group in groups"
    :key="group.templateId"
    :group="group"
    :busy-ids="busyIds"
    @open="open"
    @rename="rename"
    @make-default="makeDefault"
    @remove="remove"
  />
</template>
