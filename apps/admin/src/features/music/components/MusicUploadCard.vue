<script setup lang="ts">
import FileDropzone from '@/components/common/FileDropzone.vue';
import { Progress } from '@/components/ui/progress';
import { MUSIC_ACCEPT } from '@/features/music/constants';

defineProps<{
  /** Current upload progress (0..1), or null when idle. */
  progress: number | null;
}>();

const emit = defineEmits<{
  files: [files: File[]];
}>();
</script>

<template>
  <div class="grid gap-2">
    <FileDropzone
      :accept="MUSIC_ACCEPT"
      multiple
      :disabled="progress !== null"
      hint="Drop MP3, WAV, M4A or AAC files here, or click to browse"
      @files="emit('files', $event)"
    />
    <Progress v-if="progress !== null" :model-value="progress * 100" class="h-1.5" />
  </div>
</template>
