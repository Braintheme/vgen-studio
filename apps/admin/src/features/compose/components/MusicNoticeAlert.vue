<script setup lang="ts">
import { Info, TriangleAlert } from '@lucide/vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { routeTo } from '@/lib/routes';
import type { MusicNotice } from '@/features/compose/types';

defineProps<{
  notice: MusicNotice;
}>();

const MESSAGES: Record<MusicNotice, string> = {
  'library-empty': 'The music library is empty, so the video will be silent.',
  'no-default': 'No default track is set, so the video will be silent. Pick a track or set a default.',
  'track-loops': 'The track is shorter than the video and will loop.',
};
</script>

<template>
  <Alert>
    <Info v-if="notice === 'track-loops'" />
    <TriangleAlert v-else />
    <AlertDescription>
      <span>
        {{ MESSAGES[notice] }}
        <RouterLink
          v-if="notice !== 'track-loops'"
          :to="routeTo.music()"
          class="font-medium underline underline-offset-4"
        >
          Open Music
        </RouterLink>
      </span>
    </AlertDescription>
  </Alert>
</template>
