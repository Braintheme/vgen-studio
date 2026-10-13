<script setup lang="ts">
import SchemaForm from '@/components/schema-form/SchemaForm.vue';
import type { FormSectionSpec } from '@/lib/schema-form';
import type { MusicWidgetsView } from '@/features/compose/types';
import MusicNoticeAlert from './MusicNoticeAlert.vue';
import MusicRegionField from './MusicRegionField.vue';
import MusicTrackField from './MusicTrackField.vue';

/** The template settings form with the compose screen's custom widgets (music). */
defineProps<{
  sections: readonly FormSectionSpec[];
  music: MusicWidgetsView;
}>();

const trackId = defineModel<string | null>('trackId', { required: true });
const startSec = defineModel<number>('startSec', { required: true });
</script>

<template>
  <SchemaForm :sections="sections">
    <template #widget:music-track="{ field }">
      <MusicTrackField
        v-model="trackId"
        :label="field.label"
        :tracks="music.tracks"
        :default-track="music.defaultTrack"
        :disabled="!music.enabled"
      />
      <MusicNoticeAlert v-if="music.notice" :notice="music.notice" />
    </template>
    <template #widget:music-region="{ field }">
      <MusicRegionField
        v-if="music.waveform"
        v-model="startSec"
        :label="field.label"
        :source="music.waveform"
        :length-sec="music.regionSec"
        :disabled="!music.enabled"
      />
    </template>
  </SchemaForm>
</template>
