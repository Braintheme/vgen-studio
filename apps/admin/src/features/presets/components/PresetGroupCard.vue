<script setup lang="ts">
import type { StylePresetDto } from '@vgen/shared';
import { computed } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PresetGroup } from '@/features/presets/types';
import { createPresetColumns } from './preset-columns';

const props = defineProps<{
  group: PresetGroup;
  busyIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  open: [preset: StylePresetDto];
  rename: [preset: StylePresetDto];
  makeDefault: [preset: StylePresetDto];
  remove: [preset: StylePresetDto];
}>();

const columns = computed(() =>
  createPresetColumns({
    templateVersion: props.group.templateVersion,
    isBusy: (id) => props.busyIds.has(id),
    isTrackMissing: (id) => props.group.trackMissingIds.has(id),
    onOpen: (preset) => {
      emit('open', preset);
    },
    onRename: (preset) => {
      emit('rename', preset);
    },
    onMakeDefault: (preset) => {
      emit('makeDefault', preset);
    },
    onRemove: (preset) => {
      emit('remove', preset);
    },
  }),
);
</script>

<template>
  <Card class="gap-3 py-4">
    <CardHeader class="px-4">
      <CardTitle>{{ group.templateName }}</CardTitle>
      <CardDescription>
        {{ group.presets.length }} {{ group.presets.length === 1 ? 'preset' : 'presets' }}
        <template v-if="group.templateVersion === null"> · template not installed</template>
      </CardDescription>
    </CardHeader>
    <CardContent class="px-4">
      <DataTable :columns="columns" :data="[...group.presets]" :get-row-id="(preset) => preset.id" />
    </CardContent>
  </Card>
</template>
